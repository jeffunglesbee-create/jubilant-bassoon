# CC-CMD: Gap-sweep fixes — status/state bug, isLateCloseGame call, NW-3 series context, recapSnippet wiring

**Date:** 2026-07-05
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Source:** re-verified independently by chat against current HEAD after the
2026-07-05 gap-sweep re-run (`docs/CC-CMD-2026-07-03-gap-sweep-client.md`
addendum). Every line/behavior cited below was confirmed via direct grep
before writing this doc — not copied from the sweep's report.

This bundles five fixes discovered in the same investigation. Each is a
separate, single-concern commit (Rule 7) even though they ship together.

**Target time:** ~40 min

## PROBE BLOCK
```bash
sed -n '26665,26670p' index.html   # buildLayer3Rules .status check
sed -n '39405,39416p' index.html   # detectAndStoreStoryMoment .status checks
sed -n '39788,39793p' index.html   # buildComebackProbability .status check
sed -n '35595,35608p' index.html   # isLateCloseGame malformed call + injectLineupEdge signature
sed -n '39858,39870p' index.html   # recordSeriesGame call site (bottom sheet open)
sed -n '38470,38487p' index.html   # [MISSED PEAKS] block, insertion point for [SERIES CONTEXT] + recapSnippet wire
```
Confirm every citation below still matches before editing. Line numbers
may have drifted slightly from unrelated commits — if so, re-locate by
the quoted strings, not by number.

## TASK 1 — Fix `.status` → `.state` (3 sites)

Confirmed: all 12 `espnScores[key] = {...}` write sites in this file set
`state:` (values `'pre'`/`'in'`/`'post'`); none ever set `.status`. These
three checks can never be true as written, permanently disabling their
features:

- Line 26667 (`buildLayer3Rules`): `eData.status==='in'` → `eData.state==='in'`. Disables the EXTREME EVENT journalism cue.
- Line 39409 (`detectAndStoreStoryMoment`): `eData.status === 'pre'` → `eData.state === 'pre'`.
- Line 39414 (`detectAndStoreStoryMoment`): `eData.status === 'post'` → `eData.state === 'post'`. Disables Story Moments tape's "Final:"/"underway" entries.
- Line 39791 (`buildComebackProbability`): `eData.status === 'post'` → `eData.state === 'post'`. Disables the "don't show comeback odds for a finished game" guard.

Simple rename, same string values, no other logic changes.

## TASK 2 — Fix `isLateCloseGame` malformed call (line 35606)

`isLateCloseGame(g, ed, sport)` never uses `g` in its body — only
`ed.state`, `ed.period`, `ed.homeScore/awayScore`, and `sport`. The call
site is inside `injectLineupEdge(card, eData, sport)` (confirmed
signature at probe), where a real `eData` is already in scope two lines
above the call (`eData.homeScore`, `eData.awayScore` are read directly
above it). The bug: `sport` was passed where `eData` belongs, so `ed`
inside the function is a string — `ed.state` is `undefined`, the function
always returns `false`, and the CLOSING UNIT badge never renders.

Change:
```javascript
if (trailingHasEdge && isLateCloseGame({ _section: sport }, sport)) {
```
to:
```javascript
if (trailingHasEdge && isLateCloseGame({ _section: sport }, eData, sport)) {
```
`g` remains an unused placeholder (confirmed — the function body never
reads it), so `{ _section: sport }` is fine to leave as-is; only the
missing `eData` argument needs adding.

## TASK 3 — Fix `seriesKey` construction to be home/away-order-independent

**Real bug found during investigation, not in the original sweep report.**
The write site (line 39869, inside the bottom-sheet-open handler) builds
`seriesKey` from `game.home` / `game.away` for whichever specific game was
opened:
```javascript
const home = (game.home||'').replace(/\s+/g,'_').toUpperCase().slice(0,6);
const away = (game.away||'').replace(/\s+/g,'_').toUpperCase().slice(0,6);
const yr   = new Date().getFullYear();
recordSeriesGame(gameId, sport, `${home}_${away}_${yr}`);
```
Multi-game series alternate home court (confirmed against the real NBA
Finals 2026 sample data in this file: G1/G2 home=San Antonio Spurs,
G3/G4 home=New York Knicks). This means the same real-world series
produces **two different seriesKey strings** depending on which team
happened to be home for the specific game the user opened —
`SANANT_NEWYOR_2026` for G1, `NEWYOR_SANANT_2026` for G3 — so
`seriesLedger` can never actually accumulate more than one home/away
ordering's worth of games per series. This has been silently broken
since the feature was built; Task 4 (the read side) would only ever see
a fraction of a user's real series history without this fix.

