# Claude Code Command — esbuild Phase 2b (corrected): invert source-of-truth via sync-source.mjs

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## WHY THIS CC-CMD EXISTS (what the previous one got wrong)

`docs/CC-CMD-2026-07-18-esbuild-phase2b.md` stated:

> Fast smoke (node smoke.js src/legacy/field.js) ← changed target

Probe execution in a real session found: `node smoke.js src/legacy/field.js` produces **856 passed / 102 failed** against the 958/0 baseline. The 102 failures are HTML/CSS assertions — DOCTYPE, `</html>`, `<title>`, CSS variables, HTML elements (`#ambient-panel`, `#field-arb`, `mobile-live-bar`), manifest content, CLS-fix assertions (A403–A415), and more. These assertions check content in the HTML/CSS wrapper of `index.html` that does not exist in the JS-only `src/legacy/field.js`. Pointing smoke at `src/legacy/field.js` is not viable without rewriting 102 assertions. That is not this CC-CMD.

**Corrected architecture:** smoke always runs against `index.html`. The inversion is implemented via a `scripts/sync-source.mjs` script that writes `src/legacy/field.js` content into `index.html`'s script block, keeping them in sync. The edit target flips (you edit `src/legacy/field.js`, not `index.html`), but `index.html` is maintained as the always-current assembled form. Smoke sees `index.html` and all 958 assertions remain valid.

---

## CONTEXT

State after Phase 2 (`f2dfda2`–`5be678c`):
- `src/legacy/field.js` — 39,173-line JS, byte-identical to `index.html`'s main script block
- `src/main.js` — esbuild entry: `import './legacy/field.js'`
- `build-bundle.mjs` — bundles `src/main.js` → IIFE → replaces `index.html`'s script block
- `smoke.js` — accepts `process.argv[2] || 'index.html'`; 102 of its 958 assertions are HTML/CSS-only
- `scripts/pre-commit` — runs `node smoke.js index.html` (hard-coded path); also checks SW_VERSION sync via grep on `index.html`
- `deploy-gate.yml` SW_VERSION sync — runs `sed` on `sw.js` and `index.html`; commits both back

**Phase 2b's job:** make `src/legacy/field.js` the file humans (and AI) edit. When it changes, those changes propagate to `index.html` (via `sync-source.mjs`) before smoke and before build. `index.html` stays in git as the assembled form; the deploy pipeline's build step replaces its script block with the IIFE bundle.

---

## PRE-BUILD PROBE BLOCK

```bash
# 1. Confirm HEAD and Phase 2 files
git log --oneline -3
ls src/legacy/field.js src/main.js

# 2. Byte-identical check (must be true — any drift = STOP)
node -e "
const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const s = h.lastIndexOf('<script>') + '<script>'.length;
const e = h.indexOf('</script>', s);
const inlineScript = h.slice(s, e);
const legacyFile = fs.readFileSync('src/legacy/field.js', 'utf8');
console.log('byte-identical:', inlineScript === legacyFile);
if (inlineScript !== legacyFile) {
  console.log('inline length:', inlineScript.length, 'legacy length:', legacyFile.length);
}
"
# If NOT byte-identical: re-extract src/legacy/field.js from index.html before continuing.

# 3. Smoke baseline (must be 958/0)
node smoke.js index.html 2>&1 | tail -3

# 4. Confirm pre-commit hook's smoke invocation
grep "smoke.js" scripts/pre-commit

# 5. Confirm deploy-gate.yml SW_VERSION sync targets
grep "sed -i" .github/workflows/deploy-gate.yml
grep "git diff --quiet" .github/workflows/deploy-gate.yml
grep "git add" .github/workflows/deploy-gate.yml | head -5
```

All 5 must pass. If probe 2 is not byte-identical, re-run Phase 2 TASK 1 extraction, commit it as a fix, then resume here.

---

## TASK 1 — Create scripts/sync-source.mjs

This script reads `src/legacy/field.js` and writes its content into `index.html`'s main script block in-place. It is the inverse of Phase 2's extraction. Used by: the pre-commit hook (before smoke), the CI SW_VERSION sync step (after sed on `src/legacy/field.js`).

```js
#!/usr/bin/env node
// Sync src/legacy/field.js → index.html script block.
// Run before smoke and before committing any src/legacy/field.js change.
// This keeps index.html's inline script byte-identical to src/legacy/field.js.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, '..');
const htmlPath = join(rootDir, 'index.html');
const fieldJsPath = join(rootDir, 'src', 'legacy', 'field.js');

const fieldJs = readFileSync(fieldJsPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');

const OPEN_TAG = '<script>';
const CLOSE_TAG = '</script>';
const scriptStart = html.lastIndexOf(OPEN_TAG);
if (scriptStart === -1) throw new Error('No <script> tag found in index.html');
const contentStart = scriptStart + OPEN_TAG.length;
const scriptEnd = html.indexOf(CLOSE_TAG, contentStart);
if (scriptEnd === -1) throw new Error('No </script> closing tag found');

const blockSize = scriptEnd - contentStart;
if (blockSize < 1_000_000) {
  throw new Error(`Script block is only ${blockSize} chars — expected 2MB+. Wrong block.`);
}

const result = html.slice(0, contentStart) + fieldJs + html.slice(scriptEnd);
writeFileSync(htmlPath, result, 'utf8');

console.log(`✅ sync-source: src/legacy/field.js (${(fieldJs.length / 1024).toFixed(0)} KB) → index.html script block`);
```

