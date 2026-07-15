# Outbox — Fix the archive-path write silent catches (real, external audit finding)

**Date:** 2026-07-15
**Scope:** 9 catch sites across 5 functions, all confirmed genuine archive-write silent failures via `scripts/audit-silent-catches.js`. No unrelated catches in the same functions touched.

## Origin

A real external review (via chat, on a file confirmed to be this repo's `index.html`) found: *"Archive failures remain unobservable — `archiveBrief()` and related persistence still sit behind empty catches. Visible journalism can succeed while durable history fails silently."* Verified directly before acting on it (Rule 72 — inherited claims must be re-verified): read `archiveBrief`/`_archiveBrief` and confirmed both had genuinely empty catches. Then built `scripts/audit-silent-catches.js` (an AST-based, checked-in tool — see `outbox/cc-session-2026-07-15-treesitter-tooling.md`) to find the *full* real cluster precisely, rather than eyeballing more grep hits.

Precisely scoped to functions whose body touches the literal `/archive/` URL path (not the bare word "archive," which pulled in 43 unrelated functions on a first pass and would have overstated the finding 3x). Result: 16 real archive-touching functions, 45 catch sites, 40 silent — split by severity into write (persistence), read (display), and health-panel self-diagnostic buckets. This dispatch fixes the **write** bucket only — 5 functions, 9 catch sites — since that's what "durable history fails silently" is actually about; read-path and health-panel silent catches are a real but separate, lower-severity concern, not touched here.

## Fix

Added `captureFieldError(label, err, false)` to each silent catch, using the codebase's own established convention for exactly this purpose (`captureFieldError`'s own doc comment: *"replace bare catch(e){} on infrastructure calls"*), matching the `subsystem:operation` label style already used elsewhere in the same files (e.g. `'pick:resolve-final'` inside `saveEspnFinal` itself). `silent=false` matches that same sibling call's own choice, so these also surface via `console.warn` under `FIELD_DEBUG`, not just the invisible `window._fieldErrors` ring buffer.

**Deliberately preserved in every case:** the fire-and-forget, non-blocking contract. None of these catches now throw, rethrow, or change control flow — `_archiveBrief`'s own comment (*"the try/catch + .catch() guarantee that an archive failure cannot block sessionStorage writes or the visible brief render"*) remains true. The fix is purely: the failure is now recorded, not silently discarded.

| Function | Site | Label |
|---|---|---|
| `archiveBrief` | `.catch()` on `/archive/brief` POST | `archive:brief` |
| `_archiveBrief` | `.catch()` on `/archive/brief` POST | `archive:brief-client-fetch` |
| `_archiveBrief` | outer `try/catch` (payload-build errors) | `archive:brief-client` |
| `saveGolfRoundFinal` | `.catch()` on `/archive/game` POST | `archive:golf-game` |
| `saveGolfRoundFinal` | `.catch()` on `/archive/drama` POST | `archive:golf-drama` |
| `_backfillOneDramaGame` | `.catch()` on `/archive/drama` POST | `archive:drama-backfill` |
| `saveEspnFinal` | `.catch()` on `/archive/drama` POST | `archive:drama-final-fetch` |
| `saveEspnFinal` | outer `try/catch` (drama-persistence block) | `archive:drama-final` |

**Explicitly left untouched, in the same functions, as out of scope:** `saveEspnFinal`'s statCtx-snapshot builder, night-owl-enqueue block, and tonight-finals localStorage-write loop each have their own silent catches — none touch `/archive/*`, all a different concern (cache reads, a different relay endpoint, and local storage respectively). Fixing those would be real, separate work, not part of "the write-path silent catches" this audit found.

## Real regressions found and fixed while verifying (Rule 77 — investigate, don't rationalize)

Two `smoke.js` assertions encoded the *old, silent* catch text as if it were the correct spec, rather than checking anything about the actual intended contract:

