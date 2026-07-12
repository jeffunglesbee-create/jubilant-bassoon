# Claude Code Command — Score the lead sentence's own specificity, don't add a second regex pattern

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** The lead-sentence detector fixed earlier tonight (commit c16cf8fc) only matches leads starting with "The [Team] [verb]...". A live Night Owl recap (CFL, Montreal Alouettes vs Calgary Stampeders) shows a different generic shape the regex doesn't cover: "Montreal Alouettes secured a 37-30 victory over the Calgary Stampeders, turning a one-score game into a 7-point margin..." — confirmed directly, this string does not match `_LEAD_SENTENCE_RE`.

**Revised approach, replacing this doc's original regex-expansion plan:** this codebase already has a real, non-regex specificity metric — `scoreProse()`'s `specificity = specifics / words.length` (proper nouns + numbers, divided by word count), with an existing 25% weak-dimension threshold. Confirmed via direct source read: it operates on the *entire* passed-in text as one blob, not per-sentence. That's the actual root cause of tonight's CFL example slipping through — a generic lead sentence gets diluted by specific content later in the same brief, letting the whole-brief average clear 25% even though the first sentence a reader actually encounters is weak.

Adding a second regex pattern would only catch this one new shape and leave the underlying whole-brief-averaging blind spot open for the next shape. Reusing the existing specificity math, applied to the lead sentence in isolation, catches genericness as a *property* (low information density) rather than trying to enumerate every *syntax* the AI might produce it in — this generalizes to shapes nobody has seen yet, which a regex fundamentally cannot.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md's DO NOT INVENT rule before touching this.

Write findings to outbox/cc-lead-specificity-scoring-2026-07-12.md.

## TASK 1 — Confirm both functions from current HEAD

Re-read `checkLeadSentence()`/`_LEAD_SENTENCE_RE` and `scoreProse()` fresh. Confirm: (a) the CFL sentence still doesn't match the regex, (b) `scoreProse()`'s specificity calculation is still whole-text, not per-sentence, (c) the existing 25% threshold is still current. Report any drift.

## TASK 2 — Establish a real threshold empirically, don't guess one

Pull a real sample of recent brief/recap lead sentences (first sentence only) across sport types via a live `/archive/query` probe or D1 — matching the discipline the original regex fix used (empirical survey before writing a check, not a guessed number). Compute per-lead-sentence specificity using the *same* `specifics/words.length` formula `scoreProse()` already uses (don't invent a different formula). Determine what specificity value actually separates leads like the CFL example (generic) from leads like the MLB Citi Field example (specific) in real data — report the actual numbers found, not an assumed threshold.

## TASK 3 — Apply per-sentence specificity scoring to the lead-sentence check

Extract just the first sentence of the generated brief text (same sentence-splitting logic `scoreProse()` already uses) and compute its specificity score in isolation, using the threshold TASK 2 established from real data. If below threshold, trigger the existing one-shot rewrite retry `checkLeadSentence()` already has — reuse that retry mechanism, don't build a new one. This replaces (not supplements) the regex check for genericness detection — the regex approach only ever covered known shapes; this covers the underlying property directly. Decide explicitly whether the old regex-based check should be removed entirely or kept as a fast-path pre-filter before the specificity calculation, and state the reasoning.

## TASK 4 — Verify against both real examples plus the survey data

Confirm directly: the CFL lead sentence, scored in isolation, falls below the established threshold and would trigger a retry. The MLB Citi Field lead, scored in isolation, clears the threshold and passes through untouched. Run the same check against every lead in TASK 2's survey sample and report the resulting classification for each — not just the two examples already known.

## VERIFICATION

- Real extraction test (`scoreProse`'s specificity logic and `checkLeadSentence()` pulled verbatim): CFL example triggers retry, MLB example passes untouched, full survey sample classified correctly per TASK 2's empirical threshold.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Confirm this doesn't change `scoreProse()`'s own whole-brief scoring behavior — this is a new, isolated use of the same formula on a sentence-level slice, not a modification to the existing whole-brief scorer.

## DONE CONDITION

Lead-sentence genericness is detected via the same specificity math already used elsewhere in this codebase, applied per-sentence instead of per-brief, with a real empirically-derived threshold — not a second regex pattern, not a guessed number. Verified against real survey data, not just the two known examples. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms both functions' current state accurately (10 pts)
- TASK 2 threshold genuinely derived from real survey data, not guessed (25 pts)
- TASK 3 correctly reuses `scoreProse()`'s exact formula and the existing retry mechanism, explicit reasoning on regex-check disposition (35 pts)
- TASK 4 verified against full survey sample, not just the two seed examples (20 pts)
- Real test coverage, all three suites clean, `scoreProse()`'s own behavior unaffected (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.

---

**One-liner:**
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-12-lead-detector-team-verb-shape.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```