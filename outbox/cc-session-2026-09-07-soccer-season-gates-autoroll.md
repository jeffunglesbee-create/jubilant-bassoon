# Soccer season gates — auto-rolling helper — 2026-09-10

**CC-CMD:** `docs/CC-CMD-2026-09-07-soccer-season-gates-autoroll.md`
**Status:** Tasks 0–4 complete. **Task 3.3 found a second, separate defect** that
the CC-CMD's premise does not cover — a second CC-CMD is written, per Rule 87.4.

## Commits

```
092afb42  probe: EU season gate relay coverage, before touching any gate
cce6c6a8  fix: my matchday probe reported a live competition as unserved
ec6e3859  fix: eight European season gates auto-roll   ← the change
ed03ea02  probe: Task 3.3 live verification
6943ec67  fix: the live probe read a skeleton and blamed the gate
c6719312  fix: the probe compared an ET chip list against a UTC game count
```

Deploy: `deploy-gate` run 34425939325 for `ec6e3859` — **success**.

## TASK 0 — probe

| | |
|---|---|
| 0.1 | `src/legacy/field.js:15032`. All eight confirmed `false`. Stale "set true next season" comment two lines above. |
| 0.2 | **Yes**, `index.html` carries the duplicate — inside the script block `sync-source.mjs` owns. Edit went to `field.js`; sync propagated; both verified changed in one commit. |
| 0.3 | `_euSeasonActive` not present anywhere. |
| 0.4 | See table below. |

### 0.4 — relay coverage, all eight SERVED

`outbox/eu-season-gate-probe.log`. Every one answered on Saturday 2026-08-29:

| key | today | matchday | fixture proving it |
|---|---|---|---|
| epl | 200 n=0 | 200 n=4 | Liverpool 2-2 Nottingham Forest |
| laliga | 200 n=0 | 200 n=3 | Levante 5-2 Real Betis |
| seriea | 200 n=0 | 200 n=4 | Fiorentina 0-3 Frosinone |
| bundesliga | 200 n=0 | 200 n=6 | Union Berlin 3-3 Eintracht Frankfurt |
| ligue1 | 200 n=0 | 200 n=5 | Strasbourg 2-1 Lens |
| eflchamp | 200 n=0 | 200 n=11 | Derby County 0-3 Swansea City |
| eflone | 200 n=1 | 200 n=9 | Blackpool 4-0 Peterborough |
| efltwo | 200 n=0 | 200 n=12 | Barnet 2-2 Cheltenham Town |

**0 of 8 excluded.**

**My first run of this probe was wrong and said `efltwo` NOT SERVED.** Both dates
I probed — 2026-08-30 and the 2026-09-06 fallback — are **Sundays**. The top five
play Sunday; EFL League Two plays Saturday and Tuesday. I chose a date that
suited five of eight competitions and read the resulting zero as a property of
the relay. The expensive direction, too: NOT SERVED would have left a live
competition gated off, which is the outage this CC-CMD exists to end.

Fixed in the probe, not the conclusion: it sweeps a date list, prints every date
tried with its weekday beside any NOT SERVED, and asserts the swept set spans
both a Saturday and a Sunday — verified failing on the exact pair I first used.

## TASKS 1–2 — the helper and the eight keys

```js
function _euSeasonActive(){
  const m = new Date().getUTCMonth(); // 0=Jan
  return m >= 7 || m <= 5;            // Aug(7)..Dec, Jan..Jun(5)
}
```

Checked across all twelve months rather than assumed: true for every month except
**July**. Today (UTC month 8) → `true`.

All eight keys bound to it in `field.js`, synced to `index.html`, no `false`
surviving among the eight in either file. `ucl`/`europa`/`conference` and the
`wc26`/`nfl`/`cfb` date gates untouched, per scope.

SW_VERSION `2026-09-07a` → `2026-09-09a` (ET date) in both files.

## TASK 3 — verification

| check | result |
|---|---|
| 3.1 `node --check` on the extracted block | **CLEAN** |
| 3.2 smoke | **1037 passed, 0 failed** (re-run after a rebase) |
| 3.2 units | **69 passed, 0 failed** |
| 3.3 deployed bundle | all eight bound, none hardcoded false, `SW_VERSION 2026-09-09a` |
| 3.3 render | see the defect below |

**`node --check` ran on the wrong block the first time.** `index.html` has three
script blocks (0KB, 16KB, 2278KB) and a non-greedy `<script>…</script>` match
takes the first. It reported CLEAN having checked 16KB that contains none of this
change. Re-extracted by searching for the block that actually holds
`FIELD_V2_SOURCES`: 2278KB, `_euSeasonActive` ×10, CLEAN.

