# Claude Code Command — Dead-code removal (confirmed subset) + resolved AMBIGUOUS entries + staged-work exception

**Date:** 2026-07-13 (rebuilt after two correction passes — this is now the complete, single source of truth. Earlier commits to this path lost the original task content when a correction replaced full file content instead of appending; nothing below is missing this time.)
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** 6 confirmed-dead function removals + 2 narrow telemetry additions (AMBIGUOUS entries, investigation already complete) + `fetchBDLRecentForm` handled per its own correction below. No other Bucket B site — this is not the start of the general Bucket B sweep, that's separate, larger, future work.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and STANDARDS.md Rule 63 (dead-code cleanup precedent — commit `07e97b45` earlier this session) before touching this file.

Write findings to outbox/cc-queue-deadcode-and-ambiguous-2026-07-13.md.

## CONTEXT — this uses docs/TYPED-RESULT-MIGRATION-QUEUE.md as a dataset, not just a checklist

The survey counted real callers for every one of 827 sites as part of its own classification work. That produced a dead-code census as a byproduct: 7 functions originally flagged "zero call sites anywhere in the file." Chat researched real chat/Drive history for all 7 before this executes, per explicit instruction, and found genuinely different situations — not one story. Separately, 2 entries the classifying process self-flagged AMBIGUOUS have now been fully investigated directly against source (see TASK 2 below — implement, don't re-investigate).

## `fetchBDLRecentForm` (~L18765) — DO NOT DELETE. Handle per TASK 1b, not TASK 1.

Real documented history: it's "Layer 2" of a deliberate 3-layer BDL momentum integration, built as foundational groundwork with its own comment stating it's "not yet wired to the compound prompt, built as the foundation." Layer 3 (team recent record) was explicitly noted as requiring counsel review before any user-visible Momentum display ships. This reads as staged work waiting on a legal gate, not orphaned code.

**TASK 1b (this function only):** Check whether a "Momentum" feature (7-axis framework, individual-player momentum dimension) has since shipped anywhere in the app — search for `Momentum`, `momentum`, or any caller that might have been added since this history was documented. If found: wire `fetchBDLRecentForm` in with a real, tested caller. If not found and no evidence the counsel-review gate resolved either way: leave the function exactly as-is, untouched, and note in the outbox that this is deliberately deferred pending a real product/legal decision, not a code-quality gap. Do not delete it, do not wire it unprompted.

## TASK 0 — Probe

```bash
for fn in predictNextOpenHour fetchLastMeeting formatPitcher fetchESPNPlays fdFetchLive _plEuroNote; do
  echo "=== $fn ==="
  grep -n "function $fn(\|$fn(" index.html
done
```

Re-confirm all 6 remaining removal candidates' real current caller counts fresh — do not trust the queue file's counts without re-checking, time has passed and other work has touched adjacent code this session.

## TASK 1 — Remove the 6 confirmed-dead functions (fetchBDLRecentForm excluded, see TASK 1b above)

- `predictNextOpenHour` (~L42600), `fetchLastMeeting` (~L31757), `formatPitcher` (~L8600) — no rich chat/Drive history surfaced by either research pass. Proceed on TASK 0's fresh code-level re-verification alone. If any turns out to have a real caller on re-check, do not remove it — flag it in the outbox as a queue correction and leave it alone.
- `fetchESPNPlays` (~L36294) — confirmed via chat history: made obsolete by the ESPN Pivot migration. Safe to remove, re-verify zero callers first per TASK 0.
- `fdFetchLive` (~L17033) — confirmed via chat history: superseded by a batched-fetch refactor. Its apparent sibling `fdPrefetchSoccerLive` is still live (fixed earlier this session, commit `3a9fb8d0`) but calls a different internal code path now, not this function. Re-verify this specific claim via TASK 0 before removing — trace `fdPrefetchSoccerLive`'s current body to confirm it genuinely does not call `fdFetchLive`, directly or indirectly, before deleting.
- `_plEuroNote` (~L12262) — confirmed via chat history: computed European-qualification stakes prose for specific, hardcoded EPL Final Day 2026 fixtures. Callers removed during routine date-schedule rotation once that day passed — normal lifecycle, safe to delete. **Add one paragraph to the outbox** (not the code) documenting the underlying pattern for a future session: computing title/European/relegation stakes from live table position generically, not hardcoded to specific teams/dates, is worth rebuilding next time a similar run-in situation approaches for any league. Knowledge preservation, not a code change.

## TASK 2 — Two narrow telemetry hooks (investigation complete, implement directly — do not re-investigate)

Chat independently investigated both AMBIGUOUS entries directly against current source, reading every real caller of each.

**`_wcComputeAllScenarios` (~L34545):** its `null` return collapses three causes — `typeof computeGroupScenarios !== 'function'` (real code-integrity failure), empty standings (normal pre-tournament state), and a caught exception. All 3 real callers (~L13423, ~L33301, ~L34448) either don't branch on the result or fall back to raw `standings` identically regardless of cause — **Bucket B confirmed correct, no caller needs different behavior.** Add exactly one `captureFieldError()` call on the `typeof computeGroupScenarios !== 'function'` branch only (a real, otherwise-invisible bug signature) — leave the other two `return null;` paths untouched, they're genuinely benign.

**`getStandingVelocity` (~L10343):** its `null` collapses five causes; the flagged concern is `findGB`'s nickname/abbreviation match failing (`gbRecent === null || gbBase === null`), which could indicate a real team-name-matching bug rather than genuine data absence. Both real callers (~L30494-30495) just omit a cosmetic momentum note either way — **Bucket B confirmed correct here too.** Add exactly one `captureFieldError()` call on the `gbRecent === null || gbBase === null` branch only — leave the other four `return null;` paths untouched.

Update `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: remove the AMBIGUOUS flag from both entries, replace with a one-line note that each was investigated, confirmed correctly classified as Bucket B, and given a narrow telemetry addition for the specific sub-case that could mask a real bug.

## TASK 3 — Verification

- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean after the removals and telemetry additions.
- Confirm no other code references any of the removed function names (a stray call site TASK 0 missed would be a real regression, not just a missed removal).
- For the 2 new `captureFieldError()` calls: real forced-condition test proving each fires exactly when its specific branch is hit, and does not fire for the other, benign null-causing branches in the same function.
- Update `docs/TYPED-RESULT-MIGRATION-QUEUE.md` to reflect what actually happened (functions removed as dead code, `fetchBDLRecentForm`'s deferred status noted, both AMBIGUOUS entries resolved) so the queue file stays accurate for whoever reads it next.
- Write outbox manifest per Rule 87.

## DONE CONDITION

6 confirmed-dead functions removed (re-verified dead before removal, not trusted from the queue alone), `fetchBDLRecentForm` handled per TASK 1b (wired if a real destination exists, otherwise left untouched with reasoning), both AMBIGUOUS entries closed with narrow, real telemetry additions proven via forced-condition tests. Queue file updated to match reality. All three test suites clean.

**Confidence scoring:**
- TASK 0 re-confirms all 6 removal candidates' real current caller counts, not trusted from the queue file (15 pts)
- TASK 1b correctly handles `fetchBDLRecentForm` — wired only if real evidence supports it, otherwise left alone with stated reasoning, not deleted and not force-wired (20 pts)
- TASK 1 correct removals, any surprise real caller found and handled as a flagged correction not silently ignored, `_plEuroNote` pattern note added to outbox (20 pts)
- TASK 2 both telemetry hooks correctly scoped to only their specific branch, proven via real forced-condition tests distinguishing them from the benign branches in the same function (30 pts)
- TASK 3 all suites clean, queue file updated to match reality (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
