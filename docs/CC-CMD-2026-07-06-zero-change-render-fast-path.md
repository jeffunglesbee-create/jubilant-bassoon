# CC-CMD: Skip the DOM commit entirely when nothing actually changed

**Date:** 2026-07-06
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

**Explicitly not a rewrite.** Checked prior chats/Drive before writing
this: `applyMainHTML` is a purpose-built reconciler from real WPT/CLS
work (PM-26-C5, June 3 — LCP-anchor morphing; `CC-CMD-2026-07-04-card-
dom-reconciliation-phase2` — per-card byte-identical reuse by
`data-gameid`). There's also a documented precedent for this exact
category of bug already found and fixed once (`renderFieldDesk` firing
6×/load, CLS 8.3285, fixed via debounce + skip-if-same, June 23). This
CC-CMD extends that existing reconciliation one level up — it does not
replace or second-guess it.

**Target time:** ~20 min

## PROBE BLOCK
```bash
sed -n '10499,10582p' index.html   # applyMainHTML in full
```
Confirm the citation matches before editing, specifically the
reconciliation loop (~line 10556-10566) and the commit line
`main.replaceChildren(...tmp.children);` (~line 10577).

## THE REAL GAP

The reconciliation loop preserves individual `.game-card` DOM nodes when
their computed `outerHTML` is byte-identical to what's already on
screen — but the `<div class="sport-section">` wrapper around each
section's cards is never diffed; it's always a fresh node parsed from
the new HTML string. So `main.replaceChildren(...tmp.children)` runs
unconditionally, even when **every single card in every section was
just proven identical and reused**. In that exact case — the most
common one on a quiet poll tick with no live-score changes — the commit
still forces a full detach/reattach of every top-level section wrapper
for a result that is structurally and visually identical to what's
already rendered. The existing code answers "which cards can I reuse,"
never "do I need to touch the DOM at all this pass."

## TASK — Add a zero-change fast path

Track whether the reconciliation loop found any real difference. After
the loop (before the `try { main.replaceChildren(...) }` block), skip
the commit if nothing changed AND the section-level structure itself
is unchanged:

```javascript
let anyCardChanged = false;
const existingCards = new Map();
main.querySelectorAll('[data-gameid]').forEach(el => {
  if (!existingCards.has(el.dataset.gameid)) existingCards.set(el.dataset.gameid, el);
});
const newCardIds = new Set();
tmp.querySelectorAll('[data-gameid]').forEach(newCard => {
  if (newCard.hasAttribute('data-lcp-anchor')) return;
  const gid = newCard.dataset.gameid;
  newCardIds.add(gid);
  const existing = existingCards.get(gid);
  if (existing && existing.outerHTML === newCard.outerHTML) {
    newCard.replaceWith(existing);
  } else {
    anyCardChanged = true;
  }
});
// A card existed before and is now gone entirely -- also counts as a real change.
if (!anyCardChanged) {
  for (const gid of existingCards.keys()) {
    if (!newCardIds.has(gid)) { anyCardChanged = true; break; }
  }
}
```

Then, immediately before the existing commit block:

```javascript
// Zero-change fast path: every card was proven identical and reused,
// section count/order in tmp matches main exactly -- the DOM is already
// correct. Skip the commit entirely rather than force a no-op
// detach/reattach of every section wrapper.
if (!anyCardChanged
    && !(main.querySelector('[data-lcp-anchor]') && !tmp.querySelector('[data-lcp-anchor]'))
    && main.children.length === tmp.children.length) {
  if (savedNewspaper) main.prepend(savedNewspaper);
  return;
}
```

The `main.children.length === tmp.children.length` check guards against
a section being added or removed entirely (e.g., a sport with zero
games today disappearing from the list) — that's a real structural
change even if every remaining card is unchanged, and must still commit.

**Keep the existing card-level reconciliation loop's logic and the
try/catch/fallback structure exactly as-is** — this only adds the early
return, it does not change how cards get matched or reused.

## VERIFICATION

- `node smoke.js index.html` clean
- Verify against the real, live, deployed app (not a copy): load a real
  page, capture `main`'s exact child node references (not just HTML,
  actual object identity), trigger a render pass where nothing in the
  underlying data changed (e.g., call `renderAll(true)` twice back to
  back with no data mutation between), and confirm `main`'s children
  are the exact same node references afterward — not just
  structurally-identical new nodes. This is the real proof; a smoke
  assertion checking for the code pattern's presence is not sufficient
  on its own for a DOM-identity claim.
- Verify the normal case still works: mutate one real game's score,
  confirm that section (and only that section, if section-level
  batching is even relevant here) still commits normally and the
  changed card's content updates on screen.
- Verify the add/remove-section edge case: simulate a sport's game list
  going from non-empty to empty (or vice versa) and confirm the fast
  path is correctly skipped (commit still happens) rather than
  incorrectly bailing early.

## DONE CONDITIONS
- [ ] Probe block confirms citation before editing
- [ ] `anyCardChanged` tracking added without altering existing reconciliation logic
- [ ] Fast-path early return added, guarded by both card-level and section-count checks
- [ ] Verified via real DOM node identity check (not just HTML string comparison) that a true no-op pass performs zero `replaceChildren` calls
- [ ] Verified the normal (real change) case still commits and updates correctly
- [ ] Verified the section-added/removed edge case is NOT incorrectly short-circuited
- [ ] Smoke clean
- [ ] Outbox written

## CONFIDENCE SCORING TABLE
+30  Fast-path logic correct, existing reconciliation untouched
+25  Verified via real DOM node identity (object reference equality), not just re-running the code and trusting it
+20  Section add/remove edge case verified NOT to incorrectly skip the commit
+15  Normal (real change) case verified still works correctly
+10  Smoke clean

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-06-zero-change-render-fast-path.md.
Add a zero-change fast path to applyMainHTML: track whether the
existing card-level reconciliation loop found any real difference, and
if not (and section count matches), skip main.replaceChildren entirely
rather than force a no-op detach/reattach of every section wrapper.
Verify via real DOM node identity (object reference equality) that a
true no-op render performs zero replaceChildren calls, and separately
verify the section-added/removed edge case still commits correctly.
This extends the existing reconciliation (PM-26-C5, card-dom-
reconciliation-phase2) -- do not alter its existing logic. Do not commit
unless confidence >= 95. If score < 95, report verbatim and stop.
