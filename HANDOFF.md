# FIELD HANDOFF — 2026-06-06 (Session END — CFL Odds API)

## State
jubilant-bassoon HEAD: f727c04 · Smoke: 509/0 · Unit: 66/0
field-relay-nba HEAD: 981d474
SW_VERSION: 2026-06-05a

## CFL Odds API — SHIPPED ✅

### What was built

**Relay (field-relay-nba 981d474):**
- `handleCFLOddsProbs(env)` — fetches `americanfootball_cfl` from The Odds API
  - Markets: h2h + spreads + totals (2 credits/call)
  - No-vig home/away win probability (CFL has no draw)
  - Returns: `{ok, probs:[{home_team, away_team, commence, pHome, pAway, spread, total, bookmakers}]}`
  - CF edge-cached 2 min
- Route: `GET /cfl/odds-probs` (top-level, NOT inside /wc/ block — bug fixed before shipping)
- Health: `+ cfl-odds` in `/health` response
- Probe allow-list: `/cfl/odds-probs` added for MCP probe_relay_route
- Deployed via field-relay-nba repo push → `deploy.yml` wrangler deploy

**Live probe result (tonight's Week 1 games):**
```
Calgary Stampeders vs Winnipeg Blue Bombers: pHome=0.4722 pAway=0.5278 spread=+1.5 total=47.7 (19 books)
Ottawa Redblacks vs Edmonton Elks: pHome=0.5692 pAway=0.4308 spread=-2.4 total=51.0 (19 books)
```

**Client (jubilant-bassoon f727c04):**
- `fetchCFLOddsProbs()` — async fetch with 2-min client-side cache
- `_cflMatchOdds(game)` — matches game object to odds by team name (normalized, handles reversed home/away)
- Wired into startup `Promise.all([fetchScheduleData(), fetchCFLOddsProbs()])` inside 1500ms race
- `buildTodaySchedule()` attaches `g.wp`, `g._cflSpread`, `g._cflTotal` to each CFL game

### What's NOT done yet
- CFL cards don't yet DISPLAY the spread/total (data attached but no UI render)
- CFL schedule is still hardcoded (2 Week 1 games). Needs weekly update or automation
- No live scores (api.cfl.ca key not obtained)

### relay-worker-deploy.yml lesson
The `jubilant-bassoon/.github/workflows/relay-worker-deploy.yml` workflow
was created during this session as a failed attempt to deploy the bundled worker via CF API.
The correct path is: edit `field-relay-nba/src/index.js` → push → `field-relay-nba` deploy.yml fires.
The relay-worker-deploy.yml in jubilant-bassoon is vestigial — can be deleted.

## Priority List (next session)
1. Delete relay-worker-deploy.yml from jubilant-bassoon (vestigial)
2. CFL card UI: display spread chip (e.g. "WPG -1.5") + O/U total
3. CFL schedule automation (weekly hardcode update or api.cfl.ca key)
4. JQ Gate brand-safe fallback (~60 lines)
5. Drama Dial header chip (~20 lines)

## Key Refs
jubilant-bassoon HEAD: f727c04
field-relay-nba HEAD: 981d474
Smoke: 509/0 · Unit: 66/0
