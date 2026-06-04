# FIELD HANDOFF — 2026-06-04

## State
HEAD: 69cee53 · SW: 2026-06-04j · Smoke: 432/0

## Tonight / Tomorrow
- **SCF G2**: VGK @ CAR — tonight Jun 4, 8 PM ET, ABC · Lenovo Center
  VGK leads 1-0 (G1: VGK 5-4; Hertl GWG)
- **NBA Finals G2**: NYK @ SAS — tomorrow Jun 5, 8:30 PM ET, ABC
  NYK leads 1-0 (G1: NYK 105-95; Brunson 30pts/13 Q4; Wemby 6-21 FG)

## Shipped This Session

### WC GROUPS/BRACKET TAB (69cee53)
Controls bar: ⚽ Groups / ⚽ Bracket link (wc-nav-link), wcActive-gated.
Only visible June 11–July 19. Sits alongside Desk + Journal.
DOM: #wc-section (back pill + header + #wc-groups + #wc-bracket hidden).
CSS: body.wc-mode full-viewport swap on mobile; co-resident desktop.
  Grid: 1col portrait → 2 landscape phone → 3 iPad → 4 desktop.
  Row states: green border (advance), gold border (maybe 3rd), dimmed (out).
  GF/GA hidden ≤819px.
JS: wcActive, WC_TEAMS (placeholder Groups I–L, fill data flip),
  getWCPhase, toggleWCView, renderWCSection, renderWCGroupsLoading,
  renderWCGroupsEmpty (pre-tournament from WC_TEAMS), renderWCGroups (D1 live),
  buildWCGroupShell, buildWCGroupRow, initWCNav.
Mutual exclusion: journalism-mode dismissed when wc-mode activates + vice versa.
Smoke: A320-A332 (13 assertions) — 432/0.
Spec: Drive 1g0Ne_OOO0eteJ8-GCRNZ4sm5_qey7yqy

### WC D1 GROUP TABLE (038281c / relay 0d9c3ac)
D1 wc2026 (f26669de) live. Schema + relay routes + fetchWCStandings.

### OTHER THIS SESSION
- SW CI sync fix (a81220e)
- Bug fixes: venue dup, stale V2 scores, halftime score, NBA G1
- Specs: MOBILE-INTEL-A v2, Watch Engine v2, WC D1 v2, WC Groups tab

## WC2026 Status (June 11 — 7 days)
DONE: D1 schema + relay routes + ⚽ Groups tab UI
REMAINING:
  1. Data flip (~90 min): 104 WC games in index.html + broadcast chips
     WC_TEAMS Groups I–L (placeholder) must be filled during data flip
  2. R2 WC Team Context (~125 min): 48 JSON files, TYPE A research
  3. F09 REST Countries (~10 min)
  Bracket view (Phase 2): ~June 18-20, same session as Permutations Engine

## Next Session Triggers
- SCF G2 result tonight → update G2 result + G3-G7 series records
- NBA Finals G2 tomorrow → update G2 result + G3-G7 series records
- World Cup data flip — JUNE 11 HARD DEADLINE

## P1 Carry-Forwards
- [ ] WC_TEAMS Groups I–L placeholders — fill during data flip
- [ ] Odds Budget date staleness (2026-05-29)
- [ ] 7th inning stretch callout
- [ ] Final outcome display for low-drama games
- [ ] My Services Install App button (~5 min)
- [ ] meta-description tag (~5 min)
- [ ] iPad CLS LIVE verification

## Canonical Refs
CI/Deploy: Drive 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
Current State: Drive 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
WC Groups tab spec: Drive 1g0Ne_OOO0eteJ8-GCRNZ4sm5_qey7yqy
WC D1 spec: Drive 1HdYpPez7OJx-1DqwkMkUaEAjKk41z7U3
D1 database ID: f26669de-e772-4b56-a6d1-f8fdea08a4d4
