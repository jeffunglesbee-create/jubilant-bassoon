# FIELD Handoff — May 27 2026 (SESSION END)

HEAD: 7aa93a1 · Smoke: 206/0 · SW_VERSION: 2026-05-27h
Deploy gate: success ✅

## CANONICAL DOCS

Current State:    1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
CI/Deploy Ref:    18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Session Doc:      1RQfeF9AW7JmLPeV5q-PIYWw1KgXVoR_VaQdptOjYrOM

## MLB ANALYTICS DOCS

Wave 1 spec (45 metrics):     1EwO-NfG_aBb-6CoOOliuCeCHxbYFfuTBoQrlejM7smM
Novel combos:                  1KrW5KVeMIPyonwUqtp23ExR1LzpK9IFjxzSsAM3FOww
ABS Era metrics:               1muBDYM8-k041qCy_D4rrYkWfj6zeg1cOHqBzraqFTDg
Automation Pipeline Guide:     1cb8WGJF-0QbaQu4jZDw2XgZOxFw6Njxlu-7tGYC7h8g

## NFL DOCS

Master Architecture:           1fGMU1r7y_EJnYpKPqgikUbtZiYZAapuRDViDFuxFCes
EPA Technical Ref:             1-pm-6D_jdNwQIW1suVb1lkAMHUybVfbsTbXyLTZbxyE
Pre-NFL Checklist:             1d35qfaaT8Mr4MMCKDiDIO4fiDTsyOKH4imDaQ4E6rgg
Data Source Eval Log:          1tlm7AnLm0-PfwrBnmActGg9IQJyKBIB5tJ05_SV7ISs
UFL→NFL Adaptation Guide:     1S1OxupHr3TsMx0d1dpnzn0lI1kq6u8GYO5VQ0pb_1LY

## TIER 0 — DO FIRST NEXT SESSION

1. NBA Finals G1 shell — JUNE 3 DEADLINE
   Check WCF G6 result (Thu May 28, OKC @ SAS, NBC). Update series.
   Wire Finals G1: NYK vs [WCF winner], June 3, ABC.

2. World Cup 2026 build — JUNE 11 DEADLINE

3. NHL SCF entries — after ECF concludes
   VGK in SCF (swept COL). CAR leads MTL 2-1, G4 tonight.
   Add SCF entries once opponent confirmed.

4. Pitch arsenal column fix (~30 min)
   Add pitch-arsenal-stats to savant-csv-probe.py, trigger probe,
   read column names, fix script, re-run pipeline.

5. File Regret Risk USPTO provisional — 30-day window from May 26

## PATENT STATUS — ALL TIER 0 ITEMS RESOLVED ✅

Fix 1 — OTW score strip: "COMPELLING · 51" → "COMPELLING"
         composite drama score stripped from display
Fix 2 — BNI: pgScore < 50 → !isScoutsPick(game) boolean gate
Fix 3 — EMBER: isLateCloseGame() created + replaces dramaScore threshold

## MLB WAVE 1 — LIVE

Features: A1 Umpire, A7 Team ABS, G1 Park Factors, C7 Tempo,
          D1 Sprint Speed, B1 Regression Alert, C1 Arsenal
Cards:    park badge + ump watch badge in badge-row
Prompt:   getMLBAnalyticsContext() injects 4 context lines per game
Data:     officials hydration added → _hpUmpire set from MLB Stats API
          _homeAbbr/_awayAbbr now set on all normalized games

## MLB AUTOMATION — 4/5 TABLES LIVE

Pipeline: .github/workflows/mlb-weekly-update.yml (Monday 6am ET)
Live:     team_abs ✅ | expected_stats ✅ | sprint_speed ✅ | pitch_tempo ✅
Broken:   pitch_arsenals ❌ (0 entries — column probe needed)
Umpire:   CF Worker /mlb-umpire-scrape → browser-side (not pipeline)
          Savant hp_umpire HTML → parsed + cached 4h on CF edge

## SPORT STATE

NBA WCF: OKC leads SAS 3-2. G6 Thu May 28 @ Frost Bank, 8:30pm NBC.
         → MUST CHECK RESULT before next session
NBA Finals: NYK confirmed East. G1 June 3, ABC. WCF winner TBD.
NHL WCF:  FINAL — VGK sweeps COL 4-0. VGK in SCF.
NHL ECF:  CAR leads MTL 2-1. G4 Wed May 27 (tonight), 8pm ET TNT.
          → CHECK G4 RESULT at start of next session
UFL:      Week 10 May 29-31 (final regular season). Playoffs June 7-13.
MLB:      Regular season active.

## KEY RELAY ROUTES

/mlb-stats/*        → outbox/mlb/ JSON (TTL 12h) — weekly Savant data
/mlb-umpire-scrape  → CF Worker Savant hp_umpire scraper (TTL 4h)
/nflverse/*         → outbox/nfl/ JSON (TTL 24h) — EPA table + future
/sportradar-ufl/*   → SR trial (expires ~Jun 26)

## WAVE 2 READY WHEN NEEDED

All Wave 1 getter dependencies now exist:
  A9  Challenge Leverage Index  — needs A1 + game state
  A10 Umpire-Pitcher Fit Score  — needs A3 + arsenal
  G4  Game Character Predictor  — needs C1 + G1 + G2
  D4  Steal Threat Composite    — needs D1 + catcher data
