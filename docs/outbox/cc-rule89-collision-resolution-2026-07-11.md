# CC Session Outbox — Resolve the Rule 89 Collision (CC-CMD-2026-07-11-rule89-collision-resolution, jubilant-bassoon portion: TASKS 1-4)

**Date:** 2026-07-11
**Scope:** TASKS 1-4 only, per explicit instruction. TASK 5
(field-relay-nba CI check making a future collision structurally
impossible) is out of scope for this repo.

## TASK 1 — Re-verified from current HEAD, no drift on the doc's own claims

Confirmed both "Rule 89" sections still existed exactly as described:
`STANDARDS.md`'s SCOPED-TOOL-DEFAULT-A (added the prior CC-CMD this
session) and `docs/CLAUDE-CODE-PROMPT-RULES.md`'s SCOPE-LEGIBLE-A
(line 243, pre-existing since 2026-07-08). Confirmed `STANDARDS.md`'s
actual highest rule number is 90, matching the doc's expectation
exactly ("should be 90 after tonight's work — verify, don't assume").

## TASK 2 — Rule 91 canonicalized into STANDARDS.md, full content preserved verbatim

Moved the complete "Rule 89 — Legible across scope (SCOPE-LEGIBLE-A)"
section from `CLAUDE-CODE-PROMPT-RULES.md` into `STANDARDS.md`,
renumbered to Rule 91, positioned immediately after Rule 90 (same
number-matches-file-position reasoning applied to Rules 89/90 earlier
this session — every rule in this document is in strictly increasing
order by position; Rule 91 continues that, rather than being wedged
near a topically-related cluster). **Body content preserved exactly**
— all four radii (process/repo/cross-repo/session), the full
`AmbientDO._oddsLastFetch` example, the complete "Violation signals"
paragraph — only the heading's number changed (89→91); the code name
(SCOPE-LEGIBLE-A) is unchanged, and the body contained no internal
self-references to its own old number that needed updating.

## TASK 3 — Satellite doc reduced to a pointer, not left duplicated

