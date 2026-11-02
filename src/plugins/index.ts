import { PluginManager } from "./core/manager";

import timetablePlugin from "./built-in/timetable";
import timetableEditPlugin from "./built-in/timetableEdit";
import notificationCollectorPlugin from "./built-in/notificationCollector";
import themesPlugin from "./built-in/themes";
import assessmentsAveragePlugin from "./built-in/assessmentsAverage";
import enhancedNavigationPlugin from "./built-in/enhancedNavigation";

// Initialize plugin manager
const pluginManager = PluginManager.getInstance();

// Register built-in plugins
pluginManager.registerPlugin(themesPlugin);
pluginManager.registerPlugin(assessmentsAveragePlugin);
pluginManager.registerPlugin(notificationCollectorPlugin);
pluginManager.registerPlugin(timetablePlugin);
pluginManager.registerPlugin(timetableEditPlugin);
pluginManager.registerPlugin(enhancedNavigationPlugin);

export { init as Monofile } from "./monofile";

export async function initializePlugins(): Promise<void> {
  await pluginManager.startAllPlugins();
}

export { pluginManager };

export function getAllPluginSettings() {
  return pluginManager.getAllPluginSettings();
}
