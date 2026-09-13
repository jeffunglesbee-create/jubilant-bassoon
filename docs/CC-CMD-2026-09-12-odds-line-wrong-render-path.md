# CC-CMD-2026-09-12 — the odds movement line is wired to a path the slate does not use

**STATUS: CLOSED 2026-09-13.** All five tasks done and verified live.

| task | evidence |
|---|---|
| 0 read the module, state the null case | `buildOddsMovement` returns `null` for the dominant state |
| 1 move to a `buildOddsMovement` layer | `src/debrief/index.ts:351`, wired as `l6` at `:404` |
| 2 replace the A-ODDS assertions | A-ODDS-5/6 inspect the TS source; A-ODDS-7 asserts the field.js wiring is GONE |
| 3 remove the dead slot wiring | `data-slot="odds"` count is 0 in both `field.js` and `index.html`, held by A-ODDS-7 |
| 4 re-run the probe, named game ids | three states named live: `opened_only espn:401878779`, `unchanged espn:761803`, `moved espn:401879283` |

**Task 4's fourth state was unobtainable as specified, and that was a spec
defect, not an execution one.** `m.states.no_odds` picked an empty
`.debrief-odds-movement` element — but `buildOddsMovement` returns `null` for
that state, so no element exists. The predicate was left over from when the line
was a `data-slot` that rendered hidden; against the `l6` layer it could only ever
return `null`, which reads identically to "not observed today". The dominant
state, permanently invisible.

Now counted over a denominator instead (manifest `20260913T025407Z`):

```
debriefs_total  81   with_movement_line  29   no_movement_line  52
states.no_odds  { game: "g16", "52 of 81 rendered debriefs" }
```

**And the count immediately proved to contain two populations:** 0 of the 29
cards with a movement line have a synthetic `g<N>` id, and all 12 synthetic-id
cards are in the no-movement set. Filed as
`CC-CMD-2026-09-13-no-odds-count-hides-two-causes.md` rather than noted and
dropped.

Session doc: `outbox/cc-session-2026-09-13-odds-line-render-path-closeout.md`.

---

Closes out Task 3 of `CC-CMD-2026-09-11-client-odds-story` by reporting what the
live DOM showed, rather than claiming the feature works.

## What shipped, and where it actually renders

`oddsLine()` and its slot are correct and unit-tested 8/8. The wiring is not.

| commit | wired into | callers |
|---|---|---|
| `327678bc` | `updateCard` | **0** — marked STAGED |
| `d207c191` | `renderCard` | **2**, both `buildNightOwlStatic` (`field.js:41655`, `:41661`) |

`renderCard` is the Phase-2 slot-template builder. **The main slate is a
different builder**: `field.js:8281` assembles
`` `<div class="game-card ${_cardTierClass(g)} ...">` `` by template literal, and
uses no `data-slot` attributes at all.

Two consecutive wiring attempts, both wrong, both for the same reason — a
function having callers is not evidence it is the path that runs.

## Live evidence

Run 34667469393, `sw_version: 2026-09-11a` (so the deploy was live, not stale):

```
cards_seen: 0        odds_slot_present_in_dom: false
states: { no_odds: null, opened_only: null, unchanged: null, moved: null }
```

## Where the data actually is, read from source

`injectDebriefCards()` (`field.js:2628`, called at `:8569` 600ms after render)
is the only path that puts odds in scope:

1. selects `.game-card[data-gameid]:not([data-debrief-injected])`
2. **`if (!rawGame || !isGameOver(rawGame)) return;` — completed games only**
3. fetches `/context/game/{id}`
4. `buildEnrichedGame(rawGame, { espnScore, contextGame: ctx })` — the
   `contextGame` source is what populates `debrief.oddsOutcome`
5. `buildDebrief(enriched)` → the layer stack in `src/debrief/index.ts`

The main slate's own call at `:8271` is
`buildEnrichedGame(g, { espnScore: _circEData })` — **no `contextGame`**, so
`oddsOutcome` is null there no matter how the slot is wired.

## The fix, and why it is not being made blind

The movement line belongs in `buildDebrief`'s layer stack in
`src/debrief/index.ts`, beside `buildOddsStory` / `buildSeriesArc` /
`buildBracketDeltaLayer` — that is the established convention (Rule 62) and the
only place the data exists.

Not done in the same session because the confidence gate was not met: two
wiring attempts were already wrong, and the third would be made at the end of a
long session against a TypeScript module not yet read in full.

**It also changes what can be verified.** `src/debrief/index.ts` is bundled by
esbuild, not by `sync-source.mjs`, so it never appears in `index.html` — the six
`A-ODDS-*` smoke assertions cannot see it. Moving the line there without
replacing those assertions would leave the feature with green checks that
inspect a file it no longer lives in. That is the same defect one level up.

## Tasks

0. **Read `src/debrief/index.ts` in full**, in particular `buildDebrief`'s
   assembly and the `l1..l5` null-collapse at `:233`. State what a sixth layer
   must return for the "render nothing" case.
1. Move `oddsLine`'s logic into a `buildOddsMovement(debrief)` layer there,
   returning `null` for the dominant no-odds state. Keep the scoping to the
   moneyline and the identical-`captured_at` guard — both are load-bearing and
   both are mutation-proven today.
2. **Replace the A-ODDS assertions**, which will go stale. They must inspect
   whatever artifact the TS actually reaches, or be deleted with a stated
   reason. Do not leave assertions passing against a file the code left.
3. Remove the now-dead `fillSlot(card, 'odds', ...)` and `fillSlot(cardEl,
   'odds', ...)` calls, and the `data-slot="odds"` markup, unless the NightOwl
   path is a wanted surface — decide, do not leave both.
4. **Re-run `odds-line-probe.yml`** and require a named game id for at least the
   no-odds and one other state. Note the gate: `injectDebriefCards` only fires
   for `isGameOver()` games, so a run before any game finishes will legitimately
   observe nothing — the probe now reports `slate_cards`, `debrief_injected` and
   `debrief_visible` separately so that case is distinguishable from a broken
   render.

## Related

`CC-CMD-2026-09-12-debrief-odds-scenario-chip` covers the MUST/HOT/QUIET chip in
the same layer. Whoever opens `src/debrief/index.ts` for this should read that
one first — they touch the same function.
