# CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts — Result

## Status: STOPPED at Task 1. Confidence < 95. Reporting verbatim per
the CC-CMD's own explicit instruction ("do not build anything in
Task 2/3 if Task 1 cannot find a real resolution mechanism"), not
proceeding to Task 2/3/4.

## Approach note
Same as the LaLiga sibling CC-CMD: `field-playground` correctly not
added. Built `tests/bundesliga-bapi-verify.spec.js` +
`.github/workflows/bundesliga-bapi-verify-probe.yml`, self-contained
in jubilant-bassoon.

## Real result (`outbox/bundesliga-bapi-verify-result.json`)

**Both originally-captured endpoints now return 403** (previously
200):
```
GET wapp.bapi.bundesliga.com/broadcasters?promoteInHeader=true          -> 403
GET wapp.bapi.bundesliga.com/broadcasts/DFL-COM-000001/DFL-DAY-004CBT   -> 403
```
This alone fails Task 1's first requirement ("re-verify both captured
endpoints still return real 200 data fresh"). Access has changed since
the original capture — either the "no auth key required" finding was
wrong, or Bundesliga added a real access control since discovery
(bare API-context requests, no browser session/referer, may simply be
blocked now — not fully isolated, disclosed as a genuine limit below).

**The real, live site's own request differs from the CC-CMD's
assumption in a specific, concrete way.** A real network capture while
loading `bundesliga.com/en/bundesliga/matchday` today caught the site
itself making:
```
wapp.bapi.bundesliga.com/broadcasts/DFL-COM-000003/DFL-DAY-004CBT
```
**`DFL-COM-000003`, not `DFL-COM-000001`** — the CC-CMD's own text
called `DFL-COM-000001` "almost certainly a stable Bundesliga
competition ID." Real evidence contradicts that: the live site is
currently requesting competition ID `000003` (matomo tracking on the
same page confirms the page is showing "Franz Beckenbauer Supercup |
2026/27 Season" — a preseason competition, plausibly why the
competition ID differs from a regular Bundesliga-season ID).

**`DFL-DAY-004CBT` itself is unchanged** from the original capture,
even on this completely independent, fresh page load — worth noting
as a real data point, not proof of anything: could mean the ID is
more persistent than assumed, or (more likely given it's currently
preseason with a single marquee fixture) the site simply has only one
real "matchday" to show right now.

## Why the actual ID-resolution question is still open, not answered

Task 1's core ask — navigate between at least two genuinely different
matchdays and observe whether `DFL-DAY-XXX` changes — **did not
execute**. The probe's generic matchday-nav-click selectors
(`button:has-text("Matchday")`, `[aria-label*="matchday"]`, etc.)
found zero real matching elements (`matchdayNavClickCount: 0`) against
the real live DOM. This is a genuine tooling gap, not a negative
finding about the resolution mechanism — I did not get to test the
actual question Task 1 needed answered.

## Why this stops here rather than guessing

- The baseline check (endpoints still return 200) already failed —
  403 now, not 200. Building Task 2 (a relay route) against endpoints
  currently returning 403 would ship a route that doesn't work.
- The competition-ID assumption in the CC-CMD's own text was wrong
  (`000001` vs. real `000003`), which independently undermines
  confidence in treating anything else as safely assumable.
- The actual date→ID resolution question remains genuinely untested,
  not negatively-confirmed — hardcoding `DFL-DAY-004CBT` (explicitly
  forbidden) or guessing a resolver endpoint now would be exactly the
  "fabricated-looking correctness" the CC-CMD warns against.

## Unblock criteria (Rule 74)

**Blocked by:** (1) 403 on both original endpoints — real access
change, cause unconfirmed; (2) no working generic selector to drive
real matchday navigation on the live site, so the actual date→ID
question was never tested.
**Unblocked when:** a session inspects `bundesliga.com`'s real DOM
directly (via a Playwright trace/screenshot from a probe run, or
manual inspection) to find the real matchday-switcher selector, and
separately determines whether the 403s are a genuine access-tightening
(needs an Origin/Referer/session artifact this headless probe didn't
send) or something else.
**Verify:** re-run `bundesliga-bapi-verify-probe.yml` after both are
addressed; `originalEndpoints.broadcasters === 200` and at least 2
distinct entries in `distinctDflDayIds` (proving the cross-matchday
test actually ran) are the done conditions.

No code shipped. Standings remain correctly out of scope (server-
rendered, no API, confirmed again not to attempt).
