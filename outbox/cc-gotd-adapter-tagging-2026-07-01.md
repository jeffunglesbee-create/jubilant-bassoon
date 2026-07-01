# CC Outbox — GOTD Tagging for Adapter-Driven Days

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-gotd-adapter-tagging.md
**Commit:** (see below)
**Smoke:** 813/0

---

## Pre-build probe — critical finding

The CC-CMD spec proposed creating a new `MLB_GOTD_OVERRIDES` const and modifying
`mergedGames.map()`. Pre-build probes revealed this approach would create a redundant
parallel system. The existing mechanism was missed in the CC-CMD's probe because it
probed only `fetchMLBFixtures()` (~L19782) and not `loadMLBSlate()` (~L19751).

**Existing mechanism (already in codebase):**
- `PEACOCK_GOTD_SCHEDULE` (L7378) — keyed `'YYYY-MM-DD': 'AWAY@HOME'` (MLB abbreviations)
- `ESPN_GOTD_SCHEDULE` (L7326) — same format
- `loadMLBSlate()` (L19751) reads both and sets `peacockGOTD`/`espnGOTD` flags before
  games reach `mergedGames.map()`. No change to `mergedGames.map()` needed.

**Why the mechanism had stopped working:** `PEACOCK_GOTD_SCHEDULE` last entry was
`'2026-06-06':'BOS@NYY'`. No July entries existed — the schedule just ran out. The
auto-detection path (`field-data-today.json broadcasts(all)`) also missed today's game
(confirmed: `peacockGOTD: false` in outbox/field-data-today.json for DET@NYY).

**Rule 62 compliance:** Used existing convention (`PEACOCK_GOTD_SCHEDULE`) rather than
creating a new parallel system (`MLB_GOTD_OVERRIDES`). Smaller, correct, no risk to
doubleheader or sort logic.

---

## Implementation

Added one entry to `PEACOCK_GOTD_SCHEDULE` at L7391:

```javascript
'2026-07-01':'DET@NYY',   // Wed 1:35pm ET — DET @ NYY (Peacock GOTD)
```

Abbreviations confirmed: Detroit Tigers = `DET`, New York Yankees = `NYY`.
Key format confirmed from existing entries (e.g. `'BOS@NYY'`, `'CHC@PIT'`).
Time: 1:35pm ET from NBC Sports/NBCUniversal press releases (Peacock blog says 1:30pm —
discrepancy noted in comment; rightsholder-direct source used).

Tasks 1 and 2 from CC-CMD replaced by this single-line addition. The CC-CMD's `MLB_GOTD_OVERRIDES`
and `mergedGames.map()` modification were not implemented — they would have created a
redundant system duplicating `PEACOCK_GOTD_SCHEDULE`'s existing functionality.

---

## Verification

- 813/0 smoke
- `grep 'DET@NYY' index.html` → confirmed at L7391

---

## Done Conditions

- [x] Peacock GOTD for 2026-07-01 (DET@NYY) will now resolve via `loadMLBSlate()`
- [x] No new `MLB_GOTD_OVERRIDES` const created (correct per Rule 62)
- [x] No change to `mergedGames.map()` (correct — existing path handles it)
- [x] 813/0 smoke
- [x] Outbox written

## STAGED

Visual verification (Peacock GOTD chip renders on Tigers @ Yankees card) requires
deployed app. CC sandbox blocks `*.workers.dev`. Chat to verify post-deploy.

---

## Future work (noted per CC-CMD Task 4)

Ongoing maintenance: new Peacock GOTD entries still need manual addition to
`PEACOCK_GOTD_SCHEDULE` weekly (Peacock announces ~Mon/Tue for the upcoming week).
`ESPN_GOTD_SCHEDULE` similarly needs weekly manual updates.

A more automated approach worth a future CC-CMD: relay-side lookup from Peacock's
schedule endpoint (if CORS-open or proxiable) → relay cron writes `peacockGOTD` flags
to KV → client fetches at load time. This would eliminate the static table entirely
and make GOTD tagging self-maintaining. Not built here — scope creep.
