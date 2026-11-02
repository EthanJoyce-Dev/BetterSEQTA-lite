# Releases and updates

BetterSEQTA+ Lite is released on this repo's [GitHub releases](https://github.com/EthanJoyce-Dev/BetterSEQTA-lite/releases). Installed copies update from there.

## Publishing a release

1. Add a `## X.Y.Z` section to [CHANGELOG.md](../CHANGELOG.md) (note the BetterSEQTA+ base version).
2. Bump the version; this commits and tags `vX.Y.Z`:

   ```bash
   npm version patch   # or minor / major
   ```

3. Push the commit and tag:

   ```bash
   git push --follow-tags
   ```

The [Release workflow](../.github/workflows/release.yml) then:

- checks the tag matches `package.json`
- builds Chrome and Firefox
- builds the store versions and runs addons-linter on the AMO build
- creates the GitHub release with the CHANGELOG notes, attaching:
  - `betterseqta-plus-lite-X.Y.Z.xpi` (Firefox / Zen, self-updating)
  - `betterseqta-plus-lite-X.Y.Z-chrome.zip` (Chrome and other Chromium browsers, load unpacked)
  - `betterseqta-plus-lite-X.Y.Z-amo.xpi`: upload to addons.mozilla.org
  - `betterseqta-plus-lite-X.Y.Z-cws.zip`: upload to the Chrome Web Store
  - `betterseqta-plus-lite-X.Y.Z-source.zip`: source for AMO review
- updates [`updates.json`](../updates.json) on `main` to point at the new `.xpi`

To republish an existing tag (for example after fixing the workflow), run the Release workflow manually from the Actions tab with that tag.

## Store versions

`npm run build:store` builds the Chrome Web Store and AMO versions into `dist/chrome-store` and `dist/firefox-store`. They differ from the GitHub builds in that they:

- use their own Firefox add-on ID (`betterseqta-lite@ethanjoyce-dev`) and have no `update_url`, since the store handles updates
- leave out the GitHub updater and Google Calendar sync, so they send no user data (`data_collection_permissions: none`)

Upload them by hand from each release for now. Listing text is in [STORE_LISTING.md](STORE_LISTING.md), and reviewer build steps are in [BUILD.md](../BUILD.md).

## How updates reach installed copies

- **Firefox / Zen:** the Firefox build's `update_url` is `https://raw.githubusercontent.com/EthanJoyce-Dev/BetterSEQTA-lite/main/updates.json`. The browser checks it about once a day and installs newer versions itself. The build is unsigned, so the browser must allow unsigned add-ons (`xpinstall.signatures.required = false`). **Settings > Updates > Check now** shows the latest version, and **Update** asks the browser to install it straight away.
- **Chrome:** unpacked extensions can't update themselves. Settings shows when a newer release exists and **Update** opens the release; download the zip, replace the extension folder and reload it.

## CI

- [`mvp.yml`](../.github/workflows/mvp.yml): builds on every push to `main`.
- [`pr-ci.yml`](../.github/workflows/pr-ci.yml): lint, tests, build and smoke test on pull requests.
- [`release.yml`](../.github/workflows/release.yml): publishes releases (above).
