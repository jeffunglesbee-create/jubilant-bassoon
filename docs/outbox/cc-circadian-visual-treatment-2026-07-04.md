# CC Outbox — Circadian Visual Treatment (PRIME/PREVIEW/NIGHT)

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-circadian-visual-treatment.md
**Commits:** 8d8357d (implementation), 5662ed2 (shrink probe result)
**Deploy:** Deploy gate run 28696454937 — succeeded; Chrome Viewport
Audit (28696454917) and Safari Viewport Audit (28696454931) also
succeeded

---

## Probe block — run before any edit, as instructed

All four items re-checked live:

```
grep -n "\.game-card\.circadian-late{opacity" index.html          → 689 (doc: ~689)
grep -n "\.card-accent{background" index.html                     → 704-706 (doc: ~704-706), plus 1624/1687 (unrelated !important rules, 1845-1846
grep -n espn-live/espn-final .card-accent                         → 1845-1846 (doc: cited exactly)
grep -n "^\s*--live:\|^\s*--gold:\|^\s*--edge2:\|^\s*--drama-watch:" → --live/--gold/--edge2 matched; --drama-watch did NOT match this pattern
```

**Found and reported a minor inaccuracy in the doc's own probe
command:** `--drama-watch` is real and its value (`#4a9eff`) matches
the doc's stated design assumption exactly, but it's declared packed on
one line with `--drama-must`/`--drama-low` (`--drama-must:#c9a84c;
--drama-watch:#4a9eff;--drama-low:#6a6a8a;`, line 98) rather than on its
own line — so the doc's `^\s*--drama-watch:` anchor doesn't match it.
Found via a broader unanchored search. Doesn't block anything since the
real value matches the design assumption; reported for honesty, same
category as the `_seenFinals let vs const` note from an earlier CC-CMD
this session.

**All four token values confirmed exactly as the doc assumed:**
`--live:#ff3b3b`, `--gold:#c9a84c`, `--drama-watch:#4a9eff`, `--edge2`
exists (`#ffffff1c`). `.espn-final .card-accent` confirmed at
`#3a3a4a`. All five colors (red, gold/tan, blue, near-transparent white,
dark gray) are genuinely visually distinct from each other, confirming
the design's core assumption holds.

## A real contradiction in the CC-CMD found and fixed before committing

TASK 1's literal instruction said to insert the three new rules
"immediately after the `.circadian-late` rule (keeping all circadian
rules grouped together for readability)" — i.e., near index.html line
689. But the doc's own CONTEXT section states, as a load-bearing
requirement: *"Placing the circadian rules AFTER the existing
espn-live/espn-final rules in source order means circadian wins the
cascade when both apply to the same card... deliberate, not an
accident."* Since `.espn-live`/`.espn-final .card-accent` live at lines
1845-1846 — over a thousand lines AFTER line 689 — literally following
the "insert near `.circadian-late`" placement would have put the new
circadian rules **before** espn-live/espn-final in source order. CSS
resolves same-specificity ties (`.game-card.X .card-accent`, identical
specificity on both sides) by source order — later wins. Placing near
689 would have let the slower, less-accurate ESPN signal silently win
the cascade for MLB, the exact opposite of this CC-CMD's stated purpose.

I made this mistake myself on the first attempt (inserted at line 689),
caught it via `git diff` review before running smoke or committing,
reverted cleanly (confirmed zero diff after revert), and re-implemented
at the position that actually satisfies the cascade requirement:
immediately after `.game-card.espn-final .card-accent{background:
#3a3a4a}` (line 1846). Verified via `grep -n` that these are now the
**last** `.card-accent` background-setting rules in the file for the
espn-live/espn-final/circadian-* classes (the two `!important` rules at
1624/1687 are for unrelated classes — `.rival-card`/`.free-tonight-card`
— and correctly still win via `!important` regardless, which is
pre-existing, untouched behavior).

## Implementation

