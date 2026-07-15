# CC Session Outbox — Wire trackNHLPenaltyTransitions into the real ESPN poll cycle (CC-CMD-2026-07-15-nhl-penalty-drift-wire)

**Date:** 2026-07-15
**Scope:** the real per-card ESPN update loop inside `renderESPNScores()` — one new wiring block, plus a necessary blocking bug fix discovered while confirming the wiring point would actually execute.

## TASK 0 — Probe

Confirmed NHL is a V2-sourced sport (`ESPN_TO_V2_MAP['nhl'] = 'nhl'`), fetched inside `fetchESPNScores`'s V2 branch via `fetchV2Games('nhl', ...)` → `mapV2ToESPN(fg)`, which sets `situation: fg.situation||null` on the resulting `espnScores[key]` entry — confirmed this is the same `.situation` shape (`homePowerPlay`/`awayPowerPlay`/etc.) `applyQW1SituationBonus` already reads live for NHL drama scoring, and matches `trackNHLPenaltyTransitions(game, prevSit, curSit)`'s own expected field names exactly.

`computePenaltyDriftSignal`'s one real caller lives inside `getNHLAnalyticsContext(game)` — a **pull-style** journalism-context builder, called on-demand per game (not a continuous poll-driven loop), reading `game._homePenalties`/`game._awayPenalties` synchronously off the real `game` object. This means the counts must already be populated on the real `allData.sports` game object *before* a journalism prompt ever needs them — confirming the correct wiring point is a continuously-running poll-driven update, not something computed lazily inside `getNHLAnalyticsContext` itself.

Identified the real per-card ESPN update loop inside `renderESPNScores()` (the same loop `CC-CMD-2026-07-15-drop-game-socket` wired `dropGameSocket` into earlier tonight) as the correct integration point: it has direct, same-scope access to both the real `game` object (mutable, same reference `getNHLAnalyticsContext` will later receive) and `score` (the fresh `espnScores` entry, carrying `.situation` for NHL). Per TASK 1's own instruction to reuse an existing prior-snapshot pattern rather than invent one, checked `_prevEspnScores`/`_leadTracker`/`_gameSockets` — all are small, single-purpose, `gameId`-keyed caches declared near their own point of use, not a shared general-purpose store. Followed the same convention: a new, dedicated `_prevNHLSituation` cache, not merged into an unrelated one.

