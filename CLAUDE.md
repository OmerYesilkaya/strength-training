# PPL Log

Omer's personal home training program and the small web app that logs it. Phone first, used daily from the iOS home screen. Everything here was built with Claude; this file carries the context a new agent needs.

## What it is

- **Live app:** https://omeryesilkaya.github.io/strength-training/ (GitHub Pages, public repo `OmerYesilkaya/strength-training`, served from the root of `main`).
- **Stack:** one hand-written `index.html` (HTML, CSS, ES5-style JS, no build, no dependencies beyond a Google Font), a service worker `sw.js`, `manifest.webmanifest`, and two PNG icons. Installable PWA, works offline.
- **Data:** lives only in the phone's `localStorage`. There is no backend. History tab has JSON and CSV export and JSON import (sessions merge by id, body days merge by date, profile fields fill in only where empty). The JSON export carries both sessions and body data; the CSV is sessions only.
- `PROGRAM.html` is an older standalone, printable copy of the program (green design). The app's Program tab is the source of truth; keep `PROGRAM.html` only if asked.

## Training design (why the app does what it does)

- Equipment: adjustable bench, two 40 kg adjustable dumbbells, pull-up bar, a backpack that holds one dumbbell for weighted bodyweight work.
- Mike Mentzer style: low volume, high intensity. Two hard working sets per exercise (set 1 with one rep in reserve, set 2 to failure). Short sessions, high frequency, six sessions a week is the target.
- Six-session rotation: Push A, Pull A, Legs A, Push B, Pull B, Legs B. Legs are kept healthy and lean, not maximised.
- **Double progression, decided by set 1 only.** Set 2 to failure is noisy and never triggers anything.
  - Set 1 reaches the top of the rep range: next time suggests +2 kg (`STEP`), highlighted lime.
  - Set 1 lands under the bottom once: keep the weight. Hint says a second miss steps down.
  - Set 1 lands under the bottom two sessions in a row at the same weight: next time suggests −2 kg, highlighted amber. Never below zero; at bodyweight the hint suggests an easier variation instead.
- **Within a session** the same rule runs between sets: a set at the top of the range pre-fills the next set +2 kg, a set under the bottom pre-fills it −2 kg. Only sets with no reps typed yet, that still mirror the previous set, follow; a kg the user typed is never overwritten.

## Body tab (weight, intake, body fat)

- Purpose: Omer is cutting to 16–18 % body fat. The weight trend is the ground truth and calories are the lever, so the tab must stay useful when calories are missing. Intake is one rough number a day in "his own units" (consistent guesses); a systematic underestimate cancels out because maintenance is measured from his own intake and trend.
- Storage key `ppl.body`: `{ v: 1, profile: { height, birthYear, sex: 'm' | 'f', goalBf, rate, maintenance }, days: { 'YYYY-MM-DD': { kg, steps, waist, neck, hip, meals: [{ kcal, protein?, at? }] } } }`. Every field optional; empty days are pruned. A day's calories and protein are the sum of its meals; `normalizeDay` folds the older one-`kcal`-per-day shape into a single meal on load and on import. Keep that migration. Defaults: goal 17 %, rate 0.6 % of bodyweight a week.
- Trend: per-day exponential smoothing (`TREND_ALPHA`), with the step widened for skipped mornings. Weekly rate = trend now minus trend at least `RATE_SPAN` (14) days earlier, shown once there are 7 weigh-ins. Verdict: within `RATE_BAND` (0.25 %/wk) of the target rate is "on target"; beyond it the verdict is "mild" (amber) up to `RATE_MAJOR` (0.6 %/wk off) and "major" (red) past that or whenever the trend is rising. Slower says "eat N kcal less" with a concrete tip, faster says "eat N kcal more" (N from the gap, 100–500).
- Finish line card: days left and the finish date at the current pace, the date at the target pace, a pace pill coloured by the verdict severity with an eat-less or eat-more tip, and a progress bar from the first weigh-in's trend to the goal weight. Before a pace exists it counts at the target rate; while the trend is flat or rising it shows "not moving toward it".
- Maintenance, in priority order: measured (mean logged kcal over the rate span minus the trend change in kcal, needs ≥ 60 % of those days logged), the profile value, Mifflin-St Jeor × 1.45. Target intake = maintenance − deficit for the target rate. Protein 1.8 g/kg, step target 7 000.
- Body fat is the US Navy tape formula from the latest day with waist and neck (and hips for women); goal weight = lean mass / (1 − goal bf). Chart is inline SVG, last 56 days, dots are scale weight, line is trend, dashed green line is goal weight when near the range. Tap or drag on the chart for a readout.
- Two entry cards share one date picker: Morning (weight, tape) saves on input, placeholders show the last logged value. Through the day: meals are added one at a time as they are eaten (Enter or the Add button), listed with a × to remove, and totalled against the day's target; steps is an end-of-day number from the phone. "Same as yesterday" copies the last logged day's meals when the day has none. The recent-days list is tap-to-edit. Profile is a collapsible card at the bottom.
- Key functions: `bodyStats` (everything computed), `trendSeries`, `verdictOf`, `navyBf`, `mifflin`, `renderBodyInputs` / `renderBodyStats` / `renderChart`, `mergeBody` (import).

## Code map (`index.html`)

- Design tokens on `:root` with a dark block under `prefers-color-scheme: dark`. Black and white with a lime accent (`--accent` #c6ff00, `--accent-ink` is a darker green for text on white), square corners everywhere, 1 px `--edge` borders instead of shadows, tight spacing. Two fonts: Orbitron (`--display`) for titles, labels, buttons and numbers, Rajdhani (`--font`) for running text. Session types stay monochrome plus lime: push lime, pull ink (inverted), legs grey, each with `--on-*` text tokens. Step-up uses the accent tokens, step-down the `--warn-*` tokens, delete the `--bad-*` tokens.
- `PROGRAM` constant: six sessions, each `{ key, type, name, focus, ex: [{ key, name, reps: [lo, hi], warm?, load?: 'bw', per?, unit?: 's', note? }] }`. `unit: 's'` marks a timed exercise (farmer's carry): the reps field and stored `reps` hold seconds, and the progression rule works on them unchanged. **Exercise `key`s are shared across sessions and link history and suggestions. Never rename a key; rename `name` instead.** Program changes are made here by hand; Omer tells the agent, the agent edits and pushes.
- Constants: `STEP` (2 kg), `SWIPE_DELETE` (88 px), `TARGET_PER_WEEK` (6), body constants listed above, storage keys `ppl.sessions`, `ppl.draft`, `ppl.tab`, `ppl.body`.
- State: `history` (sessions, newest first), `selected` session index, `autoSelected` (follows "up next" until the user picks), `draft` (the session being entered), `deleteArmed`, `calMonth`, `body` (profile and days), `bodyDate` (the day the check-in form edits).
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
