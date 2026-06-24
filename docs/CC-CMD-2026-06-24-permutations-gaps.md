# CC-CMD: Permutations Engine Gaps — Draw Fallback + Cross-Group Fair Play (Option B)
**Date:** 2026-06-24  
**Repo:** jubilant-bassoon  
**Rule 87:** Self-completing. All probes, edits, smoke, SW_VERSION, and outbox manifest run inside this session.

---

## CONTEXT

Two gaps in the permutations engine:

**Gap 1 — Draw GF/GA fallback defaults to 0-0.**
`wcApplyOutcome` draw branch: `const drHg = lH ? Math.round(lH * 0.6) : 0`.
When no Poisson lambda is available, draws are scored 0-0 for GF purposes.
Fix: `WC_DRAW_AVG_LAMBDA = 1.1` (WC 2022 empirical avg) as fallback → 1-1.

**Gap 2 — `wcSortThirdPlaceAcrossGroups` missing criteria 4+5 (Option B).**
Current: Pts → GD → GF (3 criteria). FIFA criteria 4 = fair play (cards),
criteria 5 = drawing of lots.

Option B: Poisson-model card accumulation in the Monte Carlo path only
(`wcSampleScenario`). Add `wcPoissonSample` helper. Add `rand` as optional
7th parameter to `wcApplyOutcome` — when provided, sample yellows/reds via
Poisson and accumulate into `t.FP`. `wcSortThirdPlaceAcrossGroups` uses
`FP` as criteria 4 (less negative = fewer cards = better), then a seeded
FNV-1a name hash as criteria 5 (drawing of lots). The enumeration path
(`wcEnumerateScenarios`) is unchanged — it passes `rand = null` implicitly.

Card rates from WC 2022 group stage (48 matches):
- Yellow: 153 total = 1.59/team/match → `FP_LAMBDA_YELLOW = 1.6`
- Red (direct + second yellow): ~0.20/team/match → `FP_LAMBDA_RED = 0.2`
- Expected FP per team per group (3 matches): ~−6.6 ± 3.2 σ

---

## PROBE BLOCK

1. `wcApplyOutcome` — confirm signature is currently 6 params, ends with
   `matchMeta`. Confirm the two draw lines at ~L22994-22995.

2. `wcSampleScenario` — confirm `rand` is in scope; `wcApplyOutcome` is
   called at L23259 with 5 args (no `matchMeta`, no `rand`).

3. `wcSortThirdPlaceAcrossGroups` — confirm 3-criterion sort, no `FP` ref.

4. `wcEnumerateScenarios` — confirm `wcApplyOutcome` called at L23095 with
   6 args (includes `matchMeta`). New `rand=null` default means this call
   is unchanged and FP is NOT sampled in enumeration path.

5. Confirm `wcPoissonSample` does NOT exist yet.

6. Confirm `WC_DRAW_AVG_LAMBDA` does NOT exist yet.

7. Highest smoke assertion number (tail smoke.js).

---

## TASK 1 — Draw GF/GA fallback (Gap 1)

### 1a. Add constant before `wcApplyOutcome`

Find `function wcApplyOutcome`. Insert immediately before it:

```javascript
// WC_DRAW_AVG_LAMBDA: WC 2022 group-stage draws averaged ~1.1 goals per team.
// Used when Poisson lambdas are absent (no odds/totals line). Gives draws a
// 1-1 scoreline floor for GF tiebreaker realism instead of 0-0.
const WC_DRAW_AVG_LAMBDA = 1.1;
```

### 1b. Replace draw branch fallback zeros

Find in `wcApplyOutcome` draw branch:
```javascript
    const drHg = lH ? Math.round(lH * 0.6) : 0;  // rough fraction of shots in draw
    const drAg = lA ? Math.round(lA * 0.6) : 0;
```

Replace with:
```javascript
    const drHg = Math.round((lH ?? WC_DRAW_AVG_LAMBDA) * 0.6);  // ~1 goal each in avg WC draw
    const drAg = Math.round((lA ?? WC_DRAW_AVG_LAMBDA) * 0.6);
```

**Verification:** grep for `WC_DRAW_AVG_LAMBDA` → 2 matches. grep for
`: 0;  // rough fraction` → 0 matches.

---

## TASK 2 — Fair play via Poisson cards (Gap 2, Option B)

### 2a. Add FP constants and `wcPoissonSample` helper

Find the constant `WC_DRAW_AVG_LAMBDA` just added. Insert immediately after it:

