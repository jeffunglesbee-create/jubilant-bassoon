# CC-CMD — Fix fetchMLSLive: stop using /v1/matches, use matches/seasons/{id}

**Date:** 2026-07-19
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5

---

## CONTEXT — real, directly verified findings, not assumptions

Direct investigation tonight (live `curl` probes, both against `stats-api.mlssoccer.com`
directly and through the relay) confirmed:

- `/v1/matches` genuinely requires real authentication FIELD does not have —
  confirmed via `x-amzn-errortype: MissingAuthenticationTokenException` in the
  real response headers, consistent across repeated tests, both direct and
  through the relay.
- `/matches/seasons/{id}?match_date={date}` genuinely works with a real 200 and
  real, current data — confirmed directly (a real World Cup Final match, Spain
  vs. Argentina, returned correctly for today's real date), both direct and
  through the relay, using the relay's own already-allowlisted prefix
  (`/matches/seasons/` is already in `MLS_STATS_ALLOWED_PREFIXES` — no relay
  change needed).
- `fetchMLSLive()` (`src/legacy/field.js` ~L17934) is the only real call site
  for `/v1/matches` anywhere in the client — confirmed via direct grep, zero
  other matches. It is also confirmed to have zero real callers itself (a
  second grep for `fetchMLSLive(` found only its own definition) — this is
  real, well-designed, but currently dead code, not a live feature silently
  failing for real users right now.
- The real, correct season ID is already defined in scope, one line above
  the function: `const MLS_SEASON_2026 = 'MLS-SEA-0001KA';` (currently unused
  by this function).

**Real, explicit scope boundary: this CC-CMD fixes the broken endpoint inside
`fetchMLSLive()` only. It does NOT wire this function into any live render
path.** Whether FIELD should use this as an active live-MLS-data source
(supplementing or replacing the existing, working ESPN-based
`fetchSoccerFixtures` path) is a separate, real product decision, not made
here — don't make it unilaterally as part of this fix.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "async function fetchMLSLive" src/legacy/field.js
grep -c "fetchMLSLive(" src/legacy/field.js
# Re-confirm real, current season ID is still correct — seasons can roll over
grep -n "MLS_SEASON_2026" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

Re-confirm `MLS_SEASON_2026`'s real, current value is still accurate before
using it — this doc's own reference (`MLS-SEA-0001KA`) was confirmed live
tonight, but re-verify directly rather than trust this note alone if any
real time has passed.

---

## TASK 1 — Fix the URL construction

Replace the real, current `/v1/matches?match_date%5Bgte%5D=...&match_date%5Blte%5D=...`
construction with `/matches/seasons/${MLS_SEASON_2026}?match_date=${today}`.

**Real, important structural difference to handle correctly:** the old path
took a date *range* (gte/lte) in one request; the new, real endpoint takes a
single `match_date` value per request. The function's own existing dual-date
loop (ET vs. UTC, `datesToFetch`) already iterates per-date — confirm this
maps cleanly onto the new endpoint's single-date parameter without needing
structural changes beyond the URL itself.

**Real response shape check:** confirm the real, actual response field name
for the match list — this doc's own probe saw a top-level `"schedule"` key
(matching the function's own existing `d.schedule || d.matches || d || []`
fallback chain, which should already handle this correctly, but verify
directly against a real response rather than assume).

## TASK 2 — Real, direct verification

```bash
# Real, direct test of the real endpoint with today's actual date
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/mls/stats/matches/seasons/MLS-SEA-0001KA?match_date=$(date -u +%Y-%m-%d)"
```

Confirm the real response genuinely contains real match data (or a real,
valid empty schedule if no real MLS games are scheduled for today — don't
treat an empty-but-valid response as a failure).

## TASK 3 — Confirm the fix doesn't change any live behavior

Since `fetchMLSLive()` has zero real callers, this fix should have zero
observable impact on the live app — confirm via smoke (958/0, or current
real count) and a real live content check that nothing else changed.

---

## DONE CONDITION

`fetchMLSLive()` genuinely uses the real, confirmed-working
`/matches/seasons/{id}?match_date={date}` endpoint instead of the broken
`/v1/matches` path, verified via a real, direct probe returning genuine data.
The function remains uncalled (not wired into any render path) — this is a
correctness fix to dead code, not a new feature activation.

**Confidence scoring:**
- TASK 1 (50 pts): real, correct URL fix, structural date-handling confirmed sound
- TASK 2 (30 pts): real, direct verification against actual live data
- TASK 3 (20 pts): confirmed zero behavioral change to the live app

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
