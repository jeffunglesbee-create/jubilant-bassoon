# FIELD Handoff — June 12 2026 (WC Calibration + D1 + Bayesian)

**jubilant-bassoon HEAD:** 45997b7 · **relay HEAD:** dff7c34 · **Smoke:** 601/0 · **SW_VERSION:** 2026-06-12b

## What shipped (June 11 PM → June 12 AM)

### Haiku 4.5 session (~10-11 PM ET Jun 11)
- Relay `0a3faf1`: extractWCGroup team-name fallback for api-sports matchday format
- Relay `1c7eec0`: WC projections gaps 1+2+3 — D1-authoritative + live WP injection
- Relay `ec9ab42`: R32 bracket _A/_B participant tracking (both teams per match)
- Relay `413f83b`: All knockout rounds _A/_B (R16, QF, SF, Final)
- Client `d008012`: R32 bracket renders all 32 teams (8 pairs per side)
- Client `10b1522`: All rounds bracket rendering with _A/_B pairs
- Session doc: Drive `1nRWRlhn1yQHS-KSakmLkfsvm2I18qrrLcKdz8Z0stAQ`

### Opus 4.6 session (~11 PM ET Jun 11 → 1 AM ET Jun 12)
- Relay `75be36b`: Germany vs Ecuador odds injection (auto-dedupes when real odds appear Jun 25)
- Relay `ef7a956`: Bracket slot deduplication — no team appears twice per round
- Relay `dff7c34`: **Tier 1 Bayesian strength update** — blends odds priors with D1 match performance (PRIOR_WEIGHT=3)
- Client `394a5c8`: Champion spot → Final as centerpiece with trophy + projected subtitle
- Client `3b2fc15`: teamNick WC national names (Czech Republic→Czechia, Bosnia, Congo)
- Client `edfa467`: Merge D1 standings with WC_TEAMS fallback + Czech Republic→Czechia normalize
- Client `45997b7`: **fetchWCStandings RELAY_BASE fix** — was using /nba prefix (silent 404), now V2_RELAY_BASE
- Session doc: Drive `1_r39omyFuG1g3MYudMAxgctvDXZ-onOg8z8xX8gyyJA`

## D1 status
- wc_results: 2 games (Mexico 2-0 South Africa, South Korea 2-1 Czech Republic)
- wc_group: Group A standings computed correctly
- Pipeline: writeWCResult → recomputeGroupStandings → BracketDO notify — all working

## Prediction model
- Tier 1 (SHIPPED): Bayesian lambda update from D1 results
- Tier 2 (QUEUED): FBRef post-match xG integration
- Tier 3 (QUEUED): State-dependent simulation + venue effects
- Tier 4 (QUEUED): MD3 effective-strength modeling

## Automation milestone
First session to fully automate relay + client deploys from sandbox:
- git push via PAT (github.com accessible)
- Deploy verification via GitHub API (api.github.com accessible)
- Full cycle: push → sleep 25 → API check → confirmed

## Priority queue
1. State transition 6e (~30 lines)
2. Drama spectrum 6f (~60 lines)
3. M5 score ticker fade
4. Wimbledon draw context (before July 7)
5. Design system (~90 min TYPE C)
6. Multiview velocity grid

## Key doc IDs
- Haiku session doc: 1nRWRlhn1yQHS-KSakmLkfsvm2I18qrrLcKdz8Z0stAQ
- Opus session doc: 1_r39omyFuG1g3MYudMAxgctvDXZ-onOg8z8xX8gyyJA
- CI/Deploy Reference: 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
- CBL rev 7: 1aCInXWGnQGK1-gu-TyH8MSd48GDILGiWuQLYyVVvZSU
