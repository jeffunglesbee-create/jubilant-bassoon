# Claude Code Command — Fix renderEPLMatchBriefCard's archiveBrief() call: undefined `g` should be `game`

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** One line, `index.html` ~L32552.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md.

Write findings to outbox/cc-epl-brief-archive-typo-fix-2026-07-13.md.

## CONTEXT — found and independently re-verified twice already this session, not a new discovery

`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s TASK 4 spot-check found this during the typed-result survey, and chat independently re-confirmed it directly against source: `renderEPLMatchBriefCard(gameCard)` (~L32495) only binds `gameCard` and a local `game` — `g` is never declared anywhere in the function. Its `archiveBrief()` call (~L32552) reads `g&&(g._id||g.id)||null`, referencing the undefined `g` — throws `ReferenceError` on every invocation, silently swallowed by the surrounding `try{...}catch(_){}`. `archiveBrief()` has never once actually run for an EPL match brief.

## TASK 0 — Probe

```bash
grep -n "function renderEPLMatchBriefCard" index.html
sed -n '32540,32560p' index.html
```

Confirm the exact current line and the surrounding code still matches this description before editing — line numbers may have shifted with intervening commits this session.

## TASK 1 — Fix

Change `g&&(g._id||g.id)||null` to `game&&(game._id||game.id)||null` — the real local variable already in scope, matching the pattern used one line earlier (`fetchEPLMatchBriefFromClaude(game)`). Do not rename anything else in the function; this is a one-token fix, not a refactor.

## TASK 2 — Verification

- Confirm the fixed line no longer references an undefined identifier — read it back after the edit.
- If a real EPL match brief is available live (check `/v2/games` for any completed EPL/La Liga/Serie A/Ligue 1/UCL/UEL/UECL game today or recently), trigger the actual render path if reasonably reachable and confirm `archiveBrief()` now genuinely executes (a real archived brief appears, not just the absence of a thrown error) — do not just confirm the error stops throwing, confirm the call it was blocking now actually completes. If no real EPL-family game is live/recent enough to test against, say so plainly and rely on the static read-back instead — do not fabricate a live test that didn't happen.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

The undefined-`g` reference is fixed to the real local `game` variable. Confirmed via source read-back, and via a real live test if a suitable game was available at execution time — stated honestly either way. All three test suites clean.

**Confidence scoring:**
- TASK 0 probe confirms the exact current line before editing (20 pts)
- TASK 1 fix is the minimal, correct one-token change (30 pts)
- TASK 2 verified for real — live test if possible, honest static-only fallback stated plainly if not (35 pts)
- All three test suites clean (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
