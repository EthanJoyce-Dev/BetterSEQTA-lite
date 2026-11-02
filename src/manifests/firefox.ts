import { createManifest } from "../../lib/createManifest";
import baseManifest from "./manifest.json";
import pkg from "../../package.json";

const updatedFirefoxManifest = {
  ...baseManifest,
  version: pkg.version,
  description: pkg.description,
  background: {
    scripts: [baseManifest.background.service_worker],
  },
  action: {
    default_popup: "interface/index.html#settings",
  },
  browser_specific_settings: {
    gecko: {
      // Same ID as the store build so it replaces it in place and keeps its storage.
      id: "betterseqta@betterseqta.com",
      // Without this, Firefox asks AMO for updates by ID and would reinstall the
      // full store build over this one. This private URL never offers an update.
      update_url:
        "https://raw.githubusercontent.com/EthanJoyce-Dev/BetterSEQTA-lite/main/updates.json",
    },
  },
};

export const firefox = createManifest(updatedFirefoxManifest, "firefox");
