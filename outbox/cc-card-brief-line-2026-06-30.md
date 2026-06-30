# CC Outbox — Card Brief Line + Live Card Line

**Date:** 2026-06-30
**CC-CMD:** docs/CC-CMD-2026-06-27-client-card-brief-line.md
**Commit:** (see below)
**SW_VERSION:** 2026-06-30c (bumped from 2026-06-30b)
**Smoke:** 813/0 (was 809/0; +4 from A_CARD_BRIEF_LINE_1–4)

---

## Probes P1–P10 — All Passed

| Probe | Finding |
|-------|---------|
| P1 | `_gameBriefCache` at L38688 — `const _gameBriefCache = {}; // gameId → brief text` |
| P2 | `case 'final':` at L37864; shape matches spec exactly |
| P2b | `game.matchupNote` at L37795 inside `case 'pre':` — confirmed NOT touched |
| P3 | `.card-stage-content` CSS at L1197 — `font-size:.62rem` ✓ |
| P4 | `fetchGameBriefOnDemand.then()` at L38547 — no `scheduleRenderAll` before this change ✓ |
| P5 | `_sseScoreTs` at L26938 (inside closure), exposed as `window._sseScoreTs` at L27324 |
| P6 | `buildLiveCardLine` — zero matches (did not exist) ✓ |
| P7 | `V2_RELAY_BASE` constant at L16553 ✓ |
| P8 | `scheduleRenderAll` at L10160-10163 — 150ms debounce ✓ |
| P9 | Smoke 809/0 before edits ✓ |
| P10 | `node --check index.html` — no inline check ✓ |

**Key correction from P5:** `_sseScoreTs` is inside a closure, not module-scope. `buildLiveCardLine` uses `window._sseScoreTs` (not bare `_sseScoreTs`) per actual exposure at L27324.

**Key correction from eData field names:** `mapV2ToESPN` uses `homeScore`/`awayScore` (camelCase). CC-CMD spec had `home_score`/`away_score` — corrected in implementation.

---

## Task 1 — buildLiveCardLine

Inserted after `_gameBriefCache` declaration (L38688). Uses `window._sseScoreTs` for scorer/red-card data. Returns `''` when `eData.state !== 'in'`.

Example output: `"1–0 67' — Baena"` (away–home, clock, scorers from SSE events).

---

## Task 2 — case 'final' wired + case 'live' wired

**`case 'final':`** — replaced entire block. Score line + brief join via `parts.join(' · ')`. Brief is first sentence only. When no score data, peak fallback + brief both render if available.

**`case 'pre':`** — UNTOUCHED. Verified at L37787-37816, `game.matchupNote` logic intact.

**`case 'live':`** — inserted after `buildStoryTape` check. Story tape has priority; `buildLiveCardLine` fires next if it returns a non-empty string; existing score/detail display handles the rest.

---

## Task 3 — Page-load batch pre-population

Added in `renderAll()` after `initFIELDBrief` setTimeout. Guard: `window._gameLinesLoaded` prevents re-fetching on subsequent `renderAll()` calls. Fires at 500ms. Matches relay `espnEventId` → `g._espnId || g.espnEventId`. Only populates games not already in `_gameBriefCache`.

---

## Task 4 — scheduleRenderAll in fetchGameBriefOnDemand.then()

Added `scheduleRenderAll()` at L38553, after bottom sheet update. Card face now updates immediately when the on-demand brief resolves.

---

## Task 5 — Smoke assertions

Added A_CARD_BRIEF_LINE_1–4 to smoke.js. All pass. A_CARD_BRIEF_LINE_4 required slice size 600 (not 400) since the `.then` block is ~450 chars from the `fetchGameBriefOnDemand` string to `scheduleRenderAll`.

Smoke: 809 → 813 (+4 new assertions, 0 failed).

---

## Done Conditions

- [x] P1–P10 probes all passed before any edit
- [x] `buildLiveCardLine` defined, returns '' when eData.state !== 'in'
- [x] `_cardBrief` read inserted in `case 'final':`, brief joins via `parts.join(' · ')`
- [x] `case 'pre':` matchupNote logic confirmed unchanged
- [x] Live card line wired in `case 'live':` after buildStoryTape
- [x] Page-load batch fetch present, fires after render, once-only guard
- [x] `scheduleRenderAll()` in fetchGameBriefOnDemand.then()
- [x] A_CARD_BRIEF_LINE_1–4 all passing
- [x] SW_VERSION bumped to 2026-06-30c in index.html and sw.js
- [x] 813/0 smoke

## Task 6 — STAGED

Visual verification (card face shows brief sentence, live card shows scorer line) requires the deployed app. CC sandbox blocks `*.workers.dev:443`. CI will verify after deploy.
