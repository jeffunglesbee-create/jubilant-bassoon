# CC Session Outbox — Bucket C audit cleanup: 4 dead references + 1 stale citation (CC-CMD-2026-07-13-bucketc-cleanup)

**Date:** 2026-07-13
**Scope:** documentation-only, `docs/TYPED-RESULT-MIGRATION-QUEUE.md`. Zero `index.html` changes.

## TASK 0 — Probe results

```
grep -n "fetchESPNPlays\|formatPitcher\|_plEuroNote\|fdFetchLive" docs/TYPED-RESULT-MIGRATION-QUEUE.md
grep -n "field:lead_change" docs/TYPED-RESULT-MIGRATION-QUEUE.md
grep -n "function fetchESPNPlays\|function formatPitcher\|function _plEuroNote\|function fdFetchLive" index.html
grep -n "fieldEvents.addEventListener('field:lead_change'" index.html
```

- All 4 functions (`fetchESPNPlays`, `formatPitcher`, `_plEuroNote`, `fdFetchLive`) confirmed genuinely absent from current `index.html` — zero matches for any of the four `function ...` definitions.
- `fieldEvents.addEventListener('field:lead_change', ...)` confirmed live at `L29991` (not the doc's cited `L29713`).

## Real finding — the CC-CMD's own premise for the 4 dead references is stale (Rule 79/72)

The CC-CMD's CONTEXT section describes the 4 rows as ones that "now describe code that doesn't exist" and asks for a "❌ REMOVED — function deleted as dead code, entry retained for audit trail" annotation, implying no annotation currently exists. Reading the actual queue file rows shows this isn't accurate anymore: all 4 rows already carry a **more detailed** annotation than what this CC-CMD asks for — `✅ REMOVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 1): ...`, each with its own specific re-confirmation date, reasoning, and (for two of them) explicit follow-up-candidate notes for sibling dead code found along the way.

This is the same "CC-CMD describes a state that predates the real current HEAD" pattern seen repeatedly this session (stale entries in Clusters 6, 7, 9, 10) — a different, earlier session already did this exact cleanup (under a different CC-CMD name, `queue-deadcode-and-ambiguous`) before this CC-CMD was written, and this CC-CMD's author didn't know that when drafting it.

**Decision: left all 4 rows untouched.** Adding a redundant `❌ REMOVED` tag on top of the existing `✅ REMOVED` annotation would not "preserve the audit trail" better — it would clutter it with a second, less-detailed, differently-styled marker for the same fact, and using `❌` would break this file's own established convention where `✅` means "resolved/complete," not an error state. The DONE CONDITION's actual requirement — "annotated (not silently deleted)" — is already satisfied for all 4 rows, just by earlier work than this CC-CMD anticipated.

## TASK 1 — Fix applied

One real edit: `fieldEvents 'field:lead_change' listener` line citation corrected `~L29713` → `~L29991` (278 lines of drift). Verified the exact cited reasoning — the code comment `/* never throw from a bus listener */` — still exists verbatim at the real current line before updating the citation, confirming content and classification are unchanged, only the line number had drifted.

## TASK 2 — Verify

- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `git diff --stat`: `docs/TYPED-RESULT-MIGRATION-QUEUE.md | 2 +-` — exactly 1 line changed (1 insertion, 1 deletion — a single-line edit, not the 5 lines the CC-CMD's rubric anticipated, because 4 of the 5 cited items required no change). Zero `index.html` changes, confirmed.

## Confidence score

- TASK 0 confirms all 5 items fresh against real current state (all 4 functions confirmed absent, real current line for the listener confirmed): 30/30
- TASK 1 correct and minimal; the DONE CONDITION's real requirement ("annotated, not silently deleted") is satisfied for all 4 dead references — via pre-existing, more detailed annotations from an earlier session rather than new edits, which is the *more* correct outcome than mechanically duplicating an already-present marker. The 1 stale citation is corrected and re-verified against real source: 40/40
- TASK 2 suites clean; diff scope is 1 line, not the anticipated 5 — a direct, well-investigated consequence of the CC-CMD's own stale premise (Rule 79), not an execution shortfall. Docked 5 points for the mismatch against the rubric's literal expectation, even though the underlying work is correct: 25/30

**Total: 95/100.**

At the threshold — proceeding to commit, with the process note documented transparently above.

## Commit

- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: 1 line corrected (stale line citation for the `field:lead_change` listener entry). The 4 dead-reference rows confirmed already correctly annotated by an earlier session — no change needed.
- Zero `index.html` changes.
- This manifest.
