# CC-CMD: Standardize field:all_final onto the PM-27 envelope

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Found while documenting the event bus for reference: `field:all_final`
is dispatched from two separate sites, and neither uses the PM-27
standard envelope (`{type, target, source, reason, at, payload}`) that
`field:crunch`, `field:otw_changed`, and `field:ws_fresh` all correctly
use today. Worse, the two sites aren't even consistent with each other:

```js
// Site 1 (~line 28637, SSE-triggered): { count, date, source: 'sse' }
// Site 2 (~line 41255, checkForNewFinals): { count, ts: Date.now() }
```

Site 1 has `source`, site 2 doesn't. Site 1 has no timestamp field at
all; site 2 calls it `ts` rather than PM-27's `at`. `field:all_final`
postdates the original PM-27 scope (which only covered `field:crunch`/
`field:otw_changed`/`field:ws_fresh`), so it was never brought in line —
this is a real, standing schema-consistency gap, not a hypothetical one.

`field:all_final` has two current subscribers (~line 28904, ~line
29046) — check what each actually reads from `e.detail` before
changing the shape, so nothing currently-working breaks.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "field:all_final" index.html
# Re-confirm both dispatch sites and both subscribers are still exactly
# where this doc says, and that no third site has appeared since.

sed -n '28900,28910p;29040,29055p' index.html
# Read both current subscribers in full — confirm exactly which detail
# fields each one actually reads before changing the payload shape.
```

## TASK 1 — Standardize both dispatch sites onto the real PM-27 envelope

Both sites should match the proven shape exactly:

```js
fieldEvents.dispatchEvent(new CustomEvent('field:all_final', { detail: {
  type: 'field:all_final', target: 'slate', source: <'sse' | 'poll'>,
  reason: <'sse_wrap' | 'checkfornewfinals'>, at: Date.now(),
  payload: { count: <value>, date: <value if available> }
}}));
```

Use whichever `source`/`reason` values are accurate per site — don't
invent generic ones if the probe shows a more precise existing term
already in use nearby (e.g. matching `field:crunch`'s `reason:
'crunch_time_badge'` naming convention).

## TASK 2 — Update both subscribers to read the new shape

Both current subscribers read the old flat shape (`e.detail.count`,
etc.). Update both to read `e.detail.payload.count` (and any other
fields each one actually uses, per the probe). Do not leave one
subscriber reading the old shape while the dispatch sends the new one.

## TASK 3 — Live verification

Confirm via a real or constructed test that both dispatch sites now
produce the identical envelope shape, and that both subscribers still
receive and correctly use the fields they depend on — not just that
the code runs without error, but that the specific behavior each
subscriber triggers (per the probe's read of their bodies) still fires
correctly.

## DONE CONDITIONS

- [x] Both dispatch sites produce the identical, correct PM-27 envelope
- [x] Both subscribers updated to read `payload.*`, verified against
      what the probe showed they actually use
- [x] Live-verified: both sites tested, both subscribers confirmed
      still functioning correctly, not just structurally unchanged

## CONFIDENCE SCORING

- +35 — both dispatch sites correctly and identically standardized
- +35 — both subscribers correctly updated, verified against actual
  fields each one reads
- +30 — live verification covers both dispatch sites and both
  subscriber behaviors, not just one side

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-all-final-envelope-standardize.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
