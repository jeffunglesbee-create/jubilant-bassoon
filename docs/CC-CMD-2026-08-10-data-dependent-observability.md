# CC-CMD-2026-08-10-data-dependent-observability

**Repo:** jubilant-bassoon — commit directly to `main`.

**Origin:** the stated residue on `CC-CMD-2026-08-09-observability-coverage`
(93). That run decided 32 of 74 selectors — 16 measured by render across 12
app states, 16 decided statically. **42 remain undecided**, and none of them
is reachable by toggling a view.

## Why toggling cannot close these

The 42 need DATA, not a view. Measured categories from the manifest:

```
night-owl 3   epl-brief 2   field-row 2   golf-lb 2   jrn-slate 2
series-preview 2   wc-bar 2   ap-arb/brief/card/score 4   atp-score 1
card-brief 1   cascade-line 1   crew-chip 1   desk-card 1   drama-dial 1
fan-out 1   ... (full list in the manifest's rows where observable === null)
```

These mount only when a journalism brief exists in KV, a golf event is
live, a tennis match is in progress, or a game has gone final. Twelve view
states were exercised and none produced them, which is the correct result,
not a probe failure.

## The approach that should work, and its cost

The UFL EPA probe established the pattern: `_buildUFLEpaHTML` is a pure
function, so calling it with synthetic state proved the render without a
live game. The same move works here **only if the renderer is reachable**.
It is not — these renderers are module-scoped and the app ships as an ES
module, so nothing is callable except the ~55 names assigned to `window`.

So this CC-CMD has a real prerequisite decision, and it must be made before
any code is written:

**Option A — expose renderers on `window` for testability.** Cheap to do,
but it widens the public surface of the bundle for a test's benefit. That is
a design change and needs sign-off; do NOT do it unilaterally.

**Option B — drive real data through the app.** `window.goToDate` is
exposed. A date with a full in-season slate would mount `epl-brief`,
`atp-score`, `golf-lb` and several others naturally. Cost: the probe becomes
date-dependent, and a date that was rich when chosen goes empty later —
the same staleness that makes fixture-dependent checks unreliable.

**Option C — accept the residue and assert it stays bounded.** The 42 are
already proven correct at the RULE level (L2a: all 74 resolve). What is
unproven is only whether each change was *observable*, which is a property
of the past, not a defect risk.

**Recommendation: C, with a guard.** Nothing about these 42 is suspected
wrong; the open question is historical. Spending a design change (A) or
accepting staleness (B) to characterise a past change is poor value. The
guard: assert `l2.undecided` never grows, so a future colour change to a
data-dependent selector is not silently added to an unmeasured bucket.

## Task 1 — probe from HEAD

```
git log --oneline -5
python3 -c "import json,glob;d=json.load(open(sorted(glob.glob('outbox/token-resolution-probe-*-manifest.json'))[-1]));print(d['l2'])"
```
If `undecided` is already 0, close this CC-CMD as moot.

## Task 2 — decide A / B / C, and record the decision

Write the choice and its reasoning into the outbox doc BEFORE implementing.
A decision made after the code exists is a justification, not a decision.

## Task 3 — implement the chosen option

If C: add an `undecidedBudget` constant to `token_resolution_probe.js`, set
to the current count, and fail the run when `l2.undecided` exceeds it. Same
shape as `STOP_LISTED` — a documented number that turns a known residue into
a regression detector instead of a permanent asterisk.

## Done condition (artifact, per Rule 90)

A committed manifest at the current deployed `swVersion` with:
- the chosen option named in the outbox doc with its reasoning
- if C: `l2.undecided <= undecidedBudget` and the run exits 0; and a
  deliberate test that raising the count by one fails the run, with that
  failing output pasted into the outbox
- `l1.regressions: []` — unchanged

## Task 4 — outbox

`outbox/cc-session-{date}-data-dependent-observability.md` with a confidence
score; amend the observability-coverage gate if this closes it.
