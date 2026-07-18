# Claude Code Command — esbuild Phase 3f: sixth real ES module extraction

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

Seven real functions extracted across five modules so far: `fmtGolfToPar`, `fieldTierRank`/`fieldTierLabel`, `inferSport`/`golfRoundLabel`, `fmtESPNClock`, `_normWCName`.

**Phase 3e's own outbox already identified 4 real, pre-vetted candidates for this dispatch — use this list as the real starting point, not a fresh blind search:**
- `_raiQualityBar` — pure, 2 callers, 0 smoke hits
- `isNationalGame` — 1-liner, 8 callers, 0 smoke hits
- `urlBase64ToUint8Array` — pure, 1 caller, 0 smoke hits
- `_chipsHTML` — 3 callers, smoke A438z checks `html.includes('_chipsHTML')` (satisfied by call sites remaining in field.js, not by the function's own definition text — confirm this distinction holds before treating it as safe, don't just trust Phase 3e's own note)

**Re-verify all 4 against the real, current state before picking — Phase 3e's list was accurate as of its own write time, but the file has kept changing.** Don't assume it's still accurate without checking.

Reuse the established pattern exactly (new module under `src/utils/` or `src/sports/`, named exports, `globalThis` bridge in `main.js`, stub comment in `field.js`, no import in `field.js`).

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
find src/utils src/sports -name "*.js" 2>&1
grep -h "^export function" src/utils/*.js src/sports/*.js 2>&1
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Re-verify Phase 3e's 4 candidates against real, current state

For each of the 4: re-confirm real current call-site count, re-confirm zero smoke coverage by name (or, for `_chipsHTML` specifically, confirm precisely what A438z actually checks — the function's own definition text, or just that calls to it still exist somewhere in the file — these are different claims with different safety implications). Pick the strongest one with real, current evidence — prefer higher caller counts (more real usage proven) over marginal single-caller ones, all else equal, but don't force this preference if the actual evidence points elsewhere.

If none of the 4 hold up on re-verification, fall back to a fresh AST/call-graph search, matching Phase 3e's own more thorough methodology. If nothing safe is found even then, an honest stop (per Phase 3e's own precedent) is a valid, fully-credited outcome — not a failure.

## TASK 2 — Extract using the established pattern exactly (if a real candidate is confirmed)

## TASK 3 — Real call-site verification

## TASK 4 — Full local pipeline dry-run

## TASK 5 — Real live verification

Same standard as every phase tonight — real job logs, real post-deploy content check.

---

## DONE CONDITION

Either: a real, re-verified function (from Phase 3e's list or freshly found) extracted and verified via real job logs and live content check. Or: an honest, evidence-based stop if nothing genuinely safe remains.

**Confidence scoring:**
- TASK 1 (30 pts): real re-verification of the 4 candidates against current state, not trusted blindly from Phase 3e's own note — especially the `_chipsHTML` smoke-check distinction
- TASK 2 (25 pts, if applicable): established pattern followed exactly
- TASK 3 (15 pts, if applicable): real call-site verification
- TASK 4 (15 pts, if applicable): full local pipeline dry-run clean
- TASK 5 (15 pts, if applicable): real live CI run confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
