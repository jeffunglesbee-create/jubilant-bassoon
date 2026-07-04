# CC Outbox — Per-Game Circadian State (client-phase-v2)

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-circadian-client-phase-v2.md
**Commits:** 0d26a17 (implementation), beb0167/d9dbc0f (CI live-verify probes)
**Deploy:** Deploy gate run 28692351171 — all 8 steps succeeded, including
"Deploy to Cloudflare Workers"

---

## Probe block — run before any edit, as instructed

**P1 (relay vocabulary):** Re-fetched `field-relay-nba/src/index.js` live,
diffed byte-for-byte against the copy fetched during this doc's *prior*
run this session — **identical, zero drift**. 6 `const state =`
assignments, exactly matching the doc's table: `adaptNhle`/`adaptNbaCDN`/
`adaptESPNWCSoccer` → `'final'`; generic ESPN/`adaptESPNFootball`/
`adaptESPNMLB` → `'post'`; `'live'`/`'pre'` consistent across all six.
No discrepancy to reconcile.

**P3:** `fetchNewspaper`/`renderNewspaper`/`bootNewspaper` all confirmed
present at their documented line numbers.

**Wiring-point line numbers re-verified fresh** (the doc explicitly warns
these shift): `_seenFinals = new Set()` and the `.add(game._id)` call site
were at different line numbers than the doc cited by the time this session
ran (39474/39485-86 → 39518/39529-30, +44 lines from an intervening
commit) — confirmed live via grep before editing, not assumed from the doc.

## What this session's prior run found, and what v2.1 fixed

A prior run against the v1 CC-CMD found two real bugs and correctly
stopped rather than papering over them: (1) `getCardCircadian`'s
`'live'` check would never fire against a real card, because
`mapV2ToESPN()` normalizes every relay game object to `'pre'/'in'/'post'`
before card-render code ever sees it; (2) `minutesSinceFinal` had no
existing field to derive from. The v2.1 doc fixed both — this run
independently re-verified each fix rather than trusting the doc's own
say-so:

- **`getCardCircadian` live-state check:** confirmed the fixed code
  checks `game.state === 'live' || game.state === 'in'`, matching the
  codebase's own pre-existing defensive pattern (verified 15+ existing
  instances of this exact pairing elsewhere in the file). Smoke assertion
  A-CIRCADIAN-3 executes the real function against both values.
- **`_finalizedAt`:** confirmed wired at the exact `_seenFinals.add(game._id)`
  firing point (after re-locating its real current line number), declared
  alongside `_seenFinals`, written once per game — no new polling added.

## A third issue found in v2.1, not covered by its own scoring rubric

Task 4's doc text still says the newspaper bundle "already contains all
the content" needed for `getNewspaperVoice(games)` — this remains
inaccurate. Verified against relay source (`/analytics/newspaper/{date}`
handler): the bundle carries recap/preview prose and a D1-archived
`completed_games` list (yesterday's finished games, no live `state`
field) — **no live per-game state array**. Compounding this,
`bootNewspaper()` fetches and calls `renderNewspaper(bundle)` *before*
`fetchSchedule()` ever populates `allData.sports` — so there is no real
games array available at the moment the doc says to wire this in.

This wasn't in the CC-CMD's scored confidence rubric (which only covers
P1, the live/in check, `_finalizedAt`, and smoke+CI), so it didn't block
the commit decision — but shipping it as literally specified would have
meant `getNewspaperVoice` either never ran or ran against an empty array
every time. Resolved by adding `applyNewspaperVoice(games)`, called from
`renderAll()` once real per-game circadian data exists (collected during
the same per-card loop that Task 3 already needed), toggling visibility
on the sections `renderNewspaper` already built. Same "no new fetch"
constraint the doc specifies — just wired to the point where real data
actually exists instead of where the doc assumed it would.

## Implementation

