import browser from "webextension-polyfill";
import {
  deleteEvent,
  ensureCalendar,
  eventFingerprint,
  listSyncedEvents,
  upsertEvent,
  type TokenSource,
} from "./api";
import {
  isConnected,
  normalizeEntry,
  readSettings,
  readState,
  writeState,
  type EventMap,
} from "./storage";
import {
  eventApiBody,
  fetchTimetable,
  isDateInRange,
  lessonsToEvents,
  syncWindowRange,
} from "./timetable";

export interface CalendarSyncResult {
  success: boolean;
  created?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
  failed?: number;
  lastSyncAt?: number;
  error?: string;
}

/** Max concurrent create/update/delete requests, to stay under Google's rate limits. */
const CONCURRENCY = 2;
const PERSIST_EVERY = 10;

async function mapPool<T>(items: readonly T[], fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
}

/** Caches the token for the sync; asks the background for a new one when Google rejects it. */
function backgroundTokenSource(): TokenSource {
  let cached: string | undefined;
  return async (forceRefresh = false) => {
    if (cached && !forceRefresh) return cached;
    const res = (await browser.runtime.sendMessage({
      type: "googleCalendarGetAccessToken",
      forceRefresh,
    })) as { success?: boolean; accessToken?: string; error?: string };
    if (!res?.success || !res.accessToken) {
      throw new Error(res?.error ?? "Could not get a Google access token.");
    }
    cached = res.accessToken;
    return cached;
  };
}

let running: Promise<CalendarSyncResult> | null = null;

/**
 * Syncs the timetable in the sync window to the app's Google calendar: deletes
 * events that are gone or fell out of the window, creates new ones and updates
 * changed ones. Runs in the SEQTA tab, which has the session to read the timetable.
 */
export function syncGoogleCalendar(onProgress?: (message: string) => void): Promise<CalendarSyncResult> {
  running ??= runSync(onProgress).finally(() => {
    running = null;
  });
  return running;
}

async function runSync(onProgress?: (message: string) => void): Promise<CalendarSyncResult> {
  try {
    const state = await readState();
    if (!isConnected(state)) return { success: false, error: "Connect Google Calendar first." };

    const origin = location.origin;
    const { weeksAhead } = await readSettings();
    const range = syncWindowRange(weeksAhead);
    const getToken = backgroundTokenSource();

    onProgress?.("Fetching timetable…");
    const events = lessonsToEvents(origin, await fetchTimetable(range));

    const calendarId = await ensureCalendar(getToken, state.calendarId);
    if (calendarId !== state.calendarId) await writeState({ calendarId });

    // Reconcile with what is actually in Google: adopt events we don't know about,
    // forget ones the user deleted so they're recreated.
    const eventMap: EventMap = { ...(state.eventMap ?? {}) };
    const mapKey = (seqtaKey: string) => `${origin}::${seqtaKey}`;
    const remote = await listSyncedEvents(getToken, calendarId, range.from, range.until);
    const remoteIds = new Set(remote.map((event) => event.id));
    for (const event of remote) {
      if (!event.seqtaKey.startsWith(origin)) continue;
      const existing = normalizeEntry(eventMap[mapKey(event.seqtaKey)]);
      eventMap[mapKey(event.seqtaKey)] = {
        id: event.id,
        date: event.date || existing?.date || "",
        // Prefer the last-written local fingerprint so API formatting quirks don't force updates.
        fingerprint: existing?.fingerprint ?? event.fingerprint,
      };
    }
    const wanted = new Set(events.map((event) => mapKey(event.seqtaKey)));
    for (const key of wanted) {
      const entry = normalizeEntry(eventMap[key]);
      if (entry?.date && isDateInRange(entry.date, range) && !remoteIds.has(entry.id)) {
        delete eventMap[key];
      }
    }

    // Events no longer in the timetable, outside the window, or from features Lite doesn't sync.
    const stale: [string, string][] = [];
    for (const [key, raw] of Object.entries(eventMap)) {
      if (!key.startsWith(`${origin}::`)) continue;
      const entry = normalizeEntry(raw);
      if (!entry) continue;
      const outsideWindow = entry.date ? !isDateInRange(entry.date, range) : false;
      if (!wanted.has(key) || outsideWindow) stale.push([key, entry.id]);
    }

    const lastSyncAt = Date.now();
    const result = { created: 0, updated: 0, deleted: 0, skipped: 0, failed: 0 };
    let done = 0;
    const total = stale.length + events.length;
    let persistChain: Promise<unknown> = Promise.resolve();
    const step = () => {
      done += 1;
      onProgress?.(`Syncing (${done}/${total})…`);
      if (done % PERSIST_EVERY === 0) {
        persistChain = persistChain.then(() => writeState({ eventMap }));
      }
    };

    await mapPool(stale, async ([key, id]) => {
      try {
        await deleteEvent(getToken, calendarId, id);
        delete eventMap[key];
        result.deleted += 1;
      } catch (err) {
        console.warn("[BetterSEQTA+ Lite] Calendar delete failed:", err);
        result.failed += 1;
      }
      step();
    });

    await mapPool(events, async (event) => {
      const key = mapKey(event.seqtaKey);
      const existing = normalizeEntry(eventMap[key]);
      const fingerprint = eventFingerprint(event);
      try {
        if (existing && existing.fingerprint === fingerprint) {
          result.skipped += 1;
        } else {
          const id = await upsertEvent(getToken, calendarId, existing?.id, eventApiBody(event));
          result[existing ? "updated" : "created"] += 1;
          eventMap[key] = { id, date: event.startDateTime.slice(0, 10), fingerprint };
        }
      } catch (err) {
        console.warn("[BetterSEQTA+ Lite] Calendar event sync failed:", err);
        result.failed += 1;
      }
      step();
    });

    await persistChain;
    await writeState({ eventMap, lastSyncAt, lastSyncOrigin: origin });
    onProgress?.("Sync complete");
    return { success: true, lastSyncAt, ...result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}
