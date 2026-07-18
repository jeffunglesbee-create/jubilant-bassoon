# Claude Code Command — Gap 11: Filter × Circadian Interaction

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`, never `index.html` directly.

---

## CONTEXT

Source: Gap Closers doc, Gap 11. Defines how sport filters, My Teams boost (Gap 4), and conflict filters interact with circadian mode changes (Gap 5, live). Four real rules from the spec:

1. Sport filter persists across mode changes — mode affects sort within the filtered set, not what's shown
2. My Teams boost (Gap 4, if landed) compounds with circadian sort, doesn't replace it
3. On mode change to LATE/DAWN, if a sport filter is active and all games for that sport are final, show a subtle "Show all sports" suggestion chip — never auto-clear the filter
4. Conflict filter (3+ games same slot) only active during PREVIEW/PRIME — hide conflict chips during NIGHT/LATE/DAWN since conflicts are moot once games are over

**Real dependency note:** rule 2 assumes Gap 4 has landed. Check its real status at execution time — if Gap 4 hasn't shipped yet, implement rules 1/3/4 now and note rule 2 as a real, explicit follow-up rather than skipping it silently or guessing at Gap 4's interface.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "_activeSportFilter\|sportFilter" src/legacy/field.js | head -5
grep -n "conflictSlot\|conflict-chip\|conflictCount" src/legacy/field.js | head -5
grep -n "function.*[Mm]yTeams.*[Bb]oost\|myTeamsBoost" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

Confirm real current filter variable names — don't assume the spec's `_activeSportFilter`/`_myTeamsOnly` exactly.

---

## TASK 1 — Rule 1: sport filter persists (verify, likely already true)

Confirm current filter behavior already persists across renders — this is likely already correct given how filters typically work; if so, this task is a real verification, not new code. Report honestly if no change is needed.

## TASK 2 — Rule 3: "Show all sports" suggestion chip

On `_circadianMode` transition to LATE or DAWN, if a sport filter is active AND all games for that sport are confirmed final, show a real, dismissible suggestion chip — never auto-clear.

**Mandatory literal verification:**
```bash
grep -n "Show all sports" src/legacy/field.js
```
Paste real output.

## TASK 3 — Rule 4: hide conflict chips outside PREVIEW/PRIME

Real conditional on `_circadianMode` around existing conflict-chip rendering.

**Mandatory literal verification:**
```bash
grep -n "conflict-chip" src/legacy/field.js | head -5
```
Paste real output showing the real circadian-mode condition added.

## TASK 4 — Rule 2: My Teams compounding (only if Gap 4 confirmed landed)

Check Gap 4's real status. If landed, confirm the compounding behavior described in spec (circadian tier first, My Teams boost within tier — this should already be exactly how Gap 4 was built if dispatched correctly; verify, don't re-implement). If not landed, report this explicitly as a real, outstanding follow-up rather than skipping silently.

## TASK 5 — Real diff and live verification

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

---

## DONE CONDITION

Rules 1/3/4 genuinely implemented and verified via pasted output; Rule 2 either confirmed correct (Gap 4 landed) or explicitly flagged as outstanding (Gap 4 not yet landed) — not silently assumed either way.

**Confidence scoring:**
- TASK 1 (10 pts): honest verification
- TASK 2 (25 pts): real suggestion chip, confirmed via pasted output
- TASK 3 (25 pts): real conflict-chip gating, confirmed via pasted output
- TASK 4 (15 pts): honest real/outstanding determination for Rule 2
- TASK 5 (25 pts): real diff, real live CI, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
