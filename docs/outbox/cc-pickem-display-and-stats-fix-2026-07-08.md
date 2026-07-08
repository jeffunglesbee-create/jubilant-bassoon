# Pick 'em Display/Data Fixes — 2026-07-08

## What Was Built

Three bugs found via direct investigation (not a bug report), all
client-side display/data-access issues confirmed against real relay data
throughout — the relay's contract was correct in all three cases.

## Probe Block — Confirmed Before Editing

```
buildPickEmStatsSection (index.html:8872) — matched doc exactly
buildPickWidgetHTML (index.html:28049) — matched doc exactly
Live /user/state fetch — confirmed real response shape:
  { picks: { totalMade, totalCorrect, accuracyRate } }
```

## TASK 1 — Per-pick probability scale (`buildPickWidgetHTML`)

```javascript
const probPct = pick.resolvedProbability != null
  ? (pick.resolvedProbability * 100).toFixed(1) : null;
const probLine = (probPct != null && pick.probabilityLabel)
  ? `<span class="pick-prob">${esc(pick.probabilityLabel)}: ${esc(probPct)}%</span>` : '';
```

One decimal place — intentional choice, matches the relay's own precision
(rounds to nearest 0.001 on the 0-1 scale, i.e. nearest 0.1 on the 0-100
scale).

## TASK 2 — Stats-section field nesting + accuracy scale (`buildPickEmStatsSection`)

```javascript
const picks = st && st.picks;
const hasStats = picks && picks.totalMade > 0;
// ...
${picks.accuracyRate != null ? (picks.accuracyRate * 100).toFixed(0) + '%' : '—'}
```

Whole-percent for cumulative accuracy — intentional choice, distinct from
Task 1's one decimal (cumulative-over-N-picks accuracy conventionally reads
as a whole percent).

**One correction beyond the CC-CMD's original spec, found by the CC-CMD's
own required test.** The doc's proposed `hasStats` check
(`picks.totalMade != null || ...`) doesn't work: the relay's real
`/user/state` response always returns `totalMade: 0` (not `null`/
`undefined`) for any initialized user who hasn't picked yet — confirmed
via a real live fetch. `0 != null` is `true` in JavaScript, so that check
would make `hasStats` always true for any initialized user, permanently
hiding the intended "no picks yet — make one from any upcoming game card"
empty state. Changed to `picks.totalMade > 0`, which correctly expresses
the actual intent (has this user made a pick). Caught by the vm test suite
(case: `totalMade: 0, totalCorrect: 0, accuracyRate: null`) before this
was ever live — exactly the value of writing the zero-picks test case the
CC-CMD's own verification section specified, not skipping it as
"obviously fine."

## Verification

### Real test — Node `vm` extraction against actual committed source

Same technique already proven in this repo for `_bundleFinalizedAt`/
`_sportLabelMatches`. 12 cases, 12 pass:

```
PASS  Task 1: resolved pick with resolvedProbability=0.579 renders "57.9%"
PASS  Task 1: does NOT render the raw unscaled "0.579%"
PASS  Task 1 regression: null-probability pick still renders resolved state
PASS  Task 1 regression: null-probability pick has no probability span
PASS  Task 2: accuracyRate=0.667 with real picks renders "67%"
PASS  Task 2: does NOT render the old Math.round(0.667)+"%" -> "1%" bug
PASS  Task 2: real stats present -> does NOT show empty state
PASS  Task 2: totalMade=3 rendered
PASS  Task 2: totalCorrect=2 rendered
PASS  Task 2: zero-picks case still shows empty state
PASS  Task 2: null window._userState does not throw, shows empty state
PASS  Task 2: real live-shaped /user/state response (accuracyRate=0.5) renders "50%"
```

### Live E2E — real app, real relay round-trip, side-by-side buggy-vs-fixed

Loaded the actual deployed app (`https://jubilant-bassoon.jeffunglesbee.workers.dev/`,
pre-fix, since this fix hadn't been pushed yet — verify-before-commit).
Used the page's own real `getFieldUserId()` and made two real
`pick_made`/`pick_resolved` round-trips against the live relay
(La Liga/Alavés → correct, `resolvedProbability: 0.598, source: odds-api`;
Bundesliga/VfB Stuttgart → incorrect), then called the page's own real
`fetchUserState()` to populate `window._userState` from a genuine relay
response:

```javascript
window._userState.picks === { totalMade: 2, totalCorrect: 1, accuracyRate: 0.5 }
```

Injected the fixed function source into the live page and called it
side-by-side against the CURRENTLY-DEPLOYED (buggy) version, both against
this same real data:

```
Currently deployed buildPickEmStatsSection() → "no picks yet — make one
  from any upcoming game card"  (WRONG — real totalMade is 2)
Fixed buildPickEmStatsSection()               → "made: 2 correct: 1
  accuracy: 50%"  (correct)

Currently deployed buildPickWidgetHTML() probLine → "Market estimate: 0.598%"
Fixed buildPickWidgetHTML() probLine              → "Market estimate: 59.8%"
```

This directly demonstrates Bug 3's real-world severity: the live,
currently-deployed app shows "no picks yet" for a real user who has
genuinely made and resolved 2 picks.

### Repo's own checks

```
node smoke.js index.html   → 890 passed, 0 failed
node field_unit.js         → 66 passed, 0 failed (unaffected)
node field_smoke.js        → 21 failed, diff-confirmed byte-for-byte
                              identical to the pre-fix baseline (zero new
                              failures) -- not just count-compared
```

## Explicitly Deferred, Not Fixed Here

The ESPN-native "final tick" design question (MLB/NBA/WNBA picks show the
win-probability model's *final* reading, which trends to ~0%/~100% for any
decided game and mostly restates the outcome rather than describing
pick-time confidence) is a real product decision, not a data-correctness
bug. Not addressed in this CC-CMD — needs its own decision and its own
follow-up.

## Commits

- Fix commit (this session)

## Confidence Score

```
+20  Probe block confirmed all three bug sites matched the doc's
     description before any edit
+25  Task 1 fixed, verified via real extracted-function vm test AND real
     live-app injection against genuine relay data (0.598 -> "59.8%")
+25  Task 2 fixed, verified via real extracted-function vm test covering
     all three cases (has-stats/zero-stats/null-state) AND real live-app
     injection showing the buggy-vs-fixed difference directly; the doc's
     own proposed hasStats check was found wrong by this same test suite
     and corrected (totalMade > 0, not != null) before shipping
+20  Live E2E: real pick round-trip against the deployed relay, /user/state
     shape independently re-confirmed live (not assumed from the doc),
     side-by-side buggy-vs-fixed comparison on the actual running app
+10  Repo's own smoke/unit checks clean; field_smoke.js failure list
     diffed byte-for-byte before/after, zero new failures (not just
     count-compared)
= 100/100
```

**Score: 100/100 — above 95 threshold.**