- `isGameOver(game)`, `getCardCircadian(game)`, `minutesSinceFinal(game)` —
  added near the existing `getStatus()` helper (index.html ~6650).
- `_finalizedAt` map — declared next to `_seenFinals`, written at its
  exact firing point inside `checkForNewFinals`.
- `getNewspaperVoice(games)` — added exactly as specified.
- `applyNewspaperVoice(games)` — new, authorized-by-necessity glue
  described above.
- **Task 3 (card render variants):** `getCardCircadian` wired into the
  real per-card render loop via `findESPNScore(g)` (the only object that
  actually carries live `.state` at render time — confirmed via the same
  `mapV2ToESPN`/`espnScores` investigation that produced the live/in fix).
  Missing/unpolled games degrade to `LATE` per the doc's own explicit
  SCOPE BOUNDARY (no clock-based fallback authorized).
  - **PREVIEW:** stream row switches from the capped 3-chip view to the
    existing uncapped `streamsHTML()` — the "full broadcast chip row."
    The "stakes/pick recommendation line" half of this variant is
    already unconditionally covered by the existing narrative-line and
    `applyFieldPickBadge()` FIELD's Pick badge — neither is gated by
    circadian state today, so no new code was needed there; noting this
    explicitly rather than building a redundant second mechanism.
  - **LATE:** `.circadian-late` class dims the card via the *existing*
    `--opacity-seen` CSS token (confirmed present, documented in
    `VIEWPORT-V4-SPEC.md` as "engaged but secondary, FINAL game cards" —
    not a new invented value), plus a new one-line `Final: {away} {score}
    – {home} {score}` recap div.
- CSS: `.game-card.circadian-late`, `.circadian-late-recap`,
  `.field-newspaper.np-minimal` — all additive, no existing rule changed.

## Smoke assertions

5 new assertions, **A-CIRCADIAN-1 through 5** — not the doc's assumed
`A[NEXT]`-sequential-number scheme. Checked `smoke.js`'s real convention
first (`A-TOURN-*`, `A-ROUND-*`, `MLBKEY-*`, `A_CARD_BRIEF_LINE_*` —
descriptive prefixes, not strict sequential numbers) and followed that
instead. A-CIRCADIAN-3 and -4 execute the real `getCardCircadian` via
extraction + `new Function()` against real inputs (matching this file's
own established pattern, e.g. `MLBKEY-001/002`), not just presence
checks — A-CIRCADIAN-3 specifically tests both `'live'` and `'in'` to
lock in the v2.1 fix.

`node smoke.js index.html`: **831 passed, 0 failed** (826 baseline + 5 new).

## SW_VERSION

Bumped to **`2026-07-03b`**, not `2026-07-04a`. Checked real system time
directly (`date -u` / `TZ='America/New_York' date`) rather than assuming
from the session's UTC-based date context: it was 02:35 UTC July 4 = 22:35
ET **July 3** — this repo's SW_VERSION convention is explicitly ET-based
(CLAUDE.md/PM-9). `2026-07-03a` was already in use, so `b`.

## CC-verifiable confidence score (per the doc's own split rubric)

- **+25** — P1 vocabulary re-check matches the doc's table, zero drift
- **+25** — `getCardCircadian`'s live-state check verified to match both
  `'live'` and `'in'`, against the codebase's own established pattern
- **+25** — `_finalizedAt` correctly wired into the existing `_seenFinals`
  gate, same firing point, no new polling
- **+25** — Smoke 5/5 green (831/0 total) + CI confirms deployment

**Total: 100/100.** Committed.

## Went further than the scored rubric requires — live bundle verification

The doc's DONE CONDITIONS ask CI to confirm the functions "exist in the
deployed bundle." Rather than inferring this indirectly from green CI
(deploy-gate + Smoke Test + Live Verify both succeeded), used the
established CI-as-proxy technique to directly fetch the live deployed URL
(`https://jubilant-bassoon.jeffunglesbee.workers.dev/`) and grep its
actual source for the new function declarations:

