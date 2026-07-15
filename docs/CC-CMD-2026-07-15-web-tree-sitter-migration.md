# Claude Code Command — Migrate tree-sitter devDependency from native to WASM (web-tree-sitter)

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull.

Write findings to docs/outbox/cc-web-tree-sitter-migration-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

The current `tree-sitter`/`tree-sitter-javascript` devDependencies are native Node addons requiring `node-gyp` compilation, which needs `nodejs.org` for Node headers. This chat session hit this wall directly (its own sandbox doesn't allow that domain) and confirmed a real, working, permanent alternative: `web-tree-sitter` + `tree-sitter-javascript` (the same grammar package, used via its own bundled `.wasm` file instead of triggering a native build) installs and runs cleanly with zero network dependency beyond npm itself, verified directly in an isolated test — real orphan-sweep results obtained, matching expectations exactly (correctly found the same 5 genuine orphans this session's own 9-CC-CMD batch left alone by design).

This removes a real, now-confirmed-recurring constraint — not just for this chat session, but for any future environment (including this one's own Claude Code sessions, whose broader network access made native compilation work before, but which would still benefit from a simpler, more portable setup with no compilation step at all).

## TASK 0 — Probe

Confirm the real current `package.json` devDependency entries for `tree-sitter`/`tree-sitter-javascript`/`tree-sitter-css`. Confirm whether any committed script in this repo currently imports the native `tree-sitter` package directly (the orphan-sweep script itself was never checked in per prior session history — confirm this is still true, or find and update it if one exists now).

## TASK 1 — Fix

Replace `tree-sitter` with `web-tree-sitter` in `package.json`'s devDependencies. Keep `tree-sitter-javascript` (it ships both native and WASM artifacts in the same package; only the consuming code's import pattern changes — `require('web-tree-sitter')` with `Language.load('.../tree-sitter-javascript.wasm')`, not `require('tree-sitter-javascript')` directly as a native language binding). If `tree-sitter-css` is genuinely used anywhere, apply the same treatment; if it's unused, note that separately rather than silently removing it (out of this dispatch's narrow scope).

## TASK 2 — Verify

Real `npm install` from a clean `node_modules` completes with zero errors and zero native compilation attempted (confirm via install log — no `node-gyp`/`gyp` output at all). A real, minimal smoke script (parse a trivial JS snippet, confirm a real AST node comes back) proves the WASM path genuinely works post-migration.

## DONE CONDITION

`npm install` in this repo no longer requires any native compilation or `nodejs.org` access — confirmed via a clean install log and a real parse smoke test.

**Confidence scoring:**
- TASK 0 (20 pts): confirms real current devDependency state and whether any script depends on the native import shape
- TASK 1 (50 pts): correct package swap, correct import pattern for any dependent code
- TASK 2 (30 pts): real clean-install verification (no gyp output), real parse smoke test

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
