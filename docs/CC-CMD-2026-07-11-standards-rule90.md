# Claude Code Command — Add Rule 90 (RULE-COMPLIANCE-FOLLOWUP-A) to STANDARDS.md

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** Rule 31 already establishes that behavioral rules have no mechanical gate (unlike code, which smoke.js enforces). Rule 40 already strengthens session-start compliance specifically. Neither addresses a distinct, narrower gap: a newly-added rule (like tonight's Rule 89) can be successfully committed to STANDARDS.md while nothing confirms any subsequent session actually read and applied it. "The rule exists" and "the rule is being followed" are different claims — the same distinction Rule 87/CC-CMD-queue-tracking already draws between "on main" and "deployed," applied here to governance instead of code.
**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md first.

Write findings to outbox/cc-standards-rule90-2026-07-11.md.

## TASK 1 — Confirm insertion point

Confirm Rule 89 (added earlier this session) is present and confirm the current highest rule number. Report any drift before inserting Rule 90.

## TASK 2 — Insert Rule 90

```
## Rule 90 — New-rule compliance followup (RULE-COMPLIANCE-FOLLOWUP-A)

A rule being successfully inserted into STANDARDS.md proves the text
exists. It proves nothing about whether any session — chat or Claude
Code — has actually read it, understood it, or applied it since.
These are different claims, and treating the first as evidence of the
second is a real, repeated failure mode in this project (see Rule 31's
own "Tier B enforcement gap" finding, and the separate finding that
session compaction is not equivalent to a clean session boundary and
does not itself guarantee the session-start protocol re-ran).

### Why this matters

Most rules in this document are behavioral, not code-checkable —
smoke.js cannot verify "did the session prefer a scoped tool over a
credential handoff" the way it verifies a DOM pattern exists. Without
some periodic, explicit check, a rule can sit in STANDARDS.md
indefinitely, cited when convenient, silently ignored otherwise, with
no mechanism ever surfacing the gap.

### Operational rules

1. Any session that adds a new rule to STANDARDS.md must, at its own
   next natural checkpoint (session end, or the next session-start
   read of this file), note whether that rule has since been exercised
   — a real case where it applied, or an honest "no applicable case
   arose yet." Do not silently let a rule go unexercised across
   multiple sessions without at least noting the gap once.
2. This is not a retroactive audit of every existing rule — that is
   explicitly out of scope here, and would itself become a task that
   never gets done. It applies going forward, to rules added from this
   one onward, starting with Rule 89.
3. If a rule is found to have been violated (not just unexercised) —
   a session did the thing the rule says not to do — that is not a
   silent correction. Name the rule, name what happened, same as any
   other governance finding in this document's incident-style rules
   (45, 47, 61, 67, 80, 81).
```

## VERIFICATION

- Confirm the inserted text renders correctly, matches surrounding rule formatting.
- Confirm no rule-numbering collision.
- `git diff` shows only this insertion.

## DONE CONDITION

Rule 90 exists in STANDARDS.md, positioned after Rule 89, formatted consistently, verified via clean `git diff`. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 insertion-point confirmation genuinely checked (20 pts)
- Rule 90 text inserted verbatim, correctly formatted (40 pts)
- `git diff` confirmed clean (30 pts)
- No rule-numbering collision (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.