```
6048:function getCardCircadian(game) {
6061:function getNewspaperVoice(games) {
```

`isGameOver` and `applyNewspaperVoice` also matched (4/4 new top-level
functions confirmed present). `SW_VERSION = '2026-07-03b'` in the live
response confirms this exact commit is what's actually serving, not a
stale prior deploy. (The full 1.7MB response wasn't kept verbatim in
outbox/ — every other `cf-result-*.txt` this session is under 25KB;
replaced with the extracted finding, see `outbox/cf-result-20260704T024122Z.txt`.)

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] **Real classification check against a currently-live game (PRIME)
      and a currently-finished game less/more than 120min ago (NIGHT vs
      LATE)** — requires `*.workers.dev` access this sandbox structurally
      lacks for interactive/stateful checks beyond a single GET. The
      static live-bundle probe above confirms the code is deployed and
      byte-correct; it does not confirm real-time classification against
      an actual live/recently-finished game, since no such game was
      necessarily in progress at probe time. Chat: pick a genuinely live
      game and a genuinely-finished-within-120-minutes game, open the
      live site, and confirm `data-circadian="PRIME"` / `"NIGHT"` render
      on the matching cards, plus a `LATE` card (finished >120min ago)
      shows the dimmed treatment and recap line.

---

## Done Conditions

- [x] P1 and P3 probes run and pass before any edit
- [x] `game.state === 'live' || game.state === 'in'` check confirmed
      present in `getCardCircadian`
- [x] `_finalizedAt` map added at the exact `_seenFinals.add(game._id)`
      point — real current line number re-verified before editing
- [x] `node smoke.js index.html` exits 0, all 5 new assertions green
      (831/0 total)
- [x] CI confirms `getCardCircadian`/`getNewspaperVoice` exist in the
      deployed bundle — verified directly via live-URL probe, not just
      inferred from green CI
- [x] SW_VERSION bumped in `index.html` and `sw.js` (`2026-07-03b`,
      ET-correct, not the UTC-based date naively assumed)
- [x] Outbox manifest written (this file)
- [x] No unauthorized scope: Task 4's `applyNewspaperVoice` addition is a
      wiring necessity flagged explicitly above, not unprompted scope
      creep — same "no new fetch" constraint, same section-visibility
      goal, just anchored to when real data actually exists

---

## Addendum (v2.2, same day) — cross-sport fix

**Commits:** 918de65 (implementation), a0188a4 (rebase/push landed as),
c82f8b8 (shrink probe result). **Deploy:** run 28693117200 — all steps
succeeded.

A later chat session opened the live PWA via real browser automation and
found `getCardCircadian` v2.1 **only worked for WC26** — MLB and AFL game
objects never carried a `.state` field at all, so every MLB/AFL game
silently fell through to the `LATE` default regardless of its real status.
The doc was revised to v2.2 with the real per-sport fields.

**Probe block re-run fresh, as instructed (P1 especially):** relay
source re-fetched, byte-identical to every prior fetch this session —
zero drift, still matches the doc's table exactly.

**Independently verified both v2.2-cited source lines rather than
trusting the doc's citations:**
- `normalizeMLBStatus()` at the exact cited line (index.html:19788) —
  confirmed real output vocabulary `'pregame'/'live'/'final'/'postponed'`
  matches the doc's table exactly.
- `status: normalizeMLBStatus(...)` confirmed assigned directly onto the
  MLB game object returned by `normalizeMLBGame` (index.html:19827) —
  i.e., on the raw schedule object, not on the ESPN-score lookup object.
- `_aflComplete: g.complete` confirmed at the cited lines
  (index.html:21995, 22039) — also on the raw schedule object.