```javascript
// Fair play Poisson card rates — WC 2022 group-stage empirical averages.
// FP_LAMBDA_YELLOW: 153 yellows / 48 matches / 2 teams = 1.59 → 1.6
// FP_LAMBDA_RED:    direct reds + second-yellow reds ≈ 0.20/team/match
// FIFA fair play scoring: yellow = −1, direct red = −3, second yellow = −3,
// yellow then red = −4. We model yellow (−1) and red (−3) only; the
// combined yellow+red case (~5% of reds) is absorbed into the red rate.
const FP_LAMBDA_YELLOW = 1.6;
const FP_LAMBDA_RED    = 0.2;

// Knuth Poisson sampler — O(λ) per call, adequate for λ ≤ 5.
// Requires rand: () => [0,1) PRNG supplied by caller.
function wcPoissonSample(lambda, rand) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}
```

### 2b. Add `rand` parameter + FP block to `wcApplyOutcome`

Current signature:
```javascript
function wcApplyOutcome(teamMap, home, away, outcome, playedSink, matchMeta) {
```

Replace with:
```javascript
function wcApplyOutcome(teamMap, home, away, outcome, playedSink, matchMeta, rand = null) {
```

Then find the closing `}` of the draw branch (the line `playedSink.push({home, away,
homeScore: drHg, awayScore: drAg});` followed by `}`). After that closing `}` and
before the outer closing `}` of the function, add:

```javascript
  // Fair play accumulation — Monte Carlo path only (rand provided by wcSampleScenario).
  // Enumeration path (wcEnumerateScenarios) passes rand = null → no FP sampling.
  // FIFA: yellow = −1, red = −3. Higher (less negative) FP = better ranking.
  if (rand) {
    const hT = teamMap[home], aT = teamMap[away];
    const hY = wcPoissonSample(FP_LAMBDA_YELLOW, rand);
    const aY = wcPoissonSample(FP_LAMBDA_YELLOW, rand);
    const hR = wcPoissonSample(FP_LAMBDA_RED,    rand);
    const aR = wcPoissonSample(FP_LAMBDA_RED,    rand);
    hT.FP = (hT.FP ?? 0) - hY - 3 * hR;
    aT.FP = (aT.FP ?? 0) - aY - 3 * aR;
  }
```

**Critical:** The `h` and `a` variables are already used inside `wcApplyOutcome`
for home/away team references. Use `hT`/`aT` to avoid shadowing. Confirm this
by reading the existing variable names inside the function before committing.

**Verification:** grep `wcApplyOutcome` definition line → must include `rand = null`.
grep `wcPoissonSample` → must appear exactly 3 times
(definition + 2 calls for yellow/red per team pair).

### 2c. Pass `rand` from `wcSampleScenario` to `wcApplyOutcome`

Find in `wcSampleScenario`:
```javascript
    wcApplyOutcome(teamMap, remaining[k].home, remaining[k].away, outcome, playedCopy);
```

Replace with:
```javascript
    wcApplyOutcome(teamMap, remaining[k].home, remaining[k].away, outcome, playedCopy, null, rand);
```

`matchMeta` is null (goal lambdas come from `outcomeProbabilities` here, not
`matchMeta`). `rand` is the 7th arg — enables FP sampling.

**Verification:** grep `wcSampleScenario` block for `rand` as 7th arg to
`wcApplyOutcome` → must appear once.

### 2d. Add `_wcTeamNameHash` helper for criteria 5 (drawing of lots)

Find `function wcSortThirdPlaceAcrossGroups`. Insert immediately before it:

```javascript
// FNV-1a 32-bit hash of team name — deterministic drawing-of-lots tiebreaker
// (FIFA criteria 5). Reproducible across renders. Different teams produce
// distinct hashes with ~uniform distribution.
function _wcTeamNameHash(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
```

### 2e. Extend `wcSortThirdPlaceAcrossGroups` to 5 criteria

Replace:
```javascript
function wcSortThirdPlaceAcrossGroups(thirdPlaceArr) {
  return thirdPlaceArr.slice().sort((a, b) =>
    (b.Pts - a.Pts)
      || ((b.GF - b.GA) - (a.GF - a.GA))
      || (b.GF - a.GF)
  );
}
```

With:
```javascript
function wcSortThirdPlaceAcrossGroups(thirdPlaceArr) {
  // FIFA cross-group best-3rd criteria (WC 2026):
  // 1. Points  2. GD  3. GF
  // 4. Fair play — accumulated via Poisson-sampled cards in wcSampleScenario
  //    (FP_LAMBDA_YELLOW=1.6, FP_LAMBDA_RED=0.2; less negative = better)
  // 5. Drawing of lots — seeded FNV-1a name hash (deterministic approximation)
  return thirdPlaceArr.slice().sort((a, b) =>
    (b.Pts - a.Pts)
      || ((b.GF - b.GA) - (a.GF - a.GA))
      || (b.GF - a.GF)
      || ((a.FP ?? 0) - (b.FP ?? 0))
      || (_wcTeamNameHash(a.name || '') - _wcTeamNameHash(b.name || ''))
  );
}
```

