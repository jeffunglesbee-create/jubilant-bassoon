# CC-CMD: Pick 'em client UI — first slice, using existing helpers

**Date:** 2026-07-05
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** New UI affordance on game cards + wiring to the already-built backend. No new client-server plumbing invented.
**Depends on:** pickLedger backend (`befd20e`) and WP source resolver (`ed80885`) — both confirmed live on the relay already.

**Real, existing patterns this reuses, confirmed directly — not assumed:**
- `getFieldUserId()` (index.html ~line 27502) — stable per-device UUID, already used for all UserDO calls.
- `_userDoRelay('/user/event', 'POST', {...})` — already the standard helper for `watch_open`/`series_game`/`peak_missed`. The new `pick_made`/`pick_resolved` events use this exact same helper, not a new fetch pattern.

**Target time:** ~50 min

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK
```bash
grep -n "function getFieldUserId" index.html -A 12
grep -n "_userDoRelay(" index.html | head -10
grep -n "function saveEspnFinal" index.html
```
Re-confirm all three exist in their current form before building against them.

## TASK 1 — Pick affordance on upcoming/live game cards

Add a "Pick" UI element to game cards for games that haven't started or
are in an early state (reuse whatever state-check already gates other
pre-game-only features, e.g., circadian PREVIEW state — don't invent a
new one). Tapping it presents the two teams; selecting one fires:
```javascript
_userDoRelay('/user/event', 'POST', {
  type: 'pick_made', gameId: g._id, sport: g.sport, predictedWinner: <selected team name>
});
```
Once a pick is made for a game, the affordance should show the user's
existing pick (not let them repick) — read this from a local cache
populated at pick time, since `/user/state` isn't polled continuously.

## TASK 2 — Resolve on game completion

At the same point `saveEspnFinal()` already runs (the established
game-complete hook), if a pick exists for that `gameId` (check the
local cache from Task 1), fire:
```javascript
_userDoRelay('/user/event', 'POST', {
  type: 'pick_resolved', gameId: g._id, wasCorrect: <derived from final score vs. predictedWinner>
});
```
Do NOT compute or send `revealedProbability`/`probabilitySource` from
the client — the resolver already fills these in server-side as a
fallback (confirmed working, verified this session). Sending a
client-computed value here would bypass that and risk a stale or
wrong number.

## TASK 3 — Reveal display

When a pick resolves, show: the user's prediction, the actual result,
correct/incorrect, and the real probability + its label — read
`resolvedProbability`/`probabilityLabel` from the `/user/event` response
itself (confirmed this session: the relay echoes these back in the same
response). Display the label exactly as returned ("Market estimate" or
"Statistical probability") — do not paraphrase or rename it.

## TASK 4 — Cumulative stats display

Somewhere reasonable (a profile/stats surface, or near the pick
affordance itself), show `totalMade`/`totalCorrect`/`accuracyRate` from
a `/user/state` call. Do not add any streak, current-run, or
consecutive-day display anywhere — none of that data exists in the
backend by design, and none should be approximated client-side either.

## SCOPE BOUNDARY

DO:
- Reuse getFieldUserId() and _userDoRelay() exactly as they already work
- Hook resolution into the existing saveEspnFinal() completion point
- Display the server-provided label verbatim, no renaming
- Keep this to one clear first slice — a working pick/reveal loop, not a polished full feature

DO NOT:
- Invent a new user-identification or relay-calling mechanism
- Compute or send probability data from the client — server-side only
- Add any streak/consecutive-day UI element, even a small one
- Attempt every sport's UI nuances in this first slice — get the core loop working for whichever sports are easiest to gate correctly, expand later

## DONE CONDITIONS
- [ ] Probe block re-run, all three existing patterns re-confirmed
- [ ] Pick affordance added, correctly gated to pre-game/early state
- [ ] pick_made fires correctly via the existing _userDoRelay helper
- [ ] Resolution wired into the existing saveEspnFinal() hook, no client-side probability computation
- [ ] Reveal displays the server-provided label verbatim
- [ ] Cumulative stats displayed, zero streak-like elements anywhere
- [ ] Real smoke test run, 0 new failures
- [ ] Outbox manifest written

## CONFIDENCE SCORING TABLE
+20  Pick affordance correctly gated, reuses existing state-check pattern
+25  pick_made/pick_resolved correctly use the existing _userDoRelay helper, no new plumbing
+25  Resolution correctly hooked into saveEspnFinal(), no client-side probability computation
+15  Reveal and stats display correct, no streak elements anywhere
+15  Smoke test clean

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-05-pick-em-ui.md. Requires the
pickLedger backend and WP resolver (both live on the relay already).
Add a "Pick" affordance to pre-game/early-state game cards using the
existing getFieldUserId()/_userDoRelay() helpers -- no new plumbing.
Wire pick_made on selection, pick_resolved into the existing
saveEspnFinal() completion hook (client sends wasCorrect only, never
computes probability -- the resolver fills that in server-side).
Display the reveal using the server-echoed label verbatim ("Market
estimate" / "Statistical probability"). Show cumulative stats from
/user/state -- zero streak or consecutive-day UI anywhere. Keep this to
one clean first slice. Do not commit unless confidence ≥ 95. If score <
95 report verbatim and stop.
