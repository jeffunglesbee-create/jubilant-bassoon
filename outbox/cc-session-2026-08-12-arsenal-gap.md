# Arsenal gap (residual of CC-CMD-2026-08-12-scouting-coverage-gaps) — Result

## Status: DONE. Root cause was in the relay, not the client. **Confidence: 96.**

Branch `main` in both repos. No client code changed.

| repo | commit | what |
|---|---|---|
| jubilant-bassoon | `de904d56`, `eb30fd47` | probe (cause separation, then layer attribution) |
| field-relay-nba | `7588b24` | writer: refuse to overwrite R2 with an empty payload |
| field-relay-nba | `112c8f7` | reader: an empty R2 object is not a cache hit |

## Done condition

`outbox/stats-tab-scouting-manifest-*.json`, live at `swVersion 2026-08-12f`:

```
gamesWithArsenal:  0  →  14      (of 15 MLB games)
```

Rendered rows:

```
BrewersDustin May · 4.13 ERA · 6-7 · Slow tempo · Sweeper 31% whiff
PadresRobbie Ray · 3.28 ERA · 10-7 · Slow tempo · Slider 34% whiff
TigersFramber Valdez · 4.17 ERA · 7-7 · Slow tempo · Curveball 32% whiff
```

14 rather than 15 is correct, not a shortfall: Savant's arsenal leaderboard
is fetched with `min=100` pitches, so a starter below that threshold has no
entry and the segment is omitted. A blank there is honest; inventing a
whiff rate would be a Rule 1 violation.

## The lead was a pairing, not a symptom

`gamesWithArsenal: 0` next to `gamesWithTempo: 15`. Both getters key
identically —
`PITCHER_ARSENAL[_mlbPlayerKey(lastNameOf(p))]` vs the same for
`PITCHER_TEMPO` — and both tables are patched by the same loop in
`mlbStatsInit` from the same endpoint shape. So key derivation was already
**proven good by tempo**, and the fault had to be downstream of the key.

That let the probe target three candidates instead of hunting: file doesn't
load / loads but keyed differently / loads and keys match but fails the
render gate (`pitches.length`, `whiffRate != null`).

Answer, first run:

```
pitch_tempo:    status 200, 341 entries, 27/30 key hits
pitch_arsenals: status 200,   0 entries
```

None of the three. The file **loads fine and is empty**.

## Attributing it to a layer, which changed the repo

An empty file could mean the producer is broken. The committed
`outbox/mlb/pitch_arsenals.json` had **194 entries**, updated
`20260810T113826Z` — the same timestamp as tempo's 341. The producer works.

Reading the relay's route showed why that didn't help: `/mlb-stats/*.json`
is **R2-first**, falling back to the jubilant-bassoon raw file only on a
miss — and the miss test was `if (r2obj)`, existence alone.

Second probe run, capturing `X-Source` and fetching the fallback directly:

```
relay  pitch_arsenals: X-Source r2,  0 entries
relay  pitch_tempo:    X-Source r2, 341 entries
github pitch_arsenals: 194 entries  (updated 20260810T113826Z)
```

An empty R2 object is a **hit**. The good data was sitting one fallback away
and was unreachable.

Recording that header is what made this attributable rather than
speculative: "the relay serves 0 entries" is compatible with a broken
producer, a broken pipeline, and a poisoned cache, and those are three
different fixes in two different repos.

## Root cause and the two fixes

`runMLBSavantUpdate` (`src/mlb-savant-r2.js`) computed `count`, then `put()`
**unconditionally**, and reported `ok: true` even at zero. A parse returning
nothing silently replaced a populated table with an empty one — and then the
read path preserved it forever.

A zero-row Savant parse is a *failure*, not a legitimate empty result: these
leaderboards are never empty mid-season. Treating it as one is what turned a
transient fetch problem into a permanent one. Savant blocking Cloudflare
Worker IPs is documented in this repo for the umpire scrape and is the
likeliest trigger.

1. **Writer** — refuse to write when `count === 0`, and report it as a
   failure. Stops new poisoning.
2. **Reader** — treat zero rows (or an unparseable body) as a miss.
   Necessary because fix 1 cannot un-poison an object already in the bucket,
   and it makes the endpoint self-heal rather than requiring a manual R2
   delete for which no route exists.

Fix 2 is deliberately **not** a Rule 64 band-aid: read and write are both
this relay honouring one contract, and the correct miss predicate is "no
usable data", not "no object". Two levels (R2 → GitHub), within Rule 76.

## Scope

No client change — `getPitchArsenal`, `PITCHER_ARSENAL` and
`buildScoutingReport` are untouched and were never at fault. The three
static stubs in the table (`cole`, `ohtani`, `webb`) were left alone.

## Confidence gate

**96.** Every step is a committed artifact: the tempo/arsenal pairing that
localised the fault, entry counts for both tables, the `X-Source` header
distinguishing R2 from fallback, the producer's 194-entry file with its
timestamp, and a live DOM manifest showing 0 → 14 with real whiff values.

Not higher because the underlying *why* is inferred rather than proven: I
have not confirmed that Savant blocks the Worker's egress. The evidence is
circumstantial but consistent — the same fetch succeeds from GitHub Actions,
and this repo documents that exact block for a sibling scrape. Both fixes
are correct regardless of which upstream failure produced the empty parse,
which is why they did not wait on that answer.

## Residual

The R2 object is still empty; the endpoint now routes around it and will
correct itself on the first Monday cron that parses non-zero rows. If Savant
does block Worker egress, that write will keep failing — visibly now, as
`ok:false` in the update result, rather than silently as a wipe. Worth a
look at the next Monday run's log; not deferred work, since the serving path
is already correct either way.
