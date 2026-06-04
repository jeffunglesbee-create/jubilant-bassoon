# FIELD HANDOFF — 2026-06-04

## State
HEAD: 240ae4e · SW: 2026-06-04h · Smoke: 416/0

## Tonight / Tomorrow
- **SCF G2**: VGK @ CAR — tonight Jun 4, 8 PM ET, ABC · Lenovo Center, Raleigh
  VGK leads 1-0 (G1: VGK 5-4 CAR comeback from 2-0 down; Ehlers scored both CAR goals then VGK rallied; Hertl GWG)
- **NBA Finals G2**: NYK @ SAS — tomorrow Jun 5, 8:30 PM ET, ABC · Frost Bank Center, SA
  NYK leads 1-0 (G1: NYK 105-95; Brunson 30pts/13 Q4; Wemby 6-21 FG; NYK 11-0 closing run)

## Fixes Shipped This Session

### VENUE DUPLICATE (3407cf1)
buildLifeStageContent 'pre' case had venue-name fallback when parts[] was empty.
Injected a .card-stage-content div with venue directly below existing .venue-line from card template.
Fix: removed the venue fallback. .venue-line already handles it.

### STALE V2 SCORES (e7416d3)
api-sports.io indexes US sports by UTC date. June 3 8 PM ET = June 4 UTC — returned as 'final' when querying today's date.
Fix: in fetchV2AllScores, skip any 'final'-state game where fg.start resolves to a different ET date than today.

### HALFTIME WITH SCORE (e7416d3)
Was: bare 'Halftime' label.
Now: sport-specific label + live score (away @ home order).
Basketball: "Half · Knicks 47 – Spurs 52" | Hockey: "2nd Int · CAR 2 – VGK 1"

### NBA FINALS G1 RESULT (240ae4e)
NYK 105-95 SAS. All G1-G7 updated: league strings + seriesRecord → "NYK leads 1-0".
G1 matchupNote: Brunson 30/13 Q4, Wemby 6-21 FG, SAS led 95-94 late, NYK 11-0 closing run.
G2 matchupNote: G1 context + SAS must-protect-home-court stakes.

### CONFIRMED NO-BUILD: Pitching matchup
buildScoutingReport (tap card) already shows pitcher with ERA, W-L, tempo. No card-body build needed.

## P1 Carry-Forwards

- [ ] Post-S-1 iPad CLS LIVE verification
- [ ] PM-26-N-1: C5 morph pattern to #jrn-content
- [ ] PM-26-J-2: per-sport contain-intrinsic-size tuning
- [ ] PM-26-J-3: pulse-effect live verification
- [ ] WPT scroll-mode verification J-1→S-1 stack
- [ ] Odds Budget date staleness (counter shows 2026-05-29)
- [ ] 7th inning stretch callout in 'live' case (situation.inning===7 && isTop===false)
- [ ] Final outcome display for low-drama games (score + F when drama < 50)
- [ ] World Cup 2026 data flip — JUNE 11 HARD DEADLINE

## Next Session Triggers
- SCF G2 result tonight → update G2 result, G3-G7 series records
- NBA Finals G2 result tomorrow → update G2 result, G3-G7 series records
- World Cup flip (June 11) — top priority next session

## Canonical Refs
CI/Deploy: Drive 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
Current State: Drive 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
Build Backlog: Drive 1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk
