# Claude Code Command — Wire STANDARDS-INDEX.md into actual session-start behavior

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** The prior CC-CMD (docs/CC-CMD-2026-07-12-standards-index.md) created STANDARDS-INDEX.md and added a pointer paragraph inside STANDARDS.md itself — but never updated Rule 40 (the actual session-start protocol), which still literally instructs reading STANDARDS.md. A session following Rule 40's exact text has no reason to know the index exists — it'd have to read into the large document first to find the pointer, which doesn't solve the problem the index exists to solve. This CC-CMD closes that gap: make the places that actually govern what a session reads at start reference the index correctly.

**Branch:** main — commit directly, do not create a feature branch or PR.

**Prerequisite check, required first:** as of this writing, the prior CC-CMD (docs/CC-CMD-2026-07-12-standards-index.md) has NOT yet executed — STANDARDS-INDEX.md does not exist yet. If it still doesn't exist when this CC-CMD is picked up: execute that prior CC-CMD's tasks first, in this same session (it's short — building the index file and adding one pointer paragraph), then proceed with this one. Do not skip this one's tasks and do not stop and wait — do both in sequence, same session, since they're both small and this one depends directly on the other's output existing.

git pull. Read CLAUDE.md, the current STANDARDS.md (Rule 8, Rule 40, and the STANDARDS-INDEX.md pointer already added), and STANDARDS-INDEX.md itself (confirm it landed as expected from the prior CC-CMD, or build it per the prerequisite check above if it hasn't) before making any change.

Write findings to outbox/cc-standards-index-wiring-2026-07-12.md.

## TASK 1 — Confirm what actually needs updating

Before changing anything, check each of these for whether it currently instructs a session to read STANDARDS.md without mentioning STANDARDS-INDEX.md:
- Rule 40 (session start protocol) — almost certainly needs updating, confirm exact current wording first.
- Rule 8's canonical-documents table — check whether it lists STANDARDS.md and would benefit from a STANDARDS-INDEX.md row.
- `GOVERNANCE.json` (referenced in Rule 31 as the machine-readable canonical-doc manifest) — check its actual current structure; if it lists STANDARDS.md, it may need a corresponding entry.
- `CLAUDE.md` — check whether it separately instructs reading STANDARDS.md at session start, since sessions may read this file too.

Report exactly what's found in each — don't assume all four need changes; some may not.

## TASK 2 — Update Rule 40 to reference STANDARDS-INDEX.md as the primary fast read

Rule 40's required-reading list should read STANDARDS-INDEX.md first for fast orientation, with STANDARDS.md remaining available for full detail on any specific rule the index points to. Do not remove the requirement to consult STANDARDS.md — this is about ordering and making the index the practical entry point, not deprecating the source of truth. Preserve Rule 40's other content exactly; this is a targeted edit to its reading-list section only.

## TASK 3 — Update any other location TASK 1 found

For Rule 8's table and `GOVERNANCE.json`, if TASK 1 found they need it, add STANDARDS-INDEX.md as a properly-described entry following each document's own existing format — don't invent a new format.

## VERIFICATION

- `git diff` shows only the specific, targeted changes identified in TASK 1 — no unrelated edits to Rule 40 or any other section.
- Confirm STANDARDS.md's total content (outside the actual edited lines) is unchanged — this is still an additive-only change to STANDARDS.md's substance, same constraint as the original CC-CMD.
- If `GOVERNANCE.json` was changed, confirm it's still valid JSON and any smoke assertions checking its structure (A141-A144) still pass.

## DONE CONDITION

A session actually following Rule 40's literal instructions is now directed to STANDARDS-INDEX.md as the fast first read, not left to discover it only by already being deep into STANDARDS.md. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 genuinely checked all four locations, accurate findings reported (25 pts)
- TASK 2 Rule 40 correctly updated, minimal targeted edit, rest of the rule preserved exactly (40 pts)
- TASK 3 other locations correctly updated if needed, format matched to each document (20 pts)
- Verification confirms no unintended changes, GOVERNANCE.json validity if touched (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.