# Claude Code Command — esbuild Phase 3d: fourth real ES module extraction

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

**Real dependency note: Phase 3c (`docs/CC-CMD-2026-07-18-esbuild-phase3c.md`) may or may not have executed yet by the time this runs — check, don't assume either way.** If it has, read its real outbox first and treat whatever it extracted as a third already-rejected-by-precedent zone (its own function names, once known, join the exclusion list below). If it hasn't executed yet, proceed using only the 5 candidates already known-rejected from Phase 3/3b.

Reuse the established extraction pattern exactly — do not redesign it:
1. New module under `src/utils/` or `src/sports/`, named exports
2. `src/main.js`: import + `globalThis.X = X` before `import './legacy/field.js'`
3. `src/legacy/field.js`: original body replaced with a stub comment, no `import` statement in field.js itself

**Already-rejected candidates, confirmed across Phase 3 + 3b — do not re-propose without new evidence:**
- `classifyFieldError` — smoke A740 asserts the literal function signature string
- `expandStreams`/`resolveBundle` — depend on `SR`/`BUNDLES` constants
- `sportCountLabel` — depends on `SPORT_META` constant
- `stripMarkdown` — smoke A321 asserts the literal function signature string
- `teamNick`/`_multiWordNicks` — smoke A562/A600 assert the dict's own string content

**Real, current extraction inventory — check this fresh, it will have grown:** `fmtGolfToPar` (Phase 3), `fieldTierRank`/`fieldTierLabel` (Phase 3b), plus whatever Phase 3c added if it's landed. Don't re-extract anything already done.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
find src/utils src/sports -name "*.js" 2>&1
grep -h "^export function" src/utils/*.js src/sports/*.js 2>&1
node -e "
const fs = require('fs');
const h = fs.readFileSync('index.html','utf8');
const s = h.lastIndexOf('<script>') + 8;
const e = h.indexOf('</script>', s);
console.log('byte-identical:', h.slice(s,e) === fs.readFileSync('src/legacy/field.js','utf8'));
"
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Find a real, new, genuinely safe candidate

Same discipline as all three prior extractions: AST + call-graph tooling. Report 2-3 real candidates with real evidence before picking one. Explicitly cross-check against the real, current extraction inventory from the probe block (not just this doc's own list) to avoid re-proposing anything Phase 3c may have already claimed.

## TASK 2 — Extract using the established pattern exactly

## TASK 3 — Real call-site verification

## TASK 4 — Full local pipeline dry-run

`sync-source.mjs` → smoke (958/0, re-confirm current count) → `build-bundle.mjs` clean.

## TASK 5 — Real live verification

Real `deploy-gate.yml` job logs directly confirmed, real live content check post-deploy.

---

## DONE CONDITION

A fourth real, genuinely safe function (or small natural cluster) extracted, verified via real job logs and live content check.

**Confidence scoring:**
- TASK 1 (25 pts): real candidates compared, avoids all already-rejected/already-extracted functions including anything Phase 3c added
- TASK 2 (25 pts): established pattern followed exactly
- TASK 3 (20 pts): real call-site verification, honest about coverage gaps
- TASK 4 (15 pts): full local pipeline dry-run clean
- TASK 5 (15 pts): real live CI run confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
