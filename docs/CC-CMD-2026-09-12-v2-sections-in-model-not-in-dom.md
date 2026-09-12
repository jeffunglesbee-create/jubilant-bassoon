# CC-CMD-2026-09-12 — ten sections live in allData.sports and never reach the DOM

Continues `CC-CMD-2026-09-12-v2-sections-never-injected.md`, whose diagnosis
Task 0 disproved. Third CC-CMD in this chain; each one narrowed the boundary by
one link and the first two were wrong about which link.

## Measured, SW `2026-09-12o`, manifest `odds-line-probe-manifest-20260912T2*.json`

```
espn_scores_by_sport  cfb 80, nfl 13, mls 15, eflchamp 11, efltwo 11,
                      eflone 11, epl 9, bundesliga 8, ligue1 8, laliga 8,
                      seriea 6, mlb 15, afl 1
allData.sportsLength  15
allData.sportsLabels  Baseball (MLB), Australian Football (AFL), Tennis, Golf,
                      Canadian Football (CFL), College Football, NFL,
                      MLS Soccer, Premier League, La Liga, Serie A, Ligue 1,
                      EFL Championship, EFL League One, EFL League Two
_v2SectionInjected    cfb, nfl, mls, epl, laliga, seriea, ligue1, eflchamp,
                      eflone, efltwo — all true
slate_by_sport        MLB 15, Tennis 24, CFL 4, AFL 1, Golf 1
field_errors_by_fn    no v2-section-inject:*, no v2-poll:*
page_error_count      0
settle series         45 across 12 samples over 60s
```

Fifteen sections in the model. Five on the page. Ten missing, every one of them
a `injectV2SportSection` push, and every instrument reads clean.

## The chain, now fully measured rather than reasoned

| link | state | how known |
|---|---|---|
| relay serves the data | YES — full live NCAAF slate | relay self-fetch |
| client requests it | YES — cfb 12, nfl 12, each league 12 | `v2_games_by_sport` |
| responses are OK | YES — zero `scores:fetch-v2-games` captures | `field_errors_by_fn` |
| `mapV2ToESPN` writes them | YES — `espnScores` cfb 80 | `espn_scores_by_sport` |
| the poll does not throw | YES — zero `v2-poll:*` captures | `field_errors_by_fn` |
| the injector pushes | YES — 15 sections, memo all true | `slate_state` |
| **the render emits them** | **NO — 5 sections in the DOM** | `slate_by_sport` |

## Tasks

0. **Probe — what does the renderer see, and when does it last run?** The
   measurement is not another census of `allData.sports`; that is settled. It is
   whether a render happens AFTER the injection and what it does with the new
   sections. Record: a monotonic counter incremented at the top of `renderAll`,
   its value and timestamp at read time, and the timestamp of the last
   `injectV2SportSection` push. **The artifact is a committed manifest carrying
   both timestamps**, because "the render ran before the push" and "the render
   ran after the push and dropped them" are different defects and no count can
   separate them.

   `injectV2SportSection` pushes, calls `buildFilters(allData.sports)`, sets its
   memo, and returns. There is no `renderAll()` between the inject block and the
   end of `fetchV2AllScores` — read, not measured, which is why Task 0 measures
   it rather than acting on the reading.

1. **Fix what Task 0 names.** If nothing renders after injection, the fix is a
   render call and the question is which one and how often (Rule 24: map the
   call chain first — `renderAll` fires on the ESPN poll cycle and a change that
   ignores that frequency will fail). If a render DOES run and drops them, the
   question is what it filters on, and `buildFilters` is the first place to
   look since the injector already calls it.

   Do not add a `||` or a second render call "to be safe" — two renders racing
   is a worse defect than one that never runs.

2. **Mutation (Rule 90).** Against whatever check Task 1 lands: a section pushed
   after the last render must be detectable; a section pushed and rendered must
   not be flagged; a model and DOM that agree must pass.

3. **Done condition.** A committed manifest where `sections_model_not_in_dom` is
   `[]`. That field already exists and already fails the probe — added
   2026-09-12, it compares `allData.sportsLabels` against
   `slate_sections_present` and exits non-zero on any gap. Today it reports ten.

   **The probe is RED until this is fixed, deliberately.** A probe that passes
   while ten sections are missing is the thing that let this run unnoticed;
   `slate_by_sport` alone reads as a quiet sports day, and `_v2SectionInjected`
   reads as success. Only the two together say otherwise, and now they do, on
   every scheduled run.

4. **Outbox manifest** per Rule 67.

## What is NOT claimed

That this explains the 129-card readings. A 129 reading with `slate_state` in
the manifest has still never been captured — the field is hours old. If a later
run reads 129 with `sections_model_not_in_dom: []`, that is the answer and this
defect is intermittent; if it reads 129 with a gap, the two are unrelated. The
probe records what is needed either way and the 03:45 UTC scheduled run is the
next chance.
