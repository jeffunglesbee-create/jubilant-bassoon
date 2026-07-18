# CC Session Doc — Module Script Scenario A
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**No field.js changes** — build script only

---

## Summary

Added `type="module"` to the bundled `<script>` tag in `build-bundle.mjs`. The IIFE wrapper in the bundle is unchanged — Scenario B (true ES module conversion) is separate, unauthorized work.

**Commit:** `7181061` — `feat: add type="module" to bundled script tag (Scenario A)`

---

## What Changed

**`scripts/build-bundle.mjs` — one line:**

```diff
-const result = html.slice(0, contentStart) + '\n' + warning + bundled + html.slice(scriptEnd);
+const result = html.slice(0, scriptStart) + '<script type="module">' + '\n' + warning + bundled + html.slice(scriptEnd);
```

`OPEN_TAG` (`'<script>'`) unchanged — still used for `lastIndexOf` searching; it correctly finds `<script type="module">` as a substring on subsequent runs. `contentStart` still used for the block-size sanity check. Only the result reconstruction changes.

`sync-source.mjs` — no change needed. Operates on source index.html (always `<script>`, never bundled), pre-commit only.

---

## Why v1 Failed (57/100), v2 Passed

v1 specified TASK 3 as "smoke against bundled output = 958/0." The bundled output has 382 pre-existing smoke failures (smoke.js designed for source, not esbuild IIFE). CI runs smoke on SOURCE before build-bundle, not after. v2 corrected the gate: source smoke = 958/0 (real CI gate); bundled = regression check (≤382).

---

## Verification

| Check | Result |
|-------|--------|
| Source smoke before | 958/0 ✓ |
| `sync-source.mjs` | ✓ |
| Source smoke after | 958/0 ✓ |
| `build-bundle.mjs` bundled | 576/382 (≤382 baseline, 0 new) ✓ |
| `<script type="module">` in bundle | count=1 ✓ |
| Source restored to 958/0 | ✓ |
| Pre-commit hook (smoke+units+lint) | ✓ |
| CI deploy-gate | success ✓ |
| CI Desktop Chrome Viewport Audit | success ✓ |
| CI Desktop Safari Viewport Audit | success ✓ |
| CI Smoke+Verify | success ✓ |
| Relay /health | 200 OK ✓ |
| `get_smoke_count` (895) | = assert() call sites in smoke.js source, not pass count; 958 local source smoke is the real gate ✓ |

**Confidence: 97/100**
- T1 (20/20): correct durable location in build-bundle.mjs
- T2 (25/25): source smoke 958/0 confirmed
- T3 (20/20): bundled regression 0 new failures, tag confirmed, source restored
- T4 (20/20): commit + push + all CI green
- T5 (12/15): relay /health 200; get_smoke_count clarified as assertion-count not pass-count; -3 for no direct live page HTML probe (no URL available in sandbox)

---

## No Carry-forwards

Scenario B (retiring the globalThis bridge, true ES modules) remains explicitly unauthorized. Nothing staged.
