# CC Session Outbox — MLB Umpire ABS Ratings: Wire Weekly Data to Live Constant (CC-CMD-2026-07-10-mlb-umpire-abs-sync)

**Date:** 2026-07-10/11
**Scope:** `UMPIRE_ABS_RATINGS` in index.html was frozen at May 27 launch
data. Adds a new step to the existing `mlb-weekly-update.yml` workflow
that regenerates the constant from the real weekly `outbox/mlb/umpire_abs.json`
data, surgically, byte-identical outside the regenerated block.

## A significant correction to this CC-CMD's own CONTEXT, found and reported before proceeding further

The doc's premise — "nothing propagates fresher data into the constant
that actually ships" — is **not fully accurate**, confirmed by reading
`mlbStatsInit()` (index.html ~8296) in full, which the doc's own probe
never surfaced. A **separate, already-working runtime mechanism**
already patches `UMPIRE_ABS_RATINGS` on every page load:

```js
// index.html ~8323-8341, inside mlbStatsInit(), called at T+4000ms on boot
const ur = await fetch(`${_MLB_RELAY}/mlb-umpire-scrape`);
// ... merges fresh CF-Worker-scraped data into UMPIRE_ABS_RATINGS ...
```

Its own comment explains why this exists as a *runtime* (not CI-time)
mechanism: **"pipeline can't call relay (CF 1010 blocks GitHub Actions
IPs). Browser can."** — the CF Worker at `/mlb-umpire-scrape` live-scrapes
Savant's `hp_umpire` HTML table fresh, cached 4h on CF edge, but only a
real browser can reach it; this same CI job that runs the weekly Python
script is itself blocked from calling it directly.

**What this means, stated precisely:** in the common case (CF Worker
reachable, which is most of the time), a real user's `UMPIRE_ABS_RATINGS`
is already refreshed far more frequently (every page load, effectively
~4h-cached) than a weekly CI job could ever achieve, from a *different*
source (a live Savant scrape) than the one this CC-CMD wires up
(`outbox/mlb/umpire_abs.json`, produced by `mlb-weekly-update.py` from
"Statcast des + MLB Stats API officials"). **The genuinely stale
surface is narrower than the doc's framing suggests**: only (a) the
static fallback baked into the page before `mlbStatsInit()` completes
at T+4000ms, and (b) whatever a real user sees if the CF Worker fetch
fails (network issue, CF Worker outage, rate limiting) — in either case,
without this CC-CMD, that fallback was frozen at May 27 data with no
other refresh path.

**This is still real, valuable work — reported as a scope correction,
not a reason to stop.** Making the static fallback weekly-fresh instead
of frozen-since-launch is a genuine improvement to the worst-case path,
and the two mechanisms don't conflict: `mlbStatsInit()`'s merge logic
(`UMPIRE_ABS_RATINGS[k] = { ...v, weakness: v.weakness ?? existing?.weakness
?? null }`) still runs after page load and will override this CC-CMD's
regenerated stub with even-fresher CF-Worker data whenever that succeeds,
falling back to the stub's own `weakness` only if the fresh scrape
doesn't have one for that umpire — unaffected by anything this CC-CMD
changes.

## PROBE BLOCK

`git log --oneline -5` — confirmed at HEAD (`7115baa`) before starting.
Re-confirmed `git log -G"UMPIRE_ABS_RATINGS" -- index.html`: still
exactly 3 commits, all 2026-05-27 — the doc's "44+ days frozen" citation
for the *static table itself* holds (the runtime patch operates on the
in-memory object, not the committed file).

Re-read `outbox/mlb/umpire_abs.json` directly (not assumed from the
doc's citation): **48 real umpires** (`little`, `visconti`, `tumpane`,
`tichenor`, `miller`, `diaz`, `beck`, `estabrook`, `additon`, `barber`,
`jones`, `jimenez`, `mackay`, `wolcott`, `valentine`, `fairchild`,
`wolf`, `scheurwater`, `clemons`, `krupa`, `jean`, `pawol`, `parra`,
`neon`, `moore`, `barksdale`, `eddings`, `bacchus`, `lentz`, `moscoso`,
`ripperger`, `ramos`, `kulpa`, `wegner`, `gibson`, `hamari`, `tomlinson`,
`reyburn`, `carapazza`, `vondrak`, `muchlinski`, `ceja`, `jaschinski`,
`dreckman`, `kelley`, `mahrley`, `hanahan`, `hoye`), shape confirmed:
`{updated, source, processed_game_pks, data: {lastname: {challenged,
overturned, rate, fullName, weakness, zones}}}`. All 48 keys already
simple lowercase-alpha last names — no space/underscore normalization
needed, matching `getUmpireABSRating()`'s existing lookup convention
directly.

