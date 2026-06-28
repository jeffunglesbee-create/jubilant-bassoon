# FIELD HANDOFF
## Session: 2026-06-28 · Golf Orchestrator Probe + Daily Update + CC-CMDs

**CLIENT HEAD: 4b89227**
**SW_VERSION: 2026-06-26b**

---

## RELAY STATE

**RELAY HEAD SRC: 1cad397 · deployed ✅**
**CLIENT HEAD: 4b89227**

---

## ⚠️ NEXT SESSION: ADD orchestrator.pgatour.com TO EGRESS ALLOWLIST

The PGA Tour GraphQL orchestrator EXISTS (not NXDOMAIN) but is blocked
by sandbox egress proxy. All 403s this session were sandbox, not PGA Tour.

**Action:** Add `orchestrator.pgatour.com` to network egress settings BEFORE
starting next session. Then run:

```
python3 docs/orchestrator-probe.py
```

Script is committed at docs/orchestrator-probe.py (SHA 5433028).
Tests 4 GraphQL queries: Leaderboard, ShotDetails, PlayerShots (with and
without API key). Reports coordinate fields if found.

Known API key: da2-gsrx5bibzbb4njvhl7t37wqyl4 (may have rotated since 2023).
If rotated: extract current x-api-key from pgatour.com DevTools Network tab.

**Domains verified June 28:**
- orchestrator.pgatour.com: EXISTS, blocked by sandbox
- tourcast.pgatour.com: EXISTS, blocked by sandbox
- www.pgatour.com: EXISTS, blocked by sandbox
- statdata.pgatour.com: NXDOMAIN (decommissioned 2023)
- livedata.pgatour.com: NXDOMAIN
- cdn.pgatour.com: NXDOMAIN
- api.pgatour.com: NXDOMAIN

---

## GOLF COORDINATES PROBE — COMPLETE FINDINGS

### Phase 1: ESPN Core API (CONCLUSIVE)
- Traversed 5 nested API levels ($ref lazy-loading)
- Travellers Championship event 401811953 (IN_PROGRESS)
- Competitor object: id, athlete, score, linescores, statistics, movement, earnings
- Athlete object: name, height, weight, DOB, college, headshot, hand
- **NO lat/lon/position/coordinate fields anywhere in ESPN golf API**

### Phase 2: TourCast Browser (SKIPPED — sandbox lacks Playwright binary)
- Manual alternative documented in probe report

### Phase 3: Orchestrator (BLOCKED BY SANDBOX — NOT BY PGA TOUR)
- orchestrator.pgatour.com responds HTTP 403 from sandbox egress proxy
- Parse.bot documents get_player_shots returning GPS coordinates from this endpoint
- shotdetailsv4compressed: NOT referenced in FIELD codebase (confirmed via GitHub search)
- Probe script ready: docs/orchestrator-probe.py

---

## CC-CMDs QUEUED (not yet executed)

### 1. Relay: /journalism/game-lines
Doc: docs/CC-CMD-2026-06-27-relay-game-lines.md
Drive: 13oEW5QJ2VaQa2bVEYBVOWcGkfcooBk9j
One-liner: Read docs/CC-CMD-2026-06-27-relay-game-lines.md and execute it.

### 2. Client: card brief line + buildLiveCardLine
Doc: docs/CC-CMD-2026-06-27-client-card-brief-line.md
Drive: 1tPjm9eZ8mhpsAmb3IKMYhdGV9qW_tB49
One-liner: Read docs/CC-CMD-2026-06-27-client-card-brief-line.md and execute it.
DEPENDENCY: relay CC-CMD must deploy first.

---

## DRIVE DOCS THIS SESSION

| Doc | Drive ID |
|---|---|
| team_form CONTEXT_SOURCE Spec v3 FINAL | 1S---UbRREfhHGFPSvMtwUEtvFX8Mfaig |
| CC-CMD relay /journalism/game-lines | 13oEW5QJ2VaQa2bVEYBVOWcGkfcooBk9j |
| CC-CMD client card brief line | 1tPjm9eZ8mhpsAmb3IKMYhdGV9qW_tB49 |

---

## VERIFIED ARCHIVE_DB STATE

Binding: ARCHIVE_DB (NOT FIELD_ARCHIVE)
regular_season_games: 543 rows
Bosnia fix needed: UPDATE SET home='Bosnia and Herzegovina' WHERE home='Bosnia-Herz'
identity-resolver.js: Bosnia missing from CANONICAL map

---

## WC26 — GROUP STAGE COMPLETE

**June 27 Results:** England 2-0 Panama · Croatia 2-1 Ghana · Colombia 0-0 Portugal · DR Congo 3-1 Uzbekistan · Argentina 3-1 Jordan · Austria 3-3 Algeria

**⚠️ wc26Raw stubs need reconciliation:** England vs DR Congo (not Senegal), Algeria vs Switzerland, Colombia vs Ghana

**R32 TODAY:** South Africa vs Canada, 19:00Z, Los Angeles

---

## GOLF — TRAVELERS CHAMPIONSHIP

Hovland -20 leads Scheffler -19 heading into Sunday final round.

---

## NEXT PRIORITIES

1. Add orchestrator.pgatour.com to egress → run probe → determine coordinates
2. Reconcile wc26Raw stubs vs confirmed FIFA bracket
3. Execute relay CC-CMD: /journalism/game-lines
4. Execute client CC-CMD: card brief line (after relay)
5. Bosnia DB fix + team_form CONTEXT_SOURCE
6. Verify first R32 D1 write (SAF vs CAN)

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29

SESSION END: RELAY 1cad397 · CLIENT 4b89227 · 2026-06-28 · via chat
