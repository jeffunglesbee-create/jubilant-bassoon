# CC-CMD-2026-08-12-scouting-coverage-gaps — Result

## Status: DONE. Both gaps closed and verified live. **Confidence: 95.**

Supersedes this document's earlier STOPPED revision (confidence 62), which
was correct to stop: its headline number was produced by an instrument that
could not support it.

Branch `main` throughout.

| commit | what |
|---|---|
| `2c6e2437` | answer from decision inputs, not the DOM; exact-label detector |
| `b7ff0c42` | park abbreviation aliases |
| `503ae469`, `49058902`, `3bbeec0f` | standings probes |
| `4acbdc7d` | standings abbreviation key |
| `e5f74464` | `hydrate=team` — the load-bearing fix |

## Done condition — live, `swVersion 2026-08-12f`

```
todayGameCount:    16      (15 MLB + 1 WNBA)
parkRowPresent:    15      parkRowMissing:    1
recordsRowPresent: 15      recordsRowMissing: 1
```

Both "missing" are the same row: **Atlanta Dream @ Connecticut Sun**, a WNBA
game. `buildScoutingReport`'s MLB branch does not run for it, so no Park row
is correct behaviour rather than a gap, and MLB standings do not contain it.

**All 15 MLB games now render both rows.** Before: `parkRowMissing` 3 real
(ATH/AZ/CWS), `recordsRowMissing` 1.

## The novel move: stop measuring the output

The earlier attempt reported `parkRowMissing: 7` and I could not defend it —
four of the seven named teams had keys demonstrably in `PARK_FACTORS`. The
obvious next step was to fix the detector regex and re-measure. That is
iteration on a broken instrument.

The insight is that **the DOM was never the right instrument**. The Park row
is pushed on exactly one condition:

```js
const abbr = game._homeAbbr || game.homeTeam;
if (getParkFactor(abbr)) rows.push({ lbl: 'Park', ... })
```

and `getParkFactor` is a pure lookup. So the boolean the probe was trying to
infer from pixels is a **set-membership test between two obtainable
inputs**: the `PARK_FACTORS` keys (parsed from the checked-out source, so it
cannot drift from what ships) and `team.abbreviation` from the same API call
the app makes.

`outbox/park-abbr-resolution-manifest-*.json`:

```
gameCount 15 · resolves 12 · doesNotResolve 3
unresolvedAbbrs:      ["ATH", "AZ", "CWS"]
tableKeysUnusedToday:  [... "ARI" ... "CHW" ... "OAK" ...]
```

Exact, enumerated, no browser. And the unused-keys list is the smoking gun:
the factors were never missing, they were **filed under the other name**.

Each alias target was checked before mapping to it, because pointing at a
stale venue would be worse than showing nothing: `OAK` is already labelled
**"Sutter Health Park"**, the Athletics' current home. Had it still said
Oakland Coliseum, the correct answer would have been to leave the row absent.

The corrected DOM detector — exact match on the `.bs-scout-lbl` element the
renderer emits, rather than a substring of prose — then confirmed 15/15
independently. Two instruments, opposite ends, same answer.

## Gap 2 took three attempts, and the first two were mine

Same method applied to the records line gave the failing side immediately —
something the DOM cannot show, because `if (hT && aT)` means one miss
suppresses *both* teams' records:

```
Colorado Rockies @ Arizona Diamondbacks
  homeSlug "diamondbacks"  matched: false
  awaySlug "rockies"       matched: true
standings names include:  "D-backs"
```

MLB's `/standings` returns `team.name` as **"D-backs"** while its own
`/schedule` returns "Arizona Diamondbacks". `includes('diamondbacks')` cannot
hit.

**Attempt 1 (`4acbdc7d`) shipped and did nothing.** I added abbreviation as a
second match key and wrote in the comment that it "cannot drift" because both
sides read the same API field — an assumption asserted *immediately after
catching this same API disagreeing with itself on `team.name`*. The DOM still
showed the game missing.

**Attempt 2 measured what I should have measured first:**

```
abbrevAvailability: { bare: 0, hydrated: 30, total: 30 }
```

`/standings` returns a **minimal team object** — id, name, link, no
abbreviation. So `abbrev` in `fetchMLBStandingsParsed` has been an empty
string for all 30 teams since it was written: a silent no-op for every
consumer, and the reason my second key could never fire.

**Attempt 3 (`e5f74464`) is the real fix:** `&hydrate=team`. It populates the
abbreviation *and* repairs `team.name`, so the original nickname predicate
resolves 15 of 15 on its own.

The pattern is worth naming because it repeated inside a single fix: I
measured one property of an API, then assumed a second property of the same
API rather than measuring it too. The set-intersection technique worked
perfectly both times I actually used it; both failures came from skipping it.

## Scope

`getParkFactor` gained an alias map; the standings call gained a hydrate
param; the matcher gained a second key. No layout change, no new fetch, no
new table to maintain as clubs rebrand — which matters, since "Rate Field"
and the Athletics' relocation are both recent.

## Confidence gate

**95.** Every claim is a committed artifact: the source-parsed key list, the
per-game resolution table, the abbreviation-availability counts, old-vs-new
predicate evaluation on real data, and a live DOM manifest at
`swVersion 2026-08-12f` showing 15/15 on both rows with an exact-label
detector.

Not higher because attempt 1 shipped an inert change to production on an
assumption I had just been given every reason to doubt. It was caught by the
next verification rather than by review, and a less thorough post-check would
have left a no-op in the matcher looking like a fix.

## Residual

**`gamesWithArsenal: 0` of 15**, unchanged throughout. `getPitchArsenal`
reads the static `PITCHER_ARSENAL` table, which has no entry for any current
starter. Same shape as the park question — a static table against a live
slate — and it should be settled the same way: intersect the table's keys
with the day's actual `lastNameOf(pitcher)` values before deciding whether it
is a coverage gap or a key-shape mismatch. Not started; no code was written
for it.

The WNBA row missing Park/records is correct behaviour, not a gap. Whether
WNBA standings should populate the records line is a separate question this
spec did not ask.