**A wiring bug found beyond what v2.2's own text called out:** the
existing Task 3 wiring (from the v2.1 pass) only ever passed
`findESPNScore(g)`'s `.state` into `getCardCircadian` — it never threaded
`g.status` or `g._aflComplete` through at all. Fixing only the pure
function per v2.2's spec, without also updating the render-loop call
site, would have shipped correct logic that never actually receives the
fields it checks for — the exact same class of bug (correct-in-isolation,
never-triggered-in-practice) as the original `'live'` vs `'in'` issue.
Fixed by building one merged input object per card:
`{state, status: g.status, _aflComplete: g._aflComplete, _id: g._id}`,
threaded through to both the card's own classification and the
`_renderAllCircadianGames` array `applyNewspaperVoice` consumes.

**CFL/Golf fallback verified, not assumed:** `getCardCircadian({})`
executed via smoke A-CIRCADIAN-7 returns `'LATE'` without throwing — no
guessed field check was added for these two sports, matching the doc's
explicit instruction not to invent a signal that doesn't exist.

**Known, honest limitation not asked to be fixed:** MLB's `.status` is
populated once, at boot, by `fetchMLBFixtures()` (confirmed: exactly one
call site, no interval, no re-fetch) — so an MLB game's circadian state
derived from `.status` alone will go stale for the rest of the session
unless that same game also gets a matching `findESPNScore(g)` entry via
V2 polling (MLB is V2-enabled — `FIELD_V2_SOURCES.mlb: true` — so this
is the common case, but not guaranteed for every game). `getCardCircadian`
checks `.state` before `.status`, so a live V2 match takes priority
automatically when present; this is existing, sensible fallback ordering,
not something this pass needed to change further. Flagging for honesty,
not proposing a fix — out of this CC-CMD's scope.

