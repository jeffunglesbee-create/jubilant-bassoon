# FIELD Handoff — May 27 2026 (TYPE A Daily Update Complete)

HEAD: 09c58a9 · Smoke: 195/0 · SW_VERSION: 2026-05-27a · File: ~1.09MB
Deploy gate: success ✅

## CANONICAL DOCS — ALL CURRENT

Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
Master Improvement Ranking: 1NAR2XYXC-A-MV0kvLKj9YX0ys1omYUwqw7YcdXstwIU
Master Feature Priority: 1k2pq5dB6pKeegBzVBo1ee-Xo98-Qri5aq-2WqMg_suU
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Build Session List v7.25: 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ

## TIER 0 — DO FIRST

1. BNI patent fix (~15 min) — preGameScore → !isScoutsPick
2. EMBER patent fix (~30 min) — isLateCloseGame() replaces threshold
3. NBA Finals G1 shell (~35 min) — JUNE 3 DEADLINE. NYK confirmed East.
   WCF G6 Thu May 28 (SAS @ OKC, 8:30pm NBC) — update result + wire Finals opponent once WCF done
4. World Cup 2026 build (~90 min) — JUNE 11 DEADLINE.
5. NHL SCF entries — add after ECF concludes (VGK in, CAR leads MTL 2-1, G4 TONIGHT)
6. File Regret Risk USPTO provisional ($320 pro se) — 30-day window from May 26

## TODAY'S UPDATE — WHAT WAS DONE (TYPE A May 27)

NBA:
  WCF G5 marked: OKC 127, SAS 114 (OKC leads 3-2)
    OKC: SGA 32pts (16-17 FT), Caruso 22 off bench, Holmgren 16/11, Hartenstein 12/15
    SAS: Castle 24, Champagnie 22, Wembanyama 20 (4-15 FG, 0/5 3PT, 12-12 FT)
  WCF G6 card added: SAS @ OKC Thu May 28 8:30pm ET, NBC/Peacock (_gameImportance:"elimination")
  ECF confirmed done: NYK sweeps CLE 4-0, Brunson ECF MVP

NHL:
  WCF G4 marked: VGK 2, COL 1 — SWEEP 4-0. Stone game-winner, MacKinnon scoreless.
  VGK advances to SCF. SCF entries to add after ECF done.
  ECF G4 already present (tonight 8pm ET TNT at Bell Centre, CAR @ MTL, CAR leads 2-1)

Soccer:
  UECL Final already in: Crystal Palace vs Rayo Vallecano, 3pm ET today, Leipzig

MLB:
  May 27 slate added (15 games). No national chips — Wed not standard broadcast day.
  ACTION: verify ESPN GOTD + Peacock GOTD at ESPN Press Room / peacocktv.com

smoke.js: A189 updated to 2026-05-27a

## SPORT STATE SNAPSHOT

NBA WCF: OKC leads SAS 3-2. G6 Thu May 28 @ Frost Bank Center, 8:30pm NBC/Peacock.
NBA Finals: NYK vs WCF winner. G1 June 3, ABC. NYK home G1-G2.
NHL WCF: FINAL — VGK sweeps COL 4-0. VGK in SCF.
NHL ECF: CAR leads MTL 2-1. G4 TONIGHT Wed 8pm ET TNT. G5 Fri May 29 @ CAR.
NHL SCF: VGK vs TBD. ~June 2-3 start. Add entries after ECF concludes.
MLB: Regular season. 15 games today.

## ANALYTICS SPECS FROM PRIOR SESSION (no code yet)

Drive docs created (see May 27 TYPE C handoff for IDs):
  MLB Complete Analytics (45 metrics), Novel Combined Metrics, ABS Era
  NBA + NHL Analytics Spec (cross-sport)
  Soccer: Team Fit Index, Dark Arts, Athletic Intelligence, Expected Models beyond xG
  AFL: Advanced Analytics, xMarks + Stoppage Physicality, Kill Quarter

Key decisions:
  "Never perform the final combination" = ANY math op (add/multiply/weight/average)
  Team Fit Index = 4 independent dimensions, never combined
  xFoul/xCard = Game Character Predictors

## ARTIFACT NAMING

CowserWalkoff.jsx → export default function CowserWalkoff
OriolesMagic.jsx → export default function OriolesMagic
