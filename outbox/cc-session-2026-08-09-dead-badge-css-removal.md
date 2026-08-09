# CC-CMD-2026-08-09-dead-badge-css-removal — Result

## Status: DONE. Six rules deleted, all three done conditions met. **Confidence: 97.**

Commits: `401e3891` (deletion + probe TARGETS), `7929f27a` (SW_VERSION).
SW_VERSION `2026-08-09b` -> `2026-08-09c` (ET). Deploy run `31317473052`
succeeded. Smoke 965/0 before and after.

## Task 1 — re-verified from HEAD, and widened

The CC-CMD's own probe passed:

```
ts-badge:           0 refs in src/legacy/field.js
free-tonight-badge: 0 refs in src/legacy/field.js
```

I did not stop there. A zero grep is only evidence of absence if the
class cannot be built dynamically, and this repo has exactly that
pattern — `.field-chip--*` is assembled at `field.js:2218` as
`'field-chip field-chip--' + tier`, so a naive grep for
`field-chip--MUST` would have found nothing and concluded, wrongly, that
it was dead. Checked for the same shape here:

```
grep -rn "'ts-'\|`ts-\|ts-\(badge\|series\|elim\|clinch\|playoff\)\|free-tonight" src/ *.js
    -> no matches
```

And widened past this repo, since the relay serves HTML too:

```
grep -rn "ts-badge\|free-tonight-badge" /home/user/field-relay-nba/src/
    -> no matches
```

Every remaining occurrence in the whole repo:

```
index.html                                  <- the rules themselves
indexreview.html                            <- review artifact, not served
badge_token_sweep_probe.js                  <- this sweep's own probe
docs/CC-CMD-*.md, outbox/*.md, outbox/*.json <- this sweep's own paperwork
```

Nothing renders them. Deletion proceeds.

## Task 2 — deleted

Six rules, one commit, `index.html` CSS only:

```
.ts-badge
.ts-badge.ts-series_deciding
.ts-badge.ts-elimination
.ts-badge.ts-clinch
.ts-badge.ts-playoff_impl
.free-tonight-badge
```

`indexreview.html` untouched, as instructed. No other badge family
touched.

Two of these (`ts-series_deciding`, `ts-elimination`) and
`.free-tonight-badge` had been tokenised hours earlier by
`CC-CMD-2026-08-09-badge-chip-token-sweep`. That work is now deleted
along with the rules — which is the correct outcome, and worth stating
plainly rather than quietly: tokenising them was effort spent on code
that never rendered, and only the live probe revealed it.

## Task 3 — done conditions, all three met

**1. Smoke:** `965 passed, 0 failed` — unchanged. No assertion referenced
these selectors, which the CC-CMD flagged as the thing to check rather
than assume.

**2. Grep:** `grep -c "ts-badge\|free-tonight-badge" index.html` -> **0**.

**3. Live probe** — `outbox/badge-token-sweep-probe-2026-08-09T14-06-07-450Z-manifest.json`,
`swVersion: "2026-08-09c"`, i.e. it measured the deployed deletion:

```
{"pass":12,"fail":0,"emitted":1,"notEmitted":11,"total":12}  conclusive: true

css=PASS  EMITTED      .chip-have   synth=rgb(45, 212, 191)
```

`.chip-have` still PASS and still EMITTED, with all 11 other surviving
targets still PASS. The deletion changed nothing that renders.

The three matching entries were removed from the probe's `TARGETS` in
the same commit, as Task 3 required.

## One contradiction in the CC-CMD, resolved rather than silently picked

Task 3.3 asked for two incompatible things: that the `.ts-badge.*` rows
"must still read `NOT-RENDERED`" in the manifest **and** that those
entries be removed from `TARGETS`. A removed target produces no row, so
both cannot hold.

Removal is the coherent reading, and the one I took. Keeping them would
have been actively worse than useless after the synthetic-node change:
the probe now creates an element carrying the class and reads its
computed colour, so a selector with no rule left returns the *inherited*
colour and reports a spurious `FAIL` — a probe failing loudly about
something it is no longer measuring. The evidence the spec actually
wanted from those rows — "the deletion broke nothing live" — is carried
by `.chip-have` remaining PASS/EMITTED and by smoke holding at 965.

Flagging it because a spec that cannot be satisfied as written is a
defect at authoring time (Rule 90's own point), and quietly choosing one
half would hide that.

## Confidence gate

**97.** The deletion is backed by a search that specifically defeated
this codebase's known false-negative (dynamically concatenated class
names), extended across the companion repo, and all three done conditions
produced real artifacts — a grep count of zero, unchanged smoke, and a
live manifest at the post-deletion SW_VERSION.

Not higher because `indexreview.html` still carries the same six dead
rules. It is not served and the CC-CMD explicitly said not to touch it,
so leaving it is correct here — but it means a future grep for
`ts-badge` will still find hits, and someone could reasonably read that
as the deletion having been incomplete.
