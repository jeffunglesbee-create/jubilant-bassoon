# CC Session Doc — Fix buildSeriesArc data-shape mismatch
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 88536d7
**HEAD end:** 7aa3876
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — no boot-visible changes)

---

## Commits

- `7aa3876` fix: buildSeriesArc — derive winner/margin from real relay shape (home_score/away_score + margins[])

---

## Bug

`buildSeriesArc` (L2530, `src/legacy/field.js`) read `g.winner` and `g.margin` per game object.
The real relay `findSeries()` shape has neither field. Per-game objects contain:
`{ id, game_number, date, home, away, home_score, away_score, note, importance }`.
Winner/margin must be derived.

Found via static comparison of client function against `findSeries()` in field-relay-nba `src/index.js`.
No live playoff series was needed.

---

## Fix

Replaced the two buggy reads in the `games.forEach` loop:

```js
// BEFORE (buggy)
if (g.winner) dot.dataset.winner = g.winner;
if (g.margin != null) dot.title = `${g.margin > 0 ? '+' : ''}${g.margin}`;

// AFTER (correct)
const winner = (g.home_score != null && g.away_score != null)
  ? (g.home_score > g.away_score ? 'home' : 'away')
  : null;
if (winner) dot.dataset.winner = winner;
const margin = Array.isArray(arc.margins) ? arc.margins[i] : null;
if (margin != null) dot.title = `${margin > 0 ? '+' : ''}${margin}`;
```

- `winner`: derived from `home_score` vs `away_score` per game. Null when either score missing (game not yet played).
- `margin`: consumed from `arc.margins[i]` (top-level parallel array, relay-computed). Consistent with how relay calculates it.

---

## Verification

**TASK 2 — local test (hand-constructed schema):**
```
node -e "..."
ALL ASSERTIONS PASSED
g1 winner=home title=+2
g2 winner=away title=-3
g3 winner=undefined title=
```
3 games, 3 correct assertions:
- Home wins (3-1): data-winner=home, title=+2 ✓
- Away wins (1-4): data-winner=away, title=-3 ✓
- Not yet played (null scores): no winner, no title ✓

**TASK 3:**
```
node scripts/sync-source.mjs → ✅
node smoke.js index.html → 958/0 ✓
git diff --stat → 2 files, 14 insertions, 6 deletions ✓
```

---

## Confidence: 100/100
- T1 (fix): 50/50 — exact relay schema, winner derived from scores, margin from arc.margins[]
- T2 (test): 30/30 — 3 assertions all pass including null-score edge case
- T3 (diff/commit): 20/20 — sync, smoke 958/0, clean commit, pushed

---

## Open carry-forwards (unchanged from Phase 3b)

1. Night Owl / Context Graph prompt integration — relay-side. Needs separate relay CC-CMD.
2. `archive.gameBriefs[]` population — relay work needed for `buildFieldWasWatching`.
3. `series.games[]` shape — null-guarded, will render when playoff data available (fix now correct).
