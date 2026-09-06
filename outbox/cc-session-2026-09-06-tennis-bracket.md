# CC session — the tennis bracket, three repos

2026-09-06. Continuation of the tennis session documented in
`outbox/cc-session-2026-09-06-tennis-and-the-dead-durable-objects.md` (relay).

## What was asked

"Build the bracket, all 3 repos." Then, mid-build: "For jubilant bassoon, use
the World Cup bracket template, all necessary modifications approved."

## The split, and what each repo actually got

| repo | what it holds |
|---|---|
| field-relay-nba | `/bsd/tennis/draw` — season scoping, the winner-identity join, two refusals |
| field-laboratory | `Draw.fs` — the laws a bracket has, as types; 15 rows, 134/134 |
| jubilant-bassoon | the WC bracket tree generalised to N rounds; 15 A-TDRAW rows; a Playwright probe |

## HEAD progression (jubilant-bassoon)

```
af176071  (start of the bracket work)
101a9557  feat: the tennis draw — the World Cup bracket tree, generalised
a3981bcc  ci: prove the draw renders, in a browser, against the relay
a77b8758  fix: the centre column is the round NAMED Final, not the last present
<this>    fix: every anomaly kind the relay emits has words, not a raw key
```

Smoke 1013 → 1028, 0 failed throughout. SW_VERSION 2026-09-06c → f.

## The relay contract (Rule 65)

```
GET /bsd/tennis/draw?tournament=<id>&season=<YYYY>     Cache-Control: max-age=300

200 { tournament{id,name,circuit,category,surface}, season, seasonsAvailable,
      rowsRead, declaredCount, truncated, pages,
      editionMatches, mainDrawMatches, roundsOutsideMainDraw,
      rounds[  {round,index,matches,canonical,atCanonicalSize} ],
      nodes [  {id,round,roundIndex,date,status,isDoubles,
                p1{id,name,shortName,countryCode,rank}, p2{...},
                winnerId, sets[{p1,p2,tiebreak?}]} ],
      edges [  {from,to,playerId} ],
      anomalies[ {kind, ...} ] }

400  tournament missing / non-numeric, or season not YYYY
404  no matches for that tournament and season
409  a player appears twice in one round  |  an ambiguous edge
502  upstream did not honour the tournament filter
```

Client consumer: `renderTennisBracket()` in `src/legacy/field.js`, into
`#tennis-draw`. **INTEGRATION STATUS: VERIFIED** — see the probe run below.

`rank` is a world ranking, **not a seed**. There is no seed field anywhere on a
BSD tennis row or player; `current_ranking` is the only candidate. The client
prints it with a `#` and a `.wct-rank` class for that reason.

## What the World Cup template needed, and what it did not

Kept unchanged: the `.wct-*` CSS vocabulary, the two-halves layout, the 1180px
breakpoint, `wct-match` / `wct-team` / `wct-col-head` / `wct-champion-label`.

Changed:

1. **Columns come from the response.** `renderWCBracketTree` hardcodes four
   columns a side and a slot id per match (`R32_73_A`, `SF_1_B`). A slam is
   seven rounds, a 1000 is six or seven, and a draw in its first week is four.
   No CSS rule assumes a count; the grid template is written by the renderer.
2. **Below 1180px the tree is replaced, not hidden.** The WC tree hides itself
   and relies on a probability table beside it. There is no table here, so
   hiding alone leaves a tab with a heading over nothing.
3. **A fifth full-viewport mode.** All four existing toggles now dismiss
   `tennis-mode`. Written out in each rather than folded into a shared helper —
   that would be a rewrite of four working functions in a commit about tennis
   (Rule 69).
4. **Anomalies on the page.** The WC bracket has nothing to declare; a tennis
   draw does.

## The two defects the probe found, and why smoke could not

**Fifteen A-TDRAW smoke rows pass on both bugs below and always would have.**
Every one of them is a claim about the file, and in both cases the file was
internally consistent. Only the browser, comparing what the relay assembled
against what the page drew, could see them.

### 1. Seven matches missing, and the page looked complete

```
the relay shipped 120 main-draw matches;
the page drew 113 tree card(s) and 120 list row(s)
```

US Open Men 2026 is in progress, so the relay ships four rounds — 64/32/16/8 —
with Round of 16 last. The renderer took `rounds[length-1]` as the final and
drew it as a single centre card. One of eight appeared. `120 - 8 + 1 = 113`,
exactly.

The list beside it had all 120 — but the list is only visible below 1180px,
where the tree is not. Two views of the same draw disagreeing by seven matches,
with no way for a reader to see it.

### 2. A variable name printed to the reader

`cancelledRowsExcluded: 2`. Four anomaly kinds, two cases, and the
fall-through renders the key. It was also the commonest kind — it fires on
every slam edition where a player withdrew.

## Probe runs, in order

| run | verdict | what it said |
|---|---|---|
| 1 | FAIL | `the relay would not assemble 135 US Open, Men: HTTP 409` |
| 2 | FAIL | `shipped 120; the page drew 113 tree card(s) and 120 list row(s)` |
| 3 | **PASS** | `120 matches drawn in 4 round(s), 112 edge(s) joined` |

Run 1 caught a live production 409 in the relay end-to-end, on its first
execution, before the relay fix had deployed. Run 2 caught the centre-column
bug. Run 3 is green with `treeMatchCards: 120`, `listMatchRows: 120`,
`columnHeads: [R128,R64,R32,R16,R16,R32,R64,R128]`.

`120` is the dispositive number: the buggy code produces `113` and cannot
produce `120`.

## Mutation-proved rows (Rule 90)

Five of the fifteen, each mutation asserting its own anchor is unique before
applying — a `NOT CAUGHT` with no mutation applied is worse than no test.

| row | mutation | result |
|---|---|---|
| A-TDRAW-2 | `const cols = 4` | CAUGHT |
| A-TDRAW-3 | escape helper renamed | CAUGHT |
| A-TDRAW-5 | `#` dropped from the ranking | CAUGHT |
| A-TDRAW-6 | doubles guard short-circuited | CAUGHT |
| A-TDRAW-13 | `rounds[length-1]` restored (the real bug) | CAUGHT |
| A-TDRAW-15 | anomaly kind renamed | CAUGHT |

## Automated follow-ups

- `tennis-draw-probe.yml` — Playwright against the live URL, 15:20 and 00:20
  UTC, path-triggered, dispatchable. FAIL is red; NO DRAW and UNKNOWN exit 0.
- Relay `verify-tennis-draw.yml` — daily 06:40 UTC, 30 assertions, three
  editions.
- field-laboratory `capture-tennis-draw.yml` — dispatch-only fixture capture.

## Carry-forwards

None from this work. Open from the earlier session and unchanged: GameDO (19)
and BracketDO (12) CORS responses budgeted rather than fixed; three unprobed
`/bsd` routes; the dead Italian Open window at `field.js:8900`.
