# CC Session — esbuild Phase 3c
**Date:** 2026-07-18
**Scope:** Third real ES module extraction — inferSport + golfRoundLabel
**HEAD progression:** b4dbfd4 → 856d348

## Smoke
- Start: 958/0 (inherited)
- Local dry-run: 958/0
- CI fast smoke step: passed (run 29626880274)
- Live site post-deploy: 895

## SW_VERSION
Not bumped (structural extraction only, no HTML content change).

## Commits
- `856d348` — feat: extract inferSport + golfRoundLabel to src/utils/sport-format.js (Phase 3c)
  - `src/utils/sport-format.js` created with both named exports, exact bodies preserved
  - `src/legacy/field.js`: both bodies replaced with stub comments; NO import added
  - `src/main.js`: import + globalThis assignments added before `import './legacy/field.js'`

## CI Run
**Run ID:** 29626880274 — Deploy gate (fast smoke) — **success**
All steps confirmed green (completed 2026-07-18T02:21:26Z):
1. Set up job ✅  2. Checkout ✅  3. Sync SW_VERSION ✅  4. Commit SW_VERSION ✅
5. Fast smoke ✅  6. Build esbuild bundle ✅  7. Strip comments ✅
8. Deploy to Cloudflare Workers ✅  9. Confirm ✅

## Candidate Selection (TASK 1)
Systematic scan — checked blocklist from smoke.js first, then verified:
- `_briefQualityClassify` — smoke has `/function _briefQualityClassify/.test(html)` regex. Blocked.
- `minutesSinceFinal` — depends on `_bundleFinalizedAt`, `_finalizedAt`, `Date.now()`. Not pure.
- `fmtTime` — depends on `selectedTz` state var + `localTz()`. Not pure.
- `isoToLabel` — depends on `TODAY_ISO` constant. Not pure.
- `localTz` — depends on `FIELD_TZ` constant + smoke A392 asserts about it. Blocked.
- `_gameSport` — smoke A715 asserts `html.includes('function _gameSport(g)')`. Blocked.
- `sportCountLabel` — already rejected (SPORT_META dep).
- `lastNameOf` — smoke SCOUT-ARSENAL-1 asserts `html.includes('function lastNameOf(fullNameOrObj)')`. Blocked.
- `isDomesticLeagueInBreak` — smoke A357 + others assert it. Blocked.
- `parseSeriesRecord` — depends on `teamNick` + `_teamAbbr`. Not self-contained.
- `isCrunchTimeGame` — smoke A236 asserts `html.includes('function isCrunchTimeGame(')`. Blocked.
- `isGrindingGame` — calls `isCrunchTimeGame` internally. Not self-contained without it.

Chosen: `inferSport` (L2644, 1 caller at L2620) + `golfRoundLabel` (L11661, 1 caller at L11711)
Both: pure string/object→string, zero external dependencies, zero smoke coverage by name.

## Call-site verification (TASK 3)
- `inferSport`: 1 real call at L2620 — `const sport = inferSport(league)` — plain global read
- `golfRoundLabel`: 1 real call at L11711 — `const roundLabel = golfRoundLabel(tourn)` — plain global read
- Neither appears in any smoke assertion by name (grep confirmed 0 hits)
- Honest disclosure: no direct behavioral smoke coverage; runtime correctness relies on globalThis bridge (proven pattern)

## Integration status
VERIFIED — full pipeline confirmed end-to-end.

## Open carry-forwards
None. Phase 3c complete. Phase 3d CC-CMD already on main at d899559.
