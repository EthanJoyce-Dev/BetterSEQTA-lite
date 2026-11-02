import browser from "webextension-polyfill";
import type { SettingsState } from "@/types/storage";
import { getDefaultSettingsState } from "@/seqta/utils/defaultSettings";
import { ensureStorageDefaults } from "@/seqta/utils/ensureStorageDefaults";
import { fetchNews } from "./background/news";
import { googleCalendarHandlers } from "./background/googleCalendar";

/**
 * Session-only dev-mode override of the content API base.
 *
 * Stored in a module-level variable (not `chrome.storage`) so it is wiped
 * automatically when the browser/service-worker process restarts. Content
 * scripts re-sync this on every page load via `setDevApiBase` so the value
 * survives transient service-worker terminations within the same browser
 * session.
 */
const DEFAULT_API_BASE = "https://betterseqta.org";
let DEV_API_BASE: string | null = null;
function apiBase(): string {
  return DEV_API_BASE ?? DEFAULT_API_BASE;
}

function reloadSeqtaPages() {
  const result = browser.tabs.query({});
  function open(tabs: any) {
    for (let tab of tabs) {
      if (
        tab.title?.includes("SEQTA Learn") ||
        tab.title?.includes("SEQTA Engage")
      ) {
        browser.tabs.reload(tab.id);
      }
    }
  }
  result.then(open, console.error);
}

/** Callback for sending a response back to the message sender */
type MessageSender = { (response?: unknown): void };

/** Accept API + GitHub fallback shapes; always return `{ success, data?: { themes } }`. */
function normalizeFetchThemesResponse(json: unknown): {
  success: boolean;
  data?: { themes: unknown[] };
  error?: string;
} {
  if (!json || typeof json !== "object") {
    return { success: false, error: "Invalid themes response" };
  }
  const body = json as Record<string, unknown>;
  if (body.success === false) {
    return {
      success: false,
      error: typeof body.error === "string" ? body.error : "Failed to fetch themes",
    };
  }
  const data = body.data;
  let themes: unknown[] | null = null;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = (data as Record<string, unknown>).themes;
    if (Array.isArray(nested)) themes = nested;
  } else if (Array.isArray(data)) {
    themes = data;
  }
  if (!themes && Array.isArray(body.themes)) {
    themes = body.themes;
  }
  if (!themes) {
    return { success: false, error: "Themes list missing from response" };
  }
  return { success: true, data: { themes } };
}

function handleFetchThemes(_request: any, sendResponse: MessageSender): boolean {
  const apiUrl = `${apiBase()}/api/themes?type=betterseqta&limit=100&nocache=${Date.now()}`;
  const githubUrl = `https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes.json?nocache=${Date.now()}`;
  fetch(apiUrl, { cache: "no-store" })
    .then(async (r) => {
      const json = await r.json();
      if (!r.ok) {
        throw new Error(
          (json && typeof json === "object" && "error" in json && typeof (json as { error?: string }).error === "string"
            ? (json as { error: string }).error
            : null) ?? `Themes API HTTP ${r.status}`,
        );
      }
      return normalizeFetchThemesResponse(json);
    })
    .then(sendResponse)
    .catch((err) => {
      console.warn("[Background] fetchThemes API failed, trying GitHub fallback:", err?.message);
      fetch(githubUrl, { cache: "no-store" })
        .then(async (r) => {
          if (!r.ok) throw new Error(`GitHub fallback HTTP ${r.status}`);
          const data = await r.json();
          const themes = Array.isArray(data) ? data : (data?.themes ?? []);
          return normalizeFetchThemesResponse({ success: true, data: { themes } });
        })
        .then(sendResponse)
        .catch((fallbackErr) => {
          console.error("[Background] fetchThemes GitHub fallback error:", fallbackErr);
          sendResponse({ success: false, error: fallbackErr?.message });
        });
    });
  return true;
}

function handleFetchThemeDetails(request: any, sendResponse: MessageSender): boolean {
  const { themeId } = request;
  if (!themeId || typeof themeId !== "string") {
    sendResponse({ success: false, error: "Missing themeId" });
    return false;
  }
  fetch(`${apiBase()}/api/themes/${themeId}`, { cache: "no-store" })
    .then((r) => r.json())
    .then(sendResponse)
    .catch((err) => {
      console.error("[Background] fetchThemeDetails error:", err);
      sendResponse({ success: false, error: err?.message });
    });
  return true;
}

