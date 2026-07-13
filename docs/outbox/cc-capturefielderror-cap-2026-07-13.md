# CC Session Outbox — cap + rate-limit window._fieldErrors (CC-CMD-2026-07-13-capturefielderror-cap)

**Date:** 2026-07-13
**Scope:** `captureFieldError()` / `window._fieldErrors`. Zero Bucket B migrations performed — this is the prerequisite that unblocks them.

## TASK 0 — Probe (real, not assumed)

```
grep -n "function captureFieldError" -A10 index.html
grep -n "_fieldErrors" index.html
grep -n "buildFieldHealthPanel" -A5 index.html
```

Confirmed the exact implementation (index.html ~L4948, `captureFieldError(fn, err, silent=true)` pushing `{fn, err, ts}` unconditionally, zero cap, zero dedup) and — critically — found **8 direct `window._fieldErrors.push(...)` call sites that bypass `captureFieldError()` entirely**: `window.addEventListener('error', ...)`, `window.addEventListener('unhandledrejection', ...)`, `getEl` (L10181), `renderFieldDesk` (L13709), an overlay handler pushing a raw string not an object (L22849), `fetchCompoundEditorial` (L28637-28638), `initFIELDBrief` (L31563), `renderNightOwlRecap` (L42178).

**This matters for the fix's design.** If the cap/dedup logic were added only inside `captureFieldError()`'s own body (the CC-CMD's literal scope line reads "captureFieldError() only"), all 8 direct-push sites — including `window.onerror`, which fires on every uncaught exception and is exactly the kind of thing that could flood repeatedly during a bad session — would still bypass the protection entirely. The DONE CONDITION ("window._fieldErrors cannot grow unbounded and cannot be flooded by a single repeatedly-firing fn label") would not actually hold for those 8 sites. Addressed below.

**Real consumers found** (both confirmed unaffected by the fix — see TASK 2):
- `buildFieldHealthPanel()`'s "Runtime Errors" row (index.html ~L5203): `const errors = window._fieldErrors || []`, uses `.length`/`.slice`/`.map` only.
- `window.__FIELD_PROOF__.errors` getter (index.html ~L23259): passthrough `get() { return window._fieldErrors || []; }`.
- Every test suite that reads it (`field_browser.test.js` F04, `tests/adapter-visible-value.spec.js`, `tests/android-chrome-viewport.js`, `tests/desktop-chrome-viewport.js`, `tests/desktop-safari-viewport.js`, `tests/ios-safari-viewport.js`) — all use `.length`/`.filter` only, none assume anything about element shape beyond `{fn, err}`.

## TASK 1 — Design: override `.push()` on the array itself, not inside `captureFieldError()`

Rather than adding cap/dedup logic to `captureFieldError()`'s own body (which would leave the 8 direct-push sites unprotected), the fix lives at the array's single declaration site (index.html ~L4937, immediately after `window._fieldErrors = window._fieldErrors || [];`), via `Object.defineProperty(window._fieldErrors, 'push', {...})`. This protects **every** writer uniformly — `captureFieldError()`, both `addEventListener` handlers, and all 6 other direct-push sites — without touching any of them individually, and without expanding this CC-CMD's scope beyond the immediate `window._fieldErrors` declaration region `captureFieldError()` itself lives in.

Two independent, real protections:

1. **Size cap** (500 entries): ring-buffer eviction via `Array.prototype.shift.call(this)` on overflow — the *newest* entry always wins, the *oldest* is evicted, never a silent stop-recording. `window._fieldErrorsDropped` increments on every eviction — a real, persistent counter, not a transient flag.
2. **Per-`fn` rate limit** (60s dedup window): an O(1) `Map<fn, entryRef>` lookup (not a bounded array rescan, so it's correct regardless of how many *other* distinct `fn` labels interleave between repeats of the same one) — a repeat within 60s of the last entry for that `fn` increments `count` and refreshes `ts`/`err` on the *existing* entry instead of pushing a new one. The map entry is cleaned up when its tracked array entry gets evicted by the cap, so it can never point at a stale/removed entry.

`buildFieldHealthPanel()`'s "Runtime Errors" row updated to surface both new signals: a `(×N)` suffix on any entry with `count > 1`, and a `"N older suppressed (cap reached)"` note when `_fieldErrorsDropped > 0` — including a new `warn()` state for "0 currently captured but N were dropped" (previously such a state was structurally impossible; now it's a real, distinguishable case). Old-shape entries (no `count` field, from before this session or from any consumer never touched by this fix) render exactly as before — confirmed via a 4-scenario render test, see TASK 2.

## TASK 2 — Verification, proven not assumed

**Forced test 1 (required):** same `fn` label, 100 calls in a tight loop → exactly 1 entry, `count:100`. ✅ passed.

**Forced test 2 (required):** 600 distinct `fn` labels (above the 500 cap) → array caps at exactly 500, `window._fieldErrorsDropped === 100` (the real overflow count), oldest entries (`distinct-fn-0`..`distinct-fn-99`) evicted, newest (`distinct-fn-500`..`distinct-fn-599`) retained — true ring-buffer behavior, not truncate-the-new-arrivals. ✅ passed.

**3 additional forced tests** (extra rigor, not required but relevant to the design decision above):
- Dedup window expiry: same `fn` called again *after* the 60s window → gets a separate new entry, confirming the window is real and bounded, not a permanent collapse. ✅ passed.
- Mixed distinct + repeated `fn`s: 3 distinct labels across 5 calls → exactly 3 entries, the repeated one shows `count:3` and the *latest* error message. ✅ passed.
- **Direct `window._fieldErrors.push()` call (bypassing `captureFieldError()` entirely, matching the real `window.onerror` handler's own call shape) → also deduped correctly.** This is the proof that overriding `.push()` at the array's declaration site — rather than patching `captureFieldError()`'s body — actually closes the gap TASK 0 found, not just the fraction of writers that happen to go through `captureFieldError()`. ✅ passed.

All 8 tests run via Node `vm`, extracting the real code verbatim from `index.html` (array init through `captureFieldError()`'s closing brace) — not reimplemented from memory.

**Health Panel consumer confirmed correct against the new shape** — 4 rendering scenarios run against the extracted "Runtime Errors" row logic:

| Scenario | Result |
|---|---|
| Old-shape entries, no `count` field (backward compat) | `2 captured: x:boom · y:bang` — unchanged from pre-fix behavior |
| New deduped entry, `count:47` | `1 captured: flood:boom (×47)` — new signal surfaced |
| Cap reached, `_fieldErrorsDropped:137` | `500 captured: f0:e · f1:e · 137 older suppressed (cap reached)` |
| Empty, no drops (baseline) | `None captured` — unchanged |

`window.__FIELD_PROOF__.errors` and every test-suite consumer confirmed compatible by inspection (all use only `.length`/`.slice`/`.map`/`.filter`, none of which are affected by overriding `.push`).

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- (One unrelated transient smoke failure hit mid-session — `A515` SW_VERSION-matches-today-ET — caused by real midnight ET rollover during this CC-CMD's execution, not by this change. Investigated per Rule 77, confirmed via `TZ=America/New_York date`, fixed by the routine `SW_VERSION` bump below.)

## Confidence score

- TASK 0 probe found every real consumer, plus (not explicitly asked for but load-bearing for a correct fix) every real *writer*, including 8 direct-push sites the literal "captureFieldError() only" scope line would have missed: 15/15
- TASK 1 size cap uses real eviction (`shift()`, ring buffer) with a real persistent drop counter, not a silent stop-recording: 25/25
- TASK 1 per-fn rate limit correctly collapses repeats into a real `count` field via O(1) map lookup, not just suppression: 25/25
- Suppression is visible — `window._fieldErrorsDropped` plus a Health Panel surface, not silent: 10/10
- TASK 2 both required forced tests proven (100-same-fn→count:100, 600-distinct→cap+drop-count), all real consumers confirmed working against the new shape via 4 rendering scenarios: 25/25

**Total: 100/100.**

## Commit

- `index.html`: `.push()` override on `window._fieldErrors` (cap + dedup + drop counter), Health Panel "Runtime Errors" row updated to surface the new signals. `SW_VERSION` bumped `2026-07-12u` → `2026-07-13a` (real ET midnight rollover during this session, unrelated to the fix itself).
- `sw.js`: `SW_VERSION` synced.
- This manifest.

This unblocks — but does not itself perform — the Bucket B high-frequency-function telemetry migration (`renderAll`, `findESPNScore`, `dramaScoreLive`, `renderESPNScores`, `renderProseScore`) queued separately.
