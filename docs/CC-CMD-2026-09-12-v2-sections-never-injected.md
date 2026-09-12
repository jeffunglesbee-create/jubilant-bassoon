# CC-CMD-2026-09-12 — every injectV2SportSection section is missing from the live slate

> **CORRECTION, 2026-09-12, after Task 0 ran. The diagnosis below is WRONG and
> is kept for the record rather than edited away.**
>
> This document asserted the loss was `injectV2SportSection`'s missing `else` —
> that `allData.sports` was falsy, both branches were skipped, and nothing was
> reported. Task 0 measured it against SW `2026-09-12o`:
>
> ```
> allData   { sportsIsArray: true, sportsLength: 15, sportsLabels: [
>             "Baseball (MLB)", "Australian Football (AFL)", "Tennis", "Golf",
>             "Canadian Football (CFL)", "College Football", "NFL",
>             "MLS Soccer", "Premier League", "La Liga", "Serie A", "Ligue 1",
>             "EFL Championship", "EFL League One", "EFL League Two" ] }
> _v2SectionInjected  { cfb: true, nfl: true, mls: true, epl: true,
>                       laliga: true, seriea: true, ligue1: true,
>                       eflchamp: true, eflone: true, efltwo: true }
> field_errors_by_fn  no v2-section-inject:* of any kind
> slate_by_sport      MLB 15, Tennis 24, CFL 4, AFL 1, Golf 1 — five sections
> ```
>
> **`injectV2SportSection` works.** It pushes every section, the memo records
> every one, and no capture fires. The model holds fifteen sections and the page
> renders five. **The loss is in the RENDER, not the injection** — ten sections
> live in `allData.sports` and never reach the DOM.
>
> The function pushes, calls `buildFilters(allData.sports)`, sets its memo, and
> returns. There is no `renderAll()` call anywhere between the inject block and
> the end of `fetchV2AllScores`, and the slate stayed at 45 across sixty seconds
> and several poll cycles, so no later render picked them up either.
>
> **Task 1's fix stands and Task 3's tests stand.** A branch that declines to
> act and reports nothing is a defect class independent of whether it fired
> here, and the no-target capture now exists for the day `allData.sports` IS
> falsy. But the `else` was not the cause, and this document claimed it was.
>
> **What went wrong in the reasoning:** the previous measurement established
> that the data reached `espnScores` and not the DOM, and `injectV2SportSection`
> was the next link in the chain with a visible silent path. That made it the
> obvious suspect and it was written up as the answer before the one command
> that would separate "pushed and not rendered" from "never pushed" had been
> run. Reading the function is a simulation of executing it — the repo's own
> probe-first rule, applied to the wrong side of a boundary I had already
> crossed twice in this session.
>
> **Continues as** `CC-CMD-2026-09-12-v2-sections-in-model-not-in-dom.md`.

---

Second CC-CMD from `CC-CMD-2026-09-12-slate-size-variance`, filed per Rule 87.4.
That one asked why the slate read 129 and then 45; this one is the defect the
answer turned out to be.

## Measured, not inferred

`outbox/odds-line-probe-manifest-20260912T202*.json`, SW `2026-09-12n`, live:

```
espn_scores_by_sport  { "(no _sport)": 44, mlb: 15, cfb: 80, mls: 15, nfl: 13,
                        eflchamp: 11, efltwo: 11, eflone: 11, epl: 9,
                        bundesliga: 8, ligue1: 8, laliga: 8, seriea: 6, afl: 1 }

slate_by_sport        { "Baseball (MLB)": 15, "Tennis": 24,
                        "Canadian Football (CFL)": 4,
                        "Australian Football (AFL)": 1, "Golf": 1 }

slate_sections_present  those five and no others — ABSENT, not empty
settle series           45 across 12 samples over 60s — not a timing artifact
v2_games_by_sport       cfb 12, nfl 12, every soccer league 12
field_errors_by_fn      no v2-poll:*, no v2-section-inject:*
page_error_count        0
```

