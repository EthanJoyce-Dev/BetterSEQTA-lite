# BetterSEQTA+ Lite

A lighter build of BetterSEQTA+ for [SEQTA Learn](https://educationhorizons.com/solutions/seqta/): the themes, dark mode and custom home page, without the extras that slowed page loads down.

## What's different

Based on BetterSEQTA+ 3.7.2 (before the WebGL loading screens), with:

- **Only runs on SEQTA.** Other sites load a ~2 KB check instead of the whole ~3 MB extension.
- **Less loaded up front.** The settings UI, theme creator and PDF reader load when first opened.
- **Removed:** Global Search, Grade Analytics, Assessments Overview, Message Folders, Background Music, Animated Background, custom profile pictures, startup popups (What's New, Theme of the Month), entry animations and BetterSEQTA Cloud (accounts, settings sync, favourites).
- **Added:** a simple Google Calendar sync (Settings > Google Calendar) that keeps your timetable in a separate "BetterSEQTA+ Lite Timetable" calendar.

Kept: themes and the theme store, dark mode, colours and fonts, the home page, Assessment Averages, timetable tweaks, room/teacher editing and notifications.

## Building

```bash
npm install
npm run build
```

Builds land in `dist/chrome` and `dist/firefox`. Load `dist/chrome` via `chrome://extensions` (Developer mode > Load unpacked), or zip `dist/firefox` and install it as an unsigned add-on in a Firefox build that allows them.

The Firefox build keeps the store version's add-on ID so it can replace it in place (settings carry over), and points its update URL at this repo so the store version isn't reinstalled over it.

## Versioning

Lite has its own [semver](https://semver.org) version numbers, starting at 1.0.0, separate from BetterSEQTA+'s. The version lives in `package.json` and flows into the manifests and the loading screen. To release:

```bash
npm version patch
```

Use `minor` for new features and `major` for breaking changes. This bumps `package.json`, commits, and tags `vX.Y.Z`. Add the notes to [CHANGELOG.md](CHANGELOG.md) (including which BetterSEQTA+ version it's based on), then push with tags:

```bash
git push --follow-tags
```

## Credits

BetterSEQTA+ Lite is maintained by [EthanJoyce-Dev](https://github.com/EthanJoyce-Dev).

### Legacy credits

Lite is built on [BetterSEQTA+](https://github.com/BetterSEQTA/BetterSEQTA-Plus), developed by [SethBurkart123](https://github.com/SethBurkart123), [Crazypersonalph](https://github.com/Crazypersonalph) and contributors, which continued [BetterSEQTA](https://github.com/Nulkem/betterseqta) by [Nulkem](https://github.com/Nulkem), ported to Manifest V3 by [MEGA-Dawg68](https://github.com/MEGA-Dawg68).

Licensed under the MIT license; see [LICENSE](LICENSE).
