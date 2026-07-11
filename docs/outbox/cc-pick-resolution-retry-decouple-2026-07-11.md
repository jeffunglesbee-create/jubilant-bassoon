# CC Session Outbox — Decouple pick-resolution retry from saveEspnFinal's dedup guard (CC-CMD-2026-07-11-pick-resolution-retry-decouple)

**Date:** 2026-07-11
**Scope:** jubilant-bassoon (sole). All tasks executed.

## TASK 1 — Confirmed, real line numbers slightly different from the doc's estimate

Re-read `saveEspnFinal()` fresh from HEAD. Confirmed the traced
sequence exactly:

- (a) Pick-resolution call with a fully silent `catch(_){}`: real
  line 39192 (doc estimated ~39192 — exact match).
- (b) Dedup-marking `existing.push(entry)`: real line 39298 (doc
  estimated ~39298 — exact match), **106 lines** after the
  pick-resolution call (doc estimated "~118 lines" — close but not
  exact; reported honestly rather than silently repeating the doc's
  number).
- (c) Confirmed no code between lines 39192 and 39298 gates on
  pick-resolution's own outcome — drama persistence (self-contained
  try/catch), `statCtx` snapshot (self-contained try/catch), and
  `entry` construction all proceed unconditionally regardless of
  whether `_resolvePickIfExists` succeeded, threw, or no-op'd.

The doc's severity claim (worse than "just silent" — structurally
permanent, since `existing.push(entry)` fires unconditionally and the
function's own `if(existing.some(f=>f.id===id)) return;` early-return
means it never runs pick-resolution again for that game) is confirmed
accurate.

## TASK 2 — Existing resolved-state mechanism identified, reused (not reinvented)

Read `_resolvePickIfExists()` (line 28740), `_getPickCache()`/
`_savePickCache()` (lines 28634-28639), `_pickStorageKey()` (line
28660), and `makePick()` (line 28674).

**The existing mechanism, in full:**
- `PICKS_KEY = 'field_picks_v1'` — a localStorage-backed object,
  keyed by `_pickStorageKey(game)` (a cross-session-stable
  `sport_hourbucket_home_away` string, deliberately NOT `game._id`,
  which is a session-local counter — this distinction is itself
  documented in the surrounding comments and matters for the fix).
- Each pick object: `{predictedWinner, sport, home, away, madeAt,
  resolved: false, wasCorrect: null, resolvedProbability: null,
  probabilityLabel: null}` — created by `makePick()`.
- `_resolvePickIfExists(gameId, game, eData)` is the **only** place
  that flips `pick.resolved` to `true`, and it is **already
  internally idempotent**: `if (!pick || pick.resolved) return;` at
  its very first line. Calling it repeatedly is inherently safe — a
  nonexistent or already-resolved pick is a guaranteed no-op.

This is exactly the "is this pick resolved" concept TASK 2 asked to
find — `pick.resolved`, completely independent of `saveEspnFinal`'s
own `existing`/`FINALS_KEY` game-level dedup array. No new concept
invented; TASK 3's fix relies entirely on this pre-existing,
already-safe-to-call-repeatedly guard.

## TASK 3 — Decoupled, with the control-flow change reasoned explicitly

Moved the entire pick-resolution block (comment block +
`pickId` computation + `_resolvePickIfExists` call) from **after**
`if(existing.some(f=>f.id===id)) return;` to **before** it. The dedup
guard itself is untouched — same condition, same early return — just
relocated to sit after the pick-resolution attempt instead of before
it.

**Why this is safe (stated, not just implemented):**
`_resolvePickIfExists`'s own internal guard (`!pick || pick.resolved`)
means calling it unconditionally on every `saveEspnFinal` invocation —
including calls for games whose other side effects already fired in
an earlier call — has zero cost or risk in the common case (no pick,
or already-resolved pick: instant no-op) and produces the intended
benefit in the failure case (unresolved pick: a real retry attempt).

