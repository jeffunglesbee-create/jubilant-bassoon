# CC session — 2026-10-17 — BDB vintage retrofit, Task 0 only

CC-CMD: `docs/CC-CMD-2026-10-16-bdb-vintage-retrofit.md`. Executed **Task 0
only**, as instructed, and stopped. No envelope, builder or consumer changed.

HEAD: `19e440a6` → `425b3879` (probe commits only). Smoke 1055/1055.
SW_VERSION not bumped (no deploy path touched).

## Measurement 1 — every consumer of the six, all four repos

Searched `main` of jubilant-bassoon `19e440a6`, field-relay-nba `7a55dd7`,
field-laboratory `1841798`, field-playground `6e3e41b`. Searched every tracked
file except `outbox/`, `docs/` and `*.md`, for each file name.

**All six have a live client consumer, not two.** The CC-CMD had two
established and four unknown. All six follow one chain in
`src/legacy/field.js`:

| file | fetch | parse into | getter | rendered row (label) |
|---|---|---|---|---|
| `bdb_speed` | :4607 | `NFL_BDB_SPEED` | `getTeamTopSpeed` :4706 | :18075 "Top speed" |
| `bdb_separation` | :4608 | `NFL_BDB_SEP` | `getTeamTopSep` :4707 | :18081 "Top separation" |
| `bdb_route_entropy` | :4609 | `NFL_BDB_ROUTE` | `getTeamTopRoute` :4708 | :18087 "Route tree" |
| `bdb_xblock_pass_rush` | :4610 | `NFL_BDB_RUSH` | `getTeamTopRusher` :4709 | :18093 "Pass rush" |
| `bdb_tendency_fingerprint` | :4611 | `NFL_BDB_TEND` | `getTeamTendency` :4710 | :18099 "Tendencies" |
| `bdb_time_to_throw` | :4612 | `NFL_BDB_TTT` | `getTeamTimeToThrow` :4711 | :18106 "Time to throw" |

What each row does:
- **Where:** it renders on the NFL scout panel for the current game's two
  teams (`game.home` / `game.away`).
- **Keyed by 2022 team:** each value is keyed by the player's **2022 team**
  (`p.team`). So a player who has changed team since 2022 is shown as his old
  team's "Top speed" in a 2026 game. How many players this affects is
  **unmeasured**.
- **No season shown:** no row shows a season. The parse reads neither
  `season` nor `targetYear`.
- `smoke.js:1127-1154` asserts all six are wired (fetch + getter + row).

Other repos:
- **field-relay-nba serves them and does not read them:** allow-listed at
  `src/index.js:1030-1034, 1052`, in `NFL_R2_FILES` at `:19437-19439`, plus two
  probes.
- **field-laboratory:** none of the six. It reads only
  `bdb_event_frames.json`, which already carries `season`.
- **field-playground:** none.

**`targetYear` has no reader anywhere.** Writers only:
- `scripts/build-bdb-data.py` (the six);
- `scripts/build-ngs-data.py:561` and relay `src/nfl-r2.js:206` (NGS files);
- two checks that assert it is *absent* from `bdb_event_frames`.

Removing it from the six (Task 1) breaks no consumer. The NGS files keep theirs.

## Measurement 2 — does anything join or compare BDB with NGS?

**No computation joins them.**
- NGS `avgTimeToThrow` (2026) is loaded into `NFL_NGS_PASSING`
  (`field.js:4482-4483`) and **never rendered**. The QB row uses CPOE and
  attempts only.
- BDB `avgTimeToThrow` (2022) becomes `NFL_BDB_TTT` and renders as "Time to
  throw".
- The relay's `scripts/espn-vs-ngs-field-map.mjs` names the NGS field only.

**But they are co-displayed.** One scout panel shows 2026 NGS rows ("QB CPOE",
receivers, rushers) directly above 2022 BDB rows. Neither is labelled with a
season. That is juxtaposition, not a join: no number is derived from both.

## Measurement 3 — can the builder produce a current season?

`scripts/build-bdb-data.py`:
- **One dataset:** it reads one hardwired dataset,
  `alexandermeau/nfl-big-data-bowl-archived-data-2025`.
- **The real season:** detected from its `games.csv`.
- **`targetYear` is not a decision:** it is computed from the clock
  (`now.year if now.month >= 8 else now.year - 1`) and is also the R2 folder
  (`nfl/{year}/`). It records no mapping decision.

