# CC Session — esbuild Phase 3: first real ES module extraction
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Session start HEAD:** b4bf1ee (Phase 2b complete)
**Session end HEAD:** cc35b4b (after CI sync-back: a1782a2)
**Smoke start:** 958/0
**Smoke end:** 958/0 (confirmed locally + CI)
**SW_VERSION bump:** none (no trigger-path change; fmtGolfToPar is pure utility)

---

## Commits this session

| SHA | Message |
|-----|---------|
| `cc35b4b` | feat: extract fmtGolfToPar into src/utils/golf-format.js (Phase 3) |

(CI sync-back: `fb7c725` codemap refresh, `a1782a2` ci: update current state — both [skip ci])

---

## What was done

### TASK 1 — Candidate selection
Confirmed `fmtGolfToPar` as extraction candidate via direct grep + AST inspection:
- 5-line pure function: `if (v == null || !Number.isFinite(v)) return ''; if (v === 0) return 'E'; return (v > 0 ? '+' : '') + v;`
- Zero external dependencies (no DOM, no window, no constants)
- 3 real call sites: L12095 (direct), L12395, L12421 (both with typeof guard — original code)
- Not in smoke (no assertion checks for `function fmtGolfToPar(`)
- Not a `window.X =` assignment — safe from boot-order concerns

Rejected candidates:
- `classifyFieldError`: smoke A740 asserts `function classifyFieldError(` literally — extraction would break smoke
- `expandStreams`/`resolveBundle`: depend on `SR`/`BUNDLES` constants — circular dependency
- `sportCountLabel`: depends on `SPORT_META` constant — same problem

### TASK 2 — Extraction

**Architecture constraint discovered mid-attempt:** `src/legacy/field.js` cannot contain `import` statements. `sync-source.mjs` copies field.js verbatim into `index.html`'s non-module `<script>` tag. An `import` there is invalid JS syntax — smoke's "JavaScript syntax valid" check fails. First extraction attempt confirmed this empirically (957/1 FAILED).

**Correct architecture:** imports live in `src/main.js`, not `field.js`. Extracted utilities are exposed on `globalThis` before field.js runs in the IIFE — global reads work fine in strict mode, so field.js call sites resolve correctly at runtime.

Files changed:
- `src/utils/golf-format.js` (new): `export function fmtGolfToPar(v) { ... }` — 5 lines, named export
- `src/legacy/field.js`: function body replaced with `// fmtGolfToPar extracted to src/utils/golf-format.js (Phase 3).`
- `src/main.js`: added `import { fmtGolfToPar } from './utils/golf-format.js'; globalThis.fmtGolfToPar = fmtGolfToPar;` before `import './legacy/field.js';`

### TASK 3 — Call-site verification

All 3 call sites verified:
- L12095: `const v = fmtGolfToPar(cut.value);` — direct call, resolves via globalThis
- L12395: `(typeof fmtGolfToPar === 'function') ? fmtGolfToPar(cut.value) : String(cut.value)` — typeof guard was original code; passes with globalThis.fmtGolfToPar set
- L12421: `(typeof fmtGolfToPar === 'function') ? fmtGolfToPar(tp) : String(tp)` — same

No existing smoke assertions directly test fmtGolfToPar's output (field_unit.js coverage gap — honest disclosure, not a blocker).

### TASK 4 — Local pipeline dry-run

```
✅ sync-source: src/legacy/field.js (2123 KB) → index.html script block
── Results: 958 passed, 0 failed ──────────────
✅ build-bundle: esbuild IIFE (1599 KB) injected into index.html
```

### TASK 5 — Live CI verification

Deploy-gate run `29625736816` against `cc35b4b`:
- Step 3 "Sync SW_VERSION" ✅
- Step 5 "Fast smoke (smoke.js only)" ✅
- Step 6 "Build esbuild bundle" ✅ — `build-bundle: esbuild IIFE (1599 KB) injected into index.html`
- Step 7 "Strip comments for deploy" ✅ — 996 comments stripped, 1807 KB deploy artifact
- Step 8 "Deploy to Cloudflare Workers" ✅ — `index.html` uploaded, Version ID `734f9493-abe9-446e-bfd5-d79815505e86`
- Step 9 "Confirm" ✅ — `✅ Deployed cc35b4baa4058568daabb89f98d6090cb76bded1`

---

## Architecture note for future extractions

Every future extraction from `src/legacy/field.js` must follow the same pattern:
1. New module under `src/utils/` (or `src/sports/` for sport-specific) with named export
2. `src/main.js` imports it and assigns to `globalThis.X = X` before `import './legacy/field.js'`
3. `src/legacy/field.js` function body replaced with stub comment — NO import statement in field.js
4. Call sites in field.js continue to work as global reads (valid in strict mode)

This pattern is necessary until `index.html` is updated to use `<script type="module">` — at that point the globalThis workaround can be retired and proper ES module imports used throughout.

---

## Open carry-forwards

None introduced. Pre-existing carry-forwards unchanged (5 Amnesty Zone CC-CMDs on hold, MLS work, journalism unverified gaps).
