# CC-CMD-2026-09-12 — the same page rendered 129 cards and then 45, 23 minutes apart

**STATUS: CLOSED 2026-09-12. Tasks 0-3 done; the leading hypothesis below is
DISPROVED, and the answer is a defect with its own CC-CMD** —
`CC-CMD-2026-09-12-v2-sections-never-injected.md`.

The hypothesis was that a probe reading before the V2 poll cycle completed
would see a slate without CFB. Measured against SW `2026-09-12l` and `n`:

```
settle series         45 across TWELVE samples over 60s — flat, not climbing
v2_games_by_sport     cfb 12, nfl 12, every soccer league 12, all HTTP 200
espn_scores_by_sport  cfb 80, nfl 13, mls 15, eflchamp 11, ... (11 sports)
slate_by_sport        MLB 15, Tennis 24, CFL 4, AFL 1, Golf 1 — and no others
field_errors_by_fn    no v2-poll:*, no v2-section-inject:*
page_error_count      0
```

The client asks, the relay answers, `mapV2ToESPN` writes 80 cfb entries with
the correct `_sport`, sixty seconds pass, and no College Football section
exists. Not a timing artifact and not a measurement error: `injectV2SportSection`
has a branch that declines to act and reports nothing. The 129 readings are the
correct slate; 45 is a broken one.

**Task 3's done condition is met by its first branch** — three consecutive runs
(20:00, 20:05, 20:09) read exactly 45 with byte-identical `slate_by_sport`, 0%
apart. That is the probe now reporting a broken slate stably instead of
smoothing over it, which is the point: the denominator stopped moving, and what
it stopped at is a defect.

Session doc: `outbox/cc-session-2026-09-12-slate-size-variance.md`.

---

Found while verifying the odds layer. **Not a regression from any commit today** —
zero page errors on both readings — but a number that moves by a factor of three
with no stated cause, and the odds layer's own evidence rests on it.

## Measured, `STEP_BACK_DAYS=0` runs only

Runs with `STEP_BACK_DAYS=1` report `slate_cards` for YESTERDAY, so they are not
comparable and are excluded. That distinction is not obvious from the field name
and cost me a wrong reading once already — see "Not a live outage" below.

| probed_at | SW | slate_cards | debriefs injected | odds layers | page errors |
|---|---|---|---|---|---|
| 16:24:17 | 2026-09-12d | **129** | 41 | 5 | 0 |
| 16:30:46 | 2026-09-12d | 128 | 41 | 5 | 0 |
| 16:33:41 | 2026-09-12d | **129** | 41 | 5 | 0 |
| 16:56:05 | 2026-09-12g | **45** | **0** | **0** | 0 |

Three consecutive readings at 128–129, then 45.

## The leading hypothesis, and why it is only that

`129 − 45 = 84`. The relay's own census for 2026-09-12 reports **CFB: 80 rows**,
the largest single section on the slate. CFB is injected by
`injectV2SportSection('cfb', …)` at the END of the V2 poll cycle, not with the
first paint — so a probe reading before that cycle completes would see a slate
without it, and 45 + 80 = 125 is within one poll's churn of 128–129.

`injected: 0` fits the same shape: `injectDebriefCards` fires ~600ms after a
`renderAll`, so a snapshot taken mid-cycle catches it before the debriefs land.

That is a coherent account and it is **not verified**. A deploy landed at ~16:41
(SW `2026-09-12g`), so a service-worker update is an equally untested
alternative, and "the probe reads at a fixed wall-clock offset" is an assumption
about the page's timing that nobody has measured.

## Why it matters even if it is benign

`CC-CMD-2026-09-12-context-game-slate-id`'s done condition was satisfied by the
16:24 reading. If the slate size can vary by 3x for reasons nobody has named,
then "41 of 41 requests used a durable id" is a measurement whose denominator
moves, and a future run reading 45/0/0 could be read as a regression when it is
not — or a real regression could be dismissed as this.

## Tasks

0. **Probe.** Record the slate's COMPOSITION, not just its size: per-sport card
   counts at the moment of the read, plus `performance.now()` since navigation.
   **The artifact is a committed manifest carrying `slate_by_sport`** — a number
   per section name, not a total.
1. **Sample across the poll cycle.** Read the slate at 5s intervals from 10s to
   60s in one run and record the series, the way `slate_settle_series` already
   does for the date-nav check. A slate that climbs 45 → 129 as CFB lands proves
   the hypothesis; one that sits at 45 disproves it.
2. **Decide.** If it is poll timing, the probe must wait for a settled slate
   before reporting counts, and say in its own output which cycle it read. If it
   is not, this becomes a defect with its own diagnosis.
3. **Done condition.** Two consecutive scheduled runs whose `slate_by_sport`
   totals agree within 10%, OR a committed series showing the climb and a probe
   that waits for it.

## Not a live outage — a field-name trap I fell into

Six manifests between 13:54 and 15:23 read `slate_cards: 0`. That is NOT the
live site having rendered nothing: those runs used `STEP_BACK_DAYS=1`, so
`slate_cards` is measured AFTER the date step and describes Yesterday, which is
separately broken (`CC-CMD-2026-09-12-past-date-slate-renders-nothing`).

`slate_cards` means "cards on whatever date the probe ended on". Anyone reading
the manifest series without knowing that will conclude the site was down for 90
minutes. Renaming it, or recording the date it refers to alongside it, belongs
in Task 0.
