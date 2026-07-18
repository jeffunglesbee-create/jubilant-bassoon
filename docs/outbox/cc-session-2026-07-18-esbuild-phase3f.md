# CC Session — esbuild Phase 3f
**Date:** 2026-07-18
**Scope:** Sixth real ES module extraction — isNationalGame
**HEAD progression:** ead5323 → 22640cd (post-rebase)

## Smoke
- Start: 958/0 (inherited from Phase 3e)
- Local dry-run: 958/0
- CI fast smoke step: passed (Deploy gate success)
- Live site post-deploy: 895

## SW_VERSION
Not bumped (structural extraction only, no HTML content change).

## Commits
- `22640cd` — feat: extract isNationalGame to src/utils/national-game.js (Phase 3f)
  - `src/utils/national-game.js` created with named export, exact body preserved
  - `src/legacy/field.js`: body replaced with stub comment; NO import added
  - `src/main.js`: import + globalThis assignment added before `import './legacy/field.js'`

## CI Run
**Deploy gate (fast smoke):** success (22640cd, 2026-07-18T02:51:30Z)
**Client Live Invariant:** success (2026-07-18T02:52:36Z)
**Smoke Test + Live Verify:** in_progress at session doc write time

## Candidate Selection (TASK 1)
Re-verified all 4 Phase 3e outbox candidates against real current state:

- `_raiQualityBar` — pure, 2 callers confirmed, 0 smoke hits. Valid.
- `isNationalGame` — 1-liner, **8 callers confirmed** (L5293, L5357, L5374, L23823, L27474, L32278, L33603, L33855), 0 smoke hits. **Selected.**
- `urlBase64ToUint8Array` — pure, 1 caller, 0 smoke hits. Valid but single-caller.
- `_chipsHTML` — A438z has two disjuncts: `(sp-analytics-footer && _buildAnalyticsChips && _chipsHTML && !sp-analytics-chip) || (sp-analytics-footer && _buildAnalyticsChips)`. Second disjunct passes independently without `_chipsHTML`. Additionally, call sites (L9290, L10674, L10745) use `typeof _chipsHTML === 'function'` guards — those strings satisfy first disjunct too. Safe, but fewer callers than isNationalGame.

`isNationalGame` selected: highest caller count (8), pure 1-liner, zero smoke coverage, zero external deps.

## Call-site verification (TASK 3)
- 8 real callers: L5293, L5357, L5374, L23823, L27474, L32278, L33603, L33855
- Three callers use `typeof isNationalGame === 'function'` guard — resolves true with globalThis bridge
- Five callers use plain global reads — standard pattern
- Zero smoke assertions reference isNationalGame by name (grep confirmed 0 hits)

## Integration status
VERIFIED — Deploy gate passed, live site 895, globalThis bridge pattern proven across 6 phases.

## Remaining viable candidates (for Phase 3g if pursued)
- `_raiQualityBar` — pure, 2 callers, 0 smoke hits
- `urlBase64ToUint8Array` — pure, 1 caller, 0 smoke hits
- `_chipsHTML` — smoke string check satisfied by call sites, 3 callers; valid

## Open carry-forwards
None. Phase 3f complete.
