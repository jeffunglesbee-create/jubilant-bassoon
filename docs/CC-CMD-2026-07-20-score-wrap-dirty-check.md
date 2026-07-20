# CC-CMD: Score-wrap dirty-check — skip rebuild+replace when the score hasn't changed

**Date:** 2026-07-20
**Scope:** jubilant-bassoon only
**Follow-up to:** CC-CMD-2026-07-20-solid-3-score-overlay-respec.md (which
blocked CC-CMD-2026-07-19-solid-3-score-overlay.md, confidence ~5/100,
never executed).

## Why this CC-CMD exists, and why it is NOT a Solid rewrite

The original CC-CMD's stated goal — avoid rebuilding the score display on
every poll cycle when the score hasn't actually changed — is real and
worth fixing. Its own execution plan (a Solid overlay wrapping
`buildSafeScoreWrap()`'s output) is not, for reasons detailed in the
respec doc: it targeted the wrong function (`renderAll` instead of the
real `renderESPNScores()`, which has 15+ real trigger call sites), used a
card-identifying attribute that doesn't exist on real cards (`data-gid`
instead of `data-gameid`), and — most importantly — `buildSafeScoreWrap()`
builds a genuinely rich, multi-part structure (leader/trailer spans with a
dynamically side-swapping CSS class, a separator, a period-label that is
itself HTML, an optional status line, caller-supplied situational HTML)
that a single-signal `<span>{score()}</span>` component doesn't model.

Further investigation (this doc) found one more real complication: the
RAI (Roster Advantage Indicator) line that `_raiRehydrateScoreWrap`
re-appends after every replace is populated by `fetchRosterAdvantage()`
(`field.js:33864`), an independent `async` fetch awaited elsewhere
(`field.js:34250`) — meaning RAI data can arrive well after a card's
score-wrap was first built, on its own unpredictable timeline. A Solid
overlay would need a second, independent update channel for the RAI line
(not just a score signal) to preserve this behavior, which is a real,
non-trivial design question, not a corner case to hand-wave.

Given `renderESPNScores()`'s traffic (15+ real trigger sites) and that
this is the single most load-bearing visual element in the app, the
right-sized fix for what's actually broken (unconditional rebuild+replace
regardless of whether the score changed) is a small, low-risk **dirty
check** — the same pattern already proven in production for the ambient
panel (`panel.dataset.lastAp!==_apHTML`, `field.js`, pre-Solid-2-rewrite
version) — not a new reactive subsystem. The full Solid-overlay
conversion is named, not built, as a separate follow-up below, to be
picked up only if this smaller fix's real impact turns out insufficient.

## Do NOT Touch

`buildSafeScoreWrap()`'s internal logic (its 4 fallback layers), the
`.score-flash` animation trigger, `_raiRehydrateScoreWrap()`, any
function other than `renderESPNScores()`'s existing score-wrap
insert/replace block (`field.js`, near line 19310-19350 as of `9ed33796`
— re-confirm the real, current line numbers before editing, this file
changes often).

## Pre-Build Probe (run FIRST — re-verify against current HEAD)

```bash
git log --oneline -5
grep -n "function renderESPNScores" src/legacy/field.js
sed -n '/Story Score — defensive build via buildSafeScoreWrap/,/previousScores\[scoreKey+"_sl"\] = _n.scoreline;/p' src/legacy/field.js
```

Confirm the real, current shape of the `wrapEl` branch (creation vs.
replace) before editing — this doc's line numbers are from `9ed33796` and
will have drifted.

## Task 1 — Add a score-content dirty check

In the `if(wrapEl){ ... }` branch (real, current location confirmed via
probe), the existing code already computes `_n.scoreline` and compares it
via `previousScores[scoreKey+"_sl"]` to decide whether to trigger the
`.score-flash` animation — but it calls `buildSafeScoreWrap()` and does
`wrapEl.replaceWith(newWrap)` **unconditionally**, before that comparison
even happens. Real fix: hoist the scoreline comparison earlier and skip
the entire rebuild+replace (not just the flash class) when nothing
relevant changed. "Relevant" must cover more than the raw score number —
period/status text and situational HTML (outs, base runners, situation
badges) all live inside or alongside `scoreHTML`, so the real, honest
dirty-check key must be the **full `scoreHTML` string**, not just
`_n.scoreline` (a narrower key would silently skip real period/status
updates while the score number happens to stay the same — e.g., a
"halftime → 3rd quarter" transition with an unchanged score).

