# CC Session Outbox — Pick 'em Full-Sport Coverage Check (CC-CMD-2026-07-05-pickem-coverage-check)

**Date:** 2026-07-05
**Scope:** `docs/CC-CMD-2026-07-05-pickem-coverage-check.md` — two fast,
non-visual scripts checking every sport (not just the two originally
reported), run after `CC-CMD-2026-07-05-pickem-cfl-mlb-gaps.md` completed.

## Prerequisite confirmed before starting

```
$ ls docs/outbox/ | grep -i "cfl-mlb-gaps\|pickem-cfl-mlb"
cc-pickem-cfl-mlb-gaps-2026-07-05.md
```
Confirmed present. Did not run concurrently with that CC-CMD.

## TASK 1 — Pure-data list-inclusion check, every sport

`pickem_circadian_coverage_check.js` — ports `getCardCircadian()`'s exact
logic verbatim (confirmed a genuine pure function: zero `document`/`window`
references in it or `isGameOver()`), fetching real, current data directly
from the same real endpoints proven live in the prerequisite CC-CMD (V2
relay `/v2/games`, the CFL rounds endpoint, the Squiggle AFL relay proxy).
For every sport, keeps only games the raw data itself confirms are not yet
started, then checks whether `getCardCircadian()` classifies them as
`PREVIEW`.

**Result** (`outbox/pickem-coverage-check-2026-07-05T2057Z.txt`, CI run
`28754654935`):

| Sport | Total games | Confirmed pregame | Passed | Result |
|---|---|---|---|---|
| MLB | 15 | 3 | 3 | **PASS** |
| WNBA | 2 | 1 | 1 | **PASS** |
| WC (Soccer) | 2 | 1 | 1 | **PASS** |
| CFL | 1 | 1 | 1 | **PASS** |
| NBA | 0 | — | — | N/A (no games returned — off-season) |
| NHL | 0 | — | — | N/A (no games returned — off-season) |
| EPL | 0 | — | — | N/A (season ended, `FIELD_V2_SOURCES.epl:false`) |
| NFL | 0 | — | — | N/A (not yet in season, date-gated `false`) |
| CFB | 0 | — | — | N/A (not yet in season, date-gated `false`) |
| MLS | 0 | — | — | N/A (no games returned today) |
| AFL | 0 | — | — | N/A (no games today on the AEST calendar day, rounds 17/18 checked) |

**Overall: `RESULT: PASS`** — every sport with a real, confirmed-pregame
game today classified correctly as `PREVIEW`. No new circadian-gating
failures found beyond what the prerequisite CC-CMD already fixed for MLB
(and, incidentally, for every OTHER V2-sourced sport that shares
`mapV2ToESPN()` — WNBA and WC/soccer both exercised that exact same fixed
code path here and passed, confirming the fix's benefit extends beyond the
single sport it was reported for).

## TASK 2 — jsdom-based post-pick-display check, every sport

`pickem_jsdom_display_check.js` — ports `makePick()`/`buildPickWidgetHTML()`
verbatim, stubs `initUserDO()`/`_userDoRelay()` (this check is specifically
about the DOM-manipulation half already verified live for real relay
round-trips in the prerequisite CC-CMD, not the network layer), fetches
one real game per sport from the same endpoints, constructs a minimal
jsdom DOM with one `.pick-widget`, and confirms `makePick()` correctly
produces the "pick made" confirmation HTML.

**Result** (same file, same CI run):

| Sport | Real game used | Result |
|---|---|---|
| MLB | New York Mets @ Atlanta Braves | **PASS** |
| WNBA | Dallas Wings @ Toronto Tempo | **PASS** |
| WC (Soccer) | Norway @ Brazil | **PASS** |
| AFL | Brisbane Lions @ Geelong | **PASS** |
| CFL | Saskatchewan Roughriders @ Calgary Stampeders | **PASS** |
| NHL / NBA / EPL / CFB / MLS / NFL | — | N/A (no real game available today, matching TASK 1's off-season findings) |

**Overall: `RESULT: PASS`** — every sport with a real game available today
displays its pick confirmation correctly, including CFL (the originally-
reported sport, confirmed working, matching the prerequisite CC-CMD's own
live-browser finding) and every other sport that wasn't part of the
original report.

## TASK 3 — Honest findings, no assumptions

Every sport in the CC-CMD's own list (MLB/WNBA/NBA/AFL/WC/CFL/NHL/MLS/
EPL/NFL/CFB) was checked by both scripts, independent of whether it
appeared in the original bug report. Sports with no real data today are
reported as N/A with the specific reason (off-season / date-gated /
no games scheduled), not silently assumed to pass or skipped.

## TASK 4 — Fix any newly-found real failures

**None found.** Both scripts passed for every sport with real data
available. No code changes were needed or made this session — the fixes
already applied in `CC-CMD-2026-07-05-pickem-cfl-mlb-gaps` (the
`mapV2ToESPN()` clock/score heuristic fix and the CFL `checkForNewFinals()`
fallback) hold broadly across every sport that shares those code paths,
not just the two originally reported.

## DONE CONDITIONS

- [x] Prerequisite CC-CMD confirmed complete before starting
- [x] Pure-data list-inclusion script built and run against every real sport
- [x] jsdom-based post-pick-display script built and run against every real sport
- [x] All findings reported honestly, pass or fail, per sport
- [x] Any newly-found genuine failures fixed (none found — nothing to fix)
- [x] Outbox manifest written (this document)

## Confidence scoring (per the CC-CMD's own table)

- +15 — prerequisite confirmed complete before starting
- +30 — pure-data script correctly covers every requested sport, zero rendering
- +30 — jsdom script correctly covers every requested sport, zero full-browser use
- +25 — no newly-found failures existed; this was verified rather than assumed, and reported honestly

**Total: 100/100.**

## Commits

- `20758d7` — both scripts + workflow
- `69da522` — CI-committed result
- This manifest
