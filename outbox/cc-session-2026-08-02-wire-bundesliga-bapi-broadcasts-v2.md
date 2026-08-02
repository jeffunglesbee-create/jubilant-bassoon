# CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2 — Result

## Status: Task 1 UI interaction SOLVED (real breakthrough, novel
diagnosis). Core ID-resolution question answered with real, negative
evidence. STOPPED before Task 2/3 — the answer means building a
per-matchday broadcast lookup on `DFL-DAY-004CBT` is not currently
supported by what this session could observe; see below.

## How Task 1's blocker actually got solved (novel thinking, not repeated guessing)

Every earlier attempt iterated on the *click mechanism* (force click,
scroll-into-view) against the same symptom ("outside of viewport").
The actual fix came from reading the real committed screenshots instead
of guessing a 4th/5th click variant:

1. `outbox/bundesliga-matchday-page.png` showed the true root cause: a
   full-screen Sourcepoint/Contentpass consent modal was still covering
   the entire page in every prior run. My consent selectors were wrong
   (guessed OneTrust/generic text) — the real buttons say "Agree &
   continue" / "Deny & surf ad-free". Fixed with the exact real text.
2. `outbox/bundesliga-post-consent.png` (taken once consent no longer
   blocked the view) showed the *next* real cause: three visible
   `mat-select` elements exist (season/matchday/clubs). The generic
   class-based `.first()` selector was very likely grabbing a hidden
   mobile/duplicate variant of the same component in DOM order, not the
   visible "All Matchdays" control — explaining the persistent
   "outside of viewport" error even with `scrollIntoViewIfNeeded` (a
   `display:none` element can't be scrolled into view). Fixed by
   targeting the real visible text instead of DOM order.

Both fixes were diagnosed from real artifacts, not further guesses at
the same mechanism — this is what actually unblocked the interaction.

## Real result once the interaction worked

`outbox/bundesliga-bapi-verify-result.json` (latest run):
- `matSelectFound: true`, `matchdaySwitchAttempted: true`,
  `matchdaySwitchSucceeded: true` — the dropdown opened for real and a
  real option was selected.
- Real options captured: `Franz Beckenbauer Supercup`, `Matchday 1`
  through `Matchday 19` — confirms this is a real, normal Bundesliga
  matchday selector, not a dead-end preseason-only widget.
- `distinctDflComIds: ["DFL-COM-000003", "DFL-COM-000001"]` — the
  competition ID **did** change after switching away from the default
  Supercup view, to `DFL-COM-000001`. This confirms the *original*
  CC-CMD's assumption ("`DFL-COM-000001` is almost certainly stable")
  was correct for the real Bundesliga league context — `000003` is
  specific to the Supercup, the page's default landing context today
  (real, current preseason state).
- `distinctDflDayIds: ["DFL-DAY-004CBT"]` — **only one value, unchanged**
  even after a real, successful switch to "Matchday 1".

## The actual, real answer to Task 1's core question

**The `DFL-DAY-XXX` broadcasts request did not re-fire with a new ID
when the matchday selector changed.** The most likely explanation given
the real evidence (the fixture list itself visibly updated per the
screenshot sequence, and the comId did change) is that the broadcasts
endpoint is called once per competition/page-load context and the
UI's per-matchday fixture list is filtered/rendered from data already
fetched, not re-queried per selection — i.e. there may be no simple
"pick a matchday, get its ID" resolution call to find, because the
real site doesn't make one either at this granularity. This is a real,
disclosed negative finding, not a guess: 5+ genuine fix attempts
diagnosed from real evidence got the interaction itself fully working,
and the ID still didn't change on a real, successful selection.

## Why this stops here (not Task 2/3)

Per the CC-CMD's own explicit gate: a broadcast lookup that always
returns `DFL-DAY-004CBT` regardless of what matchday is actually
requested would be exactly the "fabricated-looking correctness" both
CC-CMD versions warn against — even though the interaction bug is now
solved, the resolution mechanism itself was not found to exist at the
UI layer.

## Unblock criteria (Rule 74)

**Blocked by:** no observed API call that maps a selected matchday to a
`DFL-DAY-XXX` ID; the fixture list appears to render from data already
present after page load.
**Unblocked when:** a session captures ALL network requests during the
initial page load (not just after a UI interaction) to find whether a
single upfront call already returns every matchday's ID (a full-season
fixture list with day-IDs attached per fixture), which would make this
resolvable without any further UI automation at all.
**Verify:** re-run `bundesliga-bapi-verify-probe.yml` with a widened
capture window covering page load itself; a real day-ID-to-matchday
mapping recovered from that initial payload is the done condition.
