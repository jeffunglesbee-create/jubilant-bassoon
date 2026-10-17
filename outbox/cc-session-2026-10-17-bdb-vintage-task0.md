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
