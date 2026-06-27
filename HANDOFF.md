# FIELD HANDOFF
## Session: 2026-06-26 · API-Sports Migration Complete

---

## RELAY STATE

**RELAY HEAD: 9517ea3 · 2026-06-27 · docs(outbox) cc-nhl-nhle**
**RELAY HEAD SRC: f27026c · feat(nhl): NHLE migration + draft whitelist · deployed ✅**
**RELAY DEPLOYED: f27026c · deploy_match: true · 2026-06-27T00:18:12Z**
**CLIENT HEAD: 410ab94 (unchanged this session)**

---

## ✅ API-SPORTS MIGRATION COMPLETE

All V2_LEAGUES sports migrated. API-Sports Football Pro billing resolved (do-not-renew).

| Sport | Source | Key Commit |
|-------|--------|------------|
| Soccer (12 leagues) | `espn-wc` + BSD | b8a825a |
| MLB | `espn-wc` | e6f5f6e |
| WNBA | `espn-wc` | 62b115f |
| AFL | `espn-wc` + Kali + Squiggle | c1d33f2 + bb25036 |
| NBA | `nba-cdn-empty`/`nba-cdn` | f12e156 |
| NHL | `nhle` | f27026c |
| WC26 | `espn-wc` | b8a825a |

No remaining API-Sports subscriptions in active use.

---

## NEW RELAY INFRASTRUCTURE (2026-06-26)

### Kali AFL Stats (/kali/*)
- KALI_AFL_TOKEN in GH secrets + deploy.yml secrets+env
- Endpoints: /predictions, /tips, /standings, /player-stats, /player-stats-advanced, /leaderboards, /head-to-head (params: team_a= team_b=), /teams, /matches
- AFL game.journalism = { kali: {homeWinPct, factors[], homeBreakdown}, squiggle: {homeConfidence} }
- round join key: ev.week.number (from ESPN AFL scoreboard)
- Quota: 5,000 req/day, resets 00:00 UTC

### NBA CDN (cdn.nba.com)
- adaptNbaCDN() — CDN scoreboard shape (gameStatus 1/2/3, homeTeam.teamTricode)
- nbaGameId field on game objects — 10-digit CDN ID for boxscore/PBP relay
- Brief pipeline: CDN boxscore player stats (no name reversal needed)
- Off-season: source=nba-cdn-empty, 0 games, no 502

### NHL NHLE (api-web.nhle.com)
- adaptNhle() — scoreboard gamesByDate shape, clock null-guarded
- nhleGameId field on game objects — for gamecenter/boxscore/landing/PBP
- Brief pipeline: landing → summary.threeStars (NHL-curated, includes savePctg)
- Draft whitelist: /v1/draft/picks/now, /v1/draft-tracker/picks/now, /v1/draft/rankings/now + prefixes
- Off-season: source=nhle, 0 games (today not in gamesByDate)

### BSD group_name + weather (WC26)
- Gate fixed: cfg.bsdLeagueId (undefined for wc26) → sport === 'wc26'
- URL: hardcoded league_id=27
- Verified MD3 live: 5/6 games enriched (UZB@COD name edge case = graceful)
- round: 'Group I/H/G/J/K/L' ✅, weather: {description, temp, wind} ✅

---

## OPEN INCIDENTS

- Odds Story Materializer — CC-CMD exists (docs/CC-CMD-2026-06-22-odds-story-materializer.md)
- wentToOT hardcoded false in newspaper (needs GameDO/AmbientDO write)
- KV editorial keys not consulted by newspaper endpoint
- nba_clutch + nhl_series R2 stale — heals Oct/Nov with new seasons
- Stale Data Sentinel — CC-CMD exists (unexecuted)
- Smoke regression 724→663 — root cause unknown
- NFL SPORT_TO_V2 — September 9 deadline
- session_health phase degradation signal gap
- Carry-forwards from June 22

---

## NEXT PRIORITIES

**RELAY:**
- NHL draft route (/nhl/v1/draft/picks/now) now whitelisted — wiring optional
- NBA odds/channels endpoints whitelisted but unwired — defer to Oct
- WC26 knockout bracket updates (MD3 complete tonight)
- Smoke regression investigation (724→663)

**CLIENT:**
- Odds Story Materializer CC-CMD
- WC26 MD3 results + bracket state

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Drive FIELD folder: 0ABxH84VndHL7Uk9PVA
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- KALI_AFL_TOKEN: see GH secrets (DO NOT log in HANDOFF)

## SESSION START PROTOCOL — Rule 85

L2: tool_search("FIELD Handoff session health") + tool_search("codex commit write source")
L3: curl CODE_MAP.json check

## STAT
HEAD: 2d18fff · 572 companies · smoke 213/213

SESSION END: RELAY HEAD f27026c · 2026-06-27 · via chat
