# CC Session — 2026-07-19 — Cross-Sport Analytics Layer

## HEAD Progression
- Start: `12689ee` (competitor probe 2026-07-19)
- End:   `4a211dc` (cross-sport analytics layer)

## SW_VERSION
- 2026-07-19a → 2026-07-19b

## Smoke
- Start: 958 passed, 0 failed
- End:   958 passed, 0 failed (no assertions added or removed)

## Commits

### jubilant-bassoon `4a211dc`
`feat: cross-sport analytics layer — NFL NGS, MLB xwOBA, FPL xG/xA, Pythagorean record`

Changes to `src/legacy/field.js`:

**MLB:**
- Re-added `expected_stats` to `mlbStatsInit` FILES array → populates `PLAYER_EXPECTED_STATS` map
- `getXwobaDivergence(lastName)` — returns `{divergence, woba, xwoba, pa}` (50+ PA filter)
- xwOBA divergence surfaced in At-Bat Edge section for live current batter
- `mlbPythagInit()` — fetches MLB Stats API `/standings`, computes RS^1.83/(RS^1.83+RA^1.83) per team → `MLB_TEAM_PYTHAG[abbr]`
- `getMLBTeamPythag(abbr)` getter

**NFL:**
- `nflNGSInit()` — loads `ngs-passing.json` + `ngs-receiving.json` from R2 relay
  - QB map: `NFL_NGS_PASSING` keyed by last name (100+ att filter); fields: cpoe, aggressiveness, avgTimeToThrow, team, attempts, xCompPct
  - WR map: `NFL_NGS_RECEIVING` keyed by last name (30+ tgt filter); fields: yacAboveExp, separation, airYardShare, team, targets
- `getNGSTeamQBs(teamAbbr)` / `getNGSTeamReceivers(teamAbbr)` — filter by NGS team code (e.g. "KC", "CHI")
- `getNGSPassingProfile(lastName)` / `getNGSReceivingProfile(lastName)` — direct getters
- `buildScoutingReport` NFL section: shows QB CPOE (+ italicized if positive, warn-classed if negative) and top-3 WR air yard share + YAC Above Expected

**Soccer (EPL):**
- `fplLoadBootstrap` extended: adds per-90 xG/xA/xGI/xGC, form, ICT, **teamId** to `FPL_PLAYER_ANALYTICS`
- `_fplTeamNameToId` reverse map: full team name (lowercase) → FPL team ID
- `getFPLTeamLeaders(teamName)` — top 3 attackers/midfielders (element_type ≥ 3) by xGI90
- `getFPLPlayerAnalytics(webName)` — direct getter
- `buildScoutingReport` EPL section (detected by `sp.includes('premier league')`)

**Boot init:**
- `setTimeout(mlbPythagInit, 4900)` — T+4.9s
- `setTimeout(nflNGSInit, 5000)` — T+5.0s
- Added both to `_riFns` tracking array

**Constants:**
- `PLAYER_EXPECTED_STATS`, `MLB_TEAM_PYTHAG`, `NFL_NGS_PASSING`, `NFL_NGS_RECEIVING`, `FPL_PLAYER_ANALYTICS`

### field-relay-nba `9be0604`
`feat: add /standings to MLB Stats API allowlist for Pythagorean record (mlbPythagInit)`
- Added `/standings` to `MLB_STATS_API_ALLOWED_PREFIXES` (Rule 70 ATOMIC-A: paired with client usage)

## Integration Status

| Feature | Status | Notes |
|---|---|---|
| NFL NGS QB CPOE | STAGED | relay endpoints verified (ngs-passing.json ok, ngs-receiving.json ok). Scouting report section wired. E2E requires NFL season. |
| NFL NGS WR YAC/Air Yards | STAGED | Same |
| MLB xwOBA divergence | STAGED | PLAYER_EXPECTED_STATS populated from /mlb-stats/expected_stats.json (39,815 bytes, verified probe run). At-Bat Edge wire active. |
| MLB Pythagorean record | STAGED | Relay allowlist deployed. Client `mlbPythagInit` calls `/mlb-stats/standings?...` which proxies to MLB Stats API. Verify: `curl 'https://field-relay-nba.jeffunglesbee.workers.dev/mlb-stats/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason&fields=records,teamRecords,team,abbreviation,wins,losses,runsScored,runsAllowed'` |
| EPL FPL xG leaders | STAGED | fplLoadBootstrap extended. Scouting report EPL section wired. E2E requires EPL season + FPL bootstrap serving per-90 fields. |

## Carry-Forwards (none — per Rule 87)
- Leverage Index and RE24: confirmed gaps (probe 2026-07-19), require new relay endpoints. Not addressed. Future CC-CMD.
- Schedule-Adjusted Record: confirmed gap, requires SOS data. Future CC-CMD.
- FPL team name matching relies on `_fplTeamMap` being populated before `getFPLTeamLeaders` is called. If EPL scouting report fires before fplLoadBootstrap completes, `_fplTeamNameToId` is null → returns [] gracefully.

## NGS Team Abbreviation Format
NGS uses uppercase 2-3 char codes (KC, CHI, LAR, NYG, NYJ). Derived from `espnTeamAbbrevs` via:
```javascript
espnTeamAbbrevs[(game.home||'').toLowerCase()]?.abbrev?.toUpperCase()
```
Verified: Chiefs → espnTeamAbbrevs["kansas city chiefs"] = {abbrev:"kc"} → "KC" matches NGS.