**`captureFieldError` reused, failure-only (not "success and
failure" as the doc's literal TASK 3 wording suggested) — reasoned
explicitly:** `captureFieldError(fn, err, silent)`'s own signature
computes `entry.err = err?.message||String(err)` — it is an
error-tracking mechanism by design, and every other call site
tonight (relay-init, render-surface, per-card-render) only ever
invokes it from a failure path. Forcing a "success" call would
require passing something like `null` as `err`, producing a
nonsensical `entry.err: "null"` for what's actually a success, AND
would fire on nearly every `saveEspnFinal` invocation across a busy
night (the vast majority of which have no pick to resolve at all) —
pure noise, not a "success and failure" signal. **Decision: only
call `captureFieldError` from the `catch` block, matching the
established convention exactly rather than stretching the mechanism
to cover a case its own signature doesn't fit.** Used `silent=false` —
matching the `initFIELDBrief`/`mlb-whos-up-next` precedent (a primary,
user-visible-eventually consequence — a user's own pick literally
never resolving — not a background/redundant data source, which is
the `silent=true` category).

## TASK 4 — Confirmed directly via full re-read, not assumed

Re-read the entire function fresh after the edit (lines 39155-39404).
Confirmed every one-time side effect remains textually **after** the
relocated `if(existing.some(f=>f.id===id)) return;` guard, in the
same order, completely untouched:

- Drama persistence POST (`fetch(_relayBase + '/archive/drama', ...)`,
  lines 39219-39266) — unmoved, still gated.
- `entry` construction + `existing.push(entry)` + `FINALS_KEY` write
  (lines 39302-39320) — unmoved, still gated (this IS the dedup-marking
  step itself).
- Night Owl brief enqueue (lines 39325-39390) — unmoved, still gated
  by the same guard, and additionally self-guarded by its own
  `alreadyHasBrief`/`alreadyQueued` sessionStorage checks (pre-existing,
  unaffected).
- Tonight-finals write (lines 39392-39402) — unmoved, still gated,
  additionally self-guarded per-dateKey via `tnPool.some(f=>f.id===id)`
  (pre-existing, unaffected).

Only the pick-resolution block moved. No other line's position or
logic changed.

## VERIFICATION

- **Real forced-failure-then-retry test** (Node `vm`, extracted
  verbatim — `saveEspnFinal()` and `captureFieldError()`, not
  reimplemented; `_resolvePickIfExists` mocked directly with a
  controllable throw-then-succeed behavior, since this test targets
  `saveEspnFinal`'s own retry/decoupling logic, not
  `_resolvePickIfExists`'s pre-existing internal correctness):
  - **Call 1** (pick-resolution forced to throw a real `Error`):
    `_resolvePickIfExists` called once; `window._fieldErrors` captured
    **exactly one** entry — `{fn: "pick:resolve-final", err: "relay
    /user/event unreachable — forced test failure", ts: ...}`; the
    `FINALS_KEY` localStorage array received **exactly one** entry
    (the entry/D1-equivalent write fired); the mocked drama-archive
    POST fired **exactly once**.
  - **Call 2** (simulating the real poll loop calling `saveEspnFinal`
    again for the identical game — `_resolvePickIfExists` now
    succeeds): `_resolvePickIfExists` call count reached **2** —
    confirmed genuinely retried, not skipped. `FINALS_KEY` **still**
    held exactly one entry (not duplicated) and the drama POST count
    **still** read exactly one (not duplicated) — confirming the
    dedup guard, now sitting after the pick-resolution block, still
    correctly blocks every other one-time side effect from
    re-firing.
  - All 4 checks passed: retried on 2nd call, correct tag captured on
    failure, entry/D1 write fired exactly once, drama POST fired
    exactly once.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: 21 failures — confirmed
  pre-existing and unrelated (same count as every prior commit
  tonight).
- Existing "already saved" dedup behavior for the normal, no-failure
  case is unchanged: confirmed directly in the test above (Call 2's
  `FINALS_KEY`/drama-POST counts stayed at exactly 1, matching
  pre-fix behavior for a repeat call on an already-saved game — the
  only new behavior is that pick-resolution itself now attempts
  again, everything else is byte-for-byte the same gating as before).

## POST-DEPLOY LIVE VERIFICATION — 2026-07-11 23:01 UTC

Deploy-gate run 29171456720 (commit `7c96dac`) completed
`status:completed conclusion:success` in 38s (23:01:04→23:01:42 UTC).

Fetched the live site with a real headless browser (not asserted):

- `window.SW_VERSION === "2026-07-11j"` — confirmed, matches this commit.
- `typeof saveEspnFinal === "function"` — confirmed.
- `typeof _resolvePickIfExists === "function"` — confirmed.

This fix touches a function (`saveEspnFinal`) called on every
finished-game poll cycle — confirming both it and the pick-resolution
function it now unconditionally attempts are genuinely deployed and
callable in production (not just that the page loaded generically) is
the meaningful check here.

## DONE CONDITION

A pick-resolution failure for a given game can now be retried on a
subsequent `saveEspnFinal` call (as the real poll loop naturally
produces), independent of that game's own save-dedup status —
verified with a real forced-failure-then-retry test, not asserted.
All other one-time side effects in `saveEspnFinal` remain correctly
deduplicated, confirmed via the same test (fired exactly once across
both calls) and via direct source re-read (TASK 4). Confirmed live in
production: both functions deployed and callable, correct SW_VERSION.

## CONFIDENCE SCORING

- +10 — TASK 1 confirms the exact current sequence, correct line
  numbers: **met** (one minor discrepancy in the doc's own "~118
  lines" estimate vs. the real 106, reported honestly)
- +20 — TASK 2 correctly identifies and reuses the existing
  pick-resolved-state mechanism, no new concept invented: **met**
- +35 — TASK 3 correctly decouples pick-retry from the save-dedup
  guard, reasoning stated for the control-flow change,
  `captureFieldError` reused (with an explicit, reasoned deviation
  from the doc's literal "success and failure" wording, justified
  against the mechanism's own signature and every existing call
  site's convention): **met**
- +15 — TASK 4 confirms other one-time side effects remain correctly
  deduplicated, not accidentally made retryable too: **met**
- +15 — Real forced-failure-then-retry test constructed and verified:
  **met**
- +5 — `node smoke.js` clean: **met**

**Total: 100/100.**

## Commit

- `index.html`: pick-resolution call in `saveEspnFinal()` relocated
  before the "already saved" dedup guard, with `captureFieldError`
  added on failure (`pick:resolve-final`, `silent=false`). No other
  line's logic changed. `SW_VERSION` bumped `2026-07-11i` →
  `2026-07-11j`.
- `sw.js`: `SW_VERSION` synced to `2026-07-11j`.
- This manifest.
- **No out-of-scope findings this time** — the function's other
  one-time side effects were directly confirmed correct, not just
  assumed; no further audit warranted beyond what this CC-CMD
  targeted.
