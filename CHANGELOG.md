# Changelog

BetterSEQTA+ Lite has its own version numbers ([semver](https://semver.org)), starting at 1.0.0.
Each release notes which BetterSEQTA+ version it is based on.

## 1.3.0

Based on BetterSEQTA+ 3.7.2, with fixes from 3.7.3–3.7.7.

- Fixed icons on the Courses and Assessments pages showing as text after SEQTA's update
- Fixed home page notices sometimes not loading (on Learn and Engage)
- Fixed upcoming assessments missing subjects when you have more than one active year
- Fixed custom background images and videos not showing in settings
- Fixed the timetable's edit (pencil) button not showing when you click a lesson
- Fixed edited teacher names not showing on lessons that have an assessment
- Fixed Enhanced Navigation arrows staying on screen after leaving a course
- Assessment averages now count "Feedback Released" assessments
- Settings dropdowns have better contrast and work with the keyboard; SEQTA's own dropdowns are easier to read
- Dev mode's Hide Personal Info swaps teacher and student names, rooms, your student ID and house for fake ones
  that stay the same across pages, so screenshots are safe to share
- Security: the theme store's background download only fetches from betterseqta.org and GitHub
- Security: links passed into the assessment PDF reader are fully escaped

## 1.2.1

Based on BetterSEQTA+ 3.7.2.

- Security: removed the API address override; a script on a SEQTA page could use it to point Lite's theme store at another server
- Security: news descriptions show as plain text, and news links and images only accept http(s) URLs, so a bad RSS feed can't put HTML into SEQTA
- Removed the "API Base URL" developer setting

## 1.2.0

Based on BetterSEQTA+ 3.7.2.

- Adds dedicated Chrome Web Store and AMO builds, without the GitHub updater or Google Calendar sync
- Releases include store upload packages and a source archive for AMO review

## 1.1.0

Based on BetterSEQTA+ 3.7.2.

- Updates from GitHub releases: Firefox/Zen installs new versions automatically
- Settings > Updates shows your version, checks for a newer release and installs it
  (on Chrome it opens the release to download)
- Releases are built and published automatically from version tags

## 1.0.0

Based on BetterSEQTA+ 3.7.2 (the last release before the WebGL loading screens).

- Only loads on SEQTA pages; other sites run a ~2 KB check instead of the whole extension
- Settings UI, theme creator and PDF reader load on first use
- Pages show sooner: quick loading-screen fade, no entry animations, no duplicate font download
- Removed Global Search, Grade Analytics, Assessments Overview, Message Folders, Background Music,
  Animated Background, custom profile pictures and the startup popups
- Removed BetterSEQTA Cloud (accounts, settings sync, theme favourites)
- Added a simple Google Calendar sync for your timetable (Settings > Google Calendar)
- Renamed to BetterSEQTA+ Lite, with its own logo and update URL
