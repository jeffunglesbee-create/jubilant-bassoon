# Claude Code Command — esbuild Phase 2: establish src/ structure + extract first modules

**Date:** 2026-07-17
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.** Phase 2 extracts real code from index.html into separate files for the first time. It is not a pipeline-only change. Mistakes here can produce runtime errors that smoke cannot catch. Read this document in full before starting.

---

## CONTEXT

Phase 1 (completed 2026-07-17, commits `6be08e9`–`a288a77`) wired esbuild into the CI pipeline: `build-bundle.mjs` extracts the inline `<script>` block from index.html, runs esbuild (IIFE, no module resolution), re-injects the bundle in-place. Smoke runs against the source before the build step. The pipeline now proves esbuild can parse and bundle the 39,172-line script cleanly.

Phase 1 did NOT change the file structure. index.html still contains the entire application inline. `build-bundle.mjs` treats it as a single monolithic script — no entry point file, no imports, no `src/` directory.

Phase 2 establishes the actual `src/` structure that allows code to be extracted into real ES modules over time. It does this by:

1. Creating `src/legacy/field.js` — a symlink or copy of the extracted script block (the same content `build-bundle.mjs` already extracts into a temp file)
2. Creating `src/main.js` — a single-line entry point: `import './legacy/field.js'`
3. Updating `build-bundle.mjs` to use `src/main.js` as its entry point instead of extracting from index.html at build time
4. Keeping index.html's `<script>` block as the source of truth for smoke — smoke still runs against index.html before the build. After build, `build-bundle.mjs` replaces the inline script with the IIFE bundle built from `src/main.js`.

This is the "make esbuild invisible" architecture described in the Phase 1 CC-CMD (CC-CMD-2026-07-17-esbuild-migration-verification.md, Task 3). Phase 1 wired the pipeline. Phase 2 establishes the file structure.

**After Phase 2 is complete**, individual functions and constants can be extracted from `src/legacy/field.js` into `src/utils/`, `src/sports/`, etc. as proper ES modules, and `src/main.js` imports them. Each extraction is a separate, scoped CC-CMD — Phase 2 does not extract anything; it only creates the structure.

---

## PRE-BUILD PROBE BLOCK

Run these before writing any code. They establish current state.

```bash
# 1. Confirm HEAD and branch
git log --oneline -3
git branch --show-current

# 2. Confirm src/ does not exist yet
ls src/ 2>&1 || echo "src/ not present — correct"

# 3. Confirm build-bundle.mjs current entry-point logic
grep -n "scriptStart\|OPEN_TAG\|contentStart\|tmpIn\|entryPoints" scripts/build-bundle.mjs

# 4. Confirm smoke baseline
node smoke.js index.html 2>&1 | tail -3

# 5. Confirm esbuild is available
node -e "import('esbuild').then(m => console.log('esbuild ok', Object.keys(m)))"

# 6. Get exact line count of inline script block
node -e "
const h = require('fs').readFileSync('index.html','utf8');
const s = h.indexOf('<script>');
const e = h.indexOf('</script>', s);
console.log('script block lines:', h.slice(s+8,e).split('\n').length);
console.log('script start char:', s, 'end char:', e);
"
```

All 6 probes must succeed before writing any code. If any probe fails, stop and report.

---

## TASK 1 — Create src/legacy/field.js

Extract the `<script>` block content from index.html and write it to `src/legacy/field.js`. This is the same extraction that `build-bundle.mjs` currently does into a temp file, but now persisted as the authoritative source.

```bash
mkdir -p src/legacy
node -e "
const fs = require('fs');
const h = fs.readFileSync('index.html','utf8');
const s = h.indexOf('<script>') + '<script>'.length;
const e = h.indexOf('</script>', s);
fs.writeFileSync('src/legacy/field.js', h.slice(s,e), 'utf8');
console.log('wrote', h.slice(s,e).split('\n').length, 'lines');
"
```

Verify: `wc -l src/legacy/field.js` — must match the script block line count from the probe block.

**IMPORTANT:** `src/legacy/field.js` is derived from index.html's inline script. For now, index.html remains the source of truth — smoke runs against index.html. The next CC-CMD (Phase 2b, not this one) will invert this: `src/legacy/field.js` becomes the source, index.html is assembled from it. That inversion requires its own explicit authorization.

---

## TASK 2 — Create src/main.js

```js
// Entry point for esbuild. Imports the full legacy script as a single module.
// Individual modules will be extracted from src/legacy/field.js over time.
import './legacy/field.js';
```

No other content. No imports. No exports.

