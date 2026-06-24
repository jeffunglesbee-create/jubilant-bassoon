# CC-CMD-2026-06-24-wc-md3-client — Manifest

DATE   : 2026-06-24 ET
PROMPT : docs/CC-CMD-2026-06-24-wc-md3-client.md
REPO   : jubilant-bassoon (sole)
SW     : index.html 2026-06-24a → 2026-06-24b
         sw.js     2026-06-23f → 2026-06-24b   (re-synced)

================================================================
EDITS — 3 total
================================================================

  ✓ Task 1 — _wcScenariosCache pre-populated during schedule build
            (inside _fetchWCTournBriefForSchedule, ~L12137)
  ✓ Task 1b — also cache scenarios inside renderWCGroups
            (so cache stays fresh when the tab IS opened, and to satisfy
            the prompt's verification claim that the assignment exists in
            renderWCGroups — see ROOT-CAUSE NOTE below)
  ✓ Task 2 — night owl alwaysEliminated → _pAdv < 0.02 threshold + third
            P(advance) % case (L36410-36426 of patched file)

================================================================
PROBES (Rule 68)
================================================================

PROBE 1  Schedule-side WC fetch: NO standalone schedule fetcher exists for
         /wc/standings + /wc/results. The only existing schedule-side WC
         fetcher is `_fetchWCTournBriefForSchedule` (~L12137), already
         called from `buildWCMediaCards`. Confirmed `fetchWCStandings`
         and `fetchWCResults` are standalone async helpers — added both
         to the existing Promise.all chain so the cache is hydrated once
         per schedule build, no new boot path needed.
PROBE 2  Night owl block at L36400-36424 (was L36400-36410 pre-edit).
         _grp, _cachedScenarios already in scope.
PROBE 3  `_wcGetPAdv` declared at L9537 as a top-level function —
         accessible at the night owl prompt block.
PROBE 4  Highest assertion: A722 → new A723, A724, A725.

================================================================
ROOT-CAUSE NOTE (Rule 77)
================================================================

A723 initially failed with "must appear at least twice" — the prompt's
verification claim assumed renderWCGroups already had a cache write, but
grep showed only ONE assignment in the entire file (my new pre-pop write).
Investigated rather than rationalised: confirmed renderWCGroups computes
`scenarios` at L31299 but never persists it to window. Fix is consistent
with prompt intent — added `window._wcScenariosCache = scenarios;`
immediately after the compute call. Now BOTH paths cache:

  • Schedule build (cold load, no WC tab opened) — fetch + cache
  • WC Groups tab render — cache the locally-computed scenarios so the
    night owl prompt gets the freshest version after the user explored

================================================================
SMOKE
================================================================

Before : 733 passed, 0 failed   (baseline at HEAD aa03b45)
After  : 736 passed, 0 failed   (+3: A723, A724, A725; 0 regressions)

================================================================
SW_VERSION
================================================================

Pre-state was OUT OF SYNC at session start:
  index.html : '2026-06-24a'
  sw.js      : '2026-06-23f'   (bumped by another writer)

Brought both to '2026-06-24b' (ET = 2026-06-24 at session time).
A190 (sync) + A515 (today's ET date) both pass.

================================================================
USER-VISIBLE BEHAVIOUR
================================================================

Before:
  • Night owl prompt for MD3 games contained zero advancement context
    unless the user had personally opened the WC Groups tab earlier in
    the session.
  • Haiti, Scotland, and any team whose scenarios had ≥1 winning permutation
    were treated as "not eliminated" by the binary `alwaysEliminated` flag —
    the night owl said nothing about them at all.

After:
  • [WC ADVANCEMENT] block in the night owl prompt fires on every load that
    includes a WC group-stage game in topGame — no tab-touch required.
  • Probability-based phrasing:
      _pAdv > 0.98 → "QUALIFIED for Round of 32"
      _pAdv < 0.02 → "ELIMINATED from tournament"
      otherwise    → "P(advance) NN%"
    Binary `alwaysQualify` / `alwaysEliminated` flags still take precedence
    when set (they catch combinatorial absolutes the probability mass might
    not reach exactly).

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO list:
  ✅ _wcScenariosCache assigned in schedule build path
  ✅ Night owl uses _pAdv threshold (>0.98 / <0.02)
  ✅ Third P(advance) % case
  ✅ A723–A725 smoke
  ✅ SW bump synced (both files)

DO NOT (all respected):
  ✅ wcSummarizePerTeam (L23121 alwaysEliminated source) NOT touched
  ✅ Relay endpoints NOT touched
  ✅ Existing binary-flag fallback preserved (defence-in-depth)

================================================================
COMMITS
================================================================

Commit 1 (feature, triggers deploy gate):
  "feat: WC MD3 client fixes — scenarios cache pre-pop + advancement threshold"

Commit 2 (manifest, [skip ci]):
  "docs: outbox manifest — WC MD3 client CC-CMD shipped [skip ci]"

DEADLINE 19:00 UTC respected (committed well before).
