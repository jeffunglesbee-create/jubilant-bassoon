# FIELD Handoff — May 26 2026 (FINAL — End of Day)

HEAD: 14ec919 · Smoke: 195/0 · SW_VERSION: 2026-05-26a

## THE DAY IN ONE PARAGRAPH

Two days of RUWT compliance work forced a precise answer to what FIELD can
do freely — and the answer (post-game, L9 territory) produced the Arc Poster,
a fully-built animated drama arc card for the Cowser walk-off game that is the
most shareable, brand-forward thing FIELD has ever built. The compliance work
clarified the IP. The IP was worth more than what the compliance was protecting.

## WHAT WAS BUILT TODAY

1. DA-01 J3 wiring (248916b) — crew context in compound prompt, smoke 195/0
2. TYPE A May 26 daily update (7af78ca) — ECF result, NHL G3, MLB Tuesday
3. Arc Poster prototype — OriolesMagic.jsx + CowserWalkoff.jsx (React, outputs dir)
4. 52 new Wow features specced (#60-111)
5. Patent-safe BNI + EMBER redesigns (specs ready, not yet built)
6. Fish Audio S2 research + recommendation
7. Video animation cost research + recommendation
8. Editorial philosophy: candy/alcohol/PTI synthesis

## WHAT NEEDS BUILDING NEXT (in order)

### IMMEDIATE — Code fixes (patent safety)
1. BNI fix (~15 min) — replace preGameScore thresholds with !isScoutsPick
   See spec: Drive 1WZqRMOx8fCNi-gC0ktBF-wJNFKAP7udiKRFZXXPZmVQ
2. EMBER fix (~30 min) — replace dramaScore threshold with isLateCloseGame()
   Same spec doc. Remove dramaScore from return object + compound prompt.

### IMMEDIATE — TYPE A
3. Check WCF G5 result (SAS @ OKC, was tonight) + NHL WCF G4 (COL @ VGK)
   Update index.html accordingly

### HIGH PRIORITY — Candy first
4. Night Owl Audio #88 (~20 min) — Web Speech API, fastest candy build
5. The Cold Open #83 (~30 min) — state-triggered cinematic entry sentence
6. Arc Poster → Night Owl integration (~60 min) — wire CowserWalkoff into product

### HIGH PRIORITY — PTI voice
7. Five-Topic Brief #102 (~35 min) — restructure J3 to numbered format
8. The Mute #105 (~15 min) — 🔇 chip on BNI maximum, one per night
9. The Fast Verdict #109 (~25 min) — 1-3 sentence game assessment in J3

### MEDIUM PRIORITY — L9 IP staking
10. Season Drama Leaderboard #60 (~45 min) — first commercial L9 asset
11. The Big Finish Question #108 (~20 min) — one question at end of Night Owl
12. Game Personality Types #80 (~40 min) — arc shape classifier

### PATENT / LEGAL
13. File Regret Risk provisional at USPTO ($320, pro se, 30-day window)
14. Contact Mark Phillip on LinkedIn (month 4, after commercial demo is ready)

## ARC POSTER NAMING CONVENTION
  File: OriolesMagic.jsx · Export: OriolesMagic (template)
  File: CowserWalkoff.jsx · Export: CowserWalkoff (first game)
  Future: GameNameHere.jsx → export default function GameNameHere
  Revisions: str_replace on existing file (not full rewrite)
  Reason: Chrome tracks artifact by filename + export name

## EDITORIAL STANDARD (THE WARMTH)
  Every sentence must pass: "Does this sound like someone who loves the sport?"
  PTI over First Take. Accountability over heat. Agreement over argument.
  Fast. Structured. Warm. Willing to be wrong.

## KEY DRIVE DOCS

Session Docs:
  Part 1: 1dwtipzpZn_Eoee8_XoF3L_7ligGc3tlzSwmy6lqMTr4
  Part 2: 1223UzpAvrRUI85E50tThewrXqVVX2qLpM8-VRXgjr2M
  Part 3: 1lCkDf3snN1d3eY_KpMZucFUef2Vr9LyXfwVqtejMmQI
  Part 4: 15LYxD3B3pxGiIWCvpHvnNBFlKh3Dr01sZEN3XeMXMD0

Wow Features:
  #40-59 (Practical/Post-game): 1YVIARGmi3Qmt_G9X3euBS3Bs-RUP9IK3n_ju0ftQMgE
  #60-79 (Leverage/Defensive): 1bd3wTF8Lrjkqv3laoBqu4dwah291I_gD4-bLTtfEQXg
  #80-91 (Candy): 15rE0seTYEfvX_4ndfGrQOeQOs_McnAFIXT1DtJHSlWg
  #92-101 (Alcohol): 1EM1CZPcRfbxBwoNjfu7Lt1BSJqavbHVEUjqvh6qQc10
  #102-111 (PTI Synthesis): 1pP-00VvApDwO0jbJyMuRv1mF9IRsxpL8OfNFn6qUbRg

Patent + Strategy:
  Patent-Safe BNI+EMBER: 1WZqRMOx8fCNi-gC0ktBF-wJNFKAP7udiKRFZXXPZmVQ
  Patent Truce Strategy: 18dmSr4-x62Vdp_t5PittiL2gODlaejS88UHFn3dcREU
  RUWT Deep Intelligence: 1mPoXFF64jIzFOS5qe-Mu0O9Vm2UcKGddt2R1jwHbaAA
  Arc Poster Build Record: 1u2GYU-5okrLZC5sACufzNlsCdwfpBAJ-yyZGxgqP9cs
  CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
  Daily Update Ref: 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E