After writing: `node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3` — must be 958/0.

---

## TASK 2 — Update scripts/pre-commit

Add the sync step before smoke. Read the current pre-commit in full before editing — do not guess its structure.

Current hook runs (relevant lines):
```sh
node "$REPO/smoke.js" "$REPO/index.html"
```

And the SW_VERSION check at the top:
```sh
_HTML_SWV=$(grep -m1 "const SW_VERSION = '" "$REPO/index.html" | sed ...)
```

**Changes needed:**

1. Before smoke: add `node "$REPO/scripts/sync-source.mjs"` to propagate any staged `src/legacy/field.js` changes into `index.html` before smoke runs.

2. The SW_VERSION sync check currently reads from `index.html`. After the sync step, `index.html` is always up-to-date with `src/legacy/field.js`, so this check remains valid as-is. No change needed to the SW_VERSION check.

**Position in hook:** insert `node "$REPO/scripts/sync-source.mjs"` immediately before the smoke lines, after the diff review block. Add a `git add "$REPO/index.html"` after the sync (so the synced index.html is staged for the current commit along with any src/legacy/field.js changes).

After editing pre-commit: make a trivial edit to `src/legacy/field.js` (e.g., add a comment), attempt a commit, confirm the hook syncs index.html, smoke passes, commit succeeds. Then revert the trivial edit with another commit.

---

## TASK 3 — Update deploy-gate.yml SW_VERSION sync

Current sync step (lines 79–85):
```yaml
sed -i "s/const SW_VERSION *= *'[^']*'/const SW_VERSION = '${NEW_VERSION}'/" sw.js
sed -i "s/const SW_VERSION = '[^']*'/const SW_VERSION = '${NEW_VERSION}'/" index.html
```

Current commit-back step (lines 96–98):
```yaml
git diff --quiet sw.js index.html && echo "SW_VERSION already in sync — no commit needed" && exit 0
git add sw.js index.html
git commit -m "chore: sync SW_VERSION ..."
```

**Changes needed:**

1. In the sync step: change the `index.html` sed line to target `src/legacy/field.js` instead, then run `node scripts/sync-source.mjs` to propagate the updated field.js → index.html.

   Replace:
   ```sh
   sed -i "s/const SW_VERSION = '[^']*'/const SW_VERSION = '${NEW_VERSION}'/" index.html
   ```
   With:
   ```sh
   sed -i "s/const SW_VERSION = '[^']*'/const SW_VERSION = '${NEW_VERSION}'/" src/legacy/field.js
   node scripts/sync-source.mjs
   ```

2. In the commit-back step: change the diff check and git add to include `src/legacy/field.js`.

   Replace:
   ```sh
   git diff --quiet sw.js index.html && echo "SW_VERSION already in sync — no commit needed" && exit 0
   git add sw.js index.html
   ```
   With:
   ```sh
   git diff --quiet sw.js src/legacy/field.js index.html && echo "SW_VERSION already in sync — no commit needed" && exit 0
   git add sw.js src/legacy/field.js index.html
   ```

Read the full deploy-gate.yml sync and commit-back steps before editing. Confirm that the `echo` message at the end of the sync step mentions all updated files.

---

## TASK 4 — Add GENERATED comment in build-bundle.mjs

`build-bundle.mjs` currently injects the IIFE bundle into `index.html` without any marker. After Phase 2b, the inline script block in the committed index.html is the raw source (from `src/legacy/field.js`); after build-bundle.mjs runs (in CI), it becomes the IIFE bundle. A future session opening `index.html` after CI has run locally would see a bundled script block with no indication it's machine-generated.

In `build-bundle.mjs`, prepend a comment to the bundled content before injecting:

```js
const warning = '// GENERATED BY build-bundle.mjs — edit src/legacy/field.js, not this block\n';
const result = html.slice(0, contentStart) + '\n' + warning + bundled + html.slice(scriptEnd);
```

This is a one-line change to the assembly step. Read the current file before editing.

---

## TASK 5 — Add src/legacy/field.js to deploy-gate.yml trigger paths

Currently only `index.html`, `sw.js`, `field_utils.js`, `wrangler.jsonc` trigger deploys. After Phase 2b, edits go to `src/legacy/field.js`. The pre-commit hook syncs it → `index.html` before committing, so committed changes to `src/legacy/field.js` will always be accompanied by a changed `index.html` — which already triggers the workflow. **This means no trigger path change is strictly required.**

