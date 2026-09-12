# CC session 2026-09-12 — the movement line claimed change without a sequence

Rule 67 session doc for `docs/CC-CMD-2026-09-12-odds-movement-sequence-discipline.md`.
Cross-repo: client `bd8752fa`, `579dc65f`; relay `b03199d`.

| repo | HEAD before | HEAD after | deploy |
|---|---|---|---|
| jubilant-bassoon | `26108d69` | `579dc65f` | deploy-gate 946, SUCCESS |
| field-relay-nba | `7a8e947` | `b03199d` | no deploy path touched |

Smoke 1044 → 1044, 0 failed. SW_VERSION `2026-09-12b` → `2026-09-12c`.

## The defect, and who found it

`field-laboratory`'s `OddsStory` (`src/Desk.fs:1324`) caught a defect in client
code shipped nine hours earlier the same day. The laboratory doing the job it
exists for.

`buildOddsMovement`'s guard fired only when both timestamps existed AND were
equal. Two cases fell through to the movement branch and claimed
"unchanged from open" or a points shift:

| case | what the client said | what was true |
|---|---|---|
| either `captured_at` absent | a change claim | the order is unverifiable |
| closing captured BEFORE opening | a change claim | the pair is not a sequence |

The second is the literal 2026-08-09 defect in `docs/ODDS-PROOF.md`: the
"closing" snapshot was captured **~22 seconds before** the opening one, identical
across moneyline, spread and total. One snapshot written to two columns.

**The equal-timestamp case is the one shape that defect did not produce, and it
was the only one I guarded.**

## The fix

`_isSequence` ports `Desk.fs`'s test rather than its code:

```js
const ot = open?.captured_at ? Date.parse(open.captured_at) : NaN;
const ct = close?.captured_at ? Date.parse(close.captured_at) : NaN;
return Number.isFinite(ot) && Number.isFinite(ct) && ct > ot;
```

Equal, absent, reversed and unparseable now all answer "opened" — one honest
observation instead of an invented finding.

## Verification

`scripts/check-odds-movement-sequence.mjs` runs the REAL exported function
against 10 enumerated fixtures. Not a source regex: seven assertions in this
repo's history passed against source that never ran, so this one executes it.

Four mutations, all caught, each by its own property:

| mutation | caught by |
|---|---|
| revert to the equal-timestamps-only guard (that morning's code) | 4 not-a-sequence cases |
| `ct > ot` → `ct >= ot` | the identical-timestamp case |
| a missing timestamp treated as 0 | the absent-`captured_at` cases |
| the order check dropped entirely | all 7 |

Blocking in `deploy-gate.yml`. `A-ODDS-2` repointed from the deleted equality
expression to the sequence test.

## Task 0 — how often, measured rather than assumed

The relay census counted rows that HAVE a closing snapshot, which cannot see this
defect: a 22-second inversion reads as full coverage. `sequenceOf` in
`scripts/odds-coverage-census.mjs` now sorts every pair into
none / untimed / outOfOrder / sequence, with six self-tests, two of them
mutations.

`outbox/odds-coverage-census.log`, across the two dates it reads:

```
2026-09-06   19 closing snapshots → 18 sequence, 0 untimed, 1 OUT OF ORDER
2026-09-10    5 closing snapshots →  5 sequence, 0 untimed, 0 out of order
```

**The out-of-order row is CFL on 2026-09-06, its only closing snapshot.** Not
hypothetical, not historical — in the archive now. Before `bd8752fa` that card
would have claimed "unchanged from open" from a pair captured backwards.

The census regenerates daily, so the number stays current without being asked.

## What I got wrong

Nothing in this CC-CMD, but it exists because of what I got wrong in the one
before it: I shipped a guard for the one timestamp shape the source defect never
produced, and called the layer correct on that basis.

## Open

Nothing. Closed 2026-09-12.
