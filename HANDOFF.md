# FIELD Handoff — May 27 2026 (Late Session)

HEAD: 12da478 · Smoke: 211/0 · SW_VERSION: 2026-05-27k
Deploy gate: success ✅

## CANONICAL DOCS

Current State:    1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
CI/Deploy Ref:    18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Session Doc:      1RQfeF9AW7JmLPeV5q-PIYWw1KgXVoR_VaQdptOjYrOM
NBA+NHL Spec:     13AGp87M_6FrWwMNi4y0L3rHcrIrqSaU-OvxGEGdzgSo

## NHL WAVE 1 — LIVE (built this session)

Features deployed:
  NHL-B4 Special Teams (PP%, PK%) — getNHLSpecialTeams(abbrev)
  NHL-B2 Possession (SAT%/Corsi)  — satPct field from team/shotshares
  NHL-A1 Goalie Save Quality      — getNHLGoalieProfile(lastName)

Architecture precautions applied:
  - NHL Stats API probed FIRST (nhl-analytics-probe.yml) before any tables
  - Field names confirmed: powerPlayPct, penaltyKillPct, satPct, savePct, lastName
  - Accent normalisation in getNHLAbbrev() — API uses "Montréal", FIELD uses "Montreal"
  - NHL_NAME_TO_ABBREV reverse map (full name → abbrev) built from NHL_ABBREV_MAP
  - nhlAnalyticsInit() sets _homeAbbr/_awayAbbr/_sport at T+4500ms
  - Smoke A207-A210 check field PRESENCE and key CORRECTNESS

Data source: NHL Stats API (api.nhle.com/stats/rest/en/*)
  Probe: outbox/nhl/nhl-analytics-probe-*.json (committed to repo)
  All 16 2026 playoff teams | 19 goalies (GP ≥ 3)

Card badges: [⚡ SPECIAL TEAMS] [🏒 {TEAM} SAT%]
Compound prompt: PP/PK/SAT/goalie context lines via getNHLAnalyticsContext()

## WAVE 2 GAPS (next session)

- NHL-C1 PDO — calculate from team_summary (goalsFor/shots + goalsAgainst/shots)
- NHL-D1 Game Character Predictor — Wave 1 base now done
- NHL-D3 Goalie Matchup Quality — Wave 1 base now done
- GSAX — requires MoneyPuck xG, not in NHL API; savePct used as proxy
- _homeGoalie/_awayGoalie not yet set — goalie badge won't fire until set by relay scores

## COMPLIANCE

GDPR check fixed: C2 consent gate (field_privacy_v1/no-geo). Clean on HEAD.

## TIER 0 — NEXT SESSION

1. NBA Finals G1 shell — JUNE 3 DEADLINE — check WCF G6 result first
2. World Cup 2026 build — JUNE 11 DEADLINE
3. NHL SCF entries — VGK in, ECF G4 result tonight
4. Pitch arsenal column fix (30 min)
5. USPTO provisional — 30-day window from May 26
6. NHL _homeGoalie/_awayGoalie wiring for goalie badge to fire

## SPORT STATE

NBA WCF: OKC leads SAS 3-2. G6 Thu May 28, NBC. CHECK RESULT.
NHL ECF: CAR leads MTL 2-1. G4 tonight. CHECK RESULT.
NHL SCF: VGK confirmed. Opponent = ECF winner.
MLB: Regular season.
