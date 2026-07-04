# CC Outbox — Generalized Card-Attribute Sync Registry (Phase 1)

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-card-attribute-sync-registry.md
**Commits:** ace7c2e (implementation), d334193 (shrink probe result)
**Deploy:** Deploy gate run 28693874381 — succeeded

---

## Probe block — run before any edit, as instructed

All three probe items re-checked live, **zero drift from the doc's
citations**:

```
grep -n "^function renderESPNScores" index.html   → 20960 (doc: 20960-21395)
grep -c mutation sites, scoped to that range       → 26 (doc: 26)
grep -n "_newCircadian" index.html                 → 21127-21135 (doc: ~21127-21135)
```

The doc's function-boundary claim (20960-21395) and mutation-site count
(26) were verified by scoping the grep to that exact line range, not
just counting file-wide (which returns 177 — a different, unrelated
number covering every `card.`-prefixed mutation across the whole file).

## What this CC-CMD generalizes

Three ad-hoc per-card DOM mutation patterns existed inside
`renderESPNScores()`: `espn-live`/`espn-final` toggling, `.score-wrap`
content patching, and v2.3's circadian refresh (the newest, and the only
one already shaped as compute→compare→mutate). This CC-CMD adds
`CARD_ATTRIBUTE_SYNC` + `syncCardAttributes()` and migrates **only**
circadian into it — the proof case, lowest risk since it's newest and
already correctly shaped.

## Implementation

- `CARD_ATTRIBUTE_SYNC` (array) + `syncCardAttributes(card, game, score,
  isLive, isFinal)` — added immediately before `function
  renderESPNScores(){` (index.html ~20960), alongside
  `_raiRehydrateScoreWrap`, its other closely-related helper. Declared
  once at module scope, not re-created on every `renderESPNScores()`
  call (which fires on every live-score poll).
- v2.3's inline block (index.html 21127-21135) replaced with the
  one-line call `syncCardAttributes(card, game, score, isLive, isFinal);`

## Verified this was a true pure refactor, not assumed

Traced all three branches of the old inline block against the new
registry's `compute`/`syncCardAttributes` logic before replacing:

| Case | Old behavior | New behavior | Match |
|---|---|---|---|
| `isFinal=true` | `getCardCircadian({state:'post',...})`, mutate if changed | same `compute` result, same `if (newVal===current) continue` gate | Identical |
| `isLive=true` | `'PRIME'`, mutate if changed | same | Identical |
| neither | `card.dataset.circadian` (possibly `undefined`), skip if falsy or unchanged | `compute` returns `card.dataset.circadian \|\| null`; `syncCardAttributes` skips on `null` or on-unchanged | Identical — `card.dataset.circadian` is never an empty string in practice (always undefined or a real circadian value), so `\|\| null` is a no-op transformation of the same falsy check |

## A real regression this CC-CMD's own Task 3 didn't anticipate — found and fixed

`A-CIRCADIAN-10` (added in the prior v2.3 pass) checked for the literal
`_newCircadian` substring appearing within 1200 characters of the
`espn-live`/`espn-final` class-removal line. This pure refactor
correctly *removes* that substring from that location (it now lives
inside `CARD_ATTRIBUTE_SYNC`'s `compute` function, elsewhere in the
file) — so running smoke immediately after the refactor produced a real
failure: `A-CIRCADIAN-10` went red on genuinely correct code. Confirmed
this via direct execution, not assumed. Fixed by updating the assertion
to check the new firing point (`syncCardAttributes(card, game, score,
isLive, isFinal)` at the same location) and separately verify
`CARD_ATTRIBUTE_SYNC`'s circadian entry still contains the equivalent
`getCardCircadian({state:'post'`/`'PRIME'`/`card.dataset.circadian`
logic — preserving the assertion's original intent rather than deleting
it or leaving it broken.

## Smoke assertions

3 new: `A-CARDSYNC-1` (`syncCardAttributes` exists), `A-CARDSYNC-2`
(`CARD_ATTRIBUTE_SYNC` is a non-empty array — executed via extraction +
`new Function()`, not just presence-checked), `A-CARDSYNC-3` (circadian
registered with `isClass:true` and a real `compute` function). Plus the
`A-CIRCADIAN-10` fix above.

