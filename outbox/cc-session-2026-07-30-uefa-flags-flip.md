# CC Session — flip ucl/europa/conference flags live
**Date:** 2026-07-30
**Repo:** jubilant-bassoon
**HEAD at close:** 2452594e

---

## What changed

`FIELD_V2_SOURCES.ucl/europa/conference` flipped `false → true`.
`epl` left `false` — Premier League is in genuine off-season, no games
until August, unrelated to the UEFA question.

## Why now (context)

Earlier this session, two independent investigations (this session's own
GH Actions BSD probe, and a separate mobile-app chat session working the
same question in parallel) confirmed BSD has real, live UEFA qualifying
data. That led to a stopped CC-CMD ("build two-legged aggregate on BSD")
once direct inspection showed a two-legged-aggregate pipeline **already
exists end-to-end via ESPN** (`handleV2Games` → `/soccer/xg` → `g.series`
→ client `field.js:14886-14890`) — building a second, BSD-based path
would have duplicated a working contract (Rule 60/62 violation). The
actual blocker was simply that the client's feature flags were off.

## Verification before flipping (Rule 68 pre-build probe)

Used `probe_relay_route` (self-fetch, bypasses sandbox network block) to
confirm actual behavior before touching the flag, not assumed it:

```
probe_relay_route: /v2/games?sport=ucl&date=2026-07-29
→ {"sport":"ucl","date":"2026-07-29","games":[],"count":0,"source":"espn-wc",...}
```
Confirmed: the main-tournament ESPN league (`uefa.champions`) is correctly
empty right now — group stage hasn't started. Flipping `ucl` alone is a
safe no-op today, not a broken feature.

```
probe_relay_route: /v2/games?sport=uclqual&date=2026-07-29
→ real finished matches: Kairat Almaty 1-0 Omonia Nicosia (PEN 6-5),
  CSU Craiova 2-2 Levski Sofia, Lech Poznan 1-4 AGF, etc.
  round: "UCL Qualifying, Second Round"
```

## Two real gaps found, deliberately NOT fixed in this session (scope: flip flags only)

1. **`uclqual`/`europaqual`/`conferencequal` have zero entries in
   `FIELD_V2_SOURCES`** — not `false`, absent entirely. The client has no
   wiring at all to fetch the sport keys that actually carry live 2026-27
   qualifying-round data right now. Flipping `ucl`/`europa`/`conference`
   does not surface any of the real, live matches confirmed above.
2. **The relay's existing two-legged aggregate pre-filter regex
   (`src/index.js` ~3654, `/2nd leg|second leg/i` against ESPN's `round`
   string) will never match** real qualifying-round data — ESPN returns
   `"UCL Qualifying, Second Round"`, not "2nd Leg"/"Second Leg". Even once
   `uclqual` is wired client-side, the aggregate-score feature silently
   won't fire for these games without a relay-side regex fix.

Both are real, confirmed (not assumed) via direct probe of the deployed
relay — not documented speculatively.

### Unblock criteria (Rule 74 — STAGED-GATE-A)

- **Gap 1** — blocked by: no client fetch wiring for `*qual` sport keys.
  Unblocked by: a CC-CMD adding `uclqual: true, europaqual: true,
  conferencequal: true` (or similar) to `FIELD_V2_SOURCES` plus whatever
  `fetchV2Games` call-site wiring those keys need (not yet audited).
  Verify: `probe_relay_route /v2/games?sport=uclqual&date=<live-date>`
  returns games AND the client's rendered schedule for that date shows a
  UCL Qualifying section.
- **Gap 2** — blocked by: relay regex only matches "2nd leg"/"second leg".
  Unblocked by: a relay CC-CMD widening the regex (e.g. also matching
  `/second round|round \d+/i` scoped to `*qual` sports only, to avoid
  false-positives on unrelated soccer competitions). Verify: for a real
  qualifying second-leg-equivalent match, `probe_relay_route
  /v2/games?sport=uclqual&date=<date>` shows a non-null `series` field on
  the relevant game object.

## Verification

`node smoke.js index.html`: 965 passed, 0 failed.
`node field_smoke.js index.html`: 0 failures.
`node field_unit.js`: 66 passed, 0 failed.
SW_VERSION: `2026-07-30e` → `2026-07-30f` (both index.html/field.js and sw.js).

## File-size smoke gate note

Trimmed the new flag comment twice (2600321 → 2600021 → passing) to stay
under the 2,600,000-byte structural ceiling. Content-only trims to this
session's own new comment, zero logic changes, zero pre-existing code
touched.

## Commits this session (this task)

| Commit | Description |
|---|---|
| `2452594e` (rebased from `dfe7c69c`) | feat: flip ucl/europa/conference V2 feature flags live |

## Explicitly NOT touched (per user instruction: "flip flags now", not "build the qual wiring")

- `uclqual`/`europaqual`/`conferencequal` client wiring — Gap 1 above.
- Relay's two-legged aggregate regex — Gap 2 above.
- `epl`, `eflchamp`, `eflone`, `efltwo`, `laliga`, `seriea`, `bundesliga`,
  `ligue1` — no evidence any of these have live competition right now;
  left untouched.

## Carry-forwards

Two, both with explicit unblock criteria above:
1. Wire `uclqual`/`europaqual`/`conferencequal` into `FIELD_V2_SOURCES`
   and whatever client fetch call sites are needed.
2. Widen the relay's two-legged-aggregate round regex to also match
   qualifying-round naming, scoped to `*qual` sports.

Neither was actioned this session — out of the stated scope ("flip flags
now"). Per Rule 87, each needs its own CC-CMD before being closed as a
carry-forward; none written yet, pending user direction.
