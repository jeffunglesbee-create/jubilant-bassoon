# CC session 2026-11-18 — golf tee times, Task 3 (client)

**Repo:** jubilant-bassoon. **HEAD:** `28e8a7a5` → `b3e2c878` (the change), then this doc. **SW_VERSION** `2026-11-10a` → `2026-11-17a`.
**CC-CMD:** field-relay-nba `docs/CC-CMD-2026-11-16-golf-tee-times.md`, Task 3. The owner's order: "tee times build next please".

## Built (`b3e2c878`)

`saveGolfRoundFinal` (`src/legacy/field.js`) adds `start_time: pgaData.roundStart` to the `/archive/game` post when the relay served it as a string. `pgaData` is `/v2/golf/enriched`, which serves `roundStart` since field-relay-nba `140fa56` (deployed 2026-11-18; the relay deployed first, ATOMIC-A). ESPN's event `startDate` (a midnight placeholder, `timeValid: false`) is never used.

## Verified

- `node smoke.js index.html`: 1083 passed, 0 failed; the pre-commit hook's smoke, units and lint passed.
- The real `saveGolfRoundFinal` run in a Node `vm` sandbox with `fetch` stubbed (not committed; `/tmp/claude-0/.../client-tee-test.mjs`): `roundStart` posted as `start_time`; no `start_time` without it or with a non-string; with the line removed, the first case went red.
- A first version also compared `pgaData.round` with `round`; inside this function they are the same value, so the guard was vacuous and was removed (its test case could not fail).

## STAGED

The live archive row (Rule 61): blocked until a PGA round completes with the relay serving `roundStart`. The RSM Classic round 1 is 2026-11-19; a relay read of `/v2/golf/enriched` is scheduled for 2026-11-19T17:30Z (`trig_01Xgs5MBnCBxLJiUS41EPefg`). Verify afterwards: `SELECT id, start_time FROM regular_season_games WHERE sport='golf' AND date='2026-11-19'` must show a start_time equal to that roundStart.
