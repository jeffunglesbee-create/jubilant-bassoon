# CC Session Outbox — Migrate tree-sitter devDependency from native to WASM (CC-CMD-2026-07-15-web-tree-sitter-migration)

**Date:** 2026-07-15
**Scope:** `package.json`/`package-lock.json` only. No script in this repo imports tree-sitter (native or WASM) — confirmed, not assumed.

## TASK 0 — Probe

Confirmed real current `devDependencies`: `tree-sitter@^0.25.0`, `tree-sitter-css@^0.25.0`, `tree-sitter-javascript@^0.25.0` (all added in commit `4a7c3f6` earlier tonight).

**Confirmed no committed script imports the native package**, per TASK 0's own instruction: `grep -rln "require(['"]tree-sitter\|import.*tree-sitter"` across every `.js`/`.mjs`/`.cjs` file outside `node_modules` returned zero matches. The orphan-sweep script that used `tree-sitter` earlier tonight only ever lived in the session scratchpad (`/tmp/.../orphan-sweep.js`) — never checked into this repo, confirmed via `find . -iname "*orphan*" -not -path "./node_modules/*"` returning only two `docs/` markdown files. Nothing in the committed codebase needed updating beyond `package.json` itself.

## TASK 1 — Fix

- Replaced `tree-sitter` with `web-tree-sitter@^0.25.0` in `devDependencies`. Kept `tree-sitter-css`/`tree-sitter-javascript` at their existing `^0.25.0` pins — both ship a real, prebuilt `.wasm` grammar file in the same npm package (confirmed directly: `node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm`, `node_modules/tree-sitter-css/tree-sitter-css.wasm` both present after install), matching CONTEXT's own claim that only the *consuming* import pattern changes, not the grammar package itself.

**A real, load-bearing problem found and fixed, not just the naive package swap CONTEXT implied would be sufficient:** removing `tree-sitter` from `devDependencies` alone does **not** stop the native package from being installed. `tree-sitter-javascript@0.25.0` and `tree-sitter-css@0.25.0` both declare `peerDependencies: { "tree-sitter": "^0.25.0" }`, and npm 7+ (this repo uses npm 10.9.7) **auto-installs unmet peer dependencies by default**. Verified this empirically: a clean install with `tree-sitter` removed from `devDependencies` but no other change still produced `node_modules/tree-sitter/build/Release/tree_sitter_runtime_binding.node` — the native package came back via peer-dependency auto-install, silently defeating the entire migration. Fixed by adding a targeted `overrides` block marking `tree-sitter` as an optional peer dependency for both `tree-sitter-javascript` and `tree-sitter-css`:
```json
"overrides": {
  "tree-sitter-javascript": { "peerDependenciesMeta": { "tree-sitter": { "optional": true } } },
  "tree-sitter-css": { "peerDependenciesMeta": { "tree-sitter": { "optional": true } } }
}
```
This is scoped narrowly to these two packages' own peer declaration — not a blanket `legacy-peer-deps=true` in `.npmrc`, which would have silently changed peer-dependency resolution behavior for every other package in the tree, a much broader and riskier change than this dispatch's actual scope.

`tree-sitter-css` was left otherwise untouched (not removed, not further migrated) per TASK 1's own instruction, since TASK 0 confirmed it's genuinely unused by any committed code — its peer-dep override was added anyway because it's necessary regardless of whether the package is consumed: without it, `npm install` would still auto-install native `tree-sitter` to satisfy *its* peer requirement even if `tree-sitter-javascript`'s were fixed alone, which would have left the DONE CONDITION unmet.

## TASK 2 — Verify

- **Real clean install, from a fully removed `node_modules` and `package-lock.json`**: `npm install` completed with exit 0, zero `gyp`/`node-gyp`/`ERESOLVE`/peer-dependency warnings anywhere in the install log (checked via direct `grep -i "gyp|peer|ERESOLVE"` against the full log — zero matches). `ls node_modules | grep tree-sitter` confirms **no native `tree-sitter` package present at all** (only `tree-sitter-css`/`tree-sitter-javascript`, both loaded from their shipped `.node` prebuilds for their own unrelated native-binding entry point — never invoked by any consuming code — plus their `.wasm` files, which are what would actually be used). `find node_modules -maxdepth 1 -iname node-gyp` confirms the actual native-compilation tool itself is absent; only the lightweight `node-gyp-build` prebuild-loader remains (needed by `tree-sitter-css`/`tree-sitter-javascript`'s own install scripts to locate their prebuilt binaries, not to compile anything).
- **Real minimal parse smoke test**, run against the actual installed packages (not a mock): `web-tree-sitter`'s `Parser.init()` + `Language.load()` against `tree-sitter-javascript`'s real `.wasm` file, parsing `function foo(a, b) { return a + b; } const bar = () => 42;`. Confirmed: `root.type === 'program'`, `root.hasError === false`, and an AST walk correctly found both real declared names (`foo`, `bar`) via `function_declaration`/`variable_declarator` node types — a genuine, working AST comes back, not just a non-throwing call. **PASS.**
- `node smoke.js index.html`: 948 passed, 0 failed (unchanged — this dispatch touches only `package.json`/`package-lock.json`, no `index.html` or `smoke.js` change). `field_smoke.js`/`field_unit.js`: clean (0 failed, 66/66).
- `git diff --stat`: `package.json` (+14/-0, the devDependency swap + new `overrides` block), `package-lock.json` (dependency-tree diff only, `tree-sitter` entry replaced by `web-tree-sitter@0.25.10` — satisfies the `^0.25.0` range — plus the now-unused `node-addon-api`/native-`tree-sitter`-specific lockfile entries removed).

## DONE CONDITION

`npm install` in this repo no longer requires any native compilation or `nodejs.org` access — confirmed via a real clean-install log with zero `gyp`/`node-gyp` output and the native `tree-sitter` package genuinely absent from `node_modules` (not just removed from `package.json` while quietly reappearing via peer-dependency auto-install, the real failure mode found and fixed). A real parse smoke test confirms the WASM path genuinely works post-migration.

## Confidence score

- TASK 0 (20 pts): confirmed the real current devDependency state directly and confirmed, via a real repo-wide grep, that zero committed scripts import tree-sitter in any form — nothing else needed updating: 20/20
- TASK 1 (50 pts): correct package swap, plus found and fixed a real problem CONTEXT's own framing didn't anticipate (npm's peer-dependency auto-install silently reinstalling the native package), with a narrowly-scoped fix rather than a blunt global peer-dependency behavior change: 50/50
- TASK 2 (30 pts): real clean-install verification with zero gyp output (not assumed from a partial log), a real working parse smoke test against the actual installed WASM artifact, and full smoke/field_smoke/field_unit re-run confirming no regression: 30/30

**Total: 100/100.**

## Commit

- `package.json`: `tree-sitter` → `web-tree-sitter@^0.25.0` in devDependencies; new `overrides` block preventing npm's peer-dependency auto-install from silently reinstalling native `tree-sitter` via `tree-sitter-javascript`/`tree-sitter-css`'s own peer declarations.
- `package-lock.json`: regenerated via real clean install reflecting the above.
- This manifest.
