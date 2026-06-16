# FIELD HANDOFF
## HEAD: 028b3de · 2026-06-16 · via chat

### URGENT — STAT Deploy Failure (blocks cross-engine test verification)

**Status:** STAT Worker last successfully deployed June 13. Two deploy attempts on June 16 failed.

**Root cause chain:**
1. CC added `webdriverio: ^9.0.0` to devDependencies but didn't regenerate `package-lock.json` → `npm ci` failed (lockfile mismatch)
2. Lockfile fix pushed (`9d62e6d`) → `npm ci` now passes
3. Second deploy attempt: Install dependencies ✅, Smoke ✅, Wrangler dry-run ✅, **Deploy to Cloudflare Workers ❌** — failed in 3 seconds
4. 3-second failure = API-level rejection, not code issue. Most likely: `CLOUDFLARE_API_TOKEN` GitHub secret expired or revoked

**To fix:**
1. Cloudflare dashboard → Workers & Pages → API Tokens → verify STAT deploy token is active
2. If expired: create new token with "Edit Cloudflare Workers" permissions, update GitHub secret `CLOUDFLARE_API_TOKEN`
3. Re-run failed workflow (run ID `27637524998`) or push any `src/` change
4. Once deploy succeeds: trigger both `workflow_dispatch` viewport tests (iOS Safari + Android Chrome) — expect 10/10 (were 8/10 due to stale deploy)

**Network allowlist updated this session:**
- Added `results-receiver.actions.githubusercontent.com` (GitHub Actions log downloads)
- Takes effect in NEW conversations only

**STAT S14 summary (from crashed chat):**
- Smoke: 134 → 192 (+58). index.js: 2,785 → 1,107 lines (router extraction)
- Shipped: iCIMS JSON-LD enrichment, apply agent prototype, dispatch UI (⚡ Auto), zero-config API via field-claude-proxy, Claude Code governance (CLAUDE.md, hooks, HANDOFF)
- CC shipped: P1 bug fixes, router extraction, 12 UI enhancements (mobile-first), cross-engine test infra
- Open: deploy verification, cross-engine test re-run, apply agent dry-run, STAT_PAT Worker secret, Workday audit, #7 partial

### FIELD Session (June 15-16) — unchanged from prior HANDOFF

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

### Drive upload outbox
- `.github/workflows/drive-upload-outbox.yml` — triggers on `outbox/cc-*.md` or `outbox/rule59-*.md` pushes
- Apps Script bridge (script.google.com "FIELD documentation" project)
- Folder: `0ABxH84VndHL7Uk9PVA`

### CC Task Queue
1. **Remove zombie NBA clutch GH Actions workflow** — `git rm .github/workflows/nba-clutch-update.yml scripts/nba-clutch-update.py` + commit
2. Context Graph, relay compound, client compound CC prompts ready (~35 hrs specced)
