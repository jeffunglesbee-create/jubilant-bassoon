# FIELD Handoff — May 28 2026 (Session End — Smoke Gate Refactor "b")

## Code HEAD
`41f7d6e` — Smoke gate: invariant per-day + relocate snapshot accuracy (bypass-free).
Committed with **NO --no-verify** (the whole point). Rebased onto CI state commit 28fadfe.

## Smoke / gates (all green, no bypass)
- Structural `smoke.js` 235/0 ✅ (added A234 console.log gating). SW_VERSION 2026-05-28c.
- Per-day `field_smoke.js` ✅ 0 failures — now INVARIANTS only (system-clock date, no
  answer-key). CANNOT false-fail. Run: `node field_smoke.js index.html`.
- `field_smoke_daily.js` (NEW) ✅ exit 0 — snapshot accuracy, DAILY-UPDATE workflow only,
  NOT in pre-commit. Run: `node field_smoke_daily.js index.html`.
- units ✅ · eslint 0 errors ✅. Full pre-commit hook ran inside the commit → exit 0.
- The prior handoff's "per-day config STALE at 2026-05-23 → red" warning is RESOLVED:
  that coupling is gone. There is no longer a stale per-day config to sync.

## COMPLETED THIS SESSION
- Redesigned the smoke gate to be permanently bypass-free (Jeff: "do Claude's best
  recommendations, make it readable for Sonnet 4.6, then the safe three").
- field_smoke.js: TODAY_ISO from system clock; removed snapshot consts (NBA_CARDS,
  NBA_HOME_TEAM, NBA_NETWORK, MLB_CARDS, MLB_CHIP_*, NBA_SERIES_ACTIVE, NBA_HYPE_TEST,
  MIN_SPORT_SECTIONS); #4/#5/#6 → well-formedness invariants; #23 → series records
  well-formed (not "must exist"); #25 → structural infra; argv-driven paths (field_utils
  from same dir, was /tmp); removed divergent A55 dup.
- smoke.js: A234 console.log gating (counts UNGATED lines, ≤4; single source of truth).
- index.html: gated 4 production console.log leakers behind FIELD_DEBUG.
- field_smoke_daily.js: new data-source snapshot checker for the daily-update workflow.
- scripts/pre-commit: passes repo index path to argv-driven field_smoke.js.
- STANDARDS.md: Enforcement → three-file model; Rule 32 → "Smoke Gate Architecture
  (2026-05-28) — invariant vs snapshot [ADR]" (CANONICAL reference).
- Safe three done: (1) console.logs gated, (2) A55+console.log deduped into smoke.js,
  (3) argv-driven paths.

## DAILY-UPDATE WORKFLOW — NEW STEP
After updating today's slate: fill `DAILY_EXPECTED` in field_smoke_daily.js (date=today,
verified games {home,away,network}, networks), run `node field_smoke_daily.js index.html`,
require exit 0 before pushing. DO NOT invent matchups. Stale date fails by design.

## ARCHITECTURE NOTE (cross-model HARD rule)
INVARIANT (true of any correct day, no answer-key → safe to block) vs SNAPSHOT (today's
exact slate, needs ground truth → daily workflow). Pre-commit = structural + invariant,
both hard blocks that cannot false-fail. Snapshot accuracy relocated, not weakened.
ADR adopted by Opus 2026-05-28; do not reverse without Jeff's approval.

## FOLLOW-UPS (flagged, NOT done — deliberate)
- A. ~500 lines of structural assertions still duplicated in field_smoke.js (A54/A56/A57,
  24 & 26–32, weather, UFL). Consolidate into smoke.js once each is confirmed covered.
  Not mass-deleted (coverage-loss risk). Gate is already bypass-free without it.
- B. node_modules is TRACKED (~1860 files, via an earlier `git add -A`). Dedicated commit:
  add `node_modules/` to .gitignore + `git rm -r --cached node_modules`.
- C. Drive session/ADR doc could NOT be written this session (Drive API transient errors,
  3 attempts). Canonical ADR is in STANDARDS.md; add the Drive copy next session.
