# CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2 — Result

## Status: Task 1 UI interaction SOLVED (real breakthrough, novel
diagnosis). Core ID-resolution question answered with real, negative
evidence, confirmed under BOTH the pre-consent and post-consent capture
windows. FINAL — no day-ID mapping call was found anywhere in this
session's captures, and the one remaining caveat (consent-gated fetch)
has now been ruled out with real evidence. STOPPED before Task 2/3.

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

**Caveat now ruled out (retry with post-consent capture window)**: the
spec was extended to also snapshot a dedicated post-consent window —
a 5s capture starting immediately after `consentDismissed: true`, to
control for the possibility that the site defers its real data fetch
until after consent (a common CMP-gated pattern). Real result:
`postConsentPayloadCaptureCount: 2` — both calls were repeats of
already-seen endpoints (`/broadcasts/DFL-COM-000001/DFL-DAY-004CBT` →
`{"broadcasts":[]}`, and the same `/editorial` feed). No new endpoint,
and no day-ID mapping, appeared post-consent either. The CMP-gating
caveat is now ruled out with real evidence, not assumed away.

## The actual, real answer to Task 1's core question

**The `DFL-DAY-XXX` broadcasts request did not re-fire with a new ID
when the matchday selector changed, and no call observed in either the
pre-consent or post-consent capture windows returns a day-ID mapping.**
Combined with the original finding (comId changes, dayId doesn't, on a
real successful matchday switch), the evidence now consistently points
to one conclusion across three independent checks: the fixture list is
rendered from data fetched once per competition/page-load context and
filtered client-side — there is no observed API call, at any point in
the page lifecycle this session could inspect (initial load,
post-consent, post-matchday-switch), that resolves a selected matchday
to a `DFL-DAY-XXX` ID.

## Why this stops here (not Task 2/3) — FINAL

Per the CC-CMD's own explicit gate: a broadcast lookup that always
returns `DFL-DAY-004CBT` regardless of what matchday is actually
requested would be exactly the "fabricated-looking correctness" both
CC-CMD versions warn against. The interaction bug is solved. Three
independent, real capture windows (initial page-load, post-consent,
post-matchday-switch) all returned the same negative result. This is
no longer a tooling gap or an unexplored angle — it's a converged,
three-way-confirmed finding. Task 2 (relay route) and Task 3 (client
wiring) are abandoned for this CC-CMD: there is no real per-matchday
broadcast data to wire up. A route that only ever serves
`DFL-DAY-004CBT` regardless of the caller's requested matchday would
misrepresent every non-current-matchday query.

## Unblock criteria (Rule 74)

**Blocked by:** confirmed absence of any per-matchday day-ID
resolution mechanism observable from the public site, across three
independent real capture windows.
**Unblocked when:** DFL/Bundesliga publishes or exposes a different,
documented API (not the public bundesliga.com bapi surface) that
serves a full-season fixture list with day-IDs attached — this is now
an external-dependency block, not a session-diagnosable one.
**Verify:** if such an API is later found, re-run a capture against it
and confirm a real day-ID varies correctly across multiple distinct,
named matchdays (not just comId) before writing Task 2/3.
