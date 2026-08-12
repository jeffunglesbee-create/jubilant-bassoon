# CC-CMD-2026-08-12-mlb-pitcher-payload-audit — Result

## Status: DONE. Both findings resolved, verified on the live deployment. **Confidence: 96.**

Branch `main` throughout. Deploys `31631566230` and the SW_VERSION
`2026-08-12c` run, both green.

| commit | what |
|---|---|
| `326fc5e8` | probes (source + DOM) |
| `1ed13fcd` | hydrate-variant probe |
| `571647ad`, `4531bd64` | `/people` + bulk probes |
| `288db1d8` | the fix |
| `fcb48871` | ERA precision |

## Done condition

`outbox/stats-tab-scouting-manifest-*.json`, before and after:

| counter | before | after |
|---|---|---|
| `gamesWithEra` | **0** | **15** |
| `gamesWithRecord` | **0** | **15** |
| `todayGameCount` | 15 | 15 |
| `swVersion` | `2026-08-12a` | `2026-08-12c` |

Rendered rows, quoted from the final manifest:

```
PhilliesZack Wheeler · 2.60 ERA · 10-3 · Slow tempo
RaysDrew Rasmussen · 2.73 ERA · 11-5 · Slow tempo
AthleticsJack Perkins · 7.04 ERA · 2-8 · Slow tempo
```

## Finding 1 — the cause was not what the spec hypothesised

The spec's lead suspect was the `type.displayName === 'season'` literal in
`normalizeMLBPitcher`. It was innocent.

`outbox/mlb-pitcher-source-manifest-*.json`:

```
pitcherRecords: 30 · seasonSplitFound: 0 · eraPresent: 0
allStatTypeDisplayNames: []
```

The `stats` array is **empty**, not mislabelled. So the predicate never had
anything to match and every ERA/W-L was null by construction.

`outbox/mlb-hydrate-variant-manifest-*.json` then measured six hydrate
forms, production's own first as a control:

```
no  rec=30 stats=0 era=0  broadcasts(all),team,linescore,probablePitcher(stats),officials
no  rec=30 stats=0 era=0  probablePitcher(stats)
no  rec=30 stats=0 era=0  probablePitcher(stats(type=season,season=2026))
no  rec=30 stats=0 era=0  probablePitcher(note,stats)
no  rec=30 stats=0 era=0  probablePitcher(person(stats(type=season,season=2026,group=pitching)))
no  rec=30 stats=0 era=0  probablePitcher(stats(group=pitching,type=season,season=2026))
working variants: []
```

The schedule endpoint does not serve these at all. That ruled out a
one-string fix and made the real question "does any endpoint serve them" —
answered before writing a spec that assumed one did.

## The fix I nearly shipped was wrong, and smoke caught it

Having proved `/people/{id}/stats` works and that the bulk
`/people?personIds=` form returns the whole slate in one request (30
requested, 30 returned, 29 with ERA, URL 312 chars), I wrote a bulk fetcher
into `fetchMLBSchedule` with a module cache.

It failed `node --check` on the synced `index.html`:

```
SyntaxError: Identifier '_mlbPitcherStatsCache' has already been declared
```

**That name was already taken because the feature already existed.**
`mlbPitcherStatsInit()` (`src/legacy/field.js:~4117`) already fetches
per-pitcher season stats from the exact `/people/{id}/stats` route my probe
had just "discovered", caches them, and exposes them via
`getMLBProbablePitchers()`. `buildScoutingReport` simply was never wired to
it.

So I had spent three probes establishing something the codebase already
knew, and was about to commit a second fetch path that would have doubled
the API calls — precisely the Rule 78 shape I had been careful about in the
bulk probe. A single `grep -n "PitcherStats" src/legacy/field.js` before
writing would have found it. Rule 62 says grep before writing new code; I
greped the *formatter* and the *API*, and never the codebase for an
existing consumer.

The collision was luck. It surfaced as a smoke drop 965 → 963 rather than
as a silently duplicated fetch, only because the previous author happened to
choose the same identifier.

**The shipped fix reads the existing cache.** `wins`/`losses` were added to
that loader's captured fields — they were already in its response and
simply not read — with `?? null` rather than the neighbouring `|| null`,
because a pitcher with 0 wins has a real record that `0 || null` erases.

## Finding 2 — the suspected pitcher/team swap was not a bug

`outbox/mlb-pitcher-source-manifest-*.json` gives the API's own
`teams.home`/`teams.away` probables for all 15 games. Every one matches
what rendered. The six cross-checkable against the original screenshot:

| matchup | API away | API home | rendered |
|---|---|---|---|
| Orioles @ Twins | Shane Baz | Zebby Matthews | ORIOLES Baz / TWINS Matthews ✓ |
| Phillies @ Cardinals | Zack Wheeler | Kyle Leahy | ✓ |
| Rays @ Athletics | Drew Rasmussen | Jack Perkins | ✓ |
| Rockies @ Diamondbacks | Ryan Feltner | Merrill Kelly | ✓ |
| Astros @ Giants | Bryan King | Adrian Houser | ✓ |
| Brewers @ Padres | Dustin May | Robbie Ray | ✓ |

**Closed.** Shane Baz is the Orioles' probable and Dustin May the Brewers'
per MLB's own data. My suspicion was wrong, and it is recorded as settled
so it does not propagate to a future session as an open concern — Rule 72
cuts both ways.

This is why it was flagged as a question rather than a claim. Had it been
written up as a suspected bug, someone would have spent a session
"fixing" correct code.

## A second thing the probe caught that the counters would have hidden

The first post-fix run reported `gamesWithEra: 0 → 15` — success by every
counter. Reading the actual `rowTexts` showed:

```
OriolesShane Baz · 4 ERA · 4-11
CardinalsKyle Leahy · 3.4 ERA · 8-4
```

"4 ERA", "3.4 ERA". The two sources disagree on shape — the schedule
payload carries `"4.00"` as a string, the cache stores
`parseFloat("4.00") === 4` — so displayed precision depended on which
source answered. Fixed with `toFixed(2)`; the final manifest reads
`4.00 ERA`, `2.60 ERA`, `3.38 ERA`.

A counter-only check would have passed. The artifact has to include the
rendered value, not just a count of them.

## Scope held

`normalizeMLBPitcher` untouched — it is not broken. No second fetch path.
No placeholder ERA for the one pitcher with no season line; that value
stays null and the segment is omitted.

## Confidence gate

**96.** Every claim rests on a committed artifact: the empty-stats
measurement, six hydrate variants with production's own as a control, three
working `/people` routes plus the bulk form, a 15-game pairing table, and
before/after DOM manifests with the rendered strings quoted.

Not higher because of how close the duplicate-loader mistake came to
shipping. It was caught by a name collision, not by my process, and a
different identifier would have put a redundant fetch path into production
with all three probes still reading green.

## Residual

One genuine gap, measured and not fixed: **`gamesWithArsenal: 0` of 15**,
unchanged by this work. `getPitchArsenal` reads the static
`PITCHER_ARSENAL` table, which evidently has no entry for any of tonight's
starters. That is a table-coverage question with the same shape as the park
factors, and it is recorded in
`outbox/cc-session-2026-08-12-scouting-coverage-gaps.md` rather than
carried here.

`gamesWithTempo` was **15 both before and after** the fix — tempo was
always rendering. My reading of the original screenshot said otherwise and
was wrong.
