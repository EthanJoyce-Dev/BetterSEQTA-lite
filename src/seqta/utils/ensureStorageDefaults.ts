import browser from "webextension-polyfill";
import { getDefaultSettingsState } from "@/seqta/utils/defaultSettings";

/**
 * Keys that are never backfilled: legacy top-level keys superseded by plugin
 * settings, and keys where "unset" intentionally differs from the default.
 */
const SKIPPED_KEYS = new Set([
  "animatedbk",
  "bksliderinput",
  "assessmentsAverage",
  "lettergrade",
  "notificationCollector",
  "timeFormat",
  "selectedFont",
]);

/** Writes any missing top-level default settings. Never overwrites existing values. */
export async function ensureStorageDefaults(): Promise<void> {
  const existing = await browser.storage.local.get();
  const patch: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(getDefaultSettingsState())) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (Object.prototype.hasOwnProperty.call(existing, key)) continue;
    patch[key] = value;
  }

  if (Object.keys(patch).length > 0) {
    await browser.storage.local.set(patch);
  }
}
