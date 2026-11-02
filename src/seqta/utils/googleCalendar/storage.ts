import browser from "webextension-polyfill";
import { DEFAULT_SYNC_WEEKS } from "./config";

/** Same storage keys as the full extension, so an existing connection carries over. */
const STATE_KEY = "bsplus_google_calendar";
const SETTINGS_KEY = "bsplus_calendar_sync_settings";

export interface EventMapEntry {
  id: string;
  date: string;
  /** Last-synced content fingerprint; used to skip unchanged events. */
  fingerprint?: string;
}

/** `${origin}::${seqtaKey}` -> Google event. Older versions stored just the id. */
export type EventMap = Record<string, string | EventMapEntry>;

export interface GoogleCalendarState {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt?: number;
  calendarId?: string;
  lastSyncAt?: number;
  lastSyncOrigin?: string;
  eventMap?: EventMap;
}

interface StoredSyncSettings {
  syncWeeksAhead?: number | null;
  autoSyncWeekly?: boolean | null;
}

export interface CalendarSyncSettings {
  weeksAhead: number;
  autoSync: boolean;
}

export interface GoogleCalendarStatus extends CalendarSyncSettings {
  connected: boolean;
  lastSyncAt?: number;
}

async function readObject<T>(key: string): Promise<T> {
  const raw = (await browser.storage.local.get(key))[key];
  return (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as T;
}

export const readState = () => readObject<GoogleCalendarState>(STATE_KEY);

export async function writeState(
  patch: Partial<GoogleCalendarState>,
): Promise<GoogleCalendarState> {
  const next = { ...(await readState()), ...patch };
  await browser.storage.local.set({ [STATE_KEY]: next });
  return next;
}

export const clearState = () => browser.storage.local.remove(STATE_KEY);

export function isConnected(state: GoogleCalendarState): boolean {
  return Boolean(state.refreshToken || state.accessToken);
}

export async function readSettings(): Promise<CalendarSyncSettings> {
  const stored = await readObject<StoredSyncSettings>(SETTINGS_KEY);
  const weeks = Number(stored.syncWeeksAhead);
  return {
    weeksAhead:
      Number.isFinite(weeks) && weeks >= 1 && weeks <= 52 ? Math.round(weeks) : DEFAULT_SYNC_WEEKS,
    autoSync: stored.autoSyncWeekly !== false,
  };
}

export async function writeSettings(patch: Partial<CalendarSyncSettings>): Promise<void> {
  const stored = await readObject<StoredSyncSettings>(SETTINGS_KEY);
  if (patch.weeksAhead !== undefined) stored.syncWeeksAhead = patch.weeksAhead;
  if (patch.autoSync !== undefined) stored.autoSyncWeekly = patch.autoSync;
  await browser.storage.local.set({ [SETTINGS_KEY]: stored });
}

export function normalizeEntry(value: string | EventMapEntry | undefined): EventMapEntry | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return { id: value, date: "" };
  return value.id ? value : undefined;
}
