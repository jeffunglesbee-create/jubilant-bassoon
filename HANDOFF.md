# FIELD HANDOFF
## HEAD: 0d8beb4 (client) · 6d28348 (relay) · 2026-06-16 · via chat + CC

### Session Summary (June 16 2026)
Daily update → P0 odds triage → Monte Carlo WP pivot → 4 bug fixes → Group H data fix. 9 relay commits + 10 client commits across 4 CC sessions + 1 chat session.

### What Shipped — Relay (field-relay-nba)
- Odds quota audit: KV credit guard 18K cap, cacheEverything fix, Starter key fallback (4ec92e8, 6a02d70, afe7b9c)
- Root cause: a1c4d74 added uncached helpers, dead-hour cron burned ~7K credits in 19hr
- Group I-L projections fallback: BASE_LAMBDA when oddsProbs empty (5a63ecc)
- /wc/match-wp endpoint: Bayesian-updated Monte Carlo WP (2731727, 6d28348)

### What Shipped — Client (jubilant-bassoon)
- Monte Carlo WP fallback: desaturated tint + dashed border + "(proj)" label (90f7277)
- P(advance) from /wc/projections pR32 via shared cache (fb31cad)
- Phantom NBA Finals G6: series-closed guard in nbaGames.reduce() (4ef63a4)
- Overlapping slots times: LOCAL hour bucketing (f1afad5)
- Overlapping slots broadcaster: resolved streams[0].name (26201b1)
- Overlapping slots z-index: body-mounted position:fixed z-index:9000 (c088c91)
- Group H data fix: manual D1 insert KSA 1-1 URU + standings recompute (f7cd4c6)

### Smoke & Version
- Smoke: 664/0 (tool reports 601 — FEATURE_GUARDS artifact, delta=63)
- SW_VERSION: 2026-06-16e

### API Rate Limits
- Odds API: EXHAUSTED (19,999/20K). Resets June 19. Starter key wired. Credit guard at 18K.
- Gemini 3.1 Flash Lite: TPM 157% over limit. Haiku fallback active.

### WC Status — All 8 groups now have complete standings
- Groups A-H: 2 results each, 4 teams each (Group H fixed this session)
- Group I: France 3-1 Senegal (1 result, 2 teams). Iraq vs Norway, Argentina vs Algeria today.
- Groups J-L: opening June 16-17
- Monte Carlo projections now populate all 48 teams

### Carry-Forward (relay)
- Tighten handleV2Games finals filter: accept score-populated fixtures past scheduled end
- Add 30-min post-match-end grace re-poll
- Drop {cache:"no-store"} from runWCTournamentProjections
- When real api-sports ID lands for KSA-URU, drop manual: row and re-recompute
- Remove zombie NBA clutch GH Actions workflow
- Add deploy-trigger guard to CLAUDE.md
- NHL phantom game guard (future-proofing)
- Context Graph, relay compound, client compound (~35 hrs specced)

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
