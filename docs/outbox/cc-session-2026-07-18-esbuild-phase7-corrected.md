# CC Session — esbuild Phase 7 (corrected)
**Date:** 2026-07-18
**Scope:** isFeaturedTierGame → src/utils/tier-game.js (MY_TEAMS stays in field.js)
**HEAD progression:** 0e2cc74 → 4506c27 (extraction) → 5894720 (post-CI sync)

## Smoke
- Start: 958/0
- Local dry-run: 958/0 (after A-FTO-2 assertion update)
- CI Deploy gate: success
- Client Live Invariant: success
- Live site post-deploy: 895 (structural extraction only)

## SW_VERSION
Not bumped (structural extraction only, no HTML content change).

## Commits
- `4506c27` — feat: extract isFeaturedTierGame to src/utils/tier-game.js (Phase 7)
  - `src/utils/tier-game.js` (new): `export function isFeaturedTierGame` — reads MY_TEAMS and isScoutsPick as bare globals
  - `src/legacy/field.js`: stub in place; NO import added; MY_TEAMS declaration at L19786 completely untouched (confirmed via real diff)
  - `src/main.js`: `import { isFeaturedTierGame }` + `globalThis.isFeaturedTierGame = isFeaturedTierGame`
  - `smoke.js`: A-FTO-2 updated to read body from src/utils/tier-game.js rather than index.html inline

## TASK 1 — Real confirmation

- `isFeaturedTierGame` confirmed at L6690 in field.js, 8-line body
- `MY_TEAMS` at L19786: `let MY_TEAMS = new Set(...)` — completely untouched by this extraction
- `isScoutsPick` is NOT a globalThis bridge — defined natively in field.js at L5362. Both MY_TEAMS and isScoutsPick are bare globals resolved in IIFE scope. The extracted function reads them the same way — no imports inside the module.
- Zero smoke assertions referenced `isFeaturedTierGame` by name before this session (A-FTO-2 checked the body inline in html — updated as part of TASK 2)
- Call sites: L6835 (`games.filter(isFeaturedTierGame)`) and L6836 (`games.filter(g => !isFeaturedTierGame(g))`)

## TASK 2 — Extraction detail

The stub in field.js (`function isFeaturedTierGame(g){}`) caused A-FTO-2 to fail because the assertion checked the function body content in `index.html` (sync-source version). Fixed by updating A-FTO-2 to read body from `src/utils/tier-game.js` via `require('fs').readFileSync(...)` — same pattern already used for adapter-proof.manifest.json and other side files.

Real diff check confirmed: `let MY_TEAMS = new Set(...)` at L19786 appears in git diff only in the removed line inside the old function body (`if (MY_TEAMS.has(g.home) || MY_TEAMS.has(g.away)) return true;`). The declaration itself and all 39 other references are untouched.

## TASK 3 — Call-site verification + live-state-read correctness

- L6835/L6836: bare identifier calls resolve via `globalThis.isFeaturedTierGame` set in main.js before field.js loads
- Live-state correctness: MY_TEAMS is read at call time as a bare global — not captured at import time. User toggle mutations in field.js scope are immediately visible at next call. No new staleness window introduced vs. pre-extraction behavior.
- isScoutsPick reads correctly: called with `typeof isScoutsPick === 'function'` guard, same as before, resolves from IIFE scope.

## CI Run
- Code Map (L3): success
- Deploy gate (fast smoke): success
- Desktop Chrome Viewport Audit: success
- Smoke Test + Live Verify: success
- Client Live Invariant: success
- Live site: 895 (unchanged)

## esbuild thread summary (Phases 1–7)

23 symbols extracted across 16 modules:
- Phase 3 series (13 modules, 19 functions): golf-format, tier, sport-format, espn-clock, wc-name, national-game, weather, odds, chips, push, rai, nfl, otw
- Phase 5 (wind.js): WX_DIR + cardinalDir
- Phase 6 (venues.js): VENUE_COORDS + isOutdoorVenue + getVenueCoords
- Phase 7 (tier-game.js): isFeaturedTierGame

MY_TEAMS explicitly out of scope — live mutable user preference state, not a static constant.

## Open carry-forwards
None within the esbuild extraction thread. Thread complete.
