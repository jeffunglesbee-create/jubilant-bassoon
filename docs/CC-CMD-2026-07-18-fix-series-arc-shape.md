# Claude Code Command — Fix buildSeriesArc data-shape mismatch (found via static comparison, no live data needed)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CONTEXT

`buildSeriesArc` (Phase 3b, `src/legacy/field.js`) reads `game.winner` and `game.margin` per game in the series arc. The real, confirmed relay shape (`findSeries()` in field-relay-nba's `src/index.js`, verified directly against source) returns:

```js
{
  series: {...} | null,
  games: [{ id, game_number, date, home, away, home_score, away_score, note, importance }],
  margins: [number]  // top-level array, NOT nested per-game
}
```

Neither `winner` nor `margin` exist as per-game fields. This was found by directly comparing the client function against the real relay source — no live playoff series was needed or used to find it. Left unfixed, every series-arc dot would render without its win/loss coloring or margin tooltip the first time real playoff data is available, silently.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "function buildSeriesArc" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

Re-confirm the real, current relay shape hasn't changed since this was checked — a quick fetch against a real postseason game ID if one is currently in-season, or a direct read of `findSeries()` in the relay repo if not.

---

## TASK 1 — Fix buildSeriesArc to match the real relay shape

Compute winner/margin from what's actually provided:
- `winner`: derive as `'home'` or `'away'` by comparing `home_score` vs `away_score` per game (null/undefined if either score is missing — game not yet played)
- `margin`: use `home_score - away_score` directly per game (matching how the relay's own top-level `margins[]` array is computed, for consistency) — or consume the relay's `margins[]` array directly by index-matching against `games[]`, whichever is more robust to games with null scores

Preserve the existing null-guard behavior (`if (!arc) return null`, `if (!games.length) return null`) — those are correct and don't need to change.

## TASK 2 — Real verification without live playoff data

Since no live playoff series exists right now, build a real, local test using the exact shape `findSeries()` returns (a hand-constructed object matching the confirmed schema, not a guess) and confirm `buildSeriesArc` produces dots with correct `data-winner` and `title` values against it.

```bash
node -e "
// Real relay shape, hand-constructed to match findSeries()'s confirmed schema
const testArc = {
  series: { series_key: 'test' },
  games: [
    { id: 'g1', game_number: 1, home_score: 3, away_score: 1 },
    { id: 'g2', game_number: 2, home_score: 1, away_score: 4 },
  ],
  margins: [2, -3]
};
// [call buildSeriesArc-equivalent logic or extract and test the real function]
"
```

## TASK 3 — Real diff and commit

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

Real commit through the normal path, real live verification per tonight's standard.

---

## DONE CONDITION

`buildSeriesArc` genuinely produces correct `data-winner` and margin data from the real, confirmed relay shape (`home_score`/`away_score` and/or top-level `margins[]`), proven via a real local test using the exact confirmed schema — not assumed correct because it "looks reasonable," and not deferred waiting for live playoff data that isn't available tonight.

**Confidence scoring:**
- TASK 1 (50 pts): real fix matching the confirmed relay schema exactly
- TASK 2 (30 pts): real local test against a hand-constructed but schema-accurate object, not skipped for lack of live data
- TASK 3 (20 pts): real diff, real commit, real live verification

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
