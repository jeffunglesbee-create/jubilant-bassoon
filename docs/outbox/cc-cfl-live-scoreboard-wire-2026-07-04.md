# CC Outbox — CFL Live Scoreboard Wire

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-cfl-live-scoreboard-wire.md
**Commits:** d8ada2c (implementation), 291d001 (follow-up CC-CMD doc), 02c5e63 (verify tooling)
**Deploy:** Deploy gate run 28717830867 — succeeded

---

## Probe block — re-run, live shape re-confirmed (not assumed)

```
grep -n "const cflGames = \[" index.html    → 11891 (matches doc exactly)
grep -n "cfl/scoreboard" index.html         → zero matches (confirmed dormant, matches doc's claim)
grep -n "^async function fetchSchedule" index.html → 21816 (pre-edit)
```

**Mandatory live re-fetch via CI-as-proxy, before writing any code:**
```
GET https://field-relay-nba.jeffunglesbee.workers.dev/cfl/scoreboard/rounds
```
**Real finding: the doc's own snapshot was already slightly stale.** The
doc's example showed a single round object; the live response is
actually a **JSON array of all 27 rounds** (preseason through Grey Cup).
Adjusted the implementation to flatten `rounds.flatMap(r => r.tournaments)`
rather than assume a single-round shape. Confirmed today's real game:
Round 1420016 ("Week 5", `status: "playing"`), tournament 13419690, "BC
Lions 0 vs Edmonton Elks 0", `status: "scheduled"` — exactly matching
the doc's own claim, just nested differently than its example snippet
implied.

**Additional check before writing the mapping** (per Rule 62 — follow
existing conventions): the OLD hardcoded `cflGames` array already ended
with `.filter(g=>isToday(g.start_time))` — the exact same per-game
date-membership filter the doc suggested inventing a new round-date-range
selector for. Reused `isToday()` directly on each tournament's own
`date` field instead of writing a new selector, staying consistent with
the established convention rather than introducing a second one.

## Implementation

- `loadCFLScoreboard()` (new, async): fetches
  `{V2_RELAY_BASE}/cfl/scoreboard/rounds`, flattens all rounds'
  tournaments, filters to today via `isToday()`, maps to the FIELD game
  shape with real `homeScore`/`awayScore`/`state` fields the hardcoded
  array never had. Follows `loadPGASlate`'s error-handling shape
  (returns `null` on any failure, never throws).
- `_cflStateFromStatus(status)` (new): maps the live source's tournament
  `status` (`"scheduled"`→`'pre'`, `"complete"`→`'post'`, anything else
  →`'in'` by exclusion) to this codebase's V2/WC26 `state` convention —
  checked `getCardCircadian`'s expected shape via probe first, not
  invented.
