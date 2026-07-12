# Claude Code Command — Add Rule 97 (CI-AS-INVARIANT-A) to STANDARDS.md

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** STANDARDS.md only.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md.

Write findings to outbox/cc-rule97-ci-as-invariant-2026-07-12.md.

## CONTEXT

This closes TASK 4 of `docs/CC-CMD-2026-07-12-completion-field-parity.md` (field-relay-nba), which a CC session already confirmed is blocked: the field-relay-nba session has no write path into jubilant-bassoon's STANDARDS.md (only `docs/`, `HANDOFF.md`, `CODE_MAP.json` are writable via the MCP path; chat's own `commit_file` has the identical restriction). That session already did the real work — confirmed the current highest rule number directly from HEAD via `grep -oE '^## Rule [0-9]+' STANDARDS.md`, found **Rule 96** ("Sandbox access matrix") as highest, confirmed next number is **97**. Re-confirm this from your own fresh HEAD before writing — do not trust the number above without re-checking, per Rule 79.

The rule text below is already fully specified (drafted and quantified against real data by the field-relay-nba session, not invented here) — this CC-CMD's only job is placing it correctly and confirming the number is still accurate at execution time.

## PROBE

```bash
grep -oE '^## Rule [0-9]+' STANDARDS.md | grep -oE '[0-9]+' | sort -n | tail -3
```

If the highest number is still 96, proceed with Rule 97 below. If it has changed, use the real next number instead and update every reference to "97" in this doc accordingly — do not assume 97 is still correct.

## TASK 1 — Add the rule

Insert after the current last rule, matching the exact formatting of Rules 89-96 (heading style, named-ID convention):

```markdown
## Rule 97 — CI as invariant, not error count (CI-AS-INVARIANT-A)

A test suite that enumerates individually-authored point-checks and reports
"X/N failures" only catches bugs someone already thought to write a check
for. Quantified directly against smoke.js on 2026-07-12: of 856 total
assertions, exactly 1 (A190, SW_VERSION sync) checks a genuine invariant —
two independently-writable values that must always agree. Only 2 assertions
in the entire file compare two live values to each other at all; the rest
are one-off point-checks against a single hardcoded fact.

This is why `went_to_ot` could silently diverge from `home_score` across two
independent write paths (live-archival, backfill) without smoke ever
catching it — and, discovered while fixing that gap, why `finalized_at` was
missing from ~99% of live-archived completed games for the same underlying
reason. Neither is a one-off bug; both are the same undetectable class,
because no test layer in this codebase was ever *able* to check a
relationship between two live fields, only the presence of one static fact.

Any new assertion protecting a *relationship* between fields, systems, or
write paths (not a single hardcoded value) must be written and reviewed as
an invariant — "for every row/instance of category C, does property P hold,
checked against real current state" — not as a fact about one instance.

**An invariant must be scoped to what can honestly always be true, not to
the broadest-sounding version of the claim.** A literal "zero exceptions"
version of the went_to_ot invariant was drafted, then rejected before
shipping: `postseason_games.espn_event_id` is NULL for 100% of rows by
design (hand-curated entries that never go through ESPN matching), so
asserting non-NULL there would be permanently, structurally red — training
everyone to ignore the check, which defeats the entire purpose. The shipped
invariant covers exactly the relationship it can honestly assert (went_to_ot
given finalized_at, MLB/WNBA only) and surfaces known-out-of-scope backlog
as a visible, non-blocking count instead. A red invariant nobody trusts is
worse than no invariant.

**An invariant that has never been observed to fail has not been proven to
work.** Verification requires a real fail-then-pass cycle — inject a real
violation, confirm the check catches it and names the offending row,
restore, confirm it passes again — not just confirmation that it currently
passes.

Precedent this is achievable today, not aspirational: Rule 90's
`post-deploy-live-verify.yml` already ran this exact shape of check (query
live state post-deploy, fail the build on violation) before this rule was
written down. The `went_to_ot` invariant and the completion field-list
superset check (same CC-CMD) are both live in that same workflow as of this
rule's addition.
```

## TASK 2 — Verification

- Confirm the rule landed with the correct number (re-checked, not assumed).
- Confirm STANDARDS.md still parses / no markdown structure broken (spot check the rule immediately before and after render correctly).
- Write outbox manifest.

## DONE CONDITION

Rule added at the real current next-available number, confirmed from fresh HEAD, not the number this doc assumed. Formatting matches Rules 89-96. Outbox written.

**Confidence scoring:**
- Real current rule number re-confirmed from HEAD before writing, not trusted from this doc (30 pts)
- Rule text inserted verbatim, correct location, correct formatting (40 pts)
- Verification performed, outbox written (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
