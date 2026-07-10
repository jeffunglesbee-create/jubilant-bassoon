# FIELD Current State
> Auto-updated by CI on each successful deploy and by Claude at session end. Commit history = changelog.

**HEAD:** 19a6e08 · **Deployed:** 2026-07-10 · **File:** ~2315KB · **Smoke:** 899/0 · **L3:** 15/15

Drive doc (full narrative): https://docs.google.com/document/d/1ahx6cS_Z5sfjb9sMS2Uqjypgy37xbI3M08PjZOh4G74

---

## What's live

**Schedule + broadcast:** `buildTodaySchedule()`, `resolveGameBroadcast()` (Pipeline B — isFreeOTA, watchUrl, deepLink)  
**Drama intelligence:** `dramaScoreLive()`, `ViewingConditions`, EMBER, BNI, drama arc storage (6 consumer API)  
**Journalism:** J0–J7 all built — FIELD Brief (~200w), Night Owl/Morning Report/Game Recap (~80w)  
**Ambient mode:** 820px two-pane — `ap-card-owl` (purple) / `ap-card-brief` (gold) / `ap-card-arb` (teal)  
**Arbitrage:** `buildArbitrageReport()` — free games tonight + best service to add  
**PWA:** manifest + SW v4 + install prompt + iOS prompt ✅ SW_VERSION current  
**Testing:** L0 smoke (144) · L1 viewport (33) · L2 AI review (4) · L3 browser (15)  
**Betting:** real odds only via relay — probability bars, competitive badges, FIELD vs market  
**OTW:** 5-state banner — FIRE/LIVE/SOON/TONIGHT/QUIET + Watch button (Pipeline B)  
**Section identity:** Surface identifiers at viewport-correct sizes (.88→.80→.75rem). "Coming Up" on Watch Window, "Watch Free Tonight" on arb bar, "Season Context" on context pill.

## Active governance

Rules 1–32 in STANDARDS.md. Key rules:  
Rule 8 (canonical docs, permanent IDs) · Rule 22 (session automation) · Rule 28 (intel-action pairing)  
Rule 29 (viewport style guide, Three Questions Test) · Rule 30 (staleness detection, folder hygiene)  
Rule 31 (two-tier enforcement) · Rule 32 (bypass pressure / enforcement layer assignment)

## Governance enforcement tiers

**Tier A (mechanical — cannot be bypassed):** smoke.js · CI pipeline · GOVERNANCE.json · FIELD-CURRENT-STATE.md  
**Tier B (behavioral — Claude-enforced):** Drive doc updates · session lifecycle · staleness check

## Known gaps

| Gap | Tracked as | Est |
|-----|-----------|-----|
| F16–F20 behavioral tests not built | [LAYER3-EXT] | ~45 min |
| Mobile intelligence layer absent | [MOBILE-INTEL-A] | TBD |
| Architecture Index stale cross-refs | Corrections doc: 1bL8se7cPNmFM9TrdLfZSZzZjq8Nnne2WeAAXiWq0u3w | ~20 min TYPE D |
| Drama line not built | [DRAMA-LINE-A] | ~45 min |

## Canonical doc IDs

See `GOVERNANCE.json` in repo root — machine-readable, checked by smoke.js.
