# CC-CMD: Pick 'em full-sport coverage — two fast, non-visual verification scripts

**Date:** 2026-07-05
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Sequencing:** run this AFTER `CC-CMD-2026-07-05-pickem-cfl-mlb-gaps.md`
completes and its fix lands — do not run concurrently, to avoid the exact
kind of collision the pick-em-ui/surface-design docs had earlier this
session. Check that CC-CMD's outbox exists before starting this one.

**Why two separate mechanisms, not one browser probe repeated per sport:**
the prior CC-CMD found two structurally different failure classes.
List-inclusion (a game not appearing in the Pick 'em list) is governed
entirely by `getCardCircadian()` — confirmed directly, genuinely a pure
function with zero `document`/`window` references anywhere in it or its
`isGameOver()` dependency. That means it can be checked by fetching real
data and calling the function directly, no rendering needed at all —
faster and more complete than opening a browser per sport, and it also
sidesteps the practical problem of needing to catch each sport's game
in its narrow pre-start window live. Post-pick display breaking (the
CFL-style bug) is DOM-manipulation-dependent (`querySelector`,
`outerHTML`) and can't be reduced to a pure data check — but it likely
doesn't need a full, slow, visually-rendering Playwright session either;
a lightweight DOM environment (jsdom) exercising `makePick()`/
`buildPickWidgetHTML()` directly should suffice and run far faster
across every sport than a real browser probe repeated eight times.

**Target time:** ~50 min

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK
```bash
ls docs/outbox/ | grep -i "cfl-mlb-gaps\|pickem-cfl-mlb"
```
Confirm the prerequisite CC-CMD has actually completed before starting
this one. If it hasn't, stop and report that plainly rather than
proceeding anyway.

## TASK 1 — Pure-data list-inclusion check, every sport

Write a standalone Node script (matching this project's established
CI-as-proxy pattern) that: for every sport the relay/client supports
(MLB, WNBA, NBA, AFL, soccer/WC, CFL, NHL, MLS, EPL, NFL, CFB), fetches
real, current data via the same real endpoints already proven this
session, extracts `getCardCircadian()`'s exact logic (port it verbatim,
don't reinterpret), and reports which real games currently classify as
PREVIEW per sport. Cross-check this against what's actually reachable
from each sport's real, current schedule — flag any sport where a game
that should reasonably be pickable (confirmed not yet started via the
raw data) fails to classify as PREVIEW.

## TASK 2 — jsdom-based post-pick-display check, every sport

Write a second script using jsdom to construct a minimal DOM containing
one `.pick-widget` per sport (using real team-name/gameId data pulled
from Task 1's fetch), then directly exercise `makePick()` and
`buildPickWidgetHTML()` against each, checking that the resulting HTML
actually contains the expected pick confirmation content for every
sport — not just CFL and whichever sport the original bug report happened
to use.

## TASK 3 — Report real findings honestly

For each sport, report pass/fail for both checks. Do not assume a sport
passes because it wasn't named in the original bug report — every sport
gets both checks, independent of history.

## TASK 4 — Fix any newly-found real failures

If either script finds a genuine failure beyond what the prerequisite
CC-CMD already fixed, fix it — using whatever the prerequisite CC-CMD's
actual root-cause finding turned out to be as the model, not the
original unconfirmed leads from that doc.

## SCOPE BOUNDARY

DO:
- Build both scripts as fast, non-visual, real-data-driven checks
- Cover every sport, not just the two originally reported
- Fix any genuine new failures found, using confirmed root causes

DO NOT:
- Use a full visual/Playwright browser probe for either check — both are designed specifically to avoid needing one
- Run this before the prerequisite CC-CMD has completed
- Assume any sport is fine without actually checking it

## DONE CONDITIONS
- [ ] Prerequisite CC-CMD confirmed complete before starting
- [ ] Pure-data list-inclusion script built and run against every real sport
- [ ] jsdom-based post-pick-display script built and run against every real sport
- [ ] All findings reported honestly, pass or fail, per sport
- [ ] Any newly-found genuine failures fixed
- [ ] Outbox manifest written

## CONFIDENCE SCORING TABLE
+15  Prerequisite confirmed complete before starting
+30  Pure-data script correctly covers every sport, no rendering used
+30  jsdom script correctly covers every sport, no full browser used
+25  Any newly-found failures correctly fixed and reported

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-05-pickem-coverage-check.md. Confirm
CC-CMD-2026-07-05-pickem-cfl-mlb-gaps.md has already completed before
starting -- do not run concurrently. Build two fast, non-visual scripts:
(1) a pure-data check porting getCardCircadian()'s exact logic against
real live data for every sport (MLB/WNBA/NBA/AFL/WC/CFL/NHL/MLS/EPL/NFL/
CFB), confirmed a genuinely pure function needing no rendering; (2) a
jsdom-based check exercising makePick()/buildPickWidgetHTML() against
every sport without a full visual browser. Report pass/fail per sport
honestly, fix any newly-found genuine failures using confirmed root
causes. Do not commit unless confidence ≥ 95. If score < 95 report
verbatim and stop.
