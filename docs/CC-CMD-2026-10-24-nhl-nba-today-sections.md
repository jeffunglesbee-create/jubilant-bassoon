# Claude Code Command — today's NHL and NBA games have no cards: the schedule lists stopped at the June finals

**Date:** 2026-10-24
**Repo:** jubilant-bassoon (served page). The relay already serves both boards.
**Branch:** main. Commit directly; no feature branch, no PR.
**Type:** A (live data with nowhere to render), the WNBA failure again
**Confidence gate:** >= 95 before any commit
**Status:** PARTIAL. TASK 0 done 2026-10-24 (workflow wf_bc082436-ef1). TASK 1
pushed 2026-10-24 as `eb8e74c4`, deploy-gate run 40113474301. Done conditions 1-3 are
met. TASK 2 (follow-ups the review found) is filed below and unbuilt
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

## TASK 0 — results (2026-10-24)

Workflow wf_bc082436-ef1: four premise probes against the real code and the live
page, then a critic that ran the planned fix.

| # | premise | verdict |
|---|---|---|
| 1 | no code path builds today's NHL or NBA section | **CONFIRMED** |
| 2 | since when | **CONFIRMED** |
| 3 | the injector is enough | **REFUTED as written** |
| 4 | every consumer of the labels | **CONFIRMED**, with four gaps |

1. **No path builds today's section.** `buildTodaySchedule` pushes only 'NBA
   Playoffs' and 'NHL Playoffs' from its hardcoded lists. `injectV2SportSection`
   has 19 call sites and none for nba or nhl. `FETCH_LEAGUES` serves forward
   dates only. Past dates do get NHL and NBA sections, from
   `fetchRelayDateSections` (Yesterday: NBA 12, NHL 2, matching the relay).
   WNBA works only because ad912d9 wired it in on 2026-07-15.
2. **Since 2026-06-13 (NBA) and 2026-06-14 (NHL).** Those are the last ET days a
   card could render from the lists. Nothing was set up to take over at the season
   start. The gate `check-v2-key-has-card-path` exempted nba and nhl as "built
   elsewhere", which was true only on June dates, and printed PASS today. The
   "June 4-20" in this CC-CMD's first draft was the UTC range of `start_time`
   values, not the ET days.
3. **The two-line fix is not enough.** Four things the critic measured by
   running the code:
   - from 16:00 ET tomorrow's games join today's section (NHL 17, NBA 15 at
     20:30Z);
   - while another date is on screen, the V2 poll still merges today's games into
     that date's section (Yesterday's NHL 2 -> 14);
   - the NBA post-game brief goes to the WNBA section (first `/NBA/i` match);
   - the section labels must be 'NHL' and 'NBA', not 'NHL Playoffs', which wakes
     `fetchNHLRelayScores` and drops the games from the injector.
4. **Consumers.** With 'NHL' and 'NBA', chips, `checkForNewFinals`, the NHL brief
   consumer, the GameDO socket, drama, the ambient panel and Night Owl accept the
   injected shape. The gaps are TASK 2.

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

## TASK 1 — results (2026-10-24)

Four commits, pushed together as `eb8e74c4` (deploy-gate run 40113474301; `2026-10-24d` live by 16:53Z). Each went
through the repo's own pre-commit hook (smoke, per-day smoke, units, lint).

| commit | what |
|---|---|
| `559ea858` | `injectV2SportSection` injects nothing while another date is on screen. Harness case 6 and mutation I6 |
| `d8af1668` | `injectV2SportSection('nhl', 'NHL')` and `('nba', 'NBA')` beside the WNBA call, before the render guard. The two gate exemptions are removed; mutations L4 and L5 remove the calls; smoke A-NHLNBA-1..4 |
| `924a90fd` | the NBA brief is written to the section that holds the game. A-NHLNBA-5 |
| `eb8e74c4` | the June finals lists and the `_seriesMap` build are retired (Night Owl would have stamped "NYK wins 4-1 — NBA Champions" on a regular-season final). A489 loses its clause (c) |

SW_VERSION 2026-10-24a..d, `2026-10-24d` at the tip. Smoke 1061/0, per-day
smoke, units and the section gates green; mutations 6/6 (injector), 5/5
(labels), 7/7 (smoke).

**Review** (workflow wf_aac1f46a-cb3, three lenses and one refuter per finding):
12 findings confirmed, 1 refuted.
- **High, fixed before the push.** The first version of commit 1 also filtered
  the injected games by day (`isToday` against `TODAY_ISO`) to stop tomorrow's
  games leaking into today's section from 16:00 ET. It was reproduced on the real
  boards that this blanks every injected sport from 00:00 to 04:00 ET and in any
  tab left open across the 4am rollover: `fieldDatesToQuery` asks for the ET
  calendar date and `TODAY_ISO` is the previous slate day, so all 30 of the 10-25
  games were rejected. The critic's own harness had printed that window and the
  plan had not caught it. The filter is removed. The tomorrow leak is older than
  this change and reaches every injected sport; it is filed with the other two
  disagreements as `docs/CC-CMD-2026-10-24-slate-day-has-three-owners.md`.
  Harness case 5 now pins the late-load window, and mutation I5 puts the filter
  back and goes red.
