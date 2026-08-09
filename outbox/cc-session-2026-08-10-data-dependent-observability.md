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
