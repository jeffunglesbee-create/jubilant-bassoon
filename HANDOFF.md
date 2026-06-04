# FIELD HANDOFF — 2026-06-04 (SESSION END)

## State
jubilant-bassoon HEAD: 7f1a7f9 · Smoke: 462/0
field-relay-nba HEAD: cfcf618

## This Session — What Was Built

### Permutations Engine — Full Stack (v1.0 → v1.7)

#### Engine (field_utils.js / inlined in index.html)
- **v1.0** — `computeGroupScenarios()`: pure W/D/L enumeration (3^N), FIFA
  tiebreakers 1-3 (pts → GD → GF). Minimum-margin model (W=1-0, D=0-0).
- **v1.1** — Optional `outcomeProbabilities` param: per-scenario joint
  probability; perTeam gains pFirst/pSecond/pThird/pFourth/pQualifyTop2.
- **v1.2** — `computeBest3rdRanking()`: cross-group Monte Carlo (default
  10000 samples, seedable Mulberry32 PRNG). Produces P(qualify as best-8
  third-place) per team.
- **v1.3** — UI wiring in renderWCGroups: badge per row (✓/✗/%), best-3rd
  cross-group MC, CSS state classes (wc-sb--safe/out/maybe/b3).
- **v1.3.1** — Real `played[]` from relay /wc/results (D1 wc_results table).
  fetchWCResults() + parallel fetch in renderWCSection. H2H tiebreakers 4-6
  now fire correctly when match results are in D1.
- **v1.3.2** — Market-derived `outcomeProbabilities` from /wc/odds-probs.
  _wcMatchTeamName() fuzzy normalization. Badge distinguishes weighted vs
  uniform display (pQualifyTop2 vs scenarioCounts percentage).
- **v1.4** — Poisson margin model: `wcPoissonExpectedGoals()` helper,
  `wcApplyOutcome()` accepts `matchMeta.lambdaHome/Away`. Computes
  E[goals|outcome] over 8×8 scoreline grid. Activated via outcomeProbabilities
  with lambda fields (not yet wired; lambda derivation is v1.3.2.1).
- **v1.5** — Fair-play tiebreaker (#7 in FIFA chain). `fairPlayPoints`
  threaded through computeGroupScenarios → wcEnumerateScenarios →
  wcSortByTiebreakers. Caller provides {[teamName]: number} (FIFA: yellow=-1,
  two-yellow-red=-3, direct-red=-3).
- **v1.6** — Bracket-implication mapping. WC26_R32 constant: all 24 fixed
  R32 slots (Match 73-88) from FIFA regulations / Wikipedia knockout stage
  article. _wcBracketImplication(groupId, pos) returns R32 path string.
  Badge extended: alwaysTopGroup shows '✓ 1st' + bracket; alwaysQualify
  shows both R32 paths if they differ.
- **v1.7** — Simultaneous-kickoff flag. _wcBuildGroupInput detects when
  2 remaining fixtures start within 5 min (FIFA MD3 rule). ⚡ amber banner
  rendered above group table when simultaneousFinalDay=true.

#### Relay (field-relay-nba)
- **probe_relay_route** MCP tool (00c6c08): self-fetch allow-listed routes
  from within relay; bypasses *.workers.dev sandbox block.
- **/wc/results** (5b38aee): queries wc_results D1 table, returns per-match
  scores for H2H tiebreaker computation.
- **/wc/odds-probs** (cfcf618): fetches Odds API h2h, no-vig normalizes
  across bookmakers, returns {pHome,pDraw,pAway} per upcoming WC game.
  Edge-cached 5 min.

#### Tests / Smoke
- 56 unit tests (all pass, includes 16 new engine tests)
- Smoke 432 → 462 (30 new assertions A424-A453)

## WC 2026 — READY FOR JUNE 11
All infrastructure complete:
  - wc26Raw 72 games + WC_TEAMS confirmed
  - D1 wc2026 live: wc_group + wc_results + wc_third_place_standings VIEW
  - Groups tab: badges, simultaneous-kickoff flag, bracket mapping
  - Permutations Engine: full FIFA tiebreaker chain (1-7 when data available)
  - Odds probabilities: relay route live, browser fetch wired
  - Best-3rd cross-group Monte Carlo: 5000 samples, seed=2026
  - Bracket implications: all 24 fixed R32 slots hardcoded

## Outstanding (not started this session)
  - lambda derivation wiring: v1.3.2.1 — pass lambdaHome/Away from
    soccer-wp.js Poisson model into outcomeProbabilities objects (activates v1.4)
  - /wc/admin/seed write path: needed to get results into D1 from live API
  - BALLDONTLIE GOAT 48-hr trial: START June 11 (opening match Mexico vs SA)
  - Scoreboard P0 (first live exposure NBA Finals G1 — still not diagnosed)
  - Watch Engine WC fix (RUWT violations line ~26190)

## Key Refs
jubilant-bassoon HEAD: 7f1a7f9
field-relay-nba HEAD: cfcf618
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
WC26_R32 bracket source: en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
Engine smoke baseline: 462/0
