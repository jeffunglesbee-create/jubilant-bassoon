# FIELD Handoff — May 28 2026

## HEAD
`7663562` — TYPE C May 28: MLB slate + Peacock GOTD + WCF G6 + Finals home/away fix

## Smoke
224/0 ✅ (structural, node smoke.js index.html)

## Last session
TYPE C — Daily Sports Update May 28 2026
- mlbRaw: Added 6 May 28 games (DET@LAA, CWS@MIN, BOS@ATL, BAL@TOR, PIT@CHC, HOU@TEX)
- HOU@TEX: ESPN GOTD auto-tagged via ESPN_GOTD_SCHEDULE ✓
- CHC@PIT: Peacock GOTD auto-tagged via PEACOCK_GOTD_SCHEDULE ✓
- PEACOCK_GOTD_SCHEDULE: Added week of May 26-Jun 1 (PHI@SDP, STL@MIL, CHC@PIT, TOR@BAL)
- WCF G6 matchupNote: Updated with win probability (SAS 59.9%, OKC 40.1%), corrected Wembanyama context
- NBA Finals G1-G7: Fixed home/away (Western champ hosts G1-G2 G5 G7; NYK hosts G3-G4 G6) — was inverted
- SW_VERSION: 2026-05-28a

## Tonight's games (May 28)
- NBA WCF G6: OKC @ SAS — 8:30pm ET — NBC/Peacock — elimination (SAS 59.9% favored)
- MLB HOU@TEX: 8:05pm ET — ESPN App GOTD
- MLB CHC@PIT: 6:40pm ET — Peacock GOTD

## TIER 0 — DO FIRST NEXT SESSION
1. BNI Patent Fix (~15 min) — lines 16458-16461, replace preGameScore thresholds with !isScoutsPick()
2. EMBER Patent Fix (~30 min) — replace dramaScore >= threshold with isLateCloseGame()
3. NBA Finals G1 Shell TYPE A — update venue/team when WCF concludes TONIGHT (June 3 deadline)
   - OKC wins: Paycom Center, Oklahoma City OK (G1 Jun 3)
   - SAS wins: Frost Bank Center, San Antonio TX (G1 Jun 3)
4. NHL Stanley Cup Final shell — add after ECF G5 concludes (May 29, VGK vs CAR or MTL)
5. World Cup 2026 — JUNE 11 DEADLINE

## Watch tonight
WCF G6 result will determine:
- NBA Finals G1 venue (update home team from "TBD — Western Champion" to OKC or SAS)
- If SAS wins: G7 May 30, add to schedule

## Canonical docs
- CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
- Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
- Master Feature Priority: 1k2pq5dB6pKeegBzVBo1ee-Xo98-Qri5aq-2WqMg_suU

## Repo
jeffunglesbee-create/jubilant-bassoon
PAT: [PAT-in-memory-only] (exp May 2027)
