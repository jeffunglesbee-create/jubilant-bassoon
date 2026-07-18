# Claude Code Command — esbuild Phase 7: MY_TEAMS + isFeaturedTierGame

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

Same proven template as Phase 5/6 — apply directly, this is not new ground.

**Real thing to check explicitly, not assume:** `MY_TEAMS` sounds like it could be user-preference state (a set of favorited teams) rather than a static constant like `WX_DIR`/`VENUE_COORDS`. If it's genuinely static (defined once, never mutated), the pattern applies unchanged. If it's mutated anywhere at runtime (a real `MY_TEAMS.add(...)`/`.push(...)` or reassignment), extraction needs real, different handling — the `globalThis` bridge works for reads, but a mutated value needs the mutation itself to also happen through the bridge correctly, or the module's own copy and `field.js`'s view of it could diverge. Check this before assuming Phase 5's exact pattern applies unmodified.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "^const MY_TEAMS\|^let MY_TEAMS\|MY_TEAMS\s*=" src/legacy/field.js
grep -n "function isFeaturedTierGame" src/legacy/field.js
grep -c "MY_TEAMS" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Real confirmation of scope, including mutability

Confirm `MY_TEAMS`'s real declaration (`const` vs `let`) and whether it's genuinely mutated anywhere in `field.js` at runtime, not just read. If mutated: report this honestly and propose the correct handling before extracting (this may mean this pair isn't actually safe for the current pattern without real, additional design — don't force it through if so). If genuinely static: proceed identically to Phase 5/6.

## TASK 2 — Extract into src/utils/preferences.js (only if TASK 1 confirms genuinely static)

## TASK 3 — Real call-site verification

## TASK 4 — Full local pipeline dry-run

## TASK 5 — Real live verification

Real job logs, real post-deploy content check.

---

## DONE CONDITION

Either: `MY_TEAMS` + `isFeaturedTierGame` extracted (if genuinely static), verified via real job logs and live content check. Or: TASK 1 honestly reports real mutability found, with a clear explanation of why this specific pair needs different handling than Phase 5/6 — a valid, complete, high-confidence outcome, not a failure.

**Confidence scoring:**
- TASK 1 (35 pts): real, careful confirmation of mutability specifically — correctly identifies if this is genuinely different from Phase 5/6, not assumed identical
- TASK 2 (25 pts, if applicable): clean extraction
- TASK 3 (15 pts, if applicable): real call-site verification
- TASK 4 (10 pts, if applicable): full local pipeline dry-run clean
- TASK 5 (15 pts, if applicable): real live CI run confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
