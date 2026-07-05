# CC-CMD: Pick 'em gaps — MLB missing-from-list + CFL pick-display break (investigate live first)

**Date:** 2026-07-05
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Two real, user-observed bugs. This doc deliberately does NOT prescribe a specific fix for either — both need live confirmation first, not a fix built on static-reading guesses.

**Real, reported symptoms, not hypothetical:**
1. Marlins @ Athletics, starting soon, does not appear in the Pick 'em list.
2. After selecting a team for a CFL game (Winnipeg Blue Bombers @ Hamilton
   Tiger-Cats), neither the pick confirmation nor the eventual win
   probability displays.

**Leads investigated via static code reading, presented as leads only —
none confirmed as the actual cause:**
- The Pick 'em list gates strictly on `getCardCircadian(...) === 'PREVIEW'`.
  For MLB, that's `status === 'pregame'`. It's possible ESPN flips a
  game's status away from `pregame` shortly before first pitch, which
  would structurally exclude "starting soon" games by design, not bug —
  but this is unconfirmed without checking the actual live status field.
- CFL assigns its own `_id` at the data-fetch layer itself
  (`_id: 'cfl_' + t.id`), a different mechanism from every other sport,
  which gets `_id` assigned later inside the render loop. This is a real
  structural difference, but whether it's actually what breaks the pick
  display requires live confirmation, not assumption.

Do not build a fix around either lead without confirming it live first.
Both may be real; either may be a red herring; there may be a third,
unrelated cause for one or both.

**Target time:** ~40 min, more if the live investigation surfaces something
requiring deeper follow-up (report honestly rather than force a fix to
this estimate)

## CONFIDENCE GATE
Do not commit any fix unless confidence ≥ 95 on that fix specifically.
The investigation itself has no confidence gate — report findings
plainly regardless of whether they're clean or messy.

## TASK 1 — Live-investigate the MLB gap

Find a real MLB game currently in a "starting soon" window (or wait for
one / use the actual Marlins @ Athletics game if it's still relevant).
Inspect its actual live `status` field directly (console-log the
relevant game object from `allData`, or equivalent). Determine: is it
still `pregame` and simply excluded by something else, or has it
already transitioned to a different status before the Pick 'em list
would include it? Report the real, observed value — do not guess.

## TASK 2 — Live-investigate the CFL break

Make a real pick against a real CFL game in the live app. Immediately
inspect: does `makePick()` actually get called with the right arguments
(check via browser devtools/console)? Does the `.pick-widget` DOM
element get found by the `querySelector` lookup afterward? Does
`buildPickWidgetHTML()`'s "pick made" branch actually get invoked, and
if so, what HTML does it actually produce? Trace the real, observed
failure point — don't stop at the first plausible-looking difference
(e.g., the `_id` format lead above) without confirming it's actually
where things break.

## TASK 3 — Fix based on what's actually found, not the leads above

Once the real cause of each is confirmed, fix it. If the two leads
above turn out to be correct, fine — but confirm first. If something
else entirely is the cause, fix that instead and say so plainly rather
than forcing the fix to match the leads this doc raised.

## TASK 4 — Verify both fixes live

Real end-to-end check for both: a soon-starting MLB game appears in the
list (or, if PREVIEW's window is genuinely too narrow by design, report
that as a design question rather than silently patching around it), and
a real CFL pick displays correctly through to resolution.

## SCOPE BOUNDARY

DO:
- Investigate both live before writing any fix
- Report the real, observed cause for each, even if it's not either lead above
- Fix only what's actually confirmed broken

DO NOT:
- Build a fix around the _id or status-timing leads without live confirmation
- Touch anything unrelated to these two specific symptoms
- Treat "plausible from static reading" as equivalent to "confirmed"

## DONE CONDITIONS
- [ ] MLB gap's real cause identified via live inspection, not assumed
- [ ] CFL break's real cause identified via live inspection, not assumed
- [ ] Both fixed based on confirmed causes
- [ ] Both verified live end-to-end
- [ ] Outbox manifest written, stating clearly which leads (if any) from this doc turned out correct vs. wrong

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-05-pickem-cfl-mlb-gaps.md. Two real
bugs, both need live investigation before any fix -- this doc
deliberately doesn't prescribe one. (1) A soon-starting MLB game isn't
appearing in the Pick 'em list -- check its actual live status field,
don't assume it's still 'pregame'. (2) A CFL pick doesn't display after
selection -- trace the real failure point live (does makePick fire
correctly, does the DOM lookup find the widget, what does the rebuilt
HTML actually contain) rather than assuming it's CFL's different _id
scheme without confirming that's actually where it breaks. Fix based on
what's actually found. Verify both live end-to-end. Report plainly
which leads in this doc were right or wrong. Do not commit unless
confidence ≥ 95 on the actual fix. If score < 95 report verbatim and stop.
