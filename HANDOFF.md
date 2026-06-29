# FIELD HANDOFF

## Session: 2026-06-29 · MLB Schedule Simplification — COMPLETE

**CLIENT HEAD: 78c5fd49**
**SW_VERSION: 2026-06-29b**

---

## MLB STATS API — FULL SESSION SUMMARY

### Proven today (8 CC-CMD sessions, all ≥ 85/100 confidence)

| # | What | Confidence | Key result |
|---|------|-----------|------------|
| R1 | Schedule probe | 100/100 | 13 games, broadcast fields |
| R2 | Full endpoint (15) | 100/100 | 12 OK, 3 pre-game |
| R3 | Complete (final gamePk) | 80/100 | game_decisions deprecated |
| C1 | Source verify | 100/100 | 19/19 fields, d→date bug fixed |
| C2 | Client audit | 85/100 | 6/15 consumed, 9 not referenced |
| C3 | Source confirm | 100/100 | DEFINITIVE SOURCE: mlb-stats |
| C4 | _dataSource carry | 100/100 | 776/0, proof system gap closed |
| C5 | Render audit | 100/100 | 19/19 mapped, 5 opportunities |
| C6 | Fetch path audit | — | 4 DIRECT, 3 RELAY |
| C7 | Simplification | 100/100 | 779/0, 3 layers shipped |

### Simplification shipped (bc5ce18)

- parseBroadcasts: `b.isNational` + `apiRsnName` from `b.homeAway` + `freeGame`
- normalizeMLBGame: `isPlayoff` from `gameType`, `startTimeTBD`, `freeGame`, `availableForStreaming`
- fetchMLBStandingsParsed: `magicNumber` + `clinchIndicator` + `eliminationNumber`
- MLB_TEAM_RSN demoted to fallback
- 3 new smoke assertions (MLB-SIMP-001/002/003)

### CC deviations from spec (correct decisions)

- `isPlayoff` re-derive sites NOT removed — multi-sport functions (NHL/NBA/etc), not MLB-only
- `apiRsnName` returned from parseBroadcasts, consumed in normalizeMLBGame (homeAbbr scope)

### Dropbox backup

`index-2026-06-29-mlb-simplify.html` uploaded to Dropbox (run 28387754085, success)

---

## Smoke: 779/0

---

## PRIORITY LIST

### 🔧 QUEUED CC-CMDs
1. Relay: /journalism/game-lines
2. Client: card brief line

### 🔨 INFRASTRUCTURE
3. Bosnia DB fix + identity-resolver CANONICAL map
4. team_form CONTEXT_SOURCE v3
5. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
6. wentToOT hardcoded false
7. KV editorial keys not consulted
8. NFL SPORT_TO_V2 — September 9

### 🏗️ NEXT ADAPTER BACKFILL
NBA CDN → NHLE → Squiggle AFL → ...

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

SESSION END: RELAY 1cad397 · CLIENT 78c5fd49 · 2026-06-29 · MLB SIMPLIFICATION ✅ 779/0 · via chat
