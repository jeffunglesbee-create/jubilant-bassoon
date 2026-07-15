# Outbox — Archive-path silent catches: full fix (write-path + read-path + health-panel)

**Date:** 2026-07-15
**Scope:** 34 catch sites across 14 functions, all confirmed genuine archive-related silent failures via `scripts/audit-silent-catches.js` (checked-in AST tool, see `outbox/cc-session-2026-07-15-treesitter-tooling.md`). Three dispatch passes, documented together here since they're one continuous piece of work against the same real finding.

## Origin

A real external review (via chat, on a file confirmed to be this repo's `index.html`, verified directly rather than trusted — Rule 72) found: *"Archive failures remain unobservable — `archiveBrief()` and related persistence still sit behind empty catches. Visible journalism can succeed while durable history fails silently."*

Confirmed directly (`archiveBrief`/`_archiveBrief` both had genuinely empty catches), then built `scripts/audit-silent-catches.js` to find the *full* real cluster via AST rather than eyeballing more grep hits. Precisely scoped to functions whose body touches the literal `/archive/` URL path (not the bare word "archive," which pulled in 43 unrelated functions on a first pass — checked and rejected as over-broad before reporting anything). Result: 16 real archive-touching functions, 45 catch sites, 40 silent, split by severity into three buckets:

1. **Write (persistence)** — fixed in pass 1. *"Durable history fails silently"* is specifically about this bucket.
2. **Read (display)** — fixed in pass 2. Real but lower severity: missing/stale display data, not corrupted history.
3. **Health-panel self-diagnostics** (`buildFieldHealthPanel`, `loadBriefQualityRow`) — fixed in pass 3 (this dispatch's third pass). Lowest severity of the three: these already surfaced a real UI row via `warn(...)` on failure; the audit tool flagged them only because that's not one of its five recognized "reporter" identifiers. The fix adds `captureFieldError` *alongside* every existing `warn()`/fallback behavior — nothing was replaced.

`saveEspnFinal`'s own *other*, unrelated silent catches (statCtx-snapshot builder, night-owl-enqueue block, tonight-finals localStorage-write loop) were identified and deliberately left untouched in **both** passes — none touch `/archive/*`, each a different concern living in the same large function.

## Fix — write path (pass 1, 9 sites / 5 functions)

Added `captureFieldError(label, err, false)` to every silent write-path catch, matching `captureFieldError`'s own documented purpose (*"replace bare catch(e){} on infrastructure calls"*) and the `subsystem:operation` label convention already used elsewhere in the same file (`'pick:resolve-final'` inside `saveEspnFinal` itself). Fire-and-forget/non-blocking behavior preserved exactly in every case — no `throw`, no control-flow change, only added observability.

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

## Fix — read path (pass 2, 18 sites / 7 functions)

Same convention, applied consistently across every catch in each of the 7 in-scope functions (not just the network-fetch ones — matching pass 1's own completeness standard of fixing both the fetch `.catch()` and any wrapping `try/catch` in the same function, e.g. `_archiveBrief`'s outer catch). Silent flag chosen per-site to match local convention where one already existed.

| Function | Sites | Labels | `silent` |
|---|---|---|---|
| `loadArchiveTimeline` | cache-read, cache-write, fetch | `archive:timeline-cache-read`, `archive:timeline-cache-write`, `archive:timeline-fetch` | true, true, false |
| `loadMarketConsensus` | cache-read, cache-write, fetch | `archive:market-consensus-cache-read`, `-cache-write`, `-fetch` | true, true, false |
| `loadUpsets` | cache-read, 2× cache-write, fallback-fetch, primary-fetch | `archive:upsets-cache-read`, `archive:upsets-cache-write` (×2, same real concern), `archive:upsets-fallback-fetch`, `archive:upsets-fetch` | true, true, true, false, false |
| `renderJournalismArchive` | cache-read, cache-write, fetch | `archive:journalism-archive-cache-read`, `-cache-write`, `-fetch` | true, true, false |
| `renderWCBracketImpact` | whole-function try/catch | `archive:bracket-impact` | false |
| `fetchLastMeeting` | whole-function try/catch | `archive:last-meeting` | **true** — matches its own sibling `fetchArchiveDate`'s already-established real convention exactly (same file region, same shape, `catch (_e) { captureFieldError('broadcast-archaeology:date-fetch', _e, true); return null; }`), not the write-path's default of `false` |
| `runDramaBackfillDiscovery` | per-game loop catch, outer discovery catch | `archive:drama-backfill-game`, `archive:drama-backfill-discovery` | true (high-frequency, one per backfilled game), false |

`renderJournalismArchive`'s fetch catch is the one site where the existing behavior did something real (`renderEmpty()`, a genuine UI fallback) — `captureFieldError` was added *alongside* it, not in place of it; both still fire.

## Fix — health-panel self-diagnostics (pass 3, 7 sites / 2 functions)

Same convention. All 4 `buildFieldHealthPanel` catches already had some observable behavior (a real `warn()` row, or — for the reset-backoff button — a scheduled page reload) even before this fix; `captureFieldError` was added *alongside* every one of them, matching the "preserve every existing fallback" principle already applied in passes 1 and 2 (e.g. `renderJournalismArchive`'s `renderEmpty()` above). `silent=true` throughout — matches the read-path bucket's cache-read/health-check convention, since none of these are user-initiated actions that need an immediate visible failure signal beyond the row already shown.

| Function | Site | Label |
|---|---|---|
| `buildFieldHealthPanel` | Journalism check (`document.querySelector` / cache-key / budget read) | `health-panel:journalism-check` |
| `buildFieldHealthPanel` | `_makeResetBtn` onclick handler (`localStorage.removeItem` on backoff reset) | `health-panel:reset-backoff-button` |
| `buildFieldHealthPanel` | Prose Quality rolling average (`localStorage.getItem('field_jq_scores')` + `JSON.parse`) | `health-panel:prose-quality-check` |
| `buildFieldHealthPanel` | Phrase Review queue (`localStorage.getItem('field_jq_review')` + `JSON.parse`) | `health-panel:phrase-review-check` |
| `loadBriefQualityRow` | `sessionStorage` cache-read | `health-panel:brief-quality-cache-read` |
| `loadBriefQualityRow` | `sessionStorage` cache-write | `health-panel:brief-quality-cache-write` |
| `loadBriefQualityRow` | `/archive/query` fetch | `health-panel:brief-quality-fetch` |

The `_makeResetBtn` catch is the one genuinely *empty* site in this bucket (`catch(e){}`, nested inside an inline onclick-handler function string, not a top-level catch) — found by reading the surrounding code after the audit tool flagged the containing `buildFieldHealthPanel` function, not from the tool's line numbers alone. Its real UX contract (the page reload is still scheduled via `setTimeout` regardless of whether `localStorage.removeItem` throws) is unchanged — confirmed by forced-condition test.

## Real regressions found and fixed during verification (Rule 77 — investigate, don't rationalize), not routed around

Four separate `smoke.js` assertions encoded the *old, silent* catch text as if it were correct spec, rather than checking the actual intended contract. All four are the identical root cause: a literal substring check that either (a) hard-fails once the literal text changes, or (b) — the more dangerous variant — keeps *coincidentally* passing after a fix, because the exact same substring still exists elsewhere in the file from other, correctly-untouched silent catches, meaning the assertion was never actually scoped to the function it claimed to verify.

| Assertion | Failure mode | Fix |
|---|---|---|
| `A661` (pass 1) | Hard failure (953/954) — literally required `keepalive: true,\s*\}\)\.catch\(\(\) => \{\}\);` verbatim | Check the real new text for both `saveGolfRoundFinal` archive posts |
| `A614` (pass 1) | Silent coincidental pass — `html.includes('.catch(() => {})')` still trivially true via 32 other untouched silent catches elsewhere | Check the real, exact new `archiveBrief` catch text |
| `A618` (pass 2) | Silent coincidental pass — `html.includes('.catch(() => {});')` still trivially true via other untouched catches | Check the real, exact new `loadUpsets` primary-fetch catch text |
| `A615` (pass 2) | Same as A618, for `loadArchiveTimeline` | Check the real, exact new `loadArchiveTimeline` fetch catch text |

`A618`/`A615` are a real, notable finding on their own: they demonstrate the *coincidental-pass* failure mode is not a one-off — it recurred a second time, independently, in the second pass, confirming this class of bug is a real, recurring risk in this codebase's smoke-assertion style (`html.includes()` on a short generic literal) whenever a fix changes text that isn't uniquely scoped to begin with. Worth keeping in mind for any future silent-catch or similar boilerplate-pattern fix.

**Pass 3 (health-panel) found zero further regressions of this class.** Proactively grepped `smoke.js`/`field_smoke.js` for every label and every old catch-body literal touched in this pass before committing — the only live references to these two functions (`AVV-MLB-007`, `A620`) check function/div *existence* only, not catch-body text, so they were never at risk.

## Verification

- Full-file script-block parse: 3/3 clean, all three passes.
- `node smoke.js index.html`: **954 passed, 0 failed** at the end of all three passes (2 assertions fixed in each of passes 1 and 2, zero needed in pass 3, no net count change, no regression left standing). `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- `node scripts/audit-silent-catches.js "/archive/"` re-run after all three passes: all 34 target sites (9 write + 18 read + 7 health-panel) correctly classified HANDLED. The only remaining silent sites are `saveEspnFinal`'s other 7 unrelated catches (never part of this finding — see Carry-forwards).
- **28 real forced-condition tests total** (Node `vm`, every function/snippet extracted verbatim from the committed source, `captureFieldError` mocked to record real calls):
  - Pass 1 (8 tests): both failure modes where both exist (fetch-rejected vs. exception-before-the-fetch) for `archiveBrief`, `_archiveBrief`, `saveGolfRoundFinal` (both posts, distinct labels), `_backfillOneDramaGame`, and `saveEspnFinal`'s drama-persistence block (extracted as a targeted snippet — the full function is too large/dependency-heavy to extract wholesale).
  - Pass 2 (10 tests): `loadArchiveTimeline` (cache-read AND fetch failure, both real sites), `loadMarketConsensus` (fetch), `loadUpsets` (confirmed a real non-error path — `!ok` HTTP responses correctly produce *zero* `captureFieldError` calls, not false positives — then confirmed the real rejected-fetch path does fire), `renderJournalismArchive` (confirmed `captureFieldError` AND the real `renderEmpty()` UI fallback both still fire together), `renderWCBracketImpact`, `fetchLastMeeting` (confirmed it matches its sibling's exact `silent=true` convention and still returns `null`), `runDramaBackfillDiscovery` (both real sites: the outer discovery-fetch catch and the per-game loop catch).
  - Pass 3 (10 tests): `buildFieldHealthPanel`'s Journalism check (real thrown exception via a mocked `document.querySelector` throw, confirmed `captureFieldError` AND the real `warn()` row both fire), Prose Quality and Phrase Review checks (both via corrupt `localStorage` JSON, same dual-fire confirmation), `_makeResetBtn`'s onclick handler (real `localStorage.removeItem` throw, confirmed `captureFieldError` fires AND the page-reload `setTimeout` is still scheduled regardless — the real UX contract), `loadBriefQualityRow`'s cache-read and fetch-rejection paths.
  - All 28 passed. Test-authoring bugs caught and fixed before the final runs, not silently worked around: (1) pass 2's `saveEspnFinal` snippet-extraction helper initially stopped at the `try{}` body's own closing brace, dropping the `catch` clause; (2) pass 2's test context was missing a real `AbortSignal` global; (3) pass 3's Prose-Quality/Phrase-Review catch-clause extraction used a fragile regex against a `rest` slice that started *after* the try block's own closing brace, so the regex's required leading `}` could never match — fixed by switching to the same robust brace-depth-matching extraction already used for the Journalism-check snippet; (4) pass 3's mocked `document.createElement()` for the reset-backoff-button test defined `style` as a setter-only accessor, so the real code's `b.style.cssText = "..."` read `undefined` off the getter before assigning — fixed by mocking `style` as a plain object.

## DONE CONDITION

All 34 real archive-related silent catches found by the AST audit (write + read + health-panel) now report via `captureFieldError`, verified end-to-end against the actual committed source for every distinct failure mode present in each function. Fire-and-forget/non-blocking behavior and every existing real fallback (`renderEmpty()`, `return null`, `return 0`, `return false`, the `warn()` UI rows, the reset-button's scheduled reload) is provably unchanged — only observability was added. Four real, independently-discovered stale/coincidentally-passing smoke assertions were found and properly fixed across passes 1-2; pass 3 introduced none.

## Carry-forwards, explicitly disclosed, not silently dropped

- **`saveEspnFinal`'s other 7 silent catches** (statCtx builder, night-owl enqueue, tonight-finals localStorage write) — a different, real, separate concern from archive persistence, never part of this finding, correctly left untouched across all three passes.
- `SW_VERSION` bumped `2026-07-15d` → `2026-07-15e` for this dispatch's own deploy (write-path pass bumped `b`→`c`; read-path pass bumped `c`→`d`).

## Commit

- `index.html`: 34 catch sites across `archiveBrief`, `_archiveBrief`, `saveGolfRoundFinal`, `_backfillOneDramaGame`, `saveEspnFinal`, `loadArchiveTimeline`, `loadMarketConsensus`, `loadUpsets`, `renderJournalismArchive`, `renderWCBracketImpact`, `fetchLastMeeting`, `runDramaBackfillDiscovery`, `buildFieldHealthPanel`, `loadBriefQualityRow` now report via `captureFieldError` instead of silently discarding the failure.
- `smoke.js`: `A661`, `A614`, `A618`, `A615` fixed (passes 1-2) to check real current behavior instead of stale/coincidentally-matching literal text. No `smoke.js` changes needed in pass 3.
- `sw.js`: `SW_VERSION` bump, `d` → `e`.
- This manifest (supersedes the write+read-only draft of the same filename).
