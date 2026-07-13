# Claude Code Command — Delete three stale docs, defer (not delete) gumtree-probe.md

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** delete 3 files, move 1 file with a status note added. No other changes.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/cleanup-stale-docs-2026-07-13.md.

## CONTEXT

`docs/CC-CMD-2026-07-13-media-special-right-now.md` is already shipped and live-verified (renders real `#rn-special-cards`, `renderMediaSpecialRightNow()`, `scrollToMediaSpecial()`, wired at both real call sites). Four other CC-CMD docs need attention — three are now stale, one is deferred:

- **`hrd-right-now-surface.md`** — a separate, parallel proposal solving the exact same problem `media-special-right-now` already shipped (surfacing HRD in `#field-right-now`). Redundant now that the real one landed.
- **`specials-score-boost.md`** — a different, competing approach to the same underlying problem (boost sort order within the existing media grid instead of a new container). Also redundant now.
- **`hrd-entry.md`** (v1) — superseded by `hrd-entry-v2.md`, which shipped. Never executed.

**Correction: `gumtree-probe.md` is explicitly EXCLUDED from deletion.** Not dead — deferred. It wasn't superseded so much as displaced by a faster, good-enough-for-tonight tree-sitter tool built for the immediate Bucket C need; GumTree itself (real, independently benchmarked as state-of-the-art, JS-supported) remains a genuinely stronger tool for a future, larger, or cross-language audit. Useful someday, just not today. It stays, but should not sit in the active `docs/CC-CMD-*` queue looking dispatch-ready when it isn't meant to run today — move it instead (see TASK 1).

None of the three deletion targets were ever executed. Deleting them prevents a future session from picking one up and either duplicating already-shipped work or conflicting with it.

## TASK 0 — Probe

Confirm all four files' current real content and confirm none has actually been executed (check for any matching outbox file, which would indicate it ran) — if any of the three deletion targets unexpectedly HAS a real outbox/execution record, stop and report rather than delete something that already shipped.

## TASK 1 — Delete three, relocate one

Delete exactly these three files:
- `docs/CC-CMD-2026-07-13-hrd-right-now-surface.md`
- `docs/CC-CMD-2026-07-13-specials-score-boost.md`
- `docs/CC-CMD-2026-07-13-hrd-entry.md`

Move (not delete) `docs/CC-CMD-2026-07-13-gumtree-probe.md` to `docs/deferred/gumtree-probe.md` (create the `docs/deferred/` path if it doesn't exist — check first whether a convention for this already exists elsewhere in the repo and match it if so, don't invent a new one if a real precedent exists). Add a one-line header note at the top of the moved file: `**STATUS: Deferred, not superseded — real tool for a future larger/cross-language audit. Do not dispatch as-is; re-scope to the actual future need first.**` — keep the rest of the file's real content (the Maven coordinates, the CI-as-proxy reasoning) intact, since that reasoning is still valid and worth preserving for whenever this is picked back up.

No other files touched.

## TASK 2 — Verify

Confirm the three targets are genuinely gone from `main`, confirm `gumtree-probe.md` genuinely exists at its new `docs/deferred/` path with the status note added and its real content intact (not lost in the move), and confirm `docs/CC-CMD-2026-07-13-media-special-right-now.md` and `docs/CC-CMD-2026-07-13-hrd-entry-v2.md` (both shipped) are untouched.

## DONE CONDITION

Three stale, unexecuted, superseded/redundant docs removed. One (`gumtree-probe.md`) relocated out of the active queue with a clear deferred-status note, content preserved. Nothing else changed.

**Confidence scoring:**
- TASK 0 confirms none of the three deletion targets were secretly already executed (25 pts)
- TASK 1 exactly the 3 files deleted, gumtree-probe.md correctly moved (not deleted) with its content and reasoning intact plus the new status note, nothing else touched (45 pts)
- TASK 2 real confirmation of both the deletion and the move, shipped docs untouched (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
