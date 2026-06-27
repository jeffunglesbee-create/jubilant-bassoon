# FIELD HANDOFF
## Session: 2026-06-27 · WC26 Knockout Phase + Client Stubs

**HEAD: 5f486f3**
**SW_VERSION: 2026-06-26b**
**Smoke: 762 passed, 0 failed**

---

## RELAY STATE

**RELAY HEAD: e680c9e · 2026-06-27 · docs(outbox) cc-relay-knockout-phase**
**RELAY HEAD SRC: 1cad397 · feat(wc): knockout phase D1 write path — extractWCPhase + r32/r16/qf/sf/final writes · deployed ✅**
**RELAY DEPLOYED: 1cad397 · deploy_match: true · 2026-06-27T01:05:00Z**
**CLIENT HEAD: 5f486f3**

---

## ✅ WC26 KNOCKOUT CONTEXT SHIPPED (2026-06-27)

### Relay: extractWCPhase + knockout D1 writes (1cad397)
- `extractWCPhase(round)` added after `extractWCGroup` — maps ESPN/BSD round strings ("Round of 32", "Quarterfinals", etc.) → phase codes (r32, r16, qf, sf, third, final)
- `writeWCResult` extended: when `extractWCGroup` returns null, tries `extractWCPhase`; if match, writes to `wc_results` with `group_id = phase.toUpperCase()` (satisfies NOT NULL) and `phase = 'r32'` etc.
- Group-stage path unchanged. First activation: South Africa vs Canada, June 28 ~21:00Z
- Odds API confirmed already listing R32 fixtures: South Africa/Canada (Jun 28), Brazil/Japan (Jun 29), Netherlands/Morocco (Jun 30), Ivory Coast/Norway (Jun 30), USA/Bosnia (Jul 2)

### Client: R32+ stubs in wc26Raw (cd46327)
- Added R32×16, R16×8, QF×4, SF×2, 3rd place, Final stubs after group stage entries
- Confirmed R32 matchups sourced from Odds API at execution time; remaining from bracket prob>0.80
- R16/QF/SF use estimated FIFA schedule dates (TBD teams) — update as bracket resolves

### Known gap (non-blocking)
- BracketDO slot mismatch: R32_74 shows Ivory Coast vs South Korea, R32_78 shows Ecuador vs Norway — but Odds API (23+ bookmakers) prices Ivory Coast vs Norway. Indicates WC_R32 slot pairing matrix at L30363 has Group E/I cross-pairing inverted vs actual FIFA predetermined bracket. Monte Carlo projections running on wrong pairings. Fix next session once correct FIFA bracket matrix confirmed.

---

## ✅ API-SPORTS MIGRATION COMPLETE (2026-06-26)

All V2_LEAGUES sports migrated. API-Sports Football Pro: do-not-renew confirmed, already off.

| Sport | Source | Key Commit |
|-------|--------|------------|
| Soccer (12 leagues) | `espn-wc` + BSD | b8a825a |
| MLB | `espn-wc` | e6f5f6e |
| WNBA | `espn-wc` | 62b115f |
| AFL | `espn-wc` + Kali + Squiggle | c1d33f2 + bb25036 |
| NBA | `nba-cdn-empty`/`nba-cdn` | f12e156 |
| NHL | `nhle` | f27026c |
| WC26 | `espn-wc` | b8a825a |

---

## NEW RELAY INFRASTRUCTURE (2026-06-26)

### Kali AFL Stats (/kali/*)
- KALI_AFL_TOKEN in GH secrets + deploy.yml secrets+env
- Endpoints: /predictions, /tips, /standings, /player-stats, /player-stats-advanced, /leaderboards, /head-to-head (params: team_a= team_b=), /teams, /matches
- round join key: ev.week.number (from ESPN AFL scoreboard)
- Quota: 5,000 req/day, resets 00:00 UTC

### NBA CDN (cdn.nba.com)
- adaptNbaCDN() — CDN scoreboard shape (gameStatus 1/2/3, homeTeam.teamTricode)
- Off-season: source=nba-cdn-empty, 0 games, no 502

### NHL NHLE (api-web.nhle.com)
- adaptNhle() — scoreboard gamesByDate shape, clock null-guarded
- Draft whitelist: /v1/draft/picks/now, /v1/draft-tracker/picks/now, /v1/draft/rankings/now + prefixes
- Off-season: source=nhle, 0 games (today not in gamesByDate)

### BSD group_name + weather (WC26)
- Gate fixed: cfg.bsdLeagueId (undefined for wc26) → sport === 'wc26'
- Verified MD3 live: 5/6 games enriched
- round: 'Group I/H/G/J/K/L' ✅, weather: {description, temp, wind} ✅

---

## OPEN INCIDENTS

- Odds Story Materializer — CC-CMD exists (docs/CC-CMD-2026-06-22-odds-story-materializer.md)
- wentToOT hardcoded false in newspaper (needs GameDO/AmbientDO write)
- KV editorial keys not consulted by newspaper endpoint
- nba_clutch + nhl_series R2 stale — heals Oct/Nov with new seasons
- Stale Data Sentinel — CC-CMD exists (unexecuted)
- Smoke regression 724→663 — possibly resolved (CC reported 762 on knockout stubs session; verify)
- NFL SPORT_TO_V2 — September 9 deadline
- session_health phase degradation signal gap
- BracketDO R32 slot mismatch (Group E/I pairing inverted vs FIFA bracket) — see above
- Carry-forwards from June 22

---

## NEXT PRIORITIES

**WC26:**
- Fix BracketDO R32 slot pairing (Group E/I inverted vs FIFA bracket)
- Update R16/QF/SF stub times as FIFA publishes bracket-dependent schedule
- Verify first knockout D1 write fires (South Africa vs Canada Jun 28 ~21:00Z)

**RELAY:**
- NHL draft route (/nhl/v1/draft/picks/now) now whitelisted — wiring optional
- NBA odds/channels endpoints whitelisted but unwired — defer to Oct

**CLIENT:**
- Odds Story Materializer CC-CMD

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

SESSION END: RELAY HEAD SRC 1cad397 · CLIENT HEAD 5f486f3 · 2026-06-27 · via chat
