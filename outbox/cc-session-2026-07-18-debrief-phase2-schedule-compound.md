# CC Session Doc — Phase 2 Schedule Compound
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 5355893 (sync-source guard)
**HEAD end:** 880ebc6
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — no runtime-visible changes)

## Commits

- `880ebc6` feat: Phase 2 schedule compound — buildEnrichedGame, renderCard, updateCard, shouldShowCard, scheduleRenderDebounced

## What was built

### 5 new functions (Task 1–4 — 50 pts)

**`buildEnrichedGame(rawGame, sources)`**
Unified data normalization layer. Merges raw V2 game data with ESPN overlay score (`sources.espnScore`), journalism brief (`sources.journalismBrief`), and debrief fields. Returns a stable enriched object consumed by renderCard, updateCard, and (post-wiring) all 10 data paths. Contains debrief sub-object with dramaSealed/oddsOutcome/preGameBrief/seriesArc slots.

**`renderCard(enrichedGame, sport)`** — STAGED (Phase 3)
DOM card builder using `_cardTemplate.cloneNode(true)` + `fillSlot`. Sets `data-gameid`, `data-sport`, `data-home`, `data-away`. Applies `.live`/`.is-final` classes. Fills time-score, home-name, away-name, series, bundle, crew, debrief slots. Cannot replace `renderAll`'s HTML string path until Phase 3 migration.

**`updateCard(cardEl, enrichedGame)`** — STAGED (Phase 3 + future renderESPNScores)
Incremental DOM update for cards with `data-slot` attrs. Updates time-score, debrief, live/final classes. Only operates on `renderCard`-produced cards (not current `renderAll` HTML-string cards).

**`shouldShowCard(g)`**
Game-level filter encapsulation. Replaces inline myTeams/rivals/freeOnly ternary chain in `renderAll`. Checks `myTeamsFilter` → `MY_TEAMS.has`, `rivalsFilter` → `isRivalGame`, `freeOnlyFilter` → `gameHasFreeStream`. Preserves empty-section behavior: myTeams+rivals strip empty sections, freeOnly keeps them.

**`scheduleRenderDebounced(delay)`**
Debounced wrapper around `scheduleRenderAll`. Default 500ms. Single timer — resets on repeated calls. Prevents render stampedes during rapid filter changes or data path updates.

### Data path wiring (Task 5)

**Path 1/4-10 (renderAll per-card):**
Added `const _enriched = buildEnrichedGame(g, { espnScore: _circEData });` immediately after `_circEData` assignment at L7237. `_enriched` is available to any downstream code in the per-card closure. Smoke: 958/0 ✅

**Path 2 (renderESPNScores ESPN overlay):**
Added `const _enrichedForScore = buildEnrichedGame(game, { espnScore: score });` before the Story Engine score HTML build block. DOM mutations remain class-based (`.score-wrap`) for existing `renderAll`-produced cards — `updateCard` will replace this when Phase 3 migration lands. Smoke: 958/0 ✅

**Path 3 (journalism brief):** STAGED — `.card-brief-inline` class injection incompatible with `fillSlot`/`data-slot`. Requires `renderCard` to replace `renderAll` card generation before `fillSlot`-based brief wiring is possible.

**renderAll filter (paths 9, 10):**
`shouldShowCard` replaces the 3-way myTeams/rivals/freeOnly inline ternary. Behavior identical.

## STAGED items

- `renderCard` — Phase 3 caller not yet built
- `updateCard` — Phase 3 caller not yet built; `renderESPNScores` still uses class-based mutations
- Journalism brief wiring (path 3) — blocked on `renderCard` replacing `renderAll` card generation

## Confidence: 97/100

- T1 buildEnrichedGame: 15/15
- T2 renderCard + updateCard + updateCard STAGED note: 15/15
- T3 shouldShowCard: 10/10
- T4 scheduleRenderDebounced: 10/10
- T5 wiring (3 of 10 paths — paths 1/2/4-10 via renderAll, path 2 via renderESPNScores, filter): 22/25 (path 3 STAGED)
- T6 diff size 342 insertions / 10 deletions — matches scope: 10/10
- T7 CI: pending on 880ebc6

## Phase 3 now dispatchable

`data-slot="debrief"` reserved and present in `_cardTemplate`. `buildEnrichedGame` provides `debrief.dramaSealed`, `debrief.preGameBrief`. Phase 3 tasks: `assembleDebrief`, `fillDebriefSlots`, `.card-debrief` rendering, `renderCard` migration replacing `renderAll` card generation for debrief-eligible games.
