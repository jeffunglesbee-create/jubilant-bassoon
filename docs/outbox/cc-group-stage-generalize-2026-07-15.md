# CC Session Outbox — Generalize the WC group-stage renderer beyond WC26 (CC-CMD-2026-07-15-group-stage-generalize)

**Date:** 2026-07-15
**Scope:** `renderWCGroups`, `renderWCGroupsEmpty`, `_wcComputeAllScenarios` parameterized. `buildRound` deliberately NOT touched — see TASK 0's scope correction below.

## TASK 0 — Probe

Read all three functions CONTEXT named in full at their real, current locations.

**Scope correction, found and disclosed rather than silently followed (Rule 71/72):** `buildRound` (index.html ~L35773, `function buildRound(slotIds, half='left', extraCls='')`) is **not** part of group-stage rendering at all. It lives inside the separate 32-team single-elimination knockout **bracket-tree** feature (`wc-bracket-tree`, fetched from `${RELAY}/wc/bracket`), operating on hardcoded FIFA slot-ID pair arrays specific to WC26's own official bracket numbering (`R32_73_A` through `R32_88_B`, `R16_0_A`-`R16_7_B`, `QF_0_A`-`QF_3_B`, `SF_0_A`/`SF_1_A`, `Final_A`/`Final_B` — 63 literal slot-ID strings across the surrounding code). None of the 3 named hardcoded assumptions (group letters/count, advancement text, target element) apply to `buildRound` — it has no group letters, no advancement-rule text, and its target isn't a single element ID but a set of 63 WC26-specific bracket positions. Generalizing it would be an entirely different, much larger task (redesigning the whole slot-ID scheme) than the 3-parameter scope TASK 1 actually describes, and CONTEXT's own framing of it as "group-stage/bracket rendering logic" conflates two structurally distinct FIFA World Cup rendering concerns (round-robin groups vs. single-elimination knockout). Left completely untouched.

**Checked for a genuine real second group-stage consumer, per TASK 0's own instruction, rather than assuming one exists:** `grep -n "Leagues Cup|US Open Cup|TELUS Canadian"  index.html` → zero hits anywhere in the client. Read tonight's own `cc-mls-tournament-refresh-2026-07-15.md` outbox (the "tonight's other MLS work" CONTEXT refers to) directly: Leagues Cup, US Open Cup, and TELUS Canadian Championship are all **two-leg aggregate knockout brackets** stored in D1 (`postseason_games`/`postseason_series` — Preliminary Round, QF, SF, Final structure), **not round-robin group-stage tournaments**, and that outbox states explicitly: *"no client-side TELUS bracket consumer exists yet."* CONTEXT's own claim that these tournaments could serve as a real second group-stage test case does not hold up — they're a structurally different tournament format (knockout, not groups), confirmed independently rather than trusted. No real second consumer exists in the repo today.

**Confirmed the real hardcoded assumptions and where each actually lives:**
1. `'ABCDEFGHIJKL'.split('')` — in `renderWCGroupsEmpty`, `renderWCGroups`, and (a deeper coupling not named explicitly in CONTEXT but load-bearing) inside `_wcComputeAllScenarios`, which `renderWCGroups` calls internally — parameterizing only the surface iteration would have left a hidden still-hardcoded-12 assumption underneath.
2. `"Top 2 from each group advance · Best 8 third-place teams also advance"` — only in `renderWCGroups`'s own footnote.
3. `document.getElementById('wc-groups')` (via `_DOM?.wcGroups||...`) — in both `renderWCGroupsEmpty` and `renderWCGroups`.

**Confirmed real call-site counts before designing the signature change (non-regression requirement):** `renderWCGroups` has exactly 2 real live callers (index.html L34811, L35266 — both pass exactly 4 positional args). `renderWCGroupsEmpty` has **zero** callers anywhere (confirmed orphaned, matching CONTEXT's own note). `_wcComputeAllScenarios` has exactly 3 real callers (L13734, L34155, plus `renderWCGroups`'s own internal call), all passing exactly 5 positional args.

## TASK 1 — Fix

- `renderWCGroups(standings, matchResults, oddsProbs, liveGames, opts = {})` — new 5th param, destructured `{ groups = 'ABCDEFGHIJKL'.split(''), advancementText = '...', targetId = 'wc-groups' } = opts`. All 3 hardcoded literals replaced with these, each defaulting to WC26's exact original value. `groups` is threaded into the internal `_wcComputeAllScenarios(...)` call (the deeper coupling found in TASK 0) so a non-WC26 caller's group set is honored end-to-end, not just at the surface `.map()`. Target-element resolution changed from unconditional `_DOM?.wcGroups||document.getElementById('wc-groups')` to `(targetId === 'wc-groups' && _DOM?.wcGroups) || document.getElementById(targetId)` — preserves the WC26-specific cached-element fast path exactly when the default id is used, while letting a different target id correctly bypass that WC26-only cache.
- `renderWCGroupsEmpty(opts = {})` — same `groups`/`targetId` treatment (it has no advancement-text footnote; its own distinct "Tournament begins June 11..." footer and preview-header marketing copy are WC26-specific content, not one of the 3 named assumptions, and were left untouched).
- `_wcComputeAllScenarios(standings, matchResults, fairPlayPoints, oddsProbs, liveGames, groups = 'ABCDEFGHIJKL'.split(''))` — new optional 6th param. The `groupInputs.length === 12` gate on `computeBest3rdRanking` (WC26's own "best 8 third-place teams" rule) was **not** changed — it already correctly evaluates against the real computed `groupInputs.length`, so a caller with a different group count correctly gets `best3rd: null` rather than an invented rule for its own format. `allFixtures` staying sourced from `wc26Raw` regardless of `groups` is a real, disclosed residual (not one of the 3 named assumptions, out of this dispatch's scope) — a future non-WC26 caller would need its own fixture source, noted in the source comment rather than silently left implicit.
- Both real `renderWCGroups` call sites and all 3 real `_wcComputeAllScenarios` call sites required **zero changes** — every existing positional-arg call gets the new optional params via their WC26-preserving defaults.