Re-measured on a runner with `scripts/bdb-availability-probe.py` (this repo
holds the Kaggle credentials). Runs 39062243899, 39062350917 and 39062445926,
artifact `outbox/bdb-availability-probe-latest.json`, 2026-10-17:

- **nflverse:** 25 release tags, none tracking-like; `/releases/tags/tracking`
  is HTTP 404. This confirms the relay's 2026-08-15 reading.
- **Kaggle datasets** matching "big data bowl": 125 seen over 7 pages. All 34 of
  ≥ 100 MB were opened, and `games.csv` was read where present.
  - **2022** (`games.csv`): the current source, its `ameau01` twin, and five
    other copies of the BDB 2025 archive.
  - **2023**, BDB 2026 copies: prediction-input files only. No tracking, no
    `plays.csv`, no `player_play.csv`. Confirms the 2026-08-15 reading.
  - **2023 / 2024 / 2025**: `kvinguemnengfotso/dataset-ideathon` (2026-10-15)
    and `jeevanreddyvaka/nfl-bowl` (2026-10-08). Each is 512,718,566 bytes,
    under a `nfl-big-data-bowl-2027/` folder. Files: `game_tracking_2023.csv`,
    `game_tracking_2024.csv`, `game_tracking_2025.csv`, `games.csv` (seasons
    2023-2025), `player_play.csv`, `players.csv`, `combine_*.csv`,
    `player_career_successes.csv`. **No `plays.csv`.**
- **Kaggle competitions:** the listing returned **HTTP 401**. This is
  **unmeasured**, not "none". The BDB 2027 competition itself, and its terms,
  were not read.

What that means for each builder, from the files each function opens:
- **Tracking or `player_play` only:** speed (tracking), route entropy
  (`player_play.csv`), pass rush (`player_play.csv`). These have a newer-season
  source, **if** its columns match. Not measured: the 2027 files use a
  different name (`game_tracking_YYYY`), and at 513 MB for three seasons
  against 1.2 GB for nine 2022 weeks, coverage is partial.
- **Need `plays.csv`:** separation, tendency, time-to-throw. They have **no**
  newer source among what was found.
- **Not my call (Rule 45):** the two 2027 datasets are third-party re-uploads
  of what appears to be competition data. Whether using them is permitted is
  for the owner.

## Evidence on the owner's question (reported, not decided)

**Known at build time.** `outbox/cc-session-2026-08-15-p3-bdb-tracking.md:55-56`
says:

> "Data-freshness note: BDB archived tracking is the 2022 season (historical) —
> the speed is a 'top recorded' career-ish stat, not current-season. Framed as
> such."

**Not carried to the reader.** No row is framed as historical. "Top speed",
"Top separation" and the rest render beside current-season rows with no season,
under the player's 2022 team.

**`targetYear` is not evidence of a mapping decision.** It is the clock's year
and the storage folder.

At the time, 2022 was the newest season with full BDB schema obtainable without
a competition. As of 2026-10-17 a 2023-2025 tracking set exists, but without
`plays.csv` and with unassessed terms.

## Decision needed (owner) — Task 1 is blocked on it

- **Knowing proxy:** keep serving 2022; Task 1 labels it everywhere it renders.
- **Unnoticed staleness:** stop presenting it as current. Either stop rendering
  the six, or re-source the three tracking/`player_play` metrics from the 2027
  data, after a schema probe and your terms review. The three that need
  `plays.csv` have no newer source either way.

## Commits

| commit | what |
|---|---|
| `778bb0e1` | `scripts/bdb-availability-probe.py` + dispatch-only `bdb-availability-probe.yml` |
| `3b409e1a` | inspect every ≥ 100 MB dataset, not only known names |
| `425b3879` | record file names, not only counts |

The probe and its workflow change nothing served.

---

# Owner ruling and Task 2 (2026-10-17, same day)

## The ruling, verbatim in substance

The answer differs by metric because the key differs by metric:

- **Team-keyed, keep and label:** `bdb_time_to_throw`, `bdb_tendency_fingerprint`.
  32 rows each, no player names, no roster join to go stale. A 2022 franchise
  tendency is an honest historical note once it says 2022, so it is a genuine
  knowing proxy.
- **Player-keyed, drop from the panel:** `bdb_speed`, `bdb_separation`,
  `bdb_route_entropy`, `bdb_xblock_pass_rush`.
