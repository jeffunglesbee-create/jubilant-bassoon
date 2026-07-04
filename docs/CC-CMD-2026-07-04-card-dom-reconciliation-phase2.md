# CC-CMD: Card-level DOM reconciliation in applyMainHTML (Phase 2)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Extend `applyMainHTML()`'s existing "LCP anchor morph" pattern
(currently special-cased for exactly one card) into a general
`data-gameid`-keyed reconciliation for every card, so unchanged cards
keep their existing DOM node instead of being destroyed and recreated
by `main.replaceChildren(...tmp.children)` on every render.
**Why:** Investigated live 2026-07-04: `renderAll()`'s 77KB-string/
690-node cost (per its own existing comment, index.html:10302) is
real, but the actual expensive part is DOM node churn, not string
computation — confirmed by reading `applyMainHTML` (index.html:10356):
it always calls `main.replaceChildren(...tmp.children)`, fully
destroying and recreating every card's DOM node regardless of whether
that card's content changed. The originally-anticipated risk (a naive
`game._id`-keyed INPUT diff missing cross-cutting dependencies like
`MY_TEAMS`, viewport width, or `fieldGameTier`) is avoided entirely by
this design, because it compares computed OUTPUT html per card instead
of hand-picking which inputs matter — confirmed via full investigation
that every direct (non-`scheduleRenderAll`) `renderAll()` call site is
either the one-time boot render or a genuine user-interaction handler
(`toggleMyTeam`, `tzSel` change, date nav, filter clicks) that already
correctly forces a full rebuild by calling `renderAll()` directly, not
through this reconciliation path.
**Target time:** ~1 hr

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail
- eslint baseline first before any code edit

## CONFIDENCE GATE (CC-verifiable only)
Do not commit unless confidence ≥ 95 on the CC-verifiable portion. Real
measured performance improvement (fewer DOM node creations per poll,
observed via DevTools or a live profiling session) is deferred to chat
— cannot be measured from a static source read or a single live GET.

## PROBE BLOCK (run before any edits)
```bash
grep -n "^function applyMainHTML" index.html
grep -n "main.replaceChildren" index.html
grep -n "data-lcp-anchor" index.html
```
Re-confirm `applyMainHTML`'s exact current body before editing — this
CC-CMD's line references and the LCP-anchor-morph code shown below were
accurate as of 2026-07-04, this file changes daily.

## CONTEXT — the existing pattern being generalized

`applyMainHTML(html)` already does this, but only for ONE card (the
first, for LCP measurement continuity):
```javascript
  const anchor = main.querySelector('[data-lcp-anchor]');
  const firstNewCard = tmp.querySelector('.game-card');
  if (anchor && firstNewCard) {
    // ... morphs anchor's attributes/content to match firstNewCard,
    // then keeps the OLD anchor element in the DOM instead of the new one
  }
```
This CC-CMD generalizes the same idea (keep an old element, discard the
new one, when they'd be equivalent) to every card, keyed by
`data-gameid` instead of the single `data-lcp-anchor` special case.

## TASK 1 — Generalize the reconciliation

Find this exact block in `applyMainHTML` (index.html ~10370-10399,
re-verify via probe):
```javascript
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const anchor = main.querySelector('[data-lcp-anchor]');
  const firstNewCard = tmp.querySelector('.game-card');
  if (anchor && firstNewCard) {
    try {
      // ... existing LCP morph logic, unchanged ...
    } catch(e) {
      main.innerHTML = html;
      if (savedNewspaper) main.prepend(savedNewspaper);
      return;
    }
  }
```
Immediately after this block (after the LCP-anchor special case, before
the final `main.replaceChildren(...tmp.children)`), add:
```javascript
  // Card-level DOM reconciliation (Phase 2, CC-CMD-2026-07-04-card-dom-
  // reconciliation-phase2). For every OTHER card (not the LCP anchor,
  // already handled above), if a card with the same data-gameid exists
  // in main's CURRENT children and its outerHTML is byte-identical to
  // the newly-computed one, keep the OLD element instead of the new one.
  // This is intentionally an OUTPUT-level comparison, not an input-data
  // diff -- any real change (game data, MY_TEAMS, viewport, filter state)
  // already produces a different computed HTML string, so this cannot
  // silently skip a card that actually needs updating. Only genuinely
  // identical output gets its DOM node preserved.
  try {
    const existingCards = new Map();
    main.querySelectorAll('[data-gameid]').forEach(el => {
      if (!existingCards.has(el.dataset.gameid)) existingCards.set(el.dataset.gameid, el);
    });
    tmp.querySelectorAll('[data-gameid]').forEach(newCard => {
      if (newCard.hasAttribute('data-lcp-anchor')) return; // already handled above
      const gid = newCard.dataset.gameid;
      const existing = existingCards.get(gid);
      if (existing && existing.outerHTML === newCard.outerHTML) {
        newCard.replaceWith(existing);
      }
    });
  } catch (e) {
    // Defensive: reconciliation is a pure optimization -- any failure
    // here must never block the render. Fall through to the normal
    // replaceChildren path below with tmp's (all-new) children.
    captureFieldError?.('card-dom-reconciliation', e, false);
  }
```

## TASK 2 — Smoke assertions

```javascript
smoke.assert(html.includes('card-level DOM reconciliation') || html.includes('existingCards'), 'A[NEXT]: applyMainHTML has card-level reconciliation logic');
smoke.assert(!!html.match(/existing\.outerHTML === newCard\.outerHTML/), 'A[NEXT+1]: reconciliation compares OUTPUT html, not a hand-picked input field list (the exact property this design relies on for safety)');
smoke.assert(html.includes("captureFieldError?.('card-dom-reconciliation'") || html.includes('card-dom-reconciliation'), 'A[NEXT+2]: reconciliation failure path is defensive and does not block rendering');
```
(CC: assign real sequential A-numbers.)

## SCOPE BOUNDARY

DO:
- Add the reconciliation block exactly as specified, inside `applyMainHTML` only
- Preserve the existing LCP-anchor special case exactly as-is, unchanged
- 3 smoke assertions
- Bump SW_VERSION

DO NOT:
- Touch `renderAll()`'s card-string-generation logic at all — every
  card's HTML is still fully recomputed every time (that residual cost
  is a real, separate, smaller optimization opportunity for a possible
  future Phase 3, not required here)
