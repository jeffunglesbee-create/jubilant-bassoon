# CC Session Outbox — getGameReasonTags(), Shared Reason Vocabulary for Bundles 1 and 3 (CC-CMD-2026-07-09-game-reason-tags)

**Date:** 2026-07-09
**Scope:** **Foundational, not a bug fix** — same category as tonight's
other two primitives (`claimCardRegion`, `field:otw_changed_significant`).
No shared function currently aggregates multiple simultaneous "why this
game matters" signals into one reusable list; two separate bundle
categories (Bottom Sheet items, Ritual items) are blocked on the
identical missing piece.

## PROBE BLOCK

`grep -n "const isMyTeam" -A 10 index.html` — **real drift found and
reported, not silently followed.** The CC-CMD's own premise ("`isMyTeam`
computed identically three times in one function") does not hold:
`buildViewerIntelChip()` computes it exactly **once** (`const isMyTeam=
...` at ~36564-in-the-pre-edit-file) and *references* it three times
across its `stakes`/`stories`/`myteams` mode branches — already correct,
non-duplicated code, not triplicated. TASK 2's real, in-scope value is
still genuine: extract that one computation into a shared helper so
`getGameReasonTags()` doesn't have to re-inline the same
`MY_TEAMS.has(...)` check a second time — just not "3 duplicates to 1."

`grep -n "_gameImportance" index.html | head -20` — confirmed the real,
full set of values in current use: `elimination`, `series_deciding`,
`clinch`, `playoff_impl` (the canonical 4 used in `preGameScore()`'s own
boost map, ~10058) **plus `'playoffs'`** — a 5th value used extensively
across the hardcoded NBA/NHL Finals game data, not recognized by that
same boost map (falls through to `||0` there) but a real, present value
nonetheless. The doc's own probe instruction anticipated exactly this
("clinch, elimination, playoffs, and any others") — confirmed rather
than assumed exhaustive.

`grep -n "function _otwGetLiveTier" -A 12 index.html` — re-confirmed
unchanged since the earlier `otw-significant-event` CC-CMD tonight: 4
named tiers (`CRUNCH`, `EXTRA_TIME`, `CLOSE_FINISH`, `LIVE_GAME`) or
`null`, signature `(eData, sport, smoothed)`.

## TASK 1 — The aggregator, built from confirmed-real signals only

Added `getGameReasonTags(game, eData)` (index.html, right after
`buildViewerIntelChip()`):

```js
function getGameReasonTags(game, eData) {
  const tags = [];
  if (!game) return tags;
  if (_isMyTeamGame(game)) tags.push('user_team');
  if (game._gameImportance) tags.push(game._gameImportance);
  if (eData) {
    const sport = _gameSport(game);
    const smoothed = getSmoothedDrama(game._id) ?? dramaScoreLive(eData, sport);
    const liveTier = _otwGetLiveTier(eData, sport, smoothed);
    if (liveTier) tags.push(liveTier);
    if (_isCloseAndLate(eData, sport)) tags.push('close_late');
  }
  return tags;
}
```

Every signal reused from an already-real, already-verified source:
`_isMyTeamGame` (TASK 2, below), `game._gameImportance` pushed
**verbatim** (not translated into an invented taxonomy — surfaces
whichever of the real 5 values is present), `_otwGetLiveTier()` called
exactly as `renderOneToWatch()`'s own FIRE branch calls it (same
`getSmoothedDrama(...) ?? dramaScoreLive(...)` fallback pattern,
confirmed by reading `_otwFindLiveGame()`'s own established use of that
exact pattern — not invented), and `_isCloseAndLate()`.

