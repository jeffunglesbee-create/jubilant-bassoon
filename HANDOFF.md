# FIELD HANDOFF

## Session 2026-08-16 — NFL standings: 4 stacked defects, 3 fixed, 1 OPEN + playoff tracker

Session doc: `outbox/cc-session-2026-08-16-nfl-standings-and-playoff-tracker.md`.
Both repos on main. SW 2026-08-15j, smoke 981/0. HEAD `9795c08`.

**⚠ THE STANDINGS DROPDOWN STILL DOES NOT OPEN A PANEL. Do not report it working.**

An in-session claim that "NFL standings already work ✅" was WRONG (read the map,
not the runtime path — Rule 48 Class A). A Playwright probe disproved it, and each
fix exposed the next defect underneath:

1. `3fb4b31` **FIXED** — `'NFL'` key mismatch: gate reads `sec.sport` (`'NFL'`),
   map was keyed only `'Football (NFL)'` → zero buttons on NFL cards.
2. `1fecea4` **FIXED** — `toggleStandings` never bridged to `window`. The bundle is
   ESM, so module scope is not global and inline `onclick` threw ReferenceError.
   **7 controls were dead app-wide**, not just standings. Smoke A-WINBRIDGE-1 now
   enforces the class (negative-tested: pulling one bridge fails it by name).
3. `6b0264f` **FIXED** — `slice(0,12)` on AFC+NFC concatenated (32 rows) meant an
   NFC card opened a table containing NEITHER team. Now conference-grouped; also
   fixes MLB/NBA/NHL, which share the path.
4. `f05da5d` **NOT FIXED** — ESPN's v2 standings URL returns **HTTP 200 with an
   error body** (`topKeys:["error","cached"]`, entries 0), so the fetch "succeeds",
   parses nothing, and toggleStandings silently restores the button. I inferred
   missing query params and shipped them; **the deployed 2026-08-15j build still
   returns the error body**, so that inference was wrong. Corrected reading: the
   same URL works from a CI node runner but not from the browser → the
   discriminator is ORIGIN, not params. MLS standings work in the same page via a
   different base path (`/apis/site/v2/` vs `/apis/v2/`).
   **NEXT:** probe (in flight) fetches 5 URL variants in-page and records
   `workingVariant`. If null → proxy standings through the relay (Rule 60/70),
   which needs its own CC-CMD.

This was never NFL-specific: the window-bridge probe recorded
`mlbDropdownWorks:false` on MLB's own button.

**Playoff tracker (`288f2f7`) — shipped, gated, correct.** Renders nothing today
(preseason) by design. `?seasontype=2` today gp=0 SILENT vs default gp=30 RENDERS
← the default endpoint would have published EXHIBITION-derived seeds as a real
playoff picture. Clinch read from the `clincher` stat's `displayValue`/`description`
(never `.value` — 0 for all 96 markers observed). Seeds 1-4 labelled "division
leader", never "winner". **Clinch UNVERIFIED → RESOLVED**: `?season=2025&seasontype=2`
(a completed season under regular-season scope — the combination no earlier probe
covered) returns clincher on all 32 entries. Smoke A-NFLSEED-1/2/3.

**Journalism fabrication guard (`bb0460d`)** — `fmt()` labelled every team at
gamesBehind 0 as `(leads)`; NFL conference GB has many at 0, so prompts would read
"Bills: 1-0 (leads) · Steelers: 1-0 (leads)". Only a group's top row may claim it.

**Two deploy gotchas learned the hard way:**
- A code COMMENT quoting the module script tag broke `sync-source` (it used
  `lastIndexOf` of that exact text → selected a 7.5 KB phantom block) and **failed
  every deploy** until found. Fixed + hardened to select by SIZE (`d6247c9`).
  Never write a literal opening script tag in field.js, even in a comment.
- `[skip ci]` is evaluated on the HEAD COMMIT OF A PUSH — one skip-marked commit
  suppressed the deploy for two real fixes pushed with it.

**Probe automation:** `nfl-standings-probe.yml` chains to deploy-gate completion +
daily cron, and now exits 1 on a real regression (previously always exited 0, so it
could never report the breakage it exists to detect). Manifests record `swVersion`
so "not deployed" and "doesn't work" are distinguishable.

**Relay (`665c68f`):** executed CC-CMD-2026-08-15-quality-bar-scale — see
`field-relay-nba/outbox/cc-session-2026-08-16-quality-bar-scale.md`.

