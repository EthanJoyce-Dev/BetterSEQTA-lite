import browser from "webextension-polyfill";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_OAUTH_CALLBACK,
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_REFRESH_URL,
  GOOGLE_TOKEN_URL,
} from "@/seqta/utils/googleCalendar/config";
import { ensureCalendar } from "@/seqta/utils/googleCalendar/api";
import {
  clearState,
  isConnected,
  readSettings,
  readState,
  writeSettings,
  writeState,
  type CalendarSyncSettings,
  type GoogleCalendarStatus,
} from "@/seqta/utils/googleCalendar/storage";

type Handler = (request: any, sendResponse: (response?: unknown) => void) => boolean;

/** Wraps an async handler: replies with its result, or `{ success: false, error }`. */
const asyncHandler =
  (fn: (request: any) => Promise<unknown>): Handler =>
  (request, sendResponse) => {
    fn(request)
      .then(sendResponse)
      .catch((err) =>
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }),
      );
    return true;
  };

// ---------------------------------------------------------------------------
// OAuth (authorization code + PKCE; code swap/refresh via accounts.betterseqta.org)
// ---------------------------------------------------------------------------

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function pkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(digest) };
}

/** Opens Google sign-in in a tab and resolves with the callback URL it lands on. */
function waitForOAuthCallback(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let authTabId: number | undefined;
    const timeout = setTimeout(() => finish(new Error("Google sign-in timed out. Try again.")), 10 * 60_000);

    const finish = (result: string | Error) => {
      clearTimeout(timeout);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
      if (typeof result === "string") {
        if (authTabId !== undefined) void browser.tabs.remove(authTabId).catch(() => {});
        resolve(result);
      } else {
        reject(result);
      }
    };

    const onUpdated = (tabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType, tab: browser.Tabs.Tab) => {
      if (tabId !== authTabId) return;
      const url = changeInfo.url ?? (changeInfo.status === "complete" ? tab.url : undefined);
      if (!url?.startsWith(GOOGLE_OAUTH_CALLBACK)) return;
      const params = new URL(url).searchParams;
      if (params.has("code") || params.has("error")) finish(url);
    };

    const onRemoved = (tabId: number) => {
      if (tabId === authTabId) finish(new Error("Google sign-in was cancelled."));
    };

    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onRemoved.addListener(onRemoved);
    browser.tabs
      .create({ url: authUrl, active: true })
      .then((tab) => {
        authTabId = tab.id;
      })
      .catch(() => finish(new Error("Could not open the Google sign-in tab.")));
  });
}

type TokenPayload = { access_token: string; refresh_token?: string; expires_in?: number };

async function postTokenEndpoint(url: string, body: Record<string, string>): Promise<TokenPayload> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof json.access_token !== "string") {
    const error = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new Error(`Google token request failed: ${error}`);
  }
  return {
    access_token: json.access_token,
    refresh_token: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expires_in: typeof json.expires_in === "number" ? json.expires_in : undefined,
  };
}

const expiresAt = (expiresIn?: number) => Date.now() + (expiresIn ?? 3600) * 1000;

async function getAccessToken(forceRefresh: boolean): Promise<string> {
  const state = await readState();
  if (!forceRefresh && state.accessToken && (state.expiresAt ?? 0) > Date.now() + 60_000) {
    return state.accessToken;
  }
  if (!state.refreshToken) throw new Error("Google Calendar isn't connected.");

  let tokens: TokenPayload;
  try {
    tokens = await postTokenEndpoint(GOOGLE_REFRESH_URL, { refresh_token: state.refreshToken });
  } catch (err) {
    throw new Error(
      `Couldn't refresh Google access. Disconnect and reconnect Google Calendar. (${err instanceof Error ? err.message : err})`,
    );
  }
  await writeState({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? state.refreshToken,
    expiresAt: expiresAt(tokens.expires_in),
  });
  return tokens.access_token;
}

async function connect(): Promise<{ success: boolean; error?: string }> {
  const { verifier, challenge } = await pkcePair();
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.search = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    response_type: "code",
    redirect_uri: GOOGLE_OAUTH_CALLBACK,
    scope: GOOGLE_CALENDAR_SCOPE,
    prompt: "consent",
    access_type: "offline",
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const callback = new URL(await waitForOAuthCallback(authUrl.toString()));
  const error = callback.searchParams.get("error");
  if (error) throw new Error(callback.searchParams.get("error_description") ?? error);
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("Google sign-in didn't return an authorization code.");

  const tokens = await postTokenEndpoint(GOOGLE_TOKEN_URL, {
    code,
    redirect_uri: GOOGLE_OAUTH_CALLBACK,
    code_verifier: verifier,
  });
  const existing = await readState();
  await writeState({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? existing.refreshToken,
    expiresAt: expiresAt(tokens.expires_in),
    connectedAt: Date.now(),
  });
  const calendarId = await ensureCalendar(async () => tokens.access_token, existing.calendarId);
  await writeState({ calendarId });
  return { success: true };
}

async function status(): Promise<GoogleCalendarStatus> {
  const [state, settings] = await Promise.all([readState(), readSettings()]);
  return { connected: isConnected(state), lastSyncAt: state.lastSyncAt, ...settings };
}

export const googleCalendarHandlers: Record<string, Handler> = {
  googleCalendarConnect: asyncHandler(connect),
  /** Forgets the Google tokens. The calendar and its events stay in Google. */
  googleCalendarDisconnect: asyncHandler(async () => {
    await clearState();
    return { success: true };
  }),
  googleCalendarStatus: asyncHandler(status),
  googleCalendarGetAccessToken: asyncHandler(async (request) => ({
    success: true,
    accessToken: await getAccessToken(request?.forceRefresh === true),
  })),
  googleCalendarUpdateSettings: asyncHandler(async (request) => {
    const patch: Partial<CalendarSyncSettings> = {};
    if (typeof request?.weeksAhead === "number") patch.weeksAhead = request.weeksAhead;
    if (typeof request?.autoSync === "boolean") patch.autoSync = request.autoSync;
    await writeSettings(patch);
    return status();
  }),
};
