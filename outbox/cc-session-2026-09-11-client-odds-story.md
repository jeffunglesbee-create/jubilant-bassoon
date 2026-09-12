# CC session — CC-CMD-2026-09-11-client-odds-story

Rule 67 session doc. **The feature does not render. This records why, with the
evidence, rather than closing the CC-CMD.**

## HEAD progression

| commit | what |
|---|---|
| `f9c23edc` | Task 0 wire probe (no code) |
| `327678bc` | `oddsLine` + slot + CSS + 6 assertions — wired into `updateCard` |
| `d207c191` | re-wired into `renderCard`; filed the MUST/HOT/QUIET chip |
| `9c6f6dce` | live DOM probe (Playwright, Rule 90 pattern) |
| `8f017572` | probe fixed; wrong-render-path filed |

Smoke **1044 passed, 0 failed** (from 1037). SW_VERSION `2026-09-09c` →
`2026-09-11a` (ET date — 21:14 ET while UTC had rolled to the 12th).

## TASK 0 — the wire format, which the CC-CMD had wrong

The CC-CMD says `context-assembler.js:462` "assembles an odds story onto the
context payload" and asks for the field name, warning that it names the
producing function and not the wire format. It does not match.

**There is no `odds_story` field on the wire.** Verified live —
`outbox/odds-story-wire-20260912T010900Z.json`,
`odds_story_key_present_anywhere: false`. The identifier appears once in the
entire relay, as a journalism prompt-BLOCK id (`context-assembler.js:1701`).

**That mattered.** `computeOddsStory` returns `''` for *both* "no odds" and
"both prices, moved under threshold" (`|ML diff| < 10`) — it collapses the
dominant state into the second one. Rendering from it would have made 46.6% and
26.7% of cards indistinguishable. Rule 99, in the field the CC-CMD assumed.

**Two endpoints, two shapes:**

| endpoint | field | type |
|---|---|---|
| `/context/date/{date}` → `games.regular[]` | `opening_odds` | JSON **string** |
| `/context/game/{id}` → `game` | `opening_odds_parsed` | **object** |

Real value, `MLB_2026-09-11_e401816899`:
`{source, captured_at, _oddsProof, moneyline{home,away}, spread{home,away,homePrice,awayPrice}, total{over,under}}`

## Coverage, 116 rows across four dates

| state | n | share |
|---|---|---|
| no odds | 54 | **46.6%** |
| both, ML identical | 31 | 26.7% |
| opening only | 20 | 17.2% |
| both, ML moved | 11 | 9.5% |

The CC-CMD's own table for 09-10, 09-08 and 09-06 reproduced exactly. `0 of 116`
rows share a `captured_at`, so the ODDS-PROOF.md trap is not currently live; the
guard ships anyway.

## TASK 1/2 — built, correct, and not reachable

`oddsLine()` is unit-tested **8/8** across all four states plus three null paths.
Six assertions, each mutation-proven against the artifact they read. The
unchanged claim is scoped to *the moneyline* because the sample it was built
from has an identical ML while the **spread prices moved** (113→109, −136→−132) —
"the line is unchanged" would have been false on that row.

**Rule A held.** Hidden-by-default text: no badge, no colour by magnitude, not
sortable, no notification. `A-ODDS-6` fails when a `font-weight` is added.
No push affordance was added anywhere.

## TASK 3 — the live DOM says it renders nowhere

Run 34667469393, `sw_version: 2026-09-11a` (deploy live, not stale):

```
cards_seen: 0   odds_slot_present_in_dom: false
states: { no_odds: null, opened_only: null, unchanged: null, moved: null }
```

**Two consecutive wiring attempts, wrong the same way.** `updateCard` has zero
callers (STAGED). `renderCard` has two, both `buildNightOwlStatic`. The main
slate is a different builder — `field.js:8281`, a template literal with no
`data-slot` attributes. *A function having callers is not evidence it is the
path that runs*, and I inferred exactly that twice.

