# CC Session Outbox — Reduce Re-render Overhead (CC-CMD-2026-07-06-reduce-rerender-overhead)

**Date:** 2026-07-06
**Scope:** `docs/CC-CMD-2026-07-06-reduce-rerender-overhead.md` — hoist two
static object literals out of `renderAll`, and make the sort comparator's
circadian-tier lookup cache-first.

## PROBE BLOCK

All three citations re-confirmed exactly matching the CC-CMD's own
snapshot before editing.

## FINDING 1 — Static lookup tables hoisted to module scope

`_MLB_NAME_ABBR` (declared inside `renderAll`, rebuilt every call) and
`_CIRCADIAN_SORT_RANK` (declared inside the per-section loop, rebuilt
once per sport section every render) both hoisted to module scope, right
after `_cardStringCache`'s own declaration.

**Byte-identical confirmed via `git diff`**: the diff shows only
relocation and re-indentation for `_MLB_NAME_ABBR`'s 30 key/value pairs —
zero value changes. Both usage sites (`_MLB_NAME_ABBR[g.home]`/
`_MLB_NAME_ABBR[g.away]`, both inside `renderAll`) confirmed still
resolve correctly since module-scope `const` is visible from anywhere,
including inside the function it used to be declared in.

## FINDING 2 — Cache-first circadian tier lookup for the sort comparator

Added `circadianTier` to the existing `_cardStringCache` entry shape
(alongside `fingerprint`/`html`/`circInput`) and a new module-scope
`getCachedCircadianTier(g)` helper matching the CC-CMD's own code sample
exactly: checks `_cardStringCache` for a fingerprint match first, only
calling `findESPNScore`+`getCardCircadian` on a genuine cache miss. The
sort comparator now calls this helper instead of recomputing inline. The
`.sort()` call itself was left completely unconditional, per the CC-CMD's
explicit "what NOT to change" — only the per-game tier *computation* is
cached, not the sort's execution, since relative ordering can change even
when no individual card's fingerprint changed (e.g. a game entering PRIME
as its start time approaches).

## Verification

`node smoke.js index.html`: **890 passed, 0 failed**, no regressions (this
CC-CMD's own DONE CONDITIONS don't call for a new dedicated assertion).
Inline `<script>` blocks syntax-checked via `new Function()`.

**Real instrumentation, run twice, for two different reasons:**

1. **Before committing**, against the live (pre-fix) app's 11 real games:
   injected a verbatim copy of the new `getCachedCircadianTier` logic
   into a temporary, isolated test cache (never touching committed
   source — there is nothing to "remove before commit" because it was
   never added to it). Three passes: cold cache → 0 hits / 11 misses;
   identical games re-checked → **11 hits / 0 misses**; one game mutated
   → 10 hits / 1 miss (correctly distinguishes changed from unchanged).

2. **After deploying** (SW_VERSION `2026-07-06c`, confirmed live), tested
   the *actual, real, shipped* `getCachedCircadianTier` function against
   the *actual, real* `_cardStringCache` — no copies. First attempt
   showed 12 recompute calls (i.e. the live cache appeared to miss for
   every real game). Investigated rather than assumed a bug (per Rule
   77): compared cached vs. current fingerprints directly and found real
   content differences, not a defect — e.g. `espn_pga_401811954`'s
   fingerprint grew from 356 to 980 characters, clearly a genuine golf
   leaderboard update that happened during the real gap between page
   boot (when the cache was first populated) and this later check. The
   cache was correctly invalidating on real, ongoing data changes — not
   failing to hit. Re-tested with a synchronous, zero-time-gap
   population-then-check pass (eliminating any window for background
   polling to mutate game objects in between): **0 recompute calls**
   across all 12 real games — 100% cache-hit rate when nothing has
   actually changed, confirmed against the real shipped code.

Both the isolated copy-based test and the real-function live test agree:
unchanged cards genuinely skip `findESPNScore`+`getCardCircadian`
recomputation, and changed cards correctly still recompute.

## DONE CONDITIONS

- [x] Probe block confirms all citations before editing
- [x] `_MLB_NAME_ABBR` and `_CIRCADIAN_SORT_RANK` hoisted to module scope, content unchanged (confirmed via `git diff`)
- [x] `circadianTier` added to the cache entry shape and used by the sort comparator via a cache-first helper
- [x] Confirmed via temporary instrumentation (never touched committed source) that unchanged cards skip recomputation — verified twice, against both an isolated copy and the real shipped function/cache post-deploy
- [x] `.sort()` itself still runs unconditionally — confirmed via `git diff`, no conditional guard added around the call
- [x] Smoke clean (890/0)
- [x] Outbox written (this document)

## Confidence scoring (per the CC-CMD's own table)

- +25 — both object literals hoisted correctly, byte-identical content (confirmed via diff)
- +35 — sort-key caching implemented correctly, cache-first helper used in the comparator
- +20 — verified via real instrumentation that cache hits actually skip recomputation — done twice, including against the real deployed function and cache post-deploy, with an honest investigation of an initially-confusing result that turned out to be correct invalidation behavior, not a bug
- +10 — `.sort()` confirmed still unconditional
- +10 — smoke clean, no regressions

**Total: 100/100.**

## Commit

- `6eb47a0` — both findings, SW_VERSION `2026-07-06b` → `c`
- This manifest