Note: `(a.FP - b.FP)` not `(b.FP - a.FP)` — less negative FP = fewer cards =
better = sorts earlier. The `?? 0` handles teams from the enumeration path
(where FP was not sampled) that might enter this sort.

---

## TASK 3 — Smoke assertions

```javascript
assert('A[N+1] — permutations: WC_DRAW_AVG_LAMBDA = 1.1 defined',
  html.includes('const WC_DRAW_AVG_LAMBDA = 1.1'),
  'WC_DRAW_AVG_LAMBDA must be defined');

assert('A[N+2] — permutations: draw branch uses ?? fallback not : 0',
  html.includes('lH ?? WC_DRAW_AVG_LAMBDA') && html.includes('lA ?? WC_DRAW_AVG_LAMBDA'),
  'draw branch must use ?? WC_DRAW_AVG_LAMBDA fallback');

assert('A[N+3] — permutations: wcPoissonSample defined',
  html.includes('function wcPoissonSample(lambda, rand)'),
  'wcPoissonSample helper must be defined');

assert('A[N+4] — permutations: FP accumulated in wcApplyOutcome when rand provided',
  html.includes('FP_LAMBDA_YELLOW, rand') && html.includes('FP_LAMBDA_RED,    rand'),
  'wcApplyOutcome must sample FP when rand is provided');

assert('A[N+5] — permutations: wcSortThirdPlaceAcrossGroups uses 5 criteria',
  html.includes('a.FP ?? 0') && html.includes('_wcTeamNameHash') &&
  html.includes('FIFA cross-group best-3rd criteria'),
  'wcSortThirdPlaceAcrossGroups must implement 5-criteria FIFA sort');

assert('A[N+6] — permutations: wcSampleScenario passes rand to wcApplyOutcome',
  (() => {
    // Find the wcSampleScenario call to wcApplyOutcome
    const idx = html.indexOf('function wcSampleScenario');
    const chunk = html.slice(idx, idx + 2000);
    return chunk.includes('wcApplyOutcome') && chunk.includes(', null, rand)');
  })(),
  'wcSampleScenario must pass rand as 7th arg to wcApplyOutcome');
```

---

## TASK 4 — Smoke + SW_VERSION + commit

1. `node smoke.js` — 0 failures.
2. Bump SW_VERSION in `index.html` and `sw.js`.
3. Commit:
   ```
   fix: permutations engine — draw GF fallback + fair play Poisson cards (Option B)

   Gap 1: WC_DRAW_AVG_LAMBDA = 1.1 replaces the 0 fallback in wcApplyOutcome
   draw branch. Draws without odds now 1-1 instead of 0-0 for GF tiebreaker.

   Gap 2 (Option B): Poisson-model fair play in Monte Carlo path only.
   - wcPoissonSample(lambda, rand): Knuth sampler, O(λ)
   - wcApplyOutcome: optional rand param (default null). When provided,
     samples yellow (λ=1.6) + red (λ=0.2) per team per match, accumulates
     into t.FP. Enumeration path unchanged (rand=null).
   - wcSampleScenario: passes rand as 7th arg to wcApplyOutcome
   - wcSortThirdPlaceAcrossGroups: 3 → 5 criteria
     4. FP (less negative = fewer cards = better)
     5. FNV-1a name hash (drawing of lots)
   Card rates: WC 2022 group stage empirical (153 yellows, ~20 reds / 48 matches).
   ```
4. Push.

---

## TASK 5 — Outbox manifest

Write `outbox/cc-permutations-gaps-2026-06-24.md`:
- Both gaps with before/after
- Card rate citations (WC 2022 empirical)
- Why Option B over Option A (realistic variance in pQualifyAsBest3rd)
- Why enumeration path is unchanged (rand=null)
- Expected FP per team per group (−6.6 ± 3.2 σ)
- Commit hash + deploy

Commit [skip ci] and push.

---

## DONE CONDITIONS

- [ ] `const WC_DRAW_AVG_LAMBDA = 1.1` present
- [ ] `lH ?? WC_DRAW_AVG_LAMBDA` in draw branch
- [ ] `function wcPoissonSample(lambda, rand)` present
- [ ] `wcApplyOutcome` has `rand = null` 7th param
- [ ] FP block in `wcApplyOutcome` uses `FP_LAMBDA_YELLOW`/`FP_LAMBDA_RED`
- [ ] `wcSampleScenario` passes `null, rand` as args 6+7
- [ ] `_wcTeamNameHash` defined before `wcSortThirdPlaceAcrossGroups`
- [ ] `wcSortThirdPlaceAcrossGroups` has `(a.FP ?? 0) - (b.FP ?? 0)` before hash
- [ ] Smoke 0 failures (A726–A731)
- [ ] SW_VERSION bumped in both files
- [ ] Deploy gate green
- [ ] Outbox manifest committed [skip ci]
