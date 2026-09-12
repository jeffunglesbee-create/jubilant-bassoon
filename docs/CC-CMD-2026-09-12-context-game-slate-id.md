# CC-CMD-2026-09-12 — the client asks /context/game for the slate id, and gets a 200 with no game

Found closing Task 3 of `CC-CMD-2026-09-11-client-odds-story`. **Pre-existing.**
It blocks three debrief layers, only one of which is new.

## Measured 2026-09-12, both id forms, same games

| id the client sends | HTTP | `game` object | `opening_odds_parsed` | briefs |
|---|---|---|---|---|
| `espn:401816899` (and 7 more) | 200 | present | **present, 8 of 8** | — |
| `g16`, `g19`, `g25` | **200** | **null** | **false** | present |

Artifacts: `outbox/context-game-odds-*.json`,
`outbox/odds-line-probe-manifest-*.json`.

## What the DOM shows, and why it matches exactly

39 slate cards, 10 debriefs injected and visible, **0 odds layers of either
kind**. Every one of the 10 rendered only `debrief-prediction` — Layer 2, the
pre-game brief:

```
g16  Baseball (MLB)  Pittsburgh Pirates @ Chicago Cubs
     layers: ['debrief-prediction', 'debrief-prediction__text']
```

Layer 2 reads `debrief.preGameBrief`, which comes from `archive.gameBriefs` —
present in the slate-id response. Layers 1, 3 and 6 read `dramaSealed`,
`oddsOutcome` and `oddsOutcome`, all of which come from the `game` object —
null in the slate-id response. The DOM is exactly what the payload predicts.

## The cause

`injectDebriefCards` (`field.js:2628`):

```js
const contextId = rawGame._gameId || gameId;
```

When `_gameId` is unset, it sends the slate id. **`field.js:15709` already
documents this failure by name:**

> *"Without this, `/context/game/g18` is fetched instead of
> `/context/game/espn:401816164` — returning a pre-game brief…"*

So the propagation of `_gameId` exists and is not reaching these MLB rows.

## Two defects, not one

**1. Client — `_gameId` is not propagated** to the games these cards are built
from. That is the bug the :15709 comment describes as already handled.

**2. Relay — `/context/game/<unknown id>` answers 200 with `game: null`.**
That is Rule 99 (DISTINGUISHABILITY-A): a successful-looking response for a
lookup that found nothing, indistinguishable from "this game genuinely has no
archive row". It is why the client failed silently for however long this has
been true — nothing anywhere raised a signal.

Fixing only the client leaves the relay able to hide the next instance.

## Tasks

0. **Probe.** Establish where `_gameId` is set and why these MLB rows lack it.
   `field.js:15794` is the propagation site the comment refers to — read it and
   say which path skips it, rather than assuming all sports share one.
1. **Client:** propagate `_gameId`, or resolve the archive id at the
   `injectDebriefCards` call site. Do not special-case MLB — establish the rule.
2. **Relay:** make an unresolved id distinguishable. Either 404, or 200 with an
   explicit `resolved: false`. Check `CONTRACTS.md` and every consumer of
   `/context/game` before changing the shape (Rules 60, 86) — the client's own
   `if (!r.ok) return` means a 404 is absorbed cleanly, but confirm that.
3. **Mutation (Rule 90):** force an unresolvable id and assert the client stops
   rather than rendering a partial debrief.
4. **Done condition:** re-run `odds-line-probe.yml` and require at least one
   named game id carrying a `.debrief-odds-movement` or `.debrief-odds` layer.
   The probe already records per-card layer class names, so the evidence shape
   exists.

## Not in scope

The odds movement layer itself. It is shipped, mutation-proven on six
properties, and correct — `buildOddsStory`, which predates it by months, is
blocked by the identical cause. Nothing in this CC-CMD is a reason to change
either layer.