**`close_late` required one new small helper, not a new heuristic.**
The doc names this as "existing margin/period logic already used
elsewhere in the file" — traced to `fieldGameTier()`'s own T5
`CLOSE_LATE` computation (sport-aware `inLate` + `margin<=8`).
**Deliberately did NOT call `fieldGameTier()` directly**: it collapses
to one tier by priority, so a game that's both `ELIMINATION` and
genuinely close-and-late right now would report only `'ELIMINATION'`,
silently hiding the `close_late` signal this INDEPENDENT-tag aggregator
needs to surface alongside other simultaneously-true tags (exactly
TASK 3's own "multiple tags simultaneously true" test case). Added
`_isCloseAndLate(eData, sport)` as a standalone helper mirroring that
T5 logic **verbatim** — `fieldGameTier()` itself is completely
untouched, so its 10+ existing call sites are unaffected.

Fixed priority order, documented in the code comment: `user_team`, then
`_gameImportance`, then live tier severity, then `close_late` — not a
scored ranking, exactly as specified.

**Explicitly out of scope, respected:** no wiring to Coach's Clipboard,
Scout Mode, Pressure Stack, Pick'em Handshake, or any other bundle item
— none are built yet. Marked `STAGED — no caller yet` in the code
comment.

## TASK 2 — isMyTeam consolidation

Extracted `_isMyTeamGame(g)` (placed immediately before
`buildViewerIntelChip()`), and updated that function's existing
`const isMyTeam=...` line to `const isMyTeam=_isMyTeamGame(g);` —
**identical boolean logic**, confirmed via `git diff`: the 3 downstream
`if(isMyTeam)` usages across the `stakes`/`stories`/`myteams` branches
are completely untouched, only the computation itself now delegates to
the shared helper. `getGameReasonTags()` calls the same helper.

## TASK 3 — Live-style verification, all 3 cases + a regression

Extracted `getGameReasonTags`, `_isMyTeamGame`, `_isCloseAndLate`,
`_otwGetLiveTier`, `getSmoothedDrama`/`getRecentDrama`/`getDramaHistory`,
`dramaScoreLive`/`applyQW1SituationBonus`, and `_gameSport` **verbatim**
from the committed file (not reimplemented) and ran them in a Node `vm`
harness. 9/9 checks:

**CASE 1 (only `user_team`):** a followed team (Boston Celtics) in a
regular-season game, no importance, no live data — output
`["user_team"]`, exactly one tag.

**CASE 2 (multiple simultaneous tags — a followed team in an
elimination game):** Celtics vs Knicks, `_gameImportance: 'elimination'`
(a real playoff Game 7), live Q4 with 2:15 left, margin 3 — output
`["user_team","elimination","LIVE_GAME","close_late"]`. Confirmed
`user_team` is `tags[0]` (highest priority), `elimination` is `tags[1]`
(second priority, real value pushed verbatim), and `close_late` fires
alongside the live tier — proving the independent-signal design works
exactly as TASK 1's `_isCloseAndLate` rationale intended.

**Honest note, not silently absorbed:** CASE 2's live tier resolved to
`LIVE_GAME` (T4 fallback) rather than `CRUNCH` (T1). **Not a bug in
`getGameReasonTags`** — traced to `_otwGetLiveTier`'s own established
`SPORT_CRUNCH_RULES` lookup, keyed by canonical names (`'Basketball'`,
`'Hockey'`, etc.) that don't match typical real section labels
(`"NBA Playoffs"`, the actual `sec.sport` string `buildTodaySchedule()`
produces and the exact string `_otwFindLiveGame()`/`renderOneToWatch()`
already pass through this same function today). This is a pre-existing
characteristic of the reused, unmodified `_otwGetLiveTier()` — out of
scope for this CC-CMD, which reuses it exactly as-is per its explicit
"no new signal computation" scope discipline.

**CASE 3 (nothing qualifies, empty array not a guess):** first attempt
used a close-margin (2), early-period live game expecting zero
signals — **investigated the unexpected `["LIVE_GAME"]` result rather
than accepting it**, traced `dramaScoreLive()`'s real composite formula
(`base*52 + timeBonus + sitBonus`, ≈43 for that fixture) and found it
genuinely, correctly crosses `_otwGetLiveTier`'s real `LIVE_GAME`
threshold (`smoothed>=40`) — my test fixture was the flawed part, not
the shipped code. Corrected to a genuine blowout (24-4, Q1) that falls
well below every real threshold (`_otwGetLiveTier`: margin>3 blocks
`CLOSE_FINISH`, smoothed well under 40 blocks `LIVE_GAME`;
`_isCloseAndLate`: margin>8 blocks it) — output `[]`, confirmed
correct, exercising the full live-eData branch rather than just
omitting `eData` (a stronger proof that every live-branch condition
correctly returns nothing together).

**Regression:** `getGameReasonTags(null, null)` returns `[]`, no throw.

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0. **One genuine smoke failure caught
and fixed mid-session, unrelated to this CC-CMD's logic**: A515
(SW_VERSION date must match today's ET date) failed because real
wall-clock time crossed into 2026-07-10 ET during this session —
bumped `SW_VERSION` to `2026-07-10a` (new-day reset to suffix 'a' per
Rule 23, not a continued `2026-07-09` letter) rather than rationalizing
the failure away. `node field_unit.js`: 66/0. `node field_smoke.js
index.html`: 21 failures, matches the documented pre-existing baseline.
All 3 inline `<script>` blocks syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Aggregator built from only real, probe-confirmed signals — no new
      heuristics invented (`_isCloseAndLate` mirrors existing logic
      verbatim, doesn't compute anything new)
- [x] Fixed, documented priority ordering — not an unordered set
- [x] `isMyTeam` consolidated to one shared computation (`_isMyTeamGame`)
      — correcting the doc's own "triplicated" premise honestly, while
      still delivering the real in-scope cleanup its intent called for
- [x] Live-verified against 3 real constructed cases including the
      zero-tags case, actual output checked (with an honest correction
      to my own first-draft test fixture after investigating an
      unexpected result, not silently adjusting the assertion)

## CONFIDENCE SCORING

- +30 — aggregator correctly built from only real, probe-confirmed
  signals, including a genuinely new but non-invented helper
  (`_isCloseAndLate`) with an explicit, correct rationale for not
  reusing `fieldGameTier()` directly: **met**
- +20 — `isMyTeam` consolidation done correctly, confirmed via `git
  diff` not to change the existing chip's 3 downstream usages at all:
  **met**
- +25 — ordering is fixed, documented in the code, and confirmed
  sensible via CASE 2's exact `tags[0]`/`tags[1]` positions: **met**
- +25 — live verification covers single-tag, multi-tag, and zero-tag
  cases with actual observed output from extracted-verbatim functions,
  including catching and correctly fixing a flawed test fixture rather
  than accepting an unexplained result: **met**

**Total: 100/100.**

## Commit

- `SW_VERSION` `2026-07-09l` → `2026-07-10a` (new-ET-day reset to
  suffix 'a', per Rule 23 — real wall-clock time crossed midnight ET
  during this session).
- `index.html`: `_isCloseAndLate()`, `_isMyTeamGame()`, and
  `getGameReasonTags()` added; `buildViewerIntelChip()`'s existing
  `isMyTeam` line now delegates to the shared helper (identical
  behavior); `fieldGameTier()` untouched.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
