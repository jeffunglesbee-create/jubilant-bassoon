# Claude Code Command — Module Script Scenario A: add type="module" to the bundled script tag

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**Approved for execution** — the investigation phase (`5c8ade2`) already confirmed Scenario A conditionally safe via real Playwright/Chromium evidence. This CC-CMD is the actual implementation, not further investigation.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`, never `index.html` directly. `scripts/sync-source.mjs` has a real, working divergence guard that blocks (not silently discards) a direct edit.

---

## CONTEXT

Real, confirmed findings from the investigation, not assumptions:
- All 7 top-level `window.X=` assignments use explicit assignment — confirmed to work identically under `type="module"`
- `window.fetch` override: confirmed visible to subsequent scripts within the module context
- `var`/`function` declarations inside the module do NOT leak to `window.*` — confirmed, but this doesn't matter for Scenario A since the code stays wrapped in the existing IIFE, not converted to bare top-level module code
- `globalThis` bridge (Phase 3's extraction pattern, `main.js` → `field.js`) confirmed to work under `type="module"`
- **Scenario B (true ES modules, retiring the `globalThis` bridge entirely) is explicitly separate, still-unauthorized work — this CC-CMD does NOT attempt that.** The IIFE wrapper in the bundled output stays exactly as-is; only the `<script>` tag's `type` attribute changes.

**This is a small, precise, single-attribute change — do not scope-creep into anything else.**

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "<script>" index.html | head -3
node smoke.js index.html 2>&1 | tail -3
```

Confirm the real, current script tag structure before touching it.

---

## TASK 1 — Real confirmation of where the type="module" attribute needs to change

Find the real, current build step (`scripts/build-bundle.mjs`) that injects the bundled script into `index.html` — confirm whether the `<script>` tag itself is a static string in that script, or copied from an existing template. Change the injected tag's own type attribute there, so it applies to every future build, not just a one-time manual edit to the current `index.html`.

## TASK 2 — Apply the change

Add `type="module"` to the real, confirmed script tag location from TASK 1.

## TASK 3 — Real, mandatory smoke verification against the actual bundled output

This is the single gate the investigation named. Run the full real pipeline: `sync-source.mjs` → `build-bundle.mjs` → smoke against the actual resulting `index.html` (not source, the real bundled/injected file, matching how it will actually deploy). Confirm 958/0 (re-confirm current real count).

**If smoke fails:** this is real, valuable information that the investigation's logic-trace prediction didn't fully hold in practice — report it honestly, do not force past it, and do not revert to a "just the parts that worked" partial change.

## TASK 4 — Real diff and live verification

```bash
git diff --stat
```

Real commit, real live `deploy-gate.yml` job logs directly confirmed via actual pasted output, real live content check confirming the deployed page genuinely loads and functions correctly (not just that the script tag has the new attribute — confirm the app actually renders and runs).

---

## DONE CONDITION

`type="module"` applied to the real, bundled script tag at its real source (the build step, not a one-off manual edit), smoke genuinely passes against the actual post-build output, real live deployment confirmed via job logs and a real functional content check — not just "the attribute is present."

**Confidence scoring:**
- TASK 1 (20 pts): real confirmation of the correct, durable location to make this change
- TASK 2 (15 pts): clean, minimal change
- TASK 3 (35 pts): real smoke verification against the actual bundled output — this is the investigation's own named gate, weighted accordingly
- TASK 4 (30 pts): real live CI confirmed via job logs, real functional content check (not just attribute presence)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
