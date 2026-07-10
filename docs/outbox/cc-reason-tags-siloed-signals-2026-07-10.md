# CC Session Outbox — Extend getGameReasonTags() with Three Real, Siloed Signals (CC-CMD-2026-07-10-reason-tags-siloed-signals)

**Date:** 2026-07-10
**Scope:** Three real, already-computed signals — `isRivalGame(g)`,
`isNationalGame(g)`, and the weather-intelligence `extreme` flag — each
currently feeding exactly one other consumer, none reaching
`getGameReasonTags()` (shipped prior CC-CMD, 100/100). Extend the one
existing aggregator, not build three separate consumers.

## PROBE BLOCK

`grep -n "function getGameReasonTags" -A 15 index.html` — re-confirmed
the exact shipped sequence (`user_team` → `_gameImportance` → live tier
→ `close_late`, live-state signals gated inside `if(eData)`), matching
the last CC-CMD exactly.

`grep -n "function isRivalGame\|function isNationalGame" -A 5
index.html` — `isNationalGame(g)` confirmed trivial (`!!(g.nationalBundle)`).
`isRivalGame(g)` confirmed real: iterates `MY_TEAMS`, returns `false`
immediately if the game itself involves a followed team (correctly
distinct from `user_team` — this flags "your RIVAL is playing," not
"your team is playing"), otherwise checks `RIVAL_MAP` for a match on
either side. Has its own internal try/catch guard against a TDZ risk;
already safe to call with an empty `MY_TEAMS` (the loop simply doesn't
execute).

`grep -n "WEATHER INTELLIGENCE" -A 20 index.html` — **real drift found,
exactly as the doc's own comment anticipated ("this doc's citation may
have drifted; verify before reusing it").** `wxCache[game._id]` does
**not** carry an `.extreme` property. `computeInsights()` computes
`extreme` as a **local variable** (`wx.temp<20||wx.temp>100||
wx.wind>25||wx.precip>0.5`) and attaches it to a separate `weather`
object it builds — never writes it back onto the raw cache entry.
Confirmed by grepping every `extreme`/`.extreme` site in the file (13
hits total, only 2 relevant to weather, both inside `computeInsights()`
itself, no write-back path anywhere else).

## TASK 1 — All three signals added, one correction to the doc's own citation

Added to `getGameReasonTags()` (index.html), placed exactly where the
doc specified — after `user_team`/`_gameImportance`, before the
live-tier/`close_late` block, since these three are pregame-available
facts:

```js
if (typeof isRivalGame === 'function' && typeof MY_TEAMS !== 'undefined' && MY_TEAMS.size > 0 && isRivalGame(game)) tags.push('rivalry');
if (typeof isNationalGame === 'function' && isNationalGame(game)) tags.push('national_tv');
if (typeof wxCache !== 'undefined' && game._id) {
  const wx = wxCache[game._id];
  if (wx && (wx.temp<20||wx.temp>100||wx.wind>25||wx.precip>0.5)) tags.push('weather_extreme');
}
```

`isRivalGame`/`isNationalGame` lines match the doc's template exactly.
**The weather line differs from the doc's literal template** (which
read `wxCache[game._id]?.extreme`) — corrected to compute the exact
same established formula inline from the raw cache entry, since that
property doesn't exist where the doc assumed. This isn't a new
heuristic — it's the identical formula already used inside
`computeInsights()`, reused verbatim rather than reading a value that
was never actually stored there. Matches the same pattern the prior
CC-CMD used for `_isCloseAndLate()` (mirror established logic rather
than depend on an intermediate that may not have run yet —
`getGameReasonTags()` has no guaranteed call-order relative to
`computeInsights()`).

## TASK 2 — Live-style verification, all 3 signals + multi-tag + regression

Extracted `getGameReasonTags`, `_isMyTeamGame`, `_isCloseAndLate`,
`_otwGetLiveTier`, `getSmoothedDrama`/`getRecentDrama`/`getDramaHistory`,
`dramaScoreLive`/`applyQW1SituationBonus`, `_gameSport`, `isRivalGame`,
`isNationalGame`, and the real `RIVALRIES`/`RIVAL_MAP` construction
**verbatim** from the committed file and ran them in a Node `vm`
harness. 7/7 checks (a first-draft extraction bug on the `RIVAL_MAP`
population line — investigated and fixed rather than assumed to be a
shipped-code bug — is noted below):

**CASE A (rivalry only):** `MY_TEAMS = {Boston Celtics}`, query game
Lakers vs Nuggets (a real Celtics/Lakers rivalry pair from
`RIVALRIES`, Celtics itself not in this game) — output `["rivalry"]`.

**CASE B (national_tv only):** no followed team, real
`nationalBundle: 'NBA_ABC'` — output `["national_tv"]`.

**CASE C (weather_extreme only):** no followed team, no bundle, a
`wxCache` entry with `wind: 32` (crosses the real `wind>25` threshold)
— output `["weather_extreme"]`.

**CASE D (none, no false positive):** a followed team not involved, no
rival present, no bundle, mild weather (`wind: 8`) — output `[]`.

**CASE E (multi-tag, correct order):** `_gameImportance: 'clinch'` +
a real rival pair + a real `nationalBundle`, simultaneously — output
`["clinch","rivalry","national_tv"]`, exactly the documented priority
order.

**CASE F (regression):** the original 4-tag case from the prior
CC-CMD (followed team, elimination, live Q4 close game) — output
unchanged: `["user_team","elimination","LIVE_GAME","close_late"]`,
confirming the 3 new signals don't interfere with the original
sequence.

**Test-harness bug caught and fixed, not silently rationalized:** the
first extraction attempt grabbed only the `const RIVAL_MAP=new Map();`
declaration line, missing the separate `for(...)` loop line on the next
line that actually populates it — `RIVAL_MAP.size` was silently `0`,
causing CASE A/E to fail. Investigated rather than accepted; fixed the
extraction to capture both lines. Not a bug in the shipped code.

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] All three signals added using only real, existing functions/data
      — no new signal computation (the weather formula is copied
      verbatim from `computeInsights()`, not invented)
- [x] Guard pattern matches the existing function's established
      `typeof X === 'function'` style
- [x] Ordering placed correctly relative to the original 4 tags,
      confirmed via the probe's re-read and verified in CASE E/F
- [x] Live-verified: each signal independently (CASE A/B/C), a
      no-false-positive case (CASE D), a multi-tag combination with
      correct ordering (CASE E), and a regression check (CASE F)

## CONFIDENCE SCORING

- +30 — all three signals correctly added using only real existing
  functions/data, including catching and correcting a drifted citation
  in the doc's own weather template rather than shipping a check
  against a property that doesn't exist: **met**
- +20 — guard pattern and ordering consistent with the original
  function's established conventions, confirmed against the probe's
  re-read: **met**
- +25 — live verification covers all three signals independently
  (CASE A/B/C) plus a no-false-positive case (CASE D): **met**
- +25 — multi-tag combination case verified with correct tag ordering
  (CASE E), plus a regression check confirming the original 4-tag
  sequence is unaffected (CASE F): **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-10a` → `2026-07-10b`.
- `index.html`: `getGameReasonTags()` extended with `rivalry`,
  `national_tv`, and `weather_extreme` checks; header comment updated.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
