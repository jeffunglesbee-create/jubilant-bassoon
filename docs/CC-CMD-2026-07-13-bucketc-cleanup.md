# Claude Code Command — Bucket C audit cleanup: 4 dead references + 1 stale citation

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** documentation-only, docs/TYPED-RESULT-MIGRATION-QUEUE.md. Zero index.html changes.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/cc-bucketc-cleanup-2026-07-13.md.

## CONTEXT

The full 257-entry Bucket C audit (see Drive: "FIELD — Typed-Result Migration: Bucket C Audit") found two small, pure documentation issues, both already independently confirmed real this session:

1. Four Bucket C entries reference functions confirmed removed as dead code earlier tonight: `fetchESPNPlays`, `formatPitcher`, `_plEuroNote`, `fdFetchLive`. These rows now describe code that doesn't exist.
2. One entry's line citation is stale: `fieldEvents 'field:lead_change' listener` says `~L29713`, but the real listener (verified, content unchanged, classification still correct) now lives at `~L29991` — 278 lines of drift from new code inserted above it.

## TASK 0 — Probe

```bash
grep -n "fetchESPNPlays\|formatPitcher\|_plEuroNote\|fdFetchLive" docs/TYPED-RESULT-MIGRATION-QUEUE.md
grep -n "field:lead_change" docs/TYPED-RESULT-MIGRATION-QUEUE.md
grep -n "function fetchESPNPlays\|function formatPitcher\|function _plEuroNote\|function fdFetchLive" index.html
grep -n "fieldEvents.addEventListener('field:lead_change'" index.html
```

Confirm fresh: all 4 functions genuinely absent from current index.html, and the real current line for the lead_change listener.

## TASK 1 — Fix

For each of the 4 dead-reference rows: mark with a clear "❌ REMOVED — function deleted as dead code, entry retained for audit trail" annotation rather than silently deleting the row (preserves the historical record of what was classified, matching this session's own documentation practice elsewhere in the file).

For the stale citation: update `~L29713` to the real current line confirmed in TASK 0.

## TASK 2 — Verify

- `node smoke.js`, `node field_unit.js` both clean (docs-only change, should be unaffected, confirm anyway).
- Re-read the edited sections to confirm exactly 5 lines changed, nothing else in the file touched.

## DONE CONDITION

All 4 dead references annotated (not silently deleted). The 1 stale citation corrected to its real current line. Zero index.html changes. Both test suites clean.

**Confidence scoring:**
- TASK 0 confirms all 5 items fresh against real current state (30 pts)
- TASK 1 correct, minimal, preserves audit trail rather than deleting history (40 pts)
- TASK 2 suites clean, diff scope confirmed exactly 5 lines (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
