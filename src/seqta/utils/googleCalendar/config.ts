/**
 * Google Calendar sync, ported (Google-only, timetable-only) from later
 * BetterSEQTA+ releases. Uses BetterSEQTA's public Google OAuth client: Google
 * requires a client secret to swap/refresh tokens, so those two steps go
 * through accounts.betterseqta.org. Nothing else is sent there.
 */
export const GOOGLE_OAUTH_CLIENT_ID =
  "270834969641-f6t7jtpu6j0cemse8updj3rkos7nl0hf.apps.googleusercontent.com";

const ACCOUNTS_BASE = "https://accounts.betterseqta.org";
export const GOOGLE_OAUTH_CALLBACK = `${ACCOUNTS_BASE}/auth/google/calendar/callback`;
export const GOOGLE_TOKEN_URL = `${ACCOUNTS_BASE}/api/bsplus/google/calendar/token`;
export const GOOGLE_REFRESH_URL = `${ACCOUNTS_BASE}/api/bsplus/google/calendar/refresh`;

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
/** App-created calendars only: cannot read or modify the user's other calendars. */
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
export const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const CALENDAR_NAME = "BetterSEQTA+ Lite Timetable";
/** Name used by the full extension; reused (and renamed) so reconnecting never duplicates it. */
export const LEGACY_CALENDAR_NAME = "BetterSEQTA+ Timetable";
export const CALENDAR_DESCRIPTION =
  "School timetable lessons synced by the BetterSEQTA+ Lite extension.";

/** Private extended property holding each event's SEQTA key. */
export const EVENT_KEY_PROP = "bsplusSeqtaKey";

export const DEFAULT_SYNC_WEEKS = 12;
export const SYNC_WEEKS_OPTIONS = [2, 4, 8, 12, 26] as const;

/** Auto-sync runs at most this often, when a SEQTA page is opened. */
export const AUTO_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
