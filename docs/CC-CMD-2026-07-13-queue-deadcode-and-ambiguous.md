# Claude Code Command — Dead-code removal (7 zero-caller functions) + audit the survey's 2 self-flagged AMBIGUOUS entries

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** the 7 named dead functions (remove) + the 2 named AMBIGUOUS functions (investigate, fix if genuinely Bucket A, leave if not). No other Bucket B site — this is not the start of the general Bucket B sweep, that's separate, larger, future work.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and STANDARDS.md Rule 63 (dead-code cleanup precedent — see commit `07e97b45` earlier this session for the established pattern) before touching this file.

Write findings to outbox/cc-queue-deadcode-and-ambiguous-2026-07-13.md.

## CONTEXT — this uses docs/TYPED-RESULT-MIGRATION-QUEUE.md as a dataset, not just a checklist

The survey counted real callers for every one of 827 sites as part of its own classification work. Read as a byproduct rather than its stated purpose, that produced a dead-code census: 7 functions explicitly marked "zero call sites anywhere in the file" — `fetchBDLRecentForm` (~L18765), `predictNextOpenHour` (~L42600), `fetchLastMeeting` (~L31757), `fetchESPNPlays` (~L36294), `formatPitcher` (~L8600), `_plEuroNote` (~L12262), `fdFetchLive` (~L17033).

Separately, the classifying process self-flagged uncertainty on 2 entries beyond the dead-code one: `_wcComputeAllScenarios` (~L34239) — "collapsing a genuine code-integrity bug (missing function) with normal 'no data yet' states" — and `getStandingVelocity` (~L10310) — "could indicate a real name/abbrev matching bug rather than genuine data absence." Both read as possible Bucket A misclassifications, the same shape as the `renderEPLMatchBriefCard` bug the survey's own TASK 4 spot-check already caught once.

## TASK 0 — Probe

```bash
for fn in fetchBDLRecentForm predictNextOpenHour fetchLastMeeting fetchESPNPlays formatPitcher _plEuroNote fdFetchLive; do
  echo "=== $fn ==="
  grep -n "function $fn(\|$fn(" index.html
done
grep -n "function _wcComputeAllScenarios\|_wcComputeAllScenarios(" index.html
grep -n "function getStandingVelocity\|getStandingVelocity(" index.html
```

Re-confirm all 9 functions' real current caller counts fresh — do not trust the queue file's counts without re-checking, time has passed and other Bucket A/B work has touched adjacent code this session.

## TASK 1 — Remove the 7 confirmed-dead functions

For each, confirmed zero real callers (not counting the function's own definition or stray comments): remove the function definition entirely. If any of the 7 turns out to have a real caller on re-check (TASK 0 found one the queue missed), do not remove it — flag it in the outbox as a queue correction and leave it alone, that's a different, separate finding.

## TASK 2 — Investigate the 2 AMBIGUOUS entries for real

For each, read the function body and every real caller closely enough to answer: is there a genuine case where a caller *could* meaningfully act differently on one failure cause vs. another (Bucket A), or does the queue's own classification hold (Bucket B, stays as-is)?

- If genuinely Bucket A: migrate it the same way the 13 confirmed Bucket A entries were — `fieldOperation()`, caller(s) updated to branch on `.ok`, real forced-condition test proving the distinction now works.
- If the queue's B classification is correct on closer read: say so explicitly with the real reasoning, update the queue file's own entry to remove the AMBIGUOUS flag (resolved, not just re-asserted), and do not migrate it.

Do not default to migrating just because the doubt exists — the ambiguity might resolve either way, and forcing a migration onto a function that doesn't need one is exactly the kind of unneeded complexity this whole sweep has been avoiding.

## TASK 3 — Verification

- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean after the 7 removals.
- If either AMBIGUOUS entry got migrated: real forced-condition test proving the new differentiated behavior, same discipline as every other Bucket A fix this session.
- Confirm no other code references any of the 7 removed function names (a stray call site that TASK 0 missed would be a real regression, not just a missed removal).
- Update `docs/TYPED-RESULT-MIGRATION-QUEUE.md` to reflect what actually happened (7 entries removed as dead code, 2 AMBIGUOUS entries resolved one way or the other) so the queue file stays accurate for whoever reads it next.
- Write outbox manifest per Rule 87.

## DONE CONDITION

7 confirmed-dead functions removed, re-verified dead before removal (not trusted from the queue alone). Both AMBIGUOUS entries genuinely investigated and resolved with real reasoning, not defaulted either direction. Queue file updated to match reality. All three test suites clean.

**Confidence scoring:**
- TASK 0 re-confirms all 9 functions' real current caller counts, not trusted from the queue file (20 pts)
- TASK 1 correct removals, any surprise real caller found and handled as a flagged correction, not silently ignored (25 pts)
- TASK 2 both AMBIGUOUS entries genuinely investigated, real reasoning stated for whichever resolution, not defaulted (30 pts)
- TASK 3 all suites clean, queue file updated to match reality (25 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
