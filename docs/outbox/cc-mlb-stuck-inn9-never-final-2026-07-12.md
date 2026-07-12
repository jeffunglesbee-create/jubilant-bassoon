# CC Session Outbox — MLB cards stuck at "Inn 9", never showing Final (direct user request, 2026-07-12)

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Direct report: "MLB game cards always
get stuck at INN 9 and never final. Investigate and resolve with novel
thinking. No Fallbacks, only fixes."

## Investigation — verified live in production, not assumed from reading code

Read `refreshMLBStatus()` (~line 21017, MLB Stats API poll, every 90s) and
`renderESPNScores()` (~line 22199, ESPN/V2-relay poll, the function that
actually writes the visible score-wrap and toggles `espn-live`/
`espn-final`). Reading alone wasn't enough to be sure which one was lying —
per Rule 48/72, checked the live app instead of trusting either function's
own comments.

Queried `window.allData` and the real DOM directly on
`https://jubilant-bassoon.jeffunglesbee.workers.dev` (Saturday night, live
MLB slate in progress):

```json
{"id":"g17","home":"Pittsburgh Pirates","away":"Milwaukee Brewers",
 "status":"final","period":"Top 9th","homeScore":7,"awayScore":6}
```
Every finished MLB game showed **`game.status: "final"` — correct** in the
data model. But the matching DOM card:
```json
{"id":"g17","classes":"game-card ... espn-live pulse-med",
 "scoreWrap":"3–2 Inn 9 Pirates lead Brewers"}
```
**still carried the `espn-live` class and stale "Inn 9" score-wrap text**,
for every single finished game checked (7 of 7). One game (Reds@Cubs) even
showed the inverse split: `status:"pregame"` with a leftover `"Bot 9th"`
period string, confirming the two systems are fully decoupled, not just
lagged.

**Root cause, confirmed by tracing the actual render path**: two
independent, un-synced systems track MLB game state:
1. **MLB Stats API** (`refreshMLBStatus`, statsapi.mlb.com direct) — this
   function's own header comment already calls it "faster, authoritative."
   It correctly flips `game.status` to `'final'`. But its only DOM effect
   is `syncCardAttributes()`, and `CARD_ATTRIBUTE_SYNC` (~line 22048)
   contains exactly one entry: `circadian`. Its own comment says so
   explicitly: *"espn-live/espn-final intentionally NOT migrated into this
   registry in Phase 1 ... Migrating the other two is a reasonable Phase
   1.5 follow-up, not required for this CC-CMD's done conditions."* That
   follow-up was never done.
2. **ESPN/V2 relay** (`renderESPNScores` → `findScore()` /
   `findESPNScore()` → `_scoresBySource`/`espnScores`) — the *only* code
   path that toggles `espn-live`/`espn-final` and writes the score-wrap's
   period text. It never reads `game.status` at all. Its own state comes
   from `mapV2ToESPN()`'s `state` field, which has a **documented history
   of not resolving reliably for MLB** — that function's own comment (CC-
   CMD-2026-07-05-pickem-cfl-mlb-gaps) describes a prior false-positive
   specific to MLB's `state` field.

So the visible card is 100% governed by system 2, which for MLB
apparently never reports `state:'post'` reliably, while system 1 — built
specifically because system 2 can lag — silently computes the correct
answer every 90 seconds and discards it before it reaches the screen. Not
a rare edge case: confirmed on every finished MLB game checked live.

## Fix — corrected the actual broken data, not a new fallback

