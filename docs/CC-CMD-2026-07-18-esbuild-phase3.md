# Claude Code Command — esbuild Phase 3: first real ES module extraction

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.** This is the first real code extraction — everything through Phase 2b changed only build/CI plumbing, never touched actual application logic structure. A mistake here can produce a runtime error smoke does not catch, in a way pipeline-only changes structurally could not.

---

## CONTEXT

Phase 2b (`870cf50`–`b4bf1ee`, live-verified `32b8b60`/`907b4b8` — real job logs directly confirmed, not assumed) made `src/legacy/field.js` the genuine edit target, with `index.html` as generated/synced output. Everything in `src/legacy/field.js` is still one 39,173-line file — nothing has been split into real modules yet.

**Per the original architectural discussion (relayed via chat), the safe extraction candidates are pure logic with no DOM dependencies** — utility functions, data transformation, stat calculators, API fetch helpers. Rendering functions were explicitly named as harder — deeply entangled with DOM elements, poll cycles, and implicit dependencies on scattered constants. Phase 3 should pick from the safe category, not the hard one, for a genuine first extraction.

**Do not assume which specific function(s) to extract without checking.** This CC-CMD's TASK 1 is to find a real, small, genuinely dependency-free candidate — not to extract something pre-selected without verification.

---

## PRE-BUILD PROBE BLOCK

```bash
# 1. Confirm HEAD, confirm Phase 2b's real state
git log --oneline -3
node -e "
const fs = require('fs');
const h = fs.readFileSync('index.html','utf8');
const s = h.lastIndexOf('<script>') + 8;
const e = h.indexOf('</script>', s);
console.log('byte-identical:', h.slice(s,e) === fs.readFileSync('src/legacy/field.js','utf8'));
"

# 2. Smoke baseline
node smoke.js index.html 2>&1 | tail -3

# 3. Confirm sync-source.mjs and pre-commit hook are intact
grep "sync-source" scripts/pre-commit
```

All 3 must pass before TASK 1.

---

## TASK 1 — Find a real, genuinely safe extraction candidate

Using the AST tooling already established this session (`web-tree-sitter` + `tree-sitter-javascript`), identify a real function or small cluster of functions in `src/legacy/field.js` that is:
- Pure logic — no `document.`, `window.` (except reading, not depending on load-order-sensitive globals), `addEventListener`, or DOM node references anywhere in its body
- Has a small, countable set of real callers (confirm via the same call-graph approach used earlier tonight — not assumed)
- Is not itself one of the 54 real `window.X =` top-level assignments already mapped (those have real boot-order dependencies already characterized; don't pick one of those for a first, low-risk extraction)

Report 2-3 real candidates with their real call-site counts and dependency profiles before picking one — do not extract the first thing found without comparing options.

## TASK 2 — Extract the chosen function(s) into a real module

Create `src/utils/{descriptive-name}.js` (or `src/sports/` if sport-specific — match the discussion's own proposed domain structure). Move the real function body there with a named export. In `src/legacy/field.js`, replace the original definition with an import from the new module, preserving the exact same global-scope callable name so every existing call site continues to work unmodified.

## TASK 3 — Real, forced verification

Confirm every real call site identified in TASK 1 still resolves correctly — a real functional test, not just "the import doesn't throw." If the function has existing smoke coverage, confirm those specific assertions still pass. If it doesn't have direct smoke coverage, note that honestly rather than treating silence as proof.

## TASK 4 — Full pipeline dry-run

`node scripts/sync-source.mjs && node smoke.js index.html` — must be 958/0 (re-confirm current baseline, it may have shifted). `node scripts/build-bundle.mjs` — confirm esbuild resolves the new `import` correctly and bundles it into the IIFE output without error.

## TASK 5 — Commit and real live verification

Commit through the normal path (letting the pre-commit hook sync and stage `index.html`). This will touch `index.html` and thus fire a real `deploy-gate.yml` run. Per the standard already established twice tonight: **check the real job/step logs directly after pushing, do not assume success from a clean local dry-run alone.** Confirm the live, deployed site still works via a real content check afterward.

---

## DONE CONDITION

One real, genuinely DOM-free function (or small cluster) is extracted into its own ES module under `src/`, imported cleanly, all real call sites continue working, full pipeline (sync → smoke → build → deploy) proven via a real, directly-observed live CI run — not just a local dry-run.

**Confidence scoring:**
- TASK 1 (25 pts): real candidates compared with real evidence, not the first plausible one picked
- TASK 2 (25 pts): clean extraction, exact same callable interface preserved
- TASK 3 (20 pts): real call-site verification, honest about coverage gaps if any exist
- TASK 4 (15 pts): full local pipeline dry-run clean
- TASK 5 (15 pts): real live CI run directly confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