- `CFL_TEAM_VENUES` (new): a 9-entry lookup (CFL's fixed team count),
  values copied directly from the prior hardcoded array's own
  home-team→venue pairs — not invented. Keyed by the LIVE source's own
  spelling (confirmed live: `"Ottawa RedBlacks"`, capital B — the old
  hardcoded array spelled it `"Ottawa Redblacks"`).
- `buildCFLStaticFallback()` (new): the exact prior hardcoded array +
  filter + odds-attachment logic, extracted into a standalone function
  — fallback-ONLY, never auto-executed at schedule-build time anymore.
- Async injection added inside `fetchSchedule()` (4300ms delay,
  following golf's `loadPGASlate` pattern exactly): calls
  `loadCFLScoreboard()`; on success with ≥1 game, pushes the live
  section; on failure/empty, falls back to `buildCFLStaticFallback()`.
  **Single `hasCFLSection` push-gate shared by both branches** ensures
  only one of them ever calls `allData.sports.push` for CFL.
- The old synchronous `cflGames` array + odds-attachment + `sections.push`
  block was **removed** from `buildTodaySchedule()` entirely (confirmed
  via `git diff` and smoke regression guard `A-CFLWIRE-4`).

`getCardCircadian`, `isGameOver`, `findESPNScore`, `resolveBundle`,
`isToday`, `_cflMatchOdds` all confirmed unchanged (zero diff lines
touching their definitions). Golf's `slashGolfPrefetchAll`/
`loadPGASlate`/`golfGames` confirmed unchanged (zero diff lines).

## TASK 2 — explicit decision on the old hardcoded array

**Kept, as a fallback-ONLY path, not removed entirely.** Reasoning
(stated per the doc's own request, not left ambiguous): this is
brand-new client wiring with exactly one real end-to-end verification
this session (see below) — reliability over many real polls, relay
downtime, or edge cases genuinely can't be established from a single
session. The doc's own guidance was to remove entirely only "if the
live fetch works cleanly end-to-end," and to keep a fallback-only path
"if anything about reliability is uncertain by the time this ships." A
first-ever wire-up of a never-before-called endpoint is exactly that
uncertain case. The single-push-gate design (`hasCFLSection`, shared by
both branches) makes the golf-style duplicate-coexistence bug
structurally impossible here, regardless of which path fires.

## TASK 3.3 — circadian classification interaction (checked, not assumed; real gap found)

**Traced, then live-observed: this wiring does NOT change CFL's
circadian classification, despite adding a real `state` field.**
`renderAll`'s `_circInput` construction (index.html, `_circEData=typeof
findESPNScore...`) only ever reads `state` from
`findESPNScore(g)?.state` — never from `g.state` directly. CFL has no
ESPN/V2 score-polling coverage (ESPN's CFL feed confirmed dead since
2023; CFL absent from `FIELD_V2_SOURCES`), so `findESPNScore(cflGame)`
always returns `null`. The new `state` field I added is therefore
**correctly computed but currently inert** — never consumed by
`getCardCircadian`.

**Confirmed live, not just by code trace** (see Task 3 verification
below): today's real CFL card shows `data-circadian="LATE"` despite the
game being genuinely `scheduled` (should be `PREVIEW`).

This is a real, separate gap — but modifying `_circInput`'s
construction is **outside this CC-CMD's stated scope** (that logic is
shared by every other sport: MLB, AFL, WC26/V2; touching it needs its
own authorization per this repo's structural-change guardrail, CLAUDE.md
Rule 9). Rather than fix it unilaterally here, filed a focused follow-up
CC-CMD: `docs/CC-CMD-2026-07-04-cfl-circadian-state-wire.md`.

## TASK 3 — live verification via CI-as-proxy (real end-to-end confirmation)

Built `cfl_wire_verify_probe.js` + `.github/workflows/cfl-wire-verify-probe.yml`
(Playwright, run via GH Actions since `*.workers.dev` is blocked from
this sandbox's direct egress). Against the **now-deployed** app (this
probe necessarily runs post-deploy, same pattern as this session's
`circadian-card-sort-order` Task 2 verification, since the new client
code must actually be live to test it):

```
RESULT: {"sectionPresent":true,"cardCount":1,"cards":[{"gameid":"cfl_13419690","circadian":"LATE","home":"BC Lions","away":"Edmonton Elks","starttime":"2026-07-04T23:00:00+00:00"}]}
Live-path cards (gameid starts with "cfl_"): 1
Fallback-path cards (no "cfl_" prefix): 0
Live and fallback both present simultaneously: false
RESULT: PASS -- no live/fallback coexistence detected.
```

Confirms, live: (1) the live fetch succeeded — `gameid` carries the
`cfl_` prefix only the live path sets; (2) exactly today's real game
rendered (BC Lions vs Edmonton Elks, matching the probe data exactly);
(3) zero fallback cards — no duplicate-coexistence; (4) `data-circadian`
is `LATE`, live-confirming the Task 3.3 gap rather than assuming it.

## Deploy-gate race watch (per the user's separate standing request)

Since the deploy-gate concurrency/race fix (`c6eb731`, earlier today),
this session's own subsequent index.html/sw.js-touching push (commit
`1a884e1`) is the first real observation opportunity. Deploy-gate run
`28717830867` completed successfully; `index.html` and `sw.js` on
`origin/main` both read `2026-07-04o` post-deploy with **no stray
sync-back commit needed** (the "already in sync" no-op check correctly
fired) — no overwrite/race symptom observed. One clean data point, not
proof the race can never recur (concurrency behavior genuinely can't be
fully confirmed from a handful of observations, as stated honestly in
that fix's own outbox) — continuing to watch as more pushes land.

## Smoke assertions

4 new: `A-CFLWIRE-1` (`loadCFLScoreboard` + endpoint string exist),
`A-CFLWIRE-2` (`buildCFLStaticFallback` exists), `A-CFLWIRE-3`
(`hasCFLSection` single-push gate exists), `A-CFLWIRE-4` (regression
guard — the old synchronous `sections.push` for CFL is gone). All
verified against the real committed code.

`node smoke.js index.html`: **871 passed, 0 failed** (867 baseline + 4
new). Syntax independently verified via extracted-script `node --check`
(clean) in addition to smoke.js's own successful parse.

## SW_VERSION

Bumped to **`2026-07-04o`** — checked real system time again
(`TZ='America/New_York' date` → 15:53 ET July 4 at commit time); `n`
was already in use from other same-day work.

## CC-verifiable confidence score (per the doc's own rubric)

- **+25** — Live fetch correctly implemented and mapped; live re-probe
  caught a real shape detail the doc's own snapshot got wrong (array of
  rounds, not a single round) before any code was written
- **+20** — Explicit, justified decision on the old hardcoded array
  (fallback-only, single push-gate, live-confirmed never coexisting)
- **+15** — Venue/streaming-link handling explicitly decided
  (`CFL_TEAM_VENUES` lookup, `CFL_PLUS` streams default), not silently
  dropped
- **+15** — Circadian classification interaction checked AND live-
  observed (not assumed either way); real gap found, filed as its own
  scoped follow-up CC-CMD rather than fixed out-of-scope
- **+15** — Live verification via CI-as-proxy, real current data,
  confirming both the live-fetch success and the no-coexistence
  guarantee
- **+10** — CI confirms deployed (Deploy gate run 28717830867,
  succeeded), smoke clean (871/0)

**Total: 100/100.** Committed.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] Real observation of a genuinely in-progress CFL game's exact
      tournament-level `status` string (this session only observed
      `"scheduled"` and `"complete"`) — needs a live game window this
      session cannot force.

## Follow-up CC-CMD filed (Rule 87 — no deferred work without a second CC-CMD)

`docs/CC-CMD-2026-07-04-cfl-circadian-state-wire.md` — proposes adding
a `?? g.state` fallback to `renderAll`'s `_circInput` construction so
CFL's (and any future ESPN/V2-uncovered sport's) real `state` field
actually reaches `getCardCircadian`, without changing behavior for any
sport that already has ESPN/V2 coverage. Deliberately scoped narrowly
and flagged as touching shared infrastructure requiring its own
confidence gate.

---

## Done Conditions

- [x] Probe block re-run, live endpoint re-confirmed with current real
      data before implementing (caught a real shape drift: array of
      rounds, not one round)
- [x] Live fetch implemented, correctly scoped to today's round/games
- [x] Explicit, stated decision made and justified on the old
      hardcoded array (fallback-only)
- [x] Venue/streaming-link handling decided explicitly, not silently
      dropped
- [x] Circadian classification interaction (Task 3.3) checked and
      reported, confirmed live not assumed either way
- [x] Live verification via CI-as-proxy showing real, correct data
      end-to-end
- [x] `node smoke.js index.html` exits 0 (871/0)
- [x] CI confirms deployed
- [x] SW_VERSION bumped (`2026-07-04o`)
- [x] Outbox manifest written (this file)
