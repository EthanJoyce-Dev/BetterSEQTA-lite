# Building BetterSEQTA+ Lite from source

These steps reproduce the store builds exactly (for example for addons.mozilla.org review).

## Requirements

- Node.js 20 (tested with 20.x; npm 10)
- Any OS (Linux, macOS or Windows)

## Steps

```bash
npm ci
npm run build:store
```

- `npm ci` installs the exact versions in `package-lock.json`. Its `postinstall` step copies the pdf.js worker files from `node_modules/pdfjs-dist` into `src/public/resources/pdfjs`.
- `npm run build:store` builds with Vite and writes:
  - `dist/firefox-store/`: the addons.mozilla.org version
  - `dist/chrome-store/`: the Chrome Web Store version

To package the Firefox build the same way as the uploaded file:

```bash
cd dist/firefox-store && zip -qr ../betterseqta-plus-lite-amo.xpi .
```

## Notes for reviewers

- All JavaScript is bundled from `src/` by Vite (`vite.config.ts`); nothing is loaded remotely.
- `resources/pdfjs/*.mjs` are the unmodified pdf.js builds from the `pdfjs-dist` package.
- The store build leaves out the GitHub self-updater and Google Calendar sync (`__STORE_BUILD__` in the code), so it sends no user data anywhere. It only fetches public data: the theme store list (betterseqta.org), news headlines (newsapi.org) and Google Fonts.
- `npm run lint:amo` runs addons-linter on `dist/firefox-store`.
