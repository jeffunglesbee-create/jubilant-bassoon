# FIELD HANDOFF
## HEAD: multiple commits across both repos · 2026-06-16 · via chat + CC

### Session Summary (June 15-16 2026)
Massive infrastructure + architecture session. 36+ CC commits across both repos. Archive intelligence system shipped end-to-end. 10 Drive specs produced. RUWT/MetaBet deep analysis completed.

### What Shipped
- Cape Verde name fix (7826c38, A613)
- June game archive — 90 games to D1
- Brief archive client (d91012e, A614) — 20 call sites, 11 brief types
- Brief archive relay (7 commits) — POST endpoint, cron write, backfill engine
- Backfill enrichment (bb98ba0) — 130 rows
- Relay governance — CLAUDE.md + brief-archive-spec.md
- Desktop viewport tests (6 commits) — Chrome + Safari WebDriverIO
- Close the Loop (4 commits) — /archive/query, temporal context, voice exemplars
- Event Pipeline (4 commits) — /archive/game, GameDO hook, KV brief capture
- Odds Layer (7 commits) — schema, snapshot, injection, backfill, dead-hour cron
- Client Features 1 (5 commits, A615-A617) — timeline, broadcast, conflict map
- Client Features 2 (6 commits, A618-A621) — upsets, consensus, corpus, crew
- Smoke: 664/0, SW_VERSION: 2026-06-15f

### Drive Specs
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

### Key Decisions
- The Debrief = post-game product name (replaces amnesty)
- Circadian = schedule-state-driven, per-sport, not clock
- shouldUnseal(game) = sole disclosure boundary, per-game not per-mode
- Cards never reorder by computed state — chronological + temporal tiers
- Named states only in live DOM; numbers in Debrief only
- Show sporting performance components individually; hide composite (drama)
- Subscription-aware: INCLUDED/FREE/NEEDS_SUB chips, no FOMO
- RUWT/MetaBet: patent requires interest level + notification; FIELD editorial avoids both
- Context Graph = unified game intelligence API

### D1 State
- field-archive: 394+ rows, odds populating, backfill cron active
- wc2026: Groups A-H, I-L opening June 16-17

### Pending
- Context Graph, relay compound, client compound CC prompts ready
- Circadian system specced, not built
- ~35 hours CC work specced across 10 Drive docs

### CC Task Queue
1. **Remove zombie NBA clutch GH Actions workflow** — `git rm .github/workflows/nba-clutch-update.yml scripts/nba-clutch-update.py` + commit. Relay-native replacement shipped June 10 (relay 467b35e, `src/nba-clutch-r2.js`). Workflow still on cron `0 6 */3 6,7 *`, failing every 3 days. Also clean up `outbox/nba/` if present. Single commit, no SW_VERSION bump (no functional change).
