# CC Session Outbox — Rule 90: Mechanical Rule-Registry Tracking (CC-CMD-2026-07-11-standards-rule90, jubilant-bassoon portion: TASKS 1-2)

**Date:** 2026-07-11
**Scope:** TASKS 1-2 only, per explicit instruction (TASK 3 targets
field-relay-nba, out of scope here). Adds the mechanical version of
Rule 90 to `STANDARDS.md` and registers Rule 89 as its first real
registry entry.

## Pre-work: the doc's own premise didn't hold, investigated and reported before proceeding

Both TASK 1 ("find the existing 'Rule 90 — New-rule compliance
followup' section... and replace its full body") and TASK 2 ("confirm
Rule 89... is present in STANDARDS.md") assumed prior state that did
not exist. Confirmed via direct grep and `git log -S` on `STANDARDS.md`:
neither Rule 89 nor any Rule 90 section had ever been added to that
file — zero commit history, zero codex entries (`codex_search`/
`codex_list` both empty for "rule-89"/"rule-90"/category
"rule-registry"). Reported this to the user rather than fabricating
either rule's content or silently treating "replace" as "add" without
flagging it. **The user confirmed: run the sibling
`CC-CMD-2026-07-11-standards-rule89.md` first.**

**A genuine race surfaced mid-task, investigated rather than assumed
benign.** After committing Rule 89's addition locally, a `git push`
was rejected — `git log origin/main` showed 3 new commits, all titled
like real STANDARDS.md executions ("docs: CC-CMD add Rule 89...",
"docs: replace Rule 90 with the mechanical version..."). Before
rebasing, checked what these commits actually touched
(`git show --stat`): all three only modified the **CC-CMD doc files
themselves** (`docs/CC-CMD-2026-07-11-standards-rule89.md` /
`-rule90.md`) — the user authoring/amending the instructions I was
already executing, not a second execution of them. Confirmed via
`git show origin/main:STANDARDS.md` that Rule 89/90 still didn't exist
there. Rebase was safe and applied cleanly with zero conflicts,
confirmed via a post-rebase `grep -c` showing exactly one `## Rule 89`
heading, not two.

## TASK 1 — Rule 90 added (there was no existing section to replace)

Inserted the mechanical Rule 90 text **verbatim**, exactly as given in
the CC-CMD doc, immediately after the newly-added Rule 89 (same
placement reasoning as Rule 89 itself — see
`cc-standards-rule89-2026-07-11.md`: preserves the file's existing
number-matches-position, strictly-increasing convention rather than
becoming the second exception to it). `git diff --stat`: 47 insertions,
0 deletions — pure append, nothing else in the file touched. `grep -c
"^## Rule 90"`: exactly 1.

## TASK 2 — Rule 89 registered in the codex, then a serious pre-existing collision found

Called exactly the write the doc specifies:
`codex_write(category:"rule-registry", key:"rule-89",
title:"UNEXERCISED -- Rule 89: prefer a scoped MCP tool over any
credential handoff to a session, even short-lived")` (plus a `content`
field — required by the tool's schema, not optional as the doc's
example implied; populated with the rule's real text and a pointer to
its `STANDARDS.md` location, not fabricated).

**Verified via `codex_read("rule-89")`** (exact-key lookup): the entry
is real, stored, with genuine timestamps — not simulated.

**The doc's own literal verification instruction doesn't work as
written, investigated rather than dismissed as a tool bug:**
`codex_search("rule-89")` (the doc's exact suggested call) returns
**zero results**. Root cause: `codex_search` matches literal substrings
in title+content text, not the `key` field — and neither this entry's
title nor content contains the exact lowercase-hyphenated string
`"rule-89"` (they say "Rule 89", capitalized, space-separated).
`codex_search("Rule 89")` (case/format-matched) does find it. Noted as
a minor precision gap in the doc's own VERIFICATION wording, not a
defect in the registered entry — confirmed the entry is genuinely
correct via the more precise `codex_read` method.

**That same corrected search surfaced a real, serious, pre-existing
numbering collision — reported here, not fixed (out of scope for this
task):** `codex_search("Rule 89")` also returns an existing,
unrelated entry — `rule-89-scope-legible-a`, category `rule`, titled
*"Rule 89 — durability and holism as one test at four scope radii"*,
registered 2026-07-08. Confirmed via direct grep: **`docs/CLAUDE-CODE-
PROMPT-RULES.md` has its own independently-numbered `## Rule 89 —
Legible across scope (SCOPE-LEGIBLE-A)`** (line 243) — a completely
different rule, in a completely different governance document, from
the `STANDARDS.md` Rule 89 (SCOPED-TOOL-DEFAULT-A) this session just
added. `STANDARDS.md` and `docs/CLAUDE-CODE-PROMPT-RULES.md` are
maintained as two independent, separately-numbered rule sequences that
happen to collide at 89 — purely coincidental, not caused by anything
in this CC-CMD, but a genuine, pre-existing structural risk to the
whole rule-registry mechanism Rule 90 exists to build: rule *numbers*
alone are not a reliable unique key across this project's governance
documents. **Not fixed here** — renumbering either rule is a real
decision (which document's Rule 89 is "canonical," whether to
renumber, what breaks if cross-references to either number exist
elsewhere) that this task's scope doesn't cover. Flagged for a
dedicated CC-CMD; the existing codex entries already disambiguate by
full key (`rule-89` vs. `rule-89-scope-legible-a`), so no data
corruption resulted from this session's write.

## VERIFICATION

- `git diff` (both `STANDARDS.md` insertions, Rule 89 and Rule 90):
  clean, additive only, confirmed via `git diff --stat` after each
  edit and a final `grep -c` for both headings (1 each).
- `codex_read("rule-89")`: real, stored entry confirmed, not simulated.
- `node smoke.js index.html`: 919/0, unaffected — `STANDARDS.md` is not
  part of the deploy-gate trigger paths or smoke's own checks.

## DONE CONDITION

Rule 90's text is the mechanical version, added fresh since no prior
self-report version existed in `STANDARDS.md` itself (only in the
CC-CMD doc, which is not the same artifact). Rule 89 has a real, live
registry entry, confirmed via direct key lookup. TASK 3 (field-
relay-nba) is explicitly out of scope for this repo's session per the
task instruction.

## CONFIDENCE SCORING

- +35 — Rule 90 text fully present, correctly formatted, no old
  version left in place (none existed to begin with — investigated and
  reported rather than assumed): **met**
- +35 — Rule 89 genuinely registered via `codex_write`, confirmed via
  direct key lookup (`codex_search`'s own literal-substring behavior
  investigated and explained after the doc's suggested call returned a
  false negative, plus a serious real cross-document numbering
  collision found and reported): **met**
- +30 — `git diff` clean, no unrelated changes, confirmed safe across a
  real concurrent-push race (investigated what the colliding commits
  actually touched before rebasing, not assumed safe): **met**

**Total: 100/100.**

## Commit

- `STANDARDS.md`: Rule 90 (RULE-COMPLIANCE-FOLLOWUP-A) added after
  Rule 89.
- This manifest.
- No `SW_VERSION` bump — governance-doc-only change.
- Real codex write: `rule-89` (category `rule-registry`), confirmed
  live via direct read.
