# The gap-zero reading was a different day, not a fixed defect

2026-09-21. A correction to a claim this session published, and the one command
that should have been run before publishing it.

## The claim

After the tennis render fix landed, a dispatched `odds-line-probe` run reported
`sections_model_not_in_dom: 0`, against 8 that morning. That was reported as:

> Gap 0. The sections-model-not-in-DOM count went 8 → 0 on the first run after
> the render fix. Both probes were measuring the same defect.

**The second sentence is false and the first is a comparison between two
different days.**

## What four readings actually say

| manifest | trigger | step | date read | gap | debriefs |
|---|---|---|---|---|---|
| `20260921T202552Z` | schedule | 1 | Yesterday | **8** | 62 |
| `20260921T221631Z` | dispatch | 0 | Today | 0 | 0 |
| `20260921T232208Z` | dispatch | 0 | Today | 0 | 0 |
| `20260921T232544Z` | dispatch | **1** | Yesterday | **8** | 62 |

The last row is the control: same fix, same SW `2026-09-21c`, same `?wpt`, one
input changed. **The gap is 8.** The eight are `NHL, MLS Soccer, Premier League,
EFL Championship, La Liga, Serie A, Bundesliga, Ligue 1` — the same eight as
that morning.

`scripts/probe-window.cjs` decides it: `step_back_days = scheduled ? 1 : 0`. A
dispatched run reads TODAY, whose model holds fewer sections, so there is less
to be missing from the DOM. Zero out of nothing.

## The one command

`node -e '...' outbox/odds-line-probe-manifest-*.json` printing `date_label`
beside the gap. It takes one second and it was not run before the claim was
published — the gap number was read, the day it described was not.

This is Rule 100's corollary exactly: *an untested premise is not reported as a
finding.* Believing it briefly costs nothing. Publishing it converted a private
guess into something a reader now has to un-learn, and it was the third such
publication this session to be corrected by a control that was one input away.

## What is actually true

- **Tennis is fixed.** 42 cards where there were 0, verified on a Yesterday
  reading and a Today reading alike. That claim stands.
- **The sections gap is NOT fixed.** `CC-CMD-2026-09-12-v2-sections-in-model-not-in-dom`
  remains open with the same eight sections, and its 0/5 scheduled-green streak
  is honest.
- **The two probes were not measuring the same defect.** Tennis rendered zero
  cards into a section that WAS in the DOM; these eight sections do not reach
  the DOM at all. Different failures, adjacent symptoms.

## One thing the streak counter gets right by design

The 22:16Z Today reading did enter `check-sections-gap-streak.mjs` as a green
and pushed `allStreak` to 1. It did NOT move the done condition, because that
reads `schedStreak` and the run was dispatched.

The two-denominator split — written after a session eyeballed a directory and
reported "2 of 5" and "3 of 5" when the real figure was 1 — is what stopped a
Today reading from counting as progress. It needed no change today; it needs
recording that it worked.

## What `?wpt` did and did not do

Exonerated. The step-1 dispatch with `?wpt` reproduces the pre-`?wpt` scheduled
run exactly: 62 debriefs, 35 with a movement line, 35 visible slots, all four
odds states observed with named games. The probe's assertions hold under it.

`setup_overlay_dismissed: false` in every post-`?wpt` manifest is consistent
with the flag working — there is no overlay left to dismiss — but that field
cannot distinguish "nothing to dismiss" from "never looked", so it is not
offered as proof of anything.
