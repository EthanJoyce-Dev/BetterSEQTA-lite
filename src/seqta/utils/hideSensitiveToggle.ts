import { settingsState } from "./listeners/SettingsState";
import hideSensitiveContent, {
  stopHidingSensitiveContent,
} from "@/seqta/ui/dev/hideSensitiveContent";

/** The privacy screen only runs while dev mode is on. */
function isEnabled(): boolean {
  return Boolean(settingsState.devMode && settingsState.hideSensitiveContent);
}

export function initializeHideSensitiveToggle() {
  let enabled = isEnabled();
  if (enabled) hideSensitiveContent();

  const update = () => {
    const next = isEnabled();
    if (next === enabled) return;
    enabled = next;
    if (enabled) {
      hideSensitiveContent();
      return;
    }
    // The real text was overwritten, so reload to get it back.
    stopHidingSensitiveContent();
    location.reload();
  };

  settingsState.register("hideSensitiveContent", update);
  settingsState.register("devMode", update);
}