- **Do not re-source from the 2023-25 datasets:**
  - the `plays.csv` metrics have no newer source;
  - the datasets are third-party re-uploads with unassessed terms (Rule 45);
  - coverage is partial.

  The route to newer tracking is the BDB 2027 competition under its own
  terms, which is unmeasured (the listing returned 401).
- **Keep the files, R2 and the relay route.** The envelopes already carry
  `season: 2022`; the client parse ignored it. So **Task 1 (envelope changes)
  is superseded by the ruling**: no envelope was changed.

## Premises re-measured before building

- **The committed copies** (`outbox/nfl/*.json`) show the split above:
  time-to-throw and tendency have 32 rows and 0 named; speed has 1648 named,
  separation 250, route entropy 354 and pass rush 321.
- **The served copies match:** `bdb-serve-probe.mjs`, extended in `b68e382b`
  to print `season` and named-row counts, gave run 39074302514: `season=2022`
  on all six, named counts identical.

## The change — `4172d95f`

`src/legacy/field.js`, synced into `index.html`. `SW_VERSION 2026-10-17a`.

- **Four player-keyed tables gone:** no longer fetched. Their parse blocks,
  tables and getters were removed; a grep found no other caller.
- **Two team-keyed rows labelled from the data:** they read
  `Tendencies (2022)` and `Time to throw (2022)`. The label comes from the
  envelope's own `season` via `_bdbSeason(j)`.
- **No season, no row:** a table whose envelope has no four-digit season is
  not loaded and renders nothing (Rule 99).
- **`smoke.js`:** 1055 → 1053, six assertions replaced by four.
  - `A-NFLBDB-1` **inverted**: none of the four fetches, tables, getters or
    labels may reappear.
  - `A-NFLTEND-1` and `A-NFLTTT-1` require the season label.
  - `A-NFLBDB-2` requires the no-season gate.

  Mutations, 4 of 4 caught: re-add a player-keyed fetch; unlabelled
  Tendencies; time-to-throw season hard-coded; render without a season.
- **`nfl_bdb_scout_probe.js`** asserts the new contract on **every** live NFL
  game: no dropped row, and both kept rows carrying `(YYYY)`. It also records
  each panel's total row count. Verified on local fixture pages:
  - correct panel → PASS;
  - a dropped row back → FAIL;
  - an unlabelled kept row → FAIL;
  - no NFL game → SKIP, not PASS.
- **CI:** deploy-gate 39074888633 and smoke-and-verify 39074888618 green.
  Live probe run 39075358271 read `SW_VERSION 2026-10-17a` on the deployed
  site, so the deploy landed.

## Does the panel read thin without the four? (the owner's unmeasured item)

From the render code (`buildScoutingReport`, NFL branch), with no row cap:
- **Before:** up to 16 rows. Eight NGS/pbp rows (QB CPOE, QB szn EPA,
  Start QB, two WR rows, RB RYOE, Team EPA, Pass pro), six BDB, two injury.
- **After:** up to 12.
- **The four were always present:** on 2026-10-04 they rendered on 15 of 15
  live NFL games (`outbox/nfl-bdb-scout-manifest-2026-10-04T23-52-42-842Z.json`),
  so every NFL panel loses exactly four rows.
- The live per-panel count is below.

## Live NFL verification — DONE 2026-10-18

Probe run **39127795082** (dispatched 12:35 UTC on the Sunday slate, not
waiting for the 21:00 cron). Manifest:
`outbox/nfl-bdb-scout-manifest-2026-10-18T12-35-03-548Z.json`.

- `nflGameCount` **12** of 18 games. `contractHoldsOnEveryNFLGame` **true**.
  - None of the four dropped rows appears.
  - Tendencies and Time to throw carry "(2022)".
- **The panel does not read thin:** `nflRowCount` min 11, median 12, max 13
  (it was up to 16 before `4172d95f`).
- **Speed floor:** rendered on **12/12** games, every value marked `≥`.
  - Spot checks against `outbox/nfl/bdb_speed.json`: Metcalf ≥19.6
    (19.64), Kenneth Walker III ≥22.1 (22.09).
  - **The ambiguity guard holds live:** the Bills side reads
    `J.Cook III ≥18.9 · D.Moore ≥20.5`, with no Josh Allen. The Ravens side
    reads `D.Henry ≥20.6 · M.Andrews ≥19.4`, with no Lamar Jackson.
  - The Browns side reads `—`, as measured on the copies.
