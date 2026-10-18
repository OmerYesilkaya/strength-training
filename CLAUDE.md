# PPL Log

Omer's personal home training program and the small web app that logs it. Phone first, used daily from the iOS home screen. Everything here was built with Claude; this file carries the context a new agent needs.

## What it is

- **Live app:** https://omeryesilkaya.github.io/strength-training/ (GitHub Pages, public repo `OmerYesilkaya/strength-training`, served from the root of `main`).
- **Stack:** one hand-written `index.html` (HTML, CSS, ES5-style JS, no build, no dependencies beyond a Google Font), a service worker `sw.js`, `manifest.webmanifest`, and two PNG icons. Installable PWA, works offline.
- **Data:** lives only in the phone's `localStorage`. There is no backend. History tab has JSON and CSV export and JSON import (merge by session id).
- `PROGRAM.html` is an older standalone, printable copy of the program (green design). The app's Program tab is the source of truth; keep `PROGRAM.html` only if asked.

## Training design (why the app does what it does)

- Equipment: adjustable bench, two 40 kg adjustable dumbbells, pull-up bar, a backpack that holds one dumbbell for weighted bodyweight work.
- Mike Mentzer style: low volume, high intensity. Two hard working sets per exercise (set 1 with one rep in reserve, set 2 to failure). Short sessions, high frequency, six sessions a week is the target.
- Six-session rotation: Push A, Pull A, Legs A, Push B, Pull B, Legs B. Legs are kept healthy and lean, not maximised.
- **Double progression, decided by set 1 only.** Set 2 to failure is noisy and never triggers anything.
  - Set 1 reaches the top of the rep range: next time suggests +2 kg (`STEP`), highlighted indigo.
  - Set 1 lands under the bottom once: keep the weight. Hint says a second miss steps down.
  - Set 1 lands under the bottom two sessions in a row at the same weight: next time suggests −2 kg, highlighted amber. Never below zero; at bodyweight the hint suggests an easier variation instead.
- **Within a session** the same rule runs between sets: a set at the top of the range pre-fills the next set +2 kg, a set under the bottom pre-fills it −2 kg. Only sets with no reps typed yet, that still mirror the previous set, follow; a kg the user typed is never overwritten.

## Code map (`index.html`)

- Design tokens on `:root` with a dark block under `prefers-color-scheme: dark`. Indigo accent, white rounded cards on a soft grey-blue page, Plus Jakarta Sans. Session types colour the UI: push indigo, pull coral, legs green. Step-up uses the accent tokens, step-down the `--warn-*` tokens, delete the `--bad-*` tokens.
- `PROGRAM` constant: six sessions, each `{ key, type, name, focus, ex: [{ key, name, reps: [lo, hi], warm?, load?: 'bw', per?, unit?: 's', note? }] }`. `unit: 's'` marks a timed exercise (farmer's carry): the reps field and stored `reps` hold seconds, and the progression rule works on them unchanged. **Exercise `key`s are shared across sessions and link history and suggestions. Never rename a key; rename `name` instead.** Program changes are made here by hand; Omer tells the agent, the agent edits and pushes.
- Constants: `STEP` (2 kg), `SWIPE_DELETE` (88 px), `TARGET_PER_WEEK` (6), storage keys `ppl.sessions`, `ppl.draft`, `ppl.tab`.
- State: `history` (sessions, newest first), `selected` session index, `autoSelected` (follows "up next" until the user picks), `draft` (the session being entered), `deleteArmed`, `calMonth`.
- Stored session shape: `{ id, date (YYYY-MM-DD), session (PROGRAM key), sessionName, exercises: [{ key, name, load, sets: [{ kg, reps }] }], notes, finishedAt }`. `normalizeSession` migrates the older shape (one `kg` per exercise, reps-only `sets`) on load and on import. Keep that migration.
- Draft shape: `{ v: 2, session, date, ex: { key: { sets: [{ kg, reps }], suggested: 'up' | 'down' | false } }, notes }`. A draft with a different `v` is discarded.
- Key functions: `recentFor` / `suggest` (next-session rule), `wantedKg` / `mirrors` / `setKg` / `applySteps` / `syncRow` (within-session rule), `ensureDraft`, `renderWeek` / `renderCalendar` / `renderBars` (consistency views), `renderToday`, `renderHistory`, `renderProgram`, swipe handlers on `form` (pointer events, `touch-action: pan-y`).
- Log tab layout: each exercise shows a header row and one `.set` row per set (label, kg, reps). Rows stretch to the card width on phones; above 560 px the exercise name sits left and a compact fixed-width set table sits right. Swipe a row left to delete; an exercise keeps at least one set.

## Workflow

- Deploy is `git push` to `main`. **Bump `CACHE` in `sw.js` on every change to app files** or phones keep the old version.
- Test locally with `python3 -m http.server 8765 --bind 127.0.0.1` from the repo root and the Claude in Chrome tools. The Chrome viewport cannot be resized by the tools; to see phone width, serve a scratch page that embeds the app in a 390 px iframe. The drag tool does not emit pointerdown, so test swipes with synthetic `PointerEvent`s.
- Before telling Omer a change is live, poll `https://omeryesilkaya.github.io/strength-training/sw.js` for the new `CACHE` value.
- iOS freezes the home-screen icon at install time. An icon change needs the app removed and re-added; logged data survives because it lives in Safari's storage for the origin.
- Omer's rules: no Claude co-author lines in commits. Prefer quality and simplicity over development cost. Keep unrelated fixes in their own commits.
