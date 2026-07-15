# Claude Code Command — Investigate the 26 genuinely unclear string-referenced functions

**Date:** 2026-07-15 (revised — this chat session solved the tree-sitter native-compilation blocker itself via `web-tree-sitter` (WASM, no `node-gyp`) and ran the sweep directly. Real findings below replace the original open-ended scope.)
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull.

Write findings to docs/outbox/cc-string-referenced-verify-2026-07-15.md. Commit with `[skip ci]`. Read-only investigation — no functional code change expected unless a real problem is found.

## CONTEXT — real findings from this chat session, not assumed

Ran the sweep directly (`web-tree-sitter` + `tree-sitter-javascript`'s own bundled `.wasm`, no native compilation needed — confirms this environment's own `tree-sitter`/`node-gyp` setup can be replaced; see the companion `web-tree-sitter-migration` CC-CMD). Real, current results against today's post-9-CC-CMD codebase:

**5 genuine orphans remain — confirmed this is exactly right, nothing missed:** `dispatchFieldScore`, `getEmberThreshold`, `renderWCGroupsEmpty`, `reportFieldRenderPipeline`, `validateBundles`. Every one of these is a real, deliberate "leave alone" case from tonight's own 9-CC-CMD batch (redundant debug utility, patent-safety-superseded, zero callers even after generalization, or valid orphaned dev tooling) — not a gap.

**Correction, found by this chat session after this doc's own first draft: add a 6th genuine orphan, `teamName` (index.html L41711, `function teamName(g){ return getTeamNick(g.away)||g.away||''; }`).** The sweep script's crude text-match heuristic wrongly placed it in the 27-unclear bucket — its 73 raw-text "mentions" are overwhelmingly `teamName` used as a *parameter name* in dozens of unrelated functions (`getTeamLogo(teamName, sport)`, `getStandingVelocity(sport, division, teamName, ...)`, etc.), not references to this specific function. Confirmed directly: zero real `teamName(...)` call sites exist anywhere. TASK 0 should independently re-confirm this (don't just trust this correction), and decide whether it's dead-by-design (a likely-superseded convenience wrapper, matching tonight's earlier `logoImg`/`buildStatOfDayBadge` shape) or worth wiring — this doc takes no position, that's real TASK 0 work.

**The "29 string-referenced" bucket resolves into three real, distinct categories, not one:**

1. **13 real `onclick="...()"` inline references** — the literal mechanism the original report described: `_deskCardToggle`, `_wwFindCard`, `fetchMCPStatus`, `jumpToGameCard`, `makePick`, `openJournalismForGame`, `openWcGroup`, `pinGame`, `renderJournalismArchive`, `scrollToMediaSpecial`, `setViewerIntelMode`, `toggleStandings`, `unpinGame`. All 5 originally-named functions confirmed genuinely here.
2. **29 real indirect-call mechanisms** (`setTimeout(fn)`, `addEventListener(..., fn)`, `window.fn =`) — a broader, equally-legitimate category a simple AST call-expression walk can't see: `_bsdActivateForWC`, `bdlPrefetchAll`, `espnInjuriesPrefetch`, `fetchATPLiveScores`, `fetchMLSLive`, `fetchSoccerFixtures`, `initEPLMatchBriefs`, `initMLBGameBriefs`, `initSeriesPreviews`, `initStakesBriefs`, `initWNBAGameBriefs`, `mlbPitcherStatsInit`, `mlbProbablePitcherInit`, `mlbStatsInit`, `nbaCluichInit`, `nbaPlayerCluichInit`, `nbaPlayoffLeadersPrefetch`, `nhlAnalyticsInit`, `nhlGSAXInit`, `nhlPlayoffLeadersPrefetch`, `nhlSeriesInit`, `refreshMLBStatus`, `registerAnticipatoryPrefetch`, `renderFinalsDesk`, `runSilentErrorScan`, `slashGolfPrefetchAll`, `squigglePrefetchAll`, `uflEpaInit`, `weatherPrefetchAll`.
3. **26 matching neither pattern — genuinely unclear, the real remaining work:** `_computeSRPlayEPA`, `_hrdMapMatchup`, `_hrdRenderLeaderboardRow`, `_isUpset`, `_openGameSheetTablet`, `bdlInjuryContextSync`, `buildLinescoreContext`, `buildSlashGolfGamesForToday`, `claimCardRegion`, `enrichGame`, `fetchBDLRecentForm`, `fieldFetch`, `forEachGame`, `gameHasFreeStream`, `gameNetwork`, `getGameReasonTags`, `inEFLPlayoffs`, `injectNBARegression`, `markFreshnessLive`, `mlbBaserunnerBonus`, `nhlStreams`, `normalizeApiFootballStats`, `normalizeNBAGameRelay`, `squiggleToFieldGame`, `trackNHLPenaltyTransitions`, `updateRankedSlots`. Not confirmed orphans (something references each beyond its own declaration) but not accounted for by onclick or the 3 checked indirect-call mechanisms either — could be object-method shorthand, `FIELD_FEATURES[key]()`-style dynamic dispatch, a mechanism not yet checked for, or a genuine false positive from crude text-matching (comment mention, or — as `teamName` itself turned out to be — a common parameter/variable name colliding with an unrelated function's own name; check for this specific failure mode on each of the 26, not just assumed absent).

Note `inEFLPlayoffs` appears in bucket 3 despite already being confirmed real and seasonal (protected via `CC-CMD-2026-07-15-seasonal-comments`) — its real call site just doesn't match the two mechanisms checked. A useful validation case: TASK 0 finding its real reference mechanism should also explain why it landed in this bucket, not bucket 1 or 2.

## TASK 0 — Investigate all 26, real evidence per function

For each of the 26: find its real reference mechanism directly (grep for the name, read the actual surrounding code — don't guess a category). Check specifically for `teamName`'s own failure mode first (a common parameter/variable name elsewhere colliding with this function's name, inflating the raw mention count with zero real calls) before assuming a real-but-uncommon mechanism exists. Categorize each into: real-but-uncommon-mechanism (found how, confirmed live), genuine orphan mis-sorted by the crude text-match heuristic (a false positive), or something requiring its own follow-up.

## TASK 1 — Light verification of buckets 1 and 2 (already directly confirmed by this chat session, spot-check only)

Pick 3-4 from the 13 onclick-referenced and 3-4 from the 29 indirect-call functions, confirm the cited mechanism is real and the code path is genuinely reachable (not itself dead). This is a light sanity check, not a full re-derivation — this chat session already verified the raw pattern match directly; the goal here is confirming reachability, not re-finding the pattern.

## DONE CONDITION

All 26 genuinely unclear functions individually resolved with real evidence — reference mechanism found, or correctly reclassified as a genuine orphan if the original raw-text match was a false positive (matching the `teamName` failure mode or a different one). Buckets 1 and 2 spot-checked for reachability, not just pattern presence. `teamName` itself, now confirmed a genuine orphan, decided (dead-by-design vs. worth wiring) with real reasoning, matching the treatment tonight's other confirmed orphans already got.

**Confidence scoring:**
- TASK 0 (60 pts): all 26 investigated with real evidence, correct categorization, not guessed
- TASK 1 (40 pts): real spot-check of both buckets confirms reachability, not just re-confirming what this chat session already found

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
