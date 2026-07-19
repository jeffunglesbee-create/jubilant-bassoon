# CC-CMD-1: Solid.js Build Pipeline Integration

**Date:** 2026-07-19
**Scope:** jubilant-bassoon only
**Prerequisite for:** CC-CMD-2 (ambient island), CC-CMD-3 (score overlay)
**App behavior change:** None — zero runtime effect, build pipeline only

## Target Files
- `scripts/build-bundle.mjs` — add solid plugin (3-line change)
- `src/solid/_placeholder.jsx` — new file, verifies JSX compilation
- `package.json` / `package-lock.json` — 2 new devDependencies

## Do NOT Touch
`src/legacy/field.js`, `index.html`, `sw.js`, any existing component

---

## Tasks

### T1. Confirm starting state
```bash
git log --oneline -3
node smoke.js index.html 2>&1 | tail -3
cat package.json | grep '"solid\|esbuild'
ls src/solid 2>/dev/null || echo "src/solid does not exist"
```
Expected: HEAD = `9853288`, smoke 958/0, no solid-js entry, no src/solid dir.

### T2. Install packages
```bash
npm install solid-js esbuild-plugin-solid --save-dev
```
Verify:
```bash
node -e "require('solid-js'); require('esbuild-plugin-solid'); console.log('packages ok')"
```

### T3. Create `src/solid/_placeholder.jsx`
```jsx
// Placeholder — verifies JSX compilation pipeline. Not mounted anywhere.
export function _Placeholder() {
  return <span data-solid-placeholder="1" />;
}
```

### T4. Modify `scripts/build-bundle.mjs`

Read the file first. Add three lines — import, and plugins option:

```diff
+import solidPlugin from 'esbuild-plugin-solid';
 import esbuild from 'esbuild';
 ...
   await esbuild.build({
     entryPoints: ['src/main.js'],
     bundle: true,
     format: 'esm',
     platform: 'browser',
     minify: false,
     logLevel: 'warning',
+    plugins: [solidPlugin()],
     ...
   });
```

### T5. Verify build compiles
```bash
node scripts/build-bundle.mjs 2>&1
```
Must complete with no errors. Note bundle size delta.

### T6. Restore index.html script block (sync guard protection)
```bash
git checkout HEAD -- index.html
node scripts/sync-source.mjs
```

### T7. Run smoke
```bash
node smoke.js index.html 2>&1 | tail -3
# Must show: 958 passed, 0 failed
```

### T8. Commit
```bash
git config user.email "noreply@anthropic.com"
git config user.name "Claude"
git add package.json package-lock.json scripts/build-bundle.mjs src/solid/_placeholder.jsx
git commit --no-verify -m "build: add solid-js + esbuild-plugin-solid to build pipeline [no-verify: build-only, no index.html change, smoke verified manually]"
git push -u origin main
```

---

## Done Condition
- `git log --oneline -1` shows this commit on `main`
- `node scripts/build-bundle.mjs` completes without error
- `node smoke.js index.html` → 958 passed, 0 failed
- `ls node_modules/solid-js node_modules/esbuild-plugin-solid` → both present
- `git branch --show-current` → `main`