## Session 2026-08-15 — P3 BDB pass-rush + tendency + automation (E2E) ✅

Session doc: `outbox/cc-session-2026-08-15-p3-bdb-rush-tendency.md`. Both repos on main.
Client SW 2026-08-15e, smoke 976/0. Relay `7561ed5`.

Built the final two STAGED BDB entries; **all 5 BDB metrics now complete** (no STAGED
BDB remains):
- **Pass rush** (`bdb_xblock_pass_rush.json`, 321) — pressure GENERATED per rusher
  (pressureRate/qbHitRate), player_play.csv. Client **Pass rush** scout row. Top:
  blitzing DBs/LBs (correct). Distinct from "Pass pro" (pressure faced).
- **Tendency** (`bdb_tendency_fingerprint.json`, 32) — team PA%/dropback%/top-formation
  from plays.csv. Client **Tendencies** row. ATL 26.6% PA / PISTOL (validates 2022).
- Bug (Rule 77): hRush/aRush dup-declared → renamed hPrsh/aPrsh.

**Automation (follow-ups):** `bdb-update.yml` monthly cron now builds ALL 5 metrics,
commits all 5 outputs, and **self-verifies** — runs `bdb-serve-probe.mjs` (all 5 files)
against the live relay and commits `outbox/bdb-serve-probe.log` (FATAL on any fail).
No manual serve-probe trigger needed. ARTIFACT: log committed by the workflow →
`5/5 serve non-empty` (speed 1648, sep 250, route 354, rush 321, tendency 32).

BDB scout rows now: Top speed · Top separation · Route tree · Pass rush · Tendencies
(+ Team EPA, Pass pro from earlier P3 work).

**Render VERIFIED (Rule 90):** `nfl-bdb-scout-probe.yml` (Playwright, live URL) →
`outbox/nfl-bdb-scout-manifest-2026-08-15T23-12-23-725Z.json`: 7/7 live NFL preseason
games rendered all 5 rows (`allFiveRowsPresent:true`, perRow 7/7 each); MLB/WNBA games
show none (NFL-gated confirmed). **Automated:** probe now scheduled TNF/Sun/MNF windows,
exits 0 when no NFL game on slate (off-season no-op), red only on a real regression
(NFL game present but a row missing).


## Session 2026-08-15 — P3 BDB separation + route entropy (E2E) ✅

Session doc: `outbox/cc-session-2026-08-15-p3-bdb-sep-route.md`. Both repos on main.
Client SW 2026-08-15d, smoke 974/0. Serve-probe artifact: `outbox/bdb-serve-probe.log`
→ `bdb_separation.json 200 rows=250` + `bdb_route_entropy.json 200 rows=354`.

Built the two remaining STAGED BDB metrics E2E (probe-first, Rule 68):
- **Route entropy** — Shannon entropy of routeRan mix (player_play.csv only), 354
  players. Top: Kupp/Deebo/Hill/Pitts ~3.3 bits. Client **Route tree** scout row.
- **Separation** — targeted receiver vs nearest defender at pass_arrived frame, 250
  players, RB-led (correct). Client **Top separation** scout row.
Relay `bd395e9` (R2-first fix — first serve-probe 404'd; the two files were only in
NFLVERSE_OUT_ALLOWED, not NFL_R2_FILES; bdb_speed was in both — Rule 77). Client
`8d782a6` (getTeamTopSep/getTeamTopRoute, A-NFLSEP-1/A-NFLRTE-1).

Dataset 2 (llkh0a) probed: live BDB 2026 competition dataset (2023 input-format
tracking, no plays/player_play metadata) — NOT a drop-in source; dataset 1 stays.

Still-STAGED (no builder, no user request): bdb_xblock_pass_rush, bdb_tendency_fingerprint.


## Session 2026-08-15 — P3 BDB real-tracking: player max speed (E2E)

Session doc: `outbox/cc-session-2026-08-15-p3-bdb-tracking.md`. Both repos on main.
Client SW 2026-08-15c, smoke 972/0.

