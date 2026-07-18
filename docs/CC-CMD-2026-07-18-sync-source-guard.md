# Claude Code Command — Guard against sync-source.mjs silently destroying index.html-direct edits

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CONTEXT

Real, confirmed incident tonight: a session genuinely wrote real JavaScript (Gap 5's circadian functions), genuinely tested it locally, genuinely saw smoke pass — but edited `index.html` directly instead of `src/legacy/field.js` (the source of truth Phase 2b established). The pre-commit hook's `sync-source.mjs` step silently overwrote `index.html`'s script block with the old, unchanged `field.js` content, erasing the real work with no error and no warning. The session's own outbox truthfully reported what it had built and tested moments before the hook destroyed it.

**This is a real, structural risk in the current sync design, not a one-off mistake to shrug off.** Any future session (human or AI) that edits `index.html` directly instead of `src/legacy/field.js` will have that work silently erased at commit time, with a misleadingly clean smoke pass along the way (since smoke may run before the destructive sync, or run against a state where nothing new is present to break).

---

## PRE-BUILD PROBE BLOCK

```bash
cat scripts/sync-source.mjs
cat scripts/pre-commit
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Add a real pre-sync divergence check to sync-source.mjs

Before `sync-source.mjs` overwrites `index.html`'s script block with `src/legacy/field.js`'s content, compare the *current* `index.html` script block against what `git show HEAD:index.html`'s script block was (the last committed state) — if `index.html`'s script content has changed since the last commit in a way that ISN'T just what `sync-source.mjs` itself would produce from the current `field.js`, that's a real signal someone edited `index.html` directly.

Concretely: before overwriting, extract the current (pre-overwrite) script block from `index.html`. If it is NOT byte-identical to `src/legacy/field.js`'s current content, AND it is also not byte-identical to what the last commit's `index.html` script block was — genuinely new, uncommitted content exists in `index.html` that doesn't match `field.js`. In this case:

- Print a clear, loud warning to stderr identifying this exact situation
- Exit with a non-zero status, refusing to proceed with the overwrite
- Do NOT silently discard the divergent content

This must be a real, working check — test it with a real, deliberate scratch scenario (temporarily edit `index.html`'s script block by hand, confirm the guard fires and blocks; then revert and confirm normal operation still works when `field.js` is the genuine source of the change).

## TASK 2 — Add a matching note to CLAUDE.md's Deploy/Editing section

A short, clear statement: `src/legacy/field.js` is the only correct edit target for JS changes. Editing `index.html`'s script block directly will now be caught and blocked by `sync-source.mjs` rather than silently discarded — but the correct fix if this fires is to move the real edit into `field.js`, not to bypass the guard.

## TASK 3 — Real verification

Run the real, deliberate test scenario from TASK 1 and paste its actual output — the guard genuinely firing on a real divergent-edit scenario, and genuinely NOT firing on a real, normal `field.js`-originated change. Full pipeline dry-run for the normal case. Real commit, real live verification per tonight's established standard (real job logs, real post-deploy content check) — though this change itself shouldn't affect runtime behavior, only the build-time guard.

---

## DONE CONDITION

`sync-source.mjs` genuinely detects and blocks (rather than silently overwrites) any case where `index.html`'s script block has diverged from both `field.js` and the last commit in a way `field.js` alone can't explain — proven via a real, deliberate test scenario with real output pasted, not just described. Normal `field.js`-originated syncs continue to work exactly as before.

**Confidence scoring:**
- TASK 1 (50 pts): real, working divergence guard, proven via a real deliberate test with real pasted output — this is the core fix
- TASK 2 (15 pts): clear CLAUDE.md note
- TASK 3 (35 pts): real verification of both the blocking case and the normal case, real live CI confirmation

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
