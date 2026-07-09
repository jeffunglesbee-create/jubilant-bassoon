# CC Session Outbox — Fix the Broken `_gameId` Comparison + Generalize Real-ID Matching (CC-CMD-2026-07-09-realid-fix-and-generalize)

**Date:** 2026-07-09
**Scope:** `scoreSMTCard`'s "Item 6: Live state suppression" compares
`v._gameId === card._gameId` — a real, exact-equality check that has
plausibly never worked, because `card._gameId` was set to FIELD's own
internal `game._id` counter while `v._gameId` (from `mapV2ToESPN`) is
api-sports.io's real external `fg.id` — two ID spaces that can never be
meaningfully equal. Fix the root construction bug, then generalize
real-ID matching into the shared matcher(s).

## PROBE BLOCK — the central architectural question

The doc's own premise ("game construction and espnScores construction
both originate from the same `fg` record") needed direct confirmation
before choosing an implementation branch. Traced both sides:

**`espnScores` side:** `fetchV2AllScores()` (~17785) calls
`fetchV2Games(sport, queryDate)` against the relay's `/v2/games` route,
then `mapV2ToESPN(fg)` (~17650) builds each entry with `_gameId: fg.id`
(api-sports.io's real external ID), keyed into `espnScores` by
`` `${fg.home.name}|${fg.away.name}` ``.

**`allData.sports[].games[]` side:** traced `buildTodaySchedule()`
(~11532) — the function that actually populates the live "today"
schedule (called from `fetchSchedule()`). Its `nbaGames`/`nhlGames`/
`mlbRaw`/etc. are **hand-maintained static literal arrays** (real scores
and matchup notes typed in by hand each day) — they never set `_id` at
all inline. `_id` is applied generically elsewhere via a fallback-stamp
pattern found at 3 sites (`if(!g._id) g._id="g"+(++_gid);` — lines 9404,
11098, 32352) and, for the ESPN-scoreboard-fixture path
(`fetchESPNFixturesForDate`, ~7265), directly as `` _id:`g${_gid}` `` —
FIELD's own per-page-load counter, in both cases. The WC26 static
schedule (`maybePushWorldCup`/`wc26Raw`) uses yet another
FIELD-internal scheme (`_id:"wc26_g11_mex_rsa"`-style literals).

**Conclusion, confirmed not assumed: game construction and espnScores
construction are NOT unified — two independent, parallel code paths
that happen to describe the same real-world games.** This is Branch B
from the CC-CMD's own explicit fork. `findEspnEntry()` exists precisely
because this bridge has always been necessary.

**Full fresh `_gameId` sweep** (`grep -n "_gameId\s*[:=]" index.html`)
— every hit accounted for, not just the doc's named 5:

- **5 real construction sites, fixed** — 2 in `buildDynamicPregames()`
  (NBA/NHL pregame cards), 1 in `buildWCMediaCards()` (WC per-game
  cards), and **2 in `buildPlayoffSpecials()`** (NBA Finals / Stanley
  Cup Final cards) — the doc named only `buildDynamicPregames()`/
  `buildWCMediaCards()`; `buildPlayoffSpecials()` wasn't named but has
  the identical `_gameId: game._id` bug and needed the identical fix.
  Reporting this correction honestly rather than silently matching the
  doc's undercount.
- `mapV2ToESPN` (~17690, `_gameId: fg.id`) — source of truth for the
  real ID, left untouched (correct: this side was never the bug).
- `scoreSMTCard`'s comparison (~12983) — left untouched, exactly as the
  CC-CMD specified: only what `card._gameId` *contains* needed to
  change.
- FD/football-data.org writer (~14649,
  `game._id || resolveGameIdByHome(game.home)`) — **explicitly out of
  scope per the CC-CMD**, confirmed untouched.
- **4 additional sites not named in the doc, investigated rather than
  silently skipped:** `resolveGameIdByHome(homeName)` (~20353) returns
  `g._id` — FIELD's own internal ID, resolved by a home-name lookup
  against `allData.sports`, never api-sports.io's `fg.id`. Its 4 callers
  (~18714 boxscore/leaders lookup, ~20138 drama-history lookup, ~20941
  MLS/Opta `gameOptaId` correlation, ~22956 AFL/Squiggle scenario
  correlation) are all FIELD-internal-ID propagation for internal
  cross-referencing — the same class as the explicitly-excluded FD
  writer, not the fg.id/game._id namespace-mismatch bug this CC-CMD
  targets. Also checked a local `_gameId` variable (~38413, drama
  persistence tracking key) — same internal-use class. None of these 5
  compare against `v._gameId`/an espnScores entry anywhere. Correctly
  left untouched.

## TASK 1 — Root fix (Branch B: one-time fuzzy match, not construction-time stamp)

Added `_resolveRealGameId(game)` (index.html:10591, immediately after
`findEspnEntry`): looks up the game's real external ID via a one-time
`findEspnEntry(game, {requireSameDate:true})` fuzzy match against
`espnScores`, and **caches the result onto `game._gameId`** (mutating
the actual game object referenced from `allData.sports[].games[]`) so:
(a) repeat calls for the same game object are free, and (b) any other
`findEspnEntry`/`_eDataMatchesGame` caller that later receives this same
game object gets the ID fast path (TASK 2) automatically. Returns `null`
if no match exists yet (e.g., V2 poll hasn't populated `espnScores` for
this game at the time of the call) — no fallback to `game._id`, since
`scoreSMTCard`'s own `card._gameId &&` truthy guard already skips the
suppression check cleanly when unset, so a stale/wrong fallback value
would only reintroduce a diluted version of the same bug.

All 5 real construction sites (`buildDynamicPregames` ×2,
`buildWCMediaCards` ×1, `buildPlayoffSpecials` ×2) changed from
`_gameId: game._id,` to `_gameId: _resolveRealGameId(game),`.

**Reported honestly, not forced to the doc's Branch A assumption:**
this is a one-time-fuzzy-then-stable-reuse pattern, not a
construction-time stamp — required because game construction and
espnScores construction are architecturally independent, confirmed via
direct code tracing above, not asserted from the doc's premise.

**Known, honestly-reported timing characteristic:** `buildDynamicPregames()`/
`buildWCMediaCards()`/`buildPlayoffSpecials()` are called from
`renderMedia()`, which fires exactly **once** per page session (lazy,
gated by an IntersectionObserver on the media section scrolling into
view — `mediaRendered` flag never resets). If that single call happens
before the V2 poll (`startV2ScorePolling()`, kicked off synchronously
at the end of `fetchSchedule()`, i.e. essentially at boot) has delivered
data for a given game, `_resolveRealGameId` returns `null` for that
game and the card's suppression never engages for the rest of the
session (degrading to the pre-fix, always-broken behavior for that one
card — not a regression, since suppression never worked at all before
this fix). This is the same pre-existing timing dependency every other
`findEspnEntry()` consumer migrated earlier tonight already carries; not
a new risk this fix introduces.

## TASK 2 — Real-ID fast path, generalized once in each shared matcher

**`findEspnEntry(game, {requireSameDate=true}={})`** (index.html:10551):
if `game._gameId` is present, resolve directly via
`Object.values(espnScores).find(v => v._gameId && v._gameId === game._gameId)`
and return immediately — no fuzzy fallback if the ID doesn't match (a
resolved real ID is authoritative, not a hint, per the CC-CMD's own
framing), and the stale-final date guard is skipped for this branch
(ID equality already proves the same real-world event; the guard exists
specifically to catch name-based false positives across different
dates, which can't happen once IDs are compared directly). Falls
through to the existing fuzzy path unchanged when `game._gameId` is
absent.

**`_eDataMatchesGame(game, eData)`** (index.html:38347): same fast
path — if both `game._gameId` and `eData._gameId` are present, compare
directly and return the boolean; fuzzy path runs unchanged otherwise.

Implemented exactly once in each function — every current consumer
(`fetchWCLiveGames`, `_otwFindLiveGame`, `renderMobileLiveBar`,
`renderHalftimeSwitch`, `updatePinWidget`, `saveEspnFinal`, etc., all
migrated in earlier CC-CMDs tonight) and every future one benefits
automatically, with zero duplicated logic. Backward-compatible by
construction: none of those existing callers' `game` objects currently
carry `_gameId` (only the 5 sites this CC-CMD touches populate it), so
the fast-path condition is false for them and behavior is unchanged.

## TASK 3 — Live-style verification, observable not inferred

Extracted the actual committed functions verbatim from `index.html`
(brace-matched extraction, not reimplementation) and ran them in a
Node `vm` context with `console.log` pass/fail output — matching this
session's established real-behavior-proof discipline. 9/9 checks
passed:

**(a) Real-ID match:** constructed a WC26-shaped `espnScores` entry
(`_gameId: 'espn:760510'`, the real relay-native ID format confirmed
live via `probe_relay_route` in an earlier CC-CMD tonight) and a
matching FIELD game object (`_id: 'g7'`). `_resolveRealGameId(game)`
returned `'espn:760510'` and stamped it onto `game._gameId` — confirmed
exactly equal to the espnScores entry's `_gameId`, while `game._id`
(the internal counter) was left untouched.

**(b) `scoreSMTCard` suppression genuinely fires where it couldn't
before:** built two cards for the identical live game — one with
`card._gameId = 'g7'` (the OLD, broken assignment) and one with
`card._gameId = 'espn:760510'` (the NEW, fixed assignment) — and scored
both against the same live `espnScores` entry. OLD: no suppression
penalty applied (bug reproduced — `v._gameId` and `card._gameId` were
never in the same namespace). NEW: `score === -50`, the suppression
penalty, confirmed firing.

**(c) The fast path is demonstrably TAKEN, not just present:** built an
`espnScores` entry with completely mismatched team names (so the fuzzy
path is provably incapable of matching it) but a real `_gameId`
matching the query game's resolved `_gameId`. Both `findEspnEntry()` and
`_eDataMatchesGame()` still resolved correctly — only reachable if the
ID-equality branch actually ran instead of falling through to fuzzy
matching. Two negative controls: (1) a game with no `_gameId` correctly
falls through to fuzzy matching and returns `null` when names don't
overlap (fast path correctly does NOT engage without a real ID present);
(2) a game with a real `_gameId` that has no matching `espnScores` entry
correctly returns `null` rather than silently falling back to fuzzy
matching (confirming "authoritative, not a hint").

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged — no new assertions added,
none requested this pass). `node field_unit.js`: 66/0. `node
field_smoke.js index.html`: 21 failures, matches the documented
pre-existing baseline. All 3 inline `<script>` blocks syntax-checked via
`node --check` after every edit.

