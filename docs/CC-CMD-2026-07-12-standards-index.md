# Claude Code Command — Create STANDARDS-INDEX.md: resolve the read-burden problem without touching STANDARDS.md

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** STANDARDS.md is 4,731 lines. "Read this at session start" (Rule 40) stops meaning genuine full absorption at this size — it becomes a search target, not something actually read start to finish. Explicit constraint for this CC-CMD: **do not delete or shorten any existing STANDARDS.md content.** This is a purely additive fix — a new, compact index file that lets a session get correct, complete orientation fast, while the full document remains fully intact as the lookup-on-demand source of truth.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and the full current STANDARDS.md before starting — this task requires accurately summarizing all of it, so it must be read in full at least once here.

Write findings to outbox/cc-standards-index-2026-07-12.md.

## TASK 1 — Build a complete, accurate rule index

For every numbered Rule (1 through the current highest — confirm the actual highest from HEAD, do not assume it's 96), extract: number, code-name (e.g. SCOPED-TOOL-DEFAULT-A), and a genuine one-sentence summary of what it actually requires — not a rephrased title, an actual summary of the operational content. This must be accurate enough that a session reading only the index, not the full rule, has a correct understanding of what the rule requires — verify each summary against the real rule text, don't generate from the heading alone.

Flag any rule number that's referenced but has no section (Rule 86 was previously noted as one such gap — confirm whether this is still true, and note any others found).

## TASK 2 — Index the non-numbered reference sections

List every non-numbered `##` reference section (MLS 2026 Data Architecture, Push Notification Architecture, Deploy Recovery Infrastructure, Claude Code UI-Displayed Hash Reliability, MCP Tool Mid-Session Visibility Gap, and any others found) with a one-sentence description of what each covers and when a session would need to open it.

## TASK 3 — Index the case studies

List every "Case Study" / incident-narrative section (Golf Layer Integration Failure, DO NOT ASSUME — ESPN Live Stats, External Probe Blocking Deploy Pipeline, and any others) with a one-sentence description of the lesson each one exists to preserve.

## TASK 4 — Write STANDARDS-INDEX.md

Create `STANDARDS-INDEX.md` in the repo root (same location as `STANDARDS.md`, `CLAUDE.md`, `HANDOFF.md`) containing:
- A brief header explaining this file's purpose and relationship to STANDARDS.md (this is the fast session-start orientation; STANDARDS.md remains the full, authoritative source — this index does not replace it, only makes it navigable)
- The full rule index from TASK 1, in number order
- The reference-section index from TASK 2
- The case-study index from TASK 3
- A short note on how to keep this current: any CC-CMD that adds a new Rule or reference section to STANDARDS.md should add one line here in the same commit — this is a discipline note, not a mechanical enforcement (a mechanical check is a reasonable future addition but out of scope for this CC-CMD).

## TASK 5 — Add a pointer in STANDARDS.md, additive only

At the very top of STANDARDS.md, immediately after the existing title/Drive-doc line, add ONE short paragraph (not a rewrite of anything existing) pointing to `STANDARDS-INDEX.md` as the recommended fast-orientation read, while stating STANDARDS.md itself remains the full source. This is the only change to STANDARDS.md this CC-CMD makes — everything else in the file must be byte-identical before and after.

## VERIFICATION

- `git diff STANDARDS.md` shows only the single added paragraph from TASK 5 — nothing else changed, confirmed via diff, not assumed.
- Spot-check at least 5 of the rule summaries in STANDARDS-INDEX.md against their real STANDARDS.md text — confirm they're accurate, not just plausible-sounding.
- Confirm the index's rule count matches a fresh `grep -c "^## Rule "` against STANDARDS.md — no rule silently skipped.

## DONE CONDITION

STANDARDS-INDEX.md exists, is accurate (spot-checked, not assumed), and covers every rule, reference section, and case study currently in STANDARDS.md. STANDARDS.md itself is unchanged except for the single pointer paragraph. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 rule index complete and accurate, verified against real text not just headings (35 pts)
- TASK 2/3 reference and case-study indexes complete (20 pts)
- TASK 4 index file well-organized, includes the currency-discipline note (15 pts)
- TASK 5 STANDARDS.md change is genuinely minimal — diff confirms nothing else touched (20 pts)
- Verification spot-checks genuinely performed (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.