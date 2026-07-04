# CC-CMD: Live MLB status refresh (resolves MLB/ESPN dual-source disagreement)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Add a lightweight, dedicated MLB status refresh that keeps
`game.status` (MLB Stats API) current during a live session, and wires
its changes into the existing `syncCardAttributes` registry (Phase 1,
CC-CMD-2026-07-04-card-attribute-sync-registry.md) — without triggering
a full `renderAll()` rebuild.
**Why:** Live-verified 2026-07-04: MLB's `game.status` is fetched
EXACTLY ONCE at boot (`fetchMLBFixtures()`, single call site,
index.html:21772, confirmed via grep) and never refreshed. The
circadian/espn-live/espn-final classification path
(`renderESPNScores()`) instead relies on ESPN's own score-matching
(`_n.state`), which can lag up to 15 minutes behind real status per an
existing code comment (`ESPN_REFRESH_FINISHED` mode, index.html
~21775-21777) — this is WHY the codebase already has a dedicated 90s
Night Owl poll bypassing the slow ESPN cycle for finals detection
(`initNightOwlPoll`, index.html:21778-21785). Live-observed
consequence: multiple real MLB games showed `status:'final'` in
`allData` while their cards stayed `PRIME` for 90+ seconds, because
ESPN's own scoreboard (`espnScores`) still reported `state:"in"` for the
same games. This is not a defect in the circadian refresh (v2.3/Phase
1) — both `data-circadian` and the pre-existing `espn-live`/`espn-final`
classes were confirmed in perfect lockstep, both correctly reflecting
ESPN's (slow) signal. The fix is giving MLB's own (fast, authoritative)
signal a live path too.
**Target time:** ~45 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail
- eslint baseline first before any code edit

## CONFIDENCE GATE (CC-verifiable only)
Do not commit unless confidence ≥ 95 on the CC-verifiable portion. Live
observation of a real MLB game's status actually flipping via this new
path during a live session is deferred to chat (same reason as v2.3 —
requires watching real games transition in real time, which cannot be
simulated or forced).

## PROBE BLOCK (run before any edits)
```bash
grep -n "async function loadMLBSlate" index.html
grep -n "async function fetchMLBFixtures" index.html
grep -n "function syncCardAttributes" index.html
grep -n "initNightOwlPoll" index.html
```
Re-confirm these all still exist at the shapes this doc describes —
this file changes daily. If `loadMLBSlate` has grown side effects (DOM
mutation, allData mutation, or a render trigger) since 2026-07-04, STOP
and report — the entire design below depends on it being pure.

## CONTEXT — why NOT to just re-call fetchMLBFixtures() on an interval

Confirmed by reading its full body: `fetchMLBFixtures()` ends with
`buildFilters(allData.sports); scheduleRenderAll();` — calling it
repeatedly would re-trigger the exact expensive 77KB/690-node full
rebuild that today's Phase 1 refactor (card-attribute-sync-registry)
was written specifically to avoid triggering unnecessarily. This CC-CMD
instead calls the underlying pure data-fetch (`loadMLBSlate`) directly
and patches only what changed, mirroring `renderESPNScores()`'s own
targeted-patch philosophy.

## TASK 1 — refreshMLBStatus()

Add near `fetchMLBFixtures()` (index.html ~20013, re-verify via probe):

```javascript
// ── Live MLB status refresh (dedicated, lightweight — no full re-render) ──
// fetchMLBFixtures() only ever runs once (boot). ESPN score-matching
// (_n.state, driving espn-live/espn-final/circadian via renderESPNScores)
// can lag up to 15 min behind real status (ESPN_REFRESH_FINISHED mode --
// see initNightOwlPoll's own comment for the same characterization).
// This keeps MLB's own, faster, authoritative status current without
// paying for a full renderAll() rebuild on every refresh.
async function refreshMLBStatus() {
  if (!allData?.sports) return;
  const mlbSec = allData.sports.find(s => s.sport === 'Baseball (MLB)');
  if (!mlbSec || !mlbSec.games?.length) return;

  let freshGames;
  try {
    freshGames = await loadMLBSlate(new Date());
  } catch (e) {
    captureFieldError('mlb-status-refresh', e, false);
    return;
  }
  if (!freshGames || !freshGames.length) return;

  // Match by the same home|away|hour key fetchMLBFixtures() already uses
  // for doubleheader-safe matching -- reuse the established convention,
  // don't invent a new key shape.
  const keyOf = g => `${g.home}|${g.away}|${(g.start_time||'').slice(0,13)}`;
  const freshByKey = new Map(freshGames.map(g => [keyOf(g), g]));

  for (const game of mlbSec.games) {
    const fresh = freshByKey.get(keyOf(game));
    if (!fresh || fresh.status === game.status) continue; // no change

    const oldStatus = game.status;
    game.status = fresh.status;
    // Also refresh score fields -- a status change to 'final' without
    // an updated final score would be a half-applied, misleading patch.
    if (fresh.homeScore != null) game.homeScore = fresh.homeScore;
    if (fresh.awayScore != null) game.awayScore = fresh.awayScore;

    const card = document.querySelector(`[data-gameid="${game._id}"]`);
    if (!card) continue; // card not currently rendered (filtered out, etc.) -- fine, allData is still correct for next full render

    const isLive  = fresh.status === 'live';
    const isFinal = fresh.status === 'final' || fresh.status === 'postponed';
    syncCardAttributes(card, game, null, isLive, isFinal);

    if (FIELD_DEBUG) console.debug('[MLB] status refresh:', game.home, oldStatus, '->', fresh.status);
  }
}

// Mirrors initNightOwlPoll's exact proven cadence (90s interval, first
// check shortly after boot) -- same reasoning applies here: MLB games
// need a check faster than whatever the slow path (ESPN, or in
// fetchMLBFixtures' case, nothing at all after boot) provides.
(function initMLBStatusPoll(){
  setTimeout(refreshMLBStatus, 10000); // first check: 10s after load (after initial fixtures settle)
  setInterval(refreshMLBStatus, 90000); // then every 90s, matching Night Owl's cadence
})();
```

