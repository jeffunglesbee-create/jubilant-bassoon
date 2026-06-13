# FIELD Handoff — June 12 2026 (Evening Session)

**jubilant-bassoon HEAD:** 5a0d3ff · **relay HEAD:** 7062b65 · **Smoke:** 612/0 · **SW_VERSION:** 2026-06-12g

## What shipped this session

### Client (jubilant-bassoon)
- `8eb8ba5`: Compliance check 8 — checks removed functions not generic strings (sportsbook in privacy disclosure was false positive)
- `76588c6`: WC group standings merge — all 4 teams per group even when only some have played. Bosnia name fix.
- `0385295`: WC game cards — Invalid Date (mapV2ToESPN missing start_time) + ALONE ON SCREEN suppressed for post-game
- `04e5398`: WC game cards — buildWCBars suppressed for final, wc-bars-wrap removed on espn-final, Scout's Pick guard works
- `76587e5`: UTC midnight boundary (evening expansion queries tomorrow), isToday filter (removes yesterday's games), live state update (WC section refreshes every poll not just first injection)
- SW_VERSION: 2026-06-12e → 2026-06-12g

### Relay (field-relay-nba)
- `7062b65`: R32 third-place dedup — assignedThirds Set prevents same team appearing in multiple R32 slots. Fixed Ivory Coast 6x and Scotland 2x.

## New permanent rules

### Rule F — Push Notification RUWT Defense
Push notifications are RUWT's central mechanism (compute interest → threshold → notify). The Drama Dial defense breaks with push because the SERVER decides when to send.

Rule F: Push notifications must be FACT-ONLY.
- SAFE: scores, finals, kickoffs, lead changes (factual events)
- NOT SAFE: CRUNCH TIME alerts, drama thresholds, excitement judgments, recommendations

Rules A-E (RUWT), C1-C5 (Rovi), F (Push) — three rule sets for three patent domains.

## Research completed

### 15 Wow Features (refined through 4 rounds)
Each uses a new API or infrastructure. Key items: Headline Intelligence (News API), Attendance Intelligence (Ticketmaster), Live Bracket Pulse (SSE + Monte Carlo), Biometric Correlation (Oura API), Haptic Game Feel (use-haptic).

### browser-use Infrastructure Brief (Drive 1Zq_FD72)
Event-driven browser automation via GitHub Actions → R2 → relay. Highest bracket impact: post-match xG for Bayesian denoising.

### Legality Analysis
FBRef: PROHIBITED (ToS ban + Opta pulled xG data Jan 2026). Clean xG path: soccer_xg (Apache 2.0) — train own model on open data, apply to api-sports shots.

### Highest-Leverage GitHub Find
web-push-browser (MIT): zero-dependency Web Push for Cloudflare Workers. Enables fact-only push notifications from relay. Subject to Rule F.

## Priority queue
1. **Viewport artifact v4** (~120-150 min TYPE D) — after Tuesday reset
2. **Design system BUILD** (~110 min TYPE C) — depends on v4
3. **web-push-browser integration** (~120 min TYPE C) — fact-only notifications, Rule F
4. State transition 6e, Drama spectrum 6f
5. xG model pipeline (soccer_xg + api-sports shots)
6. Wimbledon draw context (before July 7)

## Key Drive docs
- Evening session doc: 10wLrVnWkEgGtCeVSvTfFQBAcSAGekxumIdZ394vQQlc
- Items Catalog: 1lWX2KtRPMNN1e8YfxrCd3aBPNzxOc8k0JAHOzUxprd0
- browser-use Brief: 1Zq_FD72dD16buJVw5odZoteRLMBiN1wR7lrxZFooqns
- v4 Build Brief: 1OZItVH-7beD7wEpizwSie3mb80UtiepHIInGEZh3ALU
- Rovi Clearance: 1ICONs1B_WzfpW562DHEEzhjc2KC8tlnqkbajYrOvctk
- Design System v2: 1Bv2qvn_Gz0qLZatJW9jVsQfMAwE-DyflZNplQyHmCvk