`node smoke.js index.html`: **839 passed, 0 failed** (836 baseline + 3
new, with `A-CIRCADIAN-10` updated in place rather than counted as new).

## SW_VERSION

Bumped to **`2026-07-03e`** — checked real system time again
(23:42 ET July 3 at commit time, not assumed); `d` was already used
earlier this same ET day for the v2.3 commit.

## CC-verifiable confidence score (per the doc's own rubric)

- **+25** — Registry + apply function added exactly as specified,
  `node --check`-equivalent full-script `new Function()` syntax check clean
- **+25** — v2.3's block correctly replaced with a one-line call —
  verified behavior-identical across all three branches (table above),
  not just "compiles"
- **+25** — Smoke 3/3 new assertions green, plus the regression in
  `A-CIRCADIAN-10` caught and fixed (839/0 total)
- **+25** — CI confirms deployed (Deploy gate run 28693874381,
  succeeded); diff review confirmed zero unrelated changes — only the
  registry addition, the one-line replacement, smoke, and SW_VERSION

**Total: 100/100.** Committed.

## Live bundle re-verified directly

Fourth use of this pattern this session (via `workflow_dispatch`, since
the push-trigger file's URL was already correct from the prior probe):

```
16813: const CARD_ATTRIBUTE_SYNC = [
16823: function syncCardAttributes(card, game, score, isLive, isFinal) {
16967: syncCardAttributes(card, game, score, isLive, isFinal);
```

The third match confirms the actual call site inside
`renderESPNScores()` was replaced, not just that the registry exists
unused. `SW_VERSION = '2026-07-03e'` confirms this exact commit is
deployed. Full response (31,265 lines) not kept verbatim — replaced with
the extracted finding in `outbox/cf-result-20260704T034409Z.txt`.

## Phase 2 explicitly NOT attempted

Per the CC-CMD's own PHASE 2 NOTE: reducing `renderAll()`'s 690-node/
77KB full-rebuild cost is a real, separate problem that needs a
read-only investigation first — mapping every place `renderAll`'s
per-game output depends on data outside the `game` object itself
(`MY_TEAMS`, `pinnedIds`, `_gameImportance`, and likely others not yet
enumerated) before any "skip unchanged games" diff logic could be
written safely. A naive diff keyed only on `game._id` would miss those
dependencies and reintroduce a stale-render bug from a different angle
than the one v2.3 just fixed. Not attempted here — this pass only
generalized the existing targeted-patch pattern (Phase 1), it did not
touch when patches happen or attempt to reduce the full-rebuild cost.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] **Real live verification that circadian classification still
      refreshes correctly through the registry** — same DOM-refresh-
      over-time check v2.3 itself still has open, now re-scoped to
      confirm the refactor didn't silently regress it. This sandbox has
      no way to hold a live page open across a polling interval and
      observe the DOM mutate; the static live-bundle probe above
      confirms the code shipped correctly and matches the verified pure
      refactor, but cannot substitute for watching a real poll cycle
      fire through `syncCardAttributes`.

---

## Done Conditions

- [x] Probe block re-run, line numbers/counts reconciled with the doc
      (zero drift on all three)
- [x] `CARD_ATTRIBUTE_SYNC`/`syncCardAttributes` added exactly as specified
- [x] v2.3's inline block replaced with the one-line call — verified as
      a pure refactor via independent branch-by-branch tracing, not
      assumed
- [x] `node smoke.js index.html` exits 0, all 3 new assertions green
      (839/0 total) — plus a real regression in the pre-existing
      `A-CIRCADIAN-10` found and fixed rather than left broken
- [x] CI confirms `syncCardAttributes`/`CARD_ATTRIBUTE_SYNC` exist in the
      deployed bundle — verified directly via live-URL probe, including
      confirming the call site itself, not just the registry's existence
- [x] SW_VERSION bumped in `index.html` and `sw.js` (`2026-07-03e`,
      ET-correct, re-verified)
- [x] Outbox manifest written (this file), explicitly stating Phase 2
      was NOT attempted and why
