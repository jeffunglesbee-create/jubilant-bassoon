# Session 2026-10-30 — the forward-window probe: an empty MLB window passes as "not measured" only when ESPN agrees, and its first read survives the page's own reload

Owner order: "/i-have-adhd go" (2026-10-30), on the offer "when the window has zero MLB entries, check ESPN's MLB scoreboard for the same
days and report enrichment 'not measured' only if ESPN also shows none. If the generator dropped games that ESPN shows, it stays red."
No CC-CMD covers this probe (searched `docs/` and `outbox/*.md` by content on 2026-10-30: the only hits are an unrelated baseline JSON and an
unrelated session doc), so none was filed; this doc is the record. Spec of record for the probe itself: `outbox/impact-2026-09-04-forward-schedule-window.md` §11/§14d.

## HEAD progression (jubilant-bassoon, direct to `main`)

| commit | what |
|---|---|
| `aff748d4` | start |
| `33e6300f` | the season-aware MLB clause: `scripts/forward-window-judge.cjs` (the verdict), ESPN asked from Node when the window is empty |
| `6d0931bc` | `scripts/probe-meta-read.cjs`: the first read of the cache metadata retries a lost execution context, and nothing else |
| `f4e5efba` | fixture: the runner's own ESPN readings instead of an unverifiable season note |
| `63604fc7` | a window that was never read is state `unread`, not an empty window (`espnNeeded()` is the one definition of "ask ESPN") |
| `acd686af` | ESPN events the generator never carries (preseason, exhibition, All-Star) are set aside; the manifest shows what and why |
| `9643d7c8` | check and harness survivors an independent review found |
| `70085ad6` | claims, comments and cost: corrected headers and counts, the workflow's mutation step skipped on the daily cron |
| `a7f22f25` | this doc |

