# Triage of the 263 absence-collapse findings — 2026-09-12

Follow-on to `outbox/cc-session-2026-09-11-rule99-distinguishability.md`, which
closed saying the 263 were "a census, not a backlog… no evidence yet that any is
live." That was wrong about one of them, and the triage is why.

## Method

The rule's own discriminator: *"Unknown must never gate a decision that Zero
would gate."* So the axis is whether the collapsed value reaches a decision.

A first tiering pass **failed** and is recorded because the failure is
instructive: it asked "is there an `if (` or `===` within 5 lines", which put
217 of 263 in the top tier — most code contains a conditional. It discriminated
nothing. The second pass binds the variable name from `const X = … || []` and
asks whether **X specifically** is compared, negated, or length-tested within 6
lines.

| tier | | count |
|---|---|---|
| 1 | numeric collapse — a number gates by nature | **10** |
| 2 | named binding that then reaches a decision | 49 |
| 3 | named binding, iterated / spread / returned only | 81 |
| 4 | not a named binding (inline argument, property, return) | 123 |

## Tier 1, all ten, individually reviewed

**Four real defects, fixed:**

| site | what absence became | consequence |
|---|---|---|
| `.github/scripts/odds-backfill.js:154-155` | quota 0 | **live daily cron**: `Math.min(DAILY_CEILING, remaining)` → budget 0 → the whole backfill silently no-ops, logging `remaining=0` as if exhausted |
| `scripts/probe-odds-api.mjs:113-114` | quota 0 | the probe prints `remaining: 0` on a missing header — an instrument manufacturing the finding it was sent to measure |
| `scripts/soccer-league-mislabel-scope.mjs:137` | count 0 | **the verifier**: "COUNT returned no row" printed as `0 mislabeled row(s) remaining` |
| `scripts/soccer-league-mislabel-scope.mjs:95` | count 0 | same instrument, display line |

The odds-backfill one is the same defect as `dc7df57`, in a fourth location that
fix did not reach. The other three are measuring apparatus — this session's
recurring shape.

`soccer-league-mislabel-scope`'s exit code was **already right by accident**:
`null !== 0` so it failed. But the message said "FAIL: mismatches remain" when
what happened is the count could not be read. It now reports UNKNOWN as a third
outcome.

**Six reviewed and found correct:**

| site | why it is correct |
|---|---|
| `sw.js:47` | `if (cacheTime && …)` already excludes 0 from the eviction decision |
| relay `index.js:5928` | absent field and real 0 take the same branch; the unsafe direction is *skipping* a draft, which neither produces |
| relay `index.js:13269` | `rows` is returned undistorted beside the count |
| relay `index.js:13516` | `r.n` is `COUNT(*)` from a `GROUP BY`, never null on a row that exists |
| the two `?? 0` in `soccer-league-mislabel` | superseded by the fix above |

Three carry `absence-ok:` suppressions. **`sw.js:47` is deliberately left
flagged**: suppressing it means editing a deploy-trigger path, which forces an
SW_VERSION bump in two files and a full deploy, for a comment.

One suppression initially did not register — I wrote it as a comment on the line
*above* the code. A suppression has to sit on the flagged line.

## The finding the check could not see

Tier 2 pointed at ~20 `d1Res.results || []` sites. Reading them showed the
collapse is not there — D1's `.all()` always returns an array on success. It is
one call deeper:

**`src/index.js` has seven `.catch(() => ({ results: [] }))` sites where a
FAILED query becomes an empty result set that the consumer reports as a
successful answer.**

- `:6856` answers `{ok:false, skipped:true, reason:'no active postseason series'}` — a factual claim about the postseason, produced by a database error.
- `:12148/12154`, `:12283`, `:12302` answer HTTP 200 `{ok:true, games: []}`.
- `:13507` feeds a fabricated `slateCount` into `divergence`, which gates a repair path.
- `:13708` reports a gap for every sport.

This class was listed **first** in Rule 99's own "what the check cannot catch"
section. It was found by reading the tier the check produced — the census earned
its keep by pointing somewhere useful, not by being right.

**The check now sees it.** `catch-collapse` is its own op label, mutation-tested
(neutering the pattern turns all four new fixtures red). Seven routes is its own
change: `field-relay-nba docs/CC-CMD-2026-09-12-catch-collapse-routes.md`
(Rule 87.4).

## Counts, before and after

```
BEFORE          flagged 263   suppressed 0   clean 138,430 lines
AFTER           flagged 373   suppressed 3   clean 138,365 lines
                    || []            171
                    catch-collapse   119   <- newly visible, was 0
                    || ''             64
                    ?? []             17
                    || 0               1   <- was 7
                    ?? ''              1
                    ?? 0               0   <- was 3
```

**The total went UP, and that is the point.** Teaching the check to see
catch-collapse added 119 findings that were always there. The number that
measures the triage is the numeric tier: **10 → 1**, and the one remaining is
reviewed-correct.

A per-op breakdown was added to the output for the same reason the three counts
exist: `373` alone hides that 119 of them are one newly-visible class, most of
it probe and test scaffolding.

## What is still not known

- The 171 `|| []` and 64 `|| ''` were tiered mechanically, not read
  individually. Tiers 3 and 4 (204 sites) are asserted inert on the structure of
  the line, not on a reading of each consumer.
- 112 of the 119 catch-collapse findings are in probes, tests and `smoke.js`.
  Judged a different and mostly acceptable risk; not audited one by one.
- Rule 76 (FALLBACK-CAP-A) violations turned up incidentally —
  `context-assembler.js:692, 789, 814` each chain three or four levels. Not in
  scope here, not yet filed.

Smoke: 1037 passed, 0 failed.
