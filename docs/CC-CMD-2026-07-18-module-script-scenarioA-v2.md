# Claude Code Command — Module Script Scenario A v2: add type="module" to the bundled script tag

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**Why v2 exists:** v1 (CC-CMD-2026-07-18-module-script-scenarioA.md) stopped at 57/100 because TASK 3 specified "smoke against the actual bundled output, confirm 958/0" — but the bundled output has 382 pre-existing smoke failures regardless of any change (smoke.js was designed for the source, not the esbuild IIFE). The CI pipeline runs smoke on SOURCE before build-bundle, not after. This CC-CMD corrects that gate. All other findings from the v1 session stand.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`, never `index.html` directly. The `build-bundle.mjs` change below is to the BUILD SCRIPT, not to `index.html` or `field.js`.

---

## CONTEXT (unchanged from v1)

- All 7 top-level `window.X=` assignments use explicit assignment — confirmed to work identically under `type="module"`
- `var`/`function` declarations inside the module do NOT leak to `window.*` — confirmed, but irrelevant: the code stays wrapped in the existing IIFE
- **Scenario B (true ES modules) is explicitly separate, still-unauthorized work.** The IIFE wrapper stays exactly as-is; only the `<script>` tag's `type` attribute changes.
- **This is a small, precise, single-attribute change.**

## WHAT THE v1 SESSION FOUND

The correct change is one line in `scripts/build-bundle.mjs`:

```js
// BEFORE:
const result = html.slice(0, contentStart) + '\n' + warning + bundled + html.slice(scriptEnd);

// AFTER:
const result = html.slice(0, scriptStart) + '<script type="module">' + '\n' + warning + bundled + html.slice(scriptEnd);
```

`OPEN_TAG` (`'<script>'`) stays unchanged — it's used for `lastIndexOf` searching and correctly finds `<script type="module">` as a substring for future runs. `contentStart` = `scriptStart + OPEN_TAG.length` is still used for the sanity-check (`blockSize`). Only the result reconstruction changes to emit `<script type="module">` instead of passing through the original `<script>`.

`sync-source.mjs` does NOT need changes — it operates on the source `index.html` (always `<script>`, never bundled) and is pre-commit only.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
node smoke.js index.html 2>&1 | tail -3      # must be 958 passed, 0 failed BEFORE any change
grep -n "const result = html.slice" scripts/build-bundle.mjs   # confirm current line to change
```

---

## TASK 1 — Apply the change to build-bundle.mjs

Edit the single result-reconstruction line in `scripts/build-bundle.mjs` per the exact diff above. No other changes.

## TASK 2 — Source smoke verification (the real CI gate)

```bash
node scripts/sync-source.mjs
node smoke.js index.html 2>&1 | tail -3
```

Must be **958 passed, 0 failed**. This is what CI runs. If this fails, stop — something is wrong with the source, not the build script.

## TASK 3 — Bundled output verification (regression check, not absolute gate)

```bash
node scripts/build-bundle.mjs
node smoke.js index.html 2>&1 | tail -3
grep -c '<script type="module">' index.html
```

Expected: **576 passed, 382 failed** (same as baseline without the change — confirmed in v1 session), and `grep` returns **1**. The 382 failures are pre-existing in the bundled output regardless of this change (confirmed in v1). If the count is HIGHER than 382, that is a real regression from this change — stop and investigate. If equal or lower, the change is net-neutral or better.

After this verification, restore source state:

```bash
git checkout -- index.html
node smoke.js index.html 2>&1 | tail -3   # must return to 958/0
```

## TASK 4 — Commit and push; confirm CI

```bash
git add scripts/build-bundle.mjs
git diff --staged
git commit -m "feat: add type=module to bundled script tag in build-bundle.mjs [Scenario A]"
git push -u origin main
```

Then use `mcp__a542a87e-4468-4000-904d-dff4ad9c3a20__get_ci_status` (or equivalent) to confirm `deploy-gate.yml` passes. The CI pipeline runs source smoke (958/0) → esbuild bundle → strip-comments → wrangler deploy. The deployed page will serve `<script type="module">` wrapping the same IIFE as before.

## TASK 5 — Real functional content check

Use `mcp__a542a87e-4468-4000-904d-dff4ad9c3a20__probe_relay_route` or the browser MCP tool to confirm the deployed page loads and renders correctly (not just that the attribute is present). Report the real outcome.

---

## DONE CONDITION

`type="module"` emitted by `build-bundle.mjs` on every future build. Source smoke 958/0 confirmed before and after. Bundled smoke regression-checked (≤382 failures, 0 new). CI green. Deployed page functional.

**Confidence scoring:**
- TASK 1 (20 pts): correct single-line change in build-bundle.mjs
- TASK 2 (25 pts): source smoke 958/0 — the real CI gate
- TASK 3 (20 pts): bundled smoke ≤382 failures (0 new from this change), `<script type="module">` confirmed present, source restored to 958/0
- TASK 4 (20 pts): commit + push + CI green confirmed via real job status
- TASK 5 (15 pts): real deployed page functional check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
