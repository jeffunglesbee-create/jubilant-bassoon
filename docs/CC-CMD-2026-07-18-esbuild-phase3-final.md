# Claude Code Command — esbuild Phase 3-final: extract all remaining genuinely safe candidates

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution.**

---

## CONTEXT

Six real extractions done across Phase 3/3b/3c/3d/3e. Phase 3f may or may not have landed by execution time — check real state, don't assume. This dispatch's goal: finish the "easy, safe, zero-smoke-coverage, zero-constant-dependency" category in one pass, rather than continuing one extraction per dispatch indefinitely — real candidates already exist, no need to re-search from scratch for each.

**Real, known candidates not yet claimed (re-verify all against current state first — this list may already be partly stale if Phase 3f landed):**
- `_raiQualityBar` — pure, 2 callers, 0 smoke hits (Phase 3e)
- `isNationalGame` — 1-liner, 8 callers, 0 smoke hits (Phase 3e)
- `urlBase64ToUint8Array` — pure, 1 caller, 0 smoke hits (Phase 3e)
- `_chipsHTML` — 3 callers; Phase 3f was tasked with resolving whether smoke A438z checks its own definition text or just call-site presence — check Phase 3f's real outcome before deciding if this one is safe

**Full cumulative rejection list — do not re-propose any of these without genuinely new evidence (e.g., a constant turns out small enough to extract alongside the function):**
`classifyFieldError`, `_briefQualityClassify`, `stripMarkdown`, `_gameSport`, `lastNameOf`, `isDomesticLeagueInBreak`, `isCrunchTimeGame`, `isGrindingGame`, `fieldDateKey`, `_otwTierLabel`, `_otwMarginTier`, `leagueImportanceTier`, `leagueImportanceRank`, `advancementState`, `fieldNowET`, `fieldDatesToQuery`, `_wcFixTeamName`, `_otwIsFinalPeriod`, `_otwIsCrunchTime`, `_mlbPlayerKey`, `getUmpireABSRating`, `getParkFactor`, `expandStreams`, `resolveBundle`, `sportCountLabel`, `teamNick`, `_multiWordNicks`, `minutesSinceFinal`, `fmtTime`, `isoToLabel`, `localTz`, `parseSeriesRecord`, `isBigMarketGame`

**"Finishing up" means completing the easy category, not force-solving the hard one.** Do not attempt to extract any constant-dependent or smoke-asserted function by also moving its dependency or rewriting its smoke assertion — that's real, separate, higher-risk scope requiring its own explicit authorization, not something to fold into a batch of otherwise-simple extractions.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -8
find src/utils src/sports -name "*.js" 2>&1
grep -h "^export function" src/utils/*.js src/sports/*.js 2>&1
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Real, final, exhaustive search

Re-verify the 3-4 known candidates against current state. Then do one real, thorough AST + call-graph pass (matching Phase 3c/3e's more exhaustive methodology) across the remainder of `src/legacy/field.js` specifically looking for anything else genuinely pure, zero-smoke-coverage, zero-constant-dependency that hasn't been checked yet — the goal is a real, complete accounting of "everything easy," not just the already-known list. Report the complete real list found, with evidence for each.

## TASK 2 — Extract all confirmed-safe candidates, each following the established pattern exactly

New module(s) under `src/utils/` or `src/sports/` (group related ones naturally — e.g., if `isNationalGame` and another game-classification function both surface, they could share a file — but don't force artificial grouping either). Named exports. `globalThis` bridge in `main.js` for each. Stub comments in `field.js`, no imports added there.

## TASK 3 — Real call-site verification for every extracted function

Not just one — confirm every real call site for every function extracted in this pass resolves correctly.

## TASK 4 — Full local pipeline dry-run

`sync-source.mjs` → smoke (958/0, re-confirm current count) → `build-bundle.mjs` clean, covering all extractions together.

## TASK 5 — Real live verification

Commit through the normal path. Real `deploy-gate.yml` job logs directly confirmed — this is one real CI run covering the whole batch, so verify it thoroughly (all steps, not just overall conclusion) since it's carrying more real change than any single prior extraction. Real live content check post-deploy confirming multiple extracted functions' presence, not just one.

## TASK 6 — Final accounting

Write a real, honest summary: total functions extracted across all of Phase 3 (this dispatch plus everything before it), total modules, and an honest statement of what's left unextracted and why (the full rejection list, categorized by real reason — smoke-asserted vs. constant-dependent vs. not-yet-found). This is the natural point to revisit whether Phase 4 (tree-shaking) or domain consolidation is now genuinely ready, given the real, final count.

---

## DONE CONDITION

Every genuinely safe, zero-smoke-coverage, zero-constant-dependency function in `src/legacy/field.js` has been extracted (or a real, thorough search confirms none remain beyond what's already done), each verified via the same real-job-log standard as every prior phase, with a final honest accounting of what remains and why.

**Confidence scoring:**
- TASK 1 (25 pts): real, thorough, complete search — not just re-checking the 4 already-known candidates
- TASK 2 (20 pts): clean extraction of every confirmed-safe candidate, established pattern followed exactly
- TASK 3 (15 pts): real call-site verification for every function
- TASK 4 (15 pts): full local pipeline dry-run clean
- TASK 5 (15 pts): real live CI run thoroughly confirmed via job logs, real post-deploy content check
- TASK 6 (10 pts): honest, complete final accounting

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
