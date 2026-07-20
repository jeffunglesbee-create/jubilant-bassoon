# Competitor Metrics Probe — 2026-07-20

Probes public HTML of competitor pages and FIELD relay endpoints for advanced metric terms.
Paywalled probes: skipped (run with --include-paywalled to include)

## Summary
| | Count |
|---|---|
| Found on competitor | 12 |
| Not found on competitor | 9 |
| Blocked / bot-gated | 30 |
| Skipped (paywall) | 6 |
| Gap metrics (on competitor, not in FIELD relay) | 4 |

## Results by metric

### 🚨 Pythagorean Record / Expected Record
**FIELD relay:** `not built` — not-built
> Not yet built. Could be derived from /v2/games win/loss data.

| Site | Result | Terms matched |
|---|---|---|
| FanGraphs Standings | found | `pythagorean`, `pythag` |
| Baseball Reference Standings | found | `pythagorean`, `pythag` |
| ESPN MLB Standings | blocked:bot-gate | — |
| ESPN NBA Standings | blocked:bot-gate | — |

### 🚨 Leverage Index (live / in-game)
**FIELD relay:** `not built` — not-built
> Not yet built. Requires RE matrix + live state; no relay endpoint.

| Site | Result | Terms matched |
|---|---|---|
| FanGraphs Glossary | found | `leverage index`, `high leverage`, `leverage` |
| FanGraphs Live Scoreboard | found | `leverage index`, `leverage` |
| Baseball Reference Play Index | found | `leverage index`, `leverage` |
| ESPN Gamecast | blocked:bot-gate | — |

### 🚨 Run Expectancy / RE24 (live)
**FIELD relay:** `not built` — not-built
> Not yet built. Savant pipeline has expected_stats.json but not RE24.

| Site | Result | Terms matched |
|---|---|---|
| FanGraphs | found | `run expectancy` |
| Baseball Savant | not-found | — |
| Baseball Reference | found | `run expectancy` |

### ⚠️ Stuff+
**FIELD relay:** `/mlb-stats/pitch_arsenals.json` — ok (80 bytes)
> Relay serves Savant pitch arsenal data (pitch mix, velo, spin, movement). Stuff+ itself is FanGraphs-licensed — relay has related pitch quality data.

| Site | Result | Terms matched |
|---|---|---|
| FanGraphs Pitching | found | `stuff+` |
| Baseball Savant | not-found | — |
| ESPN Stats | blocked:bot-gate | — |

### ⚠️ Barrel Rate
**FIELD relay:** `/mlb-stats/expected_stats.json` — ok (40118 bytes)
> Relay serves Savant expected stats including barrel data (barrel%, xBA, xSLG, xwOBA).

| Site | Result | Terms matched |
|---|---|---|
| Baseball Savant | not-found | — |
| FanGraphs | found | `barrel%` |
| ESPN | blocked:bot-gate | — |

### ✅ Field Tilt / Territory Control (soccer)
**FIELD relay:** `/soccer-fbref/mls.json` — ok (480 bytes)
> Relay serves FBref squad possession stats including territorial data. Field tilt term itself not labeled but possession zone data present.

| Site | Result | Terms matched |
|---|---|---|
| FBref Match | blocked:HTTP 403 | — |
| Sofascore | blocked:HTTP 403 | — |
| ESPN Soccer | blocked:bot-gate | — |
| Opta / Stats Perform | not-found | — |

### ✅ PPDA (Passes Allowed Per Defensive Action)
**FIELD relay:** `/soccer-fbref/mls.json` — ok (480 bytes)
> Relay serves FBref squad stats (possession table includes press stats). PPDA not explicitly labeled but pressing data is present.

| Site | Result | Terms matched |
|---|---|---|
| FBref | blocked:HTTP 403 | — |
| Understat | blocked:HTTP 404 | — |
| ESPN Soccer Stats | blocked:bot-gate | — |

### ✅ Post-Shot xG
**FIELD relay:** `/soccer/xg` — error:HTTP 400
> Relay serves per-game xG from ESPN Core API. WC2026 + premium leagues verified. Returns _hasXG:false when not available.

| Site | Result | Terms matched |
|---|---|---|
| FBref Keepers | blocked:HTTP 403 | — |
| Understat | blocked:HTTP 404 | — |
| ESPN | blocked:bot-gate | — |

### ✅ Zone Entry Differential (hockey)
**FIELD relay:** `not built` — not-built
> Not yet built. Natural Stat Trick tracks this but no relay endpoint.