- The games were scheduled, not yet live. The rows come from static tables, so
  game state does not change them. The 21:00 UTC scheduled run still goes red
  on a regression.

### One defect of mine, corrected by the deploy gate

The manifest reports `swVersion` **2026-10-17a**, not the `2026-10-18a` I
committed.
- **Cause:** I dated the version by UTC. The rule is ET: the push was at
  01:43 UTC, which is 21:43 ET on 10-17. The deploy gate's A190 step re-dated
  it in `435c819b`.
- **Cost:** it kept my suffix `a`, so this deploy has the same version as the
  previous one. `sw.js` is stale-while-revalidate on the shell, so a returning
  user sees the old panel for one load and the new one on the next.
- **What was right:** `2026-10-17b`.
- **Not changed:** the gate taking the suffix from `sw.js` unchanged is how it
  is meant to work. The defect was my input.

## Left as is, deliberately

- **The relay's allow-list comment** (`field-relay-nba src/index.js:1027-1029`)
  still says route entropy and separation "have builders + client consumers".
  The files and route stay by ruling, so the comment is stale but harmless.
  Not edited from here (one session, one repo).
- **`targetYear`** stays in the envelopes, by ruling.

---

# A counter-proposal, tested before any ruling (2026-10-17, later)

The proposal: a knowing proxy implemented as per-row vintage, plus a "free 2026
time-to-throw swap", plus current-team re-attribution, with nothing dropped. It
also asked for the BDB 2027 competition to be read first-party before any row
is retired. Each premise was measured. **Nothing was built**: it reverses
`4172d95f`, so it waits on the owner.

