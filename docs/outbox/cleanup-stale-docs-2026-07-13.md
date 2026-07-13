# CC Session Outbox — Delete three stale docs, defer (not delete) gumtree-probe.md (CC-CMD-2026-07-13-cleanup-stale-docs)

**Date:** 2026-07-13
**Scope:** delete 3 files, move 1 file with a status note added. Docs-only — no `index.html`/`sw.js`/`field_utils.js`/`wrangler.jsonc` touched, no smoke/SW_VERSION implications.

## TASK 0 — Probe

Confirmed all four files' real content and checked `docs/outbox/` for any matching execution record before touching anything:
- `docs/CC-CMD-2026-07-13-hrd-right-now-surface.md` — no matching outbox file.
- `docs/CC-CMD-2026-07-13-specials-score-boost.md` — no matching outbox file.
- `docs/CC-CMD-2026-07-13-hrd-entry.md` (v1) — no matching outbox file (only `hrd-entry-v2-2026-07-13.md` exists, for the v2 that actually shipped).
- `docs/CC-CMD-2026-07-13-gumtree-probe.md` — no matching outbox file either (not executed, consistent with the user's earlier "Defer gumtree" instruction this session).

None of the three deletion targets had ever been executed — safe to delete per the CC-CMD's own stop condition.

Also checked for an existing `docs/deferred/`-style convention elsewhere in the repo before creating one (`find docs -maxdepth 1 -type d` → only `docs/outbox` exists; grepped the whole repo for `docs/deferred|docs/archive|docs/paused|docs/inactive` → zero real precedent, only the CC-CMD doc itself mentioning the target path). No existing convention to match, so `docs/deferred/` was created fresh, exactly as the CC-CMD's own fallback instruction allowed.

## TASK 1 — Delete three, relocate one

- Deleted (`git rm`): `docs/CC-CMD-2026-07-13-hrd-right-now-surface.md`, `docs/CC-CMD-2026-07-13-specials-score-boost.md`, `docs/CC-CMD-2026-07-13-hrd-entry.md`.
- Moved (`git mv`): `docs/CC-CMD-2026-07-13-gumtree-probe.md` → `docs/deferred/gumtree-probe.md`, with the exact status note prepended: `**STATUS: Deferred, not superseded — real tool for a future larger/cross-language audit. Do not dispatch as-is; re-scope to the actual future need first.**`. Rest of the file (Maven coordinates, CI-as-proxy reasoning, all 3 tasks, confidence scoring) preserved byte-for-byte below the new note.

No other files touched.

## TASK 2 — Verify

- Confirmed all three deletion targets are genuinely gone from the working tree (`ls` → "No such file or directory" for all three).
- Confirmed `docs/deferred/gumtree-probe.md` exists at its new path: 49 lines (was 47 — +2 for the blank line + status note), real content intact (Maven/CI-as-proxy reasoning present, grep count 7 for those terms), status note correctly prepended.
- Confirmed the two shipped docs are byte-for-byte untouched: `docs/CC-CMD-2026-07-13-media-special-right-now.md` and `docs/CC-CMD-2026-07-13-hrd-entry-v2.md` show zero entries in `git status --short` for either path.
- `git diff --staged --stat` shows exactly 4 files changed (3 deletions, 1 rename with a content edit), 151 deletions, 0 net additions outside the rename diff — nothing else in the repo touched.
- Confirmed docs-only: none of `index.html`/`sw.js`/`field_utils.js`/`wrangler.jsonc` appear in the staged diff, so this commit is not a deploy-gate trigger — no smoke run or SW_VERSION bump required or performed.

## DONE CONDITION

Three stale, unexecuted, superseded/redundant docs removed. `gumtree-probe.md` relocated out of the active `docs/CC-CMD-*` queue into `docs/deferred/` with a clear deferred-status note, its real content and reasoning fully preserved. Nothing else changed.

## Confidence score

- TASK 0 confirms none of the three deletion targets were secretly already executed (checked real outbox contents, not assumed): 25/25
- TASK 1 exactly the 3 files deleted, gumtree-probe.md correctly moved (not deleted) with content and reasoning intact plus the new status note, nothing else touched: 45/45
- TASK 2 real confirmation of both the deletion and the move (file-existence checks, line counts, content grep), shipped docs confirmed untouched via `git status`: 30/30

**Total: 100/100.**

## Commit

- Deleted: `docs/CC-CMD-2026-07-13-hrd-right-now-surface.md`, `docs/CC-CMD-2026-07-13-specials-score-boost.md`, `docs/CC-CMD-2026-07-13-hrd-entry.md`.
- Moved: `docs/CC-CMD-2026-07-13-gumtree-probe.md` → `docs/deferred/gumtree-probe.md` (status note added, content preserved).
- This manifest.
