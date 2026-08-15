# FIELD HANDOFF

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