- Attempt to cache or skip the badge-builder function calls
  (`buildWCBars`, `buildRoundBadge`, etc.) — out of scope, see above
- Change how `scheduleRenderAll()` or direct `renderAll()` calls work —
  this CC-CMD only changes what happens to the OUTPUT once computed,
  not when or how often rendering is triggered
- Add any new external-state tracking (no `_lastRenderedGameSnapshot`
  map, no field-by-field input diffing) — the whole point of this
  design is that OUTPUT comparison makes that unnecessary; do not
  reintroduce the input-diffing approach this CC-CMD deliberately avoids

## DONE CONDITIONS
- [ ] Probe block re-run, `applyMainHTML`'s current body reconciled with this doc
- [ ] Reconciliation block added exactly as specified, immediately after the existing LCP-anchor logic
- [ ] Confirmed via code read that the LCP-anchor special case is untouched
- [ ] Confirmed via code read that the try/catch means a reconciliation failure can never block or corrupt a render (falls through to today's exact existing behavior)
- [ ] `node smoke.js index.html` exits 0 with all 3 new assertions green
- [ ] CI Playwright confirms the reconciliation code exists in deployed bundle
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-card-dom-reconciliation-phase2-{date}.md`

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation, during a live poll cycle, that unchanged cards'
      DOM nodes are actually preserved (e.g., via a marker property set
      once on first creation, checked again after a poll) rather than
      recreated — and that changed cards (a real score update, a real
      final transition) still correctly get new nodes. Static source
      review proves the logic is correct; it does not prove the
      measured behavior matches under real live polling.

## COMPLIANCE
- Rule 47/ADR-002/RUWT: pure DOM-reconciliation optimization, touches no scoring/interest-value logic
- Rule 68: probe block first, re-verify applyMainHTML's body before editing
- Rule 87: self-completing on the CC-verifiable portion; live measurement explicitly deferred

## CONFIDENCE SCORING TABLE
+25  Reconciliation block added exactly as specified, `node --check` clean
+25  Confirmed via code read: LCP-anchor case untouched, reconciliation is output-comparison only (no input-field diffing reintroduced)
+25  Confirmed via code read: failure path is fully defensive, cannot block a render
+25  Smoke 3/3 green, CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-card-dom-reconciliation-phase2.md.
Re-confirm applyMainHTML's current body first (see PROBE BLOCK) — this
touches a function every render depends on, so accuracy matters more
than usual here. Implement exactly as specified — output-level
comparison only, do not reintroduce input-field diffing. Do not commit
unless confidence ≥ 95. If score < 95 report verbatim and stop — do not
invent results.
