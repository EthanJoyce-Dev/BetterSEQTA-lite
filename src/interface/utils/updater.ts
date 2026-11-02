import browser from "webextension-polyfill";
import type { UpdateInfo } from "@/background/updater";

export type { UpdateInfo };

/** Latest GitHub release vs the installed version (cached for a few hours unless forced). */
export async function checkForUpdate(force = false): Promise<UpdateInfo> {
  return (await browser.runtime.sendMessage({ type: "updaterCheck", force })) as UpdateInfo;
}

/**
 * Installs `info`'s update: Firefox fetches and applies it itself, elsewhere
 * the release page opens. Returns a status message for the user.
 */
export async function installUpdate(info: UpdateInfo): Promise<string> {
  if (!info.autoInstall) {
    window.open(info.url, "_blank");
    return "Download the new version from the release page, then replace the extension's folder and reload it.";
  }
  const { status } = (await browser.runtime.sendMessage({ type: "updaterInstall" })) as {
    status?: string;
  };
  switch (status) {
    case "update_available":
      return `Installing ${info.latest}… the extension reloads when it's done. Refresh SEQTA afterwards.`;
    case "throttled":
      return "The browser checked for updates too recently. Try again in a few minutes.";
    default:
      return "The browser hasn't picked up the new version yet. Try again in a few minutes.";
  }
}
