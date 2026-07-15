# Claude Code Command — Remove confirmed dead-by-design orphaned functions

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-orphan-cleanup-dead-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

A tree-sitter orphaned-function sweep tonight found 25 genuine orphans (0 real code references, 0 stray text mentions) across the file. A deep, individual investigation of all 25 (this conversation, same session) confirmed 8 as genuinely dead-by-design — superseded vendor integrations or never-adopted alternate implementations, none representing missing functionality:

- `fetchMLSGoals` (+ its `_mlsGameOptaIds`/Opta-ID-tracking cluster) — dead Opta-based MLS vendor, superseded by `stats-api.mlssoccer.com` (confirmed in prior session history)
- `bdlFetchStats`, `bdlContextForGame` (+ `bdlCache`/`BDL_SPORT_MAP` if confirmed unused by anything else) — BALLDONTLIE API wrapper, superseded by a later consolidation
- `fetchNBAChannelsViaRelay`, `fetchAFLStandings` — same consolidation-remnant pattern
- `logoImg` — never-adopted wrapper around `getTeamLogo`, which is called directly elsewhere instead
- `$`, `$$` — jQuery-style DOM helpers, zero real call sites confirmed (3 total mentions in the whole file: the two definitions plus one comment example)

**Explicitly NOT in scope — do not touch:** `buildStatOfDayBadge`, `isPlayoffGame`, `dropGameSocket`, `dispatchFieldScore`, `fetchLastMeeting`, `fetchSlashGolfRankings`, `predictNextOpenHour` (confirmed needed, separate CC-CMDs), the 4 `_pl*Note` functions, `renderWCGroupsEmpty`, `buildRound`, `inEFLPlayoffs` (seasonal/reusable, separate CC-CMDs), `validateBundles`, `reportFieldRenderPipeline` (valid dev tooling, not being removed), `getEmberThreshold` (deliberately, correctly superseded for patent-safety reasons — leave it exactly as-is, do not touch even though it's an orphan).

## TASK 0 — Probe

Re-verify each of the 8 has zero real call sites, fresh, before removing anything — confirm nothing changed since tonight's sweep. For the two clustered cases (`fetchMLSGoals`'s Opta-ID tracking, `bdlFetchStats`/`bdlContextForGame`'s cache/map constants), check whether the supporting constants (`_mlsGameOptaIds`, `bdlCache`, `BDL_SPORT_MAP`) are used by anything else before removing them alongside the functions — do not assume the whole cluster is dead just because the entry-point functions are.

## TASK 1 — Remove

Remove each confirmed-dead function and its genuinely-orphaned supporting constants. Leave any constant/helper still referenced elsewhere untouched, even if it looks related.

## TASK 2 — Verify

- `node smoke.js index.html`: same pass count minus nothing (removing dead code shouldn't change assertion count unless a smoke assertion specifically referenced one of these functions — check for that case and handle it if found).
- Re-run the tree-sitter orphan sweep after removal: confirm these 8 no longer appear, confirm the remaining 17 (already categorized as needed/seasonal/dev-tooling/deliberately-superseded) are unaffected.
- Full-file parse clean.

## DONE CONDITION

8 confirmed-dead functions and their genuinely-orphaned supporting constants removed. Zero effect on any of the 17 other orphans or any live code. Smoke count accounted for.

**Confidence scoring:**
- TASK 0 (30 pts): re-verifies zero call sites fresh, correctly distinguishes genuinely-orphaned supporting constants from still-used ones
- TASK 1 (40 pts): removes exactly the 8 confirmed items, leaves everything else untouched
- TASK 2 (30 pts): smoke confirmed, re-run orphan sweep confirms clean removal with no collateral effect

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