**Smoke:** 4 new assertions added (A-CIRCADIAN-5 through 8 — MLB, AFL,
unrecognized-shape/LATE, and `isGameOver`'s MLB/AFL terminal values), all
executing the real functions via extraction + `new Function()`, not
presence checks. `getNewspaperVoice`'s existence check renumbered to
A-CIRCADIAN-9. **9/9 new assertions green, 835/0 total** (up from 831).

**SW_VERSION:** bumped to `2026-07-03c` — checked real system time again
(still 23:09 ET July 3 at commit time), not assumed; `b` was already used
earlier this same ET day for the v2.1 commit.

**CC-verifiable confidence score (v2.2's own rubric, 20 points × 5):**
- **+20** — P1 vocabulary re-check, zero drift
- **+20** — `getCardCircadian` handles all three verified shapes (WC26
  `state`, MLB `status`, AFL `_aflComplete`) — verified via smoke
  A-CIRCADIAN-3/4/5/6 executing the real function
- **+20** — CFL/Golf confirmed to hit the explicit `LATE` fallback via
  A-CIRCADIAN-7, no guessed field check added
- **+20** — `_finalizedAt` wiring confirmed unchanged and intact (this
  pass didn't touch it — verified, not assumed)
- **+20** — Smoke 9/9 green (835/0 total) + CI confirms deployment

**Total: 100/100.** Committed.

**Live bundle re-verified directly** (not just inferred from green CI),
via `workflow_dispatch` (the trigger file's content was already correct
from an earlier same-session probe, so a plain push would have been a
no-op with no diff to fire on):

```
if (game.status === 'final' || game.status === 'postponed') return true; // MLB
if (typeof game._aflComplete === 'number' && game._aflComplete >= 100) return true; // AFL
if (game.status === 'live') return 'PRIME'; // MLB
```

`SW_VERSION = '2026-07-03c'` in the live response confirms this exact
commit is what's serving. Full response (31,237 lines) not kept
verbatim — replaced with the extracted finding in
`outbox/cf-result-20260704T031159Z.txt`, consistent with every other
`cf-result-*.txt` this session.

**Deferred to chat (updated scope):** the classification-check deferral
above is now narrowed to MLB/AFL specifically — WC26 and the
`_finalizedAt` mechanism itself were already confirmed live via direct
browser inspection prior to this v2.2 revision.

---

## Addendum (v2.3, same day) — classification never refreshed after initial render

**Commits:** 21137d3 (implementation), 2cbf93f (rebase/push landed as),
f7b33b7 (shrink probe result). **Deploy:** run 28693561581 — succeeded.

A later chat session opened the live PWA and found every card's circadian
classification frozen at whatever it was on first render — including a
real MLB game confirmed via direct JS inspection to have `status:'final'`
still showing `data-circadian="PRIME"` in the live DOM. Root cause: v2.1/
v2.2 only ever invoked `getCardCircadian` once, inside `renderAll()`'s
card-template string. Live score updates run through a completely
separate function, `renderESPNScores()`, which patches the score display
and toggles `espn-live`/`espn-final` directly on the existing card
element — without ever calling `renderAll()` again or touching
`data-circadian`/`circadian-*`.

**Line number re-confirmed fresh, per explicit instruction — no drift
this time:** the doc warned this file changes daily, but the
`espn-live`/`espn-final` toggle block was at the *exact* cited location
(index.html:21119-21122) when checked.

**TASK 6 implemented verbatim:** the new block sits immediately after
`card.classList.remove("espn-live","espn-final")`, reuses this function's
own already-computed `isLive`/`isFinal` (from `_n.state` via
`computeGameNarrative` — already normalized to the same `'in'/'post'`
shape `getCardCircadian`'s WC26/V2 branch expects, so no MLB/AFL-specific
field reading is needed at this particular call site), and calls
`getCardCircadian({state:'post', _id: game._id})` for the final
transition specifically — reusing the same `minutesSinceFinal`/
`_finalizedAt` timing logic rather than hardcoding `NIGHT`/`LATE`, so a
game going final through this path gets classified identically to one
detected via `checkForNewFinals`.

**Smoke:** one new assertion, A-CIRCADIAN-10, checks the refresh block
exists at the *correct firing point* — inside the 1200 characters
immediately following the exact `card.classList.remove("espn-live",
"espn-final")` line, not just anywhere in the file — so a future edit
that moves or removes this logic without moving the assertion's anchor
would genuinely fail, not pass on a stale full-file match. **10/10 new
assertions green, 836/0 total** (up from 835).

**SW_VERSION:** bumped to `2026-07-03d` — checked real system time again
(still 23:28 ET July 3 at commit time); `c` was already used earlier this
same ET day for the v2.2 commit.

**CC-verifiable confidence:** 100% on all four self-assessed criteria —
line number exact-match confirmed, code matches the doc's TASK 6 snippet
verbatim (diffed), smoke assertion added and rigorously anchored (not a
loose file-wide substring check), SW_VERSION bumped correctly. Committed.

**Live bundle re-verified directly**, via `workflow_dispatch` (third time
this pattern was needed this session — the trigger file's URL was
already correct, so a plain push produces no diff to fire on):

```
16940: const _newCircadian = isFinal
16945: if (_newCircadian && _newCircadian !== card.dataset.circadian) {
16947: card.classList.add('circadian-' + _newCircadian.toLowerCase());
16948: card.dataset.circadian = _newCircadian;
```

`SW_VERSION = '2026-07-03d'` in the live response confirms this exact
commit is deployed. Full response (31,247 lines) not kept verbatim —
replaced with the extracted finding in
`outbox/cf-result-20260704T033054Z.txt`.

**Explicitly NOT attempted, per instruction:** the DOM-refresh-over-time
verification — opening the live PWA, finding a real card whose status
changes, and confirming `data-circadian` actually updates on the next
poll cycle. This sandbox has no way to hold a page open across a live
polling interval and observe a DOM mutation happen; a static single-GET
probe (used above) can confirm the code shipped correctly, but cannot
substitute for watching it fire. This remains the one deferred item,
now scoped to: does the refresh actually happen in a real running
session, not just "does the code that should cause it exist and match
the spec."
