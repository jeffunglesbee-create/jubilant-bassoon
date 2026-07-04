# CC Outbox — getNewspaperVoice's Missing LATE Bucket

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-newspaper-voice-late-gap-fix.md
**Commits:** dd6ffe3 (implementation), 5dbc3d3 (shrink probe result)
**Deploy:** Deploy gate run 28712684697 — succeeded

---

## Probe block — all four functions confirmed, zero drift

```
grep -n "^function getNewspaperVoice" index.html   → 6744
grep -n "^function getCardCircadian" index.html    → 6699
grep -n "^function applyNewspaperVoice" index.html → 21600
grep -n "^function isGameOver" index.html          → 6681
```

All four read in full and confirmed to match this CC-CMD's own
description exactly.

## The required CFL/Golf/unclassified-LATE investigation — completed, not skipped

`getCardCircadian`'s final fallback (`return 'LATE';`) also catches any
game whose sport has no recognized live-state field — confirmed CFL and
Golf specifically, by tracing `_circInput` construction in `renderAll`'s
per-card loop (index.html ~10725-10726):
`{state, status: g.status, _aflComplete: g._aflComplete, _id}` — for a
CFL or Golf game, `status`/`_aflComplete` are both `undefined` and no
`findESPNScore` match sets `state` either, so `getCardCircadian` always
returns `LATE` for these sports regardless of their real state.

**Traced how these sports actually appear in the schedule before
concluding this was safe to ship:**
- CFL: a hardcoded, ~1-3-games-per-week static schedule
  (`cflGames`, index.html ~11863), pushed as one section
  (`sections.push({sport:"Canadian Football (CFL)", games:cflGames})`)
  alongside whatever else is scheduled that day.
- Golf: appears similarly sparingly (`_sport: 'golf'` at two sites).
- MLB runs 15+ games nearly every single day for CFL's entire real-world
  season (June-November) and **does** classify correctly via
  `game.status` (confirmed working in this session's earlier
  `mlb-status-live-refresh` and `soccer-drama-scoring-fix` work).

**Conclusion:** a genuinely all-`LATE` night (the scenario this fix
targets) requires MLB and every other classified sport to *also* have
gone stale past the 120-minute freshness window — that's the real,
independently-worth-fixing case this CC-CMD closes, regardless of
CFL/Golf's presence. An all-CFL/Golf-only night with zero other sports
scheduled is negligible given MLB's near-daily coverage, and even in
that unlikely case, `'recap'` (hides only `.np-preview`/`.np-pick`,
keeps `morning_report`/`night_stars`/`truth_is`/`streak_board` visible)
isn't meaningfully more misleading than the current `'morning'`
show-everything default. Safe to ship the `LATE ⇒ recap` rule as
specified, without redesigning `getCardCircadian`'s return contract to
distinguish the two cases.

## Implementation

One function changed — `getNewspaperVoice` gained a `late` bucket and
one new branch:
```javascript
const late = games.filter(g => getCardCircadian(g) === 'LATE').length;
...
if (late > 0) return 'recap';
return 'morning';
```
Placed exactly where specified: after the `upcoming > 0` check, before
the final `'morning'` fallback. Reuses the existing `'recap'` voice
value — `applyNewspaperVoice` already handles it correctly, so **zero
changes** were needed there. `getCardCircadian`, `isGameOver`,
`minutesSinceFinal`, and `applyNewspaperVoice` are all confirmed
untouched via `git diff` review (zero references to any of them in the
change).

## Smoke assertions

2 new: `A-NPVOICE-1` (the `late` bucket exists) and `A-NPVOICE-2` (the
`if (late > 0) return 'recap';` branch sits immediately before the
`'morning'` fallback). Both regexes verified against the real committed
code before trusting them, not assumed from the doc's exact whitespace.

`node smoke.js index.html`: **863 passed, 0 failed** (861 baseline + 2
new).

## SW_VERSION

Bumped to **`2026-07-04h`** — checked real system time again (12:35 ET
July 4 at commit time); `g` was already used earlier today for the
sw-active-update-check commit.

## CC-verifiable confidence score (per the doc's own rubric)

- **+30** — `late` bucket and new branch added exactly as specified, in
  the correct position (confirmed via diff review)
- **+25** — CFL/Golf/unclassified-LATE conflation investigated and
  reported (not skipped), with a reasoned conclusion (MLB's near-daily
  coverage makes the all-CFL/Golf-only scenario negligible)
- **+20** — Smoke 2/2 green (863/0 total)
- **+25** — CI confirms deployed (Deploy gate run 28712684697,
  succeeded); live bundle re-verified directly

**Total: 100/100.** Committed.

## Live bundle re-verified directly

```
6088: const late = games.filter(g => getCardCircadian(g) === 'LATE').length;
6092: if (late > 0) return 'recap';
```

`SW_VERSION = '2026-07-04h'` confirms this exact commit is deployed.
Full response (31,444 lines) not kept verbatim — replaced with the
extracted finding in `outbox/cf-result-20260704T163739Z.txt`.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] Real observation, during an actual all-LATE window (very late
      night, nothing live/recent/upcoming), that the newspaper banner
      now shows the recap-appropriate sections instead of everything —
      needs a real clock/schedule state this session cannot force or
      simulate.

---

## Done Conditions

- [x] Probe block re-run, all four functions' current bodies confirmed
      (zero drift)
- [x] PROBE BLOCK's CFL/Golf/unclassified-LATE investigation completed
      and reported, not skipped
- [x] `late` bucket added, `if (late > 0) return 'recap';` branch added
      in the correct position
- [x] Confirmed via code read: `applyNewspaperVoice` was not touched
- [x] `node smoke.js index.html` exits 0, both new assertions green
      (863/0 total)
- [x] CI confirms deployed — Deploy gate succeeded; live bundle
      re-verified directly
- [x] SW_VERSION bumped (`2026-07-04h`)
- [x] Outbox manifest written (this file), explicitly recording the
      CFL/Golf-conflation investigation's real findings and reasoning
