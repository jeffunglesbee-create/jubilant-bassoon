# CC-CMD-2026-08-12-scouting-coverage-gaps

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-12-scouting-coverage-gaps.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

Split out of `CC-CMD-2026-08-12-comeback-probability-liveness-gate` (Rule
87 — deferred work gets a spec, not a carry-forward). Observed on the live
Stats tab, 2026-08-12 14:28 ET.

These are **lookup-table coverage gaps**, not rendering bugs. In both cases
the code is behaving correctly by omitting a row it has no data for. The
question is whether the tables should cover these cases.

## Gap 1 — two games rendered no PARK row

`Tampa Bay Rays @ Athletics` and `Colorado Rockies @ Arizona Diamondbacks`
showed UMPIRE and pitchers but no PARK line. Five other games showed it.

Source (`src/legacy/field.js:16388`):

```js
const abbr = game._homeAbbr || game.homeTeam;
const pf = abbr ? getParkFactor?.(abbr) : null;
if (pf) { ... rows.push({ lbl: 'Park', ... }) }
```

So either `abbr` is falsy or `getParkFactor` has no entry for it. Two
different failures with the same symptom — Task 1 must distinguish them,
because adding a park-factor row for a venue whose abbreviation never
resolves would fix nothing.

Worth noting the Athletics have no fixed traditional home park in this
era, so a missing entry there may be **correct** rather than a gap. Do not
invent a park factor to fill a row (Rule 1). If the venue genuinely has no
published factor, the honest outcome is that the row stays absent and this
is recorded as intended behaviour.

## Gap 2 — one game rendered no records line

`Colorado Rockies @ Arizona Diamondbacks` showed no `Team: W–L · Team: W–L`
line. All six others did.

Source (`src/legacy/field.js:31036`):

```js
const hT = _tgStandings.find(t => (t.team || '').toLowerCase().includes(hSlug));
const aT = _tgStandings.find(t => (t.team || '').toLowerCase().includes(aSlug));
if (hT && aT) _tgStandingsStr = `...`;
```

Substring matching on `teamNick()` output. Both lookups must succeed or the
whole line is dropped — so one unmatched nickname silently removes the
other team's record too.

Note this is the same game as Gap 1, which is suggestive: a single team
whose identifiers don't resolve would explain both. Task 1 tests that
directly rather than treating them as two coincidences.

## Task 1 — measure which of the two failure modes applies

New `scouting_coverage_probe.js` + workflow, following
`comeback-liveness-probe.yml` (do NOT edit that probe — it is a closed
CC-CMD's artifact). Against the live URL with `?wpt=1`.

**Artifact:** a committed manifest listing, per MLB game in Today's Games:
`homeTeam`, `homeNick`, `parkRowPresent`, `recordsRowPresent`. Booleans and
strings, no prose.

Then, from source rather than the DOM, answer for each game missing a row:

```
grep -n "function getParkFactor" src/legacy/field.js
grep -n "PARK_FACTORS\s*=" src/legacy/field.js
```

**Artifact:** the enumerated set of keys `PARK_FACTORS` actually contains,
and the `_homeAbbr` value the failing games carry. That pair distinguishes
"abbr is falsy" from "abbr resolves but has no table entry" — the two
outcomes need opposite fixes.

## Task 2 — fix only what Task 1 distinguishes

- **`abbr` falsy** → fix the abbreviation resolution. Do not add a second
  fallback beyond the existing `game._homeAbbr || game.homeTeam` (Rule 76
  caps the chain at 2).
- **`abbr` resolves, no table entry, and a real published factor exists**
  → add the entry, with a source comment naming where the number came from
  and the date, per Rule 73.
- **No published factor exists** → leave the row absent, and record that
  in the outbox as intended behaviour so a later session does not
  "fix" it by inventing one.

For Gap 2, if one nickname fails to match, fix the matching. Consider
whether `hT && aT` should degrade to showing the one record it has rather
than dropping both — but **do not implement that without deciding it is
right**; a half-populated line may be worse than none. State the decision
either way.

## Explicitly NOT in scope

- Pitcher enrichment blanks and pitcher/team assignment — see
  `docs/CC-CMD-2026-08-12-mlb-pitcher-payload-audit.md`.
- `buildComebackProbability` (closed 2026-08-12).
- Umpire coverage. Three umpires rendered as bare names because
  `getUmpireABSRating` has no entry; that is the same class of gap but was
  not observed to be wrong, and expanding the umpire table is its own
  question.

## Outbox

`outbox/cc-session-2026-08-12-scouting-coverage-gaps.md`: the probe
manifest, the key enumeration, which failure mode applied per game, and the
decision recorded for any row deliberately left absent.
