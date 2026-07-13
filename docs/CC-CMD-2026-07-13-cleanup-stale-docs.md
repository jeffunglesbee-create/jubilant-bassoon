# Claude Code Command — Delete four stale/superseded CC-CMD docs

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** delete 4 files only. No other changes.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/cleanup-stale-docs-2026-07-13.md.

## CONTEXT

`docs/CC-CMD-2026-07-13-media-special-right-now.md` is already shipped and live-verified (renders real `#rn-special-cards`, `renderMediaSpecialRightNow()`, `scrollToMediaSpecial()`, wired at both real call sites). Four other CC-CMD docs are now stale:

- **`hrd-right-now-surface.md`** — a separate, parallel proposal solving the exact same problem `media-special-right-now` already shipped (surfacing HRD in `#field-right-now`). Redundant now that the real one landed.
- **`specials-score-boost.md`** — a different, competing approach to the same underlying problem (boost sort order within the existing media grid instead of a new container). Also redundant now.
- **`gumtree-probe.md`** — deferred earlier tonight, superseded by the custom tree-sitter tool that ended up doing Bucket C's full audit. Never executed.
- **`hrd-entry.md`** (v1) — superseded by `hrd-entry-v2.md`, which shipped. Never executed.

None of these four were ever executed. Deleting them prevents a future session (or a differently-scoped one) from picking one up and either duplicating already-shipped work or conflicting with it.

## TASK 0 — Probe

Confirm all four files' current real content and confirm none has actually been executed (check for any matching outbox file, which would indicate it ran) — if any of the four unexpectedly HAS a real outbox/execution record, stop and report rather than delete something that already shipped.

## TASK 1 — Delete

Delete exactly these four files:
- `docs/CC-CMD-2026-07-13-hrd-right-now-surface.md`
- `docs/CC-CMD-2026-07-13-specials-score-boost.md`
- `docs/CC-CMD-2026-07-13-gumtree-probe.md`
- `docs/CC-CMD-2026-07-13-hrd-entry.md`

No other files touched.

## TASK 2 — Verify

Confirm all four are genuinely gone from `main`, confirm `docs/CC-CMD-2026-07-13-media-special-right-now.md` (the real, shipped one) and `docs/CC-CMD-2026-07-13-hrd-entry-v2.md` (also shipped) are untouched.

## DONE CONDITION

Four stale, unexecuted, superseded/redundant docs removed. Nothing else changed.

**Confidence scoring:**
- TASK 0 confirms none of the four were secretly already executed (30 pts)
- TASK 1 exactly the 4 files deleted, nothing else touched (40 pts)
- TASK 2 real confirmation of the deletion and that shipped docs are untouched (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
