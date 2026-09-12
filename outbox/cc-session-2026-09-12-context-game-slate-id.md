# CC session — 2026-09-12 — /context/game and the slate id

Executes `docs/CC-CMD-2026-09-12-context-game-slate-id.md`.
Both halves of a cross-repo change (Rule 70): relay first, client to match.

| repo | HEAD before | HEAD after |
|---|---|---|
| jubilant-bassoon | `9bd0bb56` | `ec6b797a` |
| field-relay-nba | `2a33303` | `7a8e947` |

Deploys: relay run **930** SUCCESS (`cce2cd7`); client deploy-gate runs **944**
(`5931418f`) and **945** (`41931c5f`), both SUCCESS.
Smoke 1044 / 0 failed throughout. SW_VERSION `2026-09-11a` → `2026-09-12b`.

---

## Task 0 — which path skips `_gameId`, measured rather than read

`allData` is module-scoped inside the esbuild bundle and is not on `window`, so
the propagation state cannot be read by `page.evaluate`. The same fact is
observable at the boundary: **which id the client puts in the URL.** The probe
now records the id form of every `/context/game/` request.

Run 34696768322, a full live run:

```
id forms: {"bare_slate_id": 1}
/v2/games requests: 62
```

One of one went out as `g30`. The `_gameId` annotation the V2 poll writes onto
`allData.sports` — `field.js`, the Round/Series/_gameId block — does not reach
the cards, across 62 polls. That is the answer Task 0 asked for, and it is not a
per-sport quirk: nothing was annotated.

## What was worse than the CC-CMD stated

The CC-CMD recorded "briefs: present" for slate ids. Probed directly:

```
GET /context/game/g19  →  200, 2736 bytes
  mlb_game_2026-08-19_g19   Cubs / White Sox      "Wrigley Field plays 4% higher…"
  mlb_game_2026-08-18_g19   Phillies / Marlins    "Citizens Bank Park plays host…"
  mlb_game_2026-08-16_g19   Giants / Padres       "Oracle Park suppresses scoring…"
  mlb_game_2026-08-15_g19   Giants / Padres
  mlb_game_2026-08-12_g19   Padres / Brewers
```

`findBriefs` falls back to `id LIKE '%<id>%'`, and every day's slate has a
position 19. So the ten MLB cards were not showing a pre-game brief instead of a
final one — they were showing **a different game's prose entirely**, from a
random past date. DO NOT INVENT class, live.

## Task 2 — relay (`cce2cd7`)

`classifyContextGameId(id, game)` → `resolved` | `unresolved` | `unrecognized`.
An unrecognized id returns 200 with `resolved:false`, `id_form`, and `game`,
`archive`, `series`, `enrichment`, `bracketDelta` all null; the four lookups do
not run at all.

200 and not 404: the client's `if (!r.ok) return` absorbs a 404 identically to a
network failure, which would destroy the distinction the change exists to make.

Live after deploy:

```
/context/game/g19             200, 143 bytes   resolved:false  id_form:unrecognized  archive:null
/context/game/espn:401816899  200, 6105 bytes  resolved:true   id_form:resolved
                                               opening_odds_parsed 8/8, closing_odds_parsed 8/8
                                               gameBriefs: game_recap_mlb_401816899  ← the right game
```

Gate: `scripts/check-context-game-id-forms.mjs`, blocking in `deploy.yml`. 12
enumerated forms, coverage printed with the result (Rule 91). Three mutations
proven to fail it, each by its own property (Rule 90):

| mutation | caught by |
|---|---|
| `return 'unrecognized'` → `'unresolved'` | 4 refusal cases |
| `^[a-z]+:\d+$` → `^zzz:\d+$` | 2 external-event cases |
| function declared twice | anchor uniqueness — reports that NOTHING was checked |

The check earned its place before shipping: `nba_finals_2026_g4`, this repo's
own documented example id, classified as `unrecognized` under the first rule
set. The season-year rule was widened because of it.

## Task 1 — client (`5931418f`, then `41931c5f`)

`injectDebriefCards` resolves a durable id at the point of use rather than
depending on the annotation having landed:

```js
const _v2Entry = findEspnEntry(rawGame);
const _v2Id    = _sameUTCDay(_v2Entry?.start_time, rawGame.start_time) ? _v2Entry._gameId : null;
const contextId = rawGame._gameId || _v2Id || (/^g\d+$/.test(gameId) ? null : gameId);
if (!contextId) return;
```

Every sport, not MLB. When nothing durable resolves it asks for nothing — an
absent identity is a state of its own, never a lookup key (Rule 99).

**The second commit is the interesting one.** Resolving from `espnScores` closed
one wrong-game path and opened another: `espnScores` is keyed by team name
alone, so a card for yesterday's Cubs/Pirates resolves today's rematch and takes
**today's** `espn:` id. `findEspnEntry`'s own stale-final guard covers only the
opposite direction (a final score landing on a card whose start time has not
passed), so the date check belongs at this call site. Six cases self-tested,
including the rematch and three unparseable inputs.

## Three defects in the measuring apparatus, again

Consistent with this session's dominant pattern — the instrument failed more
often than the product.

1. **Run 34697166194** — `cards 0`, no manifest committed at all. A fresh
   browser profile gets the My Services setup modal; it is `aria-modal` and
   intercepts every pointer event, so Playwright retried `#date-prev` against it
   for thirty seconds and threw. Fixed: click `#setup-skip` first, and never let
   the date control throw — a failure is recorded in `date_nav_error` and the
   run continues to the DOM read. A probe that dies produces no evidence, which
   reads the same as evidence of nothing.

