# CC Session Outbox — Journalism brief cards defeat card-reuse reconciliation (direct user request, 2026-07-12)

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Direct request: "Find and resolve
another journalism UI silent failure using novel thinking. No Fallbacks,
only fixes."

## Investigation — verified live before touching code, not assumed

Surveyed the journalism UI render functions: `renderMLBGameBriefCard`,
`renderWNBAGameBriefCard`, `renderStakesBriefCard`,
`renderEPLMatchBriefCard` (~lines 31584/31685/31823/32288), plus
`renderSeriesPreviewCard` (~28431, same insertion pattern). All five
inject a **sibling element immediately before the game-card** via
`gameCard.insertAdjacentElement('beforebegin', card)`, and all five
stamp the sibling with **the same `data-gameid` as the game-card it
precedes** (`card.dataset.gameid = gameid`) — so their own re-render
logic can find/dedupe themselves later.

Read `applyMainHTML()` (~line 10869, the sole function that commits
`renderAll()`'s output to the DOM). Its card-reuse reconciliation
(~line 10949, "Phase 2, CC-CMD-2026-07-04-card-dom-reconciliation-
phase2") builds a lookup of existing cards via:
```js
main.querySelectorAll('[data-gameid]').forEach(el => {
  if (!existingCards.has(el.dataset.gameid)) existingCards.set(el.dataset.gameid, el);
});
```
`[data-gameid]` is a bare attribute selector — it matches **any**
element carrying that attribute, not just `.game-card` elements. Given
brief/preview cards sit immediately *before* the game-card in document
order and share its `data-gameid`, and the code keeps only the *first*
match per ID (`!existingCards.has(...)`), this Map would capture the
brief/preview sibling instead of the real game-card for any game with a
rendered brief.

**Verified live in production** (not assumed) before writing any fix,
via `browser_extract`/evaluate against
`https://jubilant-bassoon.jeffunglesbee.workers.dev`:
```json
"dupIds": [["g19",3],["g17",2],["g18",2],["g20",2], ...]
"exampleFirstMatch": {
  "g17": "sport-game-brief-card sport-game-brief-mlb",
  "g18": "sport-game-brief-card sport-game-brief-mlb",
  "g20": "sport-game-brief-card sport-game-brief-mlb",
  ...
}
```
Confirmed: for every MLB game with a rendered brief (g17/g18/g20 that
night), the first `[data-gameid]` match in real DOM order was the
brief card, not the game-card — exactly as hypothesized. (Also found a
`g19`/`cfl_13419694` collision from a third, unrelated `.rn-card`
element — a different feature, out of scope for this journalism-focused
fix; not touched, noted here only so it isn't lost.)

## Consequence — not cosmetic, a real correctness bug in the reconciliation

The reconciliation compares `existing.outerHTML === newCard.outerHTML`
to decide whether a card is genuinely unchanged and can keep its old
DOM node (avoiding a needless replace). With `existing` silently holding
the brief-card instead of the game-card, this comparison can **never
succeed** for any game with a visible brief — a `sport-game-brief-card`'s
markup can never equal a `game-card`'s markup. Every such game is
permanently misclassified as "changed" on every render, which:
- Defeats the "zero-change fast path" (CC-CMD-2026-07-06) for the whole
  page whenever it includes a brief-carrying game, even when nothing
  about that game actually changed — the code's own comment says this
  fast path exists specifically to "skip the commit entirely rather
  than force a no-op detach/reattach."
- Forces a full `main.replaceChildren(...tmp.children)` commit more
  often than the game data actually requires — and since `tmp` never
  contains brief/preview cards (they're injected separately, after
  `renderAll()` returns), that commit **wipes every brief/preview card
  on the page**, not just the one whose reconciliation failed. They
  only reappear when `init*Briefs()` (scheduled 400-1300ms later, at
  the tail of the same `renderAll()`) re-queries the DOM and finds the
  game again — instant from `sessionStorage` cache in the common case,
  but silently and permanently lost if the game falls outside its
  brief type's fixed candidate slice (`initMLBGameBriefs` caps at the
  first 4 `.game-card` elements in DOM order, etc.) on a later render.

## Fix — corrected the selector, not a new fallback

```diff
- main.querySelectorAll('[data-gameid]').forEach(el => {
+ main.querySelectorAll('.game-card[data-gameid]').forEach(el => {
    if (!existingCards.has(el.dataset.gameid)) existingCards.set(el.dataset.gameid, el);
  });
  const newCardIds = new Set();
- tmp.querySelectorAll('[data-gameid]').forEach(newCard => {
+ tmp.querySelectorAll('.game-card[data-gameid]').forEach(newCard => {
```
This restores the reconciliation's own documented intent — its comment
already says "if a card with the same data-gameid exists ... and its
outerHTML is byte-identical ... keep the OLD element" — by making the
lookup only ever consider actual game-cards, never a brief/preview
sibling that happens to share the ID. Not a new fallback path, no new
mechanism: the existing, single reconciliation loop now matches what
its own comments already say it does. `tmp`'s selector was changed for
consistency/defensive correctness too, though `tmp` is built entirely
from FIELD's own freshly-rendered game-card HTML and never contained a
brief/preview sibling in the first place — that side was not the actual
bug, just made explicit rather than relying on tmp's shape by accident.

**Explicitly out of scope, not folded into this fix**: this does not
make brief/preview cards *survive* every full commit (when some
*other*, unrelated game genuinely changes elsewhere on the page, the
commit still fires and `tmp` still lacks brief/preview siblings for
every game, so they still get wiped and re-inserted via the existing
`init*Briefs()` timers). That is a larger, structural question about
whether `applyMainHTML` should carry forward external siblings across a
commit — real, but a bigger change to established rendering
architecture (CLAUDE.md Rule 9's structural-change guardrail applies)
than this report's "no fallbacks, only fixes" scope. This fix corrects
the confirmed, in-scope bug: the reconciliation matching the wrong
element and permanently mis-flagging changed cards.

## VERIFICATION

Real test, not asserted: extracted the actual reconciliation block
verbatim (line-range, not reimplemented) and ran it against a minimal
but faithful fake DOM built to mirror the exact live-confirmed
structure (brief-card immediately before the game-card, same
`data-gameid`, real `outerHTML` string comparison, real `replaceWith`
node-identity semantics).

1. **Fixed selector, genuinely unchanged game-card, brief-card sibling
   present** → `anyCardChanged: false`, old game-card node reused
   (`replaceWith` fired) — correctly recognized as unchanged despite
   the sibling.
2. **Fixed selector, negative control — genuinely changed game-card,
   brief-card sibling present** → `anyCardChanged: true` — real changes
   still correctly detected; the fix doesn't paper over real diffs.
3. **Re-ran case 1 against the OLD bare `[data-gameid]` selector** (to
   prove the bug was real, not just an assumption) → `anyCardChanged:
   true` (wrong), old node NOT reused — reproduces the exact defect,
   confirming the fix is what closes the gap.

- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_smoke.js index.html`: **Failures: 0**, unaffected.
- `node field_unit.js`: 66 passed, 0 failed.
- `node --check` on the extracted inline `<script>` body: clean.

## DONE CONDITION

Games with a rendered journalism brief or series-preview card are no
longer permanently misclassified as "changed" by `applyMainHTML`'s
reconciliation. A genuinely unchanged brief-carrying game now correctly
reuses its old DOM node and can participate in the zero-change fast
path; a genuinely changed one is still correctly detected. Verified via
a real extraction test proving both the defect (old selector) and the
fix (new selector) against faithfully-reproduced live DOM structure.

## Commit

- `index.html`: `applyMainHTML()`'s reconciliation loop (~line 10949)
  — 2 selector strings changed from `'[data-gameid]'` to
  `'.game-card[data-gameid]'`. No other logic in the function touched.
  `SW_VERSION` bumped `2026-07-11o` → `2026-07-11p`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
- **Not touched, correctly out of scope**: the `g19`/`cfl_13419694`
  collision from an unrelated `.rn-card` element (different feature,
  noted above for visibility, not addressed here). The larger question
  of whether brief/preview siblings should survive a full commit
  (structural change, out of this report's scope).
