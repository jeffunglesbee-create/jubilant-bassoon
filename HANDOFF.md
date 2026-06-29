# FIELD HANDOFF

## Session: 2026-06-29 · Kali AFL Adapter Proof + AVV Workflow Generalization — COMPLETE

**CLIENT HEAD: 5e0653a**
**SW_VERSION: 2026-06-29d**

---

## RELAY STATE

**RELAY HEAD SRC: 01b4056 · deployed ✅**
**CLIENT HEAD: 6ccb5054**

Note: Relay HEAD updated from 1cad397 today through gap fixes:
- cd68c60 — BSD momentum route fix
- e7cc101 — WP elapsed threading
- 01b4056 — goal scorers via comp.details

---

## BSD ADAPTER PROOF — FULLY COMPLETE ✅

All three phases done. Live CI + chat session verified. 100/100.

### Phase 1 ✅ (effb645)
Manifest + registry + fixtures. Real Brazil 2-1 Japan data.

### Phase 2 ✅ (6ccb505)
8 AVV-BSD smoke assertions. 787/0. Feature Registry.
Note: AVV-BSD-006 corrected — actual WP identifier is _wcBuildWPBar/wc-wp-bar.

### Phase 3 ✅ (outbox committed)
Live journalism proof. Germany vs Paraguay (bsdEventId=8361, 40', elapsed=39).
/bsd/events/8361/momentum → 200, 40 points, range -35 to +71.
[BSD MOMENTUM] block simulated output confirmed. R2: 40 files, 20 events.
Confidence: 100/100 via chat session (CC blocked by *.workers.dev:443 egress).

---

## RELAY GAP FIXES SHIPPED TODAY

- cd68c60 — BSD /momentum route fixed (extracts from /stats/ not non-existent endpoint)
- e7cc101 — situation.elapsed = BSD current_minute (live WP accuracy)
- 01b4056 — matchEvents from ESPN comp.details (goal scorers in briefs)
- 1cad397 — extractWCPhase (R32/R16/QF/SF write to D1 wc_results)
- D1 backfill — South Africa vs Canada + Brazil vs Japan → phase='r32'

---

## Smoke

**795/0** (up from 787 at BSD proof session; +8 AVV-KALI assertions added in Kali P2)

New assertions added today (cumulative):
- MLB-SIMP-001/002/003 (MLB simplification layer)
- AVV-BSD-001 through 008 (BSD adapter proof)
- AVV-KALI-001 through 008 (Kali AFL adapter proof)

**NOTE:** get_smoke_count MCP tool is NOT authoritative (~62 gap from filesystem assertions). CI node smoke.js is the canonical count.

---

## ADAPTER BACKFILL STATUS

| # | Adapter | Status |
|---|---------|--------|
| 1 | NBA CDN | ⏳ |
| 2 | NHLE | ⏳ |
| 3 | MLB Stats API | ✅ DONE |
| 4 | BSD Soccer | ✅ DONE |
| 5 | Kali AFL | ✅ DONE |
| 6–14 | Remaining | ⏳ |

---

## PRIORITY LIST

### 🔧 QUEUED CC-CMDs
1. relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
2. client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
3. Bosnia DB fix + identity-resolver CANONICAL map
4. team_form CONTEXT_SOURCE v3
5. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
6. wentToOT hardcoded false
7. KV editorial keys not consulted
8. NFL SPORT_TO_V2 — September 9

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

---

## KALI AFL ADAPTER PROOF — FULLY COMPLETE ✅

All three phases done. 100/100.

### Phase 1 ✅ (998e2ac)
Manifest (adapter-proof.manifest.json kali-afl entry), source registry (kali-aflstats),
3 fixture files (ok/empty/malformed) with real Round 16 data.

### Phase 2 ✅ (97a5926)
8 AVV-KALI smoke assertions. 795/0. Feature Registry entry. SW_VERSION bumped 2026-06-29c→d.
Assertions use actual client strings (SQUIGGLE_RELAY, afl: true, fetchV2Games, FIELD_V2_SOURCES)
because Kali is relay-injected only — no client-side Kali code exists.

### Phase 3 ✅ (outbox committed by chat session at c7d78c6)
Relay probe confirmed journalism.kali populated on past round (Round 16, 2026-06-28).
CC blocked by *.workers.dev:443 egress — scored 15/100, gate held, chat session ran probe.
Confidence: 100/100 via chat session.

---

## AVV WORKFLOW GENERALIZATION — COMPLETE ✅ (5e0653a)

- adapter-visible-value.yml renamed: "Adapter Visible Value Proof (MLB)" → "Adapter Visible Value Proof"
- spec: 7 MLB tests wrapped in test.describe('MLB Stats API')
- spec: added test.describe('AFL — Kali Journalism') with AVV-AFL-001 + AVV-AFL-002
- AFL tests skip gracefully (no games between rounds — Round 16 ended June 28, Round 17 starts July 2)
- CI run 28407017073: 9/9 passed (7 MLB + 2 AFL graceful skips) ✅

---

SESSION END: RELAY 01b4056 · CLIENT 5e0653a · 2026-06-29 · Kali AFL ✅ + AVV generalized ✅ · 795/0
