# CC Session — Bottom Sheet / Stats Tab Reconciliation
**Date:** 2026-07-20
**CC-CMD:** docs/CC-CMD-2026-07-19-bottom-sheet-stats-reconciliation.md
**HEAD start:** 645fa96
**HEAD end:** 8c501b4
**Commit:** 8c501b4 — feat: relocate per-game sections from bottom sheet to Stats tab Today's Games

---

## TASK 1 — Today's Games sub-section (Scouting Report + Standings + Milestone) ✅

New block in `renderStatsSection()` (inserted after MLS block, before `!blocks.length` guard).
Iterates `allData?.sports` → games. Per game:
- `buildScoutingReport(game, sport)` called directly (reused, not reimplemented)
- Standings from `_relayStandingsCache?.[sport]` with same teamNick-slug lookup as openBottomSheet
- Series margins from `buildSeriesMarginsDots(game)`
- Milestone alert from `_bdlMilestonesCache?.[gameId]`

Per-game pattern distinct from leaderboard `row()` format — each game gets its own `stats-subsection` wrapper labeled "Away @ Home".

## TASK 2 — BSD Pitch moved to Stats tab ✅

`bsd-pitch` div, `_bsdActivate(_tgBsdId)` call, and post-game R2 fetch all moved to Today's Games block.
- Live gating (`state === 'in'`) preserved exactly
- Idempotency preserved (same `_bsdActivate` call)
- Only the FIRST game with `bsdEventId` gets the pitch (hardcoded `bsd-pitch` ID in `_bsdRepaint`)
- Post-game fetch: `_tgEData?.state === 'post' || 'final'` gating, assigns `_bsdShotData`, calls `_bsdRepaint()`

## TASK 3 — Comeback Probability moved to Stats tab ✅

`buildComebackProbability()` output rendered per game in Today's Games block.
`dramaLabel_bs` (drama tier label) kept in bottom sheet Live Intelligence — patent-load-bearing per RUWT.
Bottom sheet Live Intelligence simplified to `dramaLabel_bs` only, no cb.

## TASK 4 — Clean removal from openBottomSheet ✅

Removed variables:
- `cb` (buildComebackProbability)
- `milestone`, `milestoneStr`
- `seriesMargins` (buildSeriesMarginsDots)
- `_bsIsWC`, `_bsBsdEventId`
- `standings`, `standingsStr` lookup block
- `scoutReport` (buildScoutingReport)
- Post-game R2 fetch block

Template changes:
- `${scoutReport}` removed
- Live Intelligence: `(dramaLabel_bs||cb)` → `dramaLabel_bs` only
- Context: `||milestoneStr` removed from condition; body simplified to `matchupNote||localNote`
- Standings section `${standingsStr||seriesMargins ? ...}` removed
- BSD pitch section `${_bsBsdEventId ? ...}` removed

## TASK 5 — Verification ✅

Smoke assertions A_BSD_9 and A_BSD_10 updated to match new location in `renderStatsSection` (were checking openBottomSheet template variables that no longer exist there).
Final smoke: **962 passed, 0 failed**.

## Smoke delta

| Point | Count |
|-------|-------|
| Start | 962 |
| End | 962 |

No net smoke change (2 assertions updated to new design, same total count).

## Integration status

| Component | Status |
|-----------|--------|
| renderStatsSection Today's Games | STAGED — requires live data (allData.sports, espnScores, _relayStandingsCache) to render non-empty |
| buildScoutingReport in Stats tab | STAGED — renders correctly whenever allData has MLB games with scouting data |
| BSD pitch in Stats tab | STAGED — fires when eData.bsdEventId present on a live or post-game entry |
| Bottom sheet cleanup | VERIFIED — no orphaned variables, smoke clean |

## Carry-forwards

None. All 5 CC-CMD tasks executed.
