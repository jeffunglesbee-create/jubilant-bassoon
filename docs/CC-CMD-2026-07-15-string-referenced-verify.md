# Claude Code Command — Investigate the 27 genuinely unclear string-referenced functions

**Date:** 2026-07-15 (revised — this chat session solved the tree-sitter native-compilation blocker itself via `web-tree-sitter` (WASM, no `node-gyp`) and ran the sweep directly. Real findings below replace the original open-ended scope.)
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull.

Write findings to docs/outbox/cc-string-referenced-verify-2026-07-15.md. Commit with `[skip ci]`. Read-only investigation — no functional code change expected unless a real problem is found.

## CONTEXT — real findings from this chat session, not assumed

Ran the sweep directly (`web-tree-sitter` + `tree-sitter-javascript`'s own bundled `.wasm`, no native compilation needed — confirms this environment's own `tree-sitter`/`node-gyp` setup can be replaced; see the companion `web-tree-sitter-migration` CC-CMD). Real, current results against today's post-9-CC-CMD codebase:

**5 genuine orphans remain — confirmed this is exactly right, nothing missed:** `dispatchFieldScore`, `getEmberThreshold`, `renderWCGroupsEmpty`, `reportFieldRenderPipeline`, `validateBundles`. Every one of these is a real, deliberate "leave alone" case from tonight's own 9-CC-CMD batch (redundant debug utility, patent-safety-superseded, zero callers even after generalization, or valid orphaned dev tooling) — not a gap.

**The "29 string-referenced" bucket resolves into three real, distinct categories, not one:**

1. **13 real `onclick="...()"` inline references** — the literal mechanism the original report described: `_deskCardToggle`, `_wwFindCard`, `fetchMCPStatus`, `jumpToGameCard`, `makePick`, `openJournalismForGame`, `openWcGroup`, `pinGame`, `renderJournalismArchive`, `scrollToMediaSpecial`, `setViewerIntelMode`, `toggleStandings`, `unpinGame`. All 5 originally-named functions confirmed genuinely here.
2. **29 real indirect-call mechanisms** (`setTimeout(fn)`, `addEventListener(..., fn)`, `window.fn =`) — a broader, equally-legitimate category a simple AST call-expression walk can't see: `_bsdActivateForWC`, `bdlPrefetchAll`, `espnInjuriesPrefetch`, `fetchATPLiveScores`, `fetchMLSLive`, `fetchSoccerFixtures`, `initEPLMatchBriefs`, `initMLBGameBriefs`, `initSeriesPreviews`, `initStakesBriefs`, `initWNBAGameBriefs`, `mlbPitcherStatsInit`, `mlbProbablePitcherInit`, `mlbStatsInit`, `nbaCluichInit`, `nbaPlayerCluichInit`, `nbaPlayoffLeadersPrefetch`, `nhlAnalyticsInit`, `nhlGSAXInit`, `nhlPlayoffLeadersPrefetch`, `nhlSeriesInit`, `refreshMLBStatus`, `registerAnticipatoryPrefetch`, `renderFinalsDesk`, `runSilentErrorScan`, `slashGolfPrefetchAll`, `squigglePrefetchAll`, `uflEpaInit`, `weatherPrefetchAll`.
3. **27 matching neither pattern — genuinely unclear, the real remaining work:** `_computeSRPlayEPA`, `_hrdMapMatchup`, `_hrdRenderLeaderboardRow`, `_isUpset`, `_openGameSheetTablet`, `bdlInjuryContextSync`, `buildLinescoreContext`, `buildSlashGolfGamesForToday`, `claimCardRegion`, `enrichGame`, `fetchBDLRecentForm`, `fieldFetch`, `forEachGame`, `gameHasFreeStream`, `gameNetwork`, `getGameReasonTags`, `inEFLPlayoffs`, `injectNBARegression`, `markFreshnessLive`, `mlbBaserunnerBonus`, `nhlStreams`, `normalizeApiFootballStats`, `normalizeNBAGameRelay`, `squiggleToFieldGame`, `teamName`, `trackNHLPenaltyTransitions`, `updateRankedSlots`. Not confirmed orphans (something references each beyond its own declaration) but not accounted for by onclick or the 3 checked indirect-call mechanisms either — could be object-method shorthand, `FIELD_FEATURES[key]()`-style dynamic dispatch, a mechanism not yet checked for, or a genuine false positive from crude text-matching (comment mention, etc.).

Note `inEFLPlayoffs` appears in bucket 3 despite already being confirmed real and seasonal (protected via `CC-CMD-2026-07-15-seasonal-comments`) — its real call site just doesn't match the two mechanisms checked. A useful validation case: TASK 0 finding its real reference mechanism should also explain why it landed in this bucket, not bucket 1 or 2.

## TASK 0 — Investigate all 27, real evidence per function

For each of the 27: find its real reference mechanism directly (grep for the name, read the actual surrounding code — don't guess a category). Categorize each into: real-but-uncommon-mechanism (found how, confirmed live), genuine orphan mis-sorted by the crude text-match heuristic (a false positive — the only real mention is unrelated, e.g. a comment), or something requiring its own follow-up (rare, but possible for a name suggesting real functionality that turns out to be broken/unreachable).

## TASK 1 — Light verification of buckets 1 and 2 (already directly confirmed by this chat session, spot-check only)

Pick 3-4 from the 13 onclick-referenced and 3-4 from the 29 indirect-call functions, confirm the cited mechanism is real and the code path is genuinely reachable (not itself dead). This is a light sanity check, not a full re-derivation — this chat session already verified the raw pattern match directly; the goal here is confirming reachability, not re-finding the pattern.

## DONE CONDITION

All 27 genuinely unclear functions individually resolved with real evidence — reference mechanism found, or correctly reclassified as a genuine orphan if the original raw-text match was a false positive. Buckets 1 and 2 spot-checked for reachability, not just pattern presence.

**Confidence scoring:**
- TASK 0 (60 pts): all 27 investigated with real evidence, correct categorization (real mechanism found / genuine false-positive orphan / needs follow-up), not guessed
- TASK 1 (40 pts): real spot-check of both buckets confirms reachability, not just re-confirming what this chat session already found

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
