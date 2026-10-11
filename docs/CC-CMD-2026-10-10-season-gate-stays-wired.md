# CC-CMD 2026-10-10 — the coverage season gate has no guard that it stays wired

**Status:** FILED, not started.
**Repo:** jubilant-bassoon (client). The relay side shipped and is verified —
`/bsd/coverage` answers 200 from the deployed worker with
`X-Coverage-State: vendor`, and `scripts/check-coverage-states.mjs` guards the
route. Nothing guards the consumer.
**Branch:** main — commit directly, do not create a feature branch or PR
**Type:** B (gap) — a working mechanism with no defence

## Why this exists

`CC-CMD-2026-10-10-coverage-replaces-season-date-math.md` landed today. The
client now reads BSD's season state instead of trusting date arithmetic:

```
src/legacy/field.js:15434  function _euSeasonActive()            the fallback, kept
            :15446  window.FIELD_SEASON_STATE = { source: 'date-fallback', … }
            :15455  const _EU_CLUB_KEYS = ['epl','eflchamp','eflone','efltwo',
                                           'laliga','seriea','bundesliga','ligue1']
            :15464  async function refreshEuSeasonFromCoverage()
            :15489  for (const k of _EU_CLUB_KEYS) FIELD_V2_SOURCES[k] = active
            :15512  epl: _euSeasonActive(),   ← the table initialises from the fallback
            :15536  refreshEuSeasonFromCoverage();            ← the only call
```

Verified by reading the file, because `read_source` cannot see it — that tool
returns 35 hits for `FIELD_V2_SOURCES` across this repo and **not one in
`src/legacy/field.js`**, where the table lives. Same for `_euSeasonActive` and
`yardsToEndzone`. The client's main source file is not indexed, silently, so
every claim here came from a pulled tarball.

**The whole mechanism hangs on line 15536.** Delete it, comment it out, or move
it behind a branch that does not run, and the eight competitions silently revert
to date arithmetic — with `window.FIELD_SEASON_STATE.source` reading
`'date-fallback'`, which is also what it correctly reads for the first few
hundred milliseconds of every page load. **A permanent regression and a normal
startup are the same string.**

This repository has the exact precedent, and it cost two attempts on one
feature in one session. `scripts/check-render-reaches-dom.mjs`'s own header:

> `327678bc` wired the odds line into `updateCard` — 0 callers, marked STAGED
> `d207c191` re-wired it into `renderCard` — 2 callers, both inside
> `buildNightOwlStatic`
>
> Both times six structural assertions were GREEN, because they check that text
> exists in the artifact and the text did exist. Neither run ever happened.

## Task 1 — extend the existing guard, or write a sibling, and decide by reading

`check-render-reaches-dom.mjs` already walks callers to a root, and its
`ROOT_PATTERNS` includes `/\b%NAME%\(\)\s*;?\s*$/m` — which is exactly the shape
of line 15536. So the machinery to check this exists.

But its `TARGETS` entries are render-shaped: `symbol`, `container`, `chain`, and
a layer asserted in `src/debrief/index.ts`. `refreshEuSeasonFromCoverage`
renders nothing — it mutates a data table before any render — so `container`
and the `.ts` layer have no meaning for it.

**Read the script and decide:** add a `TARGETS` entry if the optional fields can
be absent without weakening the walk, or write `check-season-gate-wired.mjs`
reusing its exported `callersOf` and `ROOT_PATTERNS`. **Do not add fields that
mean nothing** to make the entry fit. That file's own warning applies: "a linter
guessing which functions are 'render' functions would be a worse version of the
same guess this exists to replace."

Whichever shape, print the coverage statement where the result is read, as that
script does — a green here is a statement about one gate, not about the app.

## Task 2 — the silent-revert path nobody would notice

`_EU_CLUB_KEYS` is a hand-written list of eight strings. `FIELD_V2_SOURCES` is
a separate object literal with those same eight keys. **Nothing ties them.**

Rename `eflchamp` in the table and the loop writes a key no consumer reads: that
competition keeps the date arithmetic forever, the coverage call still succeeds,
`FIELD_SEASON_STATE` still reads `'vendor'`, and every check stays green. That
is the pairing-read-as-tamper-evident defect `docs/history-boundary.txt` records
in the laboratory — two values in two places that must agree and nothing
asserting it.

**Assert `_EU_CLUB_KEYS` ⊆ `Object.keys(FIELD_V2_SOURCES)`.** Parse both out of
the source; do not import `field.js`, which has top-level side effects —
including, now, a `fetch`.

## Task 3 — mutate it (Rule 90)

Three mutations, each applied to a copy and reverted:

1. comment out line 15536 → the Task 1 check must FAIL
2. rename one entry of `_EU_CLUB_KEYS` → the Task 2 check must FAIL
3. move the call inside `if (false) { … }` → the Task 1 check must FAIL

Mutation 3 is the one that decides whether the check has teeth or is a grep. A
caller inside dead code satisfies "has a caller" perfectly.

## Task 4 — the runtime half, with the third state reported rather than failed

Playwright is already a dependency here. On the rendered page, after the slate
settles:

- `window.FIELD_SEASON_STATE.source` must be one of exactly four values:
  `date-fallback`, `vendor`, `vendor-unpriced`, `coverage-failed`. A fifth
  value, or `undefined`, is a failure.
- It must **not** still be `date-fallback`. That is the regression this document
  exists for, and the only way to tell it from a normal startup is to wait.
- `coverage-failed` is **reported, not failed** — the relay or the vendor being
  unreachable says nothing about whether the client is wired, and a check that
  reddens on someone else's outage gets ignored. Report it as NOT OBSERVABLE,
  the three-state pattern this project already uses in `live-check`.
- When `source` is `vendor` or `vendor-unpriced`, assert the eight keys of
  `FIELD_V2_SOURCES` equal the vendor's `in_season` boolean. That closes
  Task 2's gap at runtime as well as statically.

Name the settle condition explicitly — a fixed `waitForTimeout` would make this
flaky the moment the relay is slow. Wait for `FIELD_SEASON_STATE.at` to become
non-null, with a bounded timeout, and treat the timeout as NOT OBSERVABLE.

## Stop conditions

- Do not import `src/legacy/field.js` in a check. It runs a `fetch` at module
  scope now. Parse the source as text, as `check-render-reaches-dom.mjs` does.
- Do not delete `_euSeasonActive()` or weaken the fallback. Eight competitions
  were dark for a month because a gate had no second answer.
- If mutation 3 survives, STOP and report. A check that cannot tell live code
  from dead code is the thing this document is replacing, in a new costume.

## Done conditions

1. A check fails when line 15536 is removed, commented, or made unreachable.
2. A check fails when `_EU_CLUB_KEYS` and `FIELD_V2_SOURCES` stop agreeing.
3. All three mutations are caught, and the mutators are committed so they can be
   re-run.
4. A live run asserts `FIELD_SEASON_STATE.source` is one of four, is not
   `date-fallback` after settle, and reports `coverage-failed` as NOT
   OBSERVABLE rather than red.
5. The coverage statement names what this guards and what it does not.
