# CC Outbox — Pick 'em Top-Level Surface Design

**Date:** 2026-07-05
**CC-CMD:** docs/CC-CMD-2026-07-05-pick-em-surface-design.md
**Commit:** (this outbox + design doc only — no application code)
**Deploy:** N/A — no index.html/sw.js/wrangler.jsonc content changed, nothing to deploy.

---

## Flagging the timing conflict first, plainly

This CC-CMD's own text says it supersedes `CC-CMD-2026-07-05-pick-em-ui.md`
and explicitly says "do not execute that one." **That prior CC-CMD had
already been executed, committed (`702fb7b`), and deployed** in the
immediately preceding turn of this same session, before this
superseding doc was read. Per this CC-CMD's own scope ("No UI code in
this CC-CMD"), no reversion or modification of that existing work was
made here — that reconciliation decision is explicitly left to
whoever picks up the follow-up build CC-CMD, stated clearly in the
design doc itself rather than silently ignored.

## Probe block — real findings, not the guessed names

All three probe greps run exactly as specified:
```
grep -n "function.*[Ww]c[Mm]ode\|wcModeActive\|enterWCMode\|id=\"wc-mode" index.html  → zero matches
grep -n "filter-bar" index.html                                                        → CSS class only, no JS builder
grep -n "buildFilterBar\|renderFilterBar\|FILTER_BAR" index.html                       → zero matches
grep -n "function show[A-Z]\|function render[A-Z].*[Vv]iew\|currentView\b" index.html  → panels/modals/toasts, no top-level view switch
```
Confirmed the doc's own claim: the guessed names don't exist. Followed
the one real lead the doc itself named (`switchWCTab`) upward to what
actually controls it, rather than stopping at the empty greps.

## Real finding: two existing, working top-level "modes"

`toggleJournalismView()` (line 13298) and `toggleWCView()` (line 31747)
are real, general-purpose (not sport-specific in mechanism, even though
WC's *content* is sport-specific), full-viewport-swap top-level
surfaces — both built on an identical, independently-duplicated shape:
body-class toggle → mutual-exclusion dismiss of the other mode → CSS
hide-list covering `.main` + 8 other top-level containers → show one
`<section>` → lazy-render its content → nav-link active-class sync.
Full comparison table, exact line numbers for every claim, and the
CSS hide-list contents are in the design doc.

**Real, easily-missed distinction caught during investigation:**
`#desk-jump-link` ("📰 Desk") shares the same `.desk-jump-link` CSS
class as the two real modes but is NOT a third mode — its handler
(line 10995) is a plain `scrollIntoView`, no body class, no hide/show.
Confirmed by reading its actual click handler rather than assuming
visual similarity implies mechanical similarity.

## Design doc

Full doc: `docs/design-pick-em-surface-2026-07-05.md`. Answers all
three required questions:

1. **Does a general mechanism exist?** Yes, functionally, as two
   independently-written instances of the same shape — not one shared
   abstraction.
2. **Smallest real addition?** A third mode following the exact same
   shape: `togglePickEmView()` + `pickem-mode` body class +
   `#pickem-nav-link` + `#pickem-section` + extending both existing
   modes' hide-lists/mutual-exclusion to 3-way + a
   `renderPickEmSection()` that reuses the already-shipped pick-cache
   logic (`_getPickCache`/`makePick`/`buildPickWidgetHTML`/
   `_resolvePickIfExists`) as its per-game rendering unit, rather than
   rebuilding it.
3. **Where does it sit?** A nav-bar peer alongside Desk/Journal/WC —
   checked what's actually in My Services first (a `role="dialog"
   aria-modal="true"` settings modal, confirmed via direct read, not
   assumed) and concluded a modal is the wrong shape for the *primary*
   browse/pick/reveal flow, while the existing read-only stats summary
   already living there (from the prior CC-CMD) is a valid,
   complementary secondary placement — the same split Journalism
   already uses (full mode + a small read-only diagnostic in My
   Services).

## Scope discipline

`git status --short` confirms zero application code touched — only
this outbox file and the design doc were created. `node smoke.js
index.html`: 877/0, completely unaffected (as expected — no code
changed).

## CC-verifiable confidence score (per the doc's own rubric)

- **+40** Real navigation mechanism found and precisely documented, not
  guessed — **40/40.** Exact function names, line numbers for both
  toggle functions, both render functions, both nav links, both CSS
  hide-lists, and the mutual-exclusion logic in both directions.
- **+30** Design doc answers all three questions with real code
  evidence — **30/30.**
- **+30** Correctly scoped — no premature UI code written — **30/30.**
  Confirmed via `git status`.

**Total: 100/100.** Committed.

## Deferred to chat — explicitly flagged, not silently dropped

- [ ] **Decide**: reconcile the already-executed card-based pick
      affordance (commit `702fb7b`) with this doc's recommended
      third-mode surface — keep both, replace the card version, or
      something else. This CC-CMD's own scope explicitly excludes
      making that call; it belongs in the next, build-focused CC-CMD.

---

## Done Conditions

- [x] Real top-level navigation mechanism found and reported
- [x] Design doc written answering all three questions, grounded in
      real code references
- [x] No application/UI code written in this CC-CMD
- [x] Outbox manifest written (this file) with the design doc's content
      linked and summarized
