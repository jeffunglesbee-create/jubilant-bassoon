# FIELD HANDOFF
## Session: 2026-06-27 · WC26 Knockout Phase + Client Stubs

**HEAD: 4b89227**
**SW_VERSION: 2026-06-26b**
**Smoke: 762 passed, 0 failed**

---

## RELAY STATE

**RELAY HEAD: e680c9e · 2026-06-27 · docs(outbox) cc-relay-knockout-phase**
**RELAY HEAD SRC: 1cad397 · feat(wc): knockout phase D1 write path — extractWCPhase + r32/r16/qf/sf/final writes · deployed ✅**
**RELAY DEPLOYED: 1cad397 · deploy_match: true · 2026-06-27T01:05:00Z**
**CLIENT HEAD: 4b89227**

---

## ✅ WC26 KNOCKOUT CONTEXT SHIPPED (2026-06-27)

### Relay: extractWCPhase + knockout D1 writes (1cad397)
- `extractWCPhase(round)` added after `extractWCGroup` — maps ESPN/BSD round strings ("Round of 32", "Quarterfinals", etc.) → phase codes (r32, r16, qf, sf, third, final)
- `writeWCResult` extended: when `extractWCGroup` returns null, tries `extractWCPhase`; if match, writes to `wc_results` with `group_id = phase.toUpperCase()` (satisfies NOT NULL) and `phase = 'r32'` etc.
- Group-stage path unchanged. First activation: South Africa vs Canada, June 28 ~21:00Z

### Client: R32+ stubs in wc26Raw (ced7622 → 4b89227 codemap)
- 102 total wc26Raw entries: 74 group + 28 knockout (R32×14 + R16×8 + QF×4 + SF×2 + 3rd×1 + Final×1)
- Stubs use `league` field for round identification (e.g. "FIFA World Cup 2026 — Round of 32")
- 14/16 R32 slots named with real teams (Odds API ground truth):

| Slot | Home | Away | Time (UTC) |
|------|------|------|-----------|
| - | South Africa | Canada | Jun 28 19:00Z |
| R32_77 | France | Paraguay | Jun 28 22:00Z |
| R32_79 | Mexico | Germany | Jun 29 01:00Z |
| - | Brazil | Japan | Jun 29 17:00Z |
| - | Netherlands | Morocco | Jun 30 01:00Z |
| - | Ivory Coast | Norway | Jun 30 17:00Z |
| R32_80 | England | Senegal | Jul 1 17:00Z |
| R32_82 | Egypt | Algeria | Jul 1 22:00Z |
| - | United States | Bosnia and Herzegovina | Jul 2 00:00Z |
| R32_83 | Colombia | Croatia | Jul 2 17:00Z |
| R32_84 | Spain | Austria | Jul 3 01:00Z |
| R32_86 | Argentina | Cape Verde | Jul 3 17:00Z |
| R32_87 | Portugal | Ghana | Jul 4 01:00Z |
| R32_88 | Belgium | Australia | Jul 4 17:00Z |

- 2/16 R32 slots omitted (Ecuador's matchup + Switzerland/Sweden — bracket discrepancy, see below)
- R16/QF/SF/3rd/Final: all TBD teams, estimated times

### Known gap: BracketDO R32 slot mismatch (multiple slots)
Odds API (23+ bookmakers) prices matchups that contradict BracketDO slot assignments:
- Odds API: South Africa vs Canada → BracketDO: R32_73 South Africa vs Switzerland
- Odds API: Ivory Coast vs Norway → BracketDO: R32_74 Ivory Coast vs South Korea, R32_78 Ecuador vs Norway
- Implication: WC_R32 slot pairing matrix at client L30363 has multiple cross-group pairings wrong vs actual FIFA predetermined bracket. Ecuador's actual R32 opponent unknown until FIFA bracket matrix confirmed.
- Monte Carlo projections (BracketDO) running on wrong pairings. Fix in next session.

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
- Quota: 5,000 req/day, resets 00:00 UTC

### NBA CDN (cdn.nba.com)
- adaptNbaCDN() — CDN scoreboard shape (gameStatus 1/2/3, homeTeam.teamTricode)
- Off-season: source=nba-cdn-empty, 0 games, no 502

### NHL NHLE (api-web.nhle.com)
- adaptNhle() — scoreboard gamesByDate shape, clock null-guarded
- Draft whitelist: /v1/draft/picks/now, /v1/draft-tracker/picks/now + prefixes
- Off-season: source=nhle, 0 games

### BSD group_name + weather (WC26)
- Gate fixed: cfg.bsdLeagueId → sport === 'wc26', hardcoded league_id=27
- round: 'Group I/H/G/J/K/L' ✅, weather: {description, temp, wind} ✅

---

## OPEN INCIDENTS

- Odds Story Materializer — CC-CMD exists (docs/CC-CMD-2026-06-22-odds-story-materializer.md)
- wentToOT hardcoded false in newspaper (needs GameDO/AmbientDO write)
- KV editorial keys not consulted by newspaper endpoint
- nba_clutch + nhl_series R2 stale — heals Oct/Nov
- Stale Data Sentinel — CC-CMD exists (unexecuted)
- Smoke regression 724→663 — resolved (762 on ced7622; verify persists)
- NFL SPORT_TO_V2 — September 9 deadline
- session_health phase degradation signal gap
- BracketDO R32 slot mismatch (multiple cross-group pairings wrong vs FIFA bracket)
- Carry-forwards from June 22

---

## NEXT PRIORITIES

**WC26:**
- Fix BracketDO R32 slot pairing matrix (multiple slots wrong vs FIFA bracket)
- Add 2 missing R32 stubs once Ecuador's matchup confirmed (post bracket fix)
- Verify first knockout D1 write fires (South Africa vs Canada Jun 28 ~21:00Z)
- Update R16/QF/SF stub times as FIFA publishes schedule

**RELAY:**
- NHL draft route whitelisted — wiring optional
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

SESSION END: RELAY HEAD SRC 1cad397 · CLIENT HEAD 4b89227 · 2026-06-27 · via chat