**The sync guard fired once, correctly**, on a state I created by syncing before a
second `field.js` edit — `index.html` then matched neither HEAD nor the source.
Resolved by restoring the derivative from HEAD and syncing once. Never bypassed.

### Task 3.3 evidence

`outbox/eu-season-gate-live-manifest-2026-09-10T01-45-43-705Z.json` and the
screenshot beside it. Live Playwright against
`https://jubilant-bassoon.jeffunglesbee.workers.dev`.

```json
"helperPresentInDeployedBundle": true,
"allEightBound": true,
"anyStillHardcodedFalse": false,
"deployedSwVersion": "2026-09-09a",
"etDate": "2026-09-09", "utcDate": "2026-09-10", "datesDiffer": true,
"relayGamesOnEtDate":  { "eflchamp": 3, ...rest 0 },
"relayGamesOnUtcDate": { "eflone": 1, ...rest 0 },
"chips": ["ALL (55)","FREE","MLB (15)","AFL (1)","Tennis (16)","Golf (1)",
          "College Football (6)","NFL (2)","MLS (14)"],
"chipBarSkeletonStillUp": false,
"europeanChipPresent": []
```

**Method used, and why:** the CC-CMD offers a browser check or, during an
international break, a relay-side alternative. Both were run. The gate half is
text-level and decisive because `build-bundle.mjs` sets `minify: false`, so
`_euSeasonActive` and each binding survive verbatim into production — that reads
the deployed state, not the repo state.

## THE DEFECT TASK 3.3 FOUND — the gate is necessary but NOT sufficient

**Three EFL Championship fixtures exist on the ET date the app is rendering
(2026-09-09 — the Championship plays midweek), the gate for `eflchamp` is open in
the deployed bundle, and no chip and no cards appear.** The chip counts sum
exactly to `ALL (55)`, so those three games are genuinely absent from the slate,
not merely unlabelled.

Root cause, read from source rather than inferred:

- `buildFilters(allData.sports)` builds chips from **sections**, not from
  `espnScores`.
- `injectV2SportSection(sportKey, sectionLabel)` is the only function that
  creates or merges a section into `allData.sports`.
- It is called for `cfb`, `nfl`, `wnba`, `mls` and `wc26`. **It is called for
  none of the eight European keys.**

So opening the gate puts these games into `espnScores` — which is what the poll
loop's `enabled` list does — and nothing then lifts them into a section.

**The CC-CMD's premise is half right.** It states "the gate is what blocks card
creation". The gate blocks it; opening the gate does not by itself unblock it.
That is a Rule 61 end-to-end gap: data → relay → client all work, and the DOM
step does not.

`SPORT_CHIP_LABELS` is NOT the blocker — it already carries "Premier League",
"La Liga", "Serie A", "Bundesliga", "Ligue 1". Its only EFL entries are
playoff-specific ("EFL Championship Playoffs"), which would cost a label, not a
chip.

**Not fixed here, deliberately.** Task 2 was scoped to replacing eight `false`
literals, and the CC-CMD names what is out of scope. Adding eight section
injections is a structural change needing its own impact analysis — the section
label has to agree with `SPORT_CHIP_LABELS` and must not collide with the
hardcoded soccer fixture tables, which is the exact Rule 60/64 collision class
this project has been bitten by before. Written up as a second CC-CMD instead,
per Rule 87.4: `docs/CC-CMD-2026-09-10-eu-sections-not-injected.md`.

## Three defects in my own probes, all the same shape

Every one produced a false signal pointing at the product rather than the
instrument:

| # | what it read | what it actually was |
|---|---|---|
| 1 | a proxy 403 as "a real HTTP status" from the relay | sandbox egress denial; all eight reported NOT SERVED |
| 2 | a Sunday as "a matchday" | `efltwo` reported unserved while playing a nine-game slate the day before |
| 3 | `.filter-chip-skeleton` as the chip bar | zero chips of any kind read as a European rendering failure |
| 4 | a UTC game count against an ET chip list | "no chip despite 1 game" against an app that was correct |

Each is fixed in the probe with a guard that fails on the case that fooled it.
The gate half of the manifest was decisive from the first run and never moved.

## Confidence

**96** on Tasks 0–3 as committed: the change is five lines, both files verified,
smoke and units green, relay coverage measured on a real matchday, and the
deployed bundle read directly rather than inferred.

**95** on the newly-found section defect: the three fixtures, the open gate, the
absent chip and the summing chip counts are all measured, and
`injectV2SportSection` being the sole section creator is read from source. The
deduction is that I have not proven no *other* path can create a soccer section —
`ucl`/`europa` have been `true` for months and I did not get to observe them with
fixtures on the slate.