function handleFetchFromUrl(request: any, sendResponse: MessageSender): boolean {
  const { url } = request;
  if (!url || typeof url !== "string") {
    sendResponse({ error: "Missing url" });
    return false;
  }
  fetch(url, { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => sendResponse({ data }))
    .catch((err) => {
      console.error("[Background] fetchFromUrl error:", err);
      sendResponse({ error: err?.message });
    });
  return true;
}

/** Handler for a message type; receives request, sendResponse, and optional sender (for tab routing) */
type MessageHandler = {
  (request: any, sendResponse: MessageSender, sender?: browser.Runtime.MessageSender): boolean | void;
};

function isSeqtaOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname.includes("seqta") || u.hostname.endsWith(".edu.au");
  } catch {
    return false;
  }
}

function handleSetDevApiBase(request: any): boolean {
  const url = typeof request?.url === "string" ? request.url.trim() : null;
  if (url && /^https?:\/\//.test(url)) {
    DEV_API_BASE = url.replace(/\/$/, "");
  } else {
    DEV_API_BASE = null;
  }
  return false;
}

const MESSAGE_HANDLERS: Record<string, MessageHandler> = {
  reloadTabs: () => reloadSeqtaPages(),
  setDevApiBase: handleSetDevApiBase,
  extensionPages: (req) => {
    browser.tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        if (tab.url?.includes("chrome-extension://")) browser.tabs.sendMessage(tab.id!, req);
      }
    });
  },
  currentTab: (req, sendResponse) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      browser.tabs.sendMessage(tabs[0].id!, req).then(sendResponse);
    });
    return true;
  },
  githubTab: () => {
    void browser.tabs.create({ url: "github.com/BetterSEQTA/BetterSEQTA-Plus" });
  },
  setDefaultStorage: () => SetStorageValue(getDefaultValues()),
  ensureStorageDefaults: (_req, sendResponse) => {
    void ensureStorageDefaults()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => {
        console.warn("[BetterSEQTA+] ensureStorageDefaults failed:", e);
        sendResponse({ ok: false });
      });
    return true;
  },
  sendNews: (req, sendResponse) => {
    fetchNews(req.source ?? "australia", sendResponse);
    return true;
  },
  fetchThemes: handleFetchThemes,
  fetchThemeDetails: handleFetchThemeDetails,
  fetchFromUrl: handleFetchFromUrl,
  ...googleCalendarHandlers,
  getSeqtaSession: (req: { baseUrl?: string }, sendResponse: MessageSender, sender?: browser.Runtime.MessageSender) => {
    (async () => {
      try {
        let tabId = sender?.tab?.id;
        let originForCheck: string | undefined = req.baseUrl;

        if (tabId == null) {
          const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
          const tab = tabs[0];
          if (!tab?.id || !tab.url) {
            sendResponse({ appLink: null });
            return;
          }
          tabId = tab.id;
          if (!originForCheck) originForCheck = new URL(tab.url).origin;
        } else if (!originForCheck && sender?.tab?.url) {
          originForCheck = new URL(sender.tab.url).origin;
        }

        if (!originForCheck || !isSeqtaOrigin(originForCheck)) {
          sendResponse({ appLink: null });
          return;
        }

        const reply = (await browser.tabs.sendMessage(tabId, { type: "fetchSeqtaAppLink" })) as
          | { appLink?: string | null }
          | undefined;
        const appLink = typeof reply?.appLink === "string" && reply.appLink.length > 0 ? reply.appLink : null;
        sendResponse({ appLink });
      } catch (err) {
        console.error("[Background] getSeqtaSession error:", err);
        sendResponse({ appLink: null });
      }
    })();
    return true;
  },
};

browser.runtime.onMessage.addListener(
  // @ts-ignore - OnMessageListener expects literal true for async, we return boolean
  (request: any, sender: browser.Runtime.MessageSender, sendResponse: MessageSender) => {
    const handler = MESSAGE_HANDLERS[request.type];
    if (handler) {
      const result = handler(request, sendResponse, sender);
      return result === true;
    }
    console.log("Unknown request type");
    return false;
  },
);

function getDefaultValues(): SettingsState {
  return getDefaultSettingsState();
}

function SetStorageValue(object: any) {
  for (var i in object) {
    browser.storage.local.set({ [i]: object[i] });
  }
}

browser.runtime.onInstalled.addListener(function () {
  browser.storage.local.remove(["justupdated"]);
  browser.storage.local.remove(["data"]);

  void ensureStorageDefaults();
});

browser.runtime.onStartup.addListener(() => {
  void ensureStorageDefaults();
});

void ensureStorageDefaults();
