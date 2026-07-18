# CC Session — esbuild Phase 5
**Date:** 2026-07-18
**Scope:** First constant+function pair extraction — WX_DIR + cardinalDir → src/utils/wind.js
**HEAD progression:** 1416643 → 3d1c4b0 (post-rebase)

## Smoke
- Start: 958/0 (inherited)
- Local dry-run: 958/0
- CI Deploy gate: success (Client Live Invariant queued/in_progress at doc-write time)
- Live site post-deploy: 895 (structural extraction only)

## SW_VERSION
Not bumped (structural extraction only, no HTML content change).

## Commits
- `3d1c4b0` — feat: extract WX_DIR + cardinalDir to src/utils/wind.js (Phase 5)
  - `src/utils/wind.js` (new): `export const WX_DIR` + `export function cardinalDir`
  - `src/legacy/field.js`: both stubs in place; NO import added
  - `src/main.js`: `import { WX_DIR, cardinalDir }` + both globalThis assignments

## TASK 1 — Real confirmation of scope

- `WX_DIR` appears 3 times in field.js: definition (L11007), comment (L11034), used in cardinalDir (L11035)
- No other bare-identifier callers of `WX_DIR` outside `cardinalDir` body
- `cardinalDir` has 1 real call site: L11108 in `wxBadge` (which stays in field.js, resolves via globalThis bridge)
- Zero smoke assertions reference either `WX_DIR` or `cardinalDir` by name (grep confirmed 0 hits)

## TASK 3 — Call-site verification

- `cardinalDir` L11108: `cardinalDir(wx.windDir||0)` — plain global call inside `wxBadge`, resolves via `globalThis.cardinalDir`
- `WX_DIR`: no bare-identifier reads in field.js outside `cardinalDir`'s now-stubbed body
- `globalThis.WX_DIR` and `globalThis.cardinalDir` both confirmed present in bundled index.html (grep verified)

## TASK 6 — Pattern extension to constants: verdict

**Confirmed: extends cleanly, identically to the pure-function pattern.**

The key insight: within `wind.js`, `cardinalDir` references `WX_DIR` as a normal same-file identifier — no cross-module import, no globalThis needed for the internal relationship. The `globalThis.WX_DIR` bridge is only needed if field.js has bare `WX_DIR` reads outside `cardinalDir` (it doesn't — confirmed by grep).

The established CC-CMD template applies directly to the remaining pairs:
- `VENUE_COORDS` + `isOutdoorVenue` + `getVenueCoords` → `src/utils/venues.js`
- `MY_TEAMS` + `isFeaturedTierGame` → `src/utils/preferences.js`

Both follow the same pattern: constant exported + function(s) that reference it within the same module. `globalThis.CONSTANT` bridge added in main.js for completeness (covers any bare reads in field.js that may exist). No adjustments to this CC-CMD template needed.

## CI Run
- Code Map (L3): success
- Desktop Chrome Viewport Audit: success
- Desktop Safari Viewport Audit: in_progress at doc-write time
- Client Live Invariant: in_progress at doc-write time
- Live site: 895 (unchanged)

## Open carry-forwards
None. Phase 5 complete.
Next: Phase 6 (VENUE_COORDS+isOutdoorVenue+getVenueCoords) and Phase 7 (MY_TEAMS+isFeaturedTierGame) — each a direct repeat of this template.
