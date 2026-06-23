# FIELD HANDOFF
## Session: 2026-06-23 · via chat

---

## STAT — Current State

**HEAD: c622d79 · 2026-06-23 · deployed**
Smoke: 213/213 · Active DOs: 115 · Watched: 566 companies

**Completed this session:**
- ✅ wd5 unblock — `WORKDAY_CF_BLOCKED_CLUSTERS` guard removed from `fetchWorkday()`
- ✅ `wd5-recovery-watch.yml` deleted (existed)
- ✅ `wd5-playwright-poll.yml` deleted (existed)
- ✅ DataImpulse audit — no runtime usage in worker (was only in deleted workflows)
- ✅ Deploy succeeded — `CLOUDFLARE_API_TOKEN` was healthy (prior 3s failure cause unclear)
- ✅ Verification: adobe.wd5 = HTTP 200 at all 6 timing variants; jhbmc.wd5 = 422 (tenant maintenance, self-recovers); imh.wd108 = 200 + 4 jobs
- ~88 companies (85 wd5 + 3 wd3) now re-enter normal scan cycle on next platform-DO tick

---

## PRIORITY 1 — Cross-engine viewport tests

**Action:** `workflow_dispatch` both viewport test workflows in the STAT repo:
- iOS Safari viewport test
- Android Chrome viewport test

**Expected:** 10/10 (were 8/10 against stale June 13 build; c622d79 has all S14 UI changes)

---

## PRIORITY 2 — Remaining S14 Items

- [ ] Cross-engine viewport tests (see Priority 1)
- [ ] Apply agent dry-run
- [ ] STAT_PAT Worker secret (verify still set in CF Worker secrets)
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
