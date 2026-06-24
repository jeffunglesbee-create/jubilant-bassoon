# CC-CMD: Permutations Engine Gaps — Draw Fallback + Cross-Group Tiebreaker
**Date:** 2026-06-24  
**Repo:** jubilant-bassoon  
**Rule 87:** Self-completing. All probes, edits, smoke, SW_VERSION, and outbox manifest run inside this session.

---

## CONTEXT

Two gaps in the permutations engine:

**Gap 1 — Draw GF/GA fallback defaults to 0-0.**
`wcApplyOutcome` draw branch: `const drHg = lH ? Math.round(lH * 0.6) : 0`.
When no Poisson lambda is available (odds unavailable, no totals line), draws
are scored as 0-0 for GF purposes. Points/GD/W/D/L are correct; only GF depth
is affected. Historical WC group draws average ~1.1 goals per team. Fix: use
`WC_DRAW_AVG_LAMBDA = 1.1` as fallback so draws become 1-1 by default rather
than 0-0. No change when lambdas are present.

**Gap 2 — `wcSortThirdPlaceAcrossGroups` missing criteria 4+5.**
Current sort: `Pts → GD → GF`. FIFA criteria 4 is fair play (cards).
Criteria 5 is drawing of lots. Neither is implemented.

Fair play requires card accumulation data not available in the permutations
path. Drawing of lots is literally random. Fix: add a seeded deterministic
team-name hash as the final tiebreaker — reproducible approximation of
drawing of lots (FIFA criteria 5). Document fair play omission explicitly.
This is correct: fair play decided cross-group advancement exactly once in
WC history (1990); the 5000-sample Monte Carlo distributes these cases
statistically anyway.

---

## PROBE BLOCK

1. Read `wcApplyOutcome` draw branch. Confirm:
   - `const drHg = lH ? Math.round(lH * 0.6) : 0;`  (~L22994)
   - `const drAg = lA ? Math.round(lA * 0.6) : 0;`  (~L22995)
   - `WC_DRAW_AVG_LAMBDA` does NOT exist yet

2. Read `wcSortThirdPlaceAcrossGroups`. Confirm:
   - Sort ends at `|| (b.GF - a.GF)` with no further tiebreaker
   - No team name hash or fair play term present

3. Confirm highest smoke assertion number (tail smoke.js).

---

## TASK 1 — Draw GF/GA fallback

### 1a. Add constant near `wcApplyOutcome`

Find the line `function wcApplyOutcome`. Insert immediately before it:

```javascript
// WC_DRAW_AVG_LAMBDA: WC group-stage draws average ~1.1 goals per team.
// Used when Poisson lambdas are unavailable (no odds/totals line).
// Gives draws a 1-1 scoreline floor instead of 0-0, keeping GF tiebreakers
// realistic when odds data is absent.
const WC_DRAW_AVG_LAMBDA = 1.1;
```

### 1b. Replace fallback 0 with constant

Find the exact draw branch in `wcApplyOutcome`:

```javascript
    const drHg = lH ? Math.round(lH * 0.6) : 0;  // rough fraction of shots in draw
    const drAg = lA ? Math.round(lA * 0.6) : 0;
```

Replace with:

```javascript
    const drHg = Math.round((lH ?? WC_DRAW_AVG_LAMBDA) * 0.6);  // ~1 goal each in avg WC draw
    const drAg = Math.round((lA ?? WC_DRAW_AVG_LAMBDA) * 0.6);
```

**Verification:** grep `index.html` for `WC_DRAW_AVG_LAMBDA` — must appear exactly
twice (constant declaration + usage). grep for `: 0;  // rough fraction` — must
return 0 matches (old fallback gone).

**Proof:** `Math.round(1.1 * 0.6) = Math.round(0.66) = 1`. Draws without odds
become 1-1 instead of 0-0. With odds (e.g., lambdaHome = 2.197): unchanged —
`lH ?? WC_DRAW_AVG_LAMBDA` returns `lH`.

---

## TASK 2 — Cross-group tiebreaker: criteria 4 (fair play) + 5 (drawing of lots)

### 2a. Add `wcTeamNameHash` helper

Find a logical location near `wcSortThirdPlaceAcrossGroups` (immediately before
it). Add:

```javascript
// Deterministic team-name hash for drawing-of-lots tiebreaker (FIFA criteria 5).
// Fair play (criteria 4) is omitted — card accumulation is not tracked in the
// permutations path. This seeded hash gives reproducible, stable rank ordering
// for the edge case where two 3rd-place teams are equal on Pts/GD/GF.
// Historical note: fair play decided cross-group best-3rd exactly once (WC 1990).
function _wcTeamNameHash(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = (h * 16777619) >>> 0;  // FNV-1a 32-bit, unsigned
  }
  return h;
}
```

