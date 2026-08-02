# CC-CMD-2026-08-02-warm-mlb-standings-for-streak-bonuses

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-warm-mlb-standings-for-streak-bonuses.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## The real, disclosed gap this closes

`escalating-milestone-modifiers` (shipped, live) explicitly did not
implement win-streak/hitting-streak drama bonuses from its own source
spec, because `fetchESPNStandings('mlb')` — confirmed to exist,
confirmed to return `entries[].streak` — is never called anywhere in
the codebase, so `espnStandingsCache` for MLB is never populated. This
was disclosed honestly rather than worked around at the time. This
CC-CMD closes that specific, scoped gap.

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Confirm `fetchESPNStandings` and `espnStandingsCache`'s real current
  shape and call sites fresh — do not assume this doc's description of
  them is still accurate at execution time.
- Find how other sports' standings cache gets warmed (there must be an
  existing pattern — e.g. a boot-time call, a periodic refresh) and
  match that convention for MLB rather than inventing a new one.
- Confirm the real shape of `entries[].streak` from a live ESPN
  standings response (a real game's real data, not assumed) — likely
  something like `{type: 'W'|'L', count: N}` but verify the actual
  field names/format before writing code against them.

## Task 2 — Warm the cache

- Add MLB to whatever existing warming mechanism the rest of the app
  uses for other sports' standings caches. Minimal, matching the
  established pattern — this is a coverage gap, not a new mechanism.

## Task 3 — Wire the streak bonuses into the escalating-milestone logic

- Locate the milestone-modifier code (near the MLB no-hitter tiering,
  `period>=5` — same area) and add the win-streak/hitting-streak
  bonuses per the original source spec, now that real data is
  available. Match the existing escalating-tier pattern already
  established for no-hitters rather than inventing a different shape.
- If the original spec's exact bonus values/thresholds are no longer
  locatable or seem stale, state that plainly and use reasonable,
  disclosed values rather than guessing silently.

## Task 4 — Smoke + real verification

- `node smoke.js` — 0 failures required.
- Real verification: confirm a live MLB team with a genuine current
  streak actually gets a non-zero streak bonus applied — pull real,
  current standings data and check against an actual team, not a
  synthetic fixture.

---

## Explicitly NOT in scope

- Do not touch the no-hitter tiering logic already shipped — this is
  additive only.
- Do not warm standings caches for any other purpose beyond this
  specific bonus calculation unless the existing warming mechanism
  already does more than that by convention.

---

## Outbox

`outbox/cc-session-2026-08-02-warm-mlb-standings-for-streak-bonuses.md`:
the real cache-warming approach used, the real streak-bonus values
applied, and real verification against a live team's actual streak.
