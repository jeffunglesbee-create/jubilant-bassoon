# CC Session Outbox — Resolve all 5 internal STANDARDS.md rule-number collisions (CC-CMD-2026-07-11-standards-collision-resolution)

**Date:** 2026-07-11
**Scope:** jubilant-bassoon (sole). All 4 tasks executed.

## Up-front finding: the doc's CI-check claim is false, does not block this task

TASK 4's text claims "the CI check added earlier tonight
(`post-deploy-live-verify.yml`) will fail the next deploy if any
`## Rule N >= 89` lacks a registry entry." Verified via
`grep -rln "post-deploy-live-verify" .`: **no such workflow exists
anywhere in this repo.** Cross-checked against `docs/CC-CMD-2026-07-11-standards-rule90.md`
(the actual source of this claim): the CI staleness check is TASK 3
there, explicitly scoped to **field-relay-nba** (a separate repo this
session cannot read or write), never to jubilant-bassoon. So the claim
is wrong on two counts — wrong repo, and unverifiable from here even
if it were the right one. This does not block or change TASK 1-4 of
*this* CC-CMD (Rule 90 registration is required regardless of whether
CI enforces it), but it is reported per Rule 72 (inherited claims must
be re-verified) rather than silently repeated or acted on.

## TASK 1 — Re-verified, all 5 pairs confirmed, original/collision side independently derived from dating evidence (not from position or the doc's own assertion)

Re-ran the duplicate sweep from current HEAD: exactly the same 5
numbers (48, 49, 50, 51, 52), same pairs, same line numbers as the
doc predicted — no drift.

For each pair, read the section's own dating/context comments (not
guessed from file position):

| # | Original (kept number) | Dating evidence | Collision (renumbered) | Dating evidence |
|---|---|---|---|---|
| 48 | DO NOT ASSUME (line 2633) | "renumbered June 1 2026 to resolve collision with the formal Rule 11 at line 385" | Watch Engine WC selection (line 2895) | part of a block whose siblings are explicitly dated June 4 2026 |
| 49 | "I don't know" (line 2786) | "Added: June 1 2026" | OTW momentum (line 2920) | same June-4 block |
| 50 | SPORT-DISPLAY-A (line 2443) | "Renumbered PM-7 June 1 2026 — was Rule 39" | `_fieldDataReady` sentinel (line 2937) | same June-4 block |
| 51 | PERIOD-PREFIX-A (line 2466) | "Renumbered PM-7 June 1 2026 — was Rule 40" | RUWT risk register (line 2953) | "Current risk classification as of 2026-06-04" |
| 52 | SCHEDULE-BUILDER-A (line 2487) | "Renumbered PM-7 June 1 2026 — was Rule 41" | Sandbox access matrix (line 2981) | "Sandbox access matrix (confirmed 2026-06-04)" |

Conclusion, independently derived: the June 1 2026 PM-7 session claimed
48/50/51/52 by renumbering pre-existing content into those slots (and
separately added new Rule 49 that same day). A **different**, later
session on June 4 2026 — working on RUWT/patent-risk mitigation —
added 5 more rules and assigned them 48/49/50/51/52 without checking
that PM-7 had already claimed those exact numbers 3 days earlier. This
exactly matches TASK 2's prescribed renumbering direction — confirmed
independently, not trusted blindly.

## TASK 2 — Renumbered, full content preserved verbatim

Renumbered the 5 June-4 collision rules to 92-96 and moved them to the
end of STANDARDS.md (after Rule 91), preserving this session's
"strictly increasing order by position" convention:

- Rule 48 "Watch Engine WC selection" → **Rule 92**
- Rule 49 "OTW momentum" → **Rule 93**
- Rule 50 "`_fieldDataReady` sentinel" → **Rule 94**
- Rule 51 "RUWT risk register" → **Rule 95**
- Rule 52 "Sandbox access matrix" → **Rule 96**

Executed via a Python script (not manual edits) given the precision
required for a 5-section, cross-file-position move — sanity-asserted
every line boundary before writing, then verified the result with
`git diff` line-by-line (see VERIFICATION). Each renumbered rule got a
new note matching the existing PM-7 note's format but dated and
attributed accurately to today's actual event (not falsely credited to
PM-7, since this collision happened 3 days after PM-7 and PM-7 was not
at fault for it):

