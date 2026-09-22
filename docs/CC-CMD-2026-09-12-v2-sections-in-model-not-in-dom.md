# CC-CMD-2026-09-12 — ten sections live in allData.sports and never reach the DOM

Continues `CC-CMD-2026-09-12-v2-sections-never-injected.md`, whose diagnosis
Task 0 disproved. Third CC-CMD in this chain; each one narrowed the boundary by
one link and the first two were wrong about which link.

## THE DEFECT IS INTERMITTENT — measured both ways, 12 minutes apart

Run 34717864709 at 20:43 UTC, same SW `2026-09-12o`, same inputs:

```
slate_cards         134
slate_by_sport      MLB 15, College Football 20, NFL 13, MLS Soccer 15,
                    Premier League 9, EFL League Two 12, EFL Championship 11,
                    EFL League One 11, La Liga 8, Ligue 1 8, Serie A 6,
                    CFL 4, AFL 1, Golf 1
allData.sportsLength      14
sections_model_not_in_dom []   — model and DOM agree exactly
settle series       [134, 134, 134, 134]
```

**The same build renders all fourteen sections.** So this is not "the render
never emits injected sections" — it does, reliably, in this run, stable across
four samples. It is a race or a state-dependent skip that this probe has now
caught on both sides, twelve minutes apart, with identical inputs.

That also retroactively explains the 129-vs-45 oscillation
(`CC-CMD-2026-09-12-slate-size-variance`): 134 here, 45 in the 20:14 run, and
129/128/45/129 earlier in the day. Same defect, and the difference between a
good and a bad run is what Task 0 below must capture.

**Do not treat a passing run as the fix.** Two consecutive greens prove nothing
against a defect that alternated four times today.

## Measured on the BAD side, SW `2026-09-12o`, manifest `odds-line-probe-manifest-20260912T2*.json`

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

## TASK 3 — GREEN RUN 1 OF 5

Manifest `20260913T022634Z`, SW `2026-09-12r`, immediately after the fix:

```
slate_cards                144        (highest reading of the day)
sections_model_not_in_dom  []
render_after_last_push_ms  +6036      (was -31708 one run earlier)
renderLedger               renders 6, pushesSinceLastRender 0
Bundesliga                 8 cards    (first time it has ever rendered)
```

`renders` went 5 -> 6 and `pushesSinceLastRender` 11 -> 0: the extra render is
the scheduled one, and it consumed the pushes.

**This is one green run, not proof.** The done condition is five consecutive,
and it is five precisely because earlier greens were the race landing well —
`sections_model_not_in_dom` read `[]` at 20:43 with no fix in place at all. What
is different now is a mechanism rather than luck, and a mechanism that reads
green once is still a mechanism that has been observed once.

The two scheduled runs (03:45 and 16:10 UTC) accumulate the count without a
session. Any red one turns the probe non-zero and carries the ledger that says
which side it failed on.

## TASK 0 RESULT ON THE BAD SIDE — ANSWERED. Nothing rendered after the push.

Manifest `odds-line-probe-manifest-20260913T022107Z.json`, SW `2026-09-12q`:

```
renderLedger               { renders: 5, pushesSinceLastRender: 11,
                             lastPushSport: "efltwo" }
render_after_last_push_ms  -31708      <- NEGATIVE
allData.sportsLength       16
slate_by_sport             MLB 15, CFL 4, AFL 1, Golf 1   (21 cards)
sections_model_not_in_dom  College Football, NFL, MLS Soccer, Premier League,
                           La Liga, Serie A, Bundesliga, Ligue 1,
                           EFL Championship, EFL League One, EFL League Two
settle series              [21, 21, 21, 21]
field_errors_by_fn         nothing about sections
```

Eleven sections pushed, the last of them **31.7 seconds after the last render**,
and no render since. Per this document's own decision table, negative means the
sections were never offered to the DOM at all: **the renderer was not dropping
them — it never ran.**

The armed follow-up worked as designed. The bad run produced the diagnostic by
itself, on the first red run after the ledger shipped, with no session going
looking for it.

### Task 1 — the fix

`scheduleRenderAll()` at the end of the inject block, guarded on
`_renderLedger.pushesSinceLastRender > 0`.

- **`scheduleRenderAll`, not `renderAll`** — debounced, so eleven injections in
  one poll coalesce into one render; signature-guarded, so an unchanged poll
  costs a signature compare rather than a structural rebuild. Twenty existing
  call sites already use it (Rule 62).
- **The guard is Rule 24.** This function fires on the V2 poll cycle, so an
  unguarded call would schedule a render every poll forever.
  `pushesSinceLastRender` is non-zero only when a section was actually ADDED,
  which for a given sport happens once per session — `injectV2SportSection`
  takes its merge branch on every later poll and does not increment.
  Steady-state cost is zero.
- **Not a second render call "to be safe"**, which this document explicitly
  ruled out: there is exactly one, and it is conditional.

## Task 0 RESULT — the good side, measured; the bad side, armed

Run 34732178465, SW `2026-09-12p`:

```
slate_cards                140
sections_model_not_in_dom  []
allData.sportsLength       15
renderLedger               { renders: 5, lastPushSport: "efltwo",
                             pushesSinceLastRender: 0 }
render_after_last_push_ms  +5881   (a render ran AFTER the last push)
```

On a healthy run the renderer runs after the pushes and picks them up. That
rules out "the renderer never runs at all" as the standing explanation, and
leaves the two candidates the ledger was built to separate — but only on a run
that actually goes wrong.

**The bad side has not been captured and cannot be forced.** The defect
alternated six times on 2026-09-12 with identical inputs (129, 128, 45, 129,
45, 134, 140). Nothing in this session reproduced it on demand.

