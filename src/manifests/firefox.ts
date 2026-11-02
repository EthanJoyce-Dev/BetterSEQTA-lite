import { createManifest } from "../../lib/createManifest";
import baseManifest from "./manifest.json";
import pkg from "../../package.json";
import type { Manifest } from "../../lib/types";

/** `STORE=true` builds the addons.mozilla.org version; otherwise the self-updating GitHub build. */
const isStoreBuild = process.env.STORE === "true";

const gecko = isStoreBuild
  ? {
      // Our own ID: the store version of BetterSEQTA+ owns betterseqta@betterseqta.com on AMO.
      id: "betterseqta-lite@ethanjoyce-dev",
      // Built-in data-collection consent (required for new AMO listings) needs Firefox 140+.
      strict_min_version: "140.0",
      // The store build leaves out Google Calendar sync, its only off-device data flow.
      data_collection_permissions: { required: ["none"] },
    }
  : {
      // Same ID as the BetterSEQTA+ store build so it replaces it in place and keeps its storage.
      id: "betterseqta@betterseqta.com",
      // Firefox installs new GitHub releases listed here (and won't pull the store build over it).
      update_url:
        "https://raw.githubusercontent.com/EthanJoyce-Dev/BetterSEQTA-lite/main/updates.json",
    };

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
    gecko,
    // The data-collection declaration needs Firefox for Android 142+.
    ...(isStoreBuild ? { gecko_android: { strict_min_version: "142.0" } } : {}),
  },
};

// crxjs's manifest type predates data_collection_permissions / gecko_android.
export const firefox = createManifest(updatedFirefoxManifest as unknown as Manifest, "firefox");