Runner commits in between: `75a4ea5d`, `b9672b34` (the probe's own manifests), `5be5ce11` (state). No SW bump: nothing here is in the deploy gate's paths.

## Premises (Rule 100), and what refuted each

| premise I held | what refuted or corrected it | the command |
|---|---|---|
| "the probe has been red solely on `windowMlbTotal === 0` since 2026-10-28" | the 10-28 run was a lost page context (`cacheAccepted:false`, `metaError`); the first run red on the MLB clause alone is 10-29 (`bb2e9473`) | `git show 4e5885c4:outbox/forward-window-manifest-latest.json` |
| "the 10-26 manifest is a postseason off-day" | it is `cacheAccepted:false, schema:null`; the fixture key is now `context_lost` | print `cacheAccepted`, `windowHasDay` of `5656cfc2` |
| "a failed probe step is the MLB clause" (first live run, 41128854301) | it was the same lost context: two main-frame navigations (373, 847 ms), `metaError: Execution context was destroyed` | the run log, then `field.js:23439` |
| "an ESPN event count is the number of games the window should carry" | ESPN lists spring-training exhibitions and the All-Star Game that the generator's `gameType=R,F,D,L,W` never carries (review finding C1, reproduced) | `outbox/fixture-espn-mlb-event-kinds-20261030.json` |
| "a day with `windowMlbCount` 0 is an empty day" | a day that did not reach the client is 0 because nothing was read; the 21:11Z run printed NOT MEASURED for a window it never read (review C3) | manifest `75a4ea5d` |
| "ESPN's `calendar` tells which dates have games" | it lists 2026-10-25, 2026-10-29 and every day to 2026-11-11, all of which ESPN answers with `events: []` | `dates=20261025`, `dates=20261029` |
| "the reload is a race with the probe's first read" | the probe cannot affect whether the page reloads (9 of 15 manifests have one navigation); a reload that fires does not always hit the read (the 22:17Z run had two navigations and lost nothing), so what the probe controls is whether a reload that does fire costs it the run (review C14) | manifest history |

## What was built

**Verdict (`scripts/forward-window-judge.cjs`).** When every forward day was read and the window carries 0 MLB entries, ESPN's MLB scoreboard is
asked about the same dates from Node. ESPN lists games the generator carries -> FAIL (`dropped`). ESPN lists none for every date, all fetched ->
pass with `MLB enrichment NOT MEASURED` (the ESPN/statsapi name match was not exercised). A date ESPN could not be asked about -> FAIL
(`unverifiable`; a failed fetch is not a zero). A window that was never read -> `unread`, no ESPN question, and the clauses naming each unread day
are the verdict. The probe's own clauses (cache accepted, schema 2.1, `window_dates`, each day reaching the client) are unchanged; two guards are new
(no forward day read at all, a `windowMlbTotal` that is not a number). The manifest carries `espnMlb` (counts, listed, setAside, errors) and `verdict`.

**First read (`scripts/probe-meta-read.cjs`).** Retries a lost execution context, at most three attempts, each kept in `readFailures` with stage `meta`.
A timeout is not retried: a cache that is never accepted still fails once, at 30 s. The wait's timeout is now passed as options (it had been passed as
the predicate's argument; the same 30 s default applied).

## Proof

| claim | artifact |
|---|---|
| the verdict and the ESPN population rule | `scripts/check-forward-window-judge.mjs`, 95 cases: 54 on `judgeForwardWindow` (three real manifests, most on the off-season one; ESPN inputs are hand-written test inputs), 33 on `askEspnMlb` and the population rule (fake fetch, four real event shapes), 8 text assertions on the probe |
| it can fail | `scripts/mutate-forward-window-judge.mjs`, 69 of 69 caught, baseline green |
| the first read survives a real reload | `scripts/check-probe-meta-read.mjs`, 32 cases in headless Chromium: a reload is forced between the wait resolving and the handle being read; the OLD single-shot read on the same page fails with the runner's exact text, so the pass is not a page that cannot produce the race |
| it can fail | `scripts/mutate-probe-meta-read.mjs`, 28 of 28 caught, baseline green |
| live, the race survived | run 41130436375 (`6d0931bc`): navigations at 284 and 907 ms, `readFailures: [{attempt:1, stage:'meta', error:'... Execution context was destroyed ...'}]`, `metaError: null`, `cacheAccepted: true`, 3 of 3 days reached the client |
| live, the ESPN question | the same run: `espnMlb.counts` 0 for 2026-10-31, 11-01, 11-02, `verdict.mlb.state: not-measured`, run green. Run 41128854301 asked the same and read the same zeros |
| live, after the review fixes | run 41136703711 (`a7f22f25`, dispatch): every step green, including the check (2 s) and the browser mutation step (2 min 10 s, which the daily cron skips); manifest `08bab81a`: `cacheAccepted: true`, schema 2.1, 3 of 3 days, `espnMlb` now carries `counts`, `listed` (0 on each date) and `setAside` (empty), `verdict.mlb.state: not-measured`, no problems. Two navigations (174, 768 ms) and `readFailures: []`: a reload fired and did not hit the read |

## What the independent review found (workflow `wf_3a966bea-86e`: four lenses, 22 agents, a skeptic per finding who had to reproduce)

18 findings were verified: 16 stood, 2 were rejected. Seven more were reported but not verified (the workflow's per-lens cap of six; this
was my script's silent cap, found afterwards and handled here by reading each and building its mutant).

| finding | disposition |
|---|---|
| C1 ESPN counts spring training and the All-Star Game | FIXED `acd686af`, on real event shapes |
| C3 an unread window judged as an empty one | FIXED `63604fc7` |
| C4 a NOT MEASURED or dropped verdict could drop other problems (turned a failing run green) | FIXED `9643d7c8`, with the mutants that exposed it |
| C5, U9 the request timeout, host, scheme and non-5xx failures untested | FIXED `9643d7c8` |
| C6 the boundary of the empty-window clause untested | FIXED `9643d7c8` |
| C7 a lost context followed by a timeout untested | FIXED `9643d7c8` |
| C9 the retried phrase could be widened unseen | FIXED `9643d7c8` |
| U6, U7 recorded error text, stage, and null-not-zero in the artifact untested | FIXED `9643d7c8` |
| U8 boundary values of the unchanged clauses | FIXED `9643d7c8` |
| C8 the probe's manifest-building lines are checked only as text | LABELS CORRECTED; not built (below) |
| C10 to C16, U11, U12 false or overstated comments, counts and names | CORRECTED in `70085ad6` |
| C2 a partly empty window (some MLB entries, one silently empty day) is not examined | NOT BUILT (below) |
| U10 ESPN `events: []` is not proof of no games | RECORDED (below) |
| R1, R2 (rejected) self-tests gate the probe; 115 s of a 10-minute job | not defects; the cost point was acted on separately |

Corrections to what I stated earlier in this session: the 10-28 run was red for the lost context, not the MLB clause; the 10-26 fixture was not an
off-day; "every other assertion is unchanged" was inexact (two guards are new); the commit message of `6d0931bc` says the 10-21 run failed
"every forward day", but on 10-21 the three days had reached the client and only the metadata read was lost; `56 cases on three real manifests`
(`33e6300f`) overstated a cross product that never existed.

## Decisions not to build, with the reason

- **C2, a window with some MLB entries and one silently empty day, is not examined.** The ESPN question is asked only when the whole window is
  empty; the check asserts this on purpose ("the window is what is measured"). The old probe did not examine it either, so it is not a regression.
  Extending the clause to per-day comparison would add a failure mode the owner did not order. If wanted, it is a small change in `judgeForwardWindow`
  and `espnNeeded`.
- **C8, the probe's manifest-building lines (the MLB total, `windowHasDay`, `cacheAccepted`, `schema`) are not executed by any check.** The runner is
  their check, daily and on every dispatch. Running the probe against a fake page would be a separate harness.
- **U10, ESPN's empty list is the oracle, and the repo records ESPN answering 200 with `events: []` for a past date that had 15 games
  (`src/legacy/field.js:16192`).** For the dates in question the two sources agree: MLB's schedule (the generator's source, same filter) lists games
  only on 10-23, 10-24 and 10-26 to 10-28 in 2026-10-20..11-03, and ESPN is empty on 10-25 and 10-29. So the NOT MEASURED pass states what ESPN
  listed, and the residual is a false-empty ESPN on a forward date at the same time as a generator that dropped every game. Adding MLB's schedule as a
  second oracle would close it and is the next step if that ever matters.

## Asked after the work: is the probe only looking at baseball? (2026-10-30)

Yes for what it counts, and the file it checks is also narrow. Read, not assumed:

- `scripts/build-field-data.js:37-38`: `WINDOWED_SPORTS = ['mlb', 'soccer', 'wnba']`, `DAY0_ONLY_SPORTS = ['nhl', 'nba']`. NFL and college football have no key in the file.
- The committed file (`outbox/field-data-today.json`, generated 2026-10-30T14:26Z): 10-30 NHL 3; 10-31 one WNBA game (Atlanta Dream @ Golden State Valkyries); 11-01 and 11-02 zero.
- The relay for the same weekend, read through the relay probe tool: `/v2/games?sport=nfl&date=2026-11-01` returns 12 games, `source: espn-wc`. The probe passes with that day at 0.
- The probe counts `sched.mlb.length` only. Other sports on forward days are filled by the page's own ESPN fetch (per the probe's header); the manifest records cards rendered (28 on 10-31 in runs 75a4ea5d and b9672b34, 0 in the four others listed) and never asserts it.
- The day-0 file shows NBA 0 on Fri 10-30. Not checked whether that is real; the NBA feed had a 403 incident earlier this month (task 22).

