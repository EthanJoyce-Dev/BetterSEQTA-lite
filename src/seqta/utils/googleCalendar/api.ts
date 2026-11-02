import {
  CALENDAR_DESCRIPTION,
  CALENDAR_NAME,
  EVENT_KEY_PROP,
  GOOGLE_CALENDAR_API,
  LEGACY_CALENDAR_NAME,
} from "./config";

/** Returns an access token; `forceRefresh` asks for a new one after Google rejects it. */
export type TokenSource = (forceRefresh?: boolean) => Promise<string>;

export type RemoteEvent = {
  seqtaKey: string;
  id: string;
  date: string;
  fingerprint: string;
};

export type FingerprintableEvent = {
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
};

/** Stable content fingerprint used to skip unchanged events. */
export function eventFingerprint(event: FingerprintableEvent): string {
  return [
    event.summary.trim(),
    (event.location ?? "").trim(),
    (event.description ?? "").trim(),
    event.startDateTime.trim(),
    event.endDateTime.trim(),
    event.timeZone.trim(),
  ].join("\n");
}

const MAX_RETRIES = 4;
const RETRYABLE = new Set([403, 429, 500, 502, 503]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls the Calendar API, refreshing the token on 401 and backing off on rate limits. */
async function googleFetch(getToken: TokenSource, path: string, init: RequestInit = {}) {
  let token = await getToken();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (attempt >= MAX_RETRIES - 1) return res;
    if (res.status === 401) {
      token = await getToken(true);
      continue;
    }
    if (RETRYABLE.has(res.status)) {
      await sleep(250 * 2 ** attempt + Math.floor(Math.random() * 100));
      continue;
    }
    return res;
  }
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  return json?.error?.message ?? `${fallback} (${res.status})`;
}

type CalendarResource = { id?: string; summary?: string };

/**
 * Returns the app-owned calendar id: the stored one if it still exists, else one
 * found by name (renaming the full extension's calendar), else a new calendar.
 */
export async function ensureCalendar(getToken: TokenSource, storedId?: string): Promise<string> {
  const rename = async (id: string, summary?: string) => {
    if (summary === CALENDAR_NAME) return;
    await googleFetch(getToken, `/calendars/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ summary: CALENDAR_NAME, description: CALENDAR_DESCRIPTION }),
    });
  };

  if (storedId) {
    const res = await googleFetch(getToken, `/calendars/${encodeURIComponent(storedId)}`);
    if (res.ok) {
      await rename(storedId, ((await res.json()) as CalendarResource).summary);
      return storedId;
    }
    if (res.status !== 404) throw new Error(await errorMessage(res, "Calendar lookup failed"));
  }

  const list = await googleFetch(getToken, "/users/me/calendarList");
  if (list.ok) {
    const items = ((await list.json()) as { items?: CalendarResource[] }).items ?? [];
    const match =
      items.find((c) => c.summary === CALENDAR_NAME) ??
      items.find((c) => c.summary === LEGACY_CALENDAR_NAME);
    if (match?.id) {
      await rename(match.id, match.summary);
      return match.id;
    }
  }

  const created = await googleFetch(getToken, "/calendars", {
    method: "POST",
    body: JSON.stringify({
      summary: CALENDAR_NAME,
      description: CALENDAR_DESCRIPTION,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    }),
  });
  const json = (await created.json().catch(() => ({}))) as CalendarResource;
  if (!created.ok || !json.id) {
    throw new Error(`Could not create the ${CALENDAR_NAME} calendar (${created.status}).`);
  }
  return json.id;
}

type GoogleListItem = {
  id?: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

function rfc3339(date: string, addDays = 0): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + addDays);
  return d.toISOString();
}

/** Lists synced (keyed) events in the calendar between two ISO dates inclusive. */
export async function listSyncedEvents(
  getToken: TokenSource,
  calendarId: string,
  from: string,
  until: string,
): Promise<RemoteEvent[]> {
  const out: RemoteEvent[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      maxResults: "2500",
      timeMin: rfc3339(from),
      timeMax: rfc3339(until, 1),
      fields: "nextPageToken,items(id,summary,location,description,start,end,extendedProperties)",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await googleFetch(
      getToken,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    );
    if (!res.ok) throw new Error(await errorMessage(res, "Google Calendar list failed"));
    const json = (await res.json()) as { items?: GoogleListItem[]; nextPageToken?: string };

    for (const item of json.items ?? []) {
      const seqtaKey = item.extendedProperties?.private?.[EVENT_KEY_PROP];
      if (!item.id || !seqtaKey) continue;
      const startDateTime =
        item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00` : "");
      const endDateTime = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T00:00:00` : "");
      out.push({
        seqtaKey,
        id: item.id,
        date: startDateTime.slice(0, 10),
        fingerprint: eventFingerprint({
          summary: item.summary ?? "",
          location: item.location,
          description: item.description,
          startDateTime,
          endDateTime,
          timeZone: item.start?.timeZone ?? item.end?.timeZone ?? "UTC",
        }),
      });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return out;
}

/** Updates the event if it still exists, otherwise creates it. Returns its id. */
export async function upsertEvent(
  getToken: TokenSource,
  calendarId: string,
  existingId: string | undefined,
  body: Record<string, unknown>,
): Promise<string> {
  const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
  if (existingId) {
    const res = await googleFetch(getToken, `${base}/${encodeURIComponent(existingId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (res.ok) return existingId;
    if (res.status !== 404 && res.status !== 410) {
      throw new Error(await errorMessage(res, "Google Calendar update failed"));
    }
  }
  const res = await googleFetch(getToken, base, { method: "POST", body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json?.error?.message ?? `Google Calendar create failed (${res.status})`);
  }
  return json.id;
}

export async function deleteEvent(
  getToken: TokenSource,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await googleFetch(
    getToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  if (res.ok || res.status === 404 || res.status === 410) return;
  throw new Error(await errorMessage(res, "Google Calendar delete failed"));
}
