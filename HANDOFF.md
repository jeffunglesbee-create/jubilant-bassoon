# FIELD Handoff — May 30 2026 (Session End — TYPE C: Leaders + Journalism)

## SESSION TYPE
TYPE C — Feature. Leaders wired for all V2 sports. Journalism context enriched.

## Code HEAD
`fad595a` — Smoke 246/0 · Deploy gate success

## COMPLETED THIS SESSION

### 1. NHL in-game leaders (A246)
- `pickSkaterLeader()` injected into existing `fetchNHLLiveStats` boxscore fetch
- Reads `playerByGameStats.{homeTeam|awayTeam}.{forwards|defensemen}[]`
- Sorts by `points`, writes `{name:'C. Caufield', val:2, unit:'PTS'}` to `espnScores[key].homeLeader/awayLeader`
- **VERIFIED 2026-05-30**: `name.default`, `goals`, `assists`, `points` all present
- Zero new API calls — piggybacks existing goalie boxscore fetch

### 2. MLB in-game leaders (A247)
- New `fetchMLBLeader(gamePk, espnKey)` — StatsAPI `/game/{gamePk}/boxscore`
- Picks `pitchers[last]` (current pitcher), writes `{name:'Cole', val:'6.0 IP 7K', unit:'IP'}`
- Wired in V2 poll loop via allData team-name match (same pattern as Savant WP)
- **VERIFIED**: `/games/statistics/players` does NOT exist for baseball — StatsAPI is correct source

### 3. Relay fix: NHL season param (c2a83ab on field-relay-nba)
- `V2_LEAGUES.nhl.season: '2025-2026'` → `'2025'` (integer)
- **VERIFIED**: hockey API requires integer; `'2025-2026'` was silently returning 0 NHL games

### 4. Player stats alternatives wired
- `fetchMLBLiveGame`: extended with `batter`/`pitcher` from `currentPlay.matchup.{batter,pitcher}.fullName`
- `fetchBDLSeasonAverages`: builds `window._bdlSeasonAvgByTeam` index on fetch (nick→players[], sorted by pts)

### 5. Journalism prompt enrichment (A248, A249)
- **[MLB AT-BAT]** (Item 6b): current batter/pitcher + platoon label for live MLB games. Reads `_mlbPlatoonCache` — zero extra calls. Skips pre-game.
- **[PPG LEADERS]** (Item 6c): pre-game NBA PPG leader per team from BDL season averages. Skips when live (Item 1 handles live leaders).

### 6. Journalism quota fix (A251)
- `journalismCallsToday.canCall()` now checks `_compoundRetryAfter`
- Individual J2/J3 calls no longer fire during active 429 backoff
- Prevents cascade that was deepening Gemini quota exhaustion
- **Root fix still required**: set `ANTHROPIC_KEY` in field-claude-proxy CF dashboard (Jeff only)

## PROBING FINDINGS (key facts, do not re-probe)
- `api-sports /games/statistics/players` — EXISTS for basketball, NOT for hockey or baseball
- NHL api-sports season must be integer (`2025` = 2025-26 season; `'2025-2026'` errors)
- NHLe boxscore IDs are ~10-digit ints (e.g. `2025030315`), NOT api-sports IDs
- NHLe `/v1/gamecenter/{id}/boxscore`: skaters have `name.default`, `goals`, `assists`, `points`
- StatsAPI `/game/{gamePk}/boxscore`: `teams.{side}.pitchers[last]` = current pitcher ID

## STILL OPEN (carried)
- **ANTHROPIC_KEY** in field-claude-proxy CF dashboard → Jeff only, definitive quota fix
- Journalism recovery (Gemini quota — quota fix helps but ANTHROPIC_KEY is the root fix)
- Dropbox refresh-token: add 3 secrets
- VAPID browser opt-in test
- Golf Doc 1 (1Ak_GPXkiKUvUr6dUpcto0BUbhKTibIwgR-o8SYUeBfM): scrub key + DECOMMISSIONED
- Build Session List paste (v7.26 draft → 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ)

## TIER 0 DEADLINES
- NHL SCF shell (CAR) — IMMINENT
- NBA Finals G1 shell (June 3, vs NYK)
- World Cup 2026 Phase 1 (June 11 HARD)
- USPTO provisional (~June 25)

## CANONICAL IDs
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Repo: jeffunglesbee-create/jubilant-bassoon
Relay repo: jeffunglesbee-create/field-relay-nba
Build Session List: 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ
ESPN Pivot spec (in-repo): docs/espn-pivot-phase0-1-2026-05-29.md
