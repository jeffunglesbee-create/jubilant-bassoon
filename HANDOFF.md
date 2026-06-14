# FIELD HANDOFF

## Current State
- **Client HEAD:** 62e946a (jubilant-bassoon)
- **Relay HEAD:** 6a4d6af (field-relay-nba)
- **Smoke:** 550/0
- **SW_VERSION:** 2026-06-13h
- **Last session:** June 14 2026

## Relay Commits This Session (7)
1. `cdec743` — fix: colon in /journalism/game/ sanitizer (WC brief consumption PIECE 1)
2. `f1eb3f2` — fix: Monte Carlo scoring W=3 D=1 L=0 (was W=3 D=1 L=1 — unreachable branch bug)
3. `ce9fb83` — fix: 3rd-place R32 assignment uses backtracking solver (eliminated bracket placeholders 3rd-AEHIJ, 3rd-DEIJL)
4. `0797be4` — fix: normalizeTeamName on standings copy (USA phantom team — R32 56%→98%)
5. `75ede64` — fix: preemptive aliases for Groups E-L (Turkiye, Curacao, Cote d'Ivoire)
6. `9a8537b` — fix: Korea Republic → South Korea alias
7. `6a4d6af` — ci: post-deploy BracketDO refresh (auto-recompute projections after every deploy)

## Client Commits This Session (1)
1. `428b0fb` — WC brief consumption PIECE 2 (client fetch on game final → matchupNote injection)

## WC Brief Pipeline (Complete End-to-End)
- Write: game final → writeWCResult() → D1 + BracketDO → JOURNALISM_QUEUE → Haiku → quality chain → KV `brief:game:football:{id}` (3600s TTL)
- Read: client V2 poll → detects final → fetch `/journalism/game/{eventId}` → relay sanitizer preserves colon → KV hit → injects matchupNote → render

## Monte Carlo Fixes
- Scoring: W=3 D=1 L=0 (was L=1 due to unreachable ternary branch)
- 3rd-place: backtracking solver with constraint-first ordering replaces greedy-sequential
- Team names: normalizeTeamName() on standings copy prevents phantom teams (USA was duplicated as "USA" + "United States")
- Aliases: 14 variants covering Czech Republic, Bosnia, DR Congo, USA, Turkey/Turkiye, Curacao, Cote d'Ivoire, Korea Republic
- CI: post-deploy auto-refresh of BracketDO projections

## Vision Doc + Live Odds Spec
- Vision document: 1ZEvy5rSQgVM-_m_liiA7lvz0YDc-jYbxJEUPiGOQ_TQ (corrected, all claims verified)
- Corrections: 1Qxi2WlKfZNuGnOJrFZvQGc_ykyy2tJCMFiDcQYdeFDs
- Live odds architecture: live-odds-architecture.md in outputs
- Complete spec (10 gaps closed): live-odds-spec-complete.md in outputs, Drive 17ErKnOlE0Hikq64Lvh8NjNwglEDRyWdyuqPlnTpiMJI
- Key insight: AmbientDO-gated event-driven polling saves 95% credits vs time-based, fits 20K plan with 47-68% headroom
- Comeback detection via peakCollapse (peak WP - current WP)

## Sandbox Network
- api.the-odds-api.com added to allowlist (Jun 14) — live odds testable from sandbox via relay proxy
- field-relay-nba.jeffunglesbee.workers.dev and api.cloudflare.com already enabled (Jun 13)

## WC State
- 8 results recorded (Groups A-D MD1)
- Groups E-L start today (Jun 14)
- Germany vs Ecuador odds now live (was the missing 72nd fixture)
- Knicks won 2026 NBA Championship (4-1 over Spurs, Brunson 45pts G5 Finals MVP)

## Approved Action Items (Pending)
1. NBA brief pipeline extension — extend JOURNALISM_QUEUE to NBA finals/championship games (~90 min)
2. Netherlands vs Japan (4PM ET Jun 14) — first post-fix BracketDO recomputation, verify all fixes hold
3. Live odds BUILD — fully specced, ready to implement

## Priority Queue
- [ ] NBA brief pipeline (approved)
- [ ] Live in-play odds BUILD (fully specced)
- [ ] Temporal polyfill (~90 min)
- [ ] web-push-browser (~120 min)
- [ ] winkNLP JQ Gate pre-filter (~60 min)
- [ ] Viewport artifact v4 (~150 min)
- [ ] Design system BUILD (~110 min)
- [ ] xG model pipeline
- [ ] WC knockout prep (group ends June 27)
- [ ] Wimbledon draw (before July 7)
