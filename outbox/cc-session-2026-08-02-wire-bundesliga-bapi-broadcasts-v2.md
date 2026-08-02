# CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2 — Result

## Status: STOPPED at Task 1. Real auth confirmed; the actual
ID-resolution question remains untested after 3 genuine fix attempts
(Rule 42: stop iterating the same approach after repeated failure).
No Task 2/3/4 — the CC-CMD's own explicit instruction: "do not build
Task 2/3 if Task 1 still can't resolve the ID question."

## What's confirmed, with real evidence

**Auth fully confirmed working**, both independently and matching the
v2 diagnostic's finding: `outbox/bundesliga-bapi-verify-result.json`
shows `confirmedKeyStillWorks: true`, `confirmedShapeStatus: 200` —
the real `x-api-key: 60ETUJ4j5YagIHdu-PROD` header authenticates
against `wapp.bapi.bundesliga.com/broadcasts/DFL-COM-000003/DFL-DAY-004CBT`,
called from within the live page context.

**Real, current competition/matchday IDs**, captured live: `DFL-COM-000003`
/ `DFL-DAY-004CBT` (Franz Beckenbauer Supercup, 2026/27 preseason).

## What's still unresolved — the actual core question

The date→ID resolution test (does `DFL-DAY-XXX` change per matchday)
**never executed**, across 3 independent real fix attempts, each
diagnosed from real evidence, not guessed twice at the same thing:

1. First attempt: generic `button`/`a` selectors found nothing (real
   DOM has an Angular Material `<mat-select>`, not a button) —
   diagnosed via the v2 CC-CMD's own real DOM capture.
2. Second attempt (Material-select interaction added): click timed out
   — real error showed a `cp.bundesliga.com` cookie-consent overlay
   loading on every page load, a plausible real interceptor.
3. Third attempt (consent-dismiss added): different real error —
   `Element is outside of the viewport`. Added `scrollIntoViewIfNeeded`.
4. Fourth attempt (scroll fix): **same "outside of viewport" error
   recurred, unchanged** (`outbox/bundesliga-bapi-verify-result.json`,
   this run). The select element resolves in the DOM
   (`matSelectFound: true`) but Playwright cannot bring it into a
   clickable position — a real, unresolved layout/interaction
   limitation (sticky header, an off-screen positioned dropdown
   trigger, or a CSS transform Playwright's auto-scroll doesn't
   handle), not diagnosed further given repeated-attempt discipline.

`matSelectOptionsSeen: []`, `distinctDflDayIds` still shows only the
one ID (`DFL-DAY-004CBT`) — the cross-matchday comparison Task 1
exists to answer has not been performed.

## Why this stops here

Per Rule 42 (stop after ~3 attempts at the same class of problem) and
the CC-CMD's own explicit Task 1 gate — auth being solved doesn't
answer the ID-resolution question, and building Task 2/3 on an
unresolved, potentially date-specific `DFL-DAY-004CBT` would risk
exactly the "fabricated-looking correctness" both CC-CMD versions
explicitly warn against.

## Unblock criteria (Rule 74)

**Blocked by:** Playwright cannot bring the real `<mat-select>` trigger
into a clickable viewport position; the underlying cause (sticky
header overlap, off-screen positioning, or a CSS transform) is not
diagnosed.
**Unblocked when:** a session inspects `outbox/bundesliga-matchday-page.png`
(the real screenshot committed by this probe) or adds a full-page
screenshot at the exact failure point to see what's actually
obstructing the click, then adjusts the interaction (e.g., a keyboard-
driven open instead of a mouse click, or scrolling the specific
ancestor container rather than the page).
**Verify:** re-run `bundesliga-bapi-verify-probe.yml`;
`distinctDflDayIds` containing 2+ distinct real IDs is the done
condition proving the actual question got answered.

## Not done, disclosed

Standings remain correctly out of scope (server-rendered, no API).
No relay route, no client wiring for broadcasts this pass — genuinely
blocked, not silently skipped.
