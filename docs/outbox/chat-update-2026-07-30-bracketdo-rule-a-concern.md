# chat-update-2026-07-30-bracketdo-rule-a-concern

**From:** chat (claude.ai)
**Status:** flagged for review, NOT fixed. Surfaced while investigating
Layer 4 of the soccer drama-scoring gaps — this is broader than that
investigation and involves live, currently-shipping infrastructure.
**Severity:** worth prioritizing above Layer 4 itself, since this is
already running, not dormant.

---

## The finding

`field-relay-nba/src/bracket-do.js`, built 2026-06-11. Header correctly
identifies Rule F compliance (the Monte Carlo probability outputs are
legitimate commodity computations, the kind a neutral vendor would
publish) but the file predates Rule A's establishment (2026-07-07
re-analysis) and has apparently never been re-audited against it.

Actual behavior, from the file's own comments:
```
On each confirmed final result:
  1. Recomputes Monte Carlo projections with updated standings
  2. Computes delta vs prior snapshot
  3. Saves snapshot to DO storage
  4. Fans out {type:'bracket:updated', delta, snapshot} to ALL
     WebSocket clients
  5. Queues journalism brief if delta EXCEEDS SIGNIFICANCE THRESHOLD
```

This is confirmed live in the client too — `src/legacy/field.js` opens a
WebSocket to this DO and re-renders on `bracket:updated`/`bracket:current`
messages.

## Why this matches the established violation pattern precisely

From the July 2026 ADR-002-CONTEXT.md amendment (found via chat search,
quoted verbatim):

> "A value passing Rule F's commodity test is not thereby cleared to be
> pushed... a relay that detects `margin <= 3 && phase === 'crunch'` and
> pushes an event to the client is autonomously generating a watch
> signal... This violates both Rule A (autonomous push keyed to a
> threshold) and Rule F."

`BracketDO`'s trigger ("delta exceeds significance threshold") and
delivery (autonomous WebSocket fan-out to all connected clients, on the
relay's own initiative, the moment the threshold fires) is the same
shape as that worked example. The underlying probabilities passing Rule
F does not clear the delivery mechanism — Rule A governs *how*, and this
appears to be push, not pull.

## What this is NOT

Not a claim that the Monte Carlo math is wrong, or that tracking
cross-game bracket state is itself improper — the DATA MODEL (a
tournament-wide coordinator computing legitimate probability facts) is
sound and exactly the kind of thing Rule F permits relay-side. The
concern is specifically the autonomous push delivery.

## Recommended next step

A proper audit — likely its own CC-CMD, not folded into this note —
confirming the exact trigger conditions, whether ANY gating exists that
might make this closer to pull than it first appears (e.g., does the
WebSocket connection itself only open in response to an explicit user
action, and does that change the analysis — this needs the same
rigor as the original push/pull distinction, not assumed either way),
and if confirmed as a genuine Rule A violation, converting the delivery
to pull (client polls the DO's current snapshot on its existing poll
cycle, rather than the DO autonomously fanning out on state change).

This was not fixed as part of today's session — flagged for prioritized
review, since it is real and currently live, unlike Layer 4 which is
dormant.
