# CC Session — esbuild Phase 2: src/ structure
**Date:** 2026-07-17
**Repo:** jeffunglesbee-create/jubilant-bassoon
**HEAD start:** 729d7d2
**HEAD end:** 5be678c
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** unchanged (no index.html content change — no deploy triggered)

---

## Commits

| Hash | Message |
|------|---------|
| `f2dfda2` | feat: add src/legacy/field.js + src/main.js — Phase 2 esbuild src/ structure [skip ci] |
| `6bcacc6` | fix: build-bundle.mjs — use src/main.js entry point, fix wrong-script-block bug [skip ci] |
| `5be678c` | chore: exclude src/ from Cloudflare asset upload in .assetsignore [skip ci] |

---

## What was done

### Pre-build probe finding: wrong-script-block bug discovered

Probe 6 revealed two `<script>` blocks in index.html:
- script #0: line 4108, 16,426 chars (small utility script)
- script #1: line 4895, 2,173,754 chars (main app — the one that matters)

`build-bundle.mjs` (Phase 1) used `html.indexOf('<script>')` which found script #0 — the wrong block. This bug had not yet fired in CI (the build step was added in `a288a77` which doesn't touch trigger paths, so no deploy ran with the buggy script). Fixed in `6bcacc6`.

### src/legacy/field.js (f2dfda2)

`src/legacy/field.js` — 39,173 lines extracted from the main app `<script>` block (using `lastIndexOf` to target the correct block). This is the same content that `build-bundle.mjs` was extracting into a temp file at build time; it is now a persistent, committed file. index.html remains the source of truth for smoke — `src/legacy/field.js` is derived from it. Source-of-truth inversion (Phase 2b) requires separate authorization.

### src/main.js (f2dfda2)

Single-line esbuild entry point: `import './legacy/field.js'`. No other content.

### build-bundle.mjs rewritten (6bcacc6)

Two changes:
1. **Entry point**: from temp-file extraction of inline HTML → `src/main.js`. esbuild now resolves the import and bundles `src/legacy/field.js` directly.
2. **Injection fix**: `lastIndexOf('<script>')` replaces `indexOf('<script>')`. Added a 1MB sanity-check guard: if the located block is under 1MB, the script throws rather than silently corrupting the wrong block.

Build verified: 1,599 KB IIFE, 9 pre-existing duplicate-key warnings (same as Phase 1 verification), 0 errors.

### .assetsignore (5be678c)

`src` added — prevents `src/legacy/field.js` (39K lines, ~2MB) and `src/main.js` from being uploaded to Cloudflare as public assets.

---

## Verification

- Dry-run: `node scripts/build-bundle.mjs` → 1,599 KB IIFE, 0 errors ✅
- `git stash` → `node smoke.js index.html` → 958/0 ✅
- Done-condition probe: all four checks pass ✅
- All commits on `main` ✅
- No deploy triggered (`[skip ci]` on all three commits; none touch trigger paths anyway) ✅

---

## Integration status

- **VERIFIED locally:** src/ structure created, build-bundle.mjs correct, smoke 958/0
- **CI verification:** will run on next index.html push (deploy-gate.yml smoke → build-bundle → strip-comments → wrangler). The wrong-script-block bug is fixed before that can happen.

---

## What Phase 2 did NOT do (per spec)

- Did not extract any functions/constants from src/legacy/field.js into modules
- Did not change index.html's inline script content (index.html is still source of truth)
- Did not invert source-of-truth (src/legacy/field.js is still derived)
- Did not change the deploy pipeline

---

## Carry-forwards

- **Phase 2b (requires explicit authorization):** Invert source-of-truth — src/legacy/field.js becomes primary, index.html is assembled from it at build time. Smoke would then run against src/legacy/field.js directly.
- **Phase 3 (requires explicit authorization):** Extract first real ES modules from src/legacy/field.js into src/utils/ or src/sports/. Each extraction is a separate scoped CC-CMD.
- **9 duplicate-key warnings:** Pre-existing in source (ROCKIES_TV, TIGERS_DSN, Wolverhampton Wanderers, ac milan, Red Bull Arena Harrison NJ, America First Field Sandy UT, Children's Mercy Park KC, Snapdragon Stadium SD, Stade Saputo Montreal). Not migration blockers, worth a cleanup pass.