### 2b. Extend `wcSortThirdPlaceAcrossGroups` sort chain

Find:
```javascript
function wcSortThirdPlaceAcrossGroups(thirdPlaceArr) {
  return thirdPlaceArr.slice().sort((a, b) =>
    (b.Pts - a.Pts)
      || ((b.GF - b.GA) - (a.GF - a.GA))
      || (b.GF - a.GF)
  );
}
```

Replace with:
```javascript
function wcSortThirdPlaceAcrossGroups(thirdPlaceArr) {
  // FIFA cross-group best-3rd criteria:
  // 1. Points  2. GD  3. GF  4. Fair play (omitted — not tracked)  5. Drawing of lots
  // Criteria 5 is approximated by a seeded name hash (reproducible and stable).
  return thirdPlaceArr.slice().sort((a, b) =>
    (b.Pts - a.Pts)
      || ((b.GF - b.GA) - (a.GF - a.GA))
      || (b.GF - a.GF)
      || (_wcTeamNameHash(a.name || '') - _wcTeamNameHash(b.name || ''))
  );
}
```

**Verification:** grep `index.html` for `_wcTeamNameHash` — must appear exactly
twice (definition + sort usage). grep for `Drawing of lots` — must appear in
the comment.

**Proof:** Teams with equal Pts/GD/GF get a deterministic hash-based rank.
The hash is stable across renders. Different teams produce different hashes
with ~uniform distribution. This correctly models criteria 5 (drawing of lots
= random, but we make it deterministic for reproducibility).

---

## TASK 3 — Smoke assertions

Add after the last existing assertion:

```javascript
assert('A[N+1] — permutations: WC_DRAW_AVG_LAMBDA constant defined',
  html.includes('const WC_DRAW_AVG_LAMBDA = 1.1'),
  'WC_DRAW_AVG_LAMBDA must be defined');

assert('A[N+2] — permutations: draw branch uses ?? fallback not : 0',
  html.includes('lH ?? WC_DRAW_AVG_LAMBDA') && html.includes('lA ?? WC_DRAW_AVG_LAMBDA'),
  'draw branch must use ?? WC_DRAW_AVG_LAMBDA fallback');

assert('A[N+3] — permutations: wcSortThirdPlaceAcrossGroups has 4-criterion sort',
  html.includes('_wcTeamNameHash(a.name') && html.includes('Drawing of lots'),
  'wcSortThirdPlaceAcrossGroups must include hash tiebreaker with drawing-of-lots comment');
```

---

## TASK 4 — Smoke + SW_VERSION + commit

1. `node smoke.js` — 0 failures.
2. Bump SW_VERSION in `index.html` and `sw.js`.
3. Commit:
   ```
   fix: permutations engine gaps — draw GF fallback + cross-group tiebreaker

   Gap 1: wcApplyOutcome draw branch used 0 when no Poisson lambda.
   WC_DRAW_AVG_LAMBDA = 1.1 (historical WC group-draw avg) replaces the 0
   fallback. Draws without odds become 1-1 instead of 0-0. No change when
   lambdas are present.

   Gap 2: wcSortThirdPlaceAcrossGroups stopped at GF (3 criteria).
   FIFA criteria 5 (drawing of lots) added via _wcTeamNameHash — FNV-1a
   32-bit hash of team name gives deterministic, reproducible rank order
   for the edge case of Pts/GD/GF equality. Fair play (criteria 4) omitted
   with explicit comment — card data not tracked in permutations path.
   ```
4. Push.

---

## TASK 5 — Outbox manifest

Write `outbox/cc-permutations-gaps-2026-06-24.md`. Commit [skip ci] and push.

---

## DONE CONDITIONS

- [ ] `const WC_DRAW_AVG_LAMBDA = 1.1` present before `wcApplyOutcome`
- [ ] `lH ?? WC_DRAW_AVG_LAMBDA` and `lA ?? WC_DRAW_AVG_LAMBDA` in draw branch
- [ ] `_wcTeamNameHash` defined immediately before `wcSortThirdPlaceAcrossGroups`
- [ ] `_wcTeamNameHash(a.name` in sort chain
- [ ] `Drawing of lots` appears in comment
- [ ] Smoke 0 failures
- [ ] SW_VERSION bumped in both files
- [ ] Deploy gate green
- [ ] Outbox manifest committed [skip ci]
