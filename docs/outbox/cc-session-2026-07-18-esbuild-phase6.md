# CC Session — esbuild Phase 6
**Date:** 2026-07-18
**Scope:** VENUE_COORDS + isOutdoorVenue + getVenueCoords → src/utils/venues.js
**HEAD progression:** f772e66 → f98747d (pre-sync) → 27fcae1 (post-codemap sync)

## Smoke
- Start: 957/1 (A704 HANDOFF.md missing required fields — fixed in this session)
- After fix: 958/0
- Local dry-run: 958/0
- CI Deploy gate: success (Smoke Test + Live Verify passed)
- Live site post-deploy: 895 (structural extraction only)

## SW_VERSION
Not bumped (structural extraction only, no HTML content change).

## Commits
- `f98747d` — feat: extract VENUE_COORDS + isOutdoorVenue + getVenueCoords to src/utils/venues.js (Phase 6)
  - `src/utils/venues.js` (new): `export const VENUE_COORDS` + `export function isOutdoorVenue` + `export function getVenueCoords`
  - `src/legacy/field.js`: VENUE_COORDS stub + both function stubs; NO import added
  - `src/main.js`: `import { VENUE_COORDS, isOutdoorVenue, getVenueCoords }` + three globalThis assignments
  - `HANDOFF.md`: added HEAD/Smoke/SW fields (fixed A704)

## TASK 1 — Real confirmation of scope

- `VENUE_COORDS` at L10850 in field.js (pre-extraction), 6 total references
  - L10850: definition; L11002: comment; L11058/11059/11070/11071: inside isOutdoorVenue + getVenueCoords bodies
  - No bare-identifier callers outside the two functions
- `isOutdoorVenue` at L11056, `getVenueCoords` at L11068
- The two functions do NOT call each other — independent consumers of VENUE_COORDS
- Call sites: L11209, L11210, L11244, L11245 (all inside field.js, resolve via globalThis bridge)
- Zero smoke assertions reference VENUE_COORDS, isOutdoorVenue, or getVenueCoords by name (grep confirmed 0 hits)
- Pre-session smoke failure: A704 (HANDOFF.md missing HEAD/Smoke/SW fields) — fixed before extraction

## TASK 3 — Call-site verification

- L11209: `if(!isOutdoorVenue(game.venue)) return;` — plain global call, resolves via globalThis.isOutdoorVenue
- L11210: `const coords = getVenueCoords(game.venue);` — resolves via globalThis.getVenueCoords
- L11244: `if(!game.venue||!isOutdoorVenue(game.venue)) return;` — same
- L11245: `const coords = getVenueCoords(game.venue);` — same
- VENUE_COORDS: no bare reads remaining in field.js outside stubs (confirmed by grep)
- globalThis.VENUE_COORDS, globalThis.isOutdoorVenue, globalThis.getVenueCoords all present in main.js

## CI Run
- Code Map (L3): success
- Desktop Chrome Viewport Audit: success
- Desktop Safari Viewport Audit: not shown (handled by smoke-and-verify)
- Client Live Invariant: success
- Live site: 895 (unchanged — structural extraction only)

## Open carry-forwards
None. Phase 6 complete.
Next: Phase 7 (MY_TEAMS + isFeaturedTierGame → src/utils/preferences.js) — CC-CMD already dispatched.