`/v2/games?sport=cfb&date=2026-09-12` returns a full live NCAAF slate from the
relay (probed via the relay self-fetch — sandbox egress to `*.workers.dev` is
blocked).

**The chain is intact right up to the section.** The client asks. The relay
answers. `mapV2ToESPN` writes 80 cfb entries into `espnScores` with the correct
`_sport`. And no College Football section exists on the page.

Every section that DID render comes from a different builder — MLB and Tennis
and Golf from the ESPN sweep, CFL from its own path, AFL from the
`sections.push` at the Squiggle merge (`field.js:9343`). **Not one
`injectV2SportSection` call produced a visible section.**

## Where it is lost, and why nothing said so

```js
function injectV2SportSection(sportKey, sectionLabel) {
  try {
    const keys = Object.keys(espnScores).filter(k => espnScores[k]?._sport === sportKey);
    if (!keys.length) return;                       // not this — cfb has 80
    const games = keys.map(...);
    const existing = allData?.sports?.find(s => s.section === sectionLabel || s.sport === sectionLabel);
    if (existing) { ...merge... }
    else if (allData?.sports) { allData.sports.push({...}); buildFilters(...); }
    // ← no else. allData.sports falsy: BOTH branches skipped, nothing reported,
    //   _v2SectionInjected[sportKey] stays false, and the next poll repeats it.
  } catch (_e) { captureFieldError(`v2-section-inject:${sportKey}`, _e, true); }
}
```

The `catch` only fires on a throw. The missing `else` is not a throw — it is a
statement that does not execute. So the failure is invisible to
`captureFieldError`, to `page.on('pageerror')`, and to the network census, all
three of which read clean while eleven sports went missing.

This is the same shape as the `v2-poll` swallow fixed in `6639e5e4` and the
`applyMainHTML` zero-change fast path fixed in `5f171c06`: **a path that
declines to act and says nothing.** Rule 99's subject, one level up — not a
value collapsing with its absence, but an action collapsing with its omission.

## Tasks

0. **Probe — what is `allData.sports` at injection time?** The manifest must
   carry `all_data_shape`: whether `window.allData` exists, whether `.sports`
   is an array, its length, and the `sport` field of each entry. The artifact
   is a committed manifest with that object populated; `null` means absent and
   `[]` means present-and-empty, never conflated. `allData` needs the same
   one-line window alias `espnScores` got in `a6440d34`, for the same reason.

   Also record `_v2SectionInjected` — the injector's own memo of which sports
   it believes it injected. A `true` there against a missing section is a
   different defect from a `false`.

1. **Give the no-op branch a voice.** The `else if` needs an `else` that calls
   `captureFieldError('v2-section-inject:no-target:' + sportKey, ...)` with
   the shape it actually saw. Do this REGARDLESS of what Task 0 finds — a
   branch that declines to act without reporting is the defect class, and it
   stays a defect even once this instance is fixed.

2. **Fix the cause Task 0 names.** Do not guess it from here. If `allData.sports`
   is genuinely absent at that moment, the question is ordering — who builds it
   and when relative to `fetchV2AllScores` — and that is a Rule 24 execution-path
   question to answer with the call chain, not a `||` to paper over (Rule 76).

3. **Mutation (Rule 90).** Three: `allData.sports` forced falsy (the new capture
   fires and names the sport); `existing` found (the merge path still runs);
   `keys.length` zero (the early return still returns, and does NOT fire the new
   capture — a section with no games is not a failure).

4. **Done condition.** A committed manifest where `slate_by_sport` contains a
   key for every sport with entries in `espn_scores_by_sport`, or a
   `field_errors_by_fn` entry naming each one that does not. Today's red is
   eleven sports present in `espnScores` and absent from both.

5. **Outbox manifest** per Rule 67.

## What this does NOT claim

That the 129-card readings came from this path working. They may have; nobody
has measured a 129 reading with `espn_scores_by_sport` in the manifest, because
that field did not exist until today. The first scheduled run that reads 129
will answer it, and the probe now records what is needed either way.