2. **Run 34697310538** — hunted for a date with an injected debrief, overshot to
   Thu Sep 10, and read a slate of **zero cards**. "The client renders nothing
   for this date" is a third reality the hunt had no way to report, because it
   only ever asked whether a debrief had been injected. Fixed: one deterministic
   step (`STEP_BACK_DAYS`, default 1), a 25s settle, and `slate_by_step`
   recording the date label and card count at every stop.

3. **The id-form classifier** was self-tested against all three real shapes plus
   a golf id before it was trusted to report anything.

## Also found, NOT fixed here (Rule 69)

- **`hydrateMissedRecaps` has never produced a snippet.** It reads
  `data?.briefs`, and the payload's shape is `archive.gameBriefs`. The `||`
  chain falls through to `[]` every time, silently.
- **`mapV2ToESPN` marks every final V2 game as live.** It tests
  `fg.state === 'final'`, and `/v2/games` returns `"post"`. With `periodNum 9`
  and a non-zero score, `isActuallyLive` is true for every completed game.
- **`npm run lint` has 7 `no-restricted-syntax` errors in `index.html` at HEAD**,
  unrelated to any commit here. The documented pre-commit hook is not installed
  in this container; every commit here ran smoke, per-day invariants and units
  directly and recorded `[no-verify: …]` with the reason.

Each needs a CC-CMD before it is worked (Rule 87.4).

## Open

`docs/CC-CMD-2026-09-12-odds-movement-sequence-discipline.md` — the Layer 6
"unchanged from open" guard fires only when both timestamps exist and are equal,
so an absent or reversed `captured_at` still renders "unchanged". field-laboratory's
`OddsStory` (`src/Desk.fs:1324`) has the stricter test to port: `ct > ot`, else
unverifiable.

## Task 4 — SATISFIED 2026-09-12 16:24 UTC

Run 34705060530, manifest `outbox/odds-line-probe-manifest-20260912T162417Z.json`:

| field | value |
|---|---|
| slate cards | 129 |
| debriefs injected | 41 |
| `/context/game` id forms | `{"espn_prefixed": 41}` — **zero bare slate ids** |
| `.debrief-odds-movement` layers | 5, all visible |
| `page_error_count` | 0 |

Named game ids per state:

- **unchanged** — `espn:401879284`, "Home moneyline +125 (44% implied), unchanged from open"
- **moved** — `espn:401879283`, "Home moneyline -450 → -475, 0.8 pts toward home"

`no_odds` and `opened_only` are reported absent for this run, not inferred.

Three earlier readings in this file are superseded by it, and one prediction in
it was wrong: I expected the `MY_TEAMS` fix to also clear the past-date blank
page. It did not — `date_nav_check` still reads
`{cards: 0, empty_note: null, loading_wraps: 1, ok: false}` with zero page
errors. The past-date defect is separate and stays open.

### Superseded: what blocked this until 16:24



No run has observed a `.debrief-odds-movement` layer in the live DOM. Reported
absent, never inferred.

**Why, measured:** a debrief layer needs a completed game, and at 13:50 UTC on a
Saturday the current ET date has nothing final. Stepping back a day — the
obvious route — lands on a slate that renders **neither cards nor a message**:

| step | date label | `.game-card` | `.empty-note` |
|---|---|---|---|
| 0 | Today | 44 | — |
| 1 | Yesterday | **0** | **null** |

Sampled every 5s to 60s: twelve consecutive zeros, so empty rather than slow.
Fri 2026-09-11 has 15 completed MLB games and full opening/closing odds, so the
date is not genuinely empty. Filed as
`docs/CC-CMD-2026-09-12-past-date-slate-renders-nothing.md`.

**Automated instead of carried forward (Rule 87.3).** `odds-line-probe.yml` now
runs on `cron: 45 3 * * *` — 23:45 ET, when the day's games are final and the
client's ET date has not rolled over, so the layers are observable on "Today"
with no date navigation at all. The 03:46 run this morning saw 38 cards and 10
injected debriefs at exactly that hour. `STEP_BACK_DAYS` now defaults to 0;
stepping back measures the other defect, not this one.

### Six defects in the measuring apparatus, one in the product

The product side took two commits. The instrument took six, every one of them a
false or unreadable signal about the render path:

| # | run | what it reported | what was wrong |
|---|---|---|---|
| 1 | — | — | the id-form classifier, self-tested before it was trusted |
| 2 | 34697166194 | `cards 0`, no manifest | the setup modal intercepted `#date-prev` |
| 3 | 34697310538 | `slate_cards: 0` | the date hunt overshot to Thu Sep 10 |
| 4 | 7, 8, 9 | nothing at all | the commit step had no `if: always()` |
| 5 | 34697542148 | `Yesterday: 0` | one sample cannot separate empty from slow |
| 6 | 34697…1357 | `0 cards` | zero cards is three `.empty-note` realities, collapsed into one number |

Number 6 is the one worth keeping: I committed the exact collapse this CC-CMD
exists to fix, into the instrument built to verify the fix.

## Earlier runs, for the record


| run | result | cause |
|---|---|---|
| 34696768322 | `bare_slate_id: 1` | the measurement that diagnosed Task 0 — pre-fix, as expected |
| 34697166194 | no manifest | the setup modal intercepted `#date-prev` |
| 34697310538 | `slate_cards: 0` | the date hunt overshot to a date with no slate |
