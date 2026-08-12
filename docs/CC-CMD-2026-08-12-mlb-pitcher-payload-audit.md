# CC-CMD-2026-08-12-mlb-pitcher-payload-audit

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-12-mlb-pitcher-payload-audit.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

Split out of `CC-CMD-2026-08-12-comeback-probability-liveness-gate`, which
scoped itself to the liveness gate and explicitly deferred this. Both
findings below come from the same observation of the live Stats tab on
2026-08-12 14:28 ET.

## Finding 1 — every pitcher enrichment field is blank

`buildScoutingReport`'s MLB branch (`src/legacy/field.js:16380`) formats a
pitcher as:

```js
return `${p.name || p.lastName || '?'}${era}${rec}${tempoStr}${arsenalStr}`;
```

`era` needs `p.era`, `rec` needs `p.wins` **and** `p.losses`, `tempoStr`
needs `getPitchTempo(lastNameOf(p))`, `arsenalStr` needs
`getPitchArsenal(...)?.topWhiff?.whiffRate != null`.

On all seven games observed, **every pitcher rendered as a bare name** —
"Shane Baz", "Zack Wheeler", "Merrill Kelly". No ERA, no W-L, no tempo, no
arsenal. Four independent enrichments, all absent at once.

That simultaneity is the lead. Four unrelated lookups failing together
points at one upstream cause — most likely `p` itself carrying only a name
— rather than four separate data gaps. Do not assume this; Task 1 measures
it.

Note the file already carries scar tissue here:
`CC-CMD-2026-07-01 scouting-report-arsenal + -tempo-fix` fixed a key-shape
bug where `PITCHER_TEMPO`/`PITCHER_ARSENAL` are last-name-keyed but `p.name`
is a full name, resolved via `lastNameOf()`. **Re-verify that helper still
returns what those tables are keyed by before concluding anything** (Rule
72 — that fix is an inherited claim).

## Finding 2 — possible pitcher/team misassignment

In the same render, `ORIOLES  Shane Baz` and `BREWERS  Dustin May`
appeared. Both look wrong against the rosters those names are associated
with, and one row over, `RAYS  Drew Rasmussen` looks right.

**This is flagged as a question, not a claim.** It was not verified —
2026 rosters cannot be confirmed from the observation alone, and mid-season
trades are ordinary. It may be entirely correct. Task 2 settles it against
the source rather than against anyone's recollection (Rule 1: do not assert
a roster fact that has not been checked).

The rows come from `game.homePitcher` / `game.awayPitcher`, pushed as:

```js
if (ap) rows.push({ lbl: teamNick(game.away||''), val: fmtP(ap) });
if (hp) rows.push({ lbl: teamNick(game.home||''), val: fmtP(hp) });
```

So a swap would mean either the label pairing is inverted or the upstream
normalizer assigns them to the wrong side. Note the label is derived from
`game.away`/`game.home` while the value comes from `ap`/`hp` — if any
upstream path populates those two from a source whose home/away convention
differs, the pairing inverts silently.

## Task 1 — probe the payload, do not read the formatter and infer

```
grep -n "normalizeMLBPitcher" src/legacy/field.js
grep -n "homePitcher\|awayPitcher" src/legacy/field.js | head -30
grep -n "function lastNameOf" src/legacy/field.js
grep -n "PITCHER_TEMPO\s*=\|PITCHER_ARSENAL\s*=" src/legacy/field.js
```

Then capture the **real shape** at render time. Extend
`comeback_liveness_probe.js`'s pattern into a new
`mlb_pitcher_payload_probe.js` + workflow (do NOT edit the existing probe —
it is the artifact of a closed CC-CMD), against the live URL with `?wpt=1`.

**Artifact:** a committed manifest containing, for each MLB game in the
Stats tab, the rendered pitcher label and value strings, plus counts:
`pitcherRowCount`, `rowsWithEra`, `rowsWithRecord`, `rowsWithTempo`,
`rowsWithArsenal`. Integers, not prose.

If `rowsWithEra` is 0 while `pitcherRowCount` > 0, the enrichment is
absent at the source and the formatter is innocent — fix upstream, not in
`fmtP`.

## Task 2 — settle the assignment question against the source

For one named game from the manifest, fetch the same ESPN scoreboard the
client consumes and compare `probables` home/away to what rendered.

**Artifact:** an enumerated table of at least 5 games —
`espnHomeProbable`, `espnAwayProbable`, `renderedHomeLabel`,
`renderedHomeValue`, and a boolean `matches`. **All 5 must match**, or the
mismatch set is the bug.

If they all match, record that plainly and close the question: the
observation was mistaken and the note above should not propagate as a
suspected bug into a future session (Rule 72 works in both directions).

## Task 3 — fix only what Tasks 1 and 2 prove

No speculative fix. If Task 1 shows the payload carries the fields and the
lookups are missing them, fix the lookup. If the payload is bare, fix the
producer. **Do not add a fallback that renders a placeholder** — a blank is
honest; an invented ERA is a Rule 1 violation.

If Task 2 shows a swap, fix the pairing, and add a smoke assertion pinning
label-to-side so it cannot invert again silently.

## Explicitly NOT in scope

- `buildComebackProbability` and its liveness gate (closed 2026-08-12).
- The missing PARK rows and missing records line — see
  `docs/CC-CMD-2026-08-12-scouting-coverage-gaps.md`.
- Any change to the Stats tab's layout or the leaderboard blocks.

## Outbox

`outbox/cc-session-2026-08-12-mlb-pitcher-payload-audit.md`: Task 1 probe
output, the Task 2 comparison table, the diff, and smoke before/after.
