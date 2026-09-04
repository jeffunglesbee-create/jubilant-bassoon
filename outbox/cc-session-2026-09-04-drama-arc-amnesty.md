# CC session — bottom-sheet Drama Arc amnesty gate

**Date:** 2026-09-04
**Repo:** jubilant-bassoon
**Branch:** main (confirmed via `git branch --show-current`)
**CC-CMD:** `docs/CC-CMD-2026-09-04-bottom-sheet-drama-arc-amnesty.md`

## HEAD progression

| commit | what |
|---|---|
| `43a13586` | baseline at investigation |
| `1ac58324` | docs: the CC-CMD itself |
| `4f1255bd` | fix: port the current `UMPIRE_ABS_RATINGS` block from index.html into field.js |
| `a985d031` | fix: gate the Drama Arc sparkline to the amnesty zone |
| `9a9c62bb` | ci: the Playwright probe (script + workflow + trigger + .assetsignore) |
| `9b8addca` | docs: ADR-002 entry + amendment to the July 16 doc |
| `259fa5a1` | ci: fix the probe's manifest commit step, re-trigger |

## Smoke and units

| | before | after |
|---|---|---|
| `node smoke.js index.html` | 985 passed, 1 failed (986) | 988 passed, **0 failed** |
| `node field_unit.js` | 66 passed, 0 failed | 67 passed, **0 failed** |

The pre-existing failure was **A515 — SW_VERSION date matches today (ET)**;
`sw.js` carried `2026-08-27a`. Resolved by the bump to `2026-09-04a` in both
`sw.js` and `field.js` (index.html via sync).

New assertions: **A74b** (section gated on `_bsIsFinal`), **A74c** (the
predicate body pinned verbatim in index.html).

## TASK 1 — probe output

```
$ grep -n "buildDramaSparklineSVG" src/legacy/field.js
40203:  const sparkline = buildDramaSparklineSVG(gameId, 200, 32) || '';
40421:function buildDramaSparklineSVG(gameId, w=140, h=28) {
40683:    const sparkSVG = buildDramaSparklineSVG(topGame.id||topGame._id||'', 220, 32);

$ grep -n "_bsIsFinal" src/legacy/field.js
40211:  const _bsIsFinal = eData?.state === 'post';
40213:  if (_bsIsFinal) {
40231:    ${(_bsIsFinal && _bsPostgameDrama) ? … Game Summary …
40232:    ${(!_bsIsFinal && dramaLabel_bs) ? … Live Intelligence …
40233:    ${sparkline ? `<div class="bs-section">…Drama Arc…${sparkline}${_bsIsFinal?( … ):''}</div>` : ''}
```

Line 40233 is the finding: `_bsIsFinal` gated the arc *description*; the SVG
sat outside it.

### TASK 1a — the amnesty predicate's second value

Prediction written into the CC-CMD before running: **0 producers, 9 consumers.**

```
$ grep -cE "state\s*[:=]\s*['\"]final['\"]" src/legacy/field.js
0
$ grep -cE "state\s*===\s*['\"]final['\"]" src/legacy/field.js
9
```

Prediction held. Accepting both `'post'` and `'final'` is a no-op against this
repo's own data and correct if a producer ever appears. No behaviour change to
Game Summary or Live Intelligence.

### TASK 1b — Night Owl's call site (`field.js:40683`)

Both paths are finals-only. Quoted, as the CC-CMD required an artifact rather
than an assertion:

- **Fallback path**, inside `renderNightOwlRecap`:
  `if(!eData || eData.state!=='post') continue;`
- **Primary path**: `loadTonightFinals()` reads `field_tonight_finals_<date>`,
  written only by `saveEspnFinal`, whose DOM caller iterates
  `main.querySelectorAll('.game-card.espn-final')` and synthesises
  `state: 'post'`.

`field.js:40683` left untouched.

## What changed

- **`field_utils.js`** — `isAmnestyState(state)`, pure, exported. Returns true
  only for `'post'` or `'final'`. Case-sensitive by design.
- **`src/legacy/field.js`** — the same function duplicated verbatim (smoke A191
  requires a definition in index.html; `teamNick`, `dramaTier`, `wxBadge`,
  `shiftTime` follow the same convention). `_bsIsFinal` derives from it. The
  whole Drama Arc section moved behind `(_bsIsFinal && sparkline)`; the inner
  ternary, now vacuous, removed.
- **`field_unit.js`** — 8 enumerated pairs.
- **`smoke.js`** — A74b, A74c.
- **`sw.js`** + index.html — SW_VERSION `2026-09-04a`.

## Verification

### Unit pairs (TASK 4a)

