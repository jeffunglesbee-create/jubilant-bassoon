# CC Session — pl-final-day-wiring
**Date:** 2026-07-30
**CC-CMD:** docs/CC-CMD-2026-07-30-wire-pl-final-day-stakes.md
**Repo:** jubilant-bassoon
**HEAD at close:** 24061749

---

## Task 1 — Re-verified from HEAD

`PL_FD` and the four note functions located fresh at src/legacy/field.js
~8452-8492 (line numbers already stale by the CC-CMD's own admission,
confirmed current at time of edit). Signatures confirmed: all four are
zero-arg functions returning plain strings (`_plTitleNote()`,
`_plCityNote()`, `_plTotNote()`, `_plWhuNote()`).

`PL_FD`'s hardcoded values confirmed still the 2025-26 season's real
numbers (Arsenal 82pts/champions, Man City 78pts, Bournemouth 56pts,
Tottenham 38pts, West Ham 36pts, Burnley/Wolves relegated) — not
refreshed since the earlier audit, and not stale in any NEW way either.

---

## Task 2 — Injection point chosen

**Chosen: `applyNarrativeContext(eplGames)`'s existing call site**
(src/legacy/field.js ~8711, inside `buildTodaySchedule()`). This is the
established per-game injection pipeline already reused for
`elimination_boost` across every other sport (NBA/NHL/MLB/MLS/UCL/UEL/
UECL/EFL). Added one line immediately after it:
`eplGames.forEach(_applyPLFinalDayNote);`

`_applyPLFinalDayNote(g)` sets `g.matchupNote` (deliberately not
`g.narrative`/`g._gameImportance` — a distinct field, matching what the
four note functions are meant to populate) when both:
1. A team-name match against Arsenal/Man City/Tottenham/West Ham
   (regex-matched against `g.home`/`g.away`, case-insensitive, covering
   common name variants e.g. "Spurs").
2. `g.start_time` matches `PL_FINAL_DAY_DATE = '2026-05-24'` (the real
   date `PL_FD`'s data represents).

Never overrides an existing `matchupNote`. Priority order (Arsenal/City
before Tottenham/West Ham) matches `PL_FD`'s own comment ordering
(title race is the marquee story, relegation battle second).

---

## Task 3 — Data refresh: correctly NOT done

Confirmed the 2026-27 Premier League season has not started (verified
earlier this session: EPL scoreboard query returns zero events, season
starts August 21, 2026). This season's real Final Day is many months
away — not imminent. Per the CC-CMD's explicit instruction, left
`PL_FD`'s 2025-26 data as-is; wiring the caller with existing data is the
correct scope. This makes the whole feature intentionally seasonal and
dormant right now — the same pattern already established and endorsed in
this file for `inEFLPlayoffs()` (`EFL_PLAYOFF_START`/`END`,
~14042-14044): reactivates every real Final Day by refreshing `PL_FD` +
`PL_FINAL_DAY_DATE` together, not something to delete for looking
orphaned between seasons.

---

## Task 4 — Reachability verified via direct evaluation, not just inspection

Extracted the exact committed function bodies (`PL_FD`, all four note
functions, `_applyPLFinalDayNote`) verbatim from the committed file and
ran them in Node against 6 real-shaped game objects:

```
{"home":"Crystal Palace","away":"Arsenal","date":"2026-05-24","matchupNote":"Arsenal are confirmed Premier League champions 2025-26 — this match is a title celebration at Selhurst Park."}
{"home":"Manchester City","away":"Aston Villa","date":"2026-05-24","matchupNote":"Arsenal are confirmed Premier League champions after City drew 1-1 at Bournemouth. Haaland's late equalizer kept City alive on the night but can't bridge the 1-point gap. City finish runners-up."}
{"home":"Tottenham Hotspur","away":"Everton","date":"2026-05-24","matchupNote":"Spurs need a point to guarantee survival. West Ham are 2 pts behind with a +13 GD deficit — but a defeat here and West Ham still have a lifeline if Everton win."}
{"home":"Newcastle United","away":"West Ham United","date":"2026-05-24","matchupNote":"West Ham need to win AND rely on Everton to beat Spurs at the Tottenham Hotspur Stadium simultaneously. Spurs lead by 2 pts and +13 GD — only maximum points across both venues saves them."}
{"home":"Brighton","away":"Fulham","date":"2026-05-24","matchupNote":null}
{"home":"Arsenal","away":"Chelsea","date":"2026-07-30","matchupNote":null}
```

All four notes fired with their real, correct text for the 4 matching
games. Both negative controls (unrelated team on the right date; a
matching team on the wrong date) correctly stayed unset — proving the
date gate and team gate both actually function, not just that the happy
path runs.

`node field_smoke.js index.html`: `Failures: 0`.
`node smoke.js index.html`: `965 passed, 0 failed`.

---

## Explicitly NOT touched (per CC-CMD scope)

- The general domestic-league relegation/title/aggregate formula (the
  broader "soccer four-layer formula") — confirmed absent in any form
  this session, materially larger effort, not this CC-CMD.
- La Liga, Serie A, or any other league's relegation battles — PL Final
  Day only, matching what already existed.
- `sitBonus`, `dramaScoreLive`, any live in-game scoring path — this is
  pre-game/day-of editorial text, not a numeric score input.

## Carry-forwards

None. Next real Final Day (2027, whenever the 2026-27 season concludes):
refresh `PL_FD`'s pts/gd/gf values and `PL_FINAL_DAY_DATE` together —
the wiring itself needs no further work.