Real, minimal change:
```javascript
// Story Score — defensive build via buildSafeScoreWrap (never blank for live/final)
const scoreHTML = buildSafeScoreWrap(game, score, _sc, sitHTML);

// ... existing situation-badge block unchanged ...

const wrapEl = card.querySelector(".score-wrap");
const scoreKey = game._id;
const prevHTML = previousScores[scoreKey+"_html"];
if (wrapEl && prevHTML === scoreHTML) {
  // Real, honest no-op: nothing in the score display actually changed
  // since the last pass. Skip the rebuild+replace entirely — this is the
  // actual fix for the unconditional-rebuild-every-poll problem, without
  // introducing a new reactive subsystem.
  previousScores[scoreKey+"_sl"] = _n.scoreline;
} else if (wrapEl) {
  // existing replace branch, unchanged, plus:
  previousScores[scoreKey+"_html"] = scoreHTML;
} else {
  // existing fresh-insert branch, unchanged, plus:
  previousScores[scoreKey+"_html"] = scoreHTML;
}
```

Do not remove or change the existing `previousScores[scoreKey+"_sl"]`
scoreline tracking (still needed for the flash-animation decision on
passes where content *did* change) — this adds a second, coarser-grained
key alongside it.

## Task 2 — Real, direct verification

```bash
node smoke.js index.html 2>&1 | tail -3
```
Confirm current real count (962/0 as of `9ed33796`, will drift — check
current, don't assume).

Forced-condition test (vm-extracted, matching this session's established
pattern): mock `card.querySelector('.score-wrap')` to return a stub
element, call the score-render path twice with **identical** `game`/
`score` inputs, assert `replaceWith` was called on the first pass and NOT
called on the second. Then call a third time with a **changed**
`score.homeScore`, assert `replaceWith` **was** called (proves the dirty
check doesn't silently swallow real changes).

## Explicitly out of scope for this CC-CMD (name, don't build)

**Full Solid-overlay conversion of the score display** — the original
CC-CMD's actual goal (reactive, sub-DOM-node score updates instead of
whole-`.score-wrap` replacement even on real changes). Real prerequisites
before this is safely buildable, established by this investigation:
1. A real Solid component design that models `buildSafeScoreWrap()`'s
   actual output — leader/trailer spans with a dynamically side-swapping
   `score-leader` class, separator, a period-label that switches between
   halftime/live/final real markup (not a plain string), optional status
   line, and a slot for caller-supplied situational HTML.
2. An explicit design decision for the RAI line's independent async
   update channel (`fetchRosterAdvantage()` resolves on its own timeline,
   separate from the score poll cycle) — a second signal/setter per game,
   not folded into the score signal.
3. Given `renderESPNScores()`'s 15+ real trigger call sites and that this
   is the single most load-bearing visual element in the app, explicit
   scope sign-off before implementation, per CLAUDE.md Rule 9/13 — this
   is a materially higher-risk change than the ambient panel's own Solid
   conversion (CC-CMD-2026-07-20-solid-2-rewrite.md, already shipped).

## Done Condition

Real dirty check in place; two consecutive identical-content passes for
the same game produce exactly one `.score-wrap` rebuild+replace, not two;
a genuinely changed pass still replaces. Smoke passing at current real
count. `git branch --show-current` → `main`.

**Confidence scoring:**
- Task 1 (60 pts): real, correct dirty-check key (full `scoreHTML`, not
  just scoreline), existing flash-animation and RAI-rehydration behavior
  unchanged on passes where content *does* change
- Task 2 (40 pts): real forced-condition test proving both the skip case
  and the real-change case, smoke passing at current count

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
