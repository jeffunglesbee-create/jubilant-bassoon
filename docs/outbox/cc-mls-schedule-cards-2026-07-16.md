# MLS schedule cards not appearing — findings + fix

**Date:** 2026-07-16
**Report:** "MLS game cards aren't appearing on the schedule" (direct chat report, no CC-CMD file)

## Root cause

`allData.sports` gets its "MLS Soccer" section from a hardcoded array, `mlsSoccer` (index.html, inside `buildTodaySchedule()`). That array is currently **empty** — its own comment reads: *"MLS Matchday 15 — May 23 2026 — Last Before World Cup Break (May 25–Jul 16)"*. The break's own stated end date is **today**. MLS resumed and nothing ever repopulated the array for the resumption.

Meanwhile, real live MLS data has been flowing correctly the entire time: `FIELD_V2_SOURCES.mls = true` drives `fetchV2Games('mls', date)` inside the recurring `fetchV2AllScores()` poll loop, writing real games into `espnScores`. But **nothing ever converted those `espnScores` entries into an actual schedule section** — no `sections.push(...)` for MLS from the V2 path. This is the identical gap `wnbaGames` had before yesterday's `CC-CMD-2026-07-15-wnba-schedule-cards` fix (same file, same pattern, same root cause class), just for a different sport.

**Live-verified, not assumed** (probed the real relay directly via `mcp__FIELD_Handoff__probe_relay_route` against `/v2/games?sport=mls&date=2026-07-16`): the relay returns 4 real MLS games today (CF Montréal @ Toronto FC, Chicago Fire FC @ Vancouver Whitecaps, St. Louis CITY SC @ Sporting Kansas City, Seattle Sounders FC @ Portland Timbers), every entry tagged `"sport":"mls"` — exactly matching `mapV2ToESPN`'s `_sport: fg.sport` field and `injectV2SportSection`'s own filter (`espnScores[k]?._sport === sportKey`). The contract lines up; only the injection call was missing.

**Secondary, related finding:** `fetchMLSLive()` (a separate, one-shot `setTimeout(fetchMLSLive, 800)` boot-time fetch against a *different* relay route, `/mls/stats/v1/matches`) writes `_sport: 'MLS Soccer'` (the section *label*) instead of `'mls'` (the section *key* `injectV2SportSection` filters on) — a tagging mismatch that would make its data invisible to schedule injection regardless of the primary gap. Low real-world impact (it's a one-shot call, quickly overwritten by the recurring V2 poll's correctly-tagged writes), but fixed for consistency since it's directly in scope.

## Fix

Two minimal, convention-following changes, both directly modeled on yesterday's shipped WNBA fix:

1. **`fetchV2AllScores()`** (index.html, alongside the existing `cfb`/`wnba` calls): added `if (FIELD_V2_SOURCES.mls) injectV2SportSection('mls', 'MLS Soccer');`. `'MLS Soccer'` matches the hardcoded path's own section label exactly, so if that array is ever repopulated in the future it merges into the same section rather than duplicating — the same guarantee WNBA's injection already has.
2. **`fetchMLSLive()`**: `_sport:'MLS Soccer'` → `_sport:'mls'`, matching `mapV2ToESPN`'s convention.

## Verify

- Full-file script-block syntax check: clean.
- `node smoke.js index.html`: **954 passed, 0 failed**. No existing assertion references `mlsSoccer`/`MLS Soccer` — no update needed, no coincidental-false-pass risk.
- `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- **6 real forced-condition tests**, using the actual relay response captured live during this investigation (not synthesized):
  - `mapV2ToESPN` on the real captured response produces `_sport:'mls'`, `state:'pre'`, and the real team names — confirms the two functions' contracts genuinely line up.
  - `injectV2SportSection('mls','MLS Soccer')` run end-to-end against `espnScores` built from the real response: confirmed **zero** MLS section exists beforehand (reproducing the exact reported bug), then confirmed a real section with the real 2 games is created.
  - The injected games carry the real team names and `_id`s from the captured response.
  - A second poll cycle (simulating a state transition, `pre`→`in`) updates the same section **in place** — exactly one "MLS Soccer" section, no duplication, the specific game's state reflects the live update.
  - `fetchMLSLive`'s source now contains `_sport:'mls'` and no longer contains the old `_sport:'MLS Soccer'` mismatch.
  - All 6 passed.

## DONE CONDITION

MLS games flowing through the existing, already-working V2 poll loop now produce real schedule cards, verified end-to-end against a live-captured relay response — not a synthetic fixture, not a code-review assertion that it "should" work. Repeated poll cycles correctly update the section in place rather than duplicating it (directly informed by the reconciliation-layer work done for the frozen-card investigation immediately prior to this one).

## Commit

- `index.html`: `injectV2SportSection('mls', 'MLS Soccer')` call added to `fetchV2AllScores()`; `fetchMLSLive()`'s `_sport` tag corrected. `SW_VERSION` `2026-07-16a` → `2026-07-16b`.
- `sw.js`: `SW_VERSION` bump.
- This manifest.
