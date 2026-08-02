# CC-CMD-2026-08-02-standards-redundancy-audit

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-standards-redundancy-audit.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

STANDARDS.md is approaching 100 rules (Rule 98 landed today). A rule
set this size is genuinely hard for any single session to hold fully
in mind. This is a real audit, not a hunch — find genuine redundancy
before it causes a real conflict (two rules quietly saying almost the
same thing, or a later rule superseding an earlier one without either
being marked as such).

## Task 1 — Read every rule fresh, do not work from memory or summary

Read STANDARDS.md's full, current text at HEAD. Do not rely on any
prior session's characterization of what a given rule says.

## Task 2 — Identify genuine overlap, not superficial similarity

For each pair of rules that plausibly cover similar ground, determine
whether they are:
- Genuinely redundant (one could be removed with zero loss of meaning)
- Complementary but related (both needed, worth cross-referencing
  explicitly if they don't already — matching the pattern Rule 98
  itself uses when it "composes with" Rule 80)
- Actually in tension or contradiction (a real problem, flag with
  urgency regardless of anything else this task finds)

Do not flag two rules as redundant just because they use similar
words — confirm the actual substance overlaps, matching this
project's own established verification discipline (a string match is
not evidence unless confirmed to be matching for the right reason).

## Task 3 — Produce a report, do not act on it

Output a structured list: rule numbers involved, the specific
relationship found (redundant / complementary / contradictory), and a
one-line rationale for each. **Do not delete, merge, or rewrite any
rule as part of this CC-CMD** — modifying governance text is Jeff's
call, not something to execute unilaterally even with high confidence.

## Task 4 — Smoke + verify

- `node smoke.js` — 0 failures required (this task only adds a report
  file, so this should be a no-op check, but run it anyway).

---

## Explicitly NOT in scope

- Do not modify STANDARDS.md itself in any way.
- Do not act on any finding — this is investigation only.

---

## Outbox

`outbox/cc-session-2026-08-02-standards-redundancy-audit.md`: the full
structured findings list, ready for Jeff to review and decide on.