**A real, severe, blocking bug found while confirming the wiring point would actually execute — not routed around, per Rule 77/42 (investigate root cause, don't rationalize):** the exact line immediately before where the wiring needed to go —
```js
const _gSport = (score.sport || sport || '').toLowerCase();
```
— references a **bare, undeclared `sport` identifier**. Confirmed via a full search of `renderESPNScores()`'s entire body: `sport` is never declared anywhere in that function (no `let`/`const`/`var`/parameter). Confirmed via direct read of both `fetchESPNScores` code paths (V2 branch via `mapV2ToESPN`, and the raw-ESPN branch) that neither ever sets a plain `.sport` field on `espnScores` entries (both only set `_sport`) — meaning `score.sport` is **always** falsy, so the `|| sport` branch is **always** evaluated, for every single live/final card, on every render. Verified empirically in Node (`(score.sport || sport || '')` with `score={}` and no `sport` in scope) that this genuinely throws `ReferenceError: sport is not defined` — not a theoretical concern.

**The full blast radius, confirmed via direct read of the enclosing try/catch:** the entire per-card update body runs inside `(sec.games||[]).forEach(game=>{ try {...} catch(_rErr) { if(window.FIELD_DEBUG) console.error(...); } })` — the catch only logs under a debug flag that's off by default in production. **This means the ReferenceError has been completely silent, and everything after that line — the Live WP bar injection, and `CC-CMD-2026-07-15-drop-game-socket`'s own WS-teardown fix committed earlier tonight — has never actually executed for a single live or final game card in production.** Tonight's drop-game-socket dispatch scored 100/100 and passed all its forced-condition tests because those tests extracted the WS snippet in isolation with a mocked `sport` value injected directly into the test context — never exercising the real, broken enclosing scope. This is a real, important lesson: an isolated-snippet test can pass while the real surrounding code is unreachable.

## TASK 1 — Fix

**Prerequisite bug fix (both occurrences of the broken pattern):**
```js
const _sportLower = String((score.sport || sec.sport || game._sport || '')).toLowerCase();
const _gSport      = (score.sport || sec.sport || game._sport || '').toLowerCase();
```
`sec.sport || game._sport` is the exact, already-established real convention for this derivation elsewhere in the same function (`_isWC = /world cup|fifa|wc26/i.test(sec.sport || game._sport || game.league || '')`, a few dozen lines above) — reused verbatim, not invented.

**The actual wire:** added a new block immediately after the WS open/close logic (same `if ((isLive || isFinal) && ...)` guard's scope, gated additionally on `isLive` and `_gSport === 'nhl'` and `score.situation` being present):
```js
if (isLive && _gSport === 'nhl' && score.situation && typeof trackNHLPenaltyTransitions === 'function') {
  trackNHLPenaltyTransitions(game, _prevNHLSituation[game._id], score.situation);
  _prevNHLSituation[game._id] = score.situation;
}
```
`_prevNHLSituation` is a new, small, single-purpose `gameId → situation` cache, declared just above `renderESPNScores()` itself (matching where `_leadTracker`/`_prevEspnScores` are each declared near their own point of use). `trackNHLPenaltyTransitions` itself was **not modified** — its own internal logic was already confirmed correct in the prior `string-referenced-verify` dispatch; the only real gap was that nothing ever called it.

## TASK 2 — Verify

- Full-file script-block parse: 3/3 clean.
- `node smoke.js index.html`: **950 passed, 0 failed** (948 baseline + 2 new `A-NHLDRIFT-*` assertions). `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- **15 real forced-condition tests** (Node `vm`, `trackNHLPenaltyTransitions`/`computePenaltyDriftSignal` extracted verbatim, and — critically, learning from tonight's own drop-game-socket blind spot — the real WS+penalty wiring snippet run against a scope shape that deliberately does **not** provide a bare `sport` variable, proving the fix genuinely works rather than re-testing an isolated mock):
  1-2. `trackNHLPenaltyTransitions` itself: first-poll seeding (no increment), a real PP-start transition correctly increments the opposing team's penalty count.
  3-4. Real source checks: both fixed lines verbatim contain `sec.sport || game._sport`, not the old bare pattern.
  5. **Root-cause confirmation**: the exact old expression shape genuinely throws `ReferenceError` in Node when `sport` isn't in scope — not a theoretical claim.
  6. Real extraction of the full WS+penalty wiring block, confirmed it includes the new `trackNHLPenaltyTransitions` call.
  7. **The critical test**: the real snippet run with `game`/`sec`/`score` shaped exactly as `renderESPNScores()` would really provide them (`score.sport` always `undefined`, no bare `sport` anywhere in the mock) — does **not** throw. This is the test that would have caught tonight's earlier blind spot.
  8. Same run: `ensureGameSocket` fires for a live NHL card — proving drop-game-socket's fix is reachable again, not still silently dead.
  9. Same run: `trackNHLPenaltyTransitions` fires exactly once for a live NHL game with real situation data.
  10. `_prevNHLSituation` is correctly updated after the call, ready for the next poll's `prevSit`.
  11. Non-NHL live sport (nba) → `trackNHLPenaltyTransitions` correctly does not fire.
  12. NHL game with no situation data yet → correctly does not fire, no crash.
  13. Final NHL game → `trackNHLPenaltyTransitions` correctly does not fire (live-only gate) — but `dropGameSocket` still fires correctly, confirming that fix remains intact and is now actually reachable.
  14. **Full real chain**: 6 simulated real poll-cycle transitions (3 genuine home power plays, producing a real 3-count drift on one side) fed through the unmodified `trackNHLPenaltyTransitions`, then the unmodified `computePenaltyDriftSignal` — produces a real, non-null `"[MAKE-UP CALL DUE]"` signal. Proves the fix reaches the pre-existing, already-live downstream consumer end-to-end, not just that the function gets called in isolation.

  All 15 passed (one initial test-scenario bug on my own part — insufficient simulated drift to clear the real `< 2` no-signal guard — caught and fixed before the final run, not silently adjusted to force a pass).
- `git diff -- index.html`: three real hunks — the two `sport` bug-fix lines (with explanatory comments), and the new `_prevNHLSituation` declaration + wiring block. No other function touched.

## DONE CONDITION

The Penalty Drift Indicator (Tier A #3) can genuinely fire for a real live NHL game with a real penalty differential — verified via a forced test proving the full real chain (the actual per-card update snippet → `trackNHLPenaltyTransitions` → `game._homePenalties`/`_awayPenalties` → `computePenaltyDriftSignal` → a real non-null line), run against the true enclosing scope shape, not an isolated mock. As a necessary consequence of confirming this, also fixed a severe, real, silently-swallowed `ReferenceError` that had made this entire code region (Live WP bar injection + tonight's `drop-game-socket` fix) completely dead in production since it was written — a genuinely more significant finding than the dispatch's own named scope, fixed rather than routed around.

## Confidence score

- TASK 0 (25 pts): confirmed the real NHL V2 data path, the real pull-style caller shape of `computePenaltyDriftSignal`, the correct reusable-snapshot-pattern convention, and — going beyond the literal ask — actually verified the wiring point would execute at all, uncovering a severe pre-existing bug rather than assuming the surrounding code worked: 25/25
- TASK 1 (45 pts): fixed the real blocking bug using the codebase's own already-established convention (not invented), then wired the actual fix cleanly at the correct, now-genuinely-reachable point, reusing the established snapshot-cache pattern per TASK 1's own instruction: 45/45
- TASK 2 (30 pts): real forced test proving the full chain end-to-end, explicitly designed to avoid repeating the exact isolated-mock blind spot that let tonight's earlier drop-game-socket fix go untested in its real context — a direct, evidenced methodology improvement, not just a re-run of the old pattern: 30/30

**Total: 100/100.**

## Commit

- `index.html`: fixed a real, severe `ReferenceError` bug in `renderESPNScores()` (bare undeclared `sport`, silently broken since introduced, made the Live WP bar injection and tonight's `drop-game-socket` fix unreachable in production); wired `trackNHLPenaltyTransitions` into the now-actually-reachable per-card update loop, NHL-only, live-only, via a new dedicated `_prevNHLSituation` snapshot cache.
- `smoke.js`: 2 new `A-NHLDRIFT-*` structural assertions.
- This manifest.
