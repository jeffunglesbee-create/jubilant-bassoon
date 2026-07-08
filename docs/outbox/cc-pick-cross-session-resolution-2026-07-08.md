# CC Session Outbox — Pick Cross-Session Resolution (CC-CMD-2026-07-08-pick-cross-session-resolution)

**Date:** 2026-07-08
**Scope:** Re-key pick storage/resolution off the session-volatile `game._id`
counter onto a stable `sport_date_home_away` composite key. Distinct from
tonight's relay-side fix (`f7323f8`, field-relay-nba) — that fix made
`resolveWinProbability()` correct *when* resolution is attempted; this fix
addresses whether resolution is ever attempted at all across a session
boundary.

## PROBE BLOCK

All citations confirmed matching before editing: `_gid=0` at
`index.html:7149` (dead code, inside unreachable `buildDateSchedule`),
`:9766` (initial declaration), `:22269` (real reset point, inside active
`fetchSchedule()`). `saveEspnFinal` (then :38037), `_resolvePickIfExists`
(then :27916), `makePick` (then :27864) all located and read in full before
any edit.

## TASK 1 — Severity assessment (real, tested)

**`_id` stability is empirical, not guaranteed, and confirmed to actually
fail for at least one real path.** Navigated to the live app three times,
minutes apart, and diffed every game's `_id`:

- All 10 real MLB games (`g16`–`g30`) kept identical `_id`s across all
  three captures. This is **coincidental empirical stability** — it depends
  on the upstream fetch/relay returning games in the same relative order
  every time, which is not an architectural guarantee, not a genuinely
  stable scheme.
- `wc26_r16_7`/`wc26_r16_8` (round+slot-keyed) and `afl_38646`
  (external-API-ID-keyed) are genuinely deterministic — these already don't
  have this problem, confirmed by their own ID scheme, not by luck.
