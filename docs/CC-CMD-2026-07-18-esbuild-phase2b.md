# Claude Code Command — esbuild Phase 2b: invert source-of-truth (src/legacy/field.js becomes primary)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.** This inverts which file is the actual source of truth for the entire application and for CI's smoke gate. A mistake here changes what "correct" means for every future edit, not just this one. Read in full before starting.

---

## CONTEXT

Phase 1 (`6be08e9`–`a288a77`) wired esbuild into the CI pipeline. Phase 2 (`f2dfda2`–`5be678c`) created `src/legacy/field.js` and `src/main.js`, but `src/legacy/field.js` is still *derived* from index.html — index.html remains the real source, smoke still runs against it, `build-bundle.mjs` bundles `src/main.js` (which imports the derived file) and re-injects the result into index.html at deploy time.

**Real, live-confirmed incident from Phase 2's own execution, relevant here:** Phase 1's `build-bundle.mjs` had a real bug (wrong-script-block, `indexOf` vs `lastIndexOf`) that genuinely reached a real production deploy before being caught — confirmed via direct GitHub Actions job-log inspection, not assumed. The live site survived by luck (the wrong block happened to be small and self-contained), not by any safeguard design. This is directly relevant to Phase 2b: any inversion of source-of-truth needs the same standard of direct, skeptical verification against real deploy behavior — a clean local dry-run alone is not sufficient evidence, per what just happened.

**Phase 2b's actual job:** make `src/legacy/field.js` the real, edited-directly source. `build-bundle.mjs` still bundles it into a deployable index.html, but the *direction* inverts — index.html becomes generated output, not the thing anyone edits. Smoke moves to run against `src/legacy/field.js` directly.

---

## PRE-BUILD PROBE BLOCK

```bash
# 1. Confirm HEAD, confirm Phase 2's files exist
git log --oneline -3
ls src/legacy/field.js src/main.js

# 2. CRITICAL: confirm src/legacy/field.js and index.html's <script> block are still byte-identical
# right now. If they've drifted since Phase 2 extracted it (any commit touched index.html's script
# content without re-syncing src/legacy/field.js), this must be resolved BEFORE inverting anything —
# inverting with silent drift would mean the "new" source of truth is missing real changes.
node -e "
const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const s = h.lastIndexOf('<script>') + '<script>'.length;
const e = h.indexOf('</script>', s);
const inlineScript = h.slice(s, e);
const legacyFile = fs.readFileSync('src/legacy/field.js', 'utf8');
console.log('byte-identical:', inlineScript === legacyFile);
if (inlineScript !== legacyFile) {
  console.log('inline length:', inlineScript.length, 'legacy length:', legacyFile.length);
}
"
# If NOT byte-identical: STOP. Report the drift. Do not proceed with inversion until resolved
# (likely re-running the Phase 2 extraction to re-sync, as its own small fix, before this CC-CMD continues).

# 3. Confirm current smoke baseline against index.html
node smoke.js index.html 2>&1 | tail -3

# 4. Confirm build-bundle.mjs's current real behavior (Phase 2's fixed version)
cat scripts/build-bundle.mjs

# 5. Confirm deploy-gate.yml's current real step order
grep -A 20 "^jobs:" .github/workflows/deploy-gate.yml
```

All 5 probes must pass, and probe 2 specifically must confirm byte-identical, before writing any code.

---

## TASK 1 — Update smoke.js's own invocation target

Confirm smoke.js's current interface (does it take a filepath argument already, per `node smoke.js index.html`, or is `index.html` hardcoded inside it?). If hardcoded, update it to accept a filepath argument, defaulting to `src/legacy/field.js` for local dev, with CI passing whichever path is now correct. Do not assume smoke.js's internals — read it in full first.

## TASK 2 — Update deploy-gate.yml's real step order

New pipeline:
```
Checkout
→ Sync SW_VERSION (now operates on src/legacy/field.js, not index.html)
→ Commit SW_VERSION sync
→ Fast smoke (node smoke.js src/legacy/field.js)   ← changed target
→ Build esbuild bundle (node scripts/build-bundle.mjs)  ← unchanged, still bundles src/main.js
→ Strip comments
→ Wrangler deploy
→ Confirm
```

Confirm the SW_VERSION sync step's real current implementation before assuming it can just be pointed at a new file — it may have index.html-specific logic (path handling, git diff scoping) that needs real adjustment, not just a path swap.

## TASK 3 — Real dry-run, local, before committing

Make a real, deliberate edit to `src/legacy/field.js` only (not index.html) — something trivial and reversible (e.g., a comment). Run the full updated pipeline locally: smoke against `src/legacy/field.js`, then `build-bundle.mjs`, confirm the edit appears in the resulting bundled index.html output. Revert the trivial edit. This is the real proof the inversion works end-to-end, not just that each piece parses.

## TASK 4 — Confirm index.html is genuinely no longer the edit target

After this lands, index.html's `<script>` content becomes machine-generated at build/deploy time. Add a real, visible guard — a comment at the top of the generated script block (e.g., `// GENERATED FILE — edit src/legacy/field.js, not this file`) that `build-bundle.mjs` inserts automatically, so a future session (human or AI) that opens index.html directly gets an immediate, unambiguous signal not to edit it there.

## TASK 5 — Verify against the real, exact same standard Phase 2's own incident just demonstrated is necessary

Not just a clean local dry-run. After committing, confirm the *next real* `deploy-gate.yml` run (triggered by whatever real change comes next) genuinely uses the new pipeline correctly — check the actual job/step logs directly via the GitHub Actions API, the same way tonight's Phase 1 incident was actually caught, not assumed clean from a local test alone.

---

## DONE CONDITION

`src/legacy/field.js` is the genuine, sole edit target. `index.html`'s script content is generated, guarded with a visible warning comment. Smoke runs against the real source file. A real, live deploy-gate.yml run has been directly confirmed (via job logs, not assumption) to execute the new pipeline correctly at least once.

**Confidence scoring:**
- Probe 2 (byte-identical check) (15 pts): correctly gates the rest — if drift exists, stopping and reporting is the only correct 100-point outcome for this check, not proceeding anyway
- TASK 1 (15 pts): smoke.js target genuinely updated, not assumed
- TASK 2 (25 pts): deploy-gate.yml correctly reordered, SW_VERSION sync step's real logic checked not assumed
- TASK 3 (20 pts): real, deliberate local dry-run with a real edit proven to flow through end-to-end
- TASK 4 (10 pts): real generated-file warning comment in place
- TASK 5 (15 pts): a real, subsequent live deploy-gate.yml run independently confirmed via actual job logs, not just a clean local test trusted on its own

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
