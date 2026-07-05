# CC-CMD: Pick 'em — top-level surface design + probe (design step, not full build)

**Date:** 2026-07-05
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Investigation + a design recommendation doc. NOT a full UI build — that's
a follow-up CC-CMD once the navigation question below is answered with real
evidence, not guessed.

**Supersedes:** `CC-CMD-2026-07-05-pick-em-ui.md` — that version put a "Pick"
affordance directly on game cards. Real, verified problem with that design:
the card already carries 39+ distinct chip/badge classes (confirmed via
direct grep) — genuinely dense, not a surface with obvious room for a new
interactive selection+reveal flow. Do not execute that CC-CMD.

## The actual design question, stated precisely

Pick 'em is deliberately cross-sport — the resolver built this session
covers MLB, WNBA, NBA, AFL, soccer/WC, CFL, NHL, MLS, EPL, NFL. FIELD's
existing WC Bracket tab (`switchWCTab('groups'/'bracket')`) is a real,
working precedent for "a separate surface distinct from the main game
feed" — but it's nested inside WC mode specifically, not a general
mechanism. Nesting a cross-sport feature inside any single sport's mode
would fragment it. This points toward a new top-level surface, not a
WC-style sub-tab — but the exact mechanical integration point (how
FIELD's top-level navigation actually works today) was not confirmed
before writing this doc. Multiple direct greps for likely selector names
came back empty. Do not assume a navigation mechanism — find the real one.

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95. This CC-CMD's "commit" is a design
doc, not application code — the gate still applies to whether the
investigation is actually complete and evidenced.

## PROBE BLOCK — this IS the task, not a preliminary to it
```bash
# Find how a user actually gets from the main feed to WC mode today —
# the real mechanism, not a guessed selector name.
grep -n "function.*[Ww]c[Mm]ode\|wcModeActive\|enterWCMode\|id=\"wc-mode" index.html | head -20

# Find the actual top-level filter/nav structure referenced elsewhere
# this session as "filter-bar" — confirm what it actually contains and
# how it's populated.
grep -n "filter-bar" index.html
grep -n "buildFilterBar\|renderFilterBar\|FILTER_BAR" index.html | head -10

# Find any other top-level view-switching mechanism not yet identified.
grep -n "function show[A-Z]\|function render[A-Z].*[Vv]iew\|currentView\b" index.html | head -20
```
Report the real findings plainly — including if the honest answer is
"there is no clean existing top-level switching mechanism, only WC's
mode-specific one and the sport filter bar." That's a valid, useful
finding, not a failure to find something that isn't there.

## TASK — Write a short design doc, not application code

Based on the real structure found above, answer:
1. Does a general top-level surface-switching mechanism already exist
   that a new "Pick 'em" destination could join? If yes, describe it
   exactly (function names, how it's triggered, how state is tracked).
2. If no clean mechanism exists, what's the smallest real addition that
   creates one, reusing as much of WC mode's existing pattern as
   architecturally sound (even though WC's version itself is sport-
   specific, its state-management shape — active/inactive, show/hide
   sections — may still be a reasonable model to extend from)?
3. Where should the pick 'em surface sit relative to the sport filter
   bar — a peer destination alongside sport filtering, or something
   reached a different way (e.g., from "My Services," even though
   that's currently a settings modal, not a content surface — flag
   whether repurposing part of it makes sense or whether that's a
   separate wrong fit, don't assume either way without checking what's
   actually in that modal today)?

Do not write the game-card-affordance version, and do not write any UI
implementation code in this CC-CMD — this is scoped to answering the
navigation question with real evidence, so the next CC-CMD can build
against a real, confirmed integration point instead of a guessed one.

## DONE CONDITIONS
- [ ] Real top-level navigation mechanism found and reported, or honestly reported as not existing
- [ ] Design doc written answering all three questions above, grounded in real code references (line numbers, function names)
- [ ] No application/UI code written in this CC-CMD
- [ ] Outbox manifest written with the design doc's content or a link to it

## CONFIDENCE SCORING TABLE
+40  Real navigation mechanism found and precisely documented, not guessed
+30  Design doc answers all three questions with real code evidence
+30  Correctly scoped — no premature UI code written

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-05-pick-em-surface-design.md. This
supersedes pick-em-ui.md -- do not execute that one, it puts a new
interactive flow on an already-dense (39+ chip classes, confirmed)
game card. Investigate FIELD's real top-level navigation mechanism
(the probe block's greps are a starting point, not the answer -- find
what's actually there). Write a short design doc answering where a
cross-sport pick 'em surface should live, given it can't be a WC-style
sub-tab (that pattern is sport-specific, this feature isn't). No UI
code in this CC-CMD -- just the real navigation findings and a design
recommendation, so the next CC-CMD builds against a confirmed
integration point. Do not commit unless confidence ≥ 95. If score < 95
report verbatim and stop.
