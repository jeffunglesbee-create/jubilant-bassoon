# Claude Code Command — Retire the globalThis bridge: real exports/imports replacing Phase 3's temporary pattern

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This is the final, most structurally-sensitive piece of the whole esbuild/module thread — it touches `sync-source.mjs` and the source `<script>` tag `smoke.js` itself runs against. Treat with real caution.**

---

## CRITICAL — a real, confirmed precondition this CC-CMD must handle, not discover mid-implementation

**Directly verified before writing this spec:** `index.html`'s *source* `<script>` tag (the one `smoke.js` runs against, before `build-bundle.mjs` ever touches it) is still plain `<script>`, not `type="module"`. Scenario A/B's `type="module"` change only applies to the *bundled, deployed* output via the build step — the source tag was never touched.

**Real, direct consequence: adding `export` statements to `field.js` and letting `sync-source.mjs` copy it verbatim into this still-classic source tag is an immediate syntax error.** `export` is invalid outside a module context. This is not a theoretical risk — it will fail the moment `sync-source.mjs` runs, before any real testing even begins.

**This means retiring the globalThis bridge genuinely requires the source `<script>` tag to also become `type="module"`, not just the bundled one.** This CC-CMD must handle that directly, as a real, first task — not attempt exports without it and discover the break.

---

## CONTEXT

Scenario B's own session doc named this precisely: 25 `globalThis.X = X` lines in `main.js`, currently the only way `field.js`'s Phase-3-extracted functions (call sites still living in `field.js`) resolve their imports. Retiring this requires:
1. Real `export` statements in `field.js` for each of the 25 functions
2. Real `import { X } from './legacy/field.js'` in `main.js`, replacing the `globalThis.X = X` lines
3. The source `<script>` tag becoming `type="module"` (the precondition above)
4. Confirming `sync-source.mjs` still works correctly once `field.js` contains real `export` syntax

**Do not assume this is purely mechanical — real, first-principles investigation required before implementing, matching the discipline that made Scenario B itself succeed.**

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
node smoke.js index.html 2>&1 | tail -3
grep -o '<script[^>]*>' index.html | sort -u
grep -c "globalThis\." src/main.js
cat scripts/sync-source.mjs
```

Confirm the real, current state of every one of these before writing any code — the 25 count, the sync-source.mjs contract, and the source script tag's real current type.

---

## TASK 1 — Real, fresh investigation: what genuinely needs to change, and in what order

1. **Source script tag:** confirm changing it to `type="module"` doesn't break anything else that currently depends on it being classic (e.g., anything relying on synchronous, inline execution during parse — module scripts always defer). Scenario B's own investigation already confirmed the *bundled* output handles deferred execution fine; confirm this holds for the *source* path too, since smoke.js and any local dev workflow runs against source, not the bundle.
2. **`sync-source.mjs`'s real, current logic:** confirm exactly what it does today (verbatim copy of `field.js`'s content into the script block) and what, if anything, needs to change once that content contains real `export` statements.
3. **The 25 real functions:** re-derive the current, real list — Scenario B's session doc said 25; confirm this hasn't changed since.
4. **Real call-site check:** for each of the 25, confirm whether `field.js`'s own internal call sites reference them as bare identifiers (which would need to keep working via the module's own top-level scope, not `window`/`globalThis`) versus whether anything outside `field.js` (e.g., an inline HTML handler, or `main.js` itself) also needs them as `window.X` — real exports don't automatically create `window` properties, so anything with an external dependency on the `window`/`globalThis` form needs to keep that explicit assignment alongside the new export, not lose it.

## TASK 2 — Implement, incrementally, matching Scenario B's own proven approach

Based on TASK 1's real findings:
1. Change the source `<script>` tag to `type="module"` (if TASK 1 confirms this is safe)
2. Add `export` to each of the 25 real functions in `field.js`, preserving any existing `window.X=`/`globalThis.X=` assignment for that function if TASK 1's call-site check found it's still needed externally
3. Replace `main.js`'s 25 `globalThis.X = X` lines with real `import { X } from './legacy/field.js'` statements
4. Real smoke check after each discrete step, not one large batch

**If TASK 1 finds this is genuinely riskier or larger than expected — for instance, if changing the source script tag to module type breaks something real — stop, report the specific finding, and propose a narrower follow-up rather than force it through.**

## TASK 3 — Real, thorough verification

Full pipeline: `sync-source.mjs` → smoke (958/0, re-confirm current count) → `build-bundle.mjs` → bundled regression check against the real, current baseline (not Scenario A's older number — re-confirm what it is now). Real functional check of a real sample of the 25 functions actually working end-to-end, not just smoke passing.

## TASK 4 — Real diff and live verification

```bash
git diff --stat
```

Real commit(s), real live CI confirmed via the raw check-runs API directly (not a summary claim — matching tonight's own established standard), real live content check.

---

## DONE CONDITION

Either: the globalThis bridge genuinely, fully retired — real exports/imports, source script tag correctly handles the new syntax, all 25 functions verified working via both their real call sites and any external dependents, verified via real job logs and functional checks. Or: TASK 1 finds a genuine, specific blocker (most likely around the source script tag or sync-source.mjs's contract) and honestly reports it with a scoped, specific next step, rather than forcing an incomplete or risky change through.

**Confidence scoring:**
- TASK 1 (35 pts): real, thorough investigation, especially the source-script-tag precondition and the external-dependency check for each of the 25 functions
- TASK 2 (30 pts): real, incremental implementation, or an honest, specific stop if TASK 1 finds genuine risk
- TASK 3 (20 pts): real, functional verification beyond smoke passing
- TASK 4 (15 pts): real diff, real live CI confirmed via raw job-log inspection, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
