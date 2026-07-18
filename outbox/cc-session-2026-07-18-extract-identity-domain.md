# CC Session — 2026-07-18 — extract-identity-domain

**Date:** 2026-07-18
**HEAD start:** 81f1abb
**HEAD end:** 923f426
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18b (unchanged — no SW change)
**Deploy gate:** success (923f426)

---

## Commits

1. **923f426** — `feat: extract Identity domain into src/identity/index.ts (first TS module)`
   - `src/identity/index.ts`: new file — TypeScript types (FieldInternalId, ExternalGameId, FieldGame, EspnScoreEntry, FieldData) + initIdentityModule() + findGameById() + _resolveRealGameId() + resolveGameIdByHome()
   - `src/legacy/field.js`: import added at top; initIdentityModule() call added immediately after 'use strict'; inline definitions of findGameById, _resolveRealGameId, resolveGameIdByHome replaced with extraction comments
   - `smoke.js`: A52, A-RESOLVERID updated to accept `import { ... }` pattern; A-REALIDCOLLISION-1 updated to fall back to reading src/identity/index.ts when function body is not in html
   - `field_smoke.js`: A52 guard updated to accept import pattern; initIdentityModule, findGameById, _resolveRealGameId, resolveGameIdByHome stubs added to new Function() execution context

---

## TASK 1 — Scope review

Candidates reviewed and narrowed from 7 to 3:
- **findGameById** ✅ — pure ID lookup, no domain deps
- **_resolveRealGameId** ✅ — fuzzy ID resolution, identity boundary function
- **resolveGameIdByHome** ✅ — reverse lookup by home name slug
- **getDramaPeak** ❌ — drama domain (not identity)
- **normalizeNBAGameRelay** ❌ — relay adapter (not identity)
- **normalizeMLBGame** ❌ — MLB-specific with heavy MLB deps (not identity)
- **resolveGameBroadcast** ❌ — broadcast domain (not identity)

## TASK 2 — TypeScript shapes

Types derived from actual observed data shapes (grepped real usage, not invented):
- `FieldInternalId = string` (format "g{n}", per-load volatile)
- `ExternalGameId = string` (api-sports.io fg.id, stable)
- `FieldGame` interface: `_id`, `_gameId?`, `home?`, `away?`, `start_time?`, `[key: string]: unknown`
- `EspnScoreEntry` interface: `homeName?`, `awayName?`, `_gameId?`, `state?`, `[key: string]: unknown`
- `FieldData` interface: `sports?: Array<{ games?: FieldGame[] }>`

## TASK 3 — Extraction

```
grep -n "export function findGameById\|export function _resolveRealGameId\|export function resolveGameIdByHome\|export function initIdentityModule" src/identity/index.ts
55:export function initIdentityModule(deps: {
69:export function findGameById(id: FieldInternalId): FieldGame | undefined {
87:export function _resolveRealGameId(game: FieldGame): ExternalGameId | null {
115:export function resolveGameIdByHome(homeName: string): FieldInternalId | null {
```

## TASK 4 — Call-site verification

All call sites in field.js verified:
- `findGameById`: 6 callers — all use bare name, resolved via import
- `_resolveRealGameId`: 6 callers — all use bare name `_resolveRealGameId(game)`, resolved via import
- `resolveGameIdByHome`: 4 callers + 1 optional-chain `resolveGameIdByHome?.()` — all resolved via import

Dependency injection: `initIdentityModule({ games: allGamesFlat, scores: () => espnScores, data: () => allData })` called at top of field.js. Closures capture live bindings — each call sees current value after reassignment.

## TASK 5 — Pipeline

- sync-source: ✅
- smoke (source): 958/0 ✅
- field_smoke: 0 failures ✅
- build-bundle: esbuild ESM 1568 KB ✅ (TS transpiled, identity functions inlined at lines 5379-5420)
- CI: Smoke Test + Live Verify ✅, Desktop Safari Viewport Audit ✅, Client Live Invariant ✅ — all on 923f426

---

## Integration status

VERIFIED — pure refactor. No behavior changes. Identity functions now live in a typed TypeScript module with documented boundaries. esbuild inlines the module at bundle time; no runtime overhead.

---

## Carry-forwards

None. CC-CMD self-complete per Rule 87.
