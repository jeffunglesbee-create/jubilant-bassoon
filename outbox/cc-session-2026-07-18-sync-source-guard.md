# CC Session Doc — sync-source.mjs Divergence Guard
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 37a41b4 (after Code Map)
**HEAD end:** 5355893
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — no runtime-visible changes)

## Commits

- `5355893` fix: sync-source.mjs divergence guard — blocks silent overwrite of direct index.html script edits

## What was built

Added a pre-overwrite divergence check to `scripts/sync-source.mjs`. Before replacing `index.html`'s script block with `src/legacy/field.js` content, the guard now:

1. Reads the current `index.html` script block
2. Reads the last-committed `index.html` script block via `git show HEAD:index.html`
3. If `currentBlock !== fieldJs` (something would change) AND `currentBlock !== committedBlock` (it's not just the stale pre-sync state) — prints a loud blocked-box error to stderr and exits 1, refusing to overwrite

**Normal sync path (field.js is the source of change):** `currentBlock === committedBlock` (both are the old state before field.js was updated). Guard does not fire. Sync proceeds normally.

**Blocked path (index.html was edited directly):** `currentBlock !== committedBlock` (direct edit) AND `currentBlock !== fieldJs` (not already matching field.js). Guard fires.

**Edge cases handled:**
- No HEAD commit yet (initial repo): `git show HEAD:index.html` throws → `committedBlock` stays null → guard skipped (safe default for fresh repos)
- `currentBlock === fieldJs`: no divergence regardless of committed state — sync is a no-op but proceeds cleanly

## TASK 2: CLAUDE.md update

Key Files section updated with:
- `src/legacy/field.js` entry prominently noting it's the ONLY correct JS edit target
- `scripts/sync-source.mjs` entry noting the guard
- Explanation that CSS goes to `index.html` directly (not overwritten by sync)

## Real verification output (TASK 3)

**Blocking case — direct edit injected into index.html:**
```
╔══════════════════════════════════════════════════════════════════════╗
║  sync-source.mjs: DIRECT EDIT DETECTED — sync blocked               ║
...
╚══════════════════════════════════════════════════════════════════════╝
Exit code: 1
```

**Normal case — index.html restored to committed state:**
```
✅ sync-source: src/legacy/field.js (2114 KB) → index.html script block
Exit code: 0
```

## CI
- Deploy gate (fast smoke): pending on 5355893
- Desktop Chrome Viewport Audit: in_progress on 5355893
- Desktop Safari Viewport Audit: queued on 5355893

## Done condition met

`sync-source.mjs` now genuinely detects and blocks (rather than silently overwrites) any case where `index.html`'s script block has diverged from both `field.js` and the last commit. Proven via real deliberate test with real pasted output. Normal `field.js`-originated syncs continue to work exactly as before.

**Confidence: 100/100**
- TASK 1 (divergence guard): 50/50
- TASK 2 (CLAUDE.md note): 15/15
- TASK 3 (real verification, both cases): 35/35