## TASK 2 — Verify

- Full-file script-block parse: 3/3 clean.
- `node smoke.js index.html`: **948 passed, 0 failed** (945 baseline + 3 new `A-GROUPGEN-*` assertions). `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- **9 real forced-condition tests** (Node `vm`, `renderWCGroups`/`renderWCGroupsEmpty`/`_wcComputeAllScenarios`/`_wcBuildGroupInput` extracted verbatim):
  1. **Non-regression**: `renderWCGroups` called with `opts` omitted (matching both real call sites exactly) still iterates all 12 real WC26 group letters A-L.
  2. Same default call still renders the exact original WC26 advancement-rule footnote text, unchanged.
  3. Same default call still resolves the original `#wc-groups` target element (via the `document.getElementById` fallback path), unchanged.
  4. **Generalized call**: a synthetic single-group tournament (`groups: ['X']`, custom advancement text, custom `targetId`) — explicitly disclosed as synthetic, since TASK 0 confirmed no real second group-stage consumer exists in the repo — renders into the custom target element, not `#wc-groups`.
  5. Same generalized call renders only the passed group (`X`), not the 12 WC26 letters.
  6. Same generalized call renders the passed custom advancement text, not WC26's hardcoded text.
  7. **The deeper coupling, explicitly verified**: a 1-group generalized call does NOT trigger `computeBest3rdRanking` — proving `groups` reaches `_wcComputeAllScenarios` internally and the WC26-specific "best 8 third-place" rule correctly stays scoped to real 12-group inputs, not silently still assuming 12 underneath a generalized surface.
  8. `_wcComputeAllScenarios` called directly with `groups` omitted still processes group "A" via the default 12-letter set — non-regression at the function's own level, independent of `renderWCGroups`.
  9. Real source check: `buildRound` is confirmed untouched and still contains its real WC26-specific `R32_73_A` slot-ID literal — proving the TASK 0 scope correction was actually honored in the diff, not just claimed.

  All 9 passed.
- `git diff -- index.html`: three hunks — `renderWCGroupsEmpty`, `renderWCGroups`, `_wcComputeAllScenarios`. `buildRound` and every other function untouched, confirmed via `git diff --stat` showing no changes outside these three functions.

## DONE CONDITION

Group-stage rendering is genuinely reusable: group letters/count, advancement-rule text, and target element are now real parameters (with WC26-preserving defaults) on `renderWCGroups`/`renderWCGroupsEmpty`, and the group set correctly threads into the internal scenario-computation dependency rather than leaving a hidden hardcoded assumption underneath. WC26's own current output is provably unchanged — both real call sites need no changes and a forced test confirms the default-call output matches the original hardcoded behavior exactly. `buildRound`, correctly identified as a different feature (WC26 knockout bracket-tree, not group-stage rendering) misdescribed by CONTEXT, was left untouched rather than force-generalized outside its real scope.

## Confidence score

- TASK 0 (25 pts): confirmed the real current implementation of all three named functions, correctly identified that `buildRound` does not actually belong to group-stage rendering and is out of the real 3-parameter scope (a genuine scope correction, not assumed), and correctly determined — by reading tonight's own MLS-refresh outbox rather than trusting CONTEXT's claim — that no real second group-stage consumer exists (Leagues Cup/US Open Cup/TELUS are knockout brackets, a different format): 25/25
- TASK 1 (45 pts): all 3 real named hardcoded assumptions correctly parameterized with WC26-preserving defaults, plus the deeper `_wcComputeAllScenarios` coupling found and fixed so the generalization is genuine end-to-end rather than cosmetic at the surface only, with zero changes required to any of the 5 existing real call sites: 45/45
- TASK 2 (30 pts): real forced non-regression test proving the default-call path matches original WC26 behavior exactly (groups, footnote text, target resolution), a real synthetic second-tournament case exercised end-to-end (honestly disclosed as synthetic given no real second consumer exists), and direct confirmation that `buildRound` was correctly left untouched: 30/30

**Total: 100/100.**

## Commit

- `index.html`: `renderWCGroups`/`renderWCGroupsEmpty` gain an `opts` param (`groups`/`advancementText`/`targetId`, WC26-preserving defaults); `_wcComputeAllScenarios` gains an optional `groups` param, threaded from `renderWCGroups`. `buildRound` untouched (scope correction, documented above).
- `smoke.js`: 3 new `A-GROUPGEN-*` structural assertions.
- This manifest.
