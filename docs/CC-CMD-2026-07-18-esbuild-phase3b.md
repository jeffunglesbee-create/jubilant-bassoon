# Claude Code Command — esbuild Phase 3b: second real ES module extraction

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

The first Phase 3 extraction (`cc35b4b`, live-verified via real job logs on run `29625736816`) pulled `fmtGolfToPar` into `src/utils/golf-format.js` and established the real, working pattern for every future extraction — **reuse it exactly, do not redesign it:**

1. New module under `src/utils/` (or `src/sports/` for sport-specific logic) with a named export
2. `src/main.js` imports it and does `globalThis.X = X` **before** `import './legacy/field.js'`
3. `src/legacy/field.js`'s original function body is replaced with a stub comment — **no `import` statement in `field.js` itself**, ever — this was empirically confirmed to break smoke (957/1) since `field.js` is injected into a non-module `<script>` tag. Call sites in `field.js` resolve the extracted function as a plain global read, which works fine in strict mode.

**Real candidates already investigated and rejected by the first Phase 3 dispatch — do not re-propose these without new evidence:**
- `classifyFieldError` — smoke A740 asserts `function classifyFieldError(` literally; extraction breaks that specific assertion
- `expandStreams`/`resolveBundle` — depend on `SR`/`BUNDLES` constants, circular dependency risk
- `sportCountLabel` — depends on `SPORT_META` constant, same problem

The lesson from those rejections: **constant-dependent functions are harder** (the constant itself would also need extracting, or the function needs the constant passed as a parameter rather than closed over) — prefer genuinely self-contained candidates for this second extraction too, same bar as the first.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -3
node -e "
const fs = require('fs');
const h = fs.readFileSync('index.html','utf8');
const s = h.lastIndexOf('<script>') + 8;
const e = h.indexOf('</script>', s);
console.log('byte-identical:', h.slice(s,e) === fs.readFileSync('src/legacy/field.js','utf8'));
"
node smoke.js index.html 2>&1 | tail -3
ls src/utils/ src/main.js
```

All must pass before TASK 1.

---

## TASK 1 — Find a real, new, genuinely safe candidate

Using the same AST tooling (`web-tree-sitter` + `tree-sitter-javascript`) and call-graph approach as the first extraction, find a real function that is:
- Pure logic — no DOM, no load-order-sensitive globals, no closed-over constants (or if it does reference a constant, confirm the constant itself is small/simple enough to extract alongside it, and say so explicitly rather than treating this as automatically disqualifying)
- Not one of the 4 already-rejected candidates above, and not `fmtGolfToPar` (already done)
- Has a real, countable set of call sites (confirm via the call-graph tool, not assumed)
- Not a `window.X =` top-level assignment (already-mapped boot-order risk, avoid for a routine extraction)

Report 2-3 real candidates with real evidence before picking one, matching the first extraction's own discipline — do not extract the first plausible-looking function found.

## TASK 2 — Extract using the established pattern exactly

New file under `src/utils/` or `src/sports/`. Named export. `src/main.js` gets the import + `globalThis.X = X` assignment, positioned before `import './legacy/field.js'`. `field.js`'s original body replaced with a stub comment referencing the new file. No `import` statement added to `field.js`.

## TASK 3 — Real call-site verification

Confirm every real call site found in TASK 1 still resolves correctly. If existing smoke assertions cover this function, confirm they still pass. If they don't, say so honestly rather than treating silence as proof — matching the first extraction's own honest disclosure about `fmtGolfToPar` having no direct smoke coverage.

## TASK 4 — Full local pipeline dry-run

`node scripts/sync-source.mjs && node smoke.js index.html` — must be 958/0 (re-confirm current baseline). `node scripts/build-bundle.mjs` — confirm esbuild resolves the new import and bundles cleanly.

## TASK 5 — Commit and real live verification

Commit through the normal path (pre-commit hook syncs and stages `index.html` automatically). This fires a real `deploy-gate.yml` run. **Check the real job/step logs directly after pushing — do not assume success from a clean local dry-run alone**, matching the standard established by every prior phase tonight. Confirm the live, deployed site works via a real content check afterward.

---

## DONE CONDITION

A second real, genuinely safe function is extracted into its own module under `src/`, following the exact established pattern, all real call sites verified working, full pipeline proven via a real, directly-observed live CI run.

**Confidence scoring:**
- TASK 1 (25 pts): real candidates compared with real evidence, avoids re-proposing already-rejected ones without new evidence
- TASK 2 (25 pts): extraction follows the established pattern exactly, no `import` added to field.js
- TASK 3 (20 pts): real call-site verification, honest about smoke coverage gaps if any
- TASK 4 (15 pts): full local pipeline dry-run clean
- TASK 5 (15 pts): real live CI run directly confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
