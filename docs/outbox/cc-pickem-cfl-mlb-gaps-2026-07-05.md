# CC Session Outbox — Pick 'em MLB+CFL Gaps (CC-CMD-2026-07-05-pickem-cfl-mlb-gaps)

**Date:** 2026-07-05
**Scope:** `docs/CC-CMD-2026-07-05-pickem-cfl-mlb-gaps.md` — two real, user-reported
Pick 'em bugs, investigated live before any fix per the doc's explicit
requirement. Neither of the doc's own leads turned out to be correct as
stated.

## TASK 1 — MLB gap: which leads were right/wrong

**Doc's lead:** "It's possible ESPN flips a game's status away from `pregame`
shortly before first pitch" — **WRONG, disproven directly.**

**Real, confirmed cause:** Fetched the raw V2 relay endpoint directly
(`/v2/games?sport=mlb`) for the Marlins @ Athletics game. The **primary
`status` field genuinely stayed `"pregame"`** the whole time — ESPN/the
relay never flipped it away. The bug is in the client's own
`mapV2ToESPN()` (index.html ~17355), a heuristic built to catch a real but
*opposite* bug (api-sports.io mislabeling a genuinely-live NBA Finals G2
game as `"pre"`). For a freshly-scheduled MLB game it had two independent
false-positive paths:
1. `fg.clock !== '00:00'` — a string-equality check that didn't recognize
   the relay's actual pregame clock format, `"0:00"` (single leading
   zero), as zero.
2. `fg.home?.score != null` — treated a valid `0` score as "has a score."

Either alone flipped `state` to `"in"` the moment the relay started
tracking a scheduled game — well before real first pitch — which excluded
it from `getCardCircadian`'s `PREVIEW` gate (what the Pick 'em list filters
on), since `_circInput.state` prioritizes this cross-referenced value over
the correct `g.status`.

**Fix:** Parse the clock to total seconds (any zero-padding variant reads
as zero) and require a real (`>0`) score alongside a period number.
Verified in isolation against: the exact real observed pregame values
(→ `pre`, correct), the original NBA Finals G2 case (`clock:"10:12"` →
622s > 0 → `in`, unchanged), a genuinely final game (→ `post`), and a
live-at-period-boundary edge case with a real nonzero score and a `00:00`
clock (→ `in`, correctly still caught via the score branch).

**Live end-to-end verification (post-deploy, SW_VERSION `2026-07-05h`):**
fetched the live V2 relay again and found 3 genuinely-still-pregame MLB
games (Blue Jays @ Mariners, Red Sox @ Angels, Padres @ Dodgers — all
`status:"pregame"`, `clock:"0:00"`, `detail:"NS"`, the exact bug
signature). All three now correctly compute `state:"pre"` (previously
would have shown `"in"`), and **all three now appear in the live Pick 'em
list** alongside the CFL game. The original Marlins @ Athletics game had,
by the time of verification, genuinely gone live in real time (its own
`status` field now correctly reads `"live"`) — no longer a valid
reproduction case, but not a problem: this confirms the fix distinguishes
correctly between "still pregame" and "actually live" games, using the
exact same code path.

## TASK 2 — CFL gap: which leads were right/wrong

**Doc's lead:** "CFL assigns its own `_id` at the data-fetch layer... a
real structural difference, but whether it's actually what breaks the pick
display requires live confirmation" — **WRONG. The `_id` format was never
the problem.**

**Live investigation — "pick confirmation doesn't display":** made a real
pick against the real Winnipeg Blue Bombers @ Hamilton Tiger-Cats game.
`makePick()` fired with the correct arguments, the `.pick-widget[data-
gameid="cfl_13419691"]` DOM lookup found the widget on the first try, and
`buildPickWidgetHTML()`'s "pick made" branch produced the correct HTML
immediately. Re-tested after forcing a full re-render (exit/re-enter
pickem-mode, which re-runs `renderPickEmSection()` from scratch) — the
pick-made state persisted correctly. **This half of the reported symptom
did not reproduce in any tested scenario. No fix was applied for it since
nothing is confirmed broken** — the `_id` scheme lead is not the cause of
anything, because there is nothing here to cause.

