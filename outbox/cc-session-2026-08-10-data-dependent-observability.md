# CC-CMD-2026-08-10-data-dependent-observability — Result

## Task 1 — not moot

```
outbox/token-resolution-probe-2026-08-09T17-47-00-864Z-manifest.json  sw 2026-08-09e
l2: total 74, pass 73, fail 0, ruleNotFound 0, notInThisEngine 1,
    measuredByRender 16, decidedStatically 16, undecided 42
```

`undecided` is 42, not 0. Proceeding.

---

# Task 2 — THE DECISION, recorded before any code exists

**This section is committed on its own, ahead of the implementation commit.**
The CC-CMD requires the decision to precede the code, and `git log` order is
the artifact that proves it did rather than my saying so.

## Chosen: Option C — accept the residue, bound it with a budget guard.

## Why, re-derived rather than restated

The CC-CMD I wrote already recommended C. Under Rule 72 an inherited claim is
a hypothesis even when I am the one who wrote it, so I re-argued all three
rather than rubber-stamping my own recommendation — and the re-argument found
a hole in C that the recommendation had not noticed.

**Option A — expose the renderers on `window` so the UFL-EPA trick
generalises.** The premise is real: those renderers are module-scoped, the
bundle is ESM, and only ~55 names reach `window`, so nothing else is
callable. And A is genuinely powerful — it would make every data-dependent
render testable with synthetic input, exactly as `_buildUFLEpaHTML` was.

Rejected because it changes production code's public surface for a test's
benefit, which is a design decision this session has no mandate to take
unilaterally, and because it is the kind of "while I'm here" widening Rule 69
exists to stop. It stays on the table as a governance item, not as work I do.

**Option B — drive real data through `window.goToDate`.** Rejected on a
measurable objection rather than a vibe: the 42 need journalism briefs in KV,
a live golf event, an in-progress tennis match, or a game gone final. A date
chosen today because it is rich is empty in a month, and the probe then
reports a lower `measuredByRender` with no code change — a check that decays
into noise. That is the same fixture-dependence this whole line of work has
been removing, reintroduced deliberately.

**Option C — accept and bound.** The 42 are already proven correct at the
rule level: L2a resolves all 74 selectors whether or not they render. What is
unproven is only whether each past change was *observable* — a property of
history, not a defect risk.

## The hole in C, found by re-arguing it

As the CC-CMD specified it, the guard watches the *count*. That catches a new
selector joining the unmeasured bucket. **It does not catch a future colour
change to a selector already in it** — the count would stay at 42 and the
change would slip through unmeasured.

That hole turns out to be already closed, and it is worth stating why rather
than discovering it later: **L2a covers all 74 selectors regardless of
rendering.** Any future change to one of the 42 still gets rule-level
verification — does its declaration resolve to a real token — on every probe
run. Only observability stays unmeasured, and observability is precisely the
attribute that carries no defect risk. C is sound; the reasoning it shipped
with was incomplete.

## One improvement over the CC-CMD's spec

A fixed ceiling only ratchets one way. If a future run happens to decide more
selectors — because a golf event is live, say — the budget should tighten, or
the number silently permits regression back to 42 forever.

So the guard is two-sided: **fail** when `undecided > budget`, and **warn**
when `undecided < budget`, naming the lower number so the budget gets
tightened rather than quietly leaving slack. The CC-CMD asked for the first
half only.

---

