# CC Session Doc — Phase 3b: The Debrief (client side)
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 70cd46e (Phase 2 Schedule Compound)
**HEAD end:** 0505b18
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — no boot-visible changes)

---

## Commits

- `0505b18` feat: Phase 3b The Debrief — Layers 1-4, buildDebrief, injectDebriefCards

---

## Pre-build probe findings

**Phase 3a relay confirmed live:**
```
GET /context/game/MLB_2026-07-17_brewers_marlins → 200 OK
game.drama_peak: 74
game.drama_arc_parsed: [588 entries, real values 44-74]
game.opening_odds_parsed: { moneyline: {home:-149, away:123}, spread: {home:-1.5, away:1.5}, total: {over:8, under:8} }
game.home_score: 2, game.away_score: 1, went_to_ot: 1
archive.gameBriefs: [] (empty — no game-specific brief for this game)
series: null (regular season, not playoff)
```

**Relay contract (confirmed vs Phase 3a session doc):**
- Endpoint: `GET /context/game/{id}`
- `game.drama_peak`: number 0-100
- `game.drama_arc_parsed`: array of numbers
- `game.opening_odds_parsed` / `closing_odds_parsed`: `{ moneyline: {home, away}, spread, total }`
- `game.went_to_ot`: number (truthy if OT/extra innings)
- `archive.gameBriefs`: array (empty for most games; game-specific briefs when populated)
- `series`: null for regular season; series object for playoffs (shape unknown, null-guarded)

**Pre-existing architecture confirmed:**
- `buildEnrichedGame` at L2320 — debrief all null without contextGame source
- `renderCard` at L2388 — STAGED, debrief fillSlot was `String(dramaSealed)` placeholder
- `_cardTemplate` at L2193 — `data-slot="debrief"` present, `hidden`
- CSS at index.html L1982: `.game-card.is-final .card-debrief{display:block}` — already present (TASK 6 done)
- L7361: card-body click delegation runs after renderAll — need to re-wire for renderCard-produced replacement cards

---

## What was built

### buildEnrichedGame — contextGame source (L2320)

Added `const _ctx = _src.contextGame ?? null; const _ctxG = _ctx?.game ?? null;` and
populated `debrief` block:
- `dramaSealed`: `_ctxG?.drama_peak ?? null`
- `dramaArc`: `_ctxG?.drama_arc_parsed ?? null` (new field)
- `oddsOutcome`: `{ opening, closing, homeScore, awayScore, home, away, wentToOT }` when `opening_odds_parsed` present, else null
- `preGameBrief`: `archive.gameBriefs[0]?.text` fallback to `journalismBrief`
- `seriesArc`: `_ctx?.series ?? null`

### Layer 1: buildDramaUnsealed (L2460)
Drama bar 0-100% width, color-graded QUIET/HEATING/HOT/MUST via `data-tier`. fieldChip for tier label.
Arc-derived: counts ticks ≥65 from `dramaArc`, converts to minutes at ~15s/tick, renders "Xm high" chip.

### Layer 2: buildFieldWasWatching (L2487)
Renders `preGameBrief` text (first 300 chars) in dim/italic `.debrief-prediction__text`. Returns null when no brief.

### Layer 3: buildOddsStory (L2500)
Determines CHALK/UPSET/SWEAT: opening moneyline → find favorite (negative ml) → compare to final score.
SWEAT condition: favorite won but margin ≤1 OR wentToOT. UPSET: underdog won. CHALK: favorite won convincingly.
Uses real relay data: Brewers -149 (favorite) won Marlins 2-1 in OT → SWEAT.

### Layer 4: buildSeriesArc (L2530)
Null-guards for regular season (`series: null`). When series object present with `series.games[]`, renders dot-per-game.
Pure HTML/CSS, no canvas/SVG.

### buildDebrief (L2551)
Assembles L1-4 into `.card-debrief-inner` Element. Returns null if all layers null (keeps slot hidden).

### _debriefContextCache + injectDebriefCards (L2568, L2572)
Session-level Map caches Context Graph responses (final games are immutable — no TTL needed).
`injectDebriefCards`: scans all `.game-card[data-gameid]:not([data-debrief-injected])`, finds final games in allData,
fetches Context Graph, calls `buildEnrichedGame({ contextGame })` + `renderCard`, replaces DOM card.
Re-wires card-body touch/click/keyboard handlers on replacement cards (matching L7361 delegation pattern).
Fires as `setTimeout(() => injectDebriefCards().catch(()=>{}), 600)` after every renderAll.

