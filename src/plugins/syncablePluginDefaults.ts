/**
 * Serializable plugin setting defaults for cloud sync backfill.
 *
 * Kept separate from `@/plugins` so the service worker never imports Svelte UI or
 * Vite HMR clients. Values must match each plugin's non-component settings.
 */
/** `plugin.<id>.settings` defaults (component/button keys omitted). */
export const SYNCABLE_PLUGIN_SETTING_DEFAULTS: Record<
  string,
  Record<string, unknown>
> = {
  themes: {},
  "assessments-average": { lettergrade: false },
  notificationCollector: {},
  timetable: {},
  timetableEdit: {},
  "enhanced-navigation": { autoScrollOnClick: false },
};
