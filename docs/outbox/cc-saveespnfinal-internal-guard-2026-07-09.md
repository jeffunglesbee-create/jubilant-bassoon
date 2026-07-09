# CC Session Outbox — saveEspnFinal() Internal Guard (CC-CMD-2026-07-09-saveespnfinal-internal-guard)

**Date:** 2026-07-09
**Scope:** `saveEspnFinal(game, eData)` trusted whatever `eData` it was
handed unconditionally, for pick resolution, drama-peak lookup, and D1
archive writes — safe today only because its callers happen to already
verify via `findEspnEntry()` first, a by-convention guarantee the function
itself never enforced.

## A real gap in the CC-CMD's own premise, found by following its own probe instruction

The CC-CMD named "two known callers" (`checkForNewFinals()`,
`renderNightOwlRecap()`'s fallback). The probe block explicitly instructed
re-confirming every real call site and revisiting the premise if a third
existed, rather than assuming it still held. It did not: a **third real
caller** exists at `index.html` ~22614, inside a MutationObserver-driven
DOM-fallback path ("Build finals directly from DOM — no ESPN chain
needed"). Its `syntheticEData` is built directly from `card.dataset`/
`previousScores` — never touches `espnScores` at all, and is therefore
**not** pre-verified the way the two named callers are.

This directly shaped the guard's design (see below): the CC-CMD offered
two implementation options — call `findEspnEntry(game)` again and require
an exact match, or extract the equivalent check as a standalone function.
The first option would have **incorrectly rejected this genuinely
legitimate third caller**, since its `eData` was never sourced from
`espnScores` and calling `findEspnEntry(game)` would search a completely
different data source. Confirmed this via direct inspection before
choosing — not assumed either option was safe.

## PROBE BLOCK

Full call-site sweep (not stopping at the two named ones):
- `index.html` ~22614 — DOM-fallback observer, `syntheticEData` (newly
  found, not pre-verified)
- `index.html` ~40714 — `renderNightOwlRecap()` fallback, `eData =
  findEspnEntry(game)` (pre-verified)
- `index.html` ~41108 — CFL, `saveEspnFinal(game, game)` (same-object,
  bypasses verification by construction)
- `index.html` ~41157 — `checkForNewFinals()` main path, `eData =
  findEspnEntry(game)` (pre-verified)

No fifth caller exists — confirmed via a literal-call sweep excluding
comments/definition.

`findEspnEntry(game, {requireSameDate=true})` read in full: matches
`espnScores` entries by home/away nickname suffix (last 6 chars,
alpha-stripped, lowercased) and applies a stale-final guard (rejects a
`state==='post'` match if `game.start_time` is still in the future).

## TASK 1 — Guard built from what actually exists, not the doc's invented `verifyEspnCandidate()`

New `_eDataMatchesGame(game, eData)` (`index.html`, immediately before
`saveEspnFinal`): the **same** home/away/date-compatibility logic
`findEspnEntry()` uses, but as a standalone check against an
**already-given** `eData` object — not a fresh `espnScores` search. Works
identically whether `eData` came from `espnScores` (the two pre-verified
callers) or was built synthetically from DOM data (the newly-found third
caller), since it only inspects `eData`'s own `homeName`/`awayName`/
`state` fields, regardless of source.

`findEspnEntry()` itself is **untouched** — it has multiple other,
already-tested consumers (`checkForNewFinals`, `injectDramaBadges`,
`buildDramaLineTiers`, the Night Owl fallback's own primary lookup), and
refactoring it was neither asked for nor needed to fix this. The two
functions share the same matching *logic*, deliberately not the same
*implementation* — `findEspnEntry` searches-and-selects from `espnScores`;
`_eDataMatchesGame` validates an already-selected candidate from any
source. Genuinely different responsibilities, not the kind of
independently-drifting duplicate the sport-label-matching CC-CMD fixed
the day before.

Guard placed as the first statement inside `saveEspnFinal`'s `try` block:
`eData !== game` (CFL carve-out, exact reference equality) `&&
!_eDataMatchesGame(game, eData)` → `console.warn` (gated on
`FIELD_DEBUG`, matching this codebase's existing convention) → `return
false`. No other code path's return behavior touched — the pre-existing
dedup-skip (`if(existing.some(...)) return;`) and successful-completion
paths still return `undefined` exactly as before; only the new rejection
path is distinguishable via `=== false`.

## TASK 2 — Caller adjustments, scoped to where rejection can actually matter

- **DOM-fallback (the newly-found third caller, ~22614)**: adjusted —
  `domFinalsAdded++` now only increments when the save wasn't rejected
  (`!== false`). This is the one call site where the guard's rejection is
  reachable in practice, since its `eData` is genuinely unverified before
  this fix.
- **`renderNightOwlRecap()` fallback (~40714)**: adjusted per the CC-CMD's
  own explicit example — `finals.push(...)` (building the in-memory recap
  entry) now gated on the save not being rejected. In practice this
  caller's `eData` is already `findEspnEntry()`-verified, so rejection
  here should never actually fire — the adjustment is defense-in-depth,
  keeping the in-memory recap consistent with what was actually persisted
  rather than assuming it always will be.
- **`checkForNewFinals()` main path (~41157)**: **checked, confirmed no
  adjustment needed.** `renderNightOwlRecap()` fires immediately after —
  but it's an independent "refresh the recap display" call that reads
  from `loadTonightFinals()` (localStorage), not follow-up logic that
  consumes *this specific* save's outcome. Calling it regardless of
  rejection is already correct, not an oversight to fix.
- **CFL (~41108)**: no adjustment — `eData === game` always bypasses the
  guard by construction, confirmed via the reference-equality check.

## VERIFICATION (Node `vm`, actual extracted committed function source)

Five cases, all real, not reasoned about:

1. **Mismatched teams** (`Yankees/Red Sox` game, `Dodgers/Rockies`
   `eData`) → `saveEspnFinal` returns `false`; `FINALS_KEY` entry count
   unchanged (0→0); the rejected game's `id` confirmed absent via a fresh
   read of stored data, not inferred from the return value alone; **pick
   resolution spy confirms zero calls** — satisfying the CC-CMD's explicit
   "does not write to FINALS_KEY or trigger pick resolution" requirement
   precisely, both halves independently checked.
2. **Same teams, future `start_time`** (stale-final guard case) →
   rejected, confirming the date-compatibility half of the extracted
   logic works, not just the name-matching half.
3. **Correctly matched real data** → returns non-`false`; a fresh read of
   `FINALS_KEY` confirms a real entry was written with the correct scores
   (10–4); **pick resolution spy confirms exactly one call** — the
   contrasting positive case to #1.
4. **CFL same-object case** (`saveEspnFinal(cflGame, cflGame)`) → the
   guard is bypassed entirely (not merely "passes" — literally never
   evaluated, confirmed by construction of the `eData !== game` check);
   fresh read confirms the entry was written correctly (27–20).
5. **`_eDataMatchesGame` direct unit checks** — real nickname-suffix
   matching ("New York Yankees" vs "Yankees"), null-safety on both `game`
   and `eData`.

All 5 pass. `node smoke.js index.html`: 899/0 (unchanged from before this
CC-CMD — no new assertions requested or added here). `node
field_unit.js`: 66/0. `node field_smoke.js index.html`: 21 failures,
matches the documented pre-existing baseline. Both inline `<script>`
blocks syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Guard added, built from `findEspnEntry`'s real existing logic —
      no reference to a `verifyEspnCandidate()` function; confirmed via
      probe that function doesn't exist anywhere in this codebase
- [x] CFL same-object carve-out confirmed preserved via a real test
      (Test 4), not just read as "should work"
- [x] Both named callers confirmed correctly handled — one genuinely
      needed adjustment (per the CC-CMD's own example), the other
      confirmed correct as-is with stated reasoning, not silently skipped
- [x] A real, previously-unknown third caller found via the probe's own
      instruction, its design implications incorporated into the guard
      (extraction over `findEspnEntry(game)`-comparison), and its own
      caller-adjustment need addressed — not left as an unaddressed gap
      just because the CC-CMD's literal TASK 2 text didn't name it
- [x] Live test proves both a real rejection (nothing written, pick
      resolution not triggered) and a real success (CFL case included),
      each verified via fresh reads of actual stored data

## CONFIDENCE SCORING

- +35 — guard correctly built from real existing logic, no invented
  helper; the choice between the CC-CMD's two offered implementation
  options was made based on real investigation (the third caller), not
  arbitrarily: **met**
- +20 — CFL same-object carve-out confirmed preserved via a real test
  (Test 4, fresh stored-data read): **met**
- +20 — both named callers confirmed to handle `false` correctly (one
  adjusted, one confirmed already-correct with stated reasoning); the
  additionally-discovered third caller's handling also addressed, going
  beyond the CC-CMD's literal text where its own premise was incomplete:
  **met**
- +25 — live test proves both rejection and success with real stored-data
  checks (Tests 1/3), including the specific "no pick resolution
  triggered on rejection" requirement independently verified via a spy,
  not inferred: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-09d` → `2026-07-09e`.
- `index.html`: `_eDataMatchesGame` added; `saveEspnFinal` gains the
  internal guard; two callers adjusted (DOM-fallback, `renderNightOwlRecap`
  fallback); `checkForNewFinals`/CFL confirmed correct as-is.
- This manifest.
