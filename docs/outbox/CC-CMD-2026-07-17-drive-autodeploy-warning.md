# Claude Code Command — Document Drive auto-deploy standing risk in CLAUDE.md

**Date:** 2026-07-17
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**Scope:** Docs-only. One commit. No code changes. No smoke required (no index.html touch).

---

## CONTEXT

`field-autodeploy.yml` contains a Google Drive polling mechanism: every 30 minutes it downloads a specific file from Drive and commits it to main if changed. The mechanism has a safe-default — it exits cleanly if the `DRIVE_FILE_ID` repo secret is absent. As of 2026-07-17, the secret is confirmed absent (verified via GitHub Actions API, 0 of 30 recent runs showed Drive-sourced commits).

As of commit `a288a77`, the deploy pipeline is now:

```
smoke(source) → esbuild build-bundle.mjs → strip-comments → wrangler deploy
```

If `DRIVE_FILE_ID` is ever added without awareness of the esbuild migration, `field-autodeploy.yml` would push raw source HTML directly to main, bypassing the build step entirely. The built bundle would not be included in the deployed asset. This is a silent, standing architectural risk — nothing today prevents it.

This was documented in `docs/outbox/cc-esbuild-migration-verification-2026-07-17.md` (Task 5) and flagged as a carry-forward in `docs/outbox/cc-session-2026-07-17-esbuild-phase1.md`. It must now be written into CLAUDE.md so future sessions (and future humans) have an in-repo warning.

---

## TASK 1 — Verify current CLAUDE.md Deploy section

Read CLAUDE.md lines 92–97. Confirm current text before editing. Current expected state:

```
## Deploy
- Sole deploy path: `.github/workflows/deploy-gate.yml`
- Trigger paths: index.html, sw.js, field_utils.js, wrangler.jsonc
- Pipeline: smoke.js → wrangler deploy (v3.109.0 pinned)
- `[skip ci]` in commit message skips ALL workflows
```

---

## TASK 2 — Update CLAUDE.md Deploy section

Add two bullet points to the Deploy section. Insert immediately after the `[skip ci]` bullet:

```
- **Drive auto-deploy risk (standing):** `field-autodeploy.yml` polls Google Drive every 30 min for a file matching `DRIVE_FILE_ID` secret and commits it to main directly — bypassing the esbuild build step. `DRIVE_FILE_ID` is currently absent (confirmed 2026-07-17); the mechanism is dormant. If this secret is ever added, the raw source HTML would be deployed without the esbuild bundle, silently breaking the Phase 1 pipeline. Any activation of `DRIVE_FILE_ID` requires updating `field-autodeploy.yml` to run `node scripts/build-bundle.mjs` before committing.
- **Pipeline as of 2026-07-17:** smoke(source) → esbuild bundle → strip-comments → wrangler deploy
```

Also update the existing Pipeline bullet to reflect the current state:

Old: `- Pipeline: smoke.js → wrangler deploy (v3.109.0 pinned)`
New: `- Pipeline: smoke(source) → esbuild bundle → strip-comments → wrangler deploy (v3.109.0 pinned)`

---

## TASK 3 — Verify CLAUDE.md and commit

After edit, read back the Deploy section to confirm the text is correct. Then:

```
git add CLAUDE.md
git commit -m "docs: add Drive auto-deploy standing risk warning to CLAUDE.md [skip ci]"
git push -u origin main
```

---

## DONE CONDITION

`CLAUDE.md` Deploy section contains the Drive auto-deploy warning and the updated pipeline description. `git log --oneline -1` shows the docs commit on main.

**Confidence scoring:**
- TASK 1 (verify): read-only, zero risk
- TASK 2 (edit): single-section docs-only change
- TASK 3 (commit): [skip ci], no deploy

Do not commit unless the read-back confirms the text is correct. If score < 95, report and stop.