**Open, owner's call:** per-sport forward-day counts from the relay (NFL, CFB, NBA, NHL), reported in the manifest and not asserted, about 40 minutes. Asserting needs a decision on
what counts as a failure (for example, the relay lists games for a sport and the page rendered no card for that day). Not started; the owner has not said go.

## Verified end to end vs not

- Verified live: the ESPN question and its answer, the `not-measured` verdict, the survived race, a green run.
- Verified by the checks and mutants only, not live: the `dropped`, `unverifiable` and `unread` verdicts (ESPN listing games with an empty window cannot
  be produced without breaking the generator), and the set-aside rule against real event shapes read through the Cloudflare-side probe tool.
- Not exercised until the 2027 season: the MLB enrichment name match (`totalEnrichMatched`). Unblocked when: a window carries MLB entries
  (`verdict.mlb.state: measured`, `totalEnrichAvailable > 0`). Verify: `git show origin/main:outbox/forward-window-manifest-latest.json | node -e 'const m=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(m.verdict.mlb.state,m.totalEnrichMatched,m.totalEnrichAvailable)'`.
- A foreseeable spring check: from about 2026-02-19 ESPN lists preseason games every day while the generator's window stays empty until
  three days before Opening Day. The population rule is what keeps that green; the first such run is the live proof, and its `espnMlb.setAside`
  shows what was set aside.

## Carry-forward, with its automation

Wake `trig_01WSBRbTaZMQCpwYR1fJ2BNx` (2026-10-31T19:30Z): read the scheduled run of 2026-10-31, dispatch `silently-dead-crons.yml` in
field-relay-nba, and confirm `jubilant-bassoon/forward-window-probe.yml` is no longer under NEW. The watch judges only scheduled runs and
the last three (10-28, 10-29, 10-30) all failed, so one green scheduled run ends the streak. GitHub has delayed this cron by up to six hours.
