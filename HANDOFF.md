# FIELD Handoff — May 27 2026 (All Sessions Complete)

HEAD: 1c28b8d · Smoke: 205/0 · SW_VERSION: 2026-05-27d

## CANONICAL DOCS

Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20

## MLB ANALYTICS DOCS (today — read before any MLB work)

Wave 1 spec (45 metrics):         1EwO-NfG_aBb-6CoOOliuCeCHxbYFfuTBoQrlejM7smM
Novel combos:                      1KrW5KVeMIPyonwUqtp23ExR1LzpK9IFjxzSsAM3FOww
ABS Era metrics:                   1muBDYM8-k041qCy_D4rrYkWfj6zeg1cOHqBzraqFTDg
**Automation Pipeline Guide:**     1ICOBRGyoCFdX5pJEu0nqCjb9K4ahlTiOsDWM2rgkGbo ← NEW

## NFL DOCS

Master Architecture:               1fGMU1r7y_EJnYpKPqgikUbtZiYZAapuRDViDFuxFCes
EPA Technical Ref:                 1-pm-6D_jdNwQIW1suVb1lkAMHUybVfbsTbXyLTZbxyE
Pre-NFL Checklist:                 1d35qfaaT8Mr4MMCKDiDIO4fiDTsyOKH4imDaQ4E6rgg
Data Source Eval Log:              1tlm7AnLm0-PfwrBnmActGg9IQJyKBIB5tJ05_SV7ISs
UFL→NFL Adaptation Guide:         1S1OxupHr3TsMx0d1dpnzn0lI1kq6u8GYO5VQ0pb_1LY

## TIER 0 — DO FIRST

1. BNI patent fix (~15 min) — preGameScore → !isScoutsPick
2. EMBER patent fix (~30 min) — isLateCloseGame() replaces threshold
3. NBA Finals G1 shell (~35 min) — JUNE 3 DEADLINE. NYK confirmed East.
   WCF G6 Thu May 28 @ Frost Bank, 8:30pm NBC. Update result + wire Finals.
4. World Cup 2026 build (~90 min) — JUNE 11 DEADLINE
5. NHL SCF entries — add after ECF concludes (VGK in, CAR leads MTL 2-1)
6. Pitch arsenal fix (Step 1 in Automation doc) — probe then 30min fix
7. File Regret Risk USPTO provisional ($320 pro se) — 30-day window from May 26

## TODAY'S MLB WAVE 1 BUILD

### What's live (A200-A205 passing):
- A1  Umpire ABS Rating    — getUmpireABSRating() — [UMP WATCH] badge
- A7  Team Challenge IQ    — getTeamABSRanking()
- G1  Park Factors         — getParkFactor() — [LAUNCH PAD]/[HITTER'S PARK]/[PITCHER'S PARK]
- C7  Pitch Tempo          — getPitchTempo() — [QUICK TEMPO]/[SLOW TEMPO]
- D1  Sprint Speed         — getSprintSpeed() — [BOLT SPEED]/[ELITE SPEED]
- B1  Regression Alert     — getRegressionAlert() — [LUCKY STREAK]/[DUE FOR A HIT]
- C1  Pitch Arsenal        — getPitchArsenal() — J3 Brief arsenal lines
- All wired into compound prompt getMLBAnalyticsContext() and card badges

### Automation pipeline built:
- scripts/mlb-weekly-update.py — downloads 5 Savant CSVs, outputs JSON
- .github/workflows/mlb-weekly-update.yml — schedule Monday 6am ET
- /mlb-stats/* relay route — serves outbox/mlb/*.json (added to field-relay-nba)
- mlbStatsInit() — loads JSON at T+4000ms, patches hardcoded stubs

### Pipeline status (confirmed from CI run):
- team_abs.json:       ✅ 30 teams (KC 60.4%, HOU 59%)
- expected_stats.json: ✅ 362 players (Wood: ba=.276, xba=.283 = unlucky)
- sprint_speed.json:   ✅ 379 players (Witt Jr. 30.5 ft/s #1)
- pitch_tempo.json:    ✅ 351 pitchers (Suter 11.7s Fast)
- pitch_arsenals.json: ❌ 0 entries — column mapping needs probe fix (Step 1)

### What's NOT automated (see Automation Guide doc for steps):
- Umpire ABS: Savant CSV API doesn't expose umpire data. Options:
  A) Find Savant internal JSON endpoint via DevTools (best)
  B) Scrape ESPN ABS tracker table (faster)
  C) Manual Monday update (current fallback, ~10 min)
- Pitch arsenals: column names unknown for pitch-arsenal-stats endpoint
  → Add URL to savant-csv-probe.py, trigger probe, read columns, fix

## RELAY ROUTES (field-relay-nba)

/mlb-stats/*          — NEW, serves outbox/mlb/ JSON (TTL 12h)
/nflverse/*           — serves outbox/nfl/ JSON (TTL 24h)
/sportradar-ufl/*     — SR UFL trial (expires ~Jun 26)
/realtimesports/*     — archived (eliminated source)
/espn-summary/*       — ESPN PBP (pre-existing)
/squiggle/*           — AFL (pre-existing)
/apisports/afl/*      — AFL (pre-existing)

## SPORT STATE

NBA WCF: OKC leads SAS 3-2. G6 Thu May 28 @ Frost Bank, 8:30pm NBC.
NBA Finals: NYK vs WCF winner. G1 June 3, ABC.
NHL WCF: FINAL — VGK sweeps COL 4-0. VGK in SCF.
NHL ECF: CAR leads MTL 2-1. G4 tonight 8pm ET TNT.
UFL: Week 10 May 29-31 (final regular season). Playoffs June 7-13.
MLB: Regular season active. 15 games today.
UECL Final: Crystal Palace vs Rayo Vallecano today 3pm ET.

## WAVE 2 READY (Wave 1 getter deps all exist now)

A9  Challenge Leverage Index — getChallengeContext()   — needs A1 + game state ✅
A10 Umpire-Pitcher Fit       — getUmpirePitcherFit()   — needs A3 + arsenal ✅
D4  Steal Threat Composite   — getStealThreat()        — needs D1 + catcher data
G4  Game Character Predictor — predictGameCharacter()  — needs C1 + G1 + G2 ✅
