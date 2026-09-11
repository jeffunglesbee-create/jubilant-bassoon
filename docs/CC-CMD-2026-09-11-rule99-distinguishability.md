# Claude Code Command — Rule 99 (DISTINGUISHABILITY-A) + mechanical collapse check

**Date:** 2026-09-11
**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Type:** C (feature) — governance rule + enforcement script

## CONTEXT — one defect class, found under a dozen labels

Every one of these is the same move: a value that may not exist is mapped into a
type with no room for "does not exist", so absence lands on that type's zero.

| site | absence became |
|---|---|
| `relay src/index.js:6503` `parseInt(h \|\| '0') \|\| 0` | zero credits remaining |
| `rescore-quality-6b.mjs` `(dims[k] \|\| 0) * (W[k] ?? 0)` | zero points — silently omitted 20 of 294 |
| client `1 - homeWP` (historical) | the draw folded into away |
| `session_health` `title LIKE 'PENDING%'` | `OPEN —` entries not open |
| `change_log` 0 rows | "no journal" = "no journal in this window" |
| route present in manifest | "route exists" = "field shape verified" |
| `closing_odds == opening_odds` | "observed twice, unchanged" = "observed once" |
| era 6 `nonzero on 128/128` | 124 midpoint abstentions = success |

The relay's own era record calls this "the defect class this session has now found
under a dozen different labels." It has no name and no check.

**The live instance that prompted this.** `fetchSportOddsLive` runs with
`cacheTtl: 900, cacheEverything: true`. A Cloudflare edge cache hit returns the
body WITHOUT the vendor's `x-requests-remaining` header. `|| 0` turns that into
`0`. `snapshotCronOdds` then assigns `lastQuota = quotaRemaining` BEFORE checking
`ok`, and the next sport hits `if (lastQuota !== null && lastQuota <
ODDS_QUOTA_FLOOR) return` — `0 < 50` — terminating the snapshot for every
remaining sport.

Measured 2026-09-11: MLS 0/17 rows, Bundesliga 0/2, CFB 0/4, NFL 0/1 across two
dates, while the Odds API account sat at **44,235 of 100,000 credits used**.
Nothing was exhausted. One cache hit silently starved every sport after it.

## THE RULE TO ADD

Next free number is **99** (highest existing is Rule 98, `STANDARDS.md:4845`) —
**verify that at HEAD before writing; do not trust this document.**

> **Rule 99 — DISTINGUISHABILITY-A**
>
> At every boundary, the decoder must be able to represent at least as many
> states as the source can produce that warrant different action.
>
> The test is not "does this handle missing data." It is: **if I see this
> output, how many different upstream realities could have produced it?** If more
> than one, and they would warrant different responses, the type is too narrow.
>
> A source crossing a boundary can answer in at least five ways: a value, an
> absent field, an error status, a success stripped of metadata (cache hit), an
> unparseable body. A bare `number`, `bool` or `string` has room for one.
>
> Absence must be a SIBLING of the value, never a member of it.
> `Unknown` must never gate a decision that `Zero` would gate.

Cite the correct forms already in the codebase rather than inventing new ones:
`Sport.Unrecognised of string` (carries the unmatched label), `Modelled: bool` +
`Omission: string option` (separates "nobody looked" from "deliberately not
modelled"), `CAPPED_DIMS` (the partly-reachable population a binary list had
nowhere to put), `ThreeWayDrawMissing` (refuses to degrade to two-way).

## TASK 0 — PROBE (read from HEAD, do not trust this document)

1. Confirm the highest existing rule number and the exact heading format used by
   Rule 98. Match it.
2. Confirm `STANDARDS-INDEX.md` still does not exist. If a prior CC-CMD has since
   created it, this rule must be added there too.
3. Read Rule 89 and Rule 91 before writing. Rule 91 (SAMPLE-COVERAGE-A) is
   adjacent — coverage undeclared is one instance of this class — and Rule 99
   must be written to complement it, not silently supersede it. If they overlap
   materially, say so rather than adding a near-duplicate.

## TASK 1 — Write the rule

Add Rule 99 to `STANDARDS.md`. Include the boundary-state enumeration, the
"how many upstream realities" test, and at least three of the table rows above
as worked examples with real file:line references verified at HEAD.

## TASK 2 — Mechanical check

Add `scripts/check-absence-collapse.mjs`. Flag, in both repos' source:

- `|| 0`, `|| ''`, `|| []`, `|| false`, `?? 0` applied to a value derived from an
  external read — HTTP header, `await res.json()`, a D1 row field, `parseInt` of
  any of those
- assignment of a decoded value to a variable that later gates control flow,
  where the assignment occurs BEFORE an `ok`/status check

**Expect false positives and design for them.** Many `|| 0` uses are correct
(a genuine default on a value that cannot be absent). Provide an inline
suppression comment carrying a REASON string — not a bare pragma — so that
suppressing requires stating why, and the reasons are themselves greppable.

The check must report three counts: flagged, suppressed-with-reason, clean.
A single pass/fail number would be this rule violating itself.

## TASK 3 — Fix the live instance

In `field-relay-nba` — **separate commit, separate CC-CMD if it grows** — make
`quotaRemaining` `null` when the header is absent, distinct from a real `0`.
`null` must NOT gate the loop; only a genuine numeric reading below the floor
stops it. Move `lastQuota = quotaRemaining` to AFTER the `ok` check.

Do not widen ambient coverage in the same change — that is a budget decision
gated separately.

## TASK 4 — Verification

Run the check across both repos. Paste the three counts and the first ten
flagged sites verbatim. Confirm `src/index.js:6503` is among them; if the check
does not catch the instance that motivated it, it does not work — report failure.

## DONE CONDITION

- Rule 99 in `STANDARDS.md`, numbering confirmed at HEAD, Rule 91 relationship
  stated explicitly.
- `check-absence-collapse.mjs` exists and reports three counts.
- `index.js:6503` appears in the flagged list.
- Smoke green, real count recorded.

## TASK 5 — Outbox manifest (last task)

`outbox/cc-session-2026-09-11-rule99-distinguishability.md` with the Task 0
findings, the rule text as committed, the three counts, the first ten flagged
sites, and an explicit statement of what the check cannot catch.
