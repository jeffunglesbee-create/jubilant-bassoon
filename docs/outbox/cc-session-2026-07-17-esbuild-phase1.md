# CC Session — esbuild Phase 1 implementation
**Date:** 2026-07-17
**Repo:** jeffunglesbee-create/jubilant-bassoon
**HEAD start:** 311cc9b
**HEAD end:** a288a77
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** unchanged (2026-07-17b — no deploy-triggering content change in this session; CI will bump on next index.html push)

---

## Commits

| Hash | Message |
|------|---------|
| `6be08e9` | fix: replace typeof SW_VERSION guards with window.SW_VERSION reads |
| `b08a910` | feat: add scripts/build-bundle.mjs — Phase 1 esbuild IIFE wrapper |
| `a288a77` | ci: add esbuild build step to deploy-gate.yml (Phase 1) |

---

## What was done

### 1. SW_VERSION scope conflict fixed (6be08e9)

Six `typeof SW_VERSION !== 'undefined' ? SW_VERSION : X` guards in index.html were replaced with `window.SW_VERSION || X`:

| Line | Variable | Fallback |
|------|----------|---------|
| L5145 | `SW` | `'?'` |
| L29635 | `swV` | `''` |
| L33255 | `_swv` | `'0'` |
| L40934 | `_owlQueueSwV` | `'0'` |
| L43346 | `_owlSwV` | `'0'` |
| L43474 | `_owlQueueSwV2` | `'0'` |

**Root cause:** These guards existed because all six functions fire before `const SW_VERSION = '...'` at L25566. Inside esbuild's IIFE scope, both the `typeof` guards and the `const` declaration were in the same scope, causing esbuild to rename `const SW_VERSION` → `SW_VERSION2` to avoid conflict. This made every `typeof SW_VERSION` guard read an undeclared name, evaluating to `'undefined'` and returning the fallback at runtime in the bundle.

**Fix correctness:** `window.SW_VERSION` is assigned at L25567 (`window.SW_VERSION = SW_VERSION`) which runs at parse time — before any of these functions are ever called. Runtime behavior is identical to the original guards. esbuild no longer sees a scope conflict.

### 2. scripts/build-bundle.mjs created (b08a910)

Extracts the `<script>` block from index.html, runs esbuild (IIFE format, `bundle: false`, no minification), re-injects bundle in-place. Cleans up temp files. Same in-place transform pattern as `scripts/strip-comments.js`.

### 3. deploy-gate.yml updated (a288a77)

Pipeline is now:

```
Checkout
→ Sync SW_VERSION
→ Commit SW_VERSION sync
→ Fast smoke (node smoke.js index.html)   ← runs against SOURCE
→ Build esbuild bundle (node scripts/build-bundle.mjs)  ← NEW
→ Strip comments (node scripts/strip-comments.js)
→ Wrangler deploy
→ Confirm
```

Smoke runs against SOURCE before the build step. The 382 bundle-vs-smoke failures are eliminated by architecture: smoke never sees the bundle.

`npm ci --prefer-offline` in the build step ensures esbuild (devDependency since 311cc9b) is available in the CI environment.

---

## Verification

- `node smoke.js index.html` before commit: **958/0** ✅
- Pre-commit hook passed on all 3 commits (smoke + units + lint) ✅
- All 3 commits on `main`, not a feature branch ✅

---

## Integration status

- **VERIFIED locally:** SW_VERSION guards replaced, smoke 958/0 on source
- **STAGED / CI-only verification:** esbuild build step runs in CI (deploy-gate.yml) — will be exercised on next index.html push that triggers a deploy. The dry-run from the prior session (311cc9b) confirmed esbuild 0.28.1 parses the 39,172-line script without errors.

---

## Carry-forwards / open items

None deferred. The following items remain on the priority queue from prior sessions:

- **MLS (target July 19-20):** Apple TV label fix, `statistics/players` and `statistics/clubs` data on MLS game cards
- **Drive auto-deploy standing risk:** If `DRIVE_FILE_ID` secret is ever added, `field-autodeploy.yml` would push raw source to main bypassing the build step. Documented in `cc-esbuild-migration-verification-2026-07-17.md`. No action needed until secret is added.
- **9 duplicate-key warnings** surfaced by esbuild: `ROCKIES_TV`, `TIGERS_DSN`, `Wolverhampton Wanderers`, `ac milan`, `Red Bull Arena`, `America First Field`, 3 others. Pre-existing in source, not migration blockers.
