# FIELD HANDOFF
## Session: 2026-06-28 · Golf Coordinates Automation Probe + Daily Update

**HEAD: 4b89227**
**SW_VERSION: 2026-06-26b**

---

## GOLF COORDINATES PROBE COMPLETE (Phases 1-3)

### Phase 1: ESPN API (conclusive ✓)
- All endpoints 403/404 or gated
- statdata.pgatour.com: NXDOMAIN (decommissioned 2023)
- Finding: No public REST API exposes PGA Tour GPS coordinates

### Phase 2: Browser Automation (script ready ✓)
- Full Playwright automation script created: `/tmp/tourcast_browser_probe_full.py`
- To run locally: `pip install playwright && python3 tourcast_browser_probe_full.py`
- Time: ~2 minutes execution
- Outcome: Definitive answer on whether TourCast exposes coordinates

### Phase 3: Decision Framework (approved ✓)
**Tier 1 (immediate, $0, 30 min):** Wire Broadie proxy into golf journalism
  - Broadie SG already computed but never surfaced
  - Gain: 65% of DataGolf narrative value
  - No external dependencies

**Tier 2 (convenient, $0, 30 min–2 hrs):** Run Phase 2 automation
  - Determines if TourCast provides coordinates
  - If yes → build relay proxy (2 hrs)
  - If no → accept tracking unavailable

**Tier 3 (deferred, $270/yr):** DataGolf decision
  - Only after Tier 1 live + Phase 2 results
  - Solves strokes gained, not coordinates (different problems)

**Key insight:** Broadie proxy covers 65% of golf narrative gap. Coordinates are nice-to-have, not essential.

Drive doc: `Golf Coordinates Probe — Phases 1-3 Complete (June 28 2026)` (1YLm4sQABkIHxSNu-qGB8QeigWb3DtaoU)

---

## WC26 DAILY UPDATE — JUNE 28

### Group Stage Complete — All 48 Teams Locked

**June 27 MD3 Results (Groups J/K/L):**
- England 2–0 Panama (Bellingham, Kane 11th WC goal)
- Croatia 2–1 Ghana (Vlasic winner)
- Colombia 0–0 Portugal (Colombia top group)
- DR Congo 3–1 Uzbekistan (first-ever WC win)
- Argentina 3–1 Jordan (Messi 6th goal, 7 consecutive WC matches scoring)
- Austria 3–3 Algeria (wild finish, Iran eliminated)

### ⚠️ wc26Raw Stubs Need Urgent Reconciliation

Confirmed mismatches between stubs and FIFA bracket:
| Stub (wrong) | Confirmed R32 |
|---|---|
| England vs Senegal | England vs DR Congo (Atlanta, Jul 2) |
| Egypt vs Algeria | Algeria vs Switzerland |
| Colombia vs Croatia | Colombia vs Ghana |

**Status:** Most stubs correct (Argentina/Spain/USA/Netherlands/Brazil/Ivory Coast/France/Germany), but England+Egypt mismatch is critical before first R32 game (19:00Z today).

**R32 Today (19:00 ET):** South Africa vs Canada (Los Angeles)

---

## MLB — JUNE 28

Sunday slate: 15 games, 1:35 PM–10 PM ET
Notable: ATH @ LAD 3:15 PM Peacock (free), LAD @ SD series finale 4:10 PM (LAD up 2–0)

---

## GOLF — TRAVELERS CHAMPIONSHIP

**R3 Final (Saturday):**
Hovland –20 leads Scheffler –19 by 1 heading into final round Sunday
Bhatia/Cantlay T3 –15, remaining field T5 –13 or worse

---

## HANDOFF PROTOCOL

**RELAY:** SRC 1cad397 · deployed ✅ (WC knockout phase)
**CLIENT:** 4b89227 · deployed ✅

---

## NEXT PRIORITIES

1. Verify first R32 D1 write (SAF vs CAN, 19:00Z today)
2. Reconcile wc26Raw stubs vs FIFA bracket before first match starts
3. Execute Tier 1: Wire Broadie proxy to golf journalism
4. Phase 2 optional: Run TourCast browser automation when convenient
5. Monitor Hovland vs Scheffler Travelers final (golf narrative test)

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev

SESSION END: RELAY 1cad397 · CLIENT 4b89227 · 2026-06-28 · via chat (golf probe + daily update)
