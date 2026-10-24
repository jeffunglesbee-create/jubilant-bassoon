# Claude Code Command — today's NHL and NBA games have no cards: the schedule lists stopped at the June finals

**Date:** 2026-10-24
**Repo:** jubilant-bassoon (served page). The relay already serves both boards.
**Branch:** main. Commit directly; no feature branch, no PR.
**Type:** A (live data with nowhere to render), the WNBA failure again
**Confidence gate:** >= 95 before any commit
**Status:** FILED, not dispatched
**Filed by:** TASK 0 premise 6 of field-relay-nba
`docs/CC-CMD-2026-10-24-v2-games-callers-ask-utc-date.md` (workflow
wf_4d87d314-9a8), Rule 87.4. A content search found no CC-CMD covering it. The
closest, `docs/CC-CMD-2026-07-15-wnba-schedule-cards.md`, fixed the same failure
for WNBA only.

---

## What was measured

The live client (SW `2026-10-22a`, `TODAY_ISO` 2026-10-24) at 15:19Z, read through
the FIELD Handoff browser:

| | NHL | NBA |
|---|---|---|
| `window.espnScores` entries | 12 | 8 |
| cards (`[data-sport]`) | **0** | **0** |
| chip | none | none |

Every other in-season sport has cards: MLB 2, College Football 18, WNBA 2, MLS
15, the five European leagues, the three EFL divisions, CFL 3, Golf 2 and Tennis
55. The live page read the same at 14:50Z and 15:11Z.

The relay serves both boards for the day:
- `/v2/games?sport=nhl&date=2026-10-24`: 12 games, from NHLE.
- `/v2/games?sport=nba&date=2026-10-24`: 8 games, from ESPN since field-relay-nba
  `5919cab`.

So the scores arrive and there is no card to put them on.

**Where today's cards come from** (to be confirmed in TASK 0):
- `src/legacy/field.js` `buildTodaySchedule` holds hardcoded lists. `nbaGames`
  is the 2026 NBA Finals (June 4-20), and `nhlGames` is the Stanley Cup Final.
  In October neither matches a date.
- `injectV2SportSection` is called for cfb, nfl, wnba, mls and the European and
  EFL leagues, but **not** for nba or nhl.
- The label map's comment says nba and nhl sections are "built elsewhere, from
  FETCH_LEAGUES". The review read FETCH_LEAGUES as serving date navigation only.
- WNBA had exactly this failure. The `wnba-schedule-cards` feature flag
  (2026-07-15) says: "the old hardcoded wnbaGames array (buildTodaySchedule)
  stopped matching real dates after June 28, so WNBA had zero real schedule
  cards despite live V2 data reaching espnScores".

## TASK 0 — premises, one command each (Rule 100)

1. **No path builds today's NHL or NBA section.** Trace `goToDate` →
   `fetchSchedule` → `buildTodaySchedule` and every `sections.push` for NBA or
   NHL. Then load the page on a date in the hardcoded lists (2026-06-04) and on
   today. An NBA or NHL section today refutes the premise.
2. **Since when.** Find the last date an NHL or NBA card could render from the
   lists (`git log -S` on the arrays), and whether anything else was meant to take
   over at the season start.
3. **The injector is enough.** Run `injectV2SportSection('nhl', ...)` and
   `('nba', ...)` against the real 10-24 boards in a harness. Count the cards, and
   check for duplicates against the hardcoded lists and FETCH_LEAGUES.
4. **Every consumer of the section label.** The section label must equal the
   label map's `nba` and `nhl` values (from FETCH_LEAGUES' `section` field), so
   past-date navigation and today agree. List every reader that matches 'NBA' or
   'NHL' section names: chips, filters, `checkForNewFinals`, the NBA brief
   consumer, drama, and the GameDO socket.

## TASK 1 — decided from TASK 0

Expected, if the premises hold: the WNBA fix applied to NHL and NBA.
- `if (FIELD_V2_SOURCES.nhl) injectV2SportSection('nhl', <label>)` and the same
  for nba.
- The stale finals lists are retired where they can only mis-match (Rule 63),
  along with any series-record map built from them, if nothing else reads it.
- smoke assertions, and an SW bump in `index.html` and `sw.js`.

NHL finals arrive as `'final'`, and so do NBA finals (field-relay-nba kept that
word), so `mapV2ToESPN` reads both correctly. That is not true of the `'post'`
sports (field-relay-nba `docs/CC-CMD-2026-10-24-v2-final-word.md`).

## Done condition (Rule 90 artifacts)

1. TASK 0's four outputs committed.
2. A smoke assertion that fails when the nhl or nba injector call is removed.
3. CI-as-proxy Playwright probe against the LIVE URL on a day with NHL and NBA
   games: a committed manifest with `cardsBySport.NHL` > 0 and
   `cardsBySport.NBA` > 0 (whatever labels TASK 0 settles), plus a screenshot.
   Pattern: `ambient-skeleton-probe.yml`.
