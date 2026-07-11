# Claude Code Command — Resolve all 5 internal STANDARDS.md rule-number collisions (single root cause, June 1 2026)

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** STANDARDS.md contains 5 genuine internal collisions — two unrelated rules sharing the same number — first surfaced as a byproduct of tonight's Rule 89 collision-resolution work, confirmed again fresh from HEAD before writing this. All 5 trace to the identical event: a June 1 2026 "PM-7" session renumbered 4 pre-existing collisions (old Rule 11→48, 39→50, 40→51, 41→52) to resolve *earlier* clashes, and separately added a brand-new Rule 49 the same day — but the process never checked whether the *target* number was already occupied by something else, creating 5 fresh collisions in the act of trying to fix old ones. This is one incident with five symptoms, not five independent problems.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md Rule 90 before touching anything (this move will need to register new rules in the codex per Rule 90's own requirement).

Write findings to outbox/cc-standards-collision-resolution-2026-07-11.md.

## TASK 1 — Re-verify all 5 collisions from current HEAD

Re-run the duplicate-detection check (every `^## Rule (\d+)` heading, grouped by number, anything with 2+ entries). Confirm the exact same 5 numbers (48, 49, 50, 51, 52) with the same pairs of topics found tonight. Report any drift — if STANDARDS.md changed since this CC-CMD was written, the specific line numbers below may be stale even if the rule numbers themselves aren't.

**Known pairs, going in (confirm each still matches):**
- Rule 48: "DO NOT ASSUME" (original) vs. "Watch Engine WC selection: categorical tier hierarchy only" (collision)
- Rule 49: "Claude is always allowed to say 'I don't know'" (original, added June 1 2026) vs. "OTW momentum: score-event detector only" (collision)
- Rule 50: "Sport Display Convention Registry (SPORT-DISPLAY-A)" (original) vs. "`_fieldDataReady` sentinel is a permanent contract" (collision)
- Rule 51: "Period Prefix Registry (PERIOD-PREFIX-A)" (original) vs. "RUWT risk register (US 9,421,446 B2)" (collision)
- Rule 52: "Schedule Section Builder (SCHEDULE-BUILDER-A)" (original) vs. "Sandbox access matrix (confirmed 2026-06-04)" (collision)

For each pair, determine which is the "original" (came first chronologically/was already using that number before June 1) and which is the "collision" (the thing that got assigned that number on June 1 without checking). Use the same method already applied tonight: read each section's own dating/context comments, don't guess from position alone.

## TASK 2 — Renumber the 5 colliding (later, June-1-introduced) rules to the next available numbers

Renumber the 5 collision-side rules (Watch Engine WC selection, OTW momentum, `_fieldDataReady` sentinel, RUWT risk register, Sandbox access matrix) to 92, 93, 94, 95, 96 respectively — the next available slots after Rule 91. Do not renumber the "original" side of each pair; those keep their existing numbers unchanged. Add a renumbering note to each moved rule matching the exact style already used elsewhere in this document for prior renumbers (see the "(Renumbered PM-7 June 1 2026 — was Rule N, which collided with...)" pattern already present for Rules 48/50/51/52 — use this same format, crediting today's date and explaining this collision's origin).

## TASK 3 — Full cross-reference sweep

Grep the entire repo (not just STANDARDS.md) for citations of the old numbers in a rule-specific context — e.g. "Rule 48" appearing near "Watch Engine" or "WC selection," not every bare occurrence of the string "48" which would false-positive on unrelated numbers. This includes CLAUDE.md, docs/, any CC-CMD outbox files that cited these rules by number, and code comments. Update any genuine cross-reference found. Report a full list of what was checked and what was found/updated — a partial sweep that "felt complete" is not sufficient; this is exactly the class of error Rule 89 (SCOPE-LEGIBLE-A)'s "Repo radius" probe exists to catch.

## TASK 4 — Register the 5 renumbered rules in the codex (Rule 90 compliance)

Per Rule 90, each of the 5 renumbered rules (now 92-96) needs a `codex_write(category:"rule-registry", key:"rule-{92..96}", title:"UNEXERCISED -- Rule {N}: ...")` entry, in this same commit sequence — not deferred. This also matters mechanically: the CI check added earlier tonight (`post-deploy-live-verify.yml`) will fail the next deploy if any `## Rule N >= 89` lacks a registry entry, so skipping this step doesn't just violate Rule 90 in spirit, it breaks the build.

## VERIFICATION

- Re-run the duplicate-detection sweep after the change: confirm zero remaining duplicate rule numbers anywhere in STANDARDS.md.
- Confirm the 5 "original" rules (48, 49, 50, 51, 52 as they existed before this CC-CMD) are completely unchanged — this is a pure move of the collision side, not a rewrite of the original side.
- Confirm all 5 renumbered rules preserve their full original content verbatim (matching the same discipline already used for Rule 91's move tonight) — only the heading number and a new renumbering note change.
- `codex_search` confirms all 5 new registry entries are real and live.
- Confirm the TASK 3 cross-reference sweep's reported findings are genuine — spot-check at least 2 of the "found and updated" or "checked, none found" claims directly.

## DONE CONDITION

Zero duplicate rule numbers remain in STANDARDS.md. The 5 originally-colliding rules are now uniquely numbered 92-96, full content preserved, properly cross-referenced, registered in the codex. Original rules 48-52 are untouched. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 re-verification confirms all 5 pairs match, correctly identifies original vs. collision side for each (20 pts)
- TASK 2 renumbering correct, full content preserved, consistent renumbering-note format (25 pts)
- TASK 3 cross-reference sweep genuinely complete, not just STANDARDS.md itself (25 pts)
- TASK 4 all 5 new rules registered in codex, confirmed live (15 pts)
- Post-fix duplicate sweep confirms zero remaining collisions (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.