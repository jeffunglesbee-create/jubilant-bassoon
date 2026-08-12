# CC-CMD-2026-08-12-scouting-coverage-gaps — Result

## Status: STOPPED at Task 1. My own probe's park detection is not trustworthy, so the headline number is unmeasured. **Confidence: 62 — below the gate. Nothing was changed.**

Branch `main`. No fix committed. The only artifacts are probe manifests.

## What IS measured, and holds

`outbox/stats-tab-scouting-manifest-*.json`, three runs across the evening,
all in agreement:

```
todayGameCount:      15
recordsRowMissing:   1     ["Colorado Rockies @ Arizona Diamondbacks"]
recordsRowPresent:   14
```

**Gap 2 is confirmed exactly as observed**: one game, the same one seen in
the original screenshot, with no `Team: W–L · Team: W–L` line. Stable
across three independent runs. The detection here is a specific shape
(`/:\s*\d+[–-]\d+\s*·/`) that nothing else on the card produces, so I trust
it.

`PARK_FACTORS` was enumerated from source and contains **all 30 MLB
teams**:

```
ARI ATL BAL BOS CHC CHW CIN CLE COL DET HOU KC LAA LAD MIA MIL MIN NYM NYY
OAK PHI PIT SD SEA SF STL TB TEX TOR WSH
```

That is a real finding: whatever Gap 1 is, it is **not** a missing table
entry, so the spec's third branch ("no published factor exists — leave the
row absent") is ruled out. The park factors exist for every club.

## Why I stopped

The probe reports `parkRowMissing: 7` of 15. I do not believe that number,
and the reason is specific rather than general caution.

The seven home teams it names are MIN, ATH, AZ, NYY, TOR, CWS, LAD. Four of
those — **MIN, NYY, TOR, LAD** — are present in `PARK_FACTORS` under
exactly those keys. If the abbreviation resolved and the table has the key,
`getParkFactor` returns data and the row renders. So either those four rows
did render and my detector missed them, or something else is going on that
the manifest cannot distinguish.

The detector is the weak link:

```js
parkRowPresent: /(^|\b)Park\b/i.test(rows.join('\n')) || /Park\s/i.test(text)
```

It matches the literal word "Park", which appears both in the row *label*
and inside venue names ("Oracle Park", "Petco Park") but **not** in others
("Target Field", "Busch Stadium", "Angel Stadium"). A row that rendered for
Target Field could therefore read as absent. The split of 8 present / 7
missing does not cleanly track venue naming either, so I cannot even
confirm that as the explanation.

Which means the honest description of `parkRowMissing: 7` is **unmeasured**,
not "seven games are missing park factors". Reporting it as a finding would
be recording a number my own instrument cannot support — the same error as
the first comeback-probability baseline, which returned the expected verdict
without having measured anything, and which I caught earlier today only
because its error field happened to be populated.

The remaining candidate cause — the one worth chasing next — is that
`_homeAbbr` comes from `home.team.abbreviation` (MLB Stats API,
`src/legacy/field.js:17806`) and MLB's abbreviations diverge from
`PARK_FACTORS` keys for at least three clubs: **ATH vs OAK, AZ vs ARI, CWS
vs CHW**. That would explain three of the seven and is checkable in one
query. It does not explain MIN/NYY/TOR/LAD, which is exactly why the
detector has to be fixed before any of this is acted on.

## What the next session must do first

Not "fix the park rows". **Fix the probe, then re-measure.** The detector
must key on the row's own label element rather than a substring of the
subsection text, and the manifest must record, per game, the raw
`_homeAbbr` value alongside `parkRowPresent`. Those two fields together
distinguish the three failure modes the spec asks about; the current
manifest distinguishes none of them.

Only then does the `ATH`/`AZ`/`CWS` hypothesis become testable.

## Confidence gate

**62.** Below the 95 gate, so per the one-liner nothing was committed and
this is reported verbatim.

The score is not low because the work is unfinished — it is low because the
central measurement is unsound and I can say precisely how. What I do hold
with confidence is bounded and stated above: the records-line gap is real
and reproducible, and `PARK_FACTORS` covers all 30 teams so the "no data
exists" branch is closed.

A score above 95 here would have required either fixing the detector and
re-measuring, or asserting `parkRowMissing: 7` as a finding. The second was
available, would have looked like progress, and would have been wrong.

## Residual

`docs/CC-CMD-2026-08-12-scouting-coverage-gaps.md` stays **open**. Its Task
1 is amended by this document: the probe's park detection must be rebuilt
and the `_homeAbbr` value captured before Task 2's fix branches can be
chosen.

One additional gap belongs to this spec rather than the pitcher audit that
found it: **`gamesWithArsenal: 0` of 15**, unchanged before and after
today's pitcher fix. `getPitchArsenal` reads the static `PITCHER_ARSENAL`
table and evidently has no entry for any current starter. Same shape as the
park question — a static table versus a live slate — and it should be
measured the same way rather than assumed.