---

## TASK 3 — Update build-bundle.mjs to use src/main.js

Current `build-bundle.mjs` extracts the `<script>` block into a temp file at build time and passes that as the esbuild entry point. Update it to use `src/main.js` instead, and remove the extract-inject logic (since the bundle now comes from src/, not from index.html).

**New behavior:**
1. esbuild builds `src/main.js` → bundle JS string
2. Read index.html
3. Find `<script>` and `</script>` positions
4. Replace the inline content with the bundle
5. Write index.html back

The inject-into-index.html step remains — deploy still needs a single-file index.html. Only the SOURCE of the bundle changes (from temp extraction → src/main.js).

Before rewriting `build-bundle.mjs`, read the current file in full, understand every step, then update only the entry-point and temp-file sections. The re-inject logic stays.

---

## TASK 4 — Dry-run: build and verify

```bash
# Build the bundle using new src/main.js entry point
node scripts/build-bundle.mjs

# Confirm index.html was updated (bundle injected)
wc -l index.html
# Line count will differ from source — that's expected (bundle is different from source)

# Smoke MUST still pass against... wait.
```

**Critical:** After `build-bundle.mjs` runs, it has replaced the inline `<script>` content in index.html with the esbuild bundle. Smoke cannot run against the bundle (382 failures). Smoke must run against the PRE-BUILD index.html.

In the CI pipeline this is correct — smoke runs BEFORE `build-bundle.mjs`. Locally, you need to restore index.html to source before running smoke.

**Local verification sequence:**
```bash
git stash  # save bundle-transformed index.html
node smoke.js index.html  # smoke against source — must be 958/0
git stash pop  # restore bundle (or just discard — git checkout index.html)
```

If smoke is 958/0 against source, Phase 2 is correct.

---

## TASK 5 — Add src/ to .assetsignore

`wrangler.jsonc` serves the current directory. `src/` must not be uploaded to Cloudflare (it's a build-time artifact, not a public asset).

```bash
grep "src/" .assetsignore || echo "src/" >> .assetsignore
cat .assetsignore
```

Verify `src/` appears in `.assetsignore` before committing.

---

## TASK 6 — Commit sequence

Three commits, one concern each:

```
git add src/legacy/field.js src/main.js
git commit -m "feat: add src/legacy/field.js + src/main.js — Phase 2 esbuild src/ structure"

git add scripts/build-bundle.mjs
git commit -m "refactor: build-bundle.mjs — use src/main.js entry point instead of inline extraction"

git add .assetsignore
git commit -m "chore: exclude src/ from Cloudflare asset upload in .assetsignore [skip ci]"

git push -u origin main
```

First two commits will trigger deploy-gate.yml (index.html is not changed, so actually... wait — the trigger paths are index.html, sw.js, field_utils.js, wrangler.jsonc. `src/` files and `scripts/` changes do NOT trigger deploy-gate.yml). So all three commits can use `[skip ci]` or will simply not trigger the workflow.

Confirm: `git push` after all three commits; deploy-gate.yml should NOT fire since no trigger-path files changed.

---

## DONE CONDITION

```bash
# Verify src/ structure
ls src/legacy/field.js src/main.js

# Verify src/ excluded from CF upload
grep "src/" .assetsignore

# Verify smoke still passes against source
node smoke.js index.html 2>&1 | tail -3
# Expected: 958 passed, 0 failed

# Verify build-bundle.mjs works end-to-end
git stash
node scripts/build-bundle.mjs
git checkout index.html  # restore source
echo "build clean"
```

All four checks pass = Phase 2 complete.

---

## WHAT PHASE 2 DOES NOT DO

- Does NOT extract any functions or constants from `src/legacy/field.js` into modules
- Does NOT change index.html's inline `<script>` content (source is still index.html)
- Does NOT invert the source-of-truth (src/legacy/field.js is still derived, not primary)
- Does NOT change the deploy pipeline (already correct from Phase 1)
- Does NOT add tree-shaking, code-splitting, or any esbuild optimizations

Each of those is a separate, explicitly-authorized next step.

---

## CONFIDENCE SCORING

- TASK 1 (25 pts): src/legacy/field.js created, line count verified
- TASK 2 (10 pts): src/main.js created, single import
- TASK 3 (30 pts): build-bundle.mjs updated, entry point changed, inject logic preserved
- TASK 4 (20 pts): dry-run complete, smoke 958/0 confirmed against source
- TASK 5 (5 pts): .assetsignore updated
- TASK 6 (10 pts): three clean commits, correct [skip ci] usage

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