Per the "no fallbacks, only fixes" constraint: did **not** add a third
data source, a new rendering path, or a client-side field-mapping
workaround (which would itself violate Rule 60/76 — client compensating
for a producer's broken contract). Instead, `refreshMLBStatus()` now
directly corrects the *existing* ESPN/V2 score-witness objects in
`_scoresBySource`/`espnScores` — the single store `renderESPNScores()`
already reads — using the MLB Stats API data this function already
treats as authoritative, then calls the *one existing* render function
(`renderESPNScores()`) so the fix draws through FIELD's normal, single
rendering pipeline. No duplicate score-wrap/period-label construction
was added.

Design choices, reasoned not defaulted:
- **Runs every poll cycle, not only on the `game.status` transition.**
  The original sync block only fires once, the moment MLB Stats API
  flips status (`if (!fresh || fresh.status === game.status) continue`).
  A single-shot correction could silently fail to stick if ESPN/V2
  re-writes its own (wrong) `'in'` state on its own independent poll
  cycle after mine. Verified this matters (Case 2 below) — the fix
  self-heals every 90s until the witness stays corrected.
- **Uses `espnTeamMatch()` verbatim**, the same fuzzy team-name matcher
  `findScore()` itself uses — not a new/different comparison — so the
  correction targets exactly the entries the render path will actually
  read.
- **Preserves every other field** on the witness object (`period`,
  `clock`, `detail`, `outs`, etc.) via spread — only `state`, `homeScore`,
  `awayScore`, `ts` are overwritten, matching Rule 69 minimal-touch.
- **Leaves already-correct witnesses untouched** (guarded by `state !==
  'post'`) — doesn't rewrite timestamps needlessly.

## VERIFICATION

Real extraction test (Node `vm`) — pulled `refreshMLBStatus` and
`espnTeamMatch` verbatim from the patched file (line-range extraction,
not reimplemented), mocked only the network-touching leaves
(`loadMLBSlate`, `fetchMLBLiveGame`, `document.querySelector`,
`renderESPNScores` as a call counter). 4 cases, all passed:

1. **Transition case** (Pirates@Brewers, `status: live→final` this poll,
   witness stuck at `state:'in'`, stale score) → `game.status` becomes
   `'final'`; witness corrected to `state:'post'`, `homeScore:3,
   awayScore:2`; `renderESPNScores()` called.
2. **Self-healing case** (White Sox@Athletics, `status` already `'final'`
   from a prior poll — no transition this cycle — witness *still* stuck)
   → witness still gets corrected. This is the case that proves the
   every-poll design (not gated on transition) actually matters; a
   transition-only version of this fix would have left this case broken.
3. **Negative control** (Padres@Blue Jays, genuinely live, `period:4`) →
   witness left at `state:'in'`, untouched.
4. **Negative control** (Red Sox@Mets, witness already `state:'post'`) →
   `ts` unchanged, confirming no needless rewrite.

- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_smoke.js index.html`: **Failures: 0**, unaffected.
- `node field_unit.js`: 66 passed, 0 failed.
- `node --check` on the extracted inline `<script>` body: clean.

## DONE CONDITION

Every MLB game whose `game.status` is authoritatively `'final'`/
`'postponed'` per the MLB Stats API now has its ESPN/V2 score witness
corrected to `state:'post'` with the real final score on the same poll
cycle (or the very next one, self-healing), and `renderESPNScores()` is
triggered immediately so the card visibly shows `espn-final` / "Final"
instead of staying on `espn-live` / "Inn 9". Verified via a real,
forced-scenario extraction test against the actual patched function, not
asserted from the diff.

**Not independently verifiable live tonight**: no MLB game in the current
slate will re-cross the live→final boundary again before this deploys
(games already final stay final; a fresh transition needs a genuinely
new game to finish post-deploy). The POST-DEPLOY LIVE VERIFICATION
addendum below checks that the corrected code is genuinely deployed and
that currently-final games' cards show `espn-final` shortly after
deploy (their witnesses get corrected retroactively on this function's
next 90s cycle, which requires no new game to finish) — full
live→final-transition proof will be visible organically the next time a
game ends after this deploy is live.

## Commit

- `index.html`: `refreshMLBStatus()` (~line 21017) gains a
  witness-correction pass after its existing status-sync loop. No
  changes to the existing transition-sync block, `syncCardAttributes()`,
  `CARD_ATTRIBUTE_SYNC`, or `renderESPNScores()` itself. `SW_VERSION`
  bumped `2026-07-11n` → `2026-07-11o`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
- **Not touched, correctly out of scope**: `mapV2ToESPN()`'s own
  `state` derivation and whatever upstream (`field-relay-nba` /
  api-sports.io) makes MLB's `state` field unreliable in the first
  place — that's the relay's contract to fix (Rule 60), out of reach
  from this repo. This fix corrects the symptom's actual mechanism
  (the stale witness FIELD's own client already stores) using data
  FIELD's own client already fetches and trusts, without touching or
  depending on the relay.
