// Writes updates.json, the Firefox update manifest that the Firefox build's
// `update_url` points at. Firefox installs the highest listed version that is
// newer than the installed one.
// Usage: node scripts/write-update-manifest.mjs <version> <xpi-url> [sha256:<hash>]
import fs from "node:fs";

const ADDON_ID = "betterseqta@betterseqta.com";
const [version, updateLink, updateHash] = process.argv.slice(2);

if (!version || !updateLink) {
  console.error("Usage: write-update-manifest.mjs <version> <xpi-url> [sha256:<hash>]");
  process.exit(1);
}

const update = { version, update_link: updateLink };
if (updateHash) update.update_hash = updateHash;

const manifest = { addons: { [ADDON_ID]: { updates: [update] } } };
fs.writeFileSync("updates.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`updates.json -> ${version} (${updateLink})`);
