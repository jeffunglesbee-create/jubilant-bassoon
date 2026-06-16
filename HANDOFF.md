# FIELD HANDOFF
## HEAD: 028b3de · 2026-06-16 · via chat

### P0: Odds API Quota Exhausted
19,999/20,000 credits used. /wc/odds-probs returns 401. All WP bars show stale data.
Budget analysis (June 14) projected max 53% usage — actual hit 100% in 28 days.
AmbientDO `_fetchLiveOdds()` is burning credits far beyond the designed rate.
Next reset: June 19. Root cause must be fixed before reset or it repeats.
CC spec pushed: `docs/CC-CMD-2026-06-16-odds-quota-audit.md` in both repos.
Starter key (500 credits, 0 used) available as emergency bridge: 8452c3ac6e226ca6eff8b087391d3c76

### STAT Deploy — RESOLVED (092d0ba)

**Actual root cause:** CC wrote shell comment into `src/routes/_utils.js`. esbuild rejected `#`. Fixed via Contents API.

**Prevention:** Deploy triggers must target `outbox/.trigger-deploy`, never `src/` files.

### FIELD Session (June 15-16)

**What Shipped:**
- Cape Verde name fix (7826c38, A613)
- June game archive — 90 games to D1
- Brief archive client+relay (20 call sites, 11 brief types, backfill engine)
- Desktop viewport tests (Chrome + Safari WebDriverIO)
- Close the Loop (temporal context, voice exemplars, /archive/query)
- Event Pipeline (/archive/game, GameDO hook, KV brief capture)
- Odds Layer (schema, snapshot, injection, backfill, dead-hour cron)
- Client Features 1+2 (timeline, broadcast, conflict map, upsets, consensus, corpus, crew)
- Smoke: 664/0, SW_VERSION: 2026-06-15f

### Smoke Tool Artifact — NOT A REGRESSION
MCP `get_smoke_count` reports **601**. Actual runtime is **664/0**. Delta = **63**.
FEATURE_GUARDS forEach-dispatched assertions not matched by tool regex. Constant since June 12. **HANDOFF number is authoritative.** Run `node smoke.js` for ground truth.

### Gemini API Rate Limits (June 16)
- Gemini 3.1 Flash Lite: RPM 88% (3.54K/4K), **TPM 157% (6.27M/4M)**, RPD 66%
- Haiku fallback expected for some briefs during TPM throttle period

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

### CC Task Queue
1. **P0: Odds API quota audit + fix** — spec at `docs/CC-CMD-2026-06-16-odds-quota-audit.md` in both repos. Diagnose _fetchLiveOdds() credit burn, add hard credit guard, fix cooldowns/caching, wire Starter key fallback. RELAY REPO.
2. **Remove zombie NBA clutch GH Actions workflow** — `git rm .github/workflows/nba-clutch-update.yml scripts/nba-clutch-update.py`. CLIENT REPO.
3. **Add deploy-trigger guard to CLAUDE.md** — deploy triggers must target `outbox/`, never `src/`. BOTH REPOS.
4. Context Graph, relay compound, client compound CC prompts ready (~35 hrs specced)