## TASK 2 — Smoke assertions

```javascript
smoke.assert(typeof refreshMLBStatus === 'function', 'A[NEXT]: refreshMLBStatus function exists');
smoke.assert(html.includes('initMLBStatusPoll'), 'A[NEXT+1]: MLB status poll is initialized');
smoke.assert(!html.match(/refreshMLBStatus[\s\S]{0,2000}scheduleRenderAll\(\)/), 'A[NEXT+2]: refreshMLBStatus does NOT trigger a full re-render (targeted patch only, matches its own design intent)');
```
(CC: assign real sequential A-numbers. The third assertion is a
regression guard — if a future edit accidentally adds a full-render call
inside this function, defeating its entire purpose, this should fail.)

## SCOPE BOUNDARY

DO:
- Add `refreshMLBStatus()` + `initMLBStatusPoll()` exactly as specified
- Reuse `loadMLBSlate()`, `syncCardAttributes()`, and the existing
  `home|away|hour` matching key — no new infrastructure invented
- 3 smoke assertions, including the no-full-render regression guard
- Bump SW_VERSION

DO NOT:
- Call `fetchMLBFixtures()` on any interval (see CONTEXT — confirmed unsafe)
- Touch `renderESPNScores()`, `CARD_ATTRIBUTE_SYNC`, or anything from
  Phase 1 — this CC-CMD only adds a new data-refresh source that feeds
  the EXISTING registry, it doesn't change the registry itself
- Extend this pattern to other sports in this pass — AFL/CFL/Golf's
  underlying data-freshness characteristics haven't been checked; scope
  this to MLB only, where the boot-once behavior was specifically confirmed
- Add any new match-key logic beyond reusing `home|away|hour` — if that
  key proves insufficient (e.g., a real doubleheader mismatch), stop and
  report rather than inventing a new key shape unprompted

## DONE CONDITIONS
- [ ] Probe block re-run, all four functions/patterns confirmed present at expected shapes
- [ ] `refreshMLBStatus`/`initMLBStatusPoll` added exactly as specified
- [ ] Confirmed via code read (not just "it compiles") that `refreshMLBStatus` never calls `scheduleRenderAll()`, `renderAll()`, or `buildFilters()` — the entire point is avoiding those
- [ ] `node smoke.js index.html` exits 0 with all 3 new assertions green
- [ ] CI Playwright confirms `refreshMLBStatus` exists in deployed bundle
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-mlb-status-live-refresh-{date}.md`

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation of a live MLB game's `status` actually updating via this new path during an active session, and its card's `data-circadian`/`espn-live`/`espn-final` classes NOT needing to wait for ESPN's slow cycle to catch up. This is the actual resolution of tonight's dual-source finding — code existing and being logically correct is not sufficient evidence on its own, per the exact lesson from v2.1/v2.2/v2.3 tonight.

## COMPLIANCE
- Rule 47/ADR-002/RUWT: status/score refresh only — no new composite scores, no interest values
- Rule 68: probe block first, re-verify `loadMLBSlate` is still side-effect-free before building on that assumption
- Rule 87: self-completing on the CC-verifiable portion; live behavior over time explicitly deferred

## CONFIDENCE SCORING TABLE
+25  `refreshMLBStatus`/`initMLBStatusPoll` added exactly as specified, `node --check` clean
+25  Confirmed (by reading the function body, not assuming) that it never triggers a full re-render
+25  Smoke 3/3 green, including the no-full-render regression guard passing
+25  CI confirms deployed, live bundle contains `refreshMLBStatus`

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-mlb-status-live-refresh.md.
Re-confirm loadMLBSlate is still side-effect-free before building on
that (see PROBE BLOCK). Implement exactly as specified — do not call
fetchMLBFixtures() on an interval, that reintroduces the exact
expensive-rebuild problem this CC-CMD exists to avoid. Do not commit
unless confidence ≥ 95. If score < 95 report verbatim and stop — do not
invent results.
