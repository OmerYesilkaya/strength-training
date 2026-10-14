# Strength training

A home push / pull / legs program and the small app that logs it.

- `index.html`, `sw.js`, `manifest.webmanifest`, icons: the PPL Log app. A single-page, offline-capable web app. Sessions are stored in the browser's local storage; History has JSON and CSV export and JSON import.
- `PROGRAM.html`: the program as a standalone, printable page. The same content is in the app's Program tab.

Hosted with GitHub Pages from the root of `main`. Editing `index.html` and pushing is a deploy. Bump `CACHE` in `sw.js` when app files change so phones pick up the new version.
