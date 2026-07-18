# Claude Code Command — Domain consolidation of extracted src/ modules

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

Phase 3/3b extracted individual functions one at a time (`fmtGolfToPar` → `src/utils/golf-format.js`, plus whatever Phase 3b just extracted) — each into its own small, single-purpose file. The original architectural discussion (relayed via chat) envisioned real domain zones — `journalism/`, `relay/`, `render/`-style groupings — rather than one tiny file per function indefinitely.

**Do not force consolidation before there's real material to consolidate.** Check the actual current count and grouping of extracted modules first — if there are only 1-2 functions total, or they don't naturally cluster into a real domain, say so honestly and stop rather than manufacturing an artificial grouping.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
ls -R src/utils src/sports 2>&1
node smoke.js index.html 2>&1 | tail -3
node -e "
const fs = require('fs');
const h = fs.readFileSync('index.html','utf8');
const s = h.lastIndexOf('<script>') + 8;
const e = h.indexOf('</script>', s);
console.log('byte-identical:', h.slice(s,e) === fs.readFileSync('src/legacy/field.js','utf8'));
"
```

---

## TASK 1 — Real inventory of what actually exists to consolidate

List every function extracted so far (Phase 3 + Phase 3b, and any others that landed between this CC-CMD being written and executed — re-check, don't rely on this doc's own memory of what existed at write time). For each: which file it's in, what real domain it belongs to (golf formatting, date/time utilities, whatever the real functions turn out to be — don't assume golf-specific groupings exist if they don't).

**If fewer than 3 real functions exist across fewer than 2 natural domain groups: stop here, report this honestly, and do not proceed to TASK 2.** Consolidating 1-2 files into a "domain" folder with nothing else in it isn't meaningfully better than what already exists — this needs real material, not a premature reorganization.

## TASK 2 — Consolidate into real domain files (only if TASK 1 finds genuine material)

For each real domain with 2+ extracted functions, create a single consolidated file (e.g., `src/utils/golf.js` absorbing what was split across single-function files) with multiple named exports. Update `src/main.js`'s imports and `globalThis` assignments to match. Remove the now-redundant single-function files.

## TASK 3 — Real verification

All existing call sites (in `field.js`) continue resolving correctly via the same `globalThis` pattern. Full pipeline dry-run: `sync-source.mjs` → smoke (958/0, re-confirm current count) → `build-bundle.mjs`.

## TASK 4 — Real live verification

Commit through the normal path, confirm the real `deploy-gate.yml` run via actual job logs (not assumed from a clean local test), confirm live site content post-deploy — same standard as every phase before this one tonight.

---

## DONE CONDITION

Either: real domain consolidation completed, verified via real job logs and live content check. Or: TASK 1 honestly reports there isn't yet enough real material to consolidate, and the CC-CMD stops there without forcing a premature reorganization.

**Confidence scoring:**
- TASK 1 (30 pts): honest, real inventory — correctly recognizes if there's nothing meaningful to consolidate yet, rather than forcing it
- TASK 2 (30 pts, only if TASK 1 finds real material): clean consolidation, no orphaned references
- TASK 3 (20 pts): real verification, correct call-site resolution
- TASK 4 (20 pts): real live CI run confirmed via job logs

Do not commit unless confidence >= 95. If score < 95 (including "there's nothing to consolidate yet" as a valid, high-confidence non-action), report verbatim and stop.