The data reaches only `injectDebriefCards` (`field.js:2628`), the sole caller
passing a `contextGame` source to `buildEnrichedGame`, gated on `isGameOver()` —
completed games only. The main slate's call at `:8271` passes `espnScore` alone,
so `oddsOutcome` is null there regardless of wiring.

Filed as `docs/CC-CMD-2026-09-12-odds-line-wrong-render-path.md` rather than
fixed: the correct home is `buildDebrief`'s layer stack in
`src/debrief/index.ts`, and that move **also invalidates the six A-ODDS
assertions**, because that file is esbuild-bundled and never appears in
`index.html`. They would stay green while inspecting a file the code had left —
the same defect one level up. A third blind attempt at the end of a long session
is not a 95-confidence change.

## Found on the way, filed not fixed

**Task 0.2 was wrong.** I grepped `field.js` for `oddsStory`/`odds_story`, got 0,
and reported no conflicting surface. The real symbol is `buildOddsStory` in
`src/debrief/index.ts` — invisible to that grep *and* to `index.html`. It has
rendered opening moneylines all along, and renders a chip whose variant
vocabulary is **MUST / HOT / QUIET**, from a composite of the opening line, the
final margin and a `wentToOT` threshold. Composite, threshold, tier and
recommendation vocabulary — the set Rule F names. It may be cleared (post-game,
pull-only); `CC-CMD-2026-09-12-debrief-odds-scenario-chip` makes reading
`ADR-002-CONTEXT.md` its Task 0 rather than rewriting on my reading.

## Instruments I had to fix mid-task

- The live probe's `cards_seen: 0` collapsed three realities — no games, wrong
  selector, not yet rendered. Now reports `slate_cards`, `debrief_injected`,
  `debrief_visible` and existing `.debrief-odds` layers separately.
- My first mutation run reported **four survivors**. The sync guard had blocked
  propagation, so smoke was reading a stale `index.html`. Source versus copy,
  inside the harness. Re-run against the artifact the assertions read: all six
  caught.

## TASK 3 CLOSED — measured, and the cause is upstream

The layer moved to `buildDebrief`'s stack (`2403a9c8`) after the confidence gate
was resolved. Two of its four blockers dissolved on inspection: I had not read
the layer contract (90 seconds), and my claim that assertions would be stranded
was wrong about its reason — `build-bundle.mjs` injects the TS into `index.html`
at deploy, after smoke, so the fix was simply to read the TS file.

The real blocker is now built: `scripts/check-render-reaches-dom.mjs` walks the
call chain and **self-tests against the two chains that actually shipped**,
`updateCard` (0 callers) and `renderCard` (NightOwl only). Both go red.

**Live result: the layer is correct and blocked upstream.**

| id form | HTTP | `game` | `opening_odds_parsed` |
|---|---|---|---|
| `espn:401816899` +7 | 200 | present | **8 of 8** |
| `g16` / `g19` / `g25` | 200 | **null** | false |

10 debriefs rendered, each carrying only `debrief-prediction` — Layer 2 reads
briefs, which the slate-id response has; Layers 1, 3 and 6 read the `game`
object, which it does not. `buildOddsStory`, months older than my layer, is
blocked identically. Filed as
`docs/CC-CMD-2026-09-12-context-game-slate-id.md`.

## Done condition

| requirement | state |
|---|---|
| real wire format recorded | **yes** |
| three states rendered, evidenced with game ids | **NO — and the cause is now measured, not guessed: `/context/game/g16` returns 200 with `game: null`, so no odds layer can render for any of the 10 named cards** |
| smoke green, count recorded | **yes — 1044, 0 failed** |
| explicit no-push statement | **yes — none added; `A-ODDS-6` enforces it** |

**The CC-CMD is not done.** Three successors carry the rest:

| doc | what |
|---|---|
| `CC-CMD-2026-09-12-context-game-slate-id` | the blocker — client `_gameId`, relay 200-with-null |
| `CC-CMD-2026-09-12-debrief-odds-scenario-chip` | the MUST/HOT/QUIET chip in the same layer stack |
| `CC-CMD-2026-09-12-odds-line-wrong-render-path` | superseded by `2403a9c8`; kept for the evidence chain |
