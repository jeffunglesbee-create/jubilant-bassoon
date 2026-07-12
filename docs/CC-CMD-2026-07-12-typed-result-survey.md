# Claude Code Command — Survey and classify all null/false/swallowed-catch sites by migration value, before migrating any of them

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** ADD a survey report only. Zero behavior change. This CC-CMD does not migrate any call site — it produces the ordered list later CC-CMDs will each pick one item from.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and docs/CC-CMD-2026-07-12-field-operation-primitive.md (must be merged first — depends on `fieldOperation()` existing, though this CC-CMD only references it, doesn't call it).

Write findings to outbox/cc-typed-result-survey-2026-07-12.md, AND create docs/TYPED-RESULT-MIGRATION-QUEUE.md as the durable, ranked artifact (this is the actual deliverable — the outbox is the process record, this file is what future CC-CMDs read from).

## CONTEXT — the real chunking question, and why subsystem-based chunking is the wrong axis

825 real candidate sites exist (406 `return null;`, 75 `return false;`, 344 silent-swallow `catch` blocks — re-confirm exact counts in TASK 0, time will have passed). The obvious chunking — one CC-CMD per subsystem (scores, then relay reads, then storage, then journalism...) — is not the right axis. Wrapping a call site in `fieldOperation()` only fixes anything if the *caller* is updated to branch differently per failure mode (retry on `retryable:true`, show a distinct degraded-state UI on `HTTP_ERROR` vs silently reuse stale data, etc.). A site where the caller currently does `const x = result || fallback` and would keep doing exactly that after migration gains nothing but plumbing — migrating it first is wasted motion dressed as progress.

**The real chunking axis is: does this specific call site's caller currently have (or plausibly should have) a materially different response per failure mode?** That's a property of each individual site, not of which subsystem it lives in. This survey's whole job is answering that question for every real site, so later work is prioritized by actual value, not by which file looks tidiest to convert first.

## TASK 0 — Probe, re-confirm real current counts

```bash
grep -c "return null;" index.html
grep -c "return false;" index.html
grep -cE "catch\s*\([^)]*\)\s*\{\s*(/\*.*\*/\s*)?\}" index.html
```

Do not trust the 406/75/344 figures above without re-running this — this doc's numbers are from earlier the same day.

## TASK 1 — Classify every site into exactly one bucket

For each of the ~825 sites, read enough surrounding context (the function it's in, and — critically — every call site of *that* function) to determine:

- **BUCKET A — differentiated-response candidate:** the caller could plausibly act differently depending on *why* this failed (retry vs. surface vs. degrade-gracefully vs. genuinely-fine-as-null). Migrating this site to `fieldOperation()` and updating its caller(s) would be a real behavior fix, not decoration.
- **BUCKET B — decorative only, for now:** the caller currently discards the distinction regardless (a bare `|| default`, a `if (!result) return` with one path) and there's no near-term plan to change that. Migrating this produces better *telemetry* (via `FIELD_OPERATIONS.recordFailure`) but no behavior change. Still worth doing eventually for observability, but should sort below Bucket A.
- **BUCKET C — legitimately fine as-is:** `false`/`null`/`{}` is the complete, correct semantic here (e.g., a boolean predicate helper where `false` genuinely means "no," not "unknown/failed"). Do not migrate these. Say so explicitly so nobody re-litigates it later.

Do not guess a bucket from the function name alone — actually read each call site's caller(s). If a genuinely ambiguous case comes up, record it as its own note rather than forcing a bucket.

## TASK 2 — Rank Bucket A by real leverage

Within Bucket A, rank by: (1) how many distinct call sites/callers depend on this one function's return value (higher = more leverage per fix), (2) whether this session's own investigation history already surfaced this exact function as a source of real, confirmed confusion (search prior outbox/HANDOFF history for the function name — a site already implicated in a real incident outranks one that's merely theoretically ambiguous).

## TASK 3 — Write the durable queue file

`docs/TYPED-RESULT-MIGRATION-QUEUE.md`: ranked Bucket A list (function/location, current behavior, what differentiated behavior would look like, call-site count), then Bucket B list (grouped, not itemized — these are a batch cleanup, not individually prioritized), then Bucket C list (function/location, one-line reason it's correctly excluded). This file is what the next CC-CMD in this sequence reads to pick its single target — do not pre-select one here, that's a separate, later CC-CMD's job.

## TASK 4 — Verification

- Spot-check: pick 3 real Bucket A entries and 3 real Bucket C entries, re-derive their bucket assignment from scratch reading only the code (not this task's own prior classification), confirm agreement. Report any disagreement found and correct it.
- Confirm total counts reconcile: Bucket A + B + C sizes sum to the TASK 0 re-confirmed total.
- Write outbox manifest per Rule 87.

## DONE CONDITION

Every real site classified into exactly one bucket with a stated reason, not guessed from the function name. `docs/TYPED-RESULT-MIGRATION-QUEUE.md` exists, ranked, and is what future single-concern migration CC-CMDs will read from. Zero behavior change anywhere in the actual application.

**Confidence scoring:**
- TASK 0 re-confirms real current counts (10 pts)
- TASK 1 classification reads actual callers, not guessed from names — spot-check in TASK 4 confirms this (35 pts)
- TASK 2 ranking has a stated, real basis (call-site count + incident history), not arbitrary (20 pts)
- TASK 3 produces a genuinely usable, durable queue file, not just an outbox note (20 pts)
- TASK 4 spot-check performed for real, any disagreement found and corrected, not skipped (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
