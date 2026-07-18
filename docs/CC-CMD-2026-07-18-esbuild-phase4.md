# Claude Code Command — esbuild Phase 4: verify real tree-shaking behavior

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

**Real finding, checked directly before writing this: `scripts/build-bundle.mjs` already has `bundle: true`**, not `false` as Phase 2's own session doc described — it was necessarily changed once `src/main.js` gained real `import` statements, since `bundle: true` is what makes esbuild resolve `import './legacy/field.js'` into a single output at all. This means tree-shaking is likely already implicitly active, not something that needs to be newly enabled.

**But it has nothing to prove itself on yet.** All 19 functions extracted across Phase 3/3b/3c/3d/3e/3f/3-final are genuinely, directly used — each one's `globalThis.X = X` assignment in `main.js` is a real reference esbuild would correctly treat as "used," so there's no genuinely dead export anywhere in the current module set to verify gets dropped.

**A real, honest limitation, not fixable by this CC-CMD:** the original architectural discussion named `SR.mlspass` and similar orphaned constructs as tree-shaking's real payoff — but those still live inside `src/legacy/field.js`, the un-extracted 39,000-line monolith, which esbuild bundles as one opaque unit (a single `import` target, not a tree of real, analyzable exports). Tree-shaking cannot reach anything inside `field.js` until it's extracted into a real module with real, individually-exported pieces. This CC-CMD cannot close that gap — it can only prove the mechanism works correctly on what's already been extracted.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep "bundle:" scripts/build-bundle.mjs
node smoke.js index.html 2>&1 | tail -3
grep -h "^export function" src/utils/*.js 2>&1 | wc -l
```

---

## TASK 1 — Real, deliberate test: confirm tree-shaking genuinely drops an unused export

Add one genuinely unused export to a real, existing module (e.g., a trivial, clearly-dead function in `src/utils/golf-format.js` — not wired into `main.js`'s imports or `globalThis` assignments at all). Run `node scripts/build-bundle.mjs`. Confirm via direct inspection of the actual bundled output (`.build-tmp-output.js` before cleanup, or grep the injected result in `index.html` before reverting) whether the genuinely-unused function's body appears in the output or not. Real evidence either way — do not assume esbuild's default behavior without checking this specific configuration.

Revert the test addition afterward via a real commit, not left dangling.

## TASK 2 — Real accounting: what tree-shaking is actually protecting against right now

Given all 19 real exports are currently used, tree-shaking's current, real value is protective, not corrective — it guards against a *future* extraction leaving a stale, unused export behind (the exact `SR.mlspass`-style drift the original architectural discussion was concerned about) rather than cleaning up anything that exists today. State this plainly in the outbox rather than implying Phase 4 accomplished a cleanup it structurally couldn't have.

## TASK 3 — Confirm the deployed bundle size reflects this correctly

Compare the real, current bundled output size against what it would be with the TASK 1 test addition included (before revert) — a real, measured confirmation that the unused function's real byte weight is genuinely absent from what ships, not just log output claiming success.

## TASK 4 — Honest recommendation on next steps

Given tree-shaking is confirmed working but currently has nothing real to clean up, and given the original discussion's actual payoff (orphaned constructs like `SR.mlspass`) requires those specific things to be extracted first — is domain consolidation (grouping the 13 existing modules) or further individual extraction (reaching into `field.js` for more candidates, including the harder constant-dependent ones now, with real, separate authorization) the more valuable real next step? Real reasoning, not a default answer.

---

## DONE CONDITION

Tree-shaking's real, current behavior is directly confirmed (not assumed) via a genuine test — an unused export added, built, confirmed absent from the real bundled output, then cleanly reverted. An honest accounting of what this mechanism currently protects against versus what it can't yet reach.

**Confidence scoring:**
- TASK 1 (40 pts): real, deliberate test with real evidence of the actual bundled output, not inferred from esbuild's documented defaults
- TASK 2 (20 pts): honest framing — protective, not corrective, given current state
- TASK 3 (20 pts): real, measured byte-size comparison
- TASK 4 (20 pts): real, evidence-based recommendation for next steps

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