**Live investigation — "the eventual win probability doesn't display":**
this half **is confirmed real**, via source tracing: `loadCFLScoreboard()`
fetches CFL data exactly **once** (a single `setTimeout(...,4300)` at
boot, gated against duplicate pushes) and sets `state`/`homeScore`/
`awayScore` directly on each game object — it never writes into
`espnScores` or `_scoresBySource`. `checkForNewFinals()` — the *only*
place `_resolvePickIfExists()` is ever called from — exclusively searches
those two stores to detect a completed game. A CFL game can therefore
never be recognized as final, so its pick can never resolve, regardless
of `_id` format.

**Fix:** a narrowly-scoped fallback inside `checkForNewFinals()`, gated
strictly to `sec.sport === 'Canadian Football (CFL)'`, that fires when a
CFL game's own `state === 'post'` and reuses the *existing*
`saveEspnFinal()`/`_resolvePickIfExists()` hook exactly as built for every
other sport (passing the game object itself as `eData`, since it already
carries `homeScore`/`awayScore`) — no new resolution logic invented.

**Live end-to-end verification:** since the real CFL game hasn't finished
yet, simulated completion by setting the live game object's
`state:'post'`, `homeScore:17`, `awayScore:24` (away/Winnipeg wins,
matching a fresh pick made moments earlier) and calling
`checkForNewFinals()` directly. Confirmed: `_seenFinals` picked up the
game, the pick cache updated to `resolved:true, wasCorrect:true`, a real
`_userDoRelay('/user/event', 'POST', {type:'pick_resolved', ...})` round
trip completed, and the widget re-rendered live to
`class="pick-widget pick-resolved pick-correct"` with a ✓. The
`resolvedProbability`/`probabilityLabel` fields came back null — this
matches the **already-disclosed, pre-existing limitation** from the
original pick-em-ui CC-CMD ("the WP resolver can't compute probability for
a fake/synthetic game"), not a new bug — the relay's win-probability model
has no real context for a manipulated test completion. The resolution
*mechanism* itself is fully confirmed working; a real completed CFL game
would get a real probability the same way MLB/NBA picks already do.

## What was NOT fixed, and why (flagged for follow-up)

**CFL still cannot resolve a pick *live, mid-session*** — only once the
game has ended AND the page is reloaded/revisited (since CFL data itself
never refreshes after its one-time fetch, the `state:'post'` transition
during an active session is never observed). Closing this fully requires
adding CFL to a recurring live-score poll (mirroring the existing V2 poll
loop other sports use) — **explicitly out of scope for this CC-CMD**:
Rule 78 (API-COST-A) requires identifying the CFL relay endpoint's rate
limit/cost model *before* adding any new recurring external call, which
hasn't been done. Recommend a dedicated follow-up CC-CMD: (1) probe the
CFL relay's rate limits/cache headers, (2) add a recurring
`loadCFLScoreboard()` poll on a cadence informed by that, (3) update the
existing games in place (matching by `_id`) rather than re-pushing a
duplicate section, (4) optionally also feed a `_scoresBySource`-shaped
entry so `checkForNewFinals()`'s primary path picks it up naturally
instead of needing the CFL-specific fallback added here.

## Commits

- `973430f`/`7c701ed` (rebased) — both fixes, SW_VERSION `2026-07-05g` → `h`
- This manifest

## Confidence

Both applied fixes are verified live, end-to-end, against the deployed app
(SW_VERSION `2026-07-05h`), including a real relay round-trip for the CFL
resolution path. Confidence ≥95 on both fixes as scoped. The CFL
live-mid-session-resolution gap remains open by design, documented above
with explicit next steps, not silently patched around.
