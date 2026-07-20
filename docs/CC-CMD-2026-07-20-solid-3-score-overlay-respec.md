# CC-CMD: Live Score Card Fine-Grained Updates — RESPEC (blocks CC-CMD-2026-07-19-solid-3-score-overlay)

**Date:** 2026-07-20
**Status:** Not started. Written because CC-CMD-2026-07-19-solid-3-score-overlay.md
was executed against and found non-viable as written (confidence ~5/100, no
code committed). This doc records why and what a corrected version needs,
per CLAUDE.md Rule 87 (#4 — no deferred work without a second CC-CMD),
mirroring the precedent set by CC-CMD-2026-07-20-solid-2-ambient-island-respec.md
for the sibling ambient-panel CC-CMD.

## Why the original CC-CMD is blocked

Its own pre-build probe's assumptions do not match current HEAD (`9ed33796`):

1. **Wrong host function.** Task 3c says to mount overlays "In `renderAll()`,
   after each card element is created and inserted into DOM." The real
   score-rendering/update logic lives in **`renderESPNScores()`**
   (`field.js:19205`), a separate function with 15+ real trigger call sites
   (SSE ticks, multiple poll paths, witness corrections, manual
   force-renders — `grep -n "renderESPNScores("` for the full list).
   `renderAll()` only builds the initial card shell.

2. **Wrong card-identifying attribute.** The CC-CMD's own T5 verification
   script queries `document.querySelectorAll('[data-gid]')`. `data-gid`
   appears exactly once in the whole file, on an unrelated multiview
   picker button (`field.js:5585`) — never on `.game-card`. The real
   attribute is `data-gameid` (`field.js:7637`, set at card creation
   alongside `data-sport`/`data-home`/`data-away`/`data-starttime`/etc.).
   Run as written, the verification script would silently report "no
   cards" on every run — a hidden false-negative, not a working check.

3. **No static score-slot exists to annotate.** Task 3e assumes a fixed
   HTML template with a score display element to tag with
   `data-score-slot`. There isn't one. `buildSafeScoreWrap()`
   (`field.js:18794-18861`) procedurally builds the *entire* `.score-wrap`
   subtree fresh on every call:
   - Leader/trailer spans (`.score-home`/`.score-away`) whose
     `score-leader` CSS class dynamically moves between sides as the lead
     changes (soccer only; other sports always show leader-left).
   - A separator (`.score-sep`).
   - A period-label `<span>` that is itself real HTML —
     `<span class="score-period">Q3 5:23</span>` or
     `<span class="score-final">Final</span>`, computed by
     `computeGameNarrative()` (`field.js:18863`), not a plain string.
   - An optional status-line div.
   - Situational HTML passed in by the caller (baseball outs/diamond,
     built separately in `renderESPNScores()` before the
     `buildSafeScoreWrap()` call).
   - Four real fallback layers (`buildSafeScoreWrap`'s own header comment,
     `field.js:18786-18793`) for when the Story Engine narrative is empty.
   The CC-CMD's `<span class="score-live">{props.score()}</span>` skeleton
   models none of this — it's a single plain-text span, not the real
   multi-part, conditionally-styled structure.

4. **An undisclosed real dependency on the replace lifecycle.**
   Immediately after `wrapEl.replaceWith(newWrap)`
   (`field.js:19327-19345`), the current code calls
   `_raiRehydrateScoreWrap(card, newWrap)` (`field.js:19023`), which
   re-appends a cached RAI (real-time analytics insight) line to the
   *fresh* node — necessary today specifically because replacing the node
   discards whatever was appended to the old one. Moving to a persistent
   Solid-managed node changes this lifecycle (a persisted RAI line would
   survive updates instead of needing re-appending each time, which is
   arguably *better*, but needs its own design decision — does
   `_raiCache` populate after initial mount and need a later re-check? —
   not something the CC-CMD investigates or even mentions.

## What does survive from the original premise

`buildSafeScoreWrap()` + `wrapEl.replaceWith(newWrap)` runs
**unconditionally** on every `renderESPNScores()` pass for every live
game — there is no gate comparing old vs. new score before rebuilding and
replacing the whole `.score-wrap` subtree (only the `score-flash` CSS
class addition is conditional, via `previousScores[scoreKey+'_sl']`).
Given `renderESPNScores()` has 15+ real trigger sites and typically many
live cards on screen simultaneously, this is genuine, real, unnecessary
DOM churn — a legitimate target for a fine-grained-update rewrite, same
category of justification as the ambient panel's (already-fixed) whole-
subtree innerHTML write.

## What a corrected respec needs (not yet decided — needs product sign-off)

- Target `renderESPNScores()`, not `renderAll()`.
- Use `data-gameid` for card lookups, not `data-gid`.
- Model the real `.score-wrap` structure: leader/trailer spans with
  conditional class-swap, separator, period-label (itself HTML), optional
  status line, and the situational HTML the caller passes in — not a
  single plain-text span.
- Resolve the `_raiRehydrateScoreWrap` lifecycle question explicitly
  before implementation: should a Solid-managed score-wrap append the RAI
  line once at mount and leave it, or does `_raiCache` populate on a
  delay that needs an explicit re-check hook?
- Treat this as materially higher-risk than the ambient panel work: this
  function has 15+ real trigger call sites (vs. a handful for
  `renderAmbientPanel`) and sits on the single most load-bearing visual
  element in the app (every live game's score). Get explicit scope
  sign-off before touching it, per CLAUDE.md Rule 9/13.
- Re-run the pre-build probe against current HEAD at execution time (Rule
  79) — confirm the real, current line numbers and confirm no other
  session has since touched `renderESPNScores()` or `buildSafeScoreWrap()`.

## Recommendation

Given the real justification (unconditional rebuild+replace on every
score poll) is legitimate but the actual score-wrap structure is far
richer than assumed, and this code path is much higher-traffic than the
ambient panel, this needs a deliberately-scoped follow-up CC-CMD written
against the real structure above — not a blind retry of the original.
