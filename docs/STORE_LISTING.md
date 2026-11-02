# Store listing text

Copy-paste text for the Chrome Web Store and addons.mozilla.org (AMO) listings. Upload the `-cws.zip` and `-amo.xpi` files from the GitHub release (plus `-source.zip` on AMO).

## Name

BetterSEQTA+ Lite

## Short summary

(Chrome allows 132 characters, AMO 250.)

> A faster, lighter take on BetterSEQTA+ for SEQTA Learn: themes, dark mode and a better home page, without the heavy extras.

## Description

> BetterSEQTA+ Lite gives SEQTA Learn and SEQTA Engage a cleaner look and a more useful home page, while keeping page loads fast.
>
> It's an unofficial, stripped-down version of the open-source BetterSEQTA+ extension. It keeps the parts most people use and drops the heavy extras, so it only runs on SEQTA pages and SEQTA opens sooner.
>
> Features:
> • Dark mode, custom colours and fonts
> • Themes, including a theme store and theme creator
> • A home page with today's lessons, shortcuts, notices and upcoming assessments
> • Assessment averages
> • Timetable improvements, including editing room and teacher names
> • Lesson notifications
> • Hide and reorder sidebar items
>
> Privacy: your settings stay in your browser, and your SEQTA data never leaves it. See the privacy policy for details.
>
> Not affiliated with Education Horizons (SEQTA) or the BetterSEQTA+ team. Source code: https://github.com/EthanJoyce-Dev/BetterSEQTA-lite

## Links

- Homepage / support: https://github.com/EthanJoyce-Dev/BetterSEQTA-lite
- Privacy policy: https://github.com/EthanJoyce-Dev/BetterSEQTA-lite/blob/main/PRIVACY.md

## Category

- Chrome: Productivity (Education)
- AMO: Appearance; Feeds, News & Blogging is not a fit, so add "Other" if a second one is required

## Chrome Web Store: privacy practices tab

**Single purpose:**
> Improves the look and usability of the SEQTA Learn and SEQTA Engage school portals.

**Permission justifications:**
- `storage`: saves the user's settings (theme, colours, layout) locally.
- `notifications`: optional reminder before the next lesson starts.
- `tabs`: finds open SEQTA tabs so changed settings can reload them, and sends settings changes to the active SEQTA tab.
- Host permission `*://*/*`: schools host SEQTA on their own domains (e.g. `learn.school.edu.au`), so the extension can't list them in advance. A ~2 KB check runs on each page, and the extension only does anything when the page is SEQTA.
- Remote code: **No**, all code is bundled in the package.

**Data usage:** tick none of the data types. Certify that data is not sold, not used for unrelated purposes and not used for creditworthiness.

## AMO submission

- Distribution: **On this site** (listed)
- Source code: **Yes**, upload `betterseqta-plus-lite-X.Y.Z-source.zip`
- Notes to reviewer:

> Built with Vite from the included source. To reproduce: Node 20, then `npm ci && npm run build:store`; the output is `dist/firefox-store`. Full steps in BUILD.md. The pdf.js files under resources/pdfjs are unmodified from the pdfjs-dist package. Remaining linter warnings are innerHTML in the original BetterSEQTA+ UI code and library code (pdf.js, core-js style polyfills). The store build sends no user data (data_collection_permissions: none).