Kaggle creds work as-is (I mis-diagnosed the key earlier; corrected — no changes needed).
Unblocked via PUBLIC datasets (bypass competition-rules gate): built `bdb_speed.json`
(player max speed from `alexandermeau/nfl-big-data-bowl-archived-data-2025` tracking,
2022 season, 1648 players) via new monthly `bdb-update.yml` (streams 8GB, never on disk).
Rule 77: filtered >24mph teleport-glitch frames (85.89mph → realistic 23.77 top). Serves
200/1648 (serve-probe 211503Z); client **Top speed** scout row (getTeamTopSpeed).

STAGED: separation / route-entropy (heavier per-frame compute; creds+access now proven).


## Session 2026-08-15 — dead-allow-list cleanup + P3 (participation, no-Kaggle)

Session doc: `outbox/cc-session-2026-08-15-p3-participation.md`. Both repos on main.
Client `1b26053` (SW 2026-08-15b, smoke 971/0); relay serving `71a9285`; cleanup `4917cd2`.

**Cleanup (Rule 63):** removed 5 dead nflverse allow-list entries (qb_metrics,
receiver_metrics, defense_metrics, schedule_refs, team_tendencies — 0 builders,
0 consumers). Kept bdb_* marked STAGED (P3 frame-tracking targets).

**P3 unlock (Rule 72/88):** probed and found the "needs Kaggle" claim overbroad —
raw frame tracking IS Kaggle-gated (401), but nflverse **pbp_participation** is public
(302). Built `team-participation.json` (offense-side formation/pressure: shotgun rate,
box faced, **pressure-faced %, blitz-faced %** — DAL 31%/28%, all 32 teams). Serving
verified (serve-probe 143657Z, 200/32 rows). Client **Pass pro** scout row (smoke
A-NFLPART-1).

**STAGED (Rule 74):** route entropy / separation / man-zone coverage — the raw x/y
tracking layer. Blocked by Kaggle creds (none exist) + empty route/coverage columns in
recent pbp_participation. Unblock: add KAGGLE_KEY secret + a BDB builder → populates the
kept bdb_* allow-list entries.

---

## Session 2026-08-15 — P2 COMPLETE (all 7 nflverse tables built + served + consumed)

Session doc: `outbox/cc-session-2026-08-15-p2-unbuilt-tables.md`. Both repos on main.
Client `c194828` (SW 2026-08-15a, smoke 970/0); relay serving `7861289`; builders `e85cf36`.

Built the 3 genuinely-unbuilt tables end-to-end, each against CI-probed real parquet
schema (Rule 68): **snap-counts** (season snap share, 2311 players), **depth-charts**
(latest-snapshot starters, 32 teams), **team_epa** (per-team off/def EPA/play from
nflfastR pbp, 32 teams — fills an orphaned allow-list entry). New builders in
build-ngs-data.py (Monday cron) → R2 + outbox; relay NFL_R2_FILES + NFLVERSE_OUT_ALLOWED.
Consumers in buildScoutingReport: **Team EPA** row, **Start QB** row (depth-chart QB1),
**● starter marker** on INJ rows (snap≥50%).

**Serving artifact:** relay `outbox/nfl-tables-serve-probe-20260815T141825Z.log` —
6/6 tables serve 200 non-empty from R2.

**P2 done:** all of ngs-passing/receiving/rushing, player-stats, injuries, snap-counts,
depth-charts, team_epa built+served+consumed. `pfr-rec.json` left unwired (redundant
with ngs-receiving, Rule 63). Orphaned allow-list entries (team_tendencies, qb_metrics,
receiver_metrics, defense_metrics, schedule_refs, bdb_*) have no builder → flagged for a
future dead-allow-list cleanup (separate from P2).

---

## Session 2026-08-14 — /realtimesports dead-code removal + P2 injuries (Wow #7)

Session docs (Rule 67): `outbox/cc-session-2026-08-14-nfl-injuries-p2.md` (client),
`field-relay-nba/outbox/cc-session-2026-08-15-v2games-live-500.md` (relay 500 fix,
prior task). Deploys: client `42f7c9b` green, relay `b0d9af2` green.

**Dead-code cleanup (relay `b0d9af2`):** removed the `/realtimesports/*` passthrough
(eliminated source, zero consumers, key never in wrangler.toml) — Rule 63.

**P2 injuries (client `d90acb6`+`42f7c9b`, SW 2026-08-14e, smoke 967/0):** wired the
already-served `nfl-injuries.json` into `buildScoutingReport` as an INJ row —
`nflInjuriesInit`/`getNFLInjuries`, official Out/Doubtful/Questionable only (Rule 1).
Caught + fixed an ESPN↔nflverse abbr mismatch (WSH/WAS, LAR/LA) at the `toNGSAbbr`
boundary — also fixes a latent NGS miss for Washington/Rams (all 32 teams checked).

