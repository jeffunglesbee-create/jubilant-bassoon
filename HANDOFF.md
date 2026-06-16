# FIELD HANDOFF
## HEAD: c088c91 (client) · 6d28348 (relay) · 2026-06-16 · via chat + CC

### Session Summary (June 16 2026)
Daily update session that escalated into P0 triage. Odds API quota exhausted (19,999/20K), diagnosed as CC self-inflicted bug from earlier today. Pivoted WP bars to Monte Carlo projections. Fixed 4 UI bugs found during live WC coverage. France 3-1 Senegal was the first live test of the full pipeline.

### What Shipped — Relay (field-relay-nba)
- **Odds quota audit** (4ec92e8, 6a02d70, afe7b9c) — F1: KV monthly credit guard (18K hard cap). F2: cacheEverything on fetchSportOddsLive/Historical + skip-on-no-progress for backfill. F3: Starter key fallback on 401/429.
- **Root cause documented** (8183f80) — commit a1c4d74 (today 01:54 UTC) added two helpers missing cacheEverything:true. Dead-hour cron picked same failing date repeatedly at 10× credit cost. Burned ~7K credits in 19 hours.
- **Group I-L projections fix** (5a63ecc) — deriveTeamStrengths falls back to BASE_LAMBDA when oddsProbs empty. computeTournamentProjections synthesizes remaining round-robin from WC_TEAM_CONTEXT.
- **/wc/match-wp endpoint** (2731727, 6d28348) — per-match P(win) from Monte Carlo. Bayesian update from D1 results. FRA vs SEN returned homeWP:0.628 after 3-1 win. 15-min edge cache.

### What Shipped — Client (jubilant-bassoon)
- **Monte Carlo WP fallback** (90f7277) — when _liveOddsWP is absent or stale >5min, fetches /wc/match-wp. Desaturated tint + dashed border + "(proj)" label distinguishes from odds-sourced.
- **P(advance) from projections** (fb31cad) — reads pR32 from /wc/projections via shared _wcProjectionsCache. No second fetch — reuses bracket renderer's existing call.
- **Phantom NBA Finals G6 fix** (4ef63a4) — series-closed guard in nbaGames.reduce(). G5 result updated (NYK 94-90, series 4-1). NHL verified clean.
- **Overlapping slots times** (f1afad5) — findConflicts now buckets by LOCAL hour, detail rows show per-game local start time.
- **Overlapping slots broadcaster** (26201b1) — _bundleLabel prefers resolved streams[0].name over g.nationalBundle.
- **Overlapping slots z-index** (c088c91) — panel detached from .conflict-chip-wrap, mounted to document.body with position:fixed; z-index:9000. _positionDetail() anchors via getBoundingClientRect.

### Smoke & Version
- Smoke: 664/0 (tool reports 601 — known FEATURE_GUARDS artifact, delta=63)
- SW_VERSION: 2026-06-16e (a→b→c→d→e, one bump per functional commit)

### API Rate Limits
- **Odds API:** EXHAUSTED (19,999/20K). Resets June 19. Starter key (500 credits) wired as fallback. Root cause fixed. CC hard credit guard at 18K prevents recurrence.
- **Gemini 3.1 Flash Lite:** RPM 88%, TPM 157% (over limit). Haiku fallback active. Pacing backfill.

### WC Status
- Groups A-H: complete (1 game each). Groups I-L: opening June 16-17.
- France 3-1 Senegal (Group I) — first live test of Monte Carlo WP pipeline.
- Iraq vs Norway, Argentina vs Algeria still to come today.
- Monte Carlo projections now populate for all 48 teams (was 0 for I-L before fix).

### Key Decisions
- Monte Carlo WP as fallback, not replacement. Odds-sourced WP remains primary when SSE healthy.
- Odds API provider research: SharpAPI free tier is pre-match only (bust), OddsPapi free tier is 250 req/month (too small), SportsGameOdds free tier has no WC. Best short-term: bump The Odds API to $59/mo (100K credits) after reset, or ride Starter key + Monte Carlo through June 19.
- The position:fixed + body-mount + _positionDetail() pattern for z-index escapes is reusable for future dropdowns/popovers.

### CC Task Queue
1. ~~P0: Odds API quota audit + fix~~ ✅ DONE
2. **Remove zombie NBA clutch GH Actions workflow** — git rm .github/workflows/nba-clutch-update.yml scripts/nba-clutch-update.py. CLIENT REPO.
3. **Add deploy-trigger guard to CLAUDE.md** — deploy triggers must target outbox/, never src/. BOTH REPOS.
4. **NHL phantom game guard** — mirror NBA series-closed pattern to nhlGames.filter() for future-proofing. CLIENT REPO.
5. Context Graph, relay compound, client compound CC prompts ready (~35 hrs specced)

### Drive Specs (unchanged)
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Backfill Enrichment — 1Zs0fFrokCnd3D7UhTlFFykRgPHAW0_ygqgPSYyedzXI
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
7. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
8. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Hr_xmAYGIMiafRug
9. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SQ0khAp0OrOfU
10. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE
