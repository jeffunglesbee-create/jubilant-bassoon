# FIELD HANDOFF
## Session: 2026-06-23 · via chat

---

## PRIORITY 1 — STAT wd5 CXS Probe (run first in new session)

**Key finding this session:** S26/S27 conclusion of "wd5 = IP-level block" is likely wrong.
Those sessions tested during a wd5 cluster-wide maintenance outage. The 422s may have been maintenance responses, not WAF blocks.

**Evidence gathered today:**
- Browser probe (Puppeteer from CF Worker IP): Adobe wd5 → 200 OK, 725 jobs. NVIDIA wd5 → 200 OK, 2000 jobs.
- Sandbox bash probe: blocked by egress proxy (not Workday) — `x-deny-reason: host_not_allowed`
- JHBMC + Mayo: still in maintenance outage right now. Cannot test directly.
- `*.wd5.myworkdayjobs.com` added to sandbox allowlist this session — takes effect in NEW conversation only

**First thing in new session — run this bash probe:**
```bash
curl -s -o /tmp/wd5.json -w "%{http_code}" \
  -X POST "https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Referer: https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced" \
  -d '{"appliedFacets":{},"limit":3,"offset":0,"searchText":"engineer"}'
echo ""; cat /tmp/wd5.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'total={d.get(\"total\")}, first={d.get(\"jobPostings\",[{}])[0].get(\"title\",\"?\")}')"
```

**Decision tree:**
- 200 + jobs → wd5 works from datacenter IPs. Write STAT CC prompt to remove cluster-aware routing, drop wd5-playwright-poll.yml, drop DataImpulse for Workday. $19.89/cycle Browser Rendering spend eliminated.
- 403/422 from Workday (not proxy) → try without User-Agent/Referer to isolate header requirement. Then try stealth-fetch (strips cf-* headers).
- Still blocked → DataImpulse confirmed necessary. Move on.

**Then if 200 — test JHBMC (check if maintenance cleared):**
```bash
curl -s -o /tmp/jhbmc.json -w "%{http_code}" \
  -X POST "https://jhhs.wd5.myworkdayjobs.com/wday/cxs/jhhs/JHH_External_Positions/jobs" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Referer: https://jhhs.wd5.myworkdayjobs.com/en-US/JHH_External_Positions" \
  -d '{"appliedFacets":{},"limit":3,"offset":0,"searchText":"epic"}'
echo ""; cat /tmp/jhbmc.json | head -c 300
```

---

## PRIORITY 2 — STAT Deploy Still Broken

**Last successful deploy:** June 13 (commit feat: auto-apply dispatch)
**Two failed deploys:** June 16

**Failure chain resolved:**
- First failure (run 27635810458): `npm ci` failed — lockfile missing webdriverio. Fixed by CC: lockfile regenerated (9d62e6d), pushed.
- Second failure (run 27637524998): Install ✅, Smoke ✅, Wrangler dry-run ✅, **Deploy ❌ in 3 seconds**

**Root cause of second failure:** 3-second wrangler deploy failure = API-level rejection. Almost certainly expired `CLOUDFLARE_API_TOKEN` GitHub secret. Cannot read CI logs from sandbox (results-receiver.actions.githubusercontent.com added to allowlist this session — takes effect in new conversation).

**Fix:**
1. In new session: CI log download should work (`results-receiver.actions.githubusercontent.com` now allowlisted) — pull logs from run 27637524998 to confirm token error
2. CF dashboard → Workers & Pages → API Tokens → verify STAT deploy token active
3. If expired: create new "Edit Cloudflare Workers" token → update GitHub secret `CLOUDFLARE_API_TOKEN`
4. Re-run failed workflow (run ID 27637524998)

**Once deploy lands:**
- Trigger both `workflow_dispatch` viewport tests (iOS Safari + Android Chrome)
- Expect 10/10 (were 8/10 against stale June 13 build)

---

## Allowlist additions (take effect in new conversation only)
- `results-receiver.actions.githubusercontent.com` — GitHub Actions CI log downloads
- `*.wd5.myworkdayjobs.com` — Workday wd5 cluster direct probing

---

## STAT S14 Open Items (from crashed session)
- Deploy verification (see Priority 2 above)
- Cross-engine viewport test re-run after deploy
- Apply agent dry-run
- STAT_PAT Worker secret (verify still set)
- Workday audit
- Issue #7 partial

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