- **Corrected:** commit 2's message claimed a commented-out call fails the smoke
  assertions. It does for `//` and not for a `/* */` block (TASK 2.5). A489's
  failure text still named the retired clause (c).
- The rest are TASK 2.

**Live, after the deploy:**

```
Before the fix, run of 2026-10-24T16:12Z (SW 2026-10-22a), manifest
outbox/today-sections-probe-manifest-2026-10-24T16-12-10.json:
  FAIL NHL: 0 cards, 12 games today in espnScores
  FAIL NBA: 0 cards,  8 games today in espnScores

After the deploy, run of 2026-10-24T16:55:43Z (SW 2026-10-24d), manifest
outbox/today-sections-probe-manifest-2026-10-24T16-55-43.json:
  PASS NHL: 12 cards, 12 games today in espnScores
  PASS NBA:  8 cards,  8 games today in espnScores
  judged 2 of 2 watched sports (nhl, nba)

The live page read directly at 16:53:55Z agreed: NHL 12, NBA 8, WNBA 1; the
other sports' counts were unchanged from the 16:12Z run (College Football 17,
MLS 14, Premier League 4, Tennis 54, and so on).
```

## TASK 2 — follow-ups from the review, unbuilt (Rule 87.4: each has a home here)

1. **Media cards say the wrong thing.** `buildDynamicPregames`
   (`field.js` ~10426-10510) now finds the NHL and NBA sections and writes "NHL
   Playoffs Pregame", "Series preview" and "NBA playoff results", and it names ESPN
   as the network for regular-season games (`gameNetwork` is given a default).
   Stop inventing the network (use the relay's `streams`, or leave the clause out)
   and gate the playoff wording on `isPlayoffGame`. The WNBA section already
   triggers the NBA branch today.
2. **Colours and standings for 'NBA' and 'NHL'.** `SPORT_COLORS` and
   `ESPN_STANDINGS_MAP` hold only 'NBA Playoffs', 'NHL Playoffs' and the unused
   'Basketball (NBA)' and 'Hockey (NHL)'. The sections get the gold fallback, no
   Standings button, and an empty standings line in prompts. Follow the 'NFL'
   alias precedent (`field.js` ~12795-12803), add the `_relayStandingsCache`
   writes, and the `index.html` accent CSS. A smoke assertion that every
   `V2_SECTION_LABEL` value resolves in both maps.
3. **NHL analytics assumes the 2026 playoff roster.**
   `NHL_ABBREV_MAP` maps 'UTA' to 'Utah Hockey Club', so 'Utah Mammoth' resolves
   to null. The health panel reports an error row every regular-season day for
   the teams absent from the 16-team playoff table, and a stale Corsi badge
   shows on cards. Fix the map (keep the old name as a reverse alias), gate the
   badges and the health row on the season the table covers, and stop the
   `_homeAbbr` row blaming `nhlAnalyticsInit`.
4. **Ambient One-to-Watch labels a live NBA game "· MLB Playoffs".**
   `renderAmbientPanel` appends `getCalendarContext().label` and ignores that
   context's `relevantLeagues`. NFL and CFB already hit it in October. Show the
   label only when the picked game's league is in `relevantLeagues`.
5. **Two test gaps.**
   - A `/* */` block around the two calls leaves smoke A-NHLNBA-1..4 and both
     scripts green; run them over comment-blanked source (the
     `strip(src, {blankStrings:false})` already exported by
     `check-v2-key-has-card-path.mjs`), and mutate it first.
   - `field_smoke.js:203` looks for `data-sport="NBA Playoffs"`, which nothing
     creates now, so its NBA empty-shell invariant can no longer fail. Point it at
     `"NBA"` and seed `espnScores` so the injector runs there, then prove it red
     with an empty NBA section.
6. **GameDO asks the relay for the UTC date**, so NBA and NHL sockets get no
   facts after 8pm ET. It is the relay's, in
   `docs/CC-CMD-2026-10-24-v2-games-callers-ask-utc-date.md` (field-relay-nba).

## Done condition (Rule 90 artifacts)

1. TASK 0's four outputs committed.
2. A smoke assertion that fails when the nhl or nba injector call is removed.
3. CI-as-proxy Playwright probe against the LIVE URL on a day with NHL and NBA
   games: a committed manifest with NHL and NBA cards above 0, plus a screenshot.
   Pattern: `ambient-skeleton-probe.yml`. **Met:** `today_sections_probe.js`
   judged both sports FAIL (0 cards) at 16:12Z and PASS (12 and 8) at 16:55Z;
   manifests and screenshots are in `outbox/` (see TASK 1 results).