3 CSS rules added at index.html ~1847-1849 (after `.espn-final
.card-accent`):
```css
.game-card.circadian-prime .card-accent{background:var(--live)}
.game-card.circadian-preview .card-accent{background:var(--gold)}
.game-card.circadian-night .card-accent{background:var(--drama-watch)}
```
`.circadian-late`'s existing rule (line 689) was not touched. Only
pre-existing tokens used — no new colors invented.

## Smoke assertions

4 total: the 3 the CC-CMD specified (`A-CIRCVIS-1/2/3` — one per
circadian class's exact rule text), plus a 4th I added beyond the
literal ask: `A-CIRCVIS-4`, a cascade-order regression guard checking
`circPrimeIdx > espnFinalIdx` in the raw file text. This directly
encodes the near-miss described above — a future edit that
accidentally moves the circadian rules earlier than espn-final's would
fail this assertion, not just silently regress the visual behavior.
Given the explicit user instruction this turn to "preserve the cascade
order" as a hard requirement, and given I personally almost violated it,
this felt like a necessary addition rather than scope creep — flagging
it explicitly rather than silently going beyond the doc's literal Task 2
snippet.

`node smoke.js index.html`: **852 passed, 0 failed** (848 baseline + 4
new).

## SW_VERSION

Bumped to **`2026-07-04c`** — checked real system time again (01:34 EDT
July 4 at commit time); `b` was already used earlier today for the
card-dom-reconciliation-phase2 commit.

## CC-verifiable confidence score (per the doc's own rubric)

- **+30** — 3 CSS rules added exactly as specified, in the
  **genuinely correct** cascade position (not the position literally
  suggested by the adjacent-placement note, which would have been
  wrong) — verified via `grep -n` showing them as the last
  `.card-accent` rules for the relevant classes
- **+30** — Confirmed via code read: only `--live`/`--gold`/
  `--drama-watch` (all pre-existing) used, no new colors invented
- **+20** — Smoke 4/4 new assertions green (852/0 total)
- **+20** — CI confirms deployed (Deploy gate run 28696454937,
  succeeded); both viewport-audit CI jobs (Chrome, Safari) also
  succeeded, directly relevant given this is a visual CSS change

**Total: 100/100.** Committed.

## Live bundle re-verified directly

Seventh use of this pattern this session (via `workflow_dispatch`):

```
1849: .game-card.espn-final .card-accent{background:#3a3a4a}
1863: .game-card.circadian-prime .card-accent{background:var(--live)}
1864: .game-card.circadian-preview .card-accent{background:var(--gold)}
1865: .game-card.circadian-night .card-accent{background:var(--drama-watch)}
```

Line 1863 > line 1849 confirms the cascade order is correct in the
**deployed** bundle, not just the git source — closing the loop on the
exact mistake I caught locally. `SW_VERSION = '2026-07-04c'` confirms
this exact commit is deployed. Full response (31,340 lines) not kept
verbatim — replaced with the extracted finding in
`outbox/cf-result-20260704T053752Z.txt`.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] **Real visual confirmation** (screenshot or live check) that a
      genuine PRIME, PREVIEW, and NIGHT card each show a visually
      distinct accent color in production. CSS rules existing, matching
      the right selector, and sitting at the correct cascade position
      is strong static evidence but is not the same as seeing three
      real cards side by side with visibly different accent stripes —
      this sandbox has no way to render the live page and take a
      screenshot.

---

## Done Conditions

- [x] Probe block re-run, all four token values and existing rules
      reconciled with the doc (one minor doc-probe-pattern inaccuracy
      found and reported: `--drama-watch` is packed on one line, not
      its own line, but its value matches exactly)
- [x] 3 new CSS rules added exactly as specified — at the position that
      genuinely satisfies the cascade requirement, after catching and
      fixing my own initial misplacement
- [x] `node smoke.js index.html` exits 0, all 4 assertions green
      (852/0 total, one beyond the literal 3 asked for, justified above)
- [x] CI confirms deployed — Deploy gate, Chrome viewport audit, and
      Safari viewport audit all succeeded
- [x] SW_VERSION bumped in `index.html` and `sw.js` (`2026-07-04c`)
- [x] Outbox manifest written (this file), explicitly documenting the
      cascade-order near-miss and how it was caught and fixed before
      committing
