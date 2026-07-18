# CC Session — esbuild Phase 4
**Date:** 2026-07-18
**Scope:** Verify real tree-shaking behavior; honest accounting of current limits and next steps
**HEAD:** 980437a (no new commits — test was ephemeral, reverted before staging)

## Smoke
- Start: 958/0
- End: 958/0 (unchanged — no file committed)

## SW_VERSION
Not bumped (no deploy-triggering change).

## Commits
None. The tree-shaking test was ephemeral:
- Added `export function _deadExportTreeShakingTest(x) { return x * 42; }` to `src/utils/golf-format.js`
- Built and measured (see TASK 1/3 below)
- Reverted in-place before any `git add`
- `git status` confirms clean working tree

---

## TASK 1 — Real tree-shaking verification

**Test:** Added `export function _deadExportTreeShakingTest(x) { return x * 42; }` to `src/utils/golf-format.js`. This function was NOT imported in `main.js` and NOT assigned to `globalThis` — a genuinely dead export.

**Build config confirmed:** `bundle: true` in `scripts/build-bundle.mjs` (confirmed via grep of actual file).

**Result:** `grep -c "_deadExportTreeShakingTest" index.html` → **0** (function absent from bundle).

**Simultaneous confirmation:** `grep -c "fmtGolfToPar" index.html` → **5** (the used export from the same file is retained).

**Conclusion: Tree-shaking is real and working.** esbuild correctly drops unused named exports from bundled modules, retains used ones, even within the same source file.

---

## TASK 2 — Honest accounting: what tree-shaking currently protects against

**Current value: protective, not corrective.**

All 19 extracted functions across 13 modules are genuinely used — each has a `globalThis.X = X` assignment in `main.js`, which esbuild treats as a live reference. There is nothing dead to clean up today.

Tree-shaking's current value is a **drift guard**: if a future extraction leaves a stale export behind (e.g., a function extracted but later unwired from `main.js` without removing its module definition), the dead export will be silently dropped at build time rather than inflating the bundle. This is the `SR.mlspass`-style drift the original architectural discussion anticipated.

**What tree-shaking cannot reach today:** Everything still inside `src/legacy/field.js`. esbuild bundles field.js as a single opaque import target — it cannot analyze or remove individual functions within that file because they are not individually exported. The real payoff (dropping orphaned constructs like `SR.mlspass`) requires those constructs to be in their own modules with real named exports first. That is Phase 5+ territory.

---

## TASK 3 — Real byte-size measurement

| State | Bundle size | Dead fn in output |
|-------|------------|-------------------|
| With `_deadExportTreeShakingTest` in source | 1,936,292 bytes | **No** |
| Without (reverted) | 1,936,292 bytes | N/A |
| **Delta** | **0 bytes** | — |

The output is **byte-identical** with and without the dead export in the source file. The function contributed exactly 0 bytes to the deployed bundle — not minified to a stub, not present at all. This is the expected behavior for proper tree-shaking (as opposed to dead-code elimination that leaves stubs).

---

## TASK 4 — Honest recommendation for next steps

**Two real options, one clear winner:**

**Option A: Domain consolidation** — reorganize the 13 existing modules (e.g., merge `rai.js` + `otw.js` + `national-game.js` into a `game-classification.js`, or group `weather.js` + `odds.js` into a `context.js`). Low risk, zero functional change, minor cosmetic benefit. **Not compelling** — the 13 modules are already well-named and appropriately scoped. Consolidation would obscure the origin of each extraction without adding real value.

**Option B: Further individual extraction — constant-dependent functions** — the next real frontier is functions like `cardinalDir` (depends on `WX_DIR`), `isOutdoorVenue`/`getVenueCoords` (depend on `VENUE_COORDS`), `isFeaturedTierGame` (depends on `MY_TEAMS`). These require co-extracting the constant alongside the function into the same module. Each is a contained, low-risk operation:
- `WX_DIR` + `cardinalDir` → `src/utils/wind.js`
- `VENUE_COORDS` + `isOutdoorVenue` + `getVenueCoords` → `src/utils/venues.js`
- `MY_TEAMS` + `isFeaturedTierGame` → `src/utils/preferences.js`

**Recommendation: Option B, one constant+function pair at a time.** Each is independently safe, gives tree-shaking a real, testable unit, and reduces `field.js` further. The smoke-asserted functions (`fieldDateKey`, `isGameOver`, etc.) require rewriting assertions — that's separate, higher-risk scope needing its own explicit CC-CMD.

The real payoff (dropping orphaned constructs like `SR.mlspass`) remains gated on extracting the specific constructs involved, which live inside field.js's 39,000-line body and haven't been individually targeted yet.

---

## Summary

Tree-shaking is confirmed real (unused export dropped, bundle byte-identical). Current value is protective/drift-guard, not corrective — no dead exports exist today. Next highest-value step is extracting constant-dependent function pairs (WX_DIR+cardinalDir, VENUE_COORDS+isOutdoorVenue/getVenueCoords, MY_TEAMS+isFeaturedTierGame), each as a separate CC-CMD following the established pattern.