| Site | Result | Terms matched |
|---|---|---|
| Natural Stat Trick | blocked:HTTP 403 | — |
| MoneyPuck | not-found | — |
| ESPN NHL Stats | blocked:bot-gate | — |

### ✅ Transition Frequency / Fast Break Points (basketball)
**FIELD relay:** `not built` — not-built
> Not yet built. NBA.com hustle stats blocked by bot-gate in Workers; no relay endpoint.

| Site | Result | Terms matched |
|---|---|---|
| NBA.com Advanced Stats | blocked:HTTP 403 | — |
| Cleaning the Glass | skipped-paywall | — |
| ESPN NBA Stats | blocked:bot-gate | — |

### ✅ Points Per Possession by Half (basketball)
**FIELD relay:** `not built` — not-built
> Not yet built. No relay endpoint for per-half PPP splits.

| Site | Result | Terms matched |
|---|---|---|
| Cleaning the Glass | skipped-paywall | — |
| NBA.com Tracking | blocked:HTTP 403 | — |
| ESPN | blocked:bot-gate | — |

### ⚠️ Air Yards vs YAC split (NFL)
**FIELD relay:** `/nflverse/ngs-receiving.json` — ok (57561 bytes)
> Relay serves NFL Next Gen Stats receiving data (air yards, YAC, separation) from nflverse R2 pipeline.

| Site | Result | Terms matched |
|---|---|---|
| NFL Next Gen Stats | found | `yac` |
| PFF | skipped-paywall | — |
| ESPN NFL Stats | blocked:bot-gate | — |

### ✅ Success Rate (NFL)
**FIELD relay:** `/nflverse/player-stats.json` — error:HTTP 403
> Relay serves nflverse player stats including EPA/play from which success rate is derivable.

| Site | Result | Terms matched |
|---|---|---|
| Football Outsiders | blocked:fetch failed | — |
| PFF | skipped-paywall | — |
| ESPN | blocked:bot-gate | — |

### ✅ Pressure Rate / QB Pressure (NFL)
**FIELD relay:** `/nflverse/ngs-passing.json` — ok (17169 bytes)
> Relay serves NFL Next Gen Stats passing data including time to throw and pressure metrics.

| Site | Result | Terms matched |
|---|---|---|
| PFF | skipped-paywall | — |
| NFL Next Gen Stats | not-found | — |
| ESPN | blocked:bot-gate | — |

### 🚨 Schedule-Adjusted Record / SOS-corrected W-L
**FIELD relay:** `not built` — not-built
> Not yet built. Requires SOS data + standings computation; no relay endpoint.

| Site | Result | Terms matched |
|---|---|---|
| ESPN Power Index | blocked:bot-gate | — |
| FanGraphs Standings | not-found | — |
| Baseball Reference | found | `strength of schedule` |

### ✅ Breakeven Pace (games needed at X win-rate to hit target)
**FIELD relay:** `not built` — not-built
> Not yet built. Novel FIELD metric — no competitor serves this, no relay endpoint yet.

| Site | Result | Terms matched |
|---|---|---|
| FanGraphs Standings | not-found | — |
| ESPN Playoffs Picture | blocked:bot-gate | — |
| Baseball Reference | not-found | — |

### ✅ Clutch Net Rating (NBA)
**FIELD relay:** `/nba-clutch/clutch_regular.json` — ok (4750 bytes)
> Relay serves NBA.com clutch stats (last 5 min, within 5 pts) from R2 pipeline. Regular season and playoffs available.

| Site | Result | Terms matched |
|---|---|---|
| NBA.com Clutch Stats | blocked:HTTP 403 | — |
| Cleaning the Glass | skipped-paywall | — |
| ESPN | blocked:bot-gate | — |

### ⚠️ GSAx — Goals Saved Above Expected (NHL)
**FIELD relay:** `/nhl-gsax/regular.json` — ok (12783 bytes)
> Relay serves MoneyPuck GSAX from R2 pipeline. Regular season and playoffs available.

| Site | Result | Terms matched |
|---|---|---|
| Natural Stat Trick | blocked:HTTP 403 | — |
| MoneyPuck | found | `goals saved above expected` |
| ESPN NHL Stats | blocked:bot-gate | — |

---
*Generated by scripts/probe-competitors.mjs. Claims about metric uniqueness must cite a run of this probe, not training-data assumptions.*