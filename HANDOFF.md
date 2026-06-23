# FIELD HANDOFF
## Session: 2026-06-23 · via chat

---

## STAT — Current State

**HEAD: 2d18fff · 2026-06-23 · deployed**
Smoke: 213/213 · total: 572 companies · totalMonitored: 628 · batchWatchlist: 56

**Completed this session:**
- ✅ wd5 unblock — 88 companies back in scan cycle
- ✅ fetchWorkday warn logging
- ✅ Viewport auto-trigger wired (workflow_run)
- ✅ STAT_PAT synced to Worker
- ✅ SmartRecruiters adapter built (src/adapters.js)
- ✅ hiringcafe explicit no-op case added to dispatcher
- ✅ Registry +6: Wilshire Group (GH), UMMS (SR), 4 consulting firms (hiringcafe fallback)
- ✅ Registry -23: logistics (12) + e-commerce (7) + insurtech (4) marked inactive
- ✅ Tegria confirmed in registry at config.js:339 as Greenhouse
- ✅ /companies dump completed — full runtime platform map obtained

**Source file layout (CRITICAL for future CC prompts):**
- Adapters: `src/adapters.js`
- Dispatcher: `src/platform-do.js`
- Registry/config: `src/config.js`
- NOT src/index.js — compiled bundle only

---

## PRIORITY 1 — iOS Safari iPad Air (T1) simulator boot failure

**Status:** Persistent — failed both attempts at "Boot simulator" step.
iPhone SE (P1) and iPhone 16 (P2) both passing. Android Chrome: passing.

**Root cause:** iPad Air 11" (M2) simulator not booting on GitHub macOS runner.
Not a code regression — assertions were never reached. Prior manual run passed.

**Fix options:**
1. Replace iPad Air 11" M2 with iPad Air 11" M3 or iPad Pro in the matrix
2. Add `xcrun simctl list devices` step before boot to confirm availability
3. Add retry logic to the boot step

**This is a viewport workflow fix in `.github/workflows/ios-safari-audit.yml`.**

---

## PRIORITY 2 — Four open deferrals from registry audit CC

1. **hiringcafe signature** — `fetchHiringCafe(keyword, environment)` not `(company, env)`.
   Explicit no-op case ships semantically equivalent behavior. True wiring is a follow-up.

2. **4 consulting firms tagged hiringcafe** — sandbox can't reach external HTTP for ATS
   probes. Fix: dispatch `workday-simple-probe.yml` or similar to identify their real ATS
   from CI runner (unrestricted network). Firms: Stoltenberg, Incisive, Evergreen, Anura Connect.

3. **UMMS spot-verify** — SmartRecruiters adapter built but DO inactive. Needs SR probe
   route or bootstrap call. Try: `GET /platform/smartrecruiters/status`

4. **255 silent figure was wrong** — runtime shows 572 total with 38 ATS types,
   many with inactive DOs. Biggest inactive buckets to build adapters for (next session):
   - icims2: 44 companies (largest gap)
   - oraclecloud: 26 companies
   - taleo_careersection: 20 companies
   - ultipro: 16 companies (UKG Pro)
   - inforhcm: 16 companies (may be naming variant of infor_hcm — check)
   - avature: 7 companies
   - dayforce: 6 companies (Ceridian)
   - adp: 6 companies
   - paycom: 5 companies

---

## PRIORITY 3 — Remaining S14 Items

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