Replaced the full section in `CLAUDE-CODE-PROMPT-RULES.md` with:
*"Rule 91 (SCOPE-LEGIBLE-A) — see STANDARDS.md for full text. [...]"*
— matching the doc's suggested format, with a genuine one-sentence
summary and a note on why the renumbering happened (not fabricated;
derived directly from the section's own opening sentence and this
CC-CMD's own stated root cause). Confirmed via grep: `## Rule 89` no
longer appears anywhere in this file.

## TASK 4 — Rule 91 registered in the codex, confirmed via direct read

`codex_write(category:"rule-registry", key:"rule-91", title:"UNEXERCISED
-- Rule 91: legible across scope (SCOPE-LEGIBLE-A) -- durability/holism
as one test at four radii...")`. Verified real via `codex_read("rule-91")`
— genuine timestamps, not simulated (matching the same verification
method used for Rule 89's registration, since the prior session already
found `codex_search`'s literal-substring behavior doesn't reliably find
hyphenated keys from title-text search alone).

## Full sweep — found a real problem far larger than the one collision this CC-CMD was written to fix

The doc's own VERIFICATION explicitly asked for "a full sweep, not just
re-checking 89 specifically, since this exact failure mode... could
plausibly have produced more than one collision." **It did — but not
between the two documents this CC-CMD targeted. Within `STANDARDS.md`
itself.**

First pass (checking only for cross-document collisions between
`STANDARDS.md` and `CLAUDE-CODE-PROMPT-RULES.md`) found none beyond the
now-resolved 89: Rules 87/88 appear in both files, but confirmed via
direct title comparison to be intentional, same-topic mirrors (the
satellite doc's own stated purpose), not independent originations —
correctly not a collision.

**Caught and fixed a bug in my own verification script before trusting
its "no duplicates" result** — investigated rather than accepted a
clean result at face value: a first duplicate-count check ran `sort -nu`
(unique) *before* counting duplicates, which trivially reports zero
duplicates by construction. Re-ran without deduplicating first.

**Real result: `STANDARDS.md` contains 5 genuine, internal rule-number
collisions — completely unrelated topics sharing the same number,
within the single canonical file this whole exercise exists to
protect:**

| Rule # | First instance (line) | Second instance (line) |
|---|---|---|
| 48 | DO NOT ASSUME (2633) | Watch Engine WC selection: categorical tier hierarchy only (2895) |
| 49 | Claude is always allowed to say "I don't know" (2786) | OTW momentum: score-event detector only (2920) |
| 50 | Sport Display Convention Registry (SPORT-DISPLAY-A) (2443) | `_fieldDataReady` sentinel is a permanent contract (2937) |
| 51 | Period Prefix Registry (PERIOD-PREFIX-A) (2466) | RUWT risk register (US 9,421,446 B2) (2953) |
| 52 | Schedule Section Builder (SCHEDULE-BUILDER-A) (2487) | Sandbox access matrix (confirmed 2026-06-04) (2981) |

All 10 sections are real, substantive rule write-ups (confirmed by
grepping their headings directly, not just counting) — this is not a
formatting artifact or a stray duplicate heading; two genuinely
different rule sequences appear to have been concatenated into
`STANDARDS.md` at different points in this project's history without
renumbering, the same root cause this CC-CMD's own diagnosis named for
the cross-document case ("started originating new rules locally
instead of staying purely derivative"), just occurring *within* the
supposedly-canonical file instead of alongside it.

**Not fixed here — explicitly out of scope for this task, and reported
rather than silently left for a session to stumble on:** TASKS 1-4
were scoped to the one collision this CC-CMD's CONTEXT section
described. Resolving 5 additional collisions is a materially larger
task (determining which of each pair is canonical, renumbering the
other 5 without breaking any existing cross-references to their old
numbers elsewhere in the codebase, registering the renumbered rules in
the codex) that deserves its own CC-CMD with its own probe block and
verification, not a rushed addition here. Also outside this repo's
task boundary is whether `outbox/rule59-audit-2026-06-15.md` (an older
audit doc, confirmed via a quick check to correctly cite the *current*
titles for Rules 55/56/57/58, and Rule 52 as "Sandbox access matrix" —
meaning that historical audit was written against one of the two
colliding Rule 52's, not the other) needs any correction — flagged,
not touched.

**Rule 86's pre-existing gap (found in the prior CC-CMD this session)
remains unfixed too** — noted again for completeness, not re-litigated
here.

## VERIFICATION

- `git diff` on `STANDARDS.md`: Rule 91 added verbatim (50 insertions),
  nothing else touched.
- `git diff` on `CLAUDE-CODE-PROMPT-RULES.md`: the full Rule 89 section
  replaced with a short pointer (57 lines removed, 6 added — net
  reduction, as expected for "full text → pointer").
- `codex_read("rule-91")`: real, live entry confirmed.
- Full sweep performed as required: confirmed zero *additional*
  cross-document collisions between the two target files (87/88
  correctly identified as intentional mirrors); found and reported 5
  real *internal* `STANDARDS.md` collisions the doc did not anticipate,
  via a corrected verification script (caught my own dedup-before-count
  bug before trusting the result).
- `node smoke.js index.html`: 919/0, unaffected (neither changed file
  is part of the deploy-gate trigger paths or smoke's own checks).

## DONE CONDITION (TASKS 1-4 only)

Exactly one "Rule 89" now exists across both documents
(`STANDARDS.md`'s SCOPED-TOOL-DEFAULT-A). SCOPE-LEGIBLE-A is Rule 91,
canonically in `STANDARDS.md`, registered in the codex. A full sweep
was performed — it surfaced a materially larger, real, pre-existing
problem (5 internal `STANDARDS.md` collisions) beyond the one this
CC-CMD targeted; that finding is reported in full above, not fixed
(would require its own CC-CMD), and not silently omitted.

## CONFIDENCE SCORING (TASKS 1-4 only — TASK 5 is field-relay-nba, out of scope; scoring against the achievable 70-point subset per this doc's own rubric, matching the normalization convention used in the immediately-prior Rule 89/90 CC-CMD this session)

- +10 — TASK 1 re-verification against actual HEAD, no drift on the
  doc's own claims: **met**
- +20 — TASK 2 SCOPE-LEGIBLE-A moved verbatim, full content preserved
  (all four radii, the AmbientDO example, violation signals — nothing
  summarized or truncated): **met**
- +15 — TASK 3 satellite doc correctly reduced to a pointer, confirmed
  via grep the old section is genuinely gone, not left duplicated:
  **met**
- +10 — TASK 4 Rule 91 genuinely registered, confirmed via direct
  `codex_read`: **met**
- +15 — full sweep performed, not just re-checking 89 — went further
  than the doc's own literal scope (cross-document only) and found a
  real, larger, previously-unknown problem (5 internal collisions),
  reported precisely rather than glossed over: **met**

**Total: 70/70 (100% of what TASKS 1-4 could achieve under this doc's
own rubric).**

## Commit

- `STANDARDS.md`: Rule 91 (SCOPE-LEGIBLE-A) added after Rule 90,
  verbatim.
- `docs/CLAUDE-CODE-PROMPT-RULES.md`: full Rule 89 section replaced
  with a short pointer to Rule 91.
- This manifest.
- No `SW_VERSION` bump — governance-doc-only change.
- Real codex write: `rule-91` (category `rule-registry`), confirmed
  live via direct read.
- **Flagged, not actioned**: 5 real internal `STANDARDS.md` rule-number
  collisions (48, 49, 50, 51, 52) — a genuine follow-up CC-CMD is
  warranted.