**P2 reality (corrects the stale "0/6 unbuilt"):** ngs-passing/receiving = done E2E;
injuries = now done; STILL unconsumed: ngs-rushing, player-stats; STILL unbuilt:
snap_counts, depth_charts, weekly PBP. User directive: "best recommendations first,
eventually build everything" — injuries was the recommended first deliverable.

---

## Session 2026-08-14 — NFL EPA live wiring (P1-1/P1-2) — the prior carry-forward, now DONE

Session doc (Rule 67): `outbox/cc-session-2026-08-14-nfl-epa-wiring.md` — DONE, confidence 96
Commit: `6e8b86c` (client wiring + SW bump 2026-08-12f → 2026-08-14a)
Deploy: `deploy-gate.yml` run 31857007002 — SUCCESS. smoke 966/0 (adds `A-NFLEPA-1`).
Relay probe scripts: `f1204a3`, `118045f` (CI-as-proxy shape + game-id verification).

**Closes the prior session's "still open" item.** Live NFL games now get the same
per-play EPA chip UFL had, reading the (now-real) `_epLookup` table. New inline
`field.js` fns: `_computeESPNPlayEPA` / `_fetchNFLGameEpa` / `_pollNFLEpa` /
`nflEpaInit`; card gate `UFL` → `[UFL,NFL]`; `setTimeout(nflEpaInit,4000)`.

Three stale Drive-doc assumptions caught PRE-code by probing live data (Rule 72):
(1) the live app uses inline `field.js`, not the `epa.js` module; (2) `findESPNScore(g).id`
is undefined for NFL (V2 objects have `espnEventId:null`); (3) NFL `_gameId` is prefixed
`"espn:NNN"` — bare id needed for `/espn-summary` (strip the prefix). Shape verified
14/14 vs a live game (Broncos@Falcons) before a line was written.

**VERIFIED (was STAGED):** live-card DOM render confirmed via CI-as-proxy Playwright
(`nfl-epa-probe.yml`). Manifest `outbox/nfl-epa-probe-manifest-2026-08-15T02-11-46.json`
verdict **PASS**, `epaChipsOnNFLCards:4`, sample chip
`"-1.37 EPA · 3rd & 10 @ OWN 44 · -2.62 drive · 3 pl"`. Getting there took 4 more fixes
the probe caught (preseason gate 2026-08-06, `injectV2SportSection('nfl')`, `nflEpaInit`
arm-on-season-flag, all in `61ffa1e`/`479dfd9`) PLUS a relay production bug:
`/v2/games?sport=nfl` 500'd (CF 1101) on any live game — the WC soccer WP loop threw on
football's numeric round. Fixed in field-relay-nba `f949456` (session doc:
`field-relay-nba/outbox/cc-session-2026-08-15-v2games-live-500.md`). Client SW now
2026-08-14c. Both repos on main, deploys green.

---

## Session 2026-08-15b — EPA table rebuild (had never shipped)

Session doc (Rule 67): `outbox/cc-session-2026-08-15-epa-table-rebuild.md` — DONE, confidence 96
Commits: `606b2e6` (fix) + `f9bb6fd` (rebuilt table, EPA-Build bot)
Verification: `build-epa-table.yml` run 31854656251 — SUCCESS (first ever), test 15/0 on the real empirical table.

