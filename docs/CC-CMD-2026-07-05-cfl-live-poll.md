# CC-CMD: CFL recurring score refresh — enables live mid-session pick resolution

**Date:** 2026-07-05
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Depends on:** field-relay-nba CC-CMD-2026-07-05-cfl-scoreboard-cache-guard.md — DEPLOYED and behaviorally verified (`cf.cacheTtl:30` confirmed throttling via `X-CFL-Upstream-Cache: REVALIDATED → HIT` live test). Safe to poll now.

**Why — real, confirmed root cause, not the originally-suspected one.**

Direct verification against current HEAD (`7285e40`), not assumed:

1. `checkForNewFinals()` is **already polled every 90s** via the existing
   `initNightOwlPoll` IIFE (`setInterval(poll, 90000)`, first fire at 5s).
   This is NOT the gap.
2. `checkForNewFinals()` has a CFL-scoped fallback (added by
   `CC-CMD-2026-07-05-pickem-cfl-mlb-gaps.md`) that checks `game.state ===
   'post'` **directly on the game object** — it does not need `espnScores`
   for CFL. This is also NOT the gap.
3. **The actual gap**: `loadCFLScoreboard()` is called exactly **once**,
   4.3s after schedule load (`setTimeout(..., 4300)`), and the `state` /
   `homeScore` / `awayScore` it sets on each game object are never
   refreshed again. The 90s `checkForNewFinals` poll runs forever, but it's
   checking a CFL game object whose `.state` is frozen at whatever it was
   4.3s after page load. A CFL game that goes final mid-session will never
   show `state: 'post'` until the page is reloaded (which re-runs
   `loadCFLScoreboard` fresh) — confirmed as the exact mechanism behind the
   known gap ("CFL picks can only resolve after page reload, not live
   mid-session").

**Fix**: extend the *existing* 90s `initNightOwlPoll` tick to also
re-fetch CFL scores and mutate the existing CFL game objects in place —
no new timer, no new interval, reusing the one poll loop that already
exists for exactly this purpose (DO NOT INVENT: a second independent
CFL-only interval would duplicate infrastructure that's already running
on the right cadence).

**Target time:** ~20 min

## PROBE BLOCK
```bash
grep -n "function initNightOwlPoll" -A 8 index.html
grep -n "async function loadCFLScoreboard" -A 3 index.html
grep -n "loadCFLScoreboard(" index.html
grep -n "'Canadian Football (CFL)'" index.html
```
Confirm all four still match the citations above before editing. In
particular confirm `initNightOwlPoll`'s `poll()` body and the exact
`_id: 'cfl_' + t.id'` format haven't changed.

## TASK 1 — Add a CFL refresh step inside the existing poll() function

Inside `initNightOwlPoll`'s `poll()` (the function passed to both
`setTimeout(poll, 5000)` and `setInterval(poll, 90000)`), add a step
**before** the existing `checkForNewFinals()` call:

```javascript
const poll = () => {
  // CFL live refresh (CC-CMD-2026-07-05-cfl-live-poll): loadCFLScoreboard()
  // only ever fires once at page load, so CFL game objects' state/scores
  // never update without this. Piggybacks on the existing 90s tick rather
  // than adding a second timer. Relay's /cfl/scoreboard/rounds endpoint is
  // cf.cacheTtl:30-guarded (Rule 78, verified 2026-07-05) -- safe to call
  // this often regardless of concurrent user count.
  if (typeof loadCFLScoreboard === 'function' && allData?.sports?.length) {
    const cflSection = allData.sports.find(s => s.sport === 'Canadian Football (CFL)');
    if (cflSection && (cflSection.games || []).some(g => g.state !== 'post')) {
      loadCFLScoreboard().then(fresh => {
        if (!fresh || !fresh.length) return;
        const byId = {};
        fresh.forEach(g => { byId[g._id] = g; });
        cflSection.games.forEach(existing => {
          const f = byId[existing._id];
          if (!f) return;
          existing.state = f.state;
          existing.homeScore = f.homeScore;
          existing.awayScore = f.awayScore;
        });
        checkForNewFinals();
        if (typeof scheduleRenderAll === 'function') scheduleRenderAll();
      }).catch(() => {});
    }
  }
  if(allData?.sports?.length) checkForNewFinals();
  renderNightOwlRecap().catch(e=>captureFieldError('night-owl',e,false));
};
```

Note the CFL block calls `checkForNewFinals()` itself immediately after
mutating state (catches the transition in the same tick, doesn't wait for
the trailing `checkForNewFinals()` call that already exists below it —
that one still runs for every other sport unchanged). Calling it twice
in one tick when a CFL transition just happened is harmless — the
function is idempotent via `_seenFinals`.

The `.some(g => g.state !== 'post')` guard means once every CFL game
today is final, this stops re-fetching CFL data on every tick — self
gating, no manual cleanup needed, no indefinite polling after games end.

## TASK 2 — Verify

This cannot be behaviorally verified end-to-end without a real live CFL
game in progress during the session (same limitation the pickem-cfl-mlb-gaps
CC-CMD hit). Do what CAN be verified for real:

1. Confirm the code change matches Task 1 exactly via `grep -n
   "CC-CMD-2026-07-05-cfl-live-poll" index.html`.
2. If a real CFL game is live or has recently gone final during this
   session, verify the actual end-to-end transition (CFL section's
   game object shows `state:'post'` after a poll tick, pick resolves).
   Report the real game and result if this happens.
3. If no real CFL game is available to test against, **say so honestly**
   — do not fabricate a pass. Structural verification (code present,
   `node smoke.js index.html` clean) is not the same claim as "verified
   live," and the outbox must not conflate them.
4. Add a smoke assertion confirming the CFL refresh block exists inside
   `initNightOwlPoll` (structural presence check only — this cannot
   assert live behavior).

## DONE CONDITIONS
- [ ] Probe block confirms current state before editing
- [ ] CFL refresh step added inside the existing `poll()`, no new timer created
- [ ] Self-gating guard present (`.some(g => g.state !== 'post')`)
- [ ] Smoke assertion added confirming structural presence
- [ ] Live end-to-end verification attempted; honest report either way (real pass, or "no live CFL game available to test")
- [ ] Outbox manifest written

## CONFIDENCE SCORING TABLE
+35  CFL refresh step added correctly inside existing poll(), matching the cited pattern exactly
+15  Self-gating guard present and correctly scoped
+15  Smoke assertion added
+25  Live verification genuinely attempted against a real game, OR honestly reported as unavailable (not skipped, not fabricated)
+10  No second timer/interval introduced (reuses existing infrastructure per DO NOT INVENT)

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-05-cfl-live-poll.md. Add the CFL
refresh step inside the existing initNightOwlPoll's poll() function --
do not create a new timer. This closes the real gap: loadCFLScoreboard()
only ever runs once at page load, so CFL games never transition to
state:'post' without a reload, even though checkForNewFinals already
polls every 90s. The relay-side Rule 78 cache guard is deployed and
verified, so it's safe to re-fetch this often. Attempt live verification
against a real CFL game if one exists; if not, report that honestly
rather than only structurally verifying. Do not commit unless confidence
>= 95. If score < 95, report verbatim and stop.