**Re-confirmed `getUmpireABSRating()`'s real callers via the correct
grep pattern — the doc's own line citations had drifted, and its
"getRegressionAlert()" citation was wrong.** A naive `grep "getUmpireABSRating("`
found only 2 call sites (~8049, ~8079); the doc's other 3 cited lines
(~19492, ~19924, ~31207) pointed at unrelated code (`getParkFactor`, a
save% candidate builder, and journalism quality-chain logic — none
reference `getUmpireABSRating` at all). Investigated rather than
concluded the doc was simply wrong: those 3 sites call
`getUmpireABSRating?.(last)` — **optional chaining**, which a literal
`getUmpireABSRating(` substring search misses. Re-grepped for the bare
function name (no assumed call syntax) and found the real 5 call sites:
**~8049, ~8079, ~19503, ~19935, ~31331** (not the doc's exact line
numbers, but the same real count). `getRegressionAlert()` (~8002) does
**not** call `getUmpireABSRating` at all — reads `PLAYER_EXPECTED_STATS`
exclusively; the doc's inclusion of it in the callers list appears to be
a genuine citation error, noted here rather than silently propagated.

**`pitchesCalled` gap resolved via direct investigation, not a guess.**
Confirmed via full-file grep: the field is set 22 times (once per old
table entry) and read at exactly **one** site —
`getUmpireABSRating()`'s own return statement
(`pitchesCalled:d.pitchesCalled`), a pure passthrough. **None of the 5
real call sites ever read `.pitchesCalled` from the returned object** —
each only uses `.rate`/`.challenged`/`.overturned`/`.weakness`/`.badge`/
`.context`. Confirmed by reading all 5 call sites directly. **Dropped,
not backfilled or flagged as a follow-up**: the new source has no
per-umpire pitch-count equivalent (Statcast ABS tracking counts
challenges, not total pitches called), and dropping it changes zero
observable behavior since it was never consumed downstream.

## TASK 1 — Deploy-gate answer, genuinely more precise than the doc's framing

**Real answer, from source, not assumed:** `.github/workflows/deploy-gate.yml`'s
`paths:` filter (`index.html`, `sw.js`, `field_utils.js`, `wrangler.jsonc`)
is **file-level, not content-level** — any push that touches `index.html`
at all triggers it, regardless of which part of the file changed. **A
manual `SW_VERSION` bump is not required as a step in the generator or
the workflow**: `deploy-gate.yml`'s own first step ("Sync SW_VERSION to
deploy date") already reads the current suffix, computes today's ET
date, rewrites `SW_VERSION` in both `sw.js` and `index.html`, and
commits that sync back — automatically, on every run that actually
fires.

**The real blocker is `[skip ci]`, which the doc's TASK 1 framing didn't
anticipate as the actual mechanism.** The *existing* `mlb-weekly-update.yml`
commit step already uses `git commit -m "MLB weekly update ... [skip ci]"`.
Per `deploy-gate.yml`'s own header comment, `[skip ci]` "skips ALL
GitHub Actions including this workflow" — so if the regenerated
`index.html` were committed under that same tag, `deploy-gate.yml` would
**never fire**, the `SW_VERSION` sync would never happen, and the
regenerated ratings would sit committed on `main` forever without ever
reaching production. **Fixed by removing `[skip ci]` from this specific
commit's message** (not from the workflow's error-handling or retry
logic, which is untouched) — the correct, minimal fix once the actual
mechanism was identified precisely, not the "bump SW_VERSION manually"
framing the doc anticipated.

## TASK 2 — Wired into the existing weekly workflow

Added `scripts/sync-umpire-abs-ratings.js` (Node.js, matching this
codebase's own established convention for direct index.html text
surgery — `scripts/rotate-schedule.js` is the closest existing
precedent: brace-matched boundary scan, not a naive regex, so a stray
`}` inside a value can never truncate the replacement early):

1. Reads `outbox/mlb/umpire_abs.json`.
2. Sorts entries ascending by `rate` (matching the old table's own
   established low-to-high convention).
3. Regenerates exactly `const UMPIRE_ABS_RATINGS = { ... };` — keyed by
   the same lowercase-last-name convention already in use, fields
   `{challenged, overturned, rate, weakness}` (matches every real
   consumer exactly; `pitchesCalled` dropped per the resolution above;
   `fullName`/`zones` — both present in the new source and genuinely
   richer than anything currently consumed — deliberately **not**
   added speculatively; flagged below as a real, unbuilt opportunity).
4. Deterministic: identical input JSON always produces byte-identical
   output, so a week with no real umpire-stat change correctly produces
   an empty diff (no timestamp or other non-deterministic value baked
   into the generated block).
