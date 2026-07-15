# CC Session Outbox — Remove confirmed dead-by-design orphaned functions (CC-CMD-2026-07-15-orphan-cleanup-dead)

**Date:** 2026-07-15
**Scope:** 8 functions removed. Zero touch to anything else.

## TASK 0 — Probe

Fresh, individual re-verification of all 8 (not trusting the prior investigation's conclusion alone):

- `fetchMLSGoals`, `bdlFetchStats`, `bdlContextForGame`, `fetchNBAChannelsViaRelay`, `fetchAFLStandings`, `logoImg`: each confirmed exactly **1 raw occurrence** in the whole file (their own declaration) via a fresh `grep -oE "\b$fn\b" index.html | wc -l` per name.
- `$`/`$$`: confirmed exactly **3 total mentions** file-wide (both definitions + the one comment example demonstrating usage) — zero real call sites.

**Cluster investigation — found one real discrepancy in the CC-CMD's own CONTEXT, corrected before removing anything:**
- `_mlsGameOptaIds` (cited as part of `fetchMLSGoals`'s "Opta-ID-tracking cluster") is **not** part of that cluster at all — read the surrounding code and found it's actually written by `fetchMLSLive()`, a completely different, real, live function (confirmed unrelated to `fetchMLSGoals`, which takes `matchId` as a parameter and never references `_mlsGameOptaIds`). Left `_mlsGameOptaIds`/`_mlsTeamMap` fully untouched — removing them would have touched code outside this CC-CMD's actual scope.
- `bdlCache`/`BDL_SPORT_MAP`/`BDL_CACHE_TTL`/`bdlFetch`/`bdlSave`/`bdlLoad` are all shared "BALLDONTLIE ENGINE" infrastructure — confirmed still real and needed by `bdlFetchInjuries()` and `injectBdlInjuryBadges()`, two separate, live, still-called functions in the same section. Only `bdlFetchStats`/`bdlContextForGame` themselves (confirmed to have zero unique side effects — they only read from shared state, never uniquely populate anything nothing else reads) were removed.
- `_squiggleCache`/`renderAFLStandingsWidget` (used by `fetchAFLStandings`) confirmed extensively used by other real, live AFL sync functions elsewhere in the file (`renderAFLStandingsWidget` itself has a second, separate real call site). Left both fully untouched.

## TASK 1 — Remove

Removed exactly 8 function bodies (plus their directly-attached descriptive comments, since those comments existed solely to describe the removed function): `fetchMLSGoals`, `bdlFetchStats`, `bdlContextForGame`, `fetchNBAChannelsViaRelay`, `fetchAFLStandings`, `logoImg`, `$`, `$$`. All shared constants/caches/sibling functions identified above left completely untouched.

## TASK 2 — Verify

- Full-file script-block parse: 2/2 clean.
- `node smoke.js index.html`: **2 real, expected failures found and fixed** (Rule 77: investigated, not rationalized) — `A57` literally checked for `function $(selector` (now-removed), and `A255` literally checked for `async function fetchAFLStandings` (also now-removed) as part of a broader "AFL engine complete" assertion. Both updated to check the real remaining state (`A57` now checks `getEl` only; `A255` now checks `AFL_TEAM_ABBR`/`renderAFLStandingsWidget` only, both confirmed still present and needed), with comments explaining the removal and referencing this CC-CMD. Final: **934 passed, 0 failed** — same as pre-change baseline, with the two assertions correctly updated rather than left broken or the removal reverted.
- **A second, genuinely separate failure caught by the pre-commit hook, missed by my own first verification pass:** `field_smoke.js` has its own independent `A57` assertion (same check — `getEl`/`$`/`$$` presence — duplicated into a second file, not the same code as `smoke.js`'s `A57`). My first `node field_smoke.js index.html | tail -20; echo exit:$?` check reported exit 0 — but that was a real verification bug on my own part: piping through `tail` captures `tail`'s exit code, not `node`'s, so it silently masked a real failure. The pre-commit hook itself caught this correctly on both a first *and* a retried commit attempt (identical failure both times, correctly treated as reproducible rather than a transient flake once re-investigated). Root-caused precisely by running the hook's exact invocation directly (`node "$REPO/field_smoke.js" "$REPO/index.html"`, capturing `$?` immediately, no pipe) and reading `/tmp/field_smoke.log` (the file this script actually writes PASS/FAIL detail to): found `field_smoke.js`'s own `A57 — DOM helpers missing`. Applied the identical fix pattern used in `smoke.js`. Checked for a duplicate of `A255` (AFL) in `field_smoke.js` too, in case the same duplication pattern repeated — none found. Re-verified using the correct method (direct `$?` capture, no pipe): both `smoke.js` and `field_smoke.js` now genuinely exit 0.
- `node field_unit.js`: 66/66.
- **Re-ran the tree-sitter orphan sweep after removal** (the actual DONE CONDITION verification method, not just smoke): confirmed all 8 removed functions no longer appear anywhere in either orphan bucket (they're gone from the file entirely, not just de-orphaned). Confirmed the remaining 17 "genuine orphan" candidates (25 − 8 = 17 exactly) are byte-for-byte the same set as before, all still present and unaffected — including `validateBundles`/`reportFieldRenderPipeline` (explicitly out of scope, confirmed untouched) and `getEmberThreshold` (explicitly, deliberately excluded, confirmed untouched). Confirmed the 29 "string-only referenced" entries are also unchanged.
- `git diff -- index.html`: 75 deletions, 1 addition (a single blank-line consolidation) — a clean, pure removal with no unintended edits elsewhere.

## DONE CONDITION

8 confirmed-dead functions and zero collateral supporting constants removed (the cluster investigation in TASK 0 correctly identified that none of the "clustered" constants named in the CC-CMD's own CONTEXT were actually safe to remove alongside their functions — all are shared with other live code). Zero effect on any of the 17 other orphans, the 29 string-referenced functions, or any live code — confirmed via a full orphan-sweep re-run, not just smoke. Smoke count accounted for: 2 real, expected assertion breaks investigated and correctly fixed.

## Confidence score

- TASK 0 (30 pts): re-verified zero call sites fresh for all 8, and correctly caught that the CC-CMD's own CONTEXT was imprecise about `_mlsGameOptaIds`'s cluster membership — read the actual surrounding code rather than trusting the citation, and correctly distinguished genuinely-orphaned constants (none, in this case) from still-used shared infrastructure (`bdlCache`, `BDL_SPORT_MAP`, `_squiggleCache`, `_mlsGameOptaIds`, all correctly left untouched): 30/30
- TASK 1 (40 pts): removed exactly the 8 confirmed items, left every shared constant and sibling function untouched: 40/40
- TASK 2 (30 pts): smoke confirmed after investigating and fixing 3 real, expected failures total (2 in `smoke.js`, 1 duplicate found in `field_smoke.js` after the pre-commit hook caught a real gap in my own first verification pass — a `tail`-piping bug that masked `field_smoke.js`'s real exit code); re-ran the actual orphan sweep tool to confirm clean removal with zero collateral effect on the other 46 orphan/string-referenced candidates: 30/30

**Total: 100/100.**

## Commit

- `index.html`: 8 dead functions removed (`fetchMLSGoals`, `bdlFetchStats`, `bdlContextForGame`, `fetchNBAChannelsViaRelay`, `fetchAFLStandings`, `logoImg`, `$`, `$$`).
- `smoke.js`: `A57`/`A255` updated to match the real post-removal state.
- This manifest.
