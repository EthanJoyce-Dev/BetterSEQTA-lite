import browser from "webextension-polyfill";

/**
 * Updates come from this repo's GitHub releases. On Firefox the build's
 * `update_url` points at `updates.json` here, so the browser installs new
 * releases itself (and `updaterInstall` just asks it to check now). Chrome
 * can't update an unpacked extension, so there the user is sent to the release.
 */
const RELEASE_REPO = "EthanJoyce-Dev/BetterSEQTA-lite";
export const RELEASES_URL = `https://github.com/${RELEASE_REPO}/releases`;

const CACHE_KEY = "bsplus_update_check";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface UpdateInfo {
  current: string;
  latest?: string;
  available: boolean;
  url: string;
  /** Firefox installs releases itself; Chrome needs a manual download. */
  autoInstall: boolean;
  error?: string;
}

type Handler = (request: any, sendResponse: (response?: unknown) => void) => boolean;

const isFirefox = () => typeof (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo === "function";

/** Numeric comparison of dotted versions ("1.10.0" > "1.9.2"). */
function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split(".").map((n) => parseInt(n, 10) || 0);
  const b = current.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

async function latestRelease(force: boolean): Promise<{ version: string; url: string }> {
  const cached = (await browser.storage.local.get(CACHE_KEY))[CACHE_KEY] as
    | { checkedAt: number; version: string; url: string }
    | undefined;
  if (!force && cached && Date.now() - cached.checkedAt < CHECK_INTERVAL_MS) return cached;

  const res = await fetch(`https://api.github.com/repos/${RELEASE_REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub releases request failed (${res.status})`);
  const release = (await res.json()) as { tag_name?: string; html_url?: string };
  const version = release.tag_name?.replace(/^v/, "");
  if (!version) throw new Error("Latest release has no version tag.");

  const latest = { version, url: release.html_url ?? RELEASES_URL };
  await browser.storage.local.set({ [CACHE_KEY]: { ...latest, checkedAt: Date.now() } });
  return latest;
}

async function checkForUpdate(force: boolean): Promise<UpdateInfo> {
  const current = browser.runtime.getManifest().version;
  const autoInstall = isFirefox();
  try {
    const latest = await latestRelease(force);
    return {
      current,
      latest: latest.version,
      available: isNewer(latest.version, current),
      url: latest.url,
      autoInstall,
    };
  } catch (err) {
    return {
      current,
      available: false,
      url: RELEASES_URL,
      autoInstall,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Firefox: asks the browser to fetch the update now; it installs it and reloads
 * the extension. Returns the browser's status ("update_available", "no_update",
 * "throttled"), or "manual" where the user has to install it themselves.
 */
async function installUpdate(): Promise<{ status: string; url: string }> {
  if (!isFirefox()) return { status: "manual", url: RELEASES_URL };
  const result = (await browser.runtime.requestUpdateCheck()) as unknown;
  // Firefox resolves with { status, version }; older polyfills pass [status, details].
  const status = Array.isArray(result) ? result[0] : (result as { status?: string })?.status;
  return { status: status ?? "no_update", url: RELEASES_URL };
}

const asyncHandler =
  (fn: (request: any) => Promise<unknown>): Handler =>
  (request, sendResponse) => {
    fn(request).then(sendResponse, (err) =>
      sendResponse({ error: err instanceof Error ? err.message : String(err) }),
    );
    return true;
  };

export const updaterHandlers: Record<string, Handler> = {
  updaterCheck: asyncHandler((request) => checkForUpdate(request?.force === true)),
  updaterInstall: asyncHandler(installUpdate),
};
