# ADR-002 Addendum: US10328326B2 Continuation Patent Analysis

**Status:** Accepted addendum to ADR-002 (Drive: 1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4)
**Date:** 2026-06-09
**Repo:** jubilant-bassoon
**Trigger:** PPUBS fetch of RUWT continuation patents US9744427B2 + US10328326B2
**Claims source:** outbox/patents/US9744427.txt, outbox/patents/US10328326.txt

---

## Context

ADR-002 was written against US9421446B2 (original, 2016). RUWT filed two
continuations that materially differ in scope:

- US9744427B2 (2017): "game statistics" replaces "live in-game statistics"
  from the original. Structure otherwise similar. Claim 10 (apparatus) adds
  "prior to completion" requirement explicitly.

- US10328326B2 (2019): Three significant expansions detailed below.

---

## US10328326B2 — Three Material Changes

### Change 1: Threshold removed from primary method claim

Original (US9421446 Claim 12): notification when interest level value
"meets one or more threshold levels."

Continuation (US10328326 Claim 12): notification "when the rating has
**changed**."

No threshold required in the broadest method claim. Any rating change
triggers notification. This weakens Loopholes 2 and 5 (threshold-based
defenses) as PRIMARY defenses under '328. Those loopholes still apply to
'446 and '427, and to '328's dependent claims that re-introduce thresholds
(Claims 5, 6, 18).

**Implication for ADR-002:** The three-component decoupled architecture
(Rules A/B/C/D) is now MORE important, not less. It is the defense that
holds across all three patents regardless of whether a threshold is present.
Rule D (push checker evaluates independently on standalone boolean) prevents
the push path from becoming the notification element of a '328 Claim 12
infringement, even without a threshold.

### Change 2: Web site display as explicit notification mechanism

US10328326 Claim 7: "notification engine provides notifications by
presenting notifications on a website accessible by users."

US10328326 Claim 8: "notification engine provides notifications by
updating an indication of the rating displayed on the website."

RUWT deliberately extended the notification mechanism to cover website
display — likely anticipating the "each browser renders it" defense.

**FIELD's defense:** Claims 7-8 are apparatus claims requiring a
"notification engine" (server-side component) presenting/updating on a
website. FIELD's website is a client-side PWA. The entity that updates
drama state displays is the client JS — part of each user's browser, not
a server-side "notification engine coupled to a rating engine."

**Rule for ADR-002:** FIELD MUST NOT move to server-side rendering (SSR)
of drama state. If drama scores were computed server-side and injected into
HTML served to users (SSR), the server would become a "notification engine
updating an indication of the rating displayed on the website" — directly
practicing Claims 7-8. The client-rendered PWA architecture is not just
a performance choice; it is a patent compliance requirement.

### Change 3: API and web service as notification mechanisms

US10328326 Claim 9: "notifications through a web service."
US10328326 Claim 10: "notifications through an API."

A relay that computes ratings and delivers them via API could implicate
Claims 9-10.

**FIELD's defense under ADR-002 Rule A (dumb data relay):** The relay
computes no ratings. It delivers raw facts (scores, periods, clocks). A
dumb data relay is not a "notification engine providing notifications
through an API" because it provides no notifications — it provides data.
A client that fetches data and decides what to show is the notification
layer, and that layer is client-side.

**This is why Rule A cannot be relaxed for live drama scoring.** If the
relay were modified to compute drama scores and serve them via API (even
without threshold comparison, because '328 Claim 12 requires none), it
would directly become the "rating engine" of a coupled rating-engine +
notification-engine system where the API delivery constitutes
"notifications through an API" per Claim 10.

---

## The Primary Defense That Holds Across All Three Patents

All apparatus claims in all three patents require:

  "a rating engine... AND a notification engine COUPLED TO the rating engine"

FIELD has no such coupled pair. The three-component architecture (ADR-002)
exists specifically to prevent this coupling from forming:

- Component 1 (relay): raw data only, no ratings, no notifications
- Component 2 (client classifier): ratings only, no notifications, never writes to shared server state
- Component 3 (push cron): standalone boolean on raw data, never reads Component 2 output

No two FIELD components form a "processing/rating engine coupled to a
notification engine." This structural argument holds for '446, '427, and '328.

---

## Amnesty Zone — Confirmed Across All Three Patents

US9744427 Claim 10 (apparatus): "game statistics are received prior to
completion... notifications transmitted prior to completion" — explicit
live-game requirement.

US10328326 Claim 11 (apparatus): identical "prior to completion" language.

US10328326 Claim 12 (method): requires "monitoring feeds containing game
statistics" — post-game, no live feed exists and no game statistics change.
The method cannot be practiced on concluded games.

The post-game (Amnesty Zone) is outside all three patents. Server-side
computation of drama arc data from concluded games carries no RUWT exposure
regardless of where (client or Cloudflare) the computation occurs.

---

## Rules Updated by This Addendum

### Rule A (Dumb Data Relay) — scope expanded:
The relay must not compute ratings. This was always true under '446. Under
'328 Claim 10 (API notifications), it is now doubly important: an API
delivering computed ratings could constitute "notifications through an API"
without any threshold requirement.

### New Rule E — No Server-Side Rendering of Drama State:
FIELD must not use SSR to inject drama scores or ratings into HTML served
to users. Client-rendered PWA architecture is required for FIELD's defense
against '328 Claims 7-8. If FIELD ever moves to SSR, this rule must be
re-evaluated before deployment.

### ADR-002 Status Reminder:
ADR-002 remains PROPOSED (Drive doc) — not ratified by counsel. This
addendum documents the continuation patent analysis for next counsel review.
Rule 45 applies: this is engineering analysis, not a legal opinion.

---

## References

- ADR-002 (Drive): 1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4
- US9421446B2 claims: patent-fulltext workflow output (prior run)
- US9744427B2 claims: outbox/patents/US9744427.txt (fetched 2026-06-09)
- US10328326B2 claims: outbox/patents/US10328326.txt (fetched 2026-06-09)
- PPUBS pipeline ADR: .github/adr/ADR-PATENT-001-ppubs-source.md
