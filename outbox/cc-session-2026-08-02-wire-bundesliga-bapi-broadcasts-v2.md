# CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2 — Result

## Status: CORRECTED FINDING (this update reverses the prior negative
conclusion). Task 1's UI interaction is solved. The day-ID DOES vary
correctly per matchday — the earlier "constant ID" conclusion was a
real bug in this session's own test methodology, not a property of the
site. STOPPED before Task 2/3 for a different, genuine reason: the
resolution mechanism that works is browser-side URL routing, which a
Workers relay (no headless browser) cannot replicate without a new
infrastructure dependency requiring explicit approval (see below).

## THE BUG IN THIS SESSION'S OWN PRIOR TESTING (why "constant ID" was wrong)

Every earlier capture window (initial load, post-consent, matchday-switch
via mat-select click) picked `targetIdx = first option that isn't "All
Matchdays"` — which is **always the same option, Matchday 1**, on every
single run. Three "independent" tests all reported `DFL-DAY-004CBT`
staying constant because they were all testing the identical selection
every time, never two different matchdays in the same run. That is not
evidence the ID doesn't vary; it's evidence the test never varied the
matchday. Caught only by noticing the mat-select click also changed the
page's own URL to `/en/bundesliga/matchday/{season}/{N}` — a real,
previously-unobserved fact from the widened cross-domain capture —
which made a proper multi-matchday comparison possible.

## Decisive retest: `tests/bundesliga-matchday-url-decisive.spec.js`

Directly navigated to `/en/bundesliga/matchday/2026-2027/{N}` for
N = 1, 5, 10 in the same run and compared the resulting `/broadcasts/`
request per matchday. Real result
(`outbox/bundesliga-matchday-url-decisive-result.json`):

| Matchday | DFL-DAY id |
|---|---|
| 1 | `DFL-DAY-004CBT` |
| 5 | `DFL-DAY-004CBX` |
| 10 | `DFL-DAY-004CC2` |

`conclusiveVariation: true`. The id genuinely changes per matchday, and
the deltas are suggestively sequential in a base-36-like encoding
(T→X is 4 steps for a 4-matchday gap; X→…→2 is 5 steps for a
5-matchday gap) — but this pattern is observed from only 3 data points
and is NOT being treated as a confirmed formula. Deriving a hardcoded
offset formula from 3 samples and shipping it would violate Rule 2
(DO NOT ASSUME) — it needs either more samples across a full season and
a season boundary, or (preferably) the actual source of the mapping.

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

## The actual, real answer to Task 1's core question (revised)

**The DFL-DAY id is real, matchday-specific, and correctly resolvable —
but only via the site's own client-side URL router, not via any
directly-callable API this session could find.** Navigating a real
browser to `bundesliga.com/en/bundesliga/matchday/{season}/{N}` causes
the Angular app to resolve `N` to the correct `DFL-DAY-XXX` internally
and then fire the real `/broadcasts/{comId}/{dayId}` request — this
works and is now proven with 3 distinct matchdays. But across every
capture window this session ran (initial load, post-consent,
post-switch, and the widened cross-domain sweep), no plain HTTP
endpoint was ever observed that takes a matchday number and returns a
day-ID directly. The resolution logic lives client-side (likely a
bundled config/lookup table in the Angular app's JS, not a network
call) — confirmed absent from network traffic, not confirmed present
anywhere else.

## Why this stops here (not Task 2/3) — infrastructure blocker, not a diagnosis gap

A Cloudflare Workers relay (no headless browser) cannot replicate
"load this URL in a real browser and read what request it triggers."
Two real paths exist to unblock this, and both require an explicit
decision this session is not authorized to make unilaterally:

1. **Cloudflare Browser Rendering** (Workers Puppeteer API) — real,
   existing Cloudflare product that could let the relay itself resolve
   `N -> DFL-DAY-XXX` by rendering the matchday URL server-side. This
   is a new infrastructure dependency (new binding, new cost surface,
   new failure mode) and falls under "Do NOT add new Durable Object
   classes" / infra-change-without-approval — requires explicit sign-off,
   not something to add unilaterally.
2. **Derive the ID formula** — the 3-sample pattern (`004CBT` → `004CBX`
   → `004CC2` for matchdays 1/5/10) looks like a simple sequential
   base-36-ish encoding, but 3 points is not enough to trust a hardcoded
   formula in production (Rule 2), especially across season boundaries
   where the numeric prefix (`004C`) may also change.

Task 2 (relay route) and Task 3 (client wiring) remain out of scope
until one of these paths is explicitly chosen.

## Unblock criteria (Rule 74)

**Blocked by:** no plain HTTP endpoint found that resolves matchday
number to `DFL-DAY-XXX`; the only working resolution path
(client-side URL routing in a real browser) is not something a
Workers relay can natively replicate.
**Unblocked when:** EITHER (a) explicit approval to add Cloudflare
Browser Rendering as a new relay dependency, and a proof-of-concept
relay route that renders the matchday URL and captures the resulting
broadcasts request, OR (b) a session collects enough real
`(matchday, DFL-DAY-id)` samples across a full season (ideally 34+ for
Bundesliga) to either derive a trustworthy formula or definitively rule
one out.
**Verify:** if (a), a real relay route returns a correct, matchday-
varying `DFL-DAY-XXX` for at least 3 distinct requested matchdays,
verified via `curl`. If (b), an 34-sample table (or a formula verified
against all 34 samples with zero mismatches) is committed and checked
against a fresh live re-fetch before being trusted.
