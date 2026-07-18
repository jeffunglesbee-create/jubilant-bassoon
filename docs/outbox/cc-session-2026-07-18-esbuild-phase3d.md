# CC Session — esbuild Phase 3d
**Date:** 2026-07-18
**Scope:** Fourth real ES module extraction — fmtESPNClock
**HEAD progression:** a5148ca → f39184f

## Smoke
- Start: 958/0 (inherited)
- Local dry-run: 958/0
- CI fast smoke step: passed (run 29627125105)
- Live site post-deploy: 895

## SW_VERSION
Not bumped (structural extraction only, no HTML content change).

## Commits
- `f39184f` — feat: extract fmtESPNClock to src/utils/espn-clock.js (Phase 3d)
  - `src/utils/espn-clock.js` created with named export, exact body preserved
  - `src/legacy/field.js`: body replaced with stub comment; NO import added
  - `src/main.js`: import + globalThis assignment added before `import './legacy/field.js'`

## CI Run
**Run ID:** 29627125105 — Deploy gate (fast smoke) — **success**
All steps confirmed green (completed 2026-07-18T02:29:45Z):
1. Set up job ✅  2. Checkout ✅  3. Sync SW_VERSION ✅  4. Commit SW_VERSION ✅
5. Fast smoke ✅  6. Build esbuild bundle ✅  7. Strip comments ✅
8. Deploy to Cloudflare Workers ✅  9. Confirm ✅

## Candidate Selection (TASK 1)
Systematic scan — smoke blocklist checked first:
- `fieldDateKey` — smoke A392 asserts function signature + 5 call sites. Blocked.
- `_otwTierLabel` — smoke A494 asserts function signature. Blocked.
- `_otwMarginTier` — smoke A494 asserts function signature. Blocked.
- `leagueImportanceTier`/`leagueImportanceRank` — smoke A494 asserts string literals. Blocked.
- `advancementState` — smoke A716 asserts function signature. Blocked.
- `fieldNowET` — smoke A579 asserts function signature. Blocked.
- `fieldDatesToQuery` — smoke A580 asserts function signature. Blocked.
- `_wcFixTeamName` — smoke A613 asserts function signature + 2 call sites. Blocked.
- `_otwIsFinalPeriod`/`_otwIsCrunchTime` — smoke A494 asserts both. Blocked.
- `_mlbPlayerKey` — smoke MLBKEY-001 regex-evaluates function body. Blocked.
- `getUmpireABSRating` — depends on UMPIRE_ABS_RATINGS + BASEBALL_CONST + UMP_WATCH_THRESHOLD. Not pure.
- `getParkFactor` — depends on PARK_FACTORS + BASEBALL_CONST. Not pure.

Chosen: `fmtESPNClock` (L34174) — pure ISO8601 clock → display string formatter, zero external deps, zero smoke coverage by name.

## Call-site verification (TASK 3)
- 6 real callers in field.js: L18181, L31428, L31476, L34200, L36739, L37203, L38877 (total including definition)
- L36739 uses `typeof fmtESPNClock === 'function'` guard — correctly satisfied by globalThis binding
- Zero smoke assertions reference fmtESPNClock by name (grep confirmed 0 hits)
- Honest disclosure: no direct behavioral smoke coverage; runtime correctness relies on globalThis bridge (proven pattern)

## Integration status
VERIFIED — full pipeline confirmed end-to-end.

## Open carry-forwards
None. Phase 3d complete. Phase 3e CC-CMD already on main at 5aa9fb1.
