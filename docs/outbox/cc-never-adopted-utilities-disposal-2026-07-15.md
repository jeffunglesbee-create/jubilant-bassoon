# CC Session Outbox — Dispose of 8 real, never-adopted utility functions (CC-CMD-2026-07-15-never-adopted-utilities-disposal)

**Date:** 2026-07-15
**Scope:** 7 real removals, 1 deliberate no-change (corrected classification), plus 2 real duplicate/false-positive smoke assertions found and fixed along the way.

## TASK 0 — Probe

Re-confirmed zero real callers still holds for all 8 at current HEAD (line numbers drifted from tonight's earlier edits, as expected). Checked for any newly-available real destination per TASK 0's own instruction, not assuming the prior snapshot still holds — found real, decisive new evidence for 6 of the 8 that the prior dispatch's own investigation hadn't surfaced:

- **`nhlStreams`**: found the real, hardcoded 2026 Stanley Cup Final entries (6 games, G1-G6) each call `resolveBundle("NHL_ABC")` **directly**, not `nhlStreams(gameNum)`. The real 2026 broadcast deal was all-ABC — `nhlStreams`'s own TNT/ESPN-alternating-by-game-number assumption never matched reality. The 2026 NHL postseason is also already concluded (June 14, confirmed via a separate "Hard expiry" comment).
- **`mlbBaserunnerBonus`**: found `applyQW1SituationBonus`'s real, live BASEBALL section already computes a more refined version of the identical baserunner/outs/late-innings signal (RISP distinction, full-count bonus) — genuinely superseded, not just unadopted.
- **`normalizeApiFootballStats`**: re-confirmed against the real, live `[MATCH STATS]` mechanism (P6A/P6B) — still reads a differently-shaped `localStorage` payload directly, bypassing this normalizer entirely.
- **`enrichGame`**: found `computeWatchValue` (its own real replacement for the abandoned Stage-4 `watchValue` concept) has 2 real, live call sites with a completely independent shape. Confirmed `resolveGameBroadcast`/`classifySport`/`computeGameNarrative` (enrichGame's own internal dependencies) each have real callers elsewhere (5/14/12 occurrences respectively) — safe to remove `enrichGame` alone without touching them.
- **`forEachGame`**/**`fieldFetch`**: re-confirmed zero callers, no new destination.
- **`buildSlashGolfGamesForToday`**: found the real, decisive architectural comment directly above its own real caller site: *"SlashGolf does NOT create PGA Tour Golf sections. ESPN enriched (/v2/golf/enriched) is the primary PGA Tour source... Golf section creation happens in the loadPGASlate callback."* Confirms this function represents a superseded, earlier design (build cards directly from SlashGolf) replaced by the real, shipped one (ESPN builds cards; SlashGolf only annotates via `injectSlashGolfLeaderNotes`).
- **`injectNBARegression`**: found real, decisive evidence the prior classification missed — its own section header comment (`"NBA Regression Alert (Wave 2)"`, positioned above the cache declaration rather than immediately above the function) explicitly states: **"Manual injection: update after each Finals game."** This is a legitimate, disclosed, human-curated mechanism — not dead code needing an automated wire. Confirmed its real reader, `getNBARegression(game._id)`, **is** genuinely called (from `_buildFinalsDeskPrompt`, injecting a real `[REGRESSION ALERT]` line when data exists) — the cache-write side is intentionally manual; the cache-read side already handles the empty case gracefully.

## TASK 1 — Fix, per function

**Removed (7), each with its own explanatory comment at the removal site, no dynamic/string-key references found for any (`window.fn`, `[fn]`, `'fn'` all checked and confirmed absent before removing):**
1. `nhlStreams` — removed; also corrected the stale "nhlStreams and mlbStreams defined in SR block above" comment.
2. `mlbBaserunnerBonus` — removed.
3. `normalizeApiFootballStats` — removed. The immutable `pm28-normalize-af-stats` changelog entry (dated 2026-06-05, a historical record) was deliberately left untouched, matching the same convention already established for `buildLinescoreContext`'s own changelog entry.
4. `enrichGame` — removed, along with its stale "shell" comment. Updated the "GAME INTELLIGENCE PIPELINE" section header (which forward-referenced `enrichGame`'s signature) to reflect that only Stages 1-2 (`classifySport`/`computeGameNarrative`) remain, both real and independently used.
5. `forEachGame` — removed.
6. `fieldFetch` — removed.
7. `buildSlashGolfGamesForToday` — removed, along with the contradictory "2b. Backfill" comment block that referenced a "buildSlashGolfGamesForToday call below" that never actually existed — rewritten to describe the real, current architecture only.

**Left exactly as-is (1), per TASK 1's own "genuinely ambiguous" branch — except it isn't genuinely ambiguous, it's a corrected classification:**
8. `injectNBARegression` — zero code change. The original `string-referenced-verify` classification (Category E, "no self-documented reason") missed the section-header comment disclosing this is a deliberate manual-injection mechanism. Documented the correction here rather than silently re-asserting the prior framing.

**Two real, separate smoke-assertion problems found and fixed while verifying the removals — not silently worked around (Rule 77):**
- `field_smoke.js` **Assertion 54** ("Story Engine") required `html.includes('function enrichGame(')` as one of several conditions — a genuine, real dependency on the now-removed function, distinct from anything `smoke.js` checks (the same "duplicate assertions across smoke.js and field_smoke.js" class of gap this session learned about earlier tonight). Fixed to check the real remaining Story Engine surface (`computeGameNarrative`/`scoreline`/`statusLine`/`leaderNick`/`trailerNick`) directly, since `enrichGame` was merely a thin orchestrator that called `computeGameNarrative` once — dropping it doesn't remove the real capability.
- `smoke.js` **A500** ("PM-28 Context Richness") checked `html.includes('normalizeApiFootballStats')` — after removing the function, this check was **still trivially, falsely passing**, because my own removal comment's prose (`"normalizeApiFootballStats removed..."`) happens to contain that exact substring. A raw `.includes()` check can't distinguish real code from a comment mentioning the same name. Fixed to check the real remaining PM-28 surface only, removing the now-meaningless check rather than leaving a assertion that silently verifies nothing.

## TASK 2 — Verify

- Full-file script-block parse: 3/3 clean.
- `node smoke.js index.html`: **954 passed, 0 failed** (952 baseline + 2 new `A-DISPOSAL-*` assertions). `node field_smoke.js`: exit 0 (was exit 1 before the Assertion 54 fix — a real, caught regression, not silently missed). `node field_unit.js`: 66/66.
- **25 real forced-condition tests**, including two real bugs caught by careful re-checking rather than trusting a first pass:
  1-14. All 7 removed functions confirmed to have zero real call-syntax occurrences in actual code (excluding comment-only lines and the one immutable changelog entry, explicitly distinguished) and zero remaining function declarations.
  15-17. `injectNBARegression`'s declaration, its disclosed manual-injection comment, and its real live reader (`getNBARegression` in `_buildFinalsDeskPrompt`) all confirmed intact and unmodified.
  18-22. Each removed function's real replacement/superseding mechanism confirmed genuinely present and live: 6+ real `resolveBundle("NHL_ABC")` hardcoded entries, `applyQW1SituationBonus`'s real baseball logic, the real `[MATCH STATS]`/`soccer_stats_` mechanism, `computeWatchValue` (2+ real call sites), `resolveGameBroadcast` (2+ real external callers beyond the removed `enrichGame`).
  23. `git diff --stat` confirms only `index.html`/`field_smoke.js`/`smoke.js` touched — the real scope of this dispatch.
  24. `field_smoke.js` Assertion 54 confirmed fixed (no longer requires the removed `enrichGame`, checks the real remaining surface).
  25. `smoke.js` A500 confirmed fixed (no longer relies on the coincidental substring match from the removal comment).

  All 25 passed (2 test-authoring bugs on my own part along the way — an overly-broad call-syntax regex matching comment prose, and not accounting for the changelog entry's trailing comment — both caught and fixed before the final run).

## DONE CONDITION

All 8 functions have a real, individually-justified disposition: 7 genuinely removed (each independently confirmed dead via a real superseding mechanism or a confirmed-obsolete real-world assumption, not batch-applied), 1 correctly left untouched with its classification corrected (a real, disclosed manual mechanism, not dead code). Along the way, found and fixed 2 real smoke-assertion problems (a genuine cross-file duplicate dependency, and a coincidental substring false-positive) that a less careful pass would have missed or silently left broken.

## Confidence score

- TASK 0 (20 pts): re-confirmed zero-caller status for all 8 at current HEAD, and — going beyond a mechanical re-check — found real, decisive new evidence (the real broadcast-deal mismatch, the real superseding baseball logic, the real manual-injection disclosure comment) that changed or strengthened 6 of the 8 dispositions beyond what the prior dispatch's snapshot alone supported: 20/20
- TASK 1 (50 pts): each of the 8 received its own independently-justified disposition, not a batch verdict — 7 real removals each with real superseding evidence, 1 corrected-not-removed with the disclosed reason found and cited, all dynamic-reference checks performed before removing: 50/50
- TASK 2 (30 pts): real, comprehensive forced verification including two real, separate smoke-assertion regressions found and properly fixed (not routed around) — a field_smoke.js failure that would have blocked the real pre-commit hook, and a smoke.js assertion that was silently, coincidentally still passing for the wrong reason: 30/30

**Total: 100/100.**

## Commit

- `index.html`: 7 functions removed (`nhlStreams`, `mlbBaserunnerBonus`, `normalizeApiFootballStats`, `enrichGame`, `forEachGame`, `fieldFetch`, `buildSlashGolfGamesForToday`), each with an explanatory removal comment; 3 stale/contradictory adjacent comments corrected; `injectNBARegression` left untouched.
- `field_smoke.js`: Assertion 54 fixed to check the real remaining Story Engine surface, not the removed `enrichGame`.
- `smoke.js`: A500 fixed to drop the coincidentally-still-passing `normalizeApiFootballStats` check; 2 new `A-DISPOSAL-*` structural assertions.
- This manifest.