## DONE CONDITIONS

- [x] Root cause of `card._gameId`'s wrong value fixed at its actual
      construction site(s) (5 real sites, including 2 in
      `buildPlayoffSpecials()` the doc didn't name), approach matching
      what the probe found (Branch B — independent construction paths,
      one-time fuzzy match cached onto the game object)
- [x] `findEspnEntry`/`_eDataMatchesGame` try real ID equality first for
      V2-resolved entries, fall back to fuzzy matching otherwise —
      implemented once, in each shared matcher
- [x] Live-verified: `scoreSMTCard`'s suppression fires on a real case
      where it previously could not, and the ID fast path is
      demonstrably taken (via negative controls), not just theoretically
      present

## CONFIDENCE SCORING

- +30 — root construction-site bug fixed, approach matches what the
  probe actually found (Branch B, confirmed via direct code tracing —
  `buildTodaySchedule`'s hardcoded arrays + the `_gid` fallback-stamp
  pattern — not the doc's unconfirmed Branch A premise): **met**
- +30 — real-ID fast path correctly generalized into the shared
  matcher, not duplicated per caller — one change in `findEspnEntry()`,
  one in `_eDataMatchesGame()`, every consumer benefits automatically:
  **met**
- +20 — FD writer correctly left alone, not incorrectly unified; also
  investigated and correctly excluded 4 additional `resolveGameIdByHome`-
  based sites plus a drama-tracking local variable found in the fresh
  sweep but not named in the doc, all confirmed to be FIELD-internal-ID
  propagation, not the namespace-mismatch bug: **met**
- +20 — live verification is observable (vm harness with printed
  pass/fail, extracted verbatim committed functions, real WC26 ID
  format, negative controls proving the fast path is genuinely reached
  rather than merely present) — TASK 3 explicitly allows "real or
  constructed V2-sourced game data"; this is constructed but realistic:
  **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-09g` → `2026-07-09h`.
- `index.html`: `_resolveRealGameId()` added; `findEspnEntry()` and
  `_eDataMatchesGame()` gain a real-ID fast path; 5 real
  `_gameId: game._id` construction sites (`buildDynamicPregames` ×2,
  `buildWCMediaCards` ×1, `buildPlayoffSpecials` ×2) migrated to
  `_resolveRealGameId(game)`.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
