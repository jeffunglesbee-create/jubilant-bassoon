# FIELD HANDOFF
## Session: 2026-06-23 · via chat

---

## PRIORITY 1 — STAT wd5 Unblock CC (READY TO RUN)

**Status: CC prompt written. Run in Claude Code against the STAT repo.**

**Finding confirmed this session (bash probe from CF datacenter IP):**
- Adobe wd5 → 200 OK, 725 jobs ✅
- NVIDIA wd5 → 200 OK, 2000 jobs ✅
- JHHS wd5 → 422 (tenant maintenance, not cluster block)
- Mayo wd5 → 422 (tenant maintenance)
- wd3 (teleperformance, atos) → 422 (likely maintenance)

**Root cause of S26/S27 "IP block" conclusion:** Those sessions hit during a wd5
cluster-wide maintenance outage. The 422s were maintenance responses, not WAF blocks.

**Impact:** Current deployed worker silently skips ~85 wd5 + 3 wd3 companies (88 total).
Includes JHHS, Mayo, Kaiser, UHG, Cigna, Humana, Duke, CommonSpirit, Vanderbilt, etc.

**CC one-liner:**
```
git pull. Read CLAUDE.md. Execute all tasks in CC-CMD-2026-06-23-stat-wd5-unblock.md.
```

The CC doc is at `docs/CC-CMD-2026-06-23-stat-wd5-unblock.md` in jubilant-bassoon
(already committed). Copy to STAT repo if needed, or paste directly into CC.

**What CC will do:**
1. Remove `WORKDAY_CF_BLOCKED_CLUSTERS` set + guard block from `fetchWorkday()`
2. Delete `wd5-recovery-watch.yml` and `wd5-playwright-poll.yml` if present
3. Audit DataImpulse usage (report only, don't remove without review)
4. Run tests → deploy → verify via `/cxs-get-probe?tenant=adobe&...`

**Note:** CC will also encounter Priority 2 (deploy token likely expired).
The CC prompt includes token-expiry detection and stop-and-report instructions.

---

## PRIORITY 2 — STAT Deploy Broken (expired CF API token)

**Last successful deploy:** June 13 (feat: auto-apply dispatch)
**Two failed deploys:** June 16

**Failure chain:**
- Run 27635810458: `npm ci` failed — lockfile missing webdriverio. Fixed (9d62e6d).
- Run 27637524998: Install ✅, Smoke ✅, Wrangler dry-run ✅, **Deploy ❌ in 3 seconds**

**Root cause:** 3-second wrangler deploy = API-level rejection = expired `CLOUDFLARE_API_TOKEN`.

**Fix:**
1. CF dashboard → My Profile → API Tokens → verify STAT token active
2. If expired: create new "Edit Cloudflare Workers" token scoped to stat-job-watcher
3. Update GitHub secret `CLOUDFLARE_API_TOKEN` in STAT repo → Settings → Secrets
4. Re-run workflow (ID 27637524998) or push any change to trigger CI

**Once deploy lands:**
- Run viewport tests (iOS Safari + Android Chrome workflow_dispatch)
- Expect 10/10 (were 8/10 against stale June 13 build)

**CI logs now accessible:** `results-receiver.actions.githubusercontent.com` is allowlisted.
Pull run 27637524998 logs to confirm token error if needed.

---

## STAT S14 Open Items

- [ ] wd5 unblock CC (Priority 1)
- [ ] Deploy token fix + redeploy (Priority 2)
- [ ] Cross-engine viewport test re-run after deploy
- [ ] Apply agent dry-run
- [ ] STAT_PAT Worker secret (verify still set)
- [ ] Issue #7 partial

---

## FIELD — Current State (unchanged)
CLIENT HEAD: ac83449 · 2026-06-23 · via CC (fetchKeyPlayer L6 email attribution)
RELAY HEAD: c3494a5 · 2026-06-23 · deployed
Smoke: 725/0 · SW_VERSION: 2026-06-23a
A190 structurally enforced (b151efb)
CRITICAL: API-Sports Football Pro renewal JUNE 29
CF account: b57e9af57ab46c52ca9215804e689c29

## Drive Specs
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

## Drive upload outbox
`.github/workflows/drive-upload-outbox.yml` — triggers on `outbox/cc-*.md` pushes
Apps Script bridge · Folder: 0ABxH84VndHL7Uk9PVA

## SESSION START PROTOCOL
Call session_health MCP tool first.