> (Renumbered 2026-07-11 — was Rule N "...", added June 4 2026 without
> checking that the June 1 2026 PM-7 renumbering session had already
> claimed Rule N for "..." at line L. Cross-reference: any prior "Rule N
> ..." citation refers to this rule, now Rule NN.)

The 5 original rules (48, 49, 50, 51, 52 as they existed before this
CC-CMD) are at the exact same line numbers as before — completely
untouched.

## TASK 3 — Full repo-wide cross-reference sweep

Grepped every `.md`/`.js`/`.html`/`.yml`/`.jsonc`/`.json` file in the
repo (not just STANDARDS.md) for "Rule 48" through "Rule 52" in a
rule-specific context, then individually classified every hit as
in-scope (update) or excluded-with-reason:

**Updated (16 genuine cross-references, all "RUWT Rule 51" → "RUWT
Rule 95" — the only old number with live citations elsewhere):**
- `smoke.js` — 9 occurrences (assertion description strings, lines
  3741, 3754, 3780, 3796, 3803, 3812, 3826, 3828, 3833)
- `index.html` — 3 occurrences (code comments, lines 5706, 36802, 37987)
- `docs/ADR-002-CONTEXT.md` — 2 occurrences (lines 202, 328)
- `outbox/cc-drama-score-compliance-smoke-2026-07-01.md` — 1 occurrence,
  given a bracketed historical annotation rather than a silent swap
  (dated, closed report — preserves what was true when written while
  still pointing forward)
- `outbox/audit-catalog-2026-06-15.md` — 1 occurrence, same
  bracketed-annotation treatment

**Explicitly excluded, with reason (not a partial sweep — every hit
was individually checked, not pattern-matched and assumed):**
- `CLAUDE.md:52`, `HANDOFF.md:107`, `STANDARDS.md` internal
  self-references, `outbox/cc-combined-cleanup-2026-06-15.md:92`,
  `outbox/cc-p6a-soccer-stats-persist-2026-06-19.md:29`,
  `outbox/rule59-audit-2026-06-15.md` (5 hits), `outbox/wc-schedule-diagnosis.md:101`,
  `outbox/cc-wc-grammar-relay-side-2026-06-18.md:13`,
  `docs/AMBIENT-SCROLL-SPEC.md:195` — all genuinely about "DO NOT
  ASSUME" (Rule 48, unchanged), confirmed by reading surrounding
  context (verification/assumption language), not by string-matching alone.
- `smoke.js:2856` — "STANDARDS Rule 50 candidate (on-device-only
  histograms)" — a never-materialized proposed rule number, not a
  citation to either actual Rule 50 (neither SPORT-DISPLAY-A nor
  `_fieldDataReady`). Left untouched; flagged as a pre-existing,
  unrelated ambiguity, out of this task's scope.
- `outbox/rule59-audit-2026-06-15.md:17` — `## Rule 52 — Sandbox
  access matrix (confirmed 2026-06-04)` inside a fenced code block —
  this is a **literal captured `grep` command output**, a dated
  terminal transcript documenting what STANDARDS.md's tail actually
  showed on 2026-06-15. Editing it would falsify historical evidence,
  not update a live cross-reference. Left untouched deliberately.
- `docs/CC-CMD-2026-07-11-standards-collision-resolution.md` (this
  doc) and `docs/outbox/cc-rule89-collision-resolution-2026-07-11.md`
  — self-referential task/incident docs describing the collision
  itself; their job was to name the problem before it was fixed, left
  as accurate historical record.

## TASK 4 — All 5 renumbered rules registered in the codex, confirmed live

`codex_write(category:"rule-registry", key:"rule-{92..96}", ...)` for
all 5, each `content` naming the exact collision (old number, what it
collided with, line, date). Verified two ways, both confirmed real:
`codex_read("rule-92")` through `("rule-96")` (exact-key lookup) and
`codex_search("Rule 92", category:"rule-registry")` (title-substring
match — works here because titles literally contain "Rule 92" with a
space, unlike the earlier-documented `codex_search("rule-89")` failure
mode against a hyphenated key with no literal match in the text).

## VERIFICATION

- Post-fix duplicate sweep: `grep -n "^## Rule [0-9]" STANDARDS.md |
  ... | sort -n | uniq -d` → **empty output, zero duplicates.**
- The 5 original rules (48-52) confirmed unchanged: same line numbers
  (2443, 2466, 2487, 2633, 2786) before and after, confirmed via
  `git diff` showing zero changes to those line ranges.
- The 5 renumbered rules' bodies confirmed byte-for-byte preserved via
  full `git diff` review — only the heading number and the new
  renumbering note differ from the original text; every other line
  matches exactly (diff stat: 134 insertions / 109 deletions, where
  109 = the exact line count of the moved block and the extra 25
  insertions = 5 notes × ~5 lines each).
- `codex_search` and `codex_read` both confirm all 5 new entries are
  real, live rows with genuine `created_at`/`updated_at` timestamps
  (20:35:30 through 20:35:53 UTC), not simulated.
- TASK 3 spot-check (2 of the "found and updated" claims verified
  directly): re-grepped `smoke.js` post-edit — zero remaining "Rule
  51", exactly 9 "Rule 95" at the original 9 line numbers. Re-grepped
  `docs/ADR-002-CONTEXT.md` post-edit — zero remaining "Rule 51",
  exactly 2 "Rule 95" at lines 202 and 328.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: 21 failures — confirmed pre-existing
  and unrelated (same count this session has seen on every prior
  commit tonight, unaffected by markdown/comment-string-only changes).

## DONE CONDITION

Zero duplicate rule numbers remain in STANDARDS.md. The 5
originally-colliding (June-4) rules are now uniquely numbered 92-96,
full content preserved verbatim, all genuine live cross-references
updated repo-wide (16 found and fixed, 3 categories of exclusion each
individually justified), registered in the codex and confirmed live.
Original rules 48-52 are byte-for-byte untouched.

## CONFIDENCE SCORING

- +20 — TASK 1 re-verification confirms all 5 pairs, correctly
  identifies original vs. collision side for each, **independently
  derived from dating evidence rather than trusting the doc's own
  assertion**: **met**
- +25 — TASK 2 renumbering correct, full content preserved, consistent
  renumbering-note format (dated accurately, not falsely attributed to
  PM-7): **met**
- +25 — TASK 3 cross-reference sweep genuinely complete — found 16
  live citations across 5 files beyond STANDARDS.md itself, correctly
  excluded 3 distinct categories (DO NOT ASSUME hits, an unrelated
  placeholder, and — critically — a literal historical command
  transcript that must NOT be edited), not a partial sweep that felt
  complete: **met**
- +15 — TASK 4 all 5 new rules registered in codex, confirmed live via
  two independent methods (`codex_read` + `codex_search`): **met**
- +15 — Post-fix duplicate sweep confirms zero remaining collisions:
  **met**

**Total: 100/100.**

## Commit

- `STANDARDS.md`: 5 collision rules renumbered 92-96, moved to end of
  file, full content preserved, new dated renumbering notes.
- `smoke.js`, `index.html`, `docs/ADR-002-CONTEXT.md`,
  `outbox/audit-catalog-2026-06-15.md`,
  `outbox/cc-drama-score-compliance-smoke-2026-07-01.md`: 16 live
  cross-references updated to cite Rule 95 instead of the stale
  Rule 51.
- `index.html`/`sw.js`: `SW_VERSION` bumped `2026-07-11f` → `2026-07-11g`
  (index.html is a deploy-gate trigger path even though these are
  comment/string-only changes).
- This manifest.
- Real codex writes: `rule-92` through `rule-96` (category
  `rule-registry`), all confirmed live via direct read and search.
- **Flagged, not actioned**: TASK 4's premise that a CI check already
  enforces Rule 90 in this repo is false — that check is
  field-relay-nba-scoped and unverified from this session. Also
  flagged: `smoke.js:2856`'s "Rule 50 candidate" is a pre-existing,
  unrelated ambiguity (a never-materialized proposed rule number) —
  out of this task's scope, not touched.
