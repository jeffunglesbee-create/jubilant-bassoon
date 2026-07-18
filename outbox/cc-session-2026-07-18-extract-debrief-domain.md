# CC Session — 2026-07-18 — extract-debrief-domain

**Date:** 2026-07-18
**HEAD start:** e6ea2ca
**HEAD end:** d4a1ca6 (rebased to 2d6508c on main)
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18b (unchanged — no SW change)
**Deploy gate:** CI triggered on 2d6508c

---

## Commits

1. **d4a1ca6 / 2d6508c** — `feat: extract Debrief domain into src/debrief/index.ts (second TS module)`
   - `src/debrief/index.ts`: new file — FieldChipFn type + initDebriefModule() + DebriefData/SeriesArc/SeriesGame/OddsOutcome/BracketDelta/BracketShift/EnrichedGameForDebrief interfaces + buildDramaUnsealed/buildFieldWasWatching/buildOddsStory/buildSeriesArc/buildBracketDeltaLayer/buildDebrief
   - `src/legacy/field.js`: import added; initDebriefModule({ fieldChip }) call added; all 6 original function definitions replaced with extraction comment
   - `field_smoke.js`: initDebriefModule + 6 build function stubs added to new Function() execution context

---

## TASK 1 — Scope review

All 6 confirmed in scope. Each is called exclusively from buildDebrief (the assembler), and buildDebrief has exactly 1 external caller (renderCard's fillSlot). They share a single input type (DebriefData). No function reaches outside the debrief sub-object into unrelated state. Only external dep is fieldChip — injected via DI.

## TASK 2 — TypeScript shapes

Types derived from actual confirmed data:
- `DebriefData`: dramaSealed (number|null), dramaArc (number[]|null), oddsOutcome (OddsOutcome|null), preGameBrief (string|null), seriesArc (SeriesArc|null), bracketDelta (BracketDelta|null)
- `SeriesArc`: `{ series, games: SeriesGame[], margins: number[] }` — confirmed from relay's findSeries() return (field-relay-nba/src/index.js:6389-6395). games[].home_score/away_score NOT game.winner/game.margin (the old broken shape). margins[] is top-level.
- `OddsOutcome`: opening/closing MoneylineOdds, homeScore/awayScore/home/away/wentToOT
- `BracketDelta`: shifts BracketShift[], significant?
- `BracketShift`: name/champDelta/champAfter

## TASK 3 — Extraction

```
grep -n "export function build" src/debrief/index.ts
99:export function buildDramaUnsealed(debrief: DebriefData): HTMLElement | null {
126:export function buildFieldWasWatching(debrief: DebriefData): HTMLElement | null {
139:export function buildOddsStory(debrief: DebriefData): HTMLElement | null {
174:export function buildSeriesArc(debrief: DebriefData): HTMLElement | null {
199:export function buildBracketDeltaLayer(debrief: DebriefData): HTMLElement | null {
225:export function buildDebrief(enrichedGame: EnrichedGameForDebrief): HTMLElement | null {
```

## TASK 4 — Call-site verification

- buildDebrief: 1 external caller (renderCard fillSlot, line 2452) — import resolves correctly
- Layers 1-5: each called only from buildDebrief — no external callers
- buildSeriesArc specifically: reads arc.games[].home_score/away_score and arc.margins[i] — matches confirmed relay shape. SeriesGame type enforces home_score/away_score fields; margins[] is typed number[] on SeriesArc. A mistyped game.winner or game.margin access would now fail TS compilation.

## TASK 5 — Pipeline

- sync-source: ✅ (2134 KB)
- smoke (source): 958/0 ✅
- field_smoke: 0 failures ✅
- build-bundle: esbuild ESM 1568 KB ✅ — all 7 debrief functions (initDebriefModule + 6 builders) inlined
- CI: triggered on 2d6508c

---

## Integration status

VERIFIED (structural). Debrief card behavior is unchanged — same DOM output, same logic. The type system now enforces the corrected SeriesArc shape that the buildSeriesArc fix already shipped.

---

## Carry-forwards

None. CC-CMD self-complete per Rule 87.