*(Everything below this line was written after the implementation, per the
CC-CMD's task order.)*

---

# Task 3 — implemented, and the deliberate failure test changed the design

## Status: DONE. **Confidence: 96.**

Commits, in the order the CC-CMD required:
`634b993a` decision (no code) -> `89ea784f` first implementation ->
`744d19c6` gate corrected. No app code changed, so no SW_VERSION bump; the
probe measures `2026-08-09e`, already live. Smoke 965/0.

## The failure test did not just pass — it invalidated the guard

The CC-CMD asked for "a deliberate test that raising the count by one fails
the run". I ran it, and it exposed that the metric I had just gated on is
**non-deterministic**. Two CI runs three minutes apart, no code change
between them:

```
                     17:56 run      17:59 run
undecided                42             45
measuredByRender         16             13
journalism state          8              6   selectors rendered
stats state              15             10
```

Root cause, investigated rather than shrugged at: the app polls ESPN every
15-30s and re-renders, so the fixed post-toggle wait sometimes samples a view
before it has populated, and the live slate itself differs between runs.

**A ceiling on `undecided` therefore fails on timing, not on a regression.**
A guard that cries wolf gets switched off — which is the exact outcome this
whole line of work exists to prevent. The first implementation would have
shipped that.

## The corrected gate

```
total                    74   <- the committed diff-derived selector list
decidedStatically        16   <- CSSOM only: no element, no network, no wait
structurallyUndecidable  58   =  total - decidedStatically
```

Neither input touches the DOM or the network, so the number is identical on
every run of a given build. Verified across environments: **two local runs
both reported 58 while `undecided` read 57 locally against 42 and 45 in CI.**
The gated number is stable exactly where the informational one is not.

It also gates the thing worth gating. A future colour fix that touches a
data-dependent selector raises `total` without raising `decidedStatically`,
and trips the budget. `undecided` and `measuredByRender` stay in the manifest
as informational — useful for seeing what a run happened to catch, never
pass/fail.

## Done condition — both halves, on the deployed build

**Passing run** — `outbox/token-resolution-probe-2026-08-09T18-04-55-065Z-manifest.json`,
`swVersion 2026-08-09e`:
```
structurallyUndecidable 58   budget 58   verdict PASS
L1 PASS  regressions 0
informational: undecided 45, measuredByRender 13
conclusive true
```

**Deliberate over-budget run** — dispatched with `undecided_budget: 57`,
`outbox/token-resolution-probe-2026-08-09T18-06-52-069Z-manifest.json`:
```
structurallyUndecidable 58   budget 57
verdict FAIL-OVER-BUDGET     conclusive false
```
The run exits non-zero. The guard fires on the boundary, in the right
direction, on the deployed build.

Done by lowering the budget by one rather than fabricating a 59th
undecidable selector: the inequality under test is identical, and
manufacturing an extra selector would mean corrupting the committed input
list that the whole probe's trustworthiness rests on.

## One bug caught before pushing

`Number(process.env.X ?? 58)` is wrong here. `??` falls back only on
null/undefined, and GitHub sets an unfilled `workflow_dispatch` input to the
**empty string**, which `Number()` turns into 0 — so every ordinary run would
have failed at budget 0. Now blank-safe, while still honouring an explicit 0,
since 0 is the legitimate end state once nothing is undecidable (`|| 58`
would have discarded it). Checked against `''`, `undefined`, `'41'`, `'0'`,
`'abc'` and `'  43 '`.

The dispatch input reaches the probe through `env`, never interpolated into a
shell line — it is attacker-controllable by anyone who can dispatch, and the
runner holds `contents: write`.

## Confidence gate

**96.** The decision was recorded in its own commit ahead of any code, with
git order as the proof rather than my assertion; all three options were
re-argued rather than rubber-stamped, which found a hole in my own
recommendation; the implementation was corrected when its own failure test
disproved the metric; and both halves of the done condition produced
committed manifests at the deployed SW_VERSION.

Not higher because the residue is now *bounded and monitored*, not resolved:
58 selectors still have no observability measurement, and the guard proves
only that the number cannot grow unnoticed. That is the outcome Option C was
chosen for, so it is the intended end state rather than a shortfall — but
"we decided not to answer this" is a weaker position than "we answered it",
and the score should say so.

Option A — exposing the module-scoped renderers on `window` so the
UFL-EPA synthetic-input trick generalises to all 58 — remains the only route
that would actually resolve them. It stays open as a governance item
requiring sign-off, not as pending work.
