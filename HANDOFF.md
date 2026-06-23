# FIELD HANDOFF
## Session: 2026-06-23 · via chat

---

## STAT — Current State

**HEAD: ca40c47 · 2026-06-23 · deployed**
Smoke: 213/213 · Active DOs: 115 · Watched: 566 companies

**Completed this session:**
- ✅ wd5 unblock — 88 companies back in scan cycle
- ✅ fetchWorkday warn logging
- ✅ Viewport auto-trigger wired (workflow_run on Deploy STAT worker)
- ✅ STAT_PAT synced to Worker
- ✅ Viewport tests 10/10 (iOS Safari + Android Chrome, manual dispatch confirmed)

---

## PRIORITY 1 — Registry audit + SmartRecruiters adapter CC

**CC one-liner:**
```
git pull. Read CLAUDE.md. Execute all tasks in CC-CMD-2026-06-23-stat-registry-audit.md.
```

**Gaps confirmed pre-CC:**
- `hiringcafe` switch case missing (1 company returns [] instead of routing to fetchHcPage)
- ~255 companies hit `default: return []` — never polled
- Nordic Global + Tegria: keyword-only (fit scoring), NOT company objects
- Missing from registry: The Wilshire Group (Greenhouse), UMMS (SmartRecruiters),
  Stoltenberg, Incisive, Evergreen Healthcare Partners, Anura Connect
- SmartRecruiters: public API (`api.smartrecruiters.com/v1/companies/{token}/postings`),
  no auth, 1856 US companies, UMMS confirmed. Sandbox-blocked but works from CF Worker egress.

**What CC will do:**
1. Fix hiringcafe switch case
2. Build SmartRecruiters adapter + add to switch
3. Add The Wilshire Group (Greenhouse/thewilshiregroup)
4. Add UMMS (SmartRecruiters/UniversityOfMarylandMedicalSystem)
5. Probe and add Nordic Global + Tegria
6. Probe and add Stoltenberg, Incisive, Evergreen, Anura Connect
7. Sample-audit 20 of the 255 silent companies
8. Run tests → deploy → spot-verify UMMS
9. Write outbox manifest

---

## PRIORITY 2 — Remaining S14 Items

- [ ] Registry audit + SR adapter (Priority 1)
- [ ] Apply agent dry-run
- [ ] Issue #7 partial

---

## FIELD — Current State (unchanged)
CLIENT HEAD: ac83449 · 2026-06-23 · via CC
RELAY HEAD: c3494a5 · 2026-06-23 · deployed
Smoke: 725/0 · SW_VERSION: 2026-06-23a
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
