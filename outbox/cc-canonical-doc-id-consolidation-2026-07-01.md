# CC Outbox — Canonical Doc ID Consolidation

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-canonical-doc-id-consolidation.md
**Commit:** (see below)
**Smoke:** 813/0

---

## Pre-build probe results

**STANDARDS.md old IDs found:**
- `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA` (old FIELD Current State): 5 occurrences — lines 27, 47, 117, 307, 2229
- `1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E` (old Daily Update Reference): 3 occurrences — lines 49, 118, 388

**GOVERNANCE.json state before:**
- `"FIELD Current State"` → id `1QD3P9eG2pSdabNTMPZYHwaMc1DawmmKpRVrv0ZqQdVs`, last_verified 2026-05-22
- `"Daily Update Reference"` → id `1n4fiAaU1uF2X7EKRx9Gm6XpuR6wkpwoa`, last_verified 2026-05-22

Note: the Daily Update Reference entry ALREADY existed in GOVERNANCE.json (CC-CMD said "add if missing"). Its previous ID `1n4fiAaU1uF2X7EKRx9Gm6XpuR6wkpwoa` is an additional orphan not mentioned in the CC-CMD — updated to the new v2 ID.

**FIELD-CURRENT-STATE.md:** Drive doc link contained the dead duplicate `1QD3P9eG2p...` (written from the corrupted file's tail in the previous CC-CMD). Updated as a direct dependency of Task 2.

---

## Task 1 — STANDARDS.md replacements

- 5 occurrences of `1GvsfnTH9X...` → `1ahx6cS_Z5sfjb9sMS2Uqjypgy37xbI3M08PjZOh4G74`
- 3 occurrences of `1oSHqnDskN...` → `12QY-zSOpWhAbT3VVTxxDXt7mvIhQ5HwQW5VhJHoPUXw`
- Verified: `grep -c` → 0 old IDs remaining

## Task 2 — GOVERNANCE.json updates

- `"FIELD Current State"` id → `1ahx6cS_Z5sfjb9sMS2Uqjypgy37xbI3M08PjZOh4G74`, last_verified `2026-07-01`
- `"Daily Update Reference"` id → `12QY-zSOpWhAbT3VVTxxDXt7mvIhQ5HwQW5VhJHoPUXw`, last_verified `2026-07-01`

## Task 3 — Verification

```
0  old IDs remaining in STANDARDS.md
── Results: 813 passed, 0 failed ──────────────
  ✅ A141 — GOVERNANCE.json exists in repo root
  ✅ A142 — GOVERNANCE.json is valid JSON with canonical_docs array
  ✅ A144 — GOVERNANCE.json canonical doc IDs are non-empty strings
```

---

## Orphaned Drive docs (not deleted — no Drive delete capability)

These IDs no longer appear anywhere in the repo:
- `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA` — old FIELD Current State (kept semi-current, last edit May 25)
- `1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E` — old Daily Update Reference
- `1QD3P9eG2pSdabNTMPZYHwaMc1DawmmKpRVrv0ZqQdVs` — dead duplicate FIELD Current State (created May 22, never modified)
- `1n4fiAaU1uF2X7EKRx9Gm6XpuR6wkpwoa` — previous Daily Update Reference ID that was in GOVERNANCE.json (origin unknown)

Worth manual Drive cleanup at some point. Not blocking.

---

## Done Conditions

- [x] 0 old IDs in STANDARDS.md
- [x] GOVERNANCE.json both entries updated with new IDs + 2026-07-01 last_verified
- [x] FIELD-CURRENT-STATE.md Drive link updated from dead duplicate to new v2
- [x] A141/A142/A144 passing, 813/0 smoke
