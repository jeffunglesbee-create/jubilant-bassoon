# CC Session — fix-savant-wp-scale
**Date:** 2026-07-30
**CC-CMD:** docs/CC-CMD-2026-07-30-fix-savant-wp-scale.md
**Repo:** jubilant-bassoon
**HEAD at close:** 54f4724d

---

## Task 1 — Re-verify from HEAD before touching anything

- `fetchSavantGameFeed`'s body re-read fresh: exact return shape and line
  numbers matched the CC-CMD's description (`return wp !== null ? { wp, wpa } : null;`).
- **Fresh live re-probe, real gamePk 822946** (Rangers @ Rays, 2026-07-30,
  Final), via the existing `cors-probe.yml` workflow (reused as-is — not
  new infra; `baseballsavant.mlb.com` is outside this session's sandbox
  egress allowlist, confirmed via `x-deny-reason: host_not_allowed` in an
  earlier probe this same day). CI-as-proxy result (`outbox/cors-result-20260730T223313Z.txt`):
  ```
  gameWpa":[{"homeTeamWinProbability":52.2,"awayTeamWinProbability":47.8,
             "homeTeamWinProbabilityAdded":2.200000000000003, ...
  ```
  0-100 scale confirmed still holds today — the bug had not been fixed or
  changed upstream since yesterday's finding.
- `fetchESPNWinProb` (NBA, line 17378) re-read: unchanged, no scaling
  applied, returns raw `homeWinPercentage` directly. Yesterday's "already
  correct" finding still holds.

## Task 2 — Fix

`fetchSavantGameFeed` (src/legacy/field.js): both `wp` and `wpa` now
divided by 100 immediately after extraction from the last `gameWpa` array
entry, before the function's return. Comment above the function rewritten
to document what the code now actually does, with the prior (wrong)
comment's history preserved for provenance.

## Task 3 — Consumers untouched

Verified by reading the actual code, not assumed:
- `dramaScoreLive`'s `wpBonus` block (line 22006-22011) — untouched.
- WP chip's `awayWp = 1 - homeWp` (line 36836) — untouched.
- Both call sites that assign Savant's result onto the shared field
  (`espnScores[key].wp = savant.wp`, lines 14870 and 17254) — untouched,
  confirmed to be the only assignment path with no other scaling anywhere
  between `fetchSavantGameFeed`'s return and `dramaScoreLive`/the chip.

## Task 4 — Verified the fix changes real behavior

Synthetic before/after using a realistic Savant-shaped sequence
(52.2 → 55.5 → 48.0, the same raw-scale shape confirmed live in Task 1):

| swing | wpBonus BEFORE (bug) | wpBonus AFTER (fixed) |
|---|---|---|
| 52.2 → 55.5 | 25 (pinned at cap) | 4.95 |
| 55.5 → 48.0 | 25 (pinned at cap) | 11.25 |

Matches the CC-CMD's predicted symptom exactly (pinned-0-or-25) before the
fix, and produces genuinely proportional values after.

WP chip check (`trailingWp <= 0.25` gate):

| homeWp raw | awayWp BEFORE | fires BEFORE | awayWp AFTER | fires AFTER |
|---|---|---|---|---|
| 52.2 | -51.2 | true | 0.478 | false |
| 65.0 | -64.0 | true | 0.350 | false |
| 48.0 | -47.0 | true | 0.520 | false |

Before the fix, the chip fired unconditionally regardless of actual
closeness (all three mid-range, non-close values incorrectly triggered
it). After, none incorrectly fire — all three are genuinely mid-range,
not close games.

`node field_smoke.js index.html`: `Failures: 0`.
`node smoke.js index.html`: `965 passed, 0 failed`.

---

## Commits this session

| Commit | Description |
|---|---|
| `3f98c0b6` | fix: sync SW_VERSION to already-live 2026-07-30a (pre-existing drift, unrelated to this bug) + dispatch cors-probe.yml re-verification |
| `a44820d2` | probe outbox/cors-result-20260730T223313Z.txt (CI auto-commit) |
| `05aeaeae` | fix: normalize Savant WP scale 0-100 -> 0-1 at the source |

## Explicitly NOT touched (per CC-CMD scope)

- `fetchESPNWinProb` — confirmed correct, independently, twice (yesterday and today).
- `dramaScoreLive`'s formula weights, caps, or any component other than the units flowing into `wpBonus`.
- No scale-normalization added at any consumer site.

## Carry-forwards

None. Fix is source-only, both scales independently re-verified live
today, behavioral proof included, both smoke suites green.
