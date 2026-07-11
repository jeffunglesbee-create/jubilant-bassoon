# CC Session Outbox — Add Rule 89 to STANDARDS.md (CC-CMD-2026-07-11-standards-rule89)

**Date:** 2026-07-11
**Scope:** Adds Rule 89 (SCOPED-TOOL-DEFAULT-A) to `STANDARDS.md`, run
as a prerequisite for `CC-CMD-2026-07-11-standards-rule90.md` — that
doc's TASK 2 requires Rule 89 to already exist, and it genuinely did
not (see the separate outbox for that finding).

## TASK 1 — Insertion point confirmed, one separate real drift found and reported

Confirmed via direct grep: **Rule 88 is genuinely the highest-numbered
rule** in `STANDARDS.md` (4474 lines total, file ends immediately after
Rule 88's own "Cross-reference" list — no trailing content). **Rule 82
(Archive freshness) does immediately follow Rule 81 (Write gate)** —
both of TASK 1's specific claims hold, no drift on either.

**A separate, real, pre-existing gap found and reported (not asked for,
but the doc's own instruction was to "report any drift before
inserting"):** `## Rule 86` has **no section of its own anywhere in
`STANDARDS.md`** — confirmed via grep. It's referenced only as a
one-line bullet in two OTHER rules' own "Cross-reference" lists (Rule
87's and, per the same grep, appears the sequence jumps 85 → 87 with no
"## Rule 86" heading at all), and that one-line mention ("Rule 86:
Crash recovery — unclosed sessions are the downstream cost of
incomplete CC-CMDs") **does not match** what `CLAUDE.md` (this repo's
own root config) cites as Rule 86: *"Read CONTRACTS.md before crossing
a system boundary (CONTRACT-READ-A)"* — a completely different topic.
This is a genuine, pre-existing inconsistency between `CLAUDE.md`'s
numbered rule list and `STANDARDS.md`'s actual content — **not fixed
here**, since it's unrelated to inserting Rule 89 and would be a
significant, separate scope expansion (reconciling two different
Rule 86 topics/write-ups is a real decision, not something to guess at
inline). Flagged for a future, dedicated CC-CMD.

## TASK 2 — Rule 89 inserted verbatim, positioned after Rule 88

**Placement decision, made explicitly per the doc's own "use judgment"
allowance:** the doc offered two options — immediately after Rule 88
(simple, position matches number), or wedged between Rule 82 and Rule
83 to keep the credential-boundary cluster (80/81/82/89) physically
contiguous. **Chose the former.** Every other rule in this file has its
number match its file position, in strictly increasing order — wedging
Rule 89 between 82 and 83 would be the first exception to that
invariant anywhere in the document, and would set a precedent that
every future "topically related" rule insertion should also break
positional order, which would make the file progressively harder to
navigate by number over time. A reader looking for credential-related
rules can still find Rule 89 by search; the document's primary
organizing principle (number = position = rough chronology) is
preserved instead.

Inserted the rule text **verbatim**, exactly as given in the CC-CMD
doc — no paraphrasing, no added/removed content. Matches the existing
`## Rule N — Title (CODE-NAME)` / body / `### Why this matters` /
`### Operational rules` structure used by every other rule in the file.

## VERIFICATION

- Markdown renders correctly: 10 backticks in the new section (even —
  all inline-code spans properly closed), zero triple-backtick fences
  (none expected — the rule text itself has none).
- Rule numbering: exactly one `## Rule 89` heading (`grep -c` confirms
  1), no duplicate, no existing rule renumbered.
- `git diff --stat STANDARDS.md`: 46 insertions, 0 deletions — a pure
  append, nothing else in the file touched.

## DONE CONDITION

Rule 89 exists in `STANDARDS.md`, positioned immediately after Rule 88
(the file's prior end), formatted consistently with every other rule,
verified via a clean `git diff` (pure insertion). Confidence 95+
reached.

## CONFIDENCE SCORING

- +20 — TASK 1 insertion-point confirmation genuinely checked (both
  specific claims held), plus a separate real drift found and reported
  rather than left unnoticed: **met**
- +40 — Rule 89 text inserted verbatim, correctly formatted, matching
  the file's established structure: **met**
- +30 — `git diff` confirmed clean, pure insertion, nothing else
  touched: **met**
- +10 — no rule-numbering collision, confirmed via direct count:
  **met**

**Total: 100/100.**

## Commit

- `STANDARDS.md`: Rule 89 (SCOPED-TOOL-DEFAULT-A) added after Rule 88.
- This manifest.
- No `SW_VERSION` bump — governance-doc-only change, not
  `index.html`/`sw.js`, no deploy-gate trigger path touched.
