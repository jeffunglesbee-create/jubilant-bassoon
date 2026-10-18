# NFL scout rows missing on a live game (2026-10-18)

Owner report, about 14:50 UTC: no rows on the in-progress Texans @ Jaguars
game. HEAD went from `1b06f690` to `e63ff79a`. Smoke went from 1054 to 1055.
SW_VERSION went 2026-10-17a → 2026-10-18a → 2026-10-18b.

## Two separate defects, each measured before it was fixed

### 1. NFL, MLS and EPL vanished for about 35 s after every page load (pre-existing)

- **Evidence.** Timeline probe run 39138331150,
  `outbox/sport-section-timeline-*.json`:
  - the relay served NFL at 2.5 s (12 games; relay probe showed Texans @
    Jaguars live, Q2 14–10);
  - tennis `by-date` landed at 7.2 s;
  - NFL was absent from the chips until 40 s;
  - the next V2 poll, at 34 s, re-injected it.
- **Cause.** The supplemental merge in `fetchSchedule` (rugby + tennis) rebuilt
  `allData` from the boot-time `verified` list. That dropped every section the
  V2 poll had pushed since boot. Today was the first day this session saw tennis
  on the slate; at 12:35 there was no tennis chip and no wipe.
- **Fix, `cc66dcec`.** The merge now works on the current `allData` and replaces
  only the sections the supplemental fetch brings. Smoke `A-SUPPMERGE-1` was
  added; the mutation that restores the old rebuild is caught.
- **After.** Run 39138894275: NFL (12) is in the chips at the 10 s sample and
  every sample after it.

### 2. The speed floor row went from 12/12 games to 0/12 (mine, `b615d5b8`)

- **Evidence.**
  - Scout manifests: 12/12 at 12:35 UTC, then 0/12 at 14:55 and at 15:06.
  - `bdb-serve-probe` run 39139261880: the relay serves the file intact.
  - Timeline run 39139357307: the browser received it intact (1648 rows,
    season 2022). Every `/nflverse/` table was fetched **twice** at 8.1 s.
- **Cause.**
  - `fetchSchedule` runs twice on boot, so `nflTeamTablesInit` runs twice.
  - My ambiguity test ("seen this name before?") read the shared table. On the
    second pass it saw every name again and set every value to null.
  - Reproduced with the shipped loop: 1626 named values after one load, 0 after
    two.
  - The other tables only assign, so running them twice did no harm.
- **Fix, `fa24e59c`.** The loop builds a local map from this file alone and then
  publishes it. The double-load test on the shipped block gives 1626 → 1626:
  Metcalf 19.64, Josh Allen still null. `A-NFLSPD-1` is updated; the mutation
  that restores the shared-table test is caught.

## The probe passed both defects. Now it does not (`337d0377`, `e63ff79a`)

- **Before.** At 14:55 the page had 0 NFL games against the relay's 12, and
  `nfl_bdb_scout_probe.js` printed SKIP and exited 0. It also passed a slate
  with the speed row on 0/12 games, because that row is optional per game.
- **Now.**
  - The probe reads the relay's `/v2/games?sport=nfl` count for the ET date
    from the runner. If the page shows fewer games, it FAILs; if the relay is
    unreadable, it also FAILs.
  - On a slate of 2 or more games, if no game shows the speed row, it FAILs.
  - `pageMissesRelayGames` is now written into the manifest. Before, it was set
    after the manifest was written.
- **Local check.** The sandbox cannot reach the relay, so the relay count read
  null and the probe failed rather than skipping (as designed).

## Done condition, live (run 39139761152, 15:17 UTC, SW 2026-10-18b)

- `nflGameCount` 12 = `relayNflGameCount` 12; `pageMissesRelayGames` false.
- `contractHoldsOnEveryNFLGame` true.
- `speedRowGames` 12; rows per game 11/12/13 (min/median/max).
- Texans @ Jaguars, live: 12 rows.
  - `Jaguars T.Lawrence ≥19.4 | Texans D.Montgomery ≥17.7 · N.Collins ≥20.7 · D.Schultz ≥17.4`

## Open, not touched (Rule 69)

- **`fetchSchedule` running twice on boot.** Every R2 overlay init (NGS,
  injuries, team tables and the others) fetches its tables twice. My code is
  now safe against it. The double run itself is a separate change, because it
  touches the boot path. Owner decision.
- **The merge when the user navigates away.** If the user moves to another date
  before the supplemental fetch lands, it still writes into that date's
  `allData`. The old code replaced that date wholesale, so this is no worse. A
  date guard is a separate change.
