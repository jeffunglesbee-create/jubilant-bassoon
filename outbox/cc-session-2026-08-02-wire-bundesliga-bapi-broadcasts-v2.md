# CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2 — Result

## Status: Task 1 UI interaction SOLVED (real breakthrough, novel
diagnosis). Core ID-resolution question answered with real, negative
evidence. Follow-up "capture initial page-load payload" instruction
also answered with real, negative evidence. STOPPED before Task 2/3 —
no day-ID mapping call was found anywhere in this session's captures.

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
   visible "All Matchdays" control. Fixed by targeting the real visible
   text instead of DOM order.

## Real result once the interaction worked

`outbox/bundesliga-bapi-verify-result.json`:
- `matSelectFound: true`, `matchdaySwitchAttempted: true`,
  `matchdaySwitchSucceeded: true` — the dropdown opened for real and a
  real option was selected.
- Real options captured: `Franz Beckenbauer Supercup`, `Matchday 1`
  through `Matchday 19`.
- `distinctDflComIds: ["DFL-COM-000003", "DFL-COM-000001"]` — the
  competition ID **did** change after switching away from the default
  Supercup view, confirming `DFL-COM-000001` is the real league context.
- `distinctDflDayIds: ["DFL-DAY-004CBT"]` — only one value, unchanged
  even after a real, successful switch to "Matchday 1".

## Follow-up: initial page-load payload capture (this update)

Per the unblock criteria below, the spec was widened to capture EVERY
`bapi.bundesliga.com` response (not just `/broadcasts/`) from the
moment `page.goto()` fires, before consent dismissal or any UI
interaction. Real result — exactly 5 calls fired in that window:

1. `GET /broadcasts/DFL-COM-000003/DFL-DAY-004CBT` → `{"broadcasts":[]}`
2. same URL again (duplicate)
3. `GET /broadcasters?promoteInHeader=true` → real broadcaster list (ESPN+)
4. `GET /broadcasts/DFL-COM-000001/DFL-DAY-004CBT` → `{"broadcasts":[]}`
5. `GET /editorial?category=fixturesbl1&...` → editorial/news feed, not
   a fixture/day-ID list

**None of these five is a full-season fixture list with day-IDs
attached.** The initial payload does not carry a day-ID mapping. This
is a real negative finding, not a tooling gap — the capture window
covered actual page-load network activity and simply doesn't contain
that data.

**Important caveat, disclosed honestly**: this capture window is
pre-consent (the 5s wait happens before the consent-dismiss step in the
spec). It's possible the site defers its full matchday/fixture-list
fetch until after consent is granted (common CMP-gated pattern). This
session did not additionally capture the *post-consent* page-load
window as a separate check — that is the one remaining unexplored
angle, not the already-tested UI-interaction angle from the original
Task 1 finding.

## The actual, real answer to Task 1's core question

**The `DFL-DAY-XXX` broadcasts request did not re-fire with a new ID
when the matchday selector changed, and no upfront call in the raw
page-load window returns a day-ID mapping either.** Combined with the
original finding (comId changes, dayId doesn't, on a real successful
matchday switch), the most likely explanation remains that the
fixture list is rendered from data fetched once per
competition/page-load context and filtered client-side — not resolved
via any observed API call at either point in the page lifecycle this
session was able to inspect.

## Why this stops here (not Task 2/3)

Per the CC-CMD's own explicit gate: a broadcast lookup that always
returns `DFL-DAY-004CBT` regardless of what matchday is actually
requested would be exactly the "fabricated-looking correctness" both
CC-CMD versions warn against. The interaction bug is solved and the
initial-payload question is now answered (negatively) — but no
resolution mechanism was found to exist at either layer this session
could observe.

## Unblock criteria (Rule 74)

**Blocked by:** no observed API call, in either the pre-consent
page-load window or the post-matchday-switch window, that maps a
selected matchday to a `DFL-DAY-XXX` ID.
**Unblocked when:** a session captures the **post-consent** page-load
network window specifically (dismiss consent first, then capture the
next N seconds of `bapi.bundesliga.com` traffic) to rule out the
CMP-gated-fetch caveat above — the one variable not yet controlled for.
**Verify:** re-run `bundesliga-bapi-verify-probe.yml` with the capture
window moved to start immediately after `consentDismissed: true`
instead of before; a real day-ID-to-matchday mapping recovered from
that post-consent payload is the done condition. If still absent, this
finding should be treated as final and Task 2/3 abandoned for this
CC-CMD.