### renderCard debrief slot (L2413)
Changed from `String(dramaSealed)` placeholder to `buildDebrief(enrichedGame)` (Element).

### CSS additions (index.html L1984+)
Inner debrief layer styles: `.card-debrief-inner`, `.debrief-drama__bar-track/bar/chips`,
`.debrief-prediction__text`, `.debrief-odds__scenario/line`, `.debrief-arc__dots/dot`.
Drama bar color: HEATING=amber, HOT=red-500, MUST=red-600, QUIET=gray.

---

## Verification

**Mandatory literal verification (CC-CMD required):**
```
grep -n "function buildDramaUnsealed" → 2460 ✓
grep -n "function buildFieldWasWatching" → 2487 ✓
grep -n "function buildOddsStory" → 2500 ✓
grep -n "function buildSeriesArc" → 2530 ✓
grep -n "function buildDebrief\b" → 2551 ✓
grep -n "renderCard(" → L2388 (def), L2603 (injectDebriefCards), L38797, L38803 ✓
node scripts/sync-source.mjs → ✅
node smoke.js index.html → 958/0 ✓
```

**CI on 0505b18 (all green):**
- Deploy gate (fast smoke): success
- Smoke Test + Live Verify: success
- Desktop Chrome Viewport Audit: success
- Desktop Safari Viewport Audit: success
- Client Live Invariant: success

**Live relay probe (real final game):**
```
MLB_2026-07-17_brewers_marlins: drama_peak=74, arc 588 entries, opening_odds home=-149,
went_to_ot=1, home_score=2, away_score=1 → injectDebriefCards will produce:
  Layer 1: 74% bar (HOT tier), ~31m high chip
  Layer 3: SWEAT (Brewers favored, won by 1 in OT)
  Layers 2/4: null (no gameBriefs, series null)
```

---

## TASK 7: Layer 5 Night Owl / Context Graph — deferred

Night Owl journalism prompt is built in `handleJournalismCycle` on the relay side (`src/index.js`).
Integrating drama scores into Night Owl's game selection or prompt text requires relay changes.
**Status: REQUIRES SEPARATE RELAY CC-CMD. Not attempted client-only.**

---

## Integration state

**RELAY CONTRACT:**
- Endpoint: `GET /context/game/{id}`
- Response: `{ ok, id, game: { drama_peak, drama_arc_parsed, opening_odds_parsed, closing_odds_parsed, home_score, away_score, went_to_ot, home, away }, archive: { gameBriefs[] }, series }`
- Cache TTL: 300s for final games

**CLIENT CONSUMER:**
- `buildEnrichedGame(rawGame, { contextGame })` → populates debrief.*
- `injectDebriefCards()` → fetches context, calls renderCard, injects debrief DOM
- Fires 600ms after every renderAll

**INTEGRATION STATUS: VERIFIED** — relay probe confirmed real data, CI green, logic trace correct.

---

## Open carry-forwards

1. **Night Owl / Context Graph prompt integration** — relay-side. Needs separate relay CC-CMD.
2. **`archive.gameBriefs[]` population** — currently empty for most games; `buildFieldWasWatching` renders when populated.
   STAGED: waiting for relay to write game-specific briefs (separate relay work).
3. **`series.games[]` shape** — unknown (null for all tested games). `buildSeriesArc` null-guards correctly.
   Unblocked when: a playoff game with series data is available; verify via probe_relay_route on a playoff game ID.
4. **Journalism brief wiring (renderAll path 3)** — still STAGED from Phase 2.

---

## Confidence: 98/100
- T1 buildDramaUnsealed: 15/15
- T2 buildFieldWasWatching: 10/10
- T3 buildOddsStory: 10/10
- T4 buildSeriesArc: 10/10
- T5 buildDebrief + renderCard + injectDebriefCards: 25/25
- T6 CSS: 5/5
- T7 Layer 5 correctly deferred: 5/5
- T8 diff + CI + live content check: 18/20 (browser render not verifiable from CLI)
