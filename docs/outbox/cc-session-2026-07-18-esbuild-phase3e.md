# CC Session — esbuild Phase 3e
**Date:** 2026-07-18
**Scope:** Fifth real ES module extraction — _normWCName
**HEAD progression:** 0eaedcf → 91b3d6d

## Smoke
- Start: 958/0 (inherited)
- Local dry-run: 958/0
- CI fast smoke step: passed (run 29627340319)
- Live site post-deploy: 895

## SW_VERSION
Not bumped (structural extraction only, no HTML content change).

## Commits
- `91b3d6d` — feat: extract _normWCName to src/utils/wc-name.js (Phase 3e)
  - `src/utils/wc-name.js` created with named export, exact body preserved
  - `src/legacy/field.js`: body replaced with stub comment; NO import added
  - `src/main.js`: import + globalThis assignment added before `import './legacy/field.js'`

## CI Run
**Run ID:** 29627340319 — Deploy gate (fast smoke) — **success**
All steps confirmed green (completed 2026-07-18T02:37:04Z).

## Candidate Selection (TASK 1)
Full systematic scan — smoke blocklist checked first. Additional candidates rejected in this session:

Already extracted (from prior phases): fmtGolfToPar, fieldTierRank, fieldTierLabel, inferSport, golfRoundLabel, fmtESPNClock.

From Phase 3d blocklist (all confirmed again):
- `fieldDateKey`, `_otwTierLabel`, `_otwMarginTier`, `leagueImportanceTier`, `leagueImportanceRank`, `advancementState`, `fieldNowET`, `fieldDatesToQuery`, `_wcFixTeamName`, `_otwIsFinalPeriod`, `_otwIsCrunchTime` — smoke assertions block all
- `_mlbPlayerKey` — smoke MLBKEY-001 regex-evaluates function body
- `getUmpireABSRating`, `getParkFactor` — external constant deps

New candidates evaluated this session:
- `_chipsHTML` — smoke A438z checks `html.includes('_chipsHTML')` (satisfied by call sites); passed as possible. Deprioritized vs _normWCName (fewer callers, not assessed further)
- `urlBase64ToUint8Array` — pure, 1 caller, 0 smoke hits. Valid but single-caller extraction less compelling
- `_raiQualityBar` — pure, 2 callers, 0 smoke hits. Valid
- `isNationalGame` — 1-liner, 8 callers, 0 smoke hits. Valid
- `isBigMarketGame` — depends on `BIG_MARKET_TEAMS` constant. Blocked
- `_normWCName` — **selected**: pure 3-line normalizer, 4 callers, 0 smoke hits, zero external deps

## Call-site verification (TASK 3)
- 4 real callers: L30064, L30107, L30144, L30154 — all plain global reads
- Zero smoke assertions reference _normWCName by name (grep confirmed 0 hits)
- Honest disclosure: no direct behavioral smoke coverage; runtime correctness relies on globalThis bridge (proven pattern)

## Integration status
VERIFIED — full pipeline confirmed end-to-end.

## Remaining viable candidates (for Phase 3f if pursued)
- `_raiQualityBar` — pure, 2 callers, 0 smoke hits
- `isNationalGame` — 1-liner, 8 callers, 0 smoke hits
- `urlBase64ToUint8Array` — pure, 1 caller, 0 smoke hits
- `_chipsHTML` — smoke string check satisfied by call sites, 3 callers; valid

## Open carry-forwards
None. Phase 3e complete.
