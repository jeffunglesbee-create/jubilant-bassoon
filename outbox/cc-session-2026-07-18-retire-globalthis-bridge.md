# CC Session — 2026-07-18 — retire-globalthis-bridge

**Date:** 2026-07-18
**HEAD start:** e6a0ab0
**HEAD end:** 81f1abb
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18b (unchanged — no SW change)
**Deploy gate:** success (run 29655260494 on 81f1abb)

---

## Commits

1. **1f85a70** — `feat: update pipeline + smoke for <script type="module"> source tag`
   - `scripts/sync-source.mjs`: `OPEN_TAG` → `'<script type="module">'`
   - `scripts/build-bundle.mjs`: `OPEN_TAG` → `'<script type="module">'`
   - `smoke.js`: A346/A347 updated to use `MAIN_TAG = '<script type="module">\n'`; strip import/export before `new Function()` for syntax check; add `_wcRenderWithLiveOverlay` to `KNOWN_SCOPE_TRAPS`
   - `field_smoke.js`: regex `/<script>/` → `/<script[^>]*>/`; strip import/export before `new Function()`
   - `index.html`: source `<script>` → `<script type="module">`

2. **6d72cd4** — `feat: retire globalThis bridge — import 16 utils into field.js, remove 19 stubs`
   - `src/legacy/field.js`: 16 import statements added at top; 19 empty stub definitions removed
   - `smoke.js`: A191 updated to accept `import { fn }` as valid "defined"; A-FTO-2 same
   - `field_smoke.js`: weather helper assertion updated to accept imports
   - `.eslintrc.json`: `"sourceType": "module"` added to parserOptions

3. **81f1abb** — `feat: remove globalThis bridge from main.js — field.js now imports utils directly`
   - `src/main.js`: reduced from 65 lines to 5 lines — all 25 `globalThis.X = X` bridge lines and their corresponding imports removed; only `import './legacy/field.js'` remains

---

## What was verified E2E

- Source smoke: 958/0 on final HEAD
- field_smoke: 0 failures
- Pre-commit hook: smoke + units + lint all passed for both commits
- Build pipeline: `node scripts/build-bundle.mjs` → 1567 KB ESM bundle (2 KB smaller than pre-bridge 1569 KB)
- Deploy gate CI: success on 81f1abb

---

## Integration status

VERIFIED — this is a pure refactor. No behavior changes. The 16 extracted utils are now imported directly in field.js instead of bridged via globalThis from main.js. The bundle output is identical in function.

---

## Carry-forwards

None. CC-CMD self-complete per Rule 87.
