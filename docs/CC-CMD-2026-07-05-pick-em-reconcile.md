# CC-CMD: Reconcile pick 'em — move the interaction off the card, onto the new nav-bar surface

**Date:** 2026-07-05
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Relocate one function's rendering target. Preserve everything else from `702fb7b` as-is.

**Real, confirmed context — a genuine timing race, not a design or execution
error by either side:** `702fb7b` (the card-based first slice) committed
at 18:52:07 UTC. The superseding surface-design doc was pushed 63 seconds
later, 18:53:10 UTC. CC could not have known about the supersession — it
didn't exist yet when the work was committed. This CC-CMD reconciles the
two, it does not correct a mistake either side made.

**What `702fb7b` actually built, confirmed via direct diff read — most of
it is correct and should NOT be touched:**
- `makePick(gameId, predictedWinner, sport)` — fires `pick_made` via the
  existing `_userDoRelay` helper. Correct, reusable regardless of UI location.
- `_resolvePickIfExists(gameId, game, eData)` — hooked into `saveEspnFinal()`,
  sends only `wasCorrect`, never a client-computed probability. Correct, keep as-is.
- `_getPickCache()`/`_savePickCache()` — local pick-state cache. Correct, keep as-is.
- `buildPickEmStatsSection()` — cumulative stats, already placed in the My
  Services modal. The surface-design doc itself confirmed this placement is
  fine ("its existing read-only stats summary is a fine complementary
  placement"). Do NOT move this.
- **`buildPickWidgetHTML(g, sport)` — this is the one piece that needs to
  move.** It currently renders the interactive pick affordance directly
  onto game cards. Per the surface-design doc, this UI belongs on the new
  top-level surface instead, not the card.

**Target time:** ~35 min

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK
```bash
grep -n "function buildPickWidgetHTML\|function makePick\|function toggleWCView\|function toggleJournalismView" index.html
```
Re-confirm current state of all four functions before editing — this
doc's snapshot is 2026-07-05, re-verify rather than trust it blindly.

## TASK 1 — Build the new surface, following the confirmed existing pattern exactly

Per the surface-design doc's own recommendation, add a third mode
matching `toggleWCView()`/`toggleJournalismView()`'s exact shape:
`togglePickEmView()`, `pickem-mode` body class, `#pickem-nav-link` in the
same `<nav class="controls">` bar, `#pickem-section`, and a lazy-render
`renderPickEmSection()`. Reuse the same CSS hide-list pattern the other
two modes use for `.main` + the other containers — do not invent a
different hiding mechanism.

## TASK 2 — Move the pick affordance, not rebuild it

Inside `renderPickEmSection()`, call `buildPickWidgetHTML()` for
relevant games (reuse the function as-is — its actual widget-building
logic doesn't need to change, only where it's rendered). Remove the
call site that currently renders it onto game cards. `makePick()`,
`_resolvePickIfExists()`, and the pick-cache functions need zero
changes — they already work independent of render location.

## TASK 3 — Verify the card is actually decluttered

Confirm directly (not assumed) that game cards no longer render any
pick-em UI element after this change — re-run the same chip/badge count
check used to originally identify the density problem, confirm it's
back to the pre-`702fb7b` count.

## TASK 4 — Verify the new surface actually works end-to-end

Real test: navigate to the new pick'em surface, make a pick, confirm it
fires correctly (reuse the same live-check pattern `702fb7b`'s own
outbox used — a real POST to `/user/event`), confirm the stats section
in My Services still reflects it correctly.

## SCOPE BOUNDARY

DO:
- Build the new mode following the exact existing toggle pattern
- Move only buildPickWidgetHTML()'s render target, not its internal logic
- Leave makePick(), _resolvePickIfExists(), pick-cache, and stats section untouched
- Verify the card is genuinely decluttered and the new surface genuinely works

DO NOT:
- Rewrite any of the backend-calling logic — it was already correct
- Touch My Services or its existing stats section placement
- Invent a new toggle/hiding mechanism instead of matching the existing one

## DONE CONDITIONS
- [ ] Probe block re-run, all four functions' current state confirmed
- [ ] New mode built, matching the exact existing toggle/hide-list pattern
- [ ] Pick widget rendering relocated to the new surface, card call site removed
- [ ] Card confirmed decluttered (chip count back to pre-702fb7b baseline)
- [ ] New surface verified working end-to-end with a real live test
- [ ] Outbox manifest written

## CONFIDENCE SCORING TABLE
+25  New mode correctly matches the existing toggle pattern exactly
+25  Widget relocated correctly, card call site removed, no logic changes to makePick/resolve/cache
+25  Card confirmed decluttered via real count, not assumed
+25  New surface verified working end-to-end via a real live test

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-05-pick-em-reconcile.md. This
reconciles 702fb7b (the card-based first slice, a genuine 63-second
timing race with the superseding surface-design doc, not an error by
either side) with the new recommended top-level surface. Build
togglePickEmView() + pickem-mode + #pickem-nav-link + #pickem-section +
renderPickEmSection(), matching toggleWCView()/toggleJournalismView()'s
exact existing pattern. Move buildPickWidgetHTML()'s render target from
game cards to the new section -- do not change its internal logic.
Leave makePick(), _resolvePickIfExists(), the pick-cache, and the My
Services stats section completely untouched, they're already correct.
Verify the card is genuinely decluttered and the new surface genuinely
works, both via real checks. Do not commit unless confidence ≥ 95. If
score < 95 report verbatim and stop.
