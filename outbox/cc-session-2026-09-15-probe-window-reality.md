# CC session — the odds probe reads a complete slate instead of whatever hour it woke at

Date: 2026-09-15
Repo: jubilant-bassoon, `main`
HEAD progression: `21ccac1d` → `75463126` → `defd89a0`

## What started this

A survey of the odds-line probe's committed manifests showed debrief counts
alternating with the clock:

| run (UTC) | slate | debriefs | odds layer in DOM |
|---|---|---|---|
| 09-13 08:33 | 48 | 0 | false |
| 09-13 18:46 | 48 | 12 | **true** |
| 09-14 09:16 | 18 | 0 | false |
| 09-14 20:18 | 23 | 2 | **true** |
| 09-15 08:59 | 22 | 0 | false |

The first reading of this was "the probe has a morning window that structurally
reads 0" — filed as a Rule 91 coverage gap, i.e. the probe should say which
window it sampled.

**That premise was wrong, and one command refuted it (Rule 100).** Reading the
workflow: there is no morning cron. The declared crons are `10 16 * * *` and
`45 3 * * *`.

## The measurement

Every scheduled run the workflow has ever had, from the run records:

| run | started (UTC) | cron | delay |
|---|---|---|---|
| 34747944004 | 09-13 08:32:28 | 03:45 | **+4h47m** |
| 34775630281 | 09-13 18:45:53 | 16:10 | +2h36m |
| 34826955734 | 09-14 09:15:31 | 03:45 | **+5h30m** |
| 34892026130 | 09-14 20:17:34 | 16:10 | +4h07m |
| 34949877281 | 09-15 08:58:06 | 03:45 | **+5h13m** |

**Neither cron has ever run at the hour its comment reasons about.** The delay
ranges 2h10m to 5h30m.

The 03:45 slot was chosen as "23:45 ET, when the day's games are final and the
client's own ET date has not rolled over yet". It executes at 04:32–05:15 ET,
by which time the ET date *has* rolled over — so the finished games it was
aimed at sit on yesterday, and "Today" holds a scheduled slate. All three of
its runs read `debriefs 0`.

The 16:10 slot survives by accident: by 18:20–20:17Z enough of the day has
happened that some cards are final.

The cron expression is the copy of the intent. `run_started_at` is the source.
Only the copy was ever read.

## Why it stayed invisible for three days

The manifest reported `debriefs_total: 0` identically whether the injector had
broken or the slate simply had no finished games in it. A green run with a 0 in
it is indistinguishable from a red one. This is the same absence-collapse shape
Rule 99 covers, applied to the measuring apparatus rather than the product.

## The fix

Not "move the cron earlier" — that is guessing against a 3h20m spread, and a
fallback rather than a fix. Instead the probe stops depending on its start hour.

1. **`scripts/probe-window.cjs`** — given the probe's own clock and trigger,
   returns which cron owns the run, how late it started, the real ET hour, the
   step-back it should use, and `zero_debriefs_is_evidence`.
2. **Scheduled runs read Yesterday.** Complete at every hour, regardless of when
   the scheduler fires. Already measured to carry the subject: manifest
   `20260912T190808Z` read 26 cards, 26 debriefs, odds layer in the DOM.
   An explicit `STEP_BACK_DAYS` — including `0` — still wins.
3. **The manifest carries `window`**, so a 0 states its own denominator (Rule 91).
4. **The workflow's `inputs.step_back_days || '0'` had to go.** On a `schedule`
   event `inputs` is empty and that fallback pinned every scheduled run to
   Today — the defect itself, sitting in the expression that looked like a
   harmless default.

## Rule 90 — the mutation caught what review did not

13 enumerated cases, 7 mutations. First run: **6 of 7**.

`W6` replaced the `America/New_York` lookup with a hardcoded
`(getUTCHours() + 20) % 24` and **survived all 11 cases then present**. Every
one of them was in September, where ET really is UTC-4, so the timezone
database earned nothing and the check could not tell the two implementations
apart.

Closed with two cases at the same UTC instant on either side of DST:
`2026-12-15T04:30Z` is 23:30 EST and Today IS complete; `2026-06-15T04:30Z` is
00:30 EDT and it is not. A hardcoded −4 reads the December one as 00:30 and gets
`today_likely_complete` backwards.

Final: **13 of 13 cases, 7 of 7 mutations caught.**

## Commits

| commit | what |
|---|---|
| `d422d8ef` | the odds-story done condition's one NO was closed the next day |
| (rebased) `defd89a0` | the probe reads a complete slate instead of whatever hour it woke at |
| — | the window check had no winter case, so UTC-4 passed as a timezone |

## Verified vs staged

- **VERIFIED (unit):** 13/13 cases, 7/7 mutations, against the five real run
  timestamps as the corpus.

- **VERIFIED (live).** Run `35010426536`, head `defd89a0`, manifest
  `outbox/odds-line-probe-manifest-20260915T185536Z.json`. Every staged
  assertion passed:

  ```
  window  { trigger: "workflow_dispatch", et_hour: 14,
            today_likely_complete: false,
            step_back_days: 1, step_back_source: "explicit",
            reads_complete_slate: true, zero_debriefs_is_evidence: true }
  slate   16 cards, date_label "Yesterday"
  debriefs_total 16, injected 16, odds_layer_present_in_dom true
  page_error_count 0
  ```

  Three of four states on named game ids — one more than the 2026-09-12 run
  that closed the original Task 3:

  | state | game | text |
  |---|---|---|
  | `no_odds` | `espn:401872931` | buildOddsMovement returned null; 1 of 16 rendered debriefs |
  | `unchanged` | `espn:401816935` | Home moneyline -138 (58% implied), unchanged from open |
  | `moved` | `espn:401816934` | Home moneyline -156 → -155, 0.2 pts toward away |

  `opened_only` absent for this run, reported absent rather than inferred.

  The before/after is one pair, same day and same deployment — scheduled run
  `34949877281` at 08:59Z read Today: 22 cards, **0 debriefs**, odds layer
  absent. This run read Yesterday: 16 cards, **16 debriefs**, odds layer
  present.

- **STAGED — the `schedule`-trigger path end-to-end.** `windowReality`'s
  schedule branch is covered by five real-run cases plus mutation `W2`, but no
  actual `schedule` event has fired since the change, and the dispatch run above
  passes `step_back_days` explicitly rather than exercising the
  `scheduled-default-1` branch. *Unblocked when:* the next 16:10 cron fires
  (expect a start between 18:20 and 20:20Z given the measured delay).
  *Verify:* the newest manifest with `triggered_by: "schedule"` must show
  `window.step_back_source: "scheduled-default-1"` and `step_back_days: 1`.
  A manifest with `triggered_by: "schedule"` and `step_back_days: 0` means the
  workflow's empty-input plumbing did not survive, and is the one thing that
  would make this change a no-op.

## No push affordance was added

This change touches a probe and a workflow. No app code, no SW bump, no
relay change, nothing that pushes a value to a user (ADR-002 Rule A).