**Fix:** sort the two team strings alphabetically before joining, so the
key is independent of who's nominally home:
```javascript
const t1 = (game.home||'').replace(/\s+/g,'_').toUpperCase().slice(0,6);
const t2 = (game.away||'').replace(/\s+/g,'_').toUpperCase().slice(0,6);
const [a, b] = [t1, t2].sort();
const yr = new Date().getFullYear();
recordSeriesGame(gameId, sport, `${a}_${b}_${yr}`);
```

## TASK 4 — Build NW-3 Rival Intelligence: `[SERIES CONTEXT]` Night Owl injection

Follows the exact existing NW-2 (`[MISSED PEAKS]`) pattern in the same
function — same style, same insertion block, same guard structure. Add
immediately after the existing `[MISSED PEAKS]` block (after line 38486's
closing `}` `}`):

```javascript
if (window._userState?.seriesLedger && topGame.seriesRecord && topGame.seriesRecord !== '0-0') {
  const t1 = (topGame.home||'').replace(/\s+/g,'_').toUpperCase().slice(0,6);
  const t2 = (topGame.away||'').replace(/\s+/g,'_').toUpperCase().slice(0,6);
  const [a, b] = [t1, t2].sort();
  const yr = new Date().getFullYear();
  const key = `${a}_${b}_${yr}`;
  // Backward-compat: older entries may have been written with the
  // pre-Task-3 unsorted key. Check both real historical key shapes so
  // existing user data isn't silently dropped by this fix.
  const games = window._userState.seriesLedger[key]
    || window._userState.seriesLedger[`${t1}_${t2}_${yr}`]
    || window._userState.seriesLedger[`${t2}_${t1}_${yr}`]
    || null;
  if (games && games.length) {
    _owlStatCtx += '\n  [SERIES CONTEXT] Viewer has watched ' + games.length +
      ' prior game(s) in this series live. Reference their ongoing investment in this matchup.';
  }
}
```

## TASK 5 — Wire `recapSnippet` into `[MISSED PEAKS]`

`recapSnippet` is fetched by `hydrateMissedRecaps` and stored on each
`dramaticMomentsMissed` entry (confirmed: 160-char game_recap excerpt),
but the `[MISSED PEAKS]` injection only ever reads `m.gameId` and
`m.peakDrama` — the fetched text is discarded. The comment on
`hydrateMissedRecaps` states its own intent: "downstream prompt injection
sees the snippets." Wire it in rather than removing the fetch, matching
that stated intent:

Change:
```javascript
missed.slice(0, 3).map(m => m.gameId + ' (drama ' + m.peakDrama + ')').join(', ') +
```
to:
```javascript
missed.slice(0, 3).map(m => m.gameId + ' (drama ' + m.peakDrama + ')' +
  (m.recapSnippet ? ' — ' + m.recapSnippet : '')).join(', ') +
```

## DONE CONDITIONS
- [ ] Probe block confirms all citations before editing
- [ ] Task 1: all 3 `.status` → `.state` renames applied, verified via grep (zero remaining `eData.status` reads on these objects)
- [ ] Task 2: `isLateCloseGame` call passes real `eData`; manually trace that the CLOSING UNIT badge can now actually render for a real close/late game state
- [ ] Task 3: seriesKey construction sorted at the write site
- [ ] Task 4: `[SERIES CONTEXT]` block added, using the same sorted-key construction, with the 3-way backward-compat lookup
- [ ] Task 5: `recapSnippet` wired into the `[MISSED PEAKS]` line
- [ ] `node smoke.js index.html` clean, no regressions; add structural smoke assertions for Tasks 1, 2, 4 (state-not-status, eData argument present, SERIES CONTEXT block exists)
- [ ] Outbox manifest written

## CONFIDENCE SCORING TABLE
+20  Task 1 — all 3 renames correct, no other logic touched
+20  Task 2 — correct argument fix, traced against the real unused-`g` finding
+15  Task 3 — sorted-key fix applied correctly at the write site
+25  Task 4 — SERIES CONTEXT block correct, matches NW-2 pattern exactly, backward-compat lookup present
+10  Task 5 — recapSnippet wired without breaking the existing fallback-omit behavior when absent
+10  Smoke clean, no regressions

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-05-gap-sweep-fixes.md. Execute all five
tasks: (1) fix 3 status->state checks, (2) fix isLateCloseGame's missing
eData argument, (3) sort the seriesKey construction at the write site so
it's home/away-order-independent, (4) build the new [SERIES CONTEXT]
Night Owl injection using that same sorted key with 3-way backward
compat, (5) wire recapSnippet into the existing [MISSED PEAKS] line.
Each task is its own commit. Do not commit unless confidence >= 95. If
score < 95, report verbatim and stop.
