# Session 2026-10-31 — the generator reads the NBA board from /v2/games, and an unread board is null

Scope: `scripts/build-field-data.js` and `field-data.yml` (the daily overlay generator). No client code, no `index.html`, no SW bump, so smoke and the unit
suite were not affected and not re-run for this change. The pre-commit hook ran and passed.

Built on the owner's `go` of 2026-10-31 for "the generator's NBA source" (offered in the previous turn as the open call from
`field-relay-nba docs/CC-CMD-2026-10-22-nba-cdn-403-in-season.md`, "Data point 2026-10-30"). Under BUILD-ON-A the finding was added to that CC-CMD, not filed again.
Its Status, rulings and holds were read first: it is DONE except the client box-score path (a separate FILED CC-CMD, untouched), it holds no ruling or VOID window that names the
generator, and a content search of all three repos' CC-CMDs for `parseNBA`, `parseWNBA`, `build-field-data` and `field-data.yml` found only July feature CC-CMDs
(GOTD wiring, WNBA daily discovery) with no Status, hold or ruling.

## HEAD progression

| step | head |
|---|---|
| start (previous turn's docs) | `da4151d8` |
| origin/main before the push (bot probe commits) | `dfdc168d` |
| the fix | `7176807e` (authored as `eae95325`, rebased over the bot commits) |
| the overlay the dispatched run committed | `54091f34` |
| field-relay-nba, the CC-CMD record | `6a2d8a1` |

## The defect

`field-data.yml` filled `/tmp/nba.json` from the relay's `/nba/liveData/scoreboard/todaysScoreboard_00.json` passthrough with `curl -sf ... || echo '{}'`. The passthrough
answers 403 to the Worker (the CDN refuses the Worker; the relay CC-CMD, premise 2, measured it from a runner). `-f` turned the 403 into a failed command, the fallback wrote `{}`,
and `parseNBA` returned `[]`. On 2026-10-30 the file said `nba` 0 on a night the relay listed 10 games. A refused read was recorded as "no games".

## Premises (Rule 100), each with the one command that could refute it

| premise | the command | result |
|---|---|---|
| the runner can reach `/v2/games?sport=nba&date=` | the forward-window probe's capture, run 41139258140, read 12 cells from the runner | NBA 7 / 4 / 15, clean. Confirmed again by the dispatch below |
| the board's shape is what the generator needs (names, start, venue) | the relay self-probe, 2026-10-31 | 7 games, `home.name`, `away.name`, `start`, `venue` present. Kept as `outbox/fixture-nba-board-20261031.json` |
| nothing in the page reads `schedules.nba` from this file | grep of `src/legacy/field.js` for `fieldDataForDate`, `scheduleForDate`, `_fieldDataCache` | the page reads `.mlb` and `game_overlays` only. A `null` NBA entry cannot break it |
| the ESPN board carries series context | read of the 7 games | it does not: `round` is null on every game, no series text, no flag. The generator's `seriesRecord`, `isPlayoff` and `gameLabel` are therefore absent (not false) and no NBA matchupNote is generated |
| nothing outside NBA changes | old and new generator run under the same stubs, NBA board empty, outputs diffed | identical after removing `_meta.source_errors`, `_meta.source_errors_cover` and `generated_at` |
| the daily run's date is the board's date | the cron is `30 7 * * *`, but `gh run list --event schedule` (2026-10-31) shows the last three scheduled runs created at 14:17Z, 14:25Z and 14:34Z (10-28, 10-29, 10-30): GitHub fires it about 7 hours late, so the run is 10:17 to 10:34 ET, the same calendar date as UTC. I had read 03:30 ET off the cron and not measured it (corrected 2026-10-31) | yes. A manual dispatch between 00:00Z and about 04:00Z would see tomorrow's ET date, which is true of every sport in this file already |

## What was built

- `scripts/nba-board.cjs`: `readNbaBoard(iso, fetch)`. It throws on anything that is not a clean answer: non-OK status, an `error` key, a `source` containing "error" (the relay
  answers NHL's outage with a 200 and `source: nhle-error`), no `games` array, another sport or date, a game with no team name, a request that fails or passes 15 s. A clean empty
  day returns `[]`.
- `build-field-data.js`: `parseNBA(dateISO)` returns `null` on a failed read and records `"<date>: <reason>"` in `SOURCE_ERRORS.nba`. `schedules.nba` and `games_found.nba` are
  `null`, not `[]` and not 0. The three `flat().length` counts filter non-arrays, because `[null].length` is 1 and an unread board would otherwise count as a game.
  `_meta.source_errors` is always written, and `_meta.source_errors_cover` (`["nba"]`) says which sources an empty record vouches for.
- `field-data.yml`: the passthrough fetch is gone. A last step, `scripts/field-data-source-errors.cjs`, runs after "Push overlay to outbox" and fails the run when `source_errors` is
  non-empty, or when the record or the cover list is missing. It runs after the push on purpose: the overlay is committed with its `null`, so one unread source does not cost the day's MLB,
  MLS and WNBA.
- `.github/workflows/nba-board-check.yml`: runs the check and the mutation harness on a push to the files they cover. Node only, about 40 s, no secrets, `contents: read`.
- `scripts/check-nba-board.mjs` (112 assertions) and `scripts/mutate-nba-board.mjs` (80 mutants).

## Proof

- **Check.** 112 assertions. The reader runs against a fake fetch built from the relay's real 7-game answer; the **whole generator runs in `node:vm`** against stubbed `fs`, `https`
  and `fetch`, with every request it makes answered by a stub (0 unclaimed, printed). The check was run against the OLD generator and workflow first and went red on 31 assertions.
- **Mutation (Rule 90).** 80 of 80 caught, each on its own clause's FAIL line, anchors asserted unique. **112 of 112 assertions go red under at least one mutant** (the first version
  reached 92 of 95; three assertions no mutant could turn red, and one mutant, B22, was equivalent, so mutants were added or replaced until none was left). **9 of the 80 are caught
  by the text of the failure, not by observing an open failure** (B5, B6, B11, B12, E2, E5, E6, E8, E12): the mutated code still fails closed with a TypeError or a crash exit. The
  harness now prints them separately.
- **Review.** A three-lens workflow (generator correctness, check validity, workflow and operations; 12 agents, a skeptic per finding, each skeptic told to default to "not real")
  returned 9 findings, 8 confirmed, 1 refuted. Dispositions:

| finding | disposition |
|---|---|
| `source_errors: {}` read as "nothing went wrong" but only NBA was recorded; WNBA, MLB and MLS failures reproduced as `[]` with a green run (reported three times, by three lenses) | `source_errors_cover` added; the last step prints what it vouches for and that the others are not checked; comments reworded. The other readers are **not** changed: see the gaps |
| the check ran in the publishing job, ahead of Build, and asserts workflow text, so a harmless edit would have stopped the day's overlay | moved to `nba-board-check.yml`; the publishing job holds no check |
| the default 15 s timeout was never exercised (a 1 ms default stayed green) | the default is observed through `AbortSignal.timeout` in the reader and in the generator run; mutants B24 and G27 |
| `|| true` on a gate step passed the text assertions | each gate step must be exactly a name and one run line; mutants W9, W10, W11 |
| five assertions went red only when a mutant crashed the generator; some mutants caught by message text | mutants G23-G26 reach them directly; wording-only mutants are printed separately |
| (refuted) the per-day count still sums an unread sport as zero | it counts entries carried in the file, as it always did |

## Verified end to end, and what was not

| claim | status | evidence |
|---|---|---|
| the generator, on the runner, writes the relay's NBA count into the file | **VERIFIED** | dispatch run 41165483123, head `7176807e`, every step green; the committed overlay `54091f34`: `schedules_by_date['2026-10-31'].nba` 7, `games_found.nba` 7, `source_errors {}`, `source_errors_cover ["nba"]`; the relay listed 7 for that date |
| the check and the mutation harness pass on the runner | **VERIFIED** | run 41165473123, green, both steps |
| a 403 becomes `null` with a reason, and the last step then fails the run | **proven in the check, not seen on the runner** | the only way to make the relay fail on demand is to push a bad overlay to `main` |
| the scheduled run (cron 07:30Z, fired about 14:20Z lately) uses the new code and stays green | **STAGED** | armed check at 2026-10-31T15:00Z; unblocked by the cron firing |

## Gaps (decisions, none started)

1. **WNBA, MLB, MLS and NHL still turn a failed read into `[]` and record nothing.** Unblocked by: the owner ruling that a failed read in a given source turns the daily run red. WNBA
   reads the same relay route and can reuse the board reader. Verify: `source_errors_cover` in the committed overlay lists the source.
2. **No NBA playoff context** until the relay serves series text. Unblocked by: the first ESPN playoff day (April 2027). Verify: an NBA entry in the file with `seriesRecord` when the relay
   lists a series game.
3. NBA is still **day 0 only**. The board takes a date, so it could be windowed like MLB and WNBA; nobody has asked.
4. The generator's NHL fetch keeps `curl -sf ... || echo '{}'`. Not measured failing; the same defect class as the NBA one.

Recorded under BUILD-ON-A in `field-relay-nba docs/CC-CMD-2026-10-22-nba-cdn-403-in-season.md` ("Built 2026-10-31"), commit `6a2d8a1`.

---

## Addendum — the WNBA read (owner's `go`, same day; "the WNBA season ends 10/31")

Built on the owner's `go` to the open call above (gap 1, WNBA first because it is the same relay route). The owner's note that the season ends 2026-10-31 set the one property that had to hold:
**an off-season window must stay green all winter**, because a reader that failed on an empty board would turn the daily run red every day until May 2027.

| step | head |
|---|---|
| start | `5a7af777` |
| the change | `a8c1744e` |
| the overlay the dispatched run committed | `d8611140` |

**Premises (Rule 100), each with the command that could refute it.**

| premise | the command | result |
|---|---|---|
| an off-season WNBA day reads as a clean empty board, not an error | relay self-probe, `/v2/games?sport=wnba&date=` for 2026-11-01 and 2027-01-15 | both 200, `games []`, `count 0`, `source espn-wc`. Kept, with the last game day, as `outbox/fixture-wnba-board-20261031.json` |
| the relay's WNBA failover cannot make a failure look like an empty day | read of `handleV2Games` / `_trySecondary` in the relay source | ESPN failure falls to a KV secondary: `source wnba-kv` with `fetchedAt` and `staleSeconds`; the secondary's `null` (both failed) is a 502, its `[]` is the relay's own "real off-day". So `wnba-kv` is an answer and is returned as the source, not an error. Read from source, **not observed** |
| nothing reads the file's `wnba` key | grep of the page and the probe | the page reads `mlb` only; the probe's table covers nfl, cfb, nba, nhl |
| the new entry equals the old one | old (`HEAD`) and new generators run under the same stubs with an empty board and with the real one-game board | identical after removing the record keys and `generated_at`; the entry is `{sport, home, away, start_time, venue, league, confirmed}` in both |

**Built.** `scripts/nba-board.cjs` gained `readV2Board(sport, ...)` with `readNbaBoard` and `readWnbaBoard` (the file keeps its name; the header says why). `parseWNBA` is async, returns `null` on a failed read and appends `"<date>: <reason>"` to
`_meta.source_errors.wnba` for each failed window day (four per run). A failed forward day is `null` for that day only and the day stays in `window_dates`, because its MLB and MLS entries are fine. `_meta.source_errors_cover` is `["nba","wnba"]`.
The old read checked no status, so a relay 502 body parsed as an empty slate and a timeout resolved `[]`.

**Proof.** `check-nba-board.mjs` 210 assertions (red in 48 places on the previous WNBA read first); `mutate-nba-board.mjs` 110 of 110 caught, 210 of 210 assertions red under at least one; 9 of the 110 are caught by failure text only and are printed as such.
The off-season case runs the whole generator over four clean empty boards, one of them the relay's real 2026-11-01 answer. A three-lens review (10 agents, a skeptic per finding) confirmed 6 of 7, all in test coverage or reason wording, all fixed:

| finding | disposition |
|---|---|
| a timeout during the body read was recorded as "response is not JSON" | a `TimeoutError` or `AbortError` there is now `request failed: ...`; two cases, two mutants |
| no run put a WNBA game on a forward day, so a generator that discarded forward-day games passed | a run with 1 game on 11-02 and 2 on 11-03; mutant GW15. That body is the real game re-dated, and is labelled as derived |
| the last-step script was never given two failed sources | cases for two sources and for the generator's own output with both failing; mutants E14, E15. Found on the way: `nba: ...` is a substring of `wnba: ...`, so the regexes are now anchored to line starts |
| the `|| null` on `start_time` and `venue` was never exercised (the relay writes `''`) | a case and two mutants |
| a failed connection recorded only "fetch failed" | the cause (`ECONNREFUSED`) is kept; a case and a mutant |
| the `_meta` comment and the step's header said a sport in `source_errors` is `null` in `schedules` and `games_found`, false for a sport read on four days | reworded |

**Verified, and what was not.**

| claim | status | evidence |
|---|---|---|
| the runner writes today's WNBA game, with the NBA still right and the record clean | **VERIFIED** | dispatch run 41171382117, head `a8c1744e`, every step green; overlay `d8611140`: `schedules.wnba` 1 (`Atlanta Dream` at `Golden State Valkyries`, `2026-11-01T00:00Z`, `Chase Center`), `games_found` `{nhl 10, nba 7, mlb 0, mls 0, wnba 1}`, `source_errors {}`, `source_errors_cover ["nba","wnba"]`, all four days in `window_dates` |
| the check and the harness pass on the runner | **VERIFIED** | run 41171379541, green |
| a failed WNBA day becomes `null` with a reason and a red last step | **proven in the check only** | no way to make the relay fail on demand without pushing a bad overlay |
| the winter window (all empty) stays green on the runner | **STAGED** | unblocked from tomorrow, when the day-0 WNBA game is gone; the armed check at 2026-10-31T15:00Z covers today's scheduled run, which still sees 10-31's game. Verify on 2026-11-01's scheduled run: `schedules_by_date` WNBA `[]` on all four days, `source_errors {}`, run green |

**Gaps now.** NHL, MLB and MLS still turn a failed read into `[]` and record nothing (not in the cover list). NBA playoff context is absent until the relay serves it. NBA is day 0 only. The module is still named `nba-board.cjs`. Each of the first two is an owner decision.

**The first scheduled run on the new code, verified 2026-10-31T15:01Z.** Run 41207089236 (event `schedule`, created 13:46Z, head `26cc735e`, which carries `7176807e` and `a8c1744e`) was green on every step, including "Fail the run when a recorded source could not be read". Its overlay (`c9bd9d45`): `games_found` `{nhl 10, nba 7, mlb 0, mls 0, wnba 1}`, `source_errors {}`, `source_errors_cover ["nba","wnba"]`, NBA 7 and WNBA 1 on day 0 and `[]` on the three forward days, against the relay's 7 NBA and 1 WNBA games for 2026-10-31 read through the relay self-probe the same minute. The run was created at 13:46Z, earlier than the 14:17Z to 14:34Z measured on the three days before, so the fire time varies by an hour or more; the armed check for 2026-11-01 is set to re-arm if its run has not appeared.

---

## Addendum 2 — the MLB read (owner's `go`: "MLB (statsapi)")

Built on the owner's `go` to the next open call. MLB is off-season (the last game was 2026-10-28), so the property that had to hold is the same as for WNBA: **an off-season window must stay green** until the season starts.
BUILD-ON-A: a content search of the three repos' CC-CMDs for `parseMLBFull`, `statsapi.mlb.com`, `MLB full schedule` and `mlb enrichment` found none; the relay NBA CC-CMD (where the generator work is recorded) holds no ruling or hold on it.

| step | head |
|---|---|
| start | `13f6005e` plus bot commits |
| the change | `4b1580a5` |
| the overlay the dispatched run committed | `c11ceaa0` |

**Premises (Rule 100), each with the command that could refute it.** The sandbox cannot reach statsapi (`CONNECT tunnel failed, response 403`), so a runner read it: the repo's `cors-probe` workflow, triggered by `outbox/.trigger-cors-probe`, four times.

| premise | the command | result |
|---|---|---|
| a day with no games is a clean answer, not an error | `cors-probe` on the generator's own URL for 2026-10-31 | HTTP 200, `dates: []`, `totalGames: 0` (`outbox/cors-result-20261031T154058Z.txt`) |
| the reader parses the shape the generator really gets | the same URL for 2026-10-28, the last game day | HTTP 200, one World Series game, `dates[0].date` echoes the request (`...T154211Z.txt`) |
| an error is distinguishable from an empty day | `cors-probe` with `date=2026-13-45` | HTTP 400 with `{messageNumber, message, timestamp, traceId}` and **no `dates` key** (`...T154431Z.txt`) |
| `totalGames` could be a cheap integrity check | a regular-season week, 2026-09-14 to 09-20 | `dates[i].totalGames` equalled the list on all 7 days (94 games, no doubleheader). **Not used**: a doubleheader day was not observed, and a check that could turn a normal day red on a guess is not added |
| nothing outside MLB changes, and no field of a game changes | old (`HEAD`) and new generators run under the same stubs on the real game, an off-day, a regular-season retype, three postponed variants, and the ESPN GOTD path | identical after removing the record keys and `generated_at`, all seven |
| the file's `mlb` key tolerates `null` | grep of the page, the probe and the judge | `fieldDataForDate(iso)?.mlb \|\| []`, `(...schedules?.mlb \|\| []).forEach`, and the probe's `sched.mlb ? sched.mlb.length : 0` all treat `null` as empty |

**Built.** `scripts/mlb-schedule.cjs`: `readMlbSchedule(iso, fetch)` returns the raw games for one date and throws on HTTP not ok, not JSON, no `dates` array, more than one `dates` entry, an entry for another date, no `games` array, a game with no team name
(the old code dropped it silently), and a request that fails or times out. The request/parse step moved verbatim into an exported `getJson` in `scripts/nba-board.cjs`, used by the board reader and the MLB reader. `parseMLBFull` is async: a failed read, or a mapping failure, returns `null`
and appends `"<date>: <reason>"` to `_meta.source_errors.mlb`; the mapping is unchanged. `source_errors_cover` is `["nba","wnba","mlb"]` — **"mlb" is the statsapi schedule, not the ESPN GOTD flags read** (`fetchEspnMlbGotd`), which still fails open.

**Proof.** `check-nba-board.mjs` 322 assertions (red in 63 places on the previous MLB read first); `mutate-nba-board.mjs` 151 of 151 caught, 322 of 322 assertions red under at least one, 9 caught by failure text only (printed). A three-lens review (11 agents, a skeptic per finding) confirmed 6 of 8, all in test coverage or documentation, all fixed:

| finding | disposition |
|---|---|
| no run carried a clean MLB game on a forward day, so a generator that discarded forward-day games passed | the real game re-dated to 10-30; mutant GF1 |
| the postponed flag and the PPD overlay were never executed (six mutants passed) | three postponed variants (code alone, text alone, both); mutants PM1-PM6 |
| the regular-season broadcast path and the GOTD wiring were never executed on a real body | the real game retyped `R`, with and without the ESPN GOTD set, and a playoff game with it; expected entries taken from the previous generator; mutants RM1-RM4 |
| the printed summary named neither MLB nor what does not run | an `mlb reader` bucket and a "NOT executed / NOT observed" list |
| the fixture pointed at a check file that does not exist | corrected to `check-nba-board.mjs` |
| the check workflow said "about 30 seconds" | measured 2m14s to 2m31s locally; now "about 2 to 3 minutes" |

**Verified, and what was not.**

| claim | status | evidence |
|---|---|---|
| the runner reads four real statsapi off-day answers and ships `mlb: []` on all four days, with nothing recorded | **VERIFIED** | dispatch run 41220454373, head `4b1580a5`, every step green; overlay `c11ceaa0`: `schedules_by_date` MLB `[0,0,0,0]`, `games_found` `{nhl 10, nba 7, mlb 0, mls 0, wnba 1}`, `source_errors {}`, `source_errors_cover ["nba","wnba","mlb"]`. This is the winter case for MLB, seen live |
| the check and the harness pass on the runner | **VERIFIED** | run 41220443863, green, 2m18s |
| a failed MLB day becomes `null` with a reason and a red last step | **proven in the check only** | no way to make statsapi fail on demand without a bad overlay on `main` |
| an in-season game, a postponed game and the GOTD path against the real servers | **STAGED** | none exists until the season. Unblocked by Opening Day (about late March 2027). Verify on the first scheduled run with games: `schedules_by_date` MLB length equals `curl 'https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=<day>&gameType=R,F,D,L,W'` `dates[0].totalGames` from a runner, `source_errors {}`, green |

**Not observed, and why it matters.** A statsapi 5xx, an HTML error page and a two-date answer were not observed and are built by the check. Statsapi sends `cache-control: stale-if-error=86400`, so an outage may be answered from cache and look clean; the reader cannot detect that.

**Gaps now.** The NHL and MLS readers and the ESPN GOTD flags read still turn a failed read into `[]` / an empty set and record nothing (not in the cover list). NBA playoff context is absent until the relay serves it. NBA is day 0 only. The module is still named `nba-board.cjs`. Each is an owner decision.


## Addendum 3 — the NHL read (owner's `go. Fully finish all tasks before coming back to the user.`)

Built on the owner's `go` to the next open call, with the order to finish every open task before reporting. NHL is in season, so unlike WNBA and MLB the live day has games; the property that had to hold is the same (**a failed read is never "no games"**) plus the off-season one (a summer day with no scoreboard entry stays green).
BUILD-ON-A: a content search of the three repos' CC-CMDs for `parseNHL`, `/tmp/nhl.json` and `scoreboard/now` found `field-relay-nba docs/CC-CMD-2026-06-26-nhl-nhle.md` (the route and its off-season behaviour: used as the source for that shape, no ruling or hold on the generator), `docs/CC-CMD-2026-07-13-wnba-daily-discovery.md` (describes the older per-sport parsers, no ruling), and the NBA 403 CC-CMD, whose gap 1 already named NHL as still silent. The work is recorded there, not in a new CC-CMD.

| step | head |
|---|---|
| start | `0998a285` (the ratchet fix below) |
| the change | `aefe51ff` |
| the overlay the dispatched run committed | `24749d46` |

**Found on the way: `smoke-and-verify` was red on `main` from 2026-10-30 23:30Z to this session, my defect.** The Rule 99 ratchet read 71 catch-collapse sites against a baseline of 70. The one new site was mutant D4 in `scripts/mutate-forward-window-relay.mjs` (commit `97fb0543`, the forward-window probe): its replacement string contains `.catch(() => {})` as text written into a copy of the relay reader. Seventeen runs on `main` went red, including my NBA, WNBA and MLB commits of today, and the red was not noticed until a reviewer reported it. Reproduced locally with the workflow's own command (`RATCHET FAILED: ... 71 > baseline 70`, naming the line), fixed in `0998a285` with an `absence-ok` reason on the line and the regenerated baseline (flagged 70, suppressed 1). Same command after: `ratchet OK`; run 41228385932 on that commit is the first green since 10-30. The relay's own baseline note ("field-relay-nba flagged [?? 0] 1 < 3, lower it") is an improvement in the other repo and is left there.

**Premises (Rule 100), each with the command that could refute it.** The sandbox cannot reach `/nhl/*` (the probe allow-list excludes it), so a runner read it: `cors-probe` on `/nhl/v1/scoreboard/now` (`outbox/cors-result-20261031T172544Z.txt`).

| premise | the command | result |
|---|---|---|
| the passthrough's shape is what the reader parses | the runner read above | HTTP 200, `{focusedDate, focusedDateCount, gamesByDate}`, 11 dates (the last 3 days and the next 7), 78 games, none without a team abbreviation. `outbox/fixture-nhl-scoreboard-20261031.json` is that body trimmed to 3 dates (JSON-identical to the raw entries; an independent review compared them) |
| moving the read changes no output | old (`HEAD` before this change) and new generators under the same stubs: the real body for 10-30, 10-31 and 11-07, a summer date, empty and malformed bodies, the `{games: []}` shape, 7 playoff variants; plus a 300-body and a 400-body fuzz of the mapping fields | identical output in every case but one class: a body the old mapping threw on (29 of 300) is now `null` with `mapping failed`, where the old generator wrote an empty day. My own run on four bodies: `old==new: true` ×4. `schedules.nhl` in the overlay the old curl path committed (`c11ceaa0`, 16:36Z) and in the one the new reader committed (`24749d46`, 18:29Z) is byte-equal, 10 games |
| nothing reads the file's `nhl` key | grep of `src/legacy/field.js`, the probe, the judge and every script | the page reads `mlb` only and `games_found?.nhl\|\|0` in a `FIELD_DEBUG` log (`field.js:21601`); the probe reads `sched.mlb`. `null` breaks no reader |
| the relay does not vary on the new headers | the reader sends `User-Agent` and `Accept`, which curl did not; read of `field-relay-nba src/index.js` | the relay reads only `X-FIELD-*`, `Authorization` and `Upgrade` from request headers. Then the live run (below) read 10 games with them |
| an off-season scoreboard has no entry for today | **not observed** (it is October); read from `CC-CMD-2026-06-26-nhl-nhle.md` lines 14-15 and 162 (the last ~9 days, no entry for today) | the reader treats no entry as `[]`. Verify on the first run after the last NHL game, or on any summer scheduled run: `games_found.nhl` 0, `source_errors {}`, green |

**Built.** `scripts/nhl-scoreboard.cjs`: `readNhlScoreboard(iso, fetch)` over the shared `getJson` (which gained an `extraHeaders` parameter so `Cache-Control: no-cache`, the one header the old curl sent, belongs to this read alone). It throws on a request that fails or times out, HTTP not ok, not JSON, neither a `gamesByDate` nor a `games` array (`{}` is exactly what the old fallback wrote), a `gamesByDate` entry not keyed by a `YYYY-MM-DD` `date`, an entry for the date with no `games` array, and a game with no team abbreviation (a present but empty one counts as unnamed). No entry for the date is an empty day. `parseNHL` is async: a failed read or a mapping failure is `null` for day 0 with `"<date>: <reason>"` in `_meta.source_errors.nhl`; the mapping is unchanged. `field-data.yml` no longer curls anything; its date step stays. **`source_errors_cover` is now `["nba","wnba","mlb","nhl"]`.** MLS and the ESPN GOTD flags still fail open and are not in it.

**Proof.** `check-nba-board.mjs` 423 assertions; `mutate-nba-board.mjs` 218 of 218 caught, 423 of 423 assertions red under at least one, 10 caught by failure text only (printed: the mutated code still fails closed). The expected NHL entries are the previous generator's output (`outbox/fixture-nhl-mapped-20261031.json`): all 18 real games across three dates, and 52 games derived from one real game (32 teams as home and as away, 20 field variants) because the real scoreboard of 10-31 has only `gameType` 2 games. The check says so in its printed summary: the playoff, series, round and fallback paths are derived, not observed.

**Review.** Three lenses, 16 candidate findings, a skeptic each; 15 confirmed, 1 refuted (the same label nit, confirmed from the other lens). **The commit message of `aefe51ff` says 13 confirmed; the count is 15.** The one wrong-behaviour finding: `gamesByDate` entries keyed any way but an exact `date` matched no day and read as the off-season's empty day (10 real games recorded as 0, `source_errors {}`, green), reproduced by two reviewers. The rest:

| finding | disposition |
|---|---|
| date-key drift reads as an empty day (behaviour and tests lenses) | reader rejects any entry without a `YYYY-MM-DD` date; 8 cases; mutants NR13-NR17 |
| the overlay (`game_overlays`) was never asserted; its line could be deleted | 9 expected overlays from the previous generator; OV1-OV3 |
| mapping pinned for 2 of 13 games; 7 mapping mutants passed | goldens for all real games and 52 derived; MP1-MP20 |
| an empty-string abbreviation passes a key-presence reader | 3 cases; NR12 |
| the shared `getJson` could send `Cache-Control` to every reader | a headers assertion for NBA, WNBA and MLB; X1 |
| the run log's `Parsed:` line had no assertion for any source | exact line for NHL, NBA, WNBA and MLB; PL1-PL5 |
| the summary did not say the playoff paths are derived | it does |
| stale comments: "pre-fetched today-only files", `/tmp/mlb.json`, the workflow header, `nba-board.cjs` header, `forward-window-relay.cjs` | fixed (the day-0-only reason was false: the scoreboard carries 11 dates) |
| a mislabelled header assertion and a dead helper | fixed |
| the Rule 99 ratchet red at HEAD | `0998a285`, above |
| a null NHL day shows as 0 in the page's `FIELD_DEBUG` log, and the day-0 window total leaves out an unread source | **not fixed**: the client log is a debug line that would need a client deploy; the total counts only sources that returned a list, by design since the NBA work. Recorded as gap 4 of the NBA 403 CC-CMD |

**Verified, and what was not.**

| claim | status | evidence |
|---|---|---|
| the runner reads the real NHL scoreboard through the new reader and ships it | **VERIFIED** | dispatch run 41229556544, head `aefe51ff`, every step green including the last; overlay `24749d46`: `games_found {nhl 10, nba 7, mlb 0, mls 0, wnba 1}`, `schedules.nhl` byte-equal to the golden for 10-31, `source_errors {}`, `source_errors_cover ["nba","wnba","mlb","nhl"]`, forward days `[]` |
| the check and the harness pass on the runner | **VERIFIED** | run 41229518658, green, 3m49s (the workflow header said 2 to 3 minutes: now says about 4) |
| `smoke-and-verify` is green again | **VERIFIED** | runs 41228385932 (`0998a285`) and 41229518639 (`aefe51ff`) |
| a failed NHL read becomes `null` with a reason and a red last step | **proven in the check only** | there is no way to make the relay fail on demand without a bad overlay on `main` |
| the off-season scoreboard reads as `[]` | **STAGED** | unblocked by the first summer scheduled run; verify `games_found.nhl` 0, `source_errors {}`, green |
| the 2026-11-01 scheduled run | **ARMED** | wake `trig_012m8cVxrTDADcYsyo8kBQeB` at 15:30Z: WNBA and MLB `[]`, NHL equal to the relay's count for 11-01 (the forward-window probe saw 5), `nhl` in the cover list |

**Forward-window probe run 41224278008** (read this session, head `0b071b62`): green, `problems []`; MLB "not measured" (window 0, ESPN 0). Its relay coverage shows the NHL scoreboard lists 5, 4 and 11 games for 11-01, 11-02 and 11-03 while the window file carries 0: the same answer the scoreboard body gives, and the reason the "NHL is day 0 only because its feed is today-only" statement was false.

**Gaps now.** The MLS reader and the ESPN GOTD flags still turn a failed read into `[]` and record nothing (not in the cover list). NBA playoff context is absent until the relay serves it. **NHL and NBA are day 0 only; the NHL scoreboard already carries the next 7 days (a new data point, owner decision).** The module is still named `nba-board.cjs` and hosts the shared `getJson`. The page's debug log reads `games_found.nhl` as 0 when it is null. Each is an owner decision or a recorded nit.