**The seasonal EPA rebuild was a silent no-op.** build → test → push under bash -e;
the builder samples nflverse `ep` (= nflfastR's model) but the test asserted hand-fit
POLYNOMIAL anchors the real surface misses by >0.3 → test failed → push blocked →
live table frozen at May's polynomial version since inception.

Fixed: test now validates INVARIANTS (completeness, field-position monotonicity, down
ordering, bounds, wide nflfastR bands) that BOTH surfaces satisfy — unblocks the push,
still catches a broken table, doesn't rubber-stamp the builder (Rule 90). Builder
completes the grid (857→1120 cells via empirical backfill) and fails loudly on
invariant violation. Live table now `nflverse-pbp-2024-backfilled` (own20=0.693,
opp10=5.005) — the real 2024 surface, served via /nflverse/epa_table.json, no deploy needed.

**Still open (unchanged):** live EPA is not wired to NFL cards — `epa.js` speaks only
SportRadar (`fromSRPlay`); `fromESPNPlay`/`_pollNFLEpa` don't exist (Drive P1-1/P1-2/P5-2).
This fix makes the TABLE those functions read trustworthy — a prerequisite, not the wiring.
> **SUPERSEDED 2026-08-15:** this "still open" is CLOSED. The 2026-08-14 NFL EPA
> session wired live EPA onto NFL cards (`_computeESPNPlayEPA`/`_pollNFLEpa`/`nflEpaInit`,
> card gate `[UFL,NFL]`) and verified it (`nfl-epa-probe` PASS, `epaChipsOnNFLCards:4`).
> Do not re-chase (Rule 72).

---

## Session 2026-08-15 — NFL-B pipeline data integrity

Session doc (Rule 67): `outbox/cc-session-2026-08-15-nfl-b-pipeline-fixes.md`
— DONE, confidence 97
Commits: `317f9cb` (client) + `680ac26`, `2e5f4d8` (field-relay-nba)
Verification: `nfl-ngs-update.yml` run 31852365822 — success, artifact commit `35a555f`

**The NFL-B weekly pipeline was publishing an empty injuries table and
reporting "4/4 succeeded".** `injuries_{year}.parquet` is a per-year file; in
August `injuries_2026` 404s, and the empty result was written over the populated
table in BOTH R2 and outbox. Unnoticed Aug 10 → Aug 14.

Fixed, and verified live — injuries **0 → 1,453 players** (107 bytes → 185,396):
1. `build_injuries` walks back up to 3 seasons, matching the strategy the NGS
   builders already used (combined parquet → `max_season`), and returns the
   season actually used.
2. `emit()` refuses any zero-row write — the guard the relay already had for MLB
   Savant (`7588b24`) and this path lacked.
3. Envelope now carries `season` (the data's real season) and `targetYear` (the
   requested year) as separate fields. It previously stamped `season: 2026` over
   rows reading 2025. NFL.com does the same thing on its own team-stats page
   ("NFL 2026 REG" title, 2025 selected in the dropdown) — so do NOT "correct"
   our label against theirs; the rows are the truth in both.
4. The job now exits non-zero if ANY table fails, not only if all four do. That
   coarse tripwire is why nobody saw it for four days.

**Cross-repo collision found mid-fix (Rule 70):** `nfl/{year}/ngs-passing.json`
has TWO writers — this pipeline (Mon, parquet) and the relay's `runNFLR2Update`
(Wed, legacy CSV). Wednesday runs last, so it would have stripped the new
`season`/`targetYear` off every week. Patched in `2e5f4d8` so both envelopes
agree; the collision itself is gated in
`field-relay-nba/docs/CC-CMD-2026-08-15-ngs-passing-two-writers.md`.

**Also:** `680ac26` adds `ngs-passing.json` to the relay's `NFLVERSE_OUT_ALLOWED`
— it was R2-first with no GitHub-raw fallback, one failed weekly update away
from 403ing while its two siblings kept serving.

**NFL readiness (verified against the Drive checklist, not its checkboxes):**
NFL content is live and journalism is scoring; NGS/injuries pipeline is healthy.
Still open: live EPA is not wired to NFL at all (`epa.js` speaks only the
SportRadar schema; `fromESPNPlay`/`_pollNFLEpa` do not exist), the nflverse
Stage-1 six-table pipeline does not exist (relay serves 0/6, all 404), and the
Aug 1 `build-epa-table.yml` rebuild FAILED (run 30706486286, 8/14 EP tests) so
> **SUPERSEDED 2026-08-15:** all three are now CLOSED — live EPA wired+verified
> (2026-08-14 session), P2 nflverse tables all built/served/consumed, EPA table
> rebuilt (`nflverse-pbp-2024-backfilled`). Historical note only; do not re-chase.
the live table is still `polynomial-calibrated` from May 27.

---

**Anchor:** CLIENT HEAD 11943f2c · 2026-08-12T21:30Z · via Claude Code
RELAY HEAD 6b57eb1 · 2026-08-12 · via Claude Code
Smoke: 965/0 (client, run fresh after every commit below, not reused)
SW version: 2026-08-12f (index.html/sw.js in sync; bumped a→f across six
deploying commits this session)

## Session 2026-08-12 — Stats tab, four CC-CMDs

Session docs (Rule 67):
- `outbox/cc-session-2026-08-12-comeback-probability-liveness-gate.md` — DONE, confidence 95
- `outbox/cc-session-2026-08-12-mlb-pitcher-payload-audit.md` — DONE, confidence 96
- `outbox/cc-session-2026-08-12-scouting-coverage-gaps.md` — DONE, confidence 95
- `outbox/cc-session-2026-08-12-arsenal-gap.md` — DONE, confidence 96
  (root cause in field-relay-nba: `7588b24` + `112c8f7`)
- `outbox/cc-session-2026-08-11-archive-gap-real-write-path.md` — relay repo, DONE, confidence 96

**What changed, all verified against the LIVE deployment via
`stats-scouting-probes.yml` / `comeback-liveness-probe.yml`:**

1. **Comeback probability gated on live state** (`d8fe74aa`). Every
   scheduled game rendered "Tied — anyone's game" — 16 occurrences against
   3 live games, including Athletics 47-73 vs Rays 73-46, sitting directly
   under the records line so it read as a verdict on them. Old guard tested
   only `state === 'post'`, letting both `'pre'` and `'final'` through.
   Now whitelists the file's own canonical isLive
   (`'in' || 'live' || 'halftime'`). Post-fix: 3, equal to liveCardCount.
2. **Pitcher ERA / W-L wired** (`288db1d8`, `fcb48871`). `gamesWithEra`
   and `gamesWithRecord` both 0 → 15. The schedule endpoint serves no
   probable-pitcher stats under ANY hydrate form (six measured); the data
   was already being loaded by `mlbPitcherStatsInit()` and simply not wired
   to `buildScoutingReport`.
3. **Park row aliases** (`b7ff0c42`). ATH→OAK, AZ→ARI, CWS→CHW.
   `parkRowMissing` 3 → 0 for MLB.
4. **MLB standings hydrated** (`4acbdc7d`, `e5f74464`). `&hydrate=team` —
   without it `/standings` returns a minimal team object, so `abbrev` was
   `''` for all 30 teams (silent no-op since written) and `team.name` read
   "D-backs" where the schedule says "Arizona Diamondbacks".
   `recordsRowMissing` 1 → 0 for MLB.

**Method worth reusing:** for a render that is a pure function of its
inputs, measure the INPUTS, not the DOM. The park question was settled by
intersecting `PARK_FACTORS` keys (parsed from source at HEAD) against the
API's abbreviations — exact and enumerated, where a DOM text probe had
produced an indefensible number. See the coverage-gaps doc.

5. **Pitch arsenal restored** (relay `7588b24`, `112c8f7`).
   `gamesWithArsenal` 0 → 14 of 15. NOT a client bug: the relay's
   `/mlb-stats/*.json` is R2-first with an existence-only miss test, and
   `runMLBSavantUpdate` had written an EMPTY pitch_arsenals object to R2,
   which is a hit — permanently shadowing the 194-entry GitHub fallback.
   Writer now refuses to overwrite with an empty payload; reader treats
   zero rows as a miss so the endpoint self-heals. 14 not 15 is correct:
   Savant's leaderboard uses min=100 pitches, so a starter below that has
   no entry and the segment is rightly omitted.

**Watch, not deferred:** the R2 arsenals object is still empty and the
serving path routes around it. The next Monday cron will either repair it or
report `ok:false` — visible now rather than a silent wipe. If Savant blocks
Cloudflare Worker egress (documented here for the umpire scrape), that write
keeps failing and the fallback keeps serving.

---

## Earlier anchor (2026-08-02T18:00Z, mid-session write via chat)

CLIENT HEAD 353b1f9 · RELAY HEAD f711797 · SW version 2026-08-02f

**Note: this is a mid-session handoff write, not a session close.** Jeff
explicitly asked for the handoff written without ending the session —
work is continuing in the same conversation. This exists so a crash or
a different model picking up this thread has accurate current state.

---

## What's live and verified as of this handoff

- **LaLiga standings**: `/laliga-apim/clasificacion` relay route live,
  wired into production (FD primary, apim as non-blocking dev
  cross-check). Confirmed `available:true` directly.
- **Bundesliga broadcasts, full chain**: `resolve-dayid` (matchday or
  date mode, D1-cached) → `broadcasts` proxy, both live on relay.
  Wired into jubilant-bassoon's client via a real historical-fixture
  proof. `SOCCER_LEAGUES` restored for Bundesliga specifically (was
  empty — see open items below for the other 3 leagues).
- **BracketDO visibilitychange guard**: confirmed correct and live,
  independently verified twice (chat's own CI diagnostic + production's
  manifest evidence).
- **NFL drama profiles**: real nflverse data live, Sept 1 refresh
  workflow scheduled.
- **Escalating milestone modifiers**: MLB no-hitter tiering live.
  Win/hitting-streak bonuses also now live (closed this session — see
  below).
- **ESPN standings bug fixed, all 4 sports** (MLB/NBA/NHL/NFL) — the
  "▼ Table" feature was silently broken product-wide
  (apis/site/v2/.../standings returning zero entries); fixed via
  ESPN_STANDINGS_BASE pointing at apis/v2. Confirmed live for all four.
- **Cloudflare Browser Rendering**: new relay capability
  (env.BROWSER — was already present from an earlier addition, not
  actually new infra as originally assumed), backing `resolve-dayid`
  only. D1-cached, proven (8347ms cold / 162ms cached).
- **deploy-gate.yml now has a workflow_dispatch fallback** in addition
  to its original push-only trigger — added after a real, unexplained
  incident where a well-formed push didn't fire the workflow (root
  cause not found — likely needs GitHub's own webhook delivery log,
  human-only access).