- **PGA/golf's `_id` (`espn_pga_<timestamp>`) provably changed** between two
  captures a few minutes apart (`espn_pga_1783519466129` →
  `espn_pga_1783519613947`), confirmed via source: it's `'espn_pga_' +
  (d.eventId || Date.now())` — a non-deterministic `Date.now()` fallback by
  construction (`index.html:22551`, pre-existing, unrelated code — not
  touched by this fix). This is not a hypothetical; it's a confirmed,
  reproduced failure of the assumption the whole pick-storage scheme relied on.

**The two candidate "more stable ID" sites do not solve this:**
- `index.html:18489` (`normalizeNBAGameRelay`'s `gameId: g.gameId`) is
  NBA-CDN-specific — a 10-digit ID from a different object shape
  (boxscore-normalization output), not present on every game object across
  sports. Not universal.
- `index.html:21812` (`score.gameId || game._id`, inside the live-card
  render loop) is used exclusively to open an ephemeral `ensureGameSocket()`
  WebSocket connection for the *current* live session — even setting aside
  that real `espnScores` entries carry `_gameId` (underscore-prefixed) not
  `.gameId` (confirmed against live data earlier this session, in the
  `pickem-stale-final-resolution-fix` CC-CMD's Task 2b), its own use case is
  inherently session-scoped. It would not have solved cross-session
  resolution even if it resolved reliably.

**Conclusion: no existing field in the codebase provides a genuinely stable
cross-session game identifier.** One had to be constructed from static game
properties (`sport`, `date`, `home`, `away`) that don't change once a game
is scheduled — which is what this fix does.

**Same-session usage is real but does not make this low-severity.** A pick
made and resolved while the same tab stays open never hits this bug. But
most real games run 2–3+ hours; a user closing the tab, the phone sleeping,
or simply navigating away and back during that window is a completely
ordinary usage pattern, not an edge case — and the failure mode is silent
(`_resolvePickIfExists` finds no matching key and does nothing, no error,
no log). Rated as a real, common-path bug, not a rare corner case.

## TASK 2 — Fix implemented

New `_pickStorageKey(game)` helper: `${sport}_${dateKey}_${home}_${away}`,
all lowercased and alpha-stripped, built from `game.start_time` (sliced to
`YYYY-MM-DD`), `game.home`, `game.away`, and the existing `_gameSport()`
helper. Returns `''` (safe no-op) if any required field is missing.

Touched, per Task 2's own scope:
- **`makePick(gameId, predictedWinner, sport, home, away)`** — signature
  widened to store `home`/`away` on the cache entry going forward (see
  migration note below). The two onclick handlers inside
  `buildPickWidgetHTML`'s "not yet picked" branch now pass them through.
- **`buildPickWidgetHTML(g, sport)`** — outward signature unchanged. Its key
  computation now prefers `_pickStorageKey(g)` when a real,
  `start_time`-bearing game object is given, falling back to `g._id` only
  for the two DOM-refresh-only callers (inside `makePick` and
  `_resolvePickIfExists`) that construct minimal synthetic objects with no
  `start_time` — in that case `g._id` already **is** the caller-threaded
  stable key, not something to recompute.
- **`saveEspnFinal`** — introduced a new `pickId` variable
  (`_pickStorageKey(game) || id`), used only for the
  `_resolvePickIfExists(pickId, game, eData)` call. Deliberately left the
  pre-existing `id`/`FINALS_KEY` same-session dedup logic completely
  untouched — that's a different, genuinely same-session-only concern.
- **`_resolvePickIfExists`** — **not modified.** Confirmed by reading: it's
  fully generic over whatever key string it's given; the bug was entirely
  in what gets passed in, not in its own lookup/resolution logic.

## Migration — investigated, found structurally impossible for existing unresolved picks, disclosed rather than hidden

The CC-CMD's own text speculated migration might be avoidable ("already-
resolved picks don't need re-keying; only unresolved ones matter, and those
are short-lived by nature"). Investigated the actual stored shape of a pick
cache entry: `{ predictedWinner, sport, madeAt, resolved, wasCorrect,
resolvedProbability, probabilityLabel }` — **no `home`/`away` fields.**
Given an existing key like `"g28"` and its data, there is no way to
determine which real-world game it was for; `predictedWinner` names only
one team, not the opponent, which is insufficient to reconstruct a
`sport_date_home_away` key. **True automatic migration of currently-
existing unresolved picks is not achievable, not merely skipped.**

Effect on real users: any pick made before this deploy, still unresolved
(game not yet final) at deploy time, will not resolve under the new key —
the same silent-miss failure mode as before, for that one transitional
window only. Any pick made *after* this deploy resolves correctly
regardless of session boundary, permanently. Already-resolved picks
(the common case, since most game state settles same-day) are provably
unaffected — see verification below.

Chose not to hide this rather than either overclaiming migration was
handled, or leaving it undocumented as tonight's CC-CMD instructed
("consider migration carefully" — considered, found genuinely blocked, and
stated so, rather than silently declared solved).

## VERIFICATION

All three of the CC-CMD's explicit requirements proven via a real
synthetic test — not asserted. Ran the **actual extracted function source**
from `index.html` (`_getPickCache`, `_savePickCache`, `_pickStorageKey`,
`makePick`, `buildPickWidgetHTML`, `_resolvePickIfExists` — the literal
committed text, not a reimplementation) inside a Node `vm` context with a
mock `localStorage`:

1. **Cross-session resolution.** Session 1: game object with `_id: "g7"`,
   Dodgers/Rockies. User picks Dodgers; stored under the stable key
   `mlb_2026-07-08_dodgers_rockies`. Session 2 (simulated fresh page load,
   `_gid` reset): the *same* real game now carries a *different*
   session-local `_id: "g3"` (deliberately mismatched from session 1's
   `"g7"`, modeling exactly the scenario the CC-CMD describes). Game
   finishes; `saveEspnFinal`'s new `pickId` logic computes the same stable
   key from session 2's game object and resolves it successfully:
   `{"resolved":true,"wasCorrect":true,...}`. Confirmed the pre-fix
   behavior (`game._id`-keyed) would have missed this — `"g7"` ≠ `"g3"`.
2. **Existing already-resolved picks unaffected.** Injected an old-style
   resolved entry (`cache["g99"]`, `resolved: true, wasCorrect: true,
   resolvedProbability: 62`) alongside the new-format cache, rendered an
   unrelated widget to exercise the mixed-format cache path, and confirmed
   `g99` is completely untouched afterward — byte-identical.
3. **"Already picked" UI state across a simulated session boundary.**
   Session 2's `buildPickWidgetHTML(game_session2, 'MLB')` — called with
   the *different* `_id: "g3"` — correctly returns the `pick-made` state
   showing "Dodgers", proving the widget recognizes an existing pick made
   under a different session's `_id`, not just that resolution succeeds
   silently in the background.

Also tested a golf-style game object with no real `away` team (the
`Date.now()`-fallback-ID sport confirmed unstable in Task 1):
`_pickStorageKey` correctly returns `''` (insufficient data) rather than
crashing or producing a garbage key — falls back to `g._id`, matching the
pre-fix behavior for that one narrow, already-degraded case.

**Test script**: full source in this session's scratch directory (not
committed — a one-off proof script, not a permanent test file; the
established pattern from the `sw-push-notification-scoping` CC-CMD's
`fake-indexeddb` test).

## Smoke — two stale regression guards updated, not weakened

`node smoke.js index.html` initially returned 888/2 failed. Investigated
before rationalizing (Rule 77): both failures were `A-PICKEM-4` and
`A-PICKEMSURF-4`, regression guards written by the earlier
`pick-em-reconcile` CC-CMD to prevent *that* session's own scope from
touching `makePick`/`buildPickWidgetHTML`/`_resolvePickIfExists`'s
signatures. This CC-CMD's own Task 2 explicitly names these exact functions
as required changes — the guards were now testing an invariant this CC-CMD
is authorized to break, not a real regression.

Updated both assertions to check the **new, intentional** shape rather than
deleting or weakening them:
- `A-PICKEM-4` now checks for `_resolvePickIfExists(pickId, game, eData)`
  (was `id`) — same hook point inside `saveEspnFinal`, just the renamed
  variable this fix introduces.
- `A-PICKEMSURF-4` now checks `_resolvePickIfExists`'s **body content**
  (the literal winner-computation lines) stays byte-identical — the actual
  invariant worth protecting — while accepting `makePick`'s widened
  `(gameId, predictedWinner, sport, home, away)` signature and
  `buildPickWidgetHTML`'s unchanged outward signature with new internal key
  logic.

`node smoke.js index.html`: **890 passed, 0 failed** after the update.
`node field_unit.js`: 66 passed, 0 failed (unaffected). `node field_smoke.js
index.html`: 21 failures — re-confirmed matches the documented pre-existing
baseline exactly (same count noted in the prior CC-CMD's session), not a
new regression. Both inline `<script>` blocks syntax-checked via
`node --check` after extraction.

## DONE CONDITIONS

- [x] Probe block confirms citations before editing
- [x] Task 1's real severity assessment reported honestly — including
      confirmed empirical (not guaranteed) MLB stability and a confirmed,
      reproduced instability case (golf)
- [x] Fix designed against Task 1's actual findings — stable composite key
      built from static game properties, not a guessed-at existing field
- [x] Cross-session resolution proven via a real test (Node `vm`, actual
      committed function source, not reasoned about)
- [x] Existing pick data confirmed not broken — already-resolved entries
      byte-identical after the change; migration limitation for
      in-flight-at-deploy unresolved picks disclosed, not hidden
- [x] Outbox clearly distinguishes this from tonight's relay-side fix
      (`f7323f8`, field-relay-nba — makes resolution *correct*; this fix
      makes resolution *reachable* across sessions)

## CONFIDENCE SCORING (against the CC-CMD's own table)

- +25 Task 1's severity assessment is real, tested, not assumed — 3 live
  page-load captures, confirmed empirical MLB stability, confirmed golf
  instability, both candidate "stable ID" sites investigated and ruled out
  with reasons, not just "didn't check": **met**
- +30 Fix correctly keys picks on something genuinely stable —
  `sport_date_home_away`, all static once a game is scheduled: **met**
- +20 Cross-session resolution proven via a real test — Node `vm` test
  against the actual extracted committed function source, deliberately
  using mismatched `_id`s between sessions to model the exact failure mode:
  **met**
- +15 Existing pick data confirmed unaffected — resolved entries proven
  byte-identical; the one honest limitation (in-flight unresolved picks at
  deploy time) explicitly disclosed rather than silently unstated: **met**
- +10 Outbox correctly distinguishes this from tonight's relay fix: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-08a` → `2026-07-08b` (both `index.html` and
  `sw.js`).
- `index.html`: `_pickStorageKey` added; `makePick`, `buildPickWidgetHTML`,
  `saveEspnFinal` updated per above.
- `smoke.js`: two stale regression guards (`A-PICKEM-4`,
  `A-PICKEMSURF-4`) updated to check the new intentional shape.
- This manifest.