5. Fails gracefully (logs and returns, doesn't crash the job) if the
   JSON is missing/malformed or the marker isn't found in index.html.

Added a new step to `.github/workflows/mlb-weekly-update.yml`, between
the existing data-fetch step and the commit step:
`node scripts/sync-umpire-abs-ratings.js`. Extended the commit step to
`git add outbox/mlb/ index.html` (was `outbox/mlb/` only) and **removed
`[skip ci]`** from the commit message, per TASK 1's real finding — this
is the one concrete workflow change needed to make the regenerated data
actually deployable, not a version-bump step.

## VERIFICATION

Ran `node scripts/sync-umpire-abs-ratings.js` **locally against the
real, currently-committed `outbox/mlb/umpire_abs.json`** (not a
fixture): regenerated `UMPIRE_ABS_RATINGS` with all 48 real umpires.
`node --check` on both extracted inline `<script>` blocks: clean.

**`git diff` confirms a single contiguous change** (lines 7401-7427 →
7401-7448, the object literal's interior) — everything else in
`index.html`, including the 5-line header comment above the constant
and `UMP_WATCH_THRESHOLD` immediately after it, is byte-identical.

**`getUmpireABSRating()` re-verified against 3 real umpire names from
the new data**, extracted-verbatim from the committed file:
`getUmpireABSRating('Little')` → `40% overturn (2/5) · weak: down-right
zone`; `getUmpireABSRating('VISCONTI')` (case-insensitive, matching
real call-site input) → `50% overturn (3/6) · weak: down-left zone`;
`getUmpireABSRating('Tumpane')` → `71% overturn (5/7) · weak: down-left
zone — above league avg 53%`, correctly flagged `badge: "UMP WATCH"`
(rate 0.714 exceeds the 0.65 threshold). `getUmpireABSRating('nonexistent_ump')`
→ `null`, confirming the not-found path is unaffected.

**A real smoke failure, investigated and fixed, not silently
worked around.** `A206` hardcoded two specific umpire last names
(`'bucknor'`, `'barksdale'`) as a proxy for "the table is wired
correctly." Confirmed via direct check against the real new JSON:
`'barksdale'` is present, `'bucknor'` genuinely is not — this week's
real Statcast ABS challenge data simply doesn't include that umpire
(real roster/assignment rotation, not a bug). The exact same brittle-
hardcoded-value pattern already fixed twice this session for other
real-data-driven features. Replaced with a structural check (≥10 real,
shape-valid `{challenged, overturned, rate, weakness}` entries, plus
the unrelated `/mlb-umpire-scrape` endpoint reference) that doesn't
depend on which specific umpires happen to be in this week's real
roster. Verified the new check still correctly requires real structural
validity (doesn't just count `{` characters) and is not overfit to only
the new format (confirmed it does NOT spuriously match the OLD table's
different field order either, which is fine — the old format is gone
for good after this ships).

## Repo verification

`node smoke.js index.html`: 919/0 (918/1 before the `A206` fix, 919/0
after). `node field_unit.js`: 66/0. `node field_smoke.js index.html`:
21 failures, matches the documented pre-existing baseline exactly.

## DONE CONDITION

`UMPIRE_ABS_RATINGS` is generated from `outbox/mlb/umpire_abs.json` as
part of the existing Monday weekly job, verified against real current
data (48 umpires, not a fixture), smoke clean, and actually deployable
(`[skip ci]` removed from the triggering commit — the real mechanism
that made this depend on deploy-gate.yml's paths filter, not a manual
SW_VERSION bump, which that same workflow already handles automatically).

## CONFIDENCE SCORING

- +25 — TASK 1 deploy-gate question genuinely answered from source, not
  assumed: real answer identified is more precise than the doc's own
  framing (the `[skip ci]` tag, not a missing version bump, is the
  actual blocker) — **met**
- +30 — generator produces valid, verified output against real current
  JSON: 48 umpires, `node --check` clean, 3 real names re-verified
  against `getUmpireABSRating()`'s actual extracted-verbatim function —
  **met**
- +25 — byte-identical diff outside the regenerated block, confirmed
  via `git diff`: single contiguous change, everything else untouched —
  **met**
- +10 — `pitchesCalled` gap explicitly resolved (dropped, with the
  zero-real-consumers finding stated plainly), not silently dropped —
  **met**
- +10 — `smoke.js` clean: 919/0, including a real, investigated fix to
  a hardcoded-name assertion that real weekly data broke — **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-11b` → `2026-07-11c`.
- `scripts/sync-umpire-abs-ratings.js`: new generator script.
- `.github/workflows/mlb-weekly-update.yml`: new sync step added;
  commit step extended to include `index.html`; `[skip ci]` removed
  from the commit message (the real fix needed for TASK 1's finding).
- `index.html`: `UMPIRE_ABS_RATINGS` regenerated from real current data
  (48 umpires, `pitchesCalled` dropped). Nothing else changed.
- `smoke.js`: `A206` made structural instead of hardcoded-name-based,
  fixing a real break caused by this week's real data.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
