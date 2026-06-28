# FIELD HANDOFF
## Session: 2026-06-27 · UI/Architecture + Lacuna Analysis + CC-CMDs

**HEAD: 4b89227**
**SW_VERSION: 2026-06-26b**
**Smoke: 762 passed, 0 failed**

---

## RELAY STATE

**RELAY HEAD: e680c9e · docs(outbox)**
**RELAY HEAD SRC: 1cad397 · feat(wc): knockout phase D1 write path · deployed ✅**
**RELAY DEPLOYED: 1cad397 · deploy_match: true**
**CLIENT HEAD: 4b89227**

---

## ✅ WC26 KNOCKOUT CONTEXT SHIPPED

- relay 1cad397: extractWCPhase + knockout D1 write path live
- client 4b89227: 102 wc26Raw entries (74 group + 28 knockout, R32×14 named)
- First live test: South Africa vs Canada Jun 28 ~21:00Z
- BracketDO R32 slot mismatch (Group E/I pairing inverted) — OPEN

---

## ✅ PITCH MAP FIX

- _bsdOnSSEFrame: accepts data.shots || data.shotmap
- R2 fetch gate: fires when _bsGameAge > 95 min

---

## CC-CMDs QUEUED (not yet executed)

### 1. Relay: /journalism/game-lines
Repo: field-relay-nba
Doc: docs/CC-CMD-2026-06-27-relay-game-lines.md
Drive: 13oEW5QJ2VaQa2bVEYBVOWcGkfcooBk9j
One-liner: Read docs/CC-CMD-2026-06-27-relay-game-lines.md and execute it in the field-relay-nba repo.

### 2. Client: card brief line + buildLiveCardLine
Repo: jubilant-bassoon
Doc: docs/CC-CMD-2026-06-27-client-card-brief-line.md
Drive: 1tPjm9eZ8mhpsAmb3IKMYhdGV9qW_tB49
One-liner: Read docs/CC-CMD-2026-06-27-client-card-brief-line.md and execute it in the jubilant-bassoon repo.
DEPENDENCY: relay CC-CMD must deploy first

---

## VERIFIED ARCHIVE_DB STATE

Binding: ARCHIVE_DB (NOT FIELD_ARCHIVE — does not exist)
regular_season_games: 543 rows (MLB 137, WNBA 49, MLS 273, EPL 26, AFL 16, WC 14, CFL 2)
Bosnia fix needed: UPDATE regular_season_games SET home='Bosnia and Herzegovina' WHERE home='Bosnia-Herz'
identity-resolver.js: Bosnia missing from CANONICAL map

---

## LACUNA ANALYSIS

### Lacuna 1: team_form CONTEXT_SOURCE
Spec v3 in Drive (1S---UbRREfhHGFPSvMtwUEtvFX8Mfaig)
regular_season_games exists, no DDL needed. CC-CMD not yet written.
Bosnia fix is prerequisite.

### Lacuna 2: card brief line + buildLiveCardLine
CC-CMD written, pushed to both repos + Drive. Ready to execute.
Relay CC-CMD must go first.

---

## OPEN INCIDENTS

- BracketDO R32 slot mismatch (Group E/I inverted vs FIFA bracket)
- Bosnia-Herz DB name (1 UPDATE needed)
- Bosnia missing from identity-resolver.js CANONICAL
- Odds Story Materializer — CC-CMD exists unexecuted
- wentToOT hardcoded false in newspaper
- KV editorial keys not consulted by newspaper endpoint
- Stale Data Sentinel — CC-CMD exists unexecuted
- NFL SPORT_TO_V2 — September 9 deadline
- Carry-forwards from June 22

---

## NEXT PRIORITIES

1. Run relay CC-CMD: /journalism/game-lines
2. Run client CC-CMD: card brief line (after relay deploys)
3. Bosnia DB fix + team_form CC-CMD
4. Fix BracketDO R32 slot pairing matrix
5. Verify first knockout D1 write (SAF vs CAN Jun 28 ~21:00Z)

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Drive FIELD folder: 0ABxH84VndHL7Uk9PVA
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29

## SESSION START PROTOCOL — Rule 85

L2: tool_search("FIELD Handoff session health") + tool_search("codex commit write source")
L3: CODE_MAP.json grep

## STAT
HEAD: 2d18fff · 572 companies · smoke 213/213

SESSION END: RELAY 1cad397 · CLIENT 4b89227 · 2026-06-27 · via chat
