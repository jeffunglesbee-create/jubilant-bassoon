# CC-CMD-2026-08-02-fix-espn-standings-all-sports — Result

## Status: VERIFICATION ONLY. No code changes required — the bug was
already fixed for all four sports as a side effect of the MLB CC-CMD.

## Task 1 — re-verified from HEAD, not assumed

- `ESPN_STANDINGS_BASE` confirmed present at `src/legacy/field.js:13537`,
  still pointing at the working path:
  `"https://site.api.espn.com/apis/v2/sports"`.
- `fetchESPNStandings(sportName)` (`field.js:13538`) is the **only**
  implementation of the "▼ Table"/standings fetch in the codebase —
  grepped for `toggleStandings` and `fetchESPNStandings(` call sites;
  the sole non-MLB-warming caller is `toggleStandings` at line 13636.
  No separate, sport-specific standings fetcher exists for NBA/NHL/NFL
  that bypasses this shared function.
- `ESPN_STANDINGS_MAP` (`field.js:11660`) already lists
  `'Basketball (NBA)'`, `'Hockey (NHL)'`, `'Football (NFL)'` (plus
  MLB, NBA/NHL Playoffs, MLS) — all resolved through the same
  `fetchESPNStandings` → `ESPN_STANDINGS_BASE` path.
- **Conclusion: this bug was already fixed for all four sports as a
  side effect of the MLB CC-CMD**, exactly as that CC-CMD's Task 1
  flagged as the likely outcome. `fetchESPNStandings` is genuinely
  shared, not MLB-specific.

## Task 2 — not executed (correctly out of scope)

No code changes made. `ESPN_BASE` and its 5 scoreboard callers were
not touched, per the explicit restriction (verified via `grep -n
"ESPN_BASE"` before starting — confirmed no edits landed there).

## Task 3 — smoke + real live verification, all four sports

- `node smoke.js index.html`: **965 passed, 0 failed** (baseline,
  unchanged — no code edited).
- **Real live re-verification** (this session, not reused from the
  prior session's file per Rule 72 — re-ran the existing
  `espn-standings-base-path-check.yml` CI-as-proxy probe fresh):
  `outbox/espn-standings-base-path-check.json`, run
  `30746705760`, conclusion `success`, timestamp 2026-08-02T11:54Z.

| Sport | `new_apis_v2` status | entryCount |
|---|---|---|
| baseball/mlb | 200 | 30 |
| basketball/nba | 200 | 30 |
| hockey/nhl | 200 | 32 |
| football/nfl | 200 | 32 |

All four sports return real, non-empty standings entries via the
exact URL construction `fetchESPNStandings` uses
(`${ESPN_STANDINGS_BASE}/${sport}/${league}/standings`). The old
`apis/site/v2` path (checked in the same run, not reproduced here)
continues to return zero entries for all four, confirming the fix is
both necessary and sufficient.

## SW_VERSION / deploy

Not bumped — no `index.html`/`sw.js`/`field_utils.js`/`wrangler.jsonc`
changes were made (docs + outbox only), so no deploy-gate trigger
applies.

## No unblock criteria needed

This CC-CMD is fully closed: Task 1 verified, Task 2 correctly
skipped (nothing to fix), Task 3 has real live proof for all four
sports.
