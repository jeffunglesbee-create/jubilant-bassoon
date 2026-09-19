# Claude Code Command — Keep the render-reachability declared list current

**Date:** 2026-09-19
**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Type:** C (feature) — completeness guard for an existing check

## CONTEXT — the check is right; the list is a list of one

`scripts/check-render-reaches-dom.mjs` (154 lines) walks a render symbol to a
ROOT — a timer, an event listener, or top-level code — and fails naming where the
chain died. Its header records why it exists, from two failures on one feature in
one session:

```
327678bc  wired the odds line into updateCard  -> 0 callers, marked STAGED
d207c191  re-wired it into renderCard          -> 2 callers, both inside
                                                  buildNightOwlStatic
```

> Both times six structural assertions were GREEN, because they check that text
> exists in the artifact and the text did exist. Neither run ever happened. The
> inference that failed both times was "this function has callers, therefore it
> is the path that runs".

**`TARGETS` currently holds exactly one entry** — the odds movement line
(`buildOddsMovement` / `buildDebrief` / chain `buildDebrief` ->
`injectDebriefCards`).

Verified at HEAD 2026-09-19: that chain DOES reach a root —
`field.js:8612`, `setTimeout(() => injectDebriefCards().catch(() => {}), 600)`.
The check passes and the feature renders.

**The gap is that it can only ever fail on what is declared.** A render target
added tomorrow is uncovered, the check stays green, and green means "the one
declared target is fine", not "render targets reach the DOM". That is the
`FIELD_V2_SOURCES` shape: correct when written, silently incomplete later, still
passing.

The declared-list design is deliberate and CORRECT — its header says a linter
guessing which functions are "render" functions "would be a worse version of the
same guess this exists to replace." **Do not replace it with inference.** Guard
its completeness instead.

## TASK 0 — PROBE (read from HEAD, do not trust this document)

1. Read `check-render-reaches-dom.mjs`. Record the real `TARGETS` contents and
   `ROOT_PATTERNS`. Confirm the entry count; this document says one.
2. Confirm the odds chain still reaches a root and the check is green today.
3. Read `scripts/check-opts-keys-are-read.mjs`, `watch-silently-dead-crons.mjs`,
   `check-collision-reach.mjs` and the `staged-*` family. This is a `has X !=
   runs X` family and the new check must FOLLOW their conventions, not add a
   parallel mechanism. Report what each already covers.
4. Report whether `mutate-collision-reach.mjs` / `mutate-silently-dead-crons.mjs`
   establish a convention this should match (they appear to: a reachability
   check that cannot be shown to fail proves nothing).

## TASK 1 — Guard list completeness

Add a check that fails when a render target exists in source but is absent from
`TARGETS`.

Since the list must stay declared, the completeness signal must also be
declarative: every candidate render symbol is either **in `TARGETS`** or
**explicitly waived with a REASON string** — following the
`// absence-ok: <reason>` convention from `check-absence-collapse.mjs`, where a
bare pragma is rejected and reasons are greppable.

Report THREE counts, never a verdict: declared / waived-with-reason / undeclared.
A single pass/fail cannot distinguish "nothing to find" from "the matcher matched
nothing" — Rule 99 (`STANDARDS.md:4906`), and the same reasoning
`check-absence-collapse.mjs` already applies to itself via `--self-test`.

How to enumerate candidates is the hard part and is Task 0.3's job to inform:
prefer an explicit convention (a naming prefix, an export marker, a manifest)
over heuristics. **If no honest enumeration exists, say so and stop** — a
completeness check built on a guess is worse than none.

## TASK 2 — Mutation counterpart

Add `mutate-render-reaches-dom.mjs` matching the existing convention: break the
chain deliberately and confirm the check fails and names the break. Then restore
and confirm green. A control that cannot fail proves nothing — the
`AMNESTY-PROOF` lesson (40 green assertions, none touching the gap).

## TASK 3 — Automate the follow-up

Wire both into the existing sentinel rather than a new workflow. Report the three
counts per run.

Alarm ONLY on `undeclared > 0`. Do not alarm on `waived` — a waiver with a stated
reason is a decision, not a defect, and an alarm that fires on correct behaviour
trains people to ignore the next one.

**An empty result is a FAILURE, not a pass** — the convention already recorded in
`outbox/cc-session-2026-09-16-odds-name-matcher.md`. If the enumeration returns
zero candidates, that is the enumerator broken, not a clean tree.

## DONE CONDITION

- Task 0.1–0.4 findings recorded, including what the sibling checks already cover.
- Completeness check reports three counts; `TARGETS` entry count matches Task 0.1.
- Mutation counterpart demonstrated failing and then passing, output pasted.
- Sentinel wired; one real run pasted verbatim.
- Smoke green, real count recorded.

## TASK 4 — Outbox manifest (last task)

`outbox/cc-session-2026-09-19-render-target-completeness.md` with the Task 0
inventory, the three counts, the mutation output, the sentinel run, and an
explicit statement of which render symbols the enumerator cannot see.
