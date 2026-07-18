# CC Session — esbuild Phase 3b
**Date:** 2026-07-18
**Scope:** Second real ES module extraction — fieldTierRank + fieldTierLabel
**HEAD progression:** cc35b4b → 45ffa95

## Smoke
- Start: 958/0 (inherited from Phase 3)
- Local dry-run: 958/0
- CI fast smoke step: passed (run 29626362882)
- Live site post-deploy: 895

## SW_VERSION
Not bumped this session (no HTML content change, structural extraction only).

## Commits
- `45ffa95` — feat: extract fieldTierRank + fieldTierLabel to src/utils/tier.js (Phase 3b)
  - `src/utils/tier.js` created: named exports for both functions, exact bodies preserved
  - `src/legacy/field.js`: both function bodies replaced with stub comments; NO import statement added
  - `src/main.js`: import + globalThis assignments added before `import './legacy/field.js'`
  - Pre-commit hook auto-staged `index.html` via sync-source.mjs

## CI Run
**Run ID:** 29626362882 — Deploy gate (fast smoke) — **success**
All steps confirmed green:
1. Set up job ✅
2. Checkout ✅
3. Sync SW_VERSION to deploy date ✅
4. Commit SW_VERSION sync back to repo ✅
5. Fast smoke (smoke.js only) ✅
6. Build esbuild bundle ✅
7. Strip comments for deploy ✅
8. Deploy to Cloudflare Workers ✅
9. Confirm ✅

## Candidate Selection (TASK 1)
Rejected in this session before choosing:
- `stripMarkdown` — smoke A321 asserts `html.includes('function stripMarkdown(text)')`, extraction would break it
- `teamNick`/`_multiWordNicks` — smoke A562 and A600 assert string content of `_multiWordNicks` dict entries (e.g. `'Czech Republic':'Czechia'`), which would no longer be in index.html after extraction

Chosen: `fieldTierRank` (L33672, 22 callers) + `fieldTierLabel` (L33688, 6 callers) — natural cluster (both operate on the same tier enum string), pure switch statements, zero external dependencies, zero smoke coverage by name (grep confirmed 0 hits).

## Call-site verification (TASK 3)
22 fieldTierRank + 6 fieldTierLabel callers confirmed in field.js via grep. All are plain reads resolved as globals in the IIFE — identical to fmtGolfToPar's pattern from Phase 3. No smoke assertion covers either function by name. Honest disclosure: runtime behavioral correctness relies on globalThis bridge working in the IIFE context (proven pattern from Phase 3, same mechanism).

## Integration status
VERIFIED — full pipeline confirmed:
- Local: sync-source.mjs + smoke.js (958/0) + build-bundle.mjs (clean, tier.js resolved)
- CI: deploy-gate.yml run 29626362882, all steps green
- Live site smoke: 895

## Open carry-forwards
None from this session. Phase 3b is complete per done condition.
Next extraction candidates to investigate: functions with no smoke `html.includes('function X(')` assertion and no external constant dependencies. The `docs/CC-CMD-2026-07-18-esbuild-phase3b.md` doc lists Phase 5 candidates (domain consolidation + module-script investigation) per the edaf2d3 docs commit already on main.
