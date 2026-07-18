# Claude Code Command — Extract the Identity domain (first real TypeScript module)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All edits go in `src/legacy/field.js` and the new module file, never `index.html` directly. `field.js` is now a real ES module (`export`/`import` live, `globalThis` bridge retired) — new extractions use real `export`/`import`, not the old bridge pattern.

---

## CONTEXT

Named directly by an external architectural review as one of the real, logical next domains, alongside Rendering, Score Authority, Journalism, and Night Owl — but Identity is the one with the clearest, most concrete justification: tonight's own MLB dual-ID-path incident (206 real journalism briefs silently orphaned because two separate code paths produced incompatible ID formats for the same real games) was precisely an identity-boundary failure. No single, owned, tested place enforced "this is the canonical form of a game ID."

**First real TypeScript module for this codebase.** esbuild already transpiles TS natively — no new tooling required. This is the natural place to start: identity/ID-resolution is exactly the kind of domain where a typed shape (a real `GameId` type, a real `RawGame`/`NormalizedGame` interface) would have caught the class of bug that already happened once, at build time instead of in production data. Not a broader TS migration — just this one new module, `.ts` instead of `.js`, proving the pattern works before it becomes a habit for future extractions.

**Real, current candidates, found via direct search — call-site counts confirmed:**
- `findGameById` (6 real callers)
- `getDramaPeak` (7 real callers)
- `_resolveRealGameId` (6 real callers) — careful, already-existing fuzzy ID resolution with explicit ambiguous-match rejection and a stale-final guard
- `normalizeNBAGameRelay` (1 real caller)
- `resolveGameIdByHome` (4 real callers)
- `normalizeMLBGame` (4 real callers) — the function whose correct canonical-ID logic was already confirmed sound in tonight's own MLB backfill investigation; the bug was elsewhere routing around it, not in this function itself
- `resolveGameBroadcast` (4 real callers)

**Re-derive and re-verify this list fresh — it may have changed, and this is not necessarily the complete set.** Search broadly for any other real identity/ID-resolution functions this list missed before finalizing scope.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
node smoke.js index.html 2>&1 | tail -3
for fn in findGameById getDramaPeak _resolveRealGameId normalizeNBAGameRelay resolveGameIdByHome normalizeMLBGame resolveGameBroadcast; do
  grep -c "\b$fn(" src/legacy/field.js
done
# Confirm esbuild's real, current TS handling — a quick, isolated .ts test file, not assumed
```

---

## TASK 1 — Real, thorough candidate review (matching the established Phase 3 discipline)

Not every name on the list above necessarily belongs in one cohesive "Identity" module — some may be more naturally "broadcast resolution" or "drama/score" domain, not identity specifically. Review each real candidate's actual purpose and dependencies (does it reference external constants, other domain-specific state?) before deciding the real, correct scope. Report the real, final set with reasoning — do not include a function just because it appeared on this list if it doesn't genuinely belong.

## TASK 2 — Design the real TypeScript shapes first

Before extracting any function body, define the real, concrete types this domain actually needs — a `GameId` type (or branded string type, if that fits the codebase's real patterns), a real interface for whatever raw/normalized game shapes these functions actually operate on. Base these on real, observed data shapes (grep real usage, don't invent an idealized shape that doesn't match what's actually passed in).

## TASK 3 — Extract into `src/identity/index.ts` (or a real, better-named path if TASK 1's review suggests one)

Real TypeScript, real exports, real type annotations on function signatures at minimum. Internal call sites in `field.js` continue to work via normal ES module imports — no bridge needed, matching the pattern the globalThis retirement just proved out.

**Mandatory literal verification:**
```bash
grep -n "export function findGameById\|export function getDramaPeak\|export function _resolveRealGameId" src/identity/index.ts
```
Paste real output (adjust the exact function list to match TASK 1's real, final scope).

## TASK 4 — Real, functional call-site verification

For each extracted function, confirm every real caller in `field.js` still resolves correctly — not just that the import doesn't throw, but that the actual behavior (a real game ID resolves to the same real result as before) is unchanged.

## TASK 5 — Real diff, build, and live verification

Full pipeline: confirm esbuild's real TS transpilation genuinely works end to end (`sync-source.mjs` → smoke → `build-bundle.mjs` → bundled regression check against the real, current baseline). Real commit, real live CI confirmed via the raw check-runs API directly (established standard), real live content check.

---

## DONE CONDITION

A real, cohesive Identity module exists as genuine TypeScript, with real type definitions matching actual observed data shapes, all real call sites verified functionally unchanged, full pipeline proven via real job logs and live content check. This is a proof-of-pattern for future TS-written extractions, not a broader migration — no other part of the codebase should be touched.

**Confidence scoring:**
- TASK 1 (20 pts): real, honest scope review — doesn't just extract every name on this doc's own list without checking it belongs
- TASK 2 (20 pts): real types based on actual observed data shapes, not invented ideals
- TASK 3 (25 pts): clean TS extraction, confirmed via pasted output
- TASK 4 (20 pts): real functional verification, not just import-doesn't-throw
- TASK 5 (15 pts): real pipeline proof (esbuild TS transpilation genuinely works), real live CI via raw job logs, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