| premise | measured | holds? |
|---|---|---|
| a max only revises upward, so a 2022 top speed is a valid 2026 lower bound for that **player** | true by definition | **yes, per player** |
| example "≥ 21.4 mph" | 2022 max is **23.77 mph**, median 17.8, n = 1648 | figure wrong |
| a "free" 2026 time-to-throw swap | BDB value is `plays.csv` `timeToThrow` averaged per `possessionTeam` (`build-bdb-data.py:310-345`). 2026 NGS `ngs-passing.json` is **per QB**, 43 QBs, 32 teams covered. A team value would be a new attempt-weighted aggregate from another provider, so not the same metric. It also puts one 2026 row among 2022 rows: the mixed vintage the same proposal argues destroys comparability. | **no** |
| current-team re-attribution | of the 2022 player rows, **41-52%** appear in the 2026 snap counts (speed 675/1648, separation 131/250, route entropy 161/354, pass rush 164/321). About **70%** of those changed teams (speed: 468 moved, 205 same, 2 ambiguous). Team abbreviations are identical in both sources, and the moves are real (e.g. Rodgers GB→PIT). | mechanically yes |
| ...and the re-attributed row still means "top X on this team" | each 2026 team's snap list has a 2022 speed value for **median 38%** of its players (range 19-55%), and 54% of its ≥50%-snap players (24-68%). A team's "Top speed" would rank only players who were in the league in 2022. Every player drafted since is invisible. | **no**: the per-player lower bound does not survive becoming a per-team ranking |
| the BDB 2027 competition may give the full schema, `plays.csv` included | run 39075687837. The earlier 401 was the auth mode: `competitions/*` answers **Bearer** 200, while None and Basic give 401. `competitions/data/list/nfl-big-data-bowl-2027` lists **the same 9 files** as the re-uploads: `game_tracking_2023/2024/2025`, `player_play`, `players`, `games`, `combine_results`, `combine_tracking`, `player_career_successes`. **No `plays.csv`, first-party either.** Download and the competition terms were not read (Rule 45: the owner's). | **no** |

Copies used: the re-attribution and coverage numbers come from the committed
`outbox/nfl/` copies (`bdb_speed` and the others, plus `snap-counts.json`,
season 2026, updated 2026-10-12). The served BDB copies were confirmed
identical in run 39074302514. The served snap counts were not re-read.

What this leaves for the owner:
- **Speed** has a sound per-player reading.
- The **team-ranking** form is the part that fails.
- **Time-to-throw** has no like-for-like current replacement.
- First-party access does not reopen the three `plays.csv` metrics.

---

# Owner ruling 2: "add speed line" (2026-10-18)

Of the counter-proposal, only the per-player speed reading survived (table
above). The owner chose to add it as one line. `4172d95f` otherwise stands:
separation, route tree and pass rush stay unfetched, and no team-ranked
"Top speed" returns.

## The change

`src/legacy/field.js` (synced to `index.html`), SW_VERSION `2026-10-18a`.

- `bdb_speed.json` is fetched again and loaded only when its envelope declares a
  season (`_bdbSeason`), like the two team rows.
- It is keyed by **name**, because the depth chart carries no BDB `nflId`.
  The key lowercases the name, drops one trailing suffix token
  (`_MLB_SUFFIX_TOKENS`: Jr/Sr/II/III/IV) and strips non-letters, so
  `DJ Moore` = `D.J. Moore` and `Kyle Pitts Sr.` = `Kyle Pitts`.
- **A name two 2022 players share maps to null.** That is 11 names in the file,
  among them Josh Allen (BUF/JAX), Lamar Jackson (BAL/CHI) and Michael Carter
  (two on NYJ). Those starters get no value, because the right one cannot be
  chosen.
- `getStarterSpeedFloors(team)` takes the **current** depth chart's QB, RB, WR
  and TE starters (`getDepthStarter`) and returns those with a 2022 value, in
  position order. It does not sort by speed: a ranking over the subset tracked
  in 2022 is exactly what failed above.
- Row: `Speed floor mph (2022)`, value e.g.
  `Steelers A.Rodgers ≥18.1 · J.Warren ≥19.0 · D.Metcalf ≥19.6 | ...`. A side
  with no value shows `—`. The row is absent when neither side has one, or when
  the envelope has no season.

## Measured before building

All of these use the committed `outbox/nfl/` copies (`bdb_speed.json` season
2022; `depth-charts.json` season 2026, updated 2026-10-12). The served depth
chart was not re-read; the live probe below reads the served one.

- **Coverage:** 71 of 128 QB/RB/WR/TE starters match a 2022 name. 30 of 32
  teams show at least one; SEA and CLE show `—`.
- **Correction:** the WR row does not name its receivers (it shows AYS/YAC
  only), so "players named elsewhere on the panel" was wrong for WRs. The depth
  chart is what supplies current-team names.
- **Identity, residual:** a name match is not an ID match. A 2023+ player with
  the same name as a different 2022 player would show the 2022 player's speed.
  - All 71 current matches were read by eye, and each is the same player.
  - The ambiguity guard catches collisions within 2022 only.
  - A cross-era ID join needs a BDB `nflId` ↔ gsis mapping, which the builders
    do not carry and which was not probed.

## Verification

- `node smoke.js index.html`: **1054 passed, 0 failed** (from 1053).
  - New assertion: `A-NFLSPD-1`.
  - `A-NFLBDB-1` now allows `/bdb_speed.json` but still forbids the team table
    (`NFL_BDB_SPEED =`), `getTeamTopSpeed` and `lbl: 'Top speed'`.
  - `A-NFLBDB-2` adds the speed season gate.
- **Mutations, 7 of 7 applied and caught** (each anchor unique):
  - an ambiguous name kept;
  - ranked by speed;
  - season label dropped;
  - `≥` dropped;
  - season gate dropped;
  - team table back;
  - names not from the depth chart.
- **Render logic on the real fixtures**, extracted from `field.js`:
  - season 2022 is read;
  - 11 names are ambiguous;
  - `BUF J.Cook III ≥18.9 · D.Moore ≥20.5` (no Josh Allen);
  - an envelope with no season gives no values.
- `nfl_bdb_scout_probe.js` learns the row as **optional**. When it is present it
  must carry `(YYYY)`, and every number in its value must be marked `≥`.
  `speedRowGames` is recorded. The fixture results are below.
- **Live:** the Sunday scout probe (2026-10-18 21:00 UTC) now also checks this
  row. The existing check-in at 21:45 UTC reads it.

**Probe fixtures** (local `file://` pages, same Playwright path), 7 of 7 as
intended:

| fixture | result |
|---|---|
| row present, all `≥` | PASS |
| row absent | PASS, `speedRowGames` 0/1 |
| one side `—` | PASS |
| no season in the label | **FAIL** |
| no `≥` anywhere | **FAIL** |
| one of two entries without `≥` | **FAIL** |
| row present with no entries | **FAIL** |