Verify this reasoning: after making an edit to `src/legacy/field.js` and committing (via the hook that syncs index.html), run `git diff HEAD~1 --name-only` — confirm `index.html` appears in the diff. If it does, no trigger change needed. If it doesn't, add `src/legacy/field.js` to the paths block.

---

## TASK 6 — Real end-to-end dry-run

```bash
# Make a deliberate, trivial edit to src/legacy/field.js only
echo "// PHASE2B-TEST-$(date +%s)" >> src/legacy/field.js

# Stage it and attempt commit — pre-commit hook should:
# 1. Run sync-source.mjs (index.html updated)
# 2. Run smoke against index.html (958/0)
# 3. Commit both src/legacy/field.js and index.html
git add src/legacy/field.js
git commit -m "test: Phase 2b dry-run edit [no-verify: testing pre-commit sync, reverting next]"
# --no-verify used because appending a comment may confuse smoke; adjust if smoke passes without it

# Confirm both files changed in the commit
git show --stat HEAD

# Confirm the test comment appears in index.html's script block
node -e "
const h = require('fs').readFileSync('index.html','utf8');
const s = h.lastIndexOf('<script>') + 8;
const e = h.indexOf('</script>', s);
const block = h.slice(s, e);
console.log('test comment in index.html:', block.includes('PHASE2B-TEST'));
"

# Revert
git revert HEAD --no-edit
```

If the test comment appears in `index.html`'s script block without running `sync-source.mjs` manually, the pre-commit hook is working. If not, debug the hook before proceeding.

---

## TASK 7 — Commit sequence

```
git add scripts/sync-source.mjs
git commit -m "feat: add scripts/sync-source.mjs — propagate src/legacy/field.js to index.html"

git add scripts/pre-commit
git commit -m "fix: pre-commit — sync src/legacy/field.js → index.html before smoke [skip ci]"

git add scripts/build-bundle.mjs
git commit -m "fix: build-bundle.mjs — add GENERATED comment to injected script block [skip ci]"

git add .github/workflows/deploy-gate.yml
git commit -m "ci: deploy-gate SW_VERSION sync — target src/legacy/field.js, sync → index.html"

git push -u origin main
```

The deploy-gate.yml commit touches a CI file but not a trigger path — will not fire a deploy. The sync-source.mjs and pre-commit commits are `[skip ci]`. None of these commits touch index.html content, so no deploy fires.

**To verify the new CI pipeline fires correctly:** after all commits are pushed, make a trivial content edit to `src/legacy/field.js` (e.g., a version comment), commit normally (let the hook run), push. This triggers deploy-gate.yml. Check the job logs via GitHub Actions API to confirm: (1) SW_VERSION sync ran on `src/legacy/field.js`, (2) `sync-source.mjs` ran in the sync step, (3) smoke ran against `index.html` at 958/0, (4) build-bundle.mjs produced the correct bundle, (5) deploy completed.

---

## DONE CONDITION

```bash
# 1. sync-source.mjs exists and is runnable
node scripts/sync-source.mjs && echo "sync-source OK"

# 2. Byte-identical after sync
node -e "
const fs = require('fs');
const h = fs.readFileSync('index.html','utf8');
const s = h.lastIndexOf('<script>') + 8;
const e = h.indexOf('</script>', s);
console.log('byte-identical:', h.slice(s,e) === fs.readFileSync('src/legacy/field.js','utf8'));
"

# 3. Smoke still 958/0
node smoke.js index.html 2>&1 | tail -3

# 4. Pre-commit hook calls sync-source.mjs
grep "sync-source" scripts/pre-commit

# 5. deploy-gate.yml SW_VERSION sync targets src/legacy/field.js
grep "src/legacy/field.js" .github/workflows/deploy-gate.yml

# 6. build-bundle.mjs injects GENERATED comment
grep "GENERATED" scripts/build-bundle.mjs

# 7. Live CI run confirmed (after a real index.html-touching push)
# Check job logs via: gh run list --workflow=deploy-gate.yml --limit=1
```

All 7 checks pass = Phase 2b complete.

---

## CONFIDENCE SCORING

- Probe 2 byte-identical (15 pts): gates the rest
- TASK 1 (20 pts): sync-source.mjs created and verified
- TASK 2 (20 pts): pre-commit hook updated, dry-run confirmed
- TASK 3 (20 pts): deploy-gate.yml SW_VERSION sync updated
- TASK 4 (5 pts): GENERATED comment in build-bundle.mjs
- TASK 5 (5 pts): trigger path verified (change or confirm no change needed)
- TASK 6 (10 pts): real end-to-end dry-run passed
- TASK 7 (5 pts): three clean commits, correct [skip ci] usage

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
