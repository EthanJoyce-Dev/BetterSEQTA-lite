import { AUTO_SYNC_INTERVAL_MS } from "./config";
import { isConnected, readSettings, readState } from "./storage";

/**
 * Runs a quiet sync on SEQTA load when connected, enabled and not synced in the
 * last day. The sync code itself is only loaded when a sync is actually due.
 */
export async function autoSyncGoogleCalendarIfDue(): Promise<void> {
  const [state, settings] = await Promise.all([readState(), readSettings()]);
  if (!isConnected(state) || !settings.autoSync) return;
  if (state.lastSyncAt && Date.now() - state.lastSyncAt < AUTO_SYNC_INTERVAL_MS) return;

  const { syncGoogleCalendar } = await import("./sync");
  const result = await syncGoogleCalendar();
  if (!result.success) {
    console.warn("[BetterSEQTA+ Lite] Calendar auto-sync failed:", result.error);
  }
}
