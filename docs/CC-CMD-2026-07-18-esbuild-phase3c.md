# Claude Code Command — esbuild Phase 3c: third real ES module extraction

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

Two real extractions done: `fmtGolfToPar` (Phase 3, `src/utils/golf-format.js`) and `fieldTierRank`/`fieldTierLabel` (Phase 3b, `src/utils/tier.js`). Reuse the established pattern exactly — do not redesign it:

1. New module under `src/utils/` or `src/sports/`, named exports
2. `src/main.js`: import + `globalThis.X = X` before `import './legacy/field.js'`
3. `src/legacy/field.js`: original body replaced with a stub comment, **no `import` statement in field.js itself** — confirmed necessary since field.js is injected into a non-module `<script>` tag

**Already-rejected candidates across both prior extractions — do not re-propose without new evidence:**
- `classifyFieldError` — smoke A740 asserts the literal function signature string
- `expandStreams`/`resolveBundle` — depend on `SR`/`BUNDLES` constants (circular dependency)
- `sportCountLabel` — depends on `SPORT_META` constant
- `stripMarkdown` — smoke A321 asserts the literal function signature string
- `teamNick`/`_multiWordNicks` — smoke A562/A600 assert string content of the dict entries themselves, which extraction would remove from index.html

The pattern in the rejections so far: functions whose exact source text (not just behavior) is directly asserted by smoke are not safe candidates without also updating those specific assertions — which is real, separate scope, not something to fold into a routine extraction. Prefer functions with zero smoke coverage by name, matching both prior successful extractions.

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
ls src/utils/
```

---

## TASK 1 — Find a real, new, genuinely safe candidate

Same discipline as both prior extractions: AST + call-graph tooling, not text search alone. Report 2-3 real candidates with real evidence (call-site counts, zero smoke-name-coverage confirmed via grep, no external constant dependencies or an honest note if one exists and why it's still safe) before picking one.

## TASK 2 — Extract using the established pattern exactly

Same structure as Phase 3/3b. No deviation.

## TASK 3 — Real call-site verification

Same standard as both prior extractions — honest disclosure of any smoke coverage gap, not treated as a blocker but not hidden either.

## TASK 4 — Full local pipeline dry-run

`sync-source.mjs` → smoke (958/0, re-confirm current count) → `build-bundle.mjs` clean.

## TASK 5 — Real live verification

Commit through the normal path, confirm the real `deploy-gate.yml` run via actual job logs, confirm live site content post-deploy — same standard as every phase before this one.

---

## DONE CONDITION

A third real, genuinely safe function (or small natural cluster, matching Phase 3b's tier.js precedent) extracted, verified via real job logs and live content check.

**Confidence scoring:**
- TASK 1 (25 pts): real candidates compared, avoids all 5 already-rejected ones without new evidence
- TASK 2 (25 pts): established pattern followed exactly
- TASK 3 (20 pts): real call-site verification, honest about coverage gaps
- TASK 4 (15 pts): full local pipeline dry-run clean
- TASK 5 (15 pts): real live CI run confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
