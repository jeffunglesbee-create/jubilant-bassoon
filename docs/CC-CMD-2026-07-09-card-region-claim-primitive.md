# CC-CMD: Card-region claim primitive — prevent silent last-writer-wins before it exists

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

**This is foundational infrastructure, not a bug fix — be honest about
that distinction throughout.** Nothing in the current codebase actively
exhibits this problem today, because none of the 75 UI-feature-bundle
ideas discussed tonight are built yet. This CC-CMD exists to build the
primitive *before* multiple independent listeners start writing to the
same card regions, not to fix something currently broken. Score and
report accordingly — "proven sound via a realistic constructed test" is
the correct done condition here, not "fixed a live bug."

**The real problem this prevents:** the event bus (`fieldEvents`, PM-27
envelope, verified earlier tonight) is a genuine fan-out mechanism — one
`field:crunch` firing can reach every listener subscribed to it
simultaneously. If two independent features both react to the same
event by writing text into the same card subline element, JavaScript
doesn't error; the second write silently overwrites the first with no
signal that a collision happened. Nothing in the event bus, and nothing
found in tonight's `CARD_ATTRIBUTE_SYNC` work, currently coordinates
*content* ownership of a shared region — `CARD_ATTRIBUTE_SYNC` (per
tonight's espnScores optimization findings) governs boolean CSS classes
(`espn-live`, `espn-final`, circadian state), a different and narrower
problem than "which feature's text wins this slot."

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "CARD_ATTRIBUTE_SYNC" -A 20 index.html
# Confirm precisely what this registry actually covers before building
# anything new. If it already generalizes to arbitrary content claims
# (not just boolean classes), extend that instead of building a
# parallel system — report this explicitly either way, don't assume
# tonight's characterization of it is still accurate.

grep -n "fieldEvents.addEventListener" index.html
# Full current list of every real subscriber, to confirm none of them
# already implement some form of claim/priority coordination that this
# CC-CMD would be duplicating.
```

## TASK 1 — Build the minimal claim primitive

A small, generic function, not tied to any specific feature:

```js
function claimCardRegion(cardId, regionKey, { source, priority, render, ttlMs = 4000 }) {
  // one shared registry: _cardClaims[cardId + ':' + regionKey]
  // if no existing claim, or existing claim's priority is lower,
  // or existing claim has expired past its ttlMs: this claim wins —
  // call render(), record {source, priority, at: Date.now(), ttlMs}
  // otherwise: this claim silently loses — do NOT call render(), and
  // return false so the caller can log/observe the loss if it wants to
}
```

Keep the priority model simple for this first version — a plain
integer, caller-supplied, no attempt to derive it from `fieldGameTier`
or any other system. Ties broken by "existing claim wins" (don't
thrash on equal priority). Ttl exists so a claim doesn't hold a region
forever if the feature that made it never explicitly releases it.

**Explicitly out of scope for this pass:** wiring any of the 75 bundle
ideas to this primitive. None of them are built yet. This task is the
primitive itself, proven generic, not an integration.

## TASK 2 — Prove it with a realistic constructed collision

Since no real feature exists yet to test against, construct a
realistic one: two synthetic claimants on the same card's subline
region — one representing a "walkout"-style high-priority claim, one
representing a lower-priority ambient claim — firing in immediate
succession, simulating what two real event-bus listeners reacting to
the same `field:crunch` firing would actually do. Confirm: the
higher-priority claim wins regardless of arrival order (fire the lower
one first, then the higher one, and separately the reverse order —
confirm the higher-priority one wins both times, not just when it
happens to arrive second). Confirm a claim past its `ttlMs` correctly
loses to a fresh lower-priority claim rather than holding the region
forever.

## TASK 3 — Live verification

Run the constructed collision test against the actual deployed
function (not just local reasoning about the code), and report the
real observed outcome of each ordering case from Task 2.

## DONE CONDITIONS

- [x] `CARD_ATTRIBUTE_SYNC` checked first; confirmed genuinely separate
      from this primitive (boolean classes vs. content claims), or this
      task redirected to extend it if the probe shows otherwise
- [x] Primitive built generically — no bundle-specific logic, no
      dependency on features that don't exist yet
- [x] Both arrival orderings tested for the priority collision, both
      correctly resolve to the higher-priority claim
- [x] TTL expiry tested and confirmed to correctly release a stale claim

## CONFIDENCE SCORING

- +20 — `CARD_ATTRIBUTE_SYNC` overlap genuinely checked, not assumed
- +30 — primitive built generically, no premature bundle-specific
  wiring
- +30 — both priority-collision orderings tested and correctly
  resolved
- +20 — TTL expiry tested and correct

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-card-region-claim-primitive.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