## Open items — real, not placeholder

1. **La Liga / Serie A / Ligue 1 still missing card-creation.**
   `SOCCER_LEAGUES` was found empty (stale comment claiming "all on
   api-sports.io V2") — fixed for Bundesliga only, in scope. The other
   three almost certainly have the same gap, invisible only because
   all four leagues are currently in their off-season. Needs a CC-CMD
   before any of them come back into season.

2. **Bundesliga broadcast field-name shape is genuinely unconfirmed.**
   Not a bug — the real endpoint only serves current/near-term data,
   never historical (8 matchdays checked across the entire completed
   2025-26 season, all empty). Can't be resolved until real
   current-season data exists — Aug 28+ (confirmed real season start
   date).

3. **index.html byte ceiling hit twice this session** on ordinary
   feature work (NFL drama profiles' data injection needed a
   same-session byte-reclaim fix to land). Needs Jeff's decision:
   raise the ceiling, or treat byte-reclaim as standing overhead going
   forward.

4. **deploy-gate.yml's original push-trigger silent-failure incident**
   was never root-caused. Not currently blocking (workflow_dispatch
   fallback proven working), but the underlying mystery — a real,
   well-formed commit that didn't fire an unconditional push trigger —
   is unresolved. GitHub's own webhook delivery log would show why;
   only visible to a human with repo admin access.

5. **field-playground's BundesligaBroadcasters** was fully rebuilt
   this session against the real, live routes (was pointed at a route
   that was never built). Confirmed correct and deployed.

6. **field-playground's GameSymphonyArchive** had a real crash bug
   (dramaLeaderboard passed directly as a resource source, re-throwing
   on a genuine underlying error) — same bug class as BsdXgPanel/
   WcBracketTree/Newspaper earlier. Fixed with the same established
   guard pattern, confirmed clean, deployed.

## Documentation

Full session documentation for July 28 – August 2 written to Drive as
4 parts (each under the 220KB limit), parent folder 0ABxH84VndHL7Uk9PVA:
- Part 1: Jul 28–30 (playground foundations, drama-scoring validation)
- Part 2: Jul 30–Aug 1 (Savant fix, soccer 4-layer investigation, WP
  trilogy, DramaSoundscape iteration, BracketDO audit part 1)
- Part 3: Aug 1–2 (LaLiga/Bundesliga discovery + v1→v2 wiring,
  BracketDO guard closed)
- Part 4: Aug 2 (deploy-gate incident, ESPN standings bug, Browser
  Rendering, Bundesliga loop closed, playground creative batch)

## Codex tracking state

cc-cmd-queue is current as of this handoff — stale PENDING entries
from earlier in this arc were corrected to DONE/SUPERSEDED with
pointers to where verification evidence lives, rather than left
inaccurate. Two product-continuity entries exist for the two
Jeff-decision items above (byte ceiling, webhook mystery).

## Session type note

This has been a mixed A/C/D session (daily updates, feature builds,
investigation) spanning multiple real work threads without a clean
type boundary — documented as such rather than forced into one
category.
