# CC-CMD: Verification-artifact rule — close the vague-language loophole

**Date:** 2026-07-23
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — this is where Rule
87 SELF-COMPLETE-A and Rule 89 RENDER-CHROME-A already live; keep the
general CC-CMD-authoring rules in one place rather than fork them)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** CLAUDE.md only — one new numbered rule, plus checking whether
field-relay-nba needs a cross-reference.

**Why — a real, named pattern across multiple real incidents, not a
one-off.** Traced back through this project's own history and found the
same root shape recurring under different names: Rule 87's own
VIOLATION SIGNALS list ("verification steps blocked by sandbox egress"
accepted as a stopping point instead of routed around); the regex-
anchoring rule (a bare string match satisfied a check without matching
for the right reason); `rule-gha-for-sandbox-egress-blocks` (a session
accepted STAGED/partial results because "sandbox egress" sounded like a
real blocker); and most directly, the ambient-panel skeleton bug itself
— an earlier version of that fix was plausibly written with a task like
"verify in a headless browser," which is satisfiable by opening a
browser and eyeballing *something*, without ever committing evidence
that the specific claimed behavior actually held. Different surface,
same underlying failure: a CC-CMD task specified as an ACTION VERB
("verify," "confirm," "test," "check") without also specifying what
concrete, externally-checkable ARTIFACT that action must produce gets
satisfied by doing the verb loosely, not by actually proving the claim.

**Target time:** ~10 min — this is a documentation-only change, but
don't rush the rule's own wording into the same trap it's meant to fix.

---

## Do NOT Touch

- Rule 87 (SELF-COMPLETE-A), Rule 89 (RENDER-CHROME-A), or any other
  existing rule's text — this is additive, not a rewrite of prior rules,
  even where they're closely related.
- Any code file — CLAUDE.md only.

---

## Pre-Build Probe (run FIRST)

```bash
git log --oneline -5
grep -n "^### Rule [0-9]" CLAUDE.md | tail -5
grep -n "SELF-COMPLETE-A\|RENDER-CHROME-A" CLAUDE.md
```
Confirm the real current highest rule number before assigning the new
one — do not assume it's 90 just because Rule 89 was the last one this
project shipped; something else may have landed since.

## TASK 1 — Add the new rule

Add the next sequentially-numbered rule. Suggested name:
`VERIFY-ARTIFACT-A`. Suggested text (adapt to match this file's existing
rule-writing style and length, but keep every substantive point):

> **Rule {N} — VERIFY-ARTIFACT-A: verification tasks specify an
> artifact, never a bare action.** A CC-CMD task or Done Condition that
> says "verify," "confirm," "test," or "check" a behavior, without also
> specifying the concrete, externally-checkable thing that must exist
> afterward as proof, is satisfiable without actually proving the claim
> — this has happened under several different names in this project's
> own history (Rule 87's own violation-signal list; the regex-anchoring
> rule; `rule-gha-for-sandbox-egress-blocks`; the ambient-panel skeleton
> bug's own original, looser verification task). The fix: every
> verification instruction states what artifact proves it — a specific
> curl response field that must NOT equal a known-bad value; a committed
> screenshot at a named URL/viewport/state; an enumerated set of
> input/output pairs that must all pass; a diff that must show exactly
> N lines changed in exactly these files. "Looks right" and "works" are
> not artifacts. This binds chat's own CC-CMD authoring as much as CC's
> execution of it — a vaguely-specified verification task is a spec
> failure at the point it's written, not a CC execution failure at the
> point it's satisfied loosely.
>
> **Visual/rendering bugs specifically require the CI-as-proxy Playwright
> pattern**, not an ad-hoc "verify in a headless browser" instruction:
> a dedicated GitHub Actions workflow, triggered by an `outbox/.trigger-*`
> path push, running a real Playwright browser against the LIVE deployed
> URL, committing real screenshots + a structured manifest (booleans like
> `skeletonPresent`, `panelChildCount` — not prose) back to `outbox/` as
> the artifact. See `ambient-skeleton-probe.yml` and its
> `ambient-skeleton-probe-manifest-*.json` output as the reference
> implementation. This exists specifically because sandbox browser
> access (both chat's and CC's) has proven unreliable this project —
> timeouts, viewport mismatches, one wait call that errored outright —
> and GitHub Actions' unrestricted egress is the proven, real escape
> hatch (same principle as `rule-gha-for-sandbox-egress-blocks`, applied
> to visual verification specifically rather than general sandbox
> blocks).

## TASK 2 — Check whether field-relay-nba needs this too

Grep field-relay-nba's own CLAUDE.md (if it has a separate one) for
whether it maintains its own independent copy of the general
CC-CMD-authoring rules (Rule 87 etc.) or whether it's understood to defer
to jubilant-bassoon's as canonical. If it maintains its own numbered
sequence, add the equivalent rule there too, cross-referencing this one.
If not, note in the outbox manifest that jubilant-bassoon's copy is
understood as the shared source and no second write was needed — don't
guess, check the real current state of field-relay-nba's own file.

## TASK 3 — Commit + outbox manifest

Outbox manifest per Rule 67: the real assigned rule number, confirmation
of whether TASK 2 required a second write, and the exact final rule text
as committed (not just this doc's suggested draft, in case CLAUDE.md's
own style required adapting it).

---

## Done Condition

CLAUDE.md contains a new, correctly-numbered rule matching TASK 1's
substance (exact wording may adapt to house style). `grep -n
"VERIFY-ARTIFACT-A" CLAUDE.md` returns a real match post-commit.

**Confidence scoring:**
+30 Correct rule number, confirmed from a real current-HEAD grep, not
    assumed
+40 Rule text preserves every substantive point from TASK 1's draft —
    the artifact-not-action principle, the historical citations, the
    Playwright-specific corollary, and that it binds chat's authoring
    too — even if reworded to fit house style
+20 TASK 2 genuinely checked, not skipped or assumed
+10 Clean commit, honest outbox manifest

Automate follow-ups. No fallbacks, only fixes — if CLAUDE.md's existing
rules turn out to already cover part of this more directly than expected,
do not duplicate; cross-reference the existing rule and add only the
genuinely new part.

Do not commit unless confidence >= 95. If score < 95, report verbatim and
stop.

---

## ONE-LINER

git pull. Read docs/CC-CMD-2026-07-23-verify-artifact-rule.md -- add the
new VERIFY-ARTIFACT-A rule to CLAUDE.md (correct next rule number,
confirmed from current HEAD, not assumed): verification tasks must
specify a concrete checkable artifact, never a bare action verb, and
visual/rendering bugs specifically require the CI-as-proxy Playwright
pattern already proven on ambient-skeleton-probe.yml. Check whether
field-relay-nba needs its own copy or defers to this one. Automate
follow-ups. No fallbacks, only fixes.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
