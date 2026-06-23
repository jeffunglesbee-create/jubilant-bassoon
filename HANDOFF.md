# FIELD HANDOFF
## Session: 2026-06-23 · via chat

---

## STAT — Current State

**HEAD: 1b509c5 · 2026-06-23 · deployed**
Smoke: 213/213 · Active DOs: 115 · Watched: 566 companies

**Completed this session:**
- ✅ wd5 unblock — 88 companies back in scan cycle
- ✅ `wd5-recovery-watch.yml` + `wd5-playwright-poll.yml` deleted
- ✅ DataImpulse: no runtime usage confirmed
- ✅ `fetchWorkday()` warn logging — per-tenant non-200s now visible in CF logs
- ⏭ Viewport auto-trigger — deferred (see Priority 1)

---

## PRIORITY 1 — Viewport auto-trigger follow-up CC

**Blocker:** `smoke.js:152` and `:170` assert `workflow_dispatch only`. Adding
`workflow_run` triggers the assertion. Fix: update both to presence checks, then add trigger.

**CC one-liner:**
```
git pull. Read CLAUDE.md. Read outbox/cc-stat-viewport-warn-2026-06-23.md. Execute all tasks in CC-CMD-2026-06-23-stat-viewport-trigger.md.
```

**What it does:**
1. Updates two smoke assertions from exact-match to presence-check
2. Adds `workflow_run` trigger + job condition to both viewport workflows
3. Runs smoke (expect 213/213)
4. Pushes — CI deploy auto-triggers viewport tests

---

## PRIORITY 2 — Remaining S14 Items

- [ ] Viewport auto-trigger (Priority 1 above)
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
