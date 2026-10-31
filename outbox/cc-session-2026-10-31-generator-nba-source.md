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
| the daily cron's date is the board's date | cron `30 7 * * *` is 03:30 ET, the same calendar date as UTC | yes. Not the same between 00:00Z and about 04:00Z, which is true of every sport in this file already |

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
| the 07:30Z scheduled run uses the new code and stays green | **STAGED** | armed check below; unblocked by the cron firing (GitHub can delay it by hours) |

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
| the winter window (all empty) stays green on the runner | **STAGED** | unblocked from tomorrow, when the day-0 WNBA game is gone; the armed check at 2026-10-31T10:00Z covers the 07:30Z scheduled run, which still sees 10-31's game. Verify on 2026-11-01's scheduled run: `schedules_by_date` WNBA `[]` on all four days, `source_errors {}`, run green |

**Gaps now.** NHL, MLB and MLS still turn a failed read into `[]` and record nothing (not in the cover list). NBA playoff context is absent until the relay serves it. NBA is day 0 only. The module is still named `nba-board.cjs`. Each of the first two is an owner decision.

