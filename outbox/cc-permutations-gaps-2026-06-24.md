# CC-CMD-2026-06-24-permutations-gaps — Manifest

DATE   : 2026-06-24 ET
PROMPT : docs/CC-CMD-2026-06-24-permutations-gaps.md
REPO   : jubilant-bassoon (sole)
SW     : 2026-06-24b → 2026-06-24c

================================================================
GAPS CLOSED
================================================================

GAP 1 — Draw GF/GA fallback
  Before: `const drHg = lH ? Math.round(lH * 0.6) : 0;`
  After : `const drHg = Math.round((lH ?? WC_DRAW_AVG_LAMBDA) * 0.6);`
  Effect: Draws with no Poisson lambda available now score ~1-1
          (round(1.1 * 0.6) = 1) instead of 0-0. GF tiebreaker no
          longer penalises every group whose draws lack odds metadata.

GAP 2 — Cross-group best-3rd ranking criteria (FIFA, Option B)
  Before: 3 criteria — Pts → GD → GF
  After : 5 criteria — Pts → GD → GF → FP → drawing of lots
  FP    : Poisson-sampled cards accumulated in wcSampleScenario only.
  Lots  : FNV-1a 32-bit hash of team name (deterministic, reproducible).

================================================================
PROBES (Rule 68)
================================================================

PROBE 1  wcApplyOutcome at L22971, 6 params ending in matchMeta.
         Draw branch fallback zeros at L22994-22995 (`: 0;  // rough...`).
PROBE 2  wcSampleScenario at L23239. `rand` in scope as 2nd destructured param.
         wcApplyOutcome called at L23259 with 5 args.
PROBE 3  wcSortThirdPlaceAcrossGroups at L23273, 3-criterion sort, no FP ref.
PROBE 4  wcEnumerateScenarios at L23055. wcApplyOutcome called at L23095
         with 6 args (matchMeta). New `rand = null` default keeps enumeration
         path FP-free without source change.
PROBE 5  wcPoissonSample: 0 matches before edit.
PROBE 6  WC_DRAW_AVG_LAMBDA: 0 matches before edit.
PROBE 7  Highest assertion A725 → new A726..A731.

================================================================
EDITS
================================================================

  ✓ Task 1a — `const WC_DRAW_AVG_LAMBDA = 1.1` inserted before wcApplyOutcome
  ✓ Task 1b — draw branch fallback uses `?? WC_DRAW_AVG_LAMBDA`
  ✓ Task 2a — FP_LAMBDA_{YELLOW,RED} constants + wcPoissonSample helper
              inserted in same block before wcApplyOutcome
  ✓ Task 2b — wcApplyOutcome signature gained `rand = null` 7th param;
              FP block appended at function tail using `hT`/`aT` aliases
              to avoid shadowing the pre-existing `h`/`a` locals
              (verified at L22972)
  ✓ Task 2c — wcSampleScenario call site now `(... , null, rand)` —
              matchMeta is null in this path, rand enables FP sampling
  ✓ Task 2d — _wcTeamNameHash (FNV-1a 32-bit) inserted before
              wcSortThirdPlaceAcrossGroups
  ✓ Task 2e — wcSortThirdPlaceAcrossGroups extended to 5 criteria,
              `(a.FP ?? 0) - (b.FP ?? 0)` then name hash
  ✓ Task 3  — A726..A731 smoke assertions

================================================================
WHY OPTION B
================================================================

Option A would assign a constant expected FP value to every team in
the enumeration path. Cross-group ranking would then collapse on FP
(everyone tied), defeating criterion 4 entirely.

Option B samples cards per match in the Monte Carlo path. That introduces
realistic per-team variance — Switzerland and Sweden, both at 3 pts/0 GD/3 GF,
distribute pQualifyAsBest3rd according to FP draws across thousands of samples.
This is the variance the Monte Carlo path is designed to surface.

Enumeration path stays deterministic and FP-free (rand = null, default).
Enumeration yields P(qualify-as-best-3rd) bounds; Monte Carlo yields the
point estimate that respects FIFA criterion 4.

================================================================
EXPECTED FP DISTRIBUTION
================================================================

WC 2022 group-stage empirical (48 matches, 96 team-matches):
  Yellow: 153 / 96 = 1.59/team/match (λ_Y = 1.6)
  Red:    ~19 / 96 = 0.20/team/match (λ_R = 0.2)

Per team per group (3 matches):
  E[FP] = -3 × (1.6 + 3 × 0.2) = -3 × 2.2 = -6.6
  Var   = 3 × (1.6 + 9 × 0.2)  = 3 × 3.4  = 10.2 → σ ≈ 3.2

So sampled FP per team falls roughly in [-12, -1]. Differences of 1-2
points are common and decisive at criterion 4 — exactly the resolution
needed when criteria 1-3 are tied.

================================================================
CRITICAL CARE — `h` / `a` SHADOWING
================================================================

wcApplyOutcome already binds `const h = teamMap[home], a = teamMap[away]`
at L22972 for its W/D/L bookkeeping. Reusing those names inside the FP
block would shadow them at the inner scope. Used `hT` / `aT` per the
prompt; teamMap lookups happen again rather than reusing h/a because the
FP block runs AFTER the outer scope has already mutated h/a — re-reading
is identical to the closure value, and the explicit lookup makes the
intent unambiguous to readers.

================================================================
SMOKE
================================================================

Before : 736 passed, 0 failed   (baseline at HEAD 351d834)
After  : 742 passed, 0 failed   (+6: A726..A731; 0 regressions)

================================================================
SW_VERSION
================================================================

  index.html : '2026-06-24b' → '2026-06-24c'
  sw.js      : '2026-06-24b' → '2026-06-24c'

================================================================
COMMITS
================================================================

Commit 1 (feature, triggers deploy gate):
  "fix: permutations engine — draw GF fallback + fair play Poisson cards (Option B)"

Commit 2 (manifest, [skip ci]):
  "docs: outbox manifest — permutations gaps CC-CMD shipped [skip ci]"
