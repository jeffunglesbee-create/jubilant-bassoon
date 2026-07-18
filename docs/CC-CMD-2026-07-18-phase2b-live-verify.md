# Claude Code Command — Force + directly verify a real live deploy-gate.yml run of the Phase 2b pipeline

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull; git log --oneline -5.

---

## CONTEXT

Phase 2b (source-of-truth inversion, `870cf50`–`b4bf1ee`) is locally dry-run verified but has never triggered a real `deploy-gate.yml` run — none of its own commits touched a trigger path. This CC-CMD exists specifically to close that gap directly, rather than waiting for it to happen incidentally on some future, unrelated change — per the standard Phase 1's own incident established as necessary (a real bug reached production once already because a clean local dry-run was trusted without a corresponding real job-log check).

**This is a genuinely small, low-risk trigger, not a feature change.** The goal is purely to exercise the new pipeline once, for real, and read what actually happened.

---

## TASK 1 — Make a genuinely trivial, safe edit via the correct new edit target

Edit `src/legacy/field.js` — **not** `index.html` directly, per Phase 2b's own new convention. Add a single-line comment near the top of the file (e.g., `// Phase 2b live-CI verification trigger, 2026-07-18 — safe to remove after confirmed`). This must be genuinely inert: a comment only, zero functional change, zero risk to smoke or runtime behavior.

## TASK 2 — Commit through the real, normal path — do not bypass the hook

`git add src/legacy/field.js && git commit -m "chore: trivial trigger for Phase 2b live CI verification"`. Let the real pre-commit hook run normally (sync-source.mjs → smoke → stage index.html) — do not use `--no-verify`. This is itself a real test that the hook works exactly as it would for any genuine future edit, not just a forced/synthetic scenario.

Confirm the commit includes both `src/legacy/field.js` and the synced `index.html` (the hook should have staged `index.html` automatically per Phase 2b's own design).

## TASK 3 — Push and confirm the real workflow fires

`git push origin main`. Poll the GitHub Actions API directly for the new `deploy-gate.yml` run against this commit's SHA — do not assume it fired, confirm it.

## TASK 4 — Read the real job/step logs directly, not just the pass/fail summary

For the real run this triggers, confirm via the actual job/step-level API output (matching how the Phase 1 incident was actually caught — job-level detail, not just overall conclusion):
1. SW_VERSION sync step ran against `src/legacy/field.js` (not the old `index.html`-direct path)
2. `sync-source.mjs` genuinely executed as part of the sync
3. Smoke ran against `index.html` and passed at 958/0 (real count — confirm current, it may have changed)
4. `build-bundle.mjs` ran and genuinely used the correct script block (re-confirm the 1MB sanity-check guard didn't need to fire — if it did, that's a real problem to report, not a success)
5. The GENERATED warning comment appears in the deployed bundle's injected script block
6. Wrangler deploy completed successfully

## TASK 5 — Verify the live, deployed result directly

Fetch the real, live production URL after the deploy completes. Confirm the app genuinely still works (a real content check, not just an HTTP 200 — e.g., confirm a known, stable string like `FIELD_RENDER_PIPELINE` is present, matching the same check used to verify the Phase 1 incident's actual live impact).

## TASK 6 — Clean up the trigger comment

Once TASK 4/5 confirm everything worked, remove the trivial comment added in TASK 1 via the same real path (edit `src/legacy/field.js`, commit normally through the hook, push) — leaving no permanent trace of the verification trigger. This second commit is itself a second, independent real confirmation that the pipeline works repeatably, not just once.

---

## DONE CONDITION

A real `deploy-gate.yml` run has been directly observed, via actual job/step logs (not assumed from a green checkmark alone), to correctly execute every step of the Phase 2b pipeline. The live, deployed site is confirmed genuinely working afterward via a real content check. The trigger comment is cleanly removed via a second real pipeline run, proving repeatability.

**Confidence scoring:**
- TASK 1-2 (20 pts): genuinely trivial edit, real commit through the unmodified hook
- TASK 3 (10 pts): real confirmation the workflow fired, not assumed
- TASK 4 (40 pts): real job/step-level log inspection confirming all 6 sub-points, not just overall pass/fail
- TASK 5 (20 pts): real live content check post-deploy, not just HTTP status
- TASK 6 (10 pts): clean removal via a second real, independently-confirmed pipeline run

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