**It is now armed rather than pending.** Both scheduled probe runs record
`renderLedger` and `render_after_last_push_ms`, and
`sections_model_not_in_dom` turns the run red on any gap. The next bad run
produces the diagnostic artifact by itself:

| `render_after_last_push_ms` on a red run | what it means | where the fix goes |
|---|---|---|
| positive | a render ran after the push and dropped the sections | the renderer / `buildFilters` |
| negative | nothing rendered since the push | a render call, and Rule 24 on its frequency |
| null | a stamp is missing | the ledger itself is wrong |

Incidental: this run had 15 sections present and 14 with cards — Tennis
rendered as a section with ZERO cards. `slate_sections_present` and
`slate_by_sport` separate that, and the gap correctly reads `[]` because
Tennis IS in the DOM. A single section count would have reported a phantom
one-section discrepancy.

## Tasks

0. ~~**Probe — what does the renderer see, and when does it last run?**~~
   **DONE** — see above. Original text: The
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

3. **Done condition.** `sections_model_not_in_dom` is `[]` on **five
   consecutive scheduled runs**, not one. A single green proves nothing here:
   the field read `[]` on its very first live run at 20:43 while the same build
   had reported a ten-section gap twelve minutes earlier. One green is a sample
   of a coin that landed heads.

   The field compares `allData.sportsLabels` against `slate_sections_present`
   and exits non-zero on any gap.

   **The probe goes RED whenever a run lands on the bad side, deliberately.**
   A probe that passes
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

---

## 2026-09-22 — the gap is real, and every section in it carries games

The count was ambiguous until now. `sections_model_not_in_dom` compares LABELS,
and `renderAll` returns `""` for a section with no games, so a model entry with
`games: []` counted toward the gap while behaving correctly. **That hypothesis
is refuted.**

From `outbox/odds-line-probe-manifest-20260922T002248Z.json`, SW `2026-09-21d`,
Yesterday's completed slate:

```
DROPPED (defect): 7
  NHL 7 · Premier League 4 · EFL Championship 2 · La Liga 5
  Serie A 5 · Bundesliga 3 · Ligue 1 3
empty (correct) : 0
unknown         : 0
```

**29 games across 7 sections are in `allData` and not in the DOM.** Nothing in
the gap is there for a benign reason.

### What rendered, and what did not

The same model held eleven sections. Four reached the DOM — `Baseball (MLB)` 15,
`WNBA` 13, `NFL` 15, `MLS Soccer` 2 — and seven did not.

**MLS Soccer rendered with 2 games.** So this is not "soccer never renders", and
it is not a size threshold in the direction the tennis defect had: the sections
that failed hold 2 to 7 games each, and one that holds 2 succeeded. Whatever
selects them, it is not the game count alone.

### What this rules out

- Not the featured/overflow split fixed in `6c2f0124`: every section here is far
  below `FEATURED_TIER_OVERFLOW_THRESHOLD` (30), so that branch never runs.
- Not an empty model: the counts above are read from `allData` at the same
  instant the DOM is counted.
- Not a section-level filter on sport: MLS Soccer passed and the other six
  soccer leagues did not.

### Instrumentation now in place

`__fieldSlateState()` reports `sportsGameCounts`; the probe records `gap_split`
with `dropped` / `empty` / `unknown` buckets, `null` when the split cannot be
made at all. `scripts/gap-split.cjs` + `check-gap-split.mjs` (10/10) +
`mutate-gap-split.mjs` (4/4, with a positive control) run in the probe workflow
before the browser step.

The done condition — five consecutive SCHEDULED runs with an empty gap — is
unchanged and still `0/5`.

## 2026-09-22 19:39Z — the key-mismatch hypothesis is REFUTED

`renderAll` writes `data-sport="${sec.sport}"` while the manifest reported
`section || sport`, and the league config at `field.js:3255-3259` carries rows
like `{sport:"basketball", section:"WNBA"}`. That looked like it would inflate
the gap with sections that rendered fine under a different key.

**It does not.** From `outbox/odds-line-probe-manifest-20260922T193903Z.json`,
SW `2026-09-22a`:

```
section_key_mismatches: []
old comparison  gap 3  ["NHL","WNBA","NFL"]
on the DOM key  gap 3  ["NHL","WNBA","NFL"]
split           dropped 3 · empty 0 · unknown 0
                NHL:8 · WNBA:2 · NFL:1
in DOM          Baseball (MLB), Australian Football (AFL), Tennis, Golf
```

Every section in `allData.sports` has `sport === label`. Those config rows are a
lookup table, not the shape of the objects that reach the model. The gap was
already being measured on the right key.

The instrumentation stays: the number is now proven rather than arguable, and
`section_key_mismatches` will catch the day a section does carry two keys.

### What the reading does say

- **MLB renders; NHL, WNBA and NFL do not**, from the same model in the same
  pass, with 8, 2 and 1 games respectively. Not a volume effect.
- **AFL, Tennis and Golf are in the DOM and NOT in the model.** They arrive via
  the supplemental merge (`fetchSupplemental` / `fetchTennisLive`), which is a
  different path from `injectV2SportSection`.
- `render_after_last_push_ms` positive, `pushesSinceLastRender: 0` — by the
  ledger's own decision table a render ran after the last push, so this is not
  "nothing has rendered them yet".

### The next measurement, not the next guess

What distinguishes MLB from NHL/WNBA/NFL at render time. The candidates are in
`renderAll`'s section loop and in which path put each section into `allData`;
no reading so far separates them, and `field.js:21683`
(`allData={sports:[...verified,...supplemental]}`, documented at :21625 as
having required the MLS proof path to push into `verified` too) is the one
place a section can be present in the model and still have been replaced
mid-flight.

A per-section trace — which branch each section took, and which path added it —
names it. Reading further will not.
