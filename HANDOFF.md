# FIELD HANDOFF — 2026-06-05 (Session END — WC Pre-Flight)

## State
jubilant-bassoon HEAD: cd2b737 · Smoke: 509/0 · Unit tests: 66/0
field-relay-nba HEAD: 25d8fbc
SW_VERSION: 2026-06-05a

## WC Pre-Flight — COMPLETE ✅

### Probe Results (all endpoints probed via MCP probe_relay_route)

| Endpoint | Status | Notes |
|---|---|---|
| `/health` | 200 | `wc-d1` + `soccer-wp` confirmed in health string |
| `/wc/standings` | 200 | `{"groups":{}}` — empty, correct pre-tournament |
| `/wc/results` | 200 | `{"results":[]}` — empty, correct |
| `/wc/odds-probs` | 200 | Full group stage loaded, 29–30 bookmakers/match |
| `/v2/games?sport=wc26&date=2026-06-11` | 200 | MEX vs RSA: `state:pre`, correct UTC kickoff, Azteca venue |
| `/wc/wp/verify` | 200 | `soccer_fifa_world_cup active=true`, 19,983 quota remaining |

### Alias normalization — verified correct
`_wcMatchTeamName()` already handles all known discrepancies as of June 4:
- `usa` ↔ `united states`
- `turkey` ↔ `turkiye`
- `czech republic` ↔ `czechia`
- `dr congo` ↔ `congo dr`
- `ivory coast` ↔ `cote d ivoire`

NFD normalization strips diacritics before comparison (handles Türkiye → turkiye).

### V2 source flag — date-gated (cd2b737)
`FIELD_V2_SOURCES.wc26` changed from `false` to:
```js
wc26: new Date() >= new Date('2026-06-11T00:00:00Z')
```
Auto-activates at June 11 00:00 UTC. No manual deploy needed on game day.
V2 poll loop will start hitting `/v2/games?sport=wc26&date=...` every 30–60s
as soon as the flag evaluates true. Pushes WC scores into `espnScores` on every
poll cycle — cards update without the WC Groups tab being open.

### Architecture summary
- Live card scores: V2 poll loop → `fetchV2Games('wc26')` → `espnScores[key]` (active June 11+)
- WC Groups tab: `fetchWCStandings()` + `fetchWCResults()` + `fetchWCOddsProbabilities()` + `fetchWCLiveGames()` (tab-driven, always independent)
- Watch Engine WC OTW: `_otwFindWCLiveGame()` reads `_wcLiveGamesCache` (populated by `fetchWCLiveGames`)
- `wcActive` flag: date-gated `2026-06-11` to `2026-07-20` local — controls nav link + WC UI visibility

### Nothing else needed before June 11
No code changes required on game day. The date-gated flag handles everything automatically.

## Priority List

### After WC opens (June 11+)
1. Monitor V2 wc26 scores on G1 — confirm Mexico name matches (`Mexico` both sides, should be clean)
2. Confirm odds attachment works on G1 card (Mexico 66.8% to win)

### Other pending (this week)
3. JQ Gate brand-safe fallback (~60 lines)
4. Drama Dial header chip (~20 lines)
5. Arc Poster (~200 lines, BLOCKER: verify getDramaHistory() populated live)
6. State Transition PerformanceObserver (~30 lines)
7. iOS PWA Add-to-Home (~40 lines)
8. `fetchAFGoalEvents()` — populate `_afEventCache` for PM-28g soccer goal timeline

## Key Refs
jubilant-bassoon HEAD: cd2b737
field-relay-nba HEAD: 25d8fbc
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 509/0 · Unit: 66/0
