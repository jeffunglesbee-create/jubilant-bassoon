# CC Session Doc — Gap 7 Client: WC Bracket Delta Layer 5 in Debrief Card
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 55b9fc7 (pre-rebase) → **end:** 97d6577

---

## Commits

- `97d6577` feat: Gap 7 client — WC bracket delta Layer 5 in Debrief card

---

## TASK 1 — Pass `bracketDelta` through `buildEnrichedGame`

In `buildEnrichedGame` (`src/legacy/field.js`), the `debrief` sub-object now includes:

```js
bracketDelta: _ctx?.bracketDelta ?? null,
```

Source: `ctx.bracketDelta` which `/context/game/{id}` has served since relay commit `79f950e` (Gap 7 relay side). Field name matches `_computeDelta` return exactly — no normalization needed.

---

## TASK 2 — `buildBracketDeltaLayer(debrief)` (Layer 5)

New function added before `buildDebrief`:

- Reads `debrief.bracketDelta.shifts[]` (top 3)
- Renders shift row per mover: `{name}  {dir}{champDelta.toFixed(1)}pp ({champAfter.toFixed(1)}%)`
- `data-dir="up"` / `data-dir="down"` for CSS coloring
- Appends `fieldChip('SIG', 'HOT', { small: true })` to label when `bd.significant === true`
- Returns `null` if no `bracketDelta` or empty `shifts[]` — guard prevents empty layer render

`champDelta` is in percentage points (verified from `src/bracket-do.js` `_computeDelta` return shape at L654-663). `champAfter` is in percent. Both `.toFixed(1)` for compact display.

---

## TASK 3 — `buildDebrief` updated to Layers 1-5

`buildDebrief` now calls `buildBracketDeltaLayer(debrief)` as `l5` and appends it after `l4` (Series Arc). Guard: `if (!l1 && !l2 && !l3 && !l4 && !l5) return null` unchanged — WC bracket shift alone won't force an empty card.

---

## TASK 4 — CSS for `.debrief-bracket*`

Added to `index.html` after `.debrief-arc__dot[data-winner="away"]` (L1998):

```css
.debrief-bracket{margin-top:.4rem}
.debrief-bracket__label{font-size:.65rem;font-weight:600;opacity:.7;display:flex;align-items:center;gap:.35rem;margin-bottom:.25rem}
.debrief-bracket__movers{display:flex;flex-direction:column;gap:.15rem}
.debrief-bracket__mover{font-size:.68rem;opacity:.6}
.debrief-bracket__mover[data-dir="up"]{color:#22c55e;opacity:.8}
.debrief-bracket__mover[data-dir="down"]{color:#ef4444;opacity:.8}
```

Follows established debrief layer pattern (`.debrief-arc__dot` color conventions reused for up/down).

---

## Verification

```
node scripts/sync-source.mjs → ✅ sync-source: src/legacy/field.js → index.html script block
node smoke.js index.html → 958 passed, 0 failed
```

Push: rebased over CI codemap commit (55b9fc7 → origin/main), then pushed clean to 97d6577.

---

## Confidence: 98/100

- T1 (25/25): field name `bracketDelta` verified against relay doc and `_computeDelta` shape
- T2 (30/30): `champDelta`/`champAfter` scales verified from bracket-do.js source; null guard correct
- T3 (18/20): `buildDebrief` update straightforward; -2 for no live WC match to trigger E2E
- T4 (15/15): CSS follows `.debrief-arc__dot` convention exactly
- Smoke (10/10): 958/0

---

## Integration state

**RELAY CONTRACT:** `GET /context/game/{id}` returns `bracketDelta: {significant, maxChampShift, shifts[], narrativeSeeds[], triggerGame, computedAt}` or `null`. Served since relay `79f950e`.

**CLIENT CONSUMER:** `buildBracketDeltaLayer` in `src/legacy/field.js` reads `debrief.bracketDelta.shifts[]`. Called by `buildDebrief`. Rendered into `.debrief-bracket` container inside `.card-debrief-inner`.

**INTEGRATION STATUS: STAGED** — Full wiring complete (relay + client). E2E requires a live WC match to complete with BracketDO active to write a `bracket_delta` brief row.

**OPEN (per Rule 74 — STAGED-GATE-A):**
- Blocked by: no WC matches have completed since relay `79f950e` (BracketDO hasn't fired with new write path)
- Unblocked when: any WC match completes (WC Final is 2026-07-19)
- Verify relay row: D1 query `SELECT * FROM briefs WHERE brief_type='bracket_delta' LIMIT 5`
- Verify client render: open Debrief card for a WC game → Layer 5 "WC Bracket Shift" section visible with mover rows