| input | expected | result |
|---|---|---|
| `'post'` | true | pass |
| `'final'` | true | pass |
| `'in'` | false | pass |
| `'pre'` | false | pass |
| `undefined` | false | pass |
| `null` | false | pass |
| `''` | false | pass |
| `'POST'` | false | pass |

**Mutation-proved, with an applied-assertion.** Replacing the body with
`String(state).toLowerCase() === 'post' || state === 'final'`, after asserting
the file actually changed (`grep -q "toLowerCase() === 'post'"` → MUTATION
APPLIED), produced:

```
❌ isAmnestyState: enumerated state -> amnesty pairs — isAmnestyState("POST") should be false
── Results: 66 passed, 1 failed ─────────────
```

Restored, back to 67/0. The `'POST'` row is doing work; the block is not
satisfiable by a predicate that merely handles the values it already sees.

### Playwright probe (TASK 4b)

`drama_arc_amnesty_probe.js` + `.github/workflows/drama-arc-amnesty-probe.yml`,
modelled on `ambient-skeleton-probe.yml`.

It does not wait for a live game. It drives `window._plVerify` — the existing
`?pl-verify` hook, which is the only supported way in because `allData` and
`espnScores` are module-level, not globals — pushes a synthetic game, seeds six
drama samples peaking at 88 into `localStorage`, and opens the sheet twice:
`state:'in'`, then `state:'post'`.

**Run 1 (`33893391493`) is the negative control.** It raced the deploy and ran
against the pre-deploy site:

```json
{ "testApiReady": true,
  "liveSparklinePresent": true,  "postSparklinePresent": true,
  "livePeakTextPresent": true,   "postPeakTextPresent": true,
  "liveSheetRendered": true,     "postSheetRendered": true,
  "liveBsContentChildCount": 8,  "postBsContentChildCount": 8 }
```
```
FAIL:
  - live case: sparkline PRESENT — the amnesty gate is not holding
  - live case: peak number rendered as text
```

That is the violation, reproduced in a real browser against production, and it
proves the probe mounts the sheet (8 children) and detects the ungated case.
The pass condition is not vacuous.

**Run 2 (`33893527177`) — conclusion: success.** Manifest committed to
`outbox/drama-arc-amnesty-manifest-33893527177.json` by commit `2d48ad12`:

```json
{ "url": "https://jubilant-bassoon.jeffunglesbee.workers.dev?pl-verify",
  "commit": "259fa5a1b720e8526ad6399c3be587f797ac59ed",
  "historySamples": 6, "peakSeeded": 88, "testApiReady": true,
  "liveSparklinePresent": false, "postSparklinePresent": true,
  "livePeakTextPresent": false,  "postPeakTextPresent": true,
  "liveSheetRendered": true,     "postSheetRendered": true,
  "liveBsContentChildCount": 7,  "postBsContentChildCount": 8 }
```

**Done condition met.** The child counts are the tightest confirmation
available: run 1's live case had 8, run 2's live case has 7, and the post case
still has 8. One section — the Drama Arc — is what moved.

**Honest residual:** `screenshot` is `null` in both runs; the `#bs-content`
locator screenshot did not land, so that path is untested. The pass condition
never depended on it — the manifest booleans are the artifact — but no image
exists and this doc does not claim one.

**Console errors in the manifest are pre-existing** — direct ESPN scoreboard
fetches blocked by CORS, present on the live site independent of this change.
Not investigated here (out of scope, Rule 69); recorded so a future reader does
not mistake them for fallout.

**Defect found in run 1 and fixed:** `git add a b` aborts entirely when either
glob matches nothing, so the manifest was never committed. Split into one `git
add` per pattern (`259fa5a1`).

## Standing defect found but not fixed here (out of scope, Rule 69)

Whatever refreshes `UMPIRE_ABS_RATINGS` writes **index.html only**. field.js
carried a 53-line copy while index.html carried 78 lines with different values,
so any `sync-source.mjs` run silently reverted the fresher data. Found by
reading a sync diff that removed 76 umpire rows I had not touched. Ported
forward in `4f1255bd`; the generator still needs pointing at
`src/legacy/field.js`.

## Doc amendments

- `docs/ADR-002-CONTEXT.md` — new "Real Violation Found and Fixed (2026-09-04)"
  section. Third instance of this construct after the two of 2026-07-02.
- `docs/CC-CMD-2026-07-16-amnesty-bottom-sheet.md` — amendment recording that
  its "for finished games specifically" claim did not hold at `43a13586`, with
  the `git log -S` evidence that no commit ever removed a gate. A Rule 72 case:
  the claim was inherited by `CC-CMD-2026-07-19-bottom-sheet-stats-reconciliation.md`
  and never re-verified.

## Carry-forwards

None from this CC-CMD. The uPlot work (tasks #21–#24) was already specified as
separate CC-CMDs before this one opened and is unblocked by its close.