1. **`A661`** literally required `keepalive: true,\s*\}\)\.catch\(\(\) => \{\}\);` verbatim — a hard failure the moment `saveGolfRoundFinal`'s two catches were fixed (953/954, real regression, not ignored). Fixed to check the real new text for both archive posts.
2. **`A614`** checked `html.includes('.catch(() => {})')` — a *coincidental* pass even after fixing `archiveBrief`, because 32 other, correctly-untouched silent catches remain elsewhere in the file and happen to contain that exact substring. The assertion was never actually scoped to `archiveBrief` itself. Fixed to check the real, exact new text specific to `archiveBrief`'s own catch.

Both are the same class of bug found and fixed earlier tonight in `never-adopted-utilities-disposal` (a coincidental substring match masking that the real thing being checked was no longer true) — same root cause, same fix discipline applied again.

## Verification

- Full-file script-block parse: 3/3 clean.
- `node smoke.js index.html`: **954 passed, 0 failed** (unchanged from before this dispatch — 2 assertions fixed to check the new real behavior, no new assertions added, no count regression). `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- `node scripts/audit-silent-catches.js "/archive/"` re-run after the fix: all 9 target sites now correctly classified HANDLED; the remaining 32 silent sites are exactly the disclosed-out-of-scope read-path/health-panel/other-concern catches, confirmed unchanged.
- **8 real forced-condition tests** (Node `vm`, each function extracted verbatim from the committed source, `captureFieldError` mocked to record calls):
  1. `archiveBrief`: a rejected `fetch` reaches `captureFieldError('archive:brief', err, false)` with the real `Error` object.
  2. `_archiveBrief`: a rejected `fetch` reaches the inner `captureFieldError('archive:brief-client-fetch', ...)`.
  3. `_archiveBrief`: a genuine exception building the request body (not the fetch itself — a circular-reference `JSON.stringify` failure) reaches the *outer* `captureFieldError('archive:brief-client', ...)`, proving both catch paths are independently real, not just the fetch one.
  4. `saveGolfRoundFinal`: both rejected archive posts reach their own distinct labels (`archive:golf-game`, `archive:golf-drama`).
  5. `_backfillOneDramaGame`: a rejected `/archive/drama` post reaches `captureFieldError('archive:drama-backfill', ...)`.
  6. `saveEspnFinal`'s drama-persistence block (extracted as a targeted snippet — the full function is too large/dependency-heavy to extract wholesale): confirmed both real fixed catch sites are present in the extracted text.
  7. Same snippet, run live: a rejected `/archive/drama` fetch reaches `captureFieldError('archive:drama-final-fetch', ...)`.
  8. Same snippet: an exception building the payload (a throwing cache lookup) reaches the *outer* `captureFieldError('archive:drama-final', ...)`.

  All 8 passed. One real test-authoring bug caught before the final run: the snippet-extraction helper for `saveEspnFinal`'s drama block initially stopped at the `try{}` body's own closing brace, dropping the `catch` clause entirely and producing a "Missing catch or finally after try" syntax error — fixed to extend extraction through the full `catch(...) {...}` clause.

## DONE CONDITION

All 9 real archive-write silent catches found by the AST audit now report via `captureFieldError`, verified end-to-end against the actual committed source (not reimplementations) for both the "fetch rejected" and "exception before the fetch" failure modes where both exist. Fire-and-forget/non-blocking behavior is provably unchanged. Two real, independently-discovered stale smoke assertions (encoding old behavior as spec, one via a hard failure, one via a silent coincidental pass) were found and fixed, not routed around.

## Commit

- `index.html`: 9 catch sites across `archiveBrief`, `_archiveBrief`, `saveGolfRoundFinal`, `_backfillOneDramaGame`, `saveEspnFinal` now report via `captureFieldError` instead of silently discarding the failure.
- `smoke.js`: `A661`/`A614` fixed to check the real new behavior instead of the old, now-incorrect literal text.
- This manifest.
