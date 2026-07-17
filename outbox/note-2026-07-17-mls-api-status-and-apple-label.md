# Note — MLS API Status + Apple TV Label (2026-07-17)

Two sources merged: prior chat session (Apple TV label correction) +
this session (live endpoint probe after allowlist expansion, relay 5455cb3).

---

## MLS API — Correct Status (do not re-litigate)

`stats-api.mlssoccer.com` is the real, official MLS API — accessible, no auth.
Working since June 30 2026 session. A prior chat session initially said
"no official MLS API" using a stale May 24 doc — that was wrong. Check here first.

Relay route: `/mls/stats/*` → `https://stats-api.mlssoccer.com`
Allowlist expanded: relay commit `5455cb3` (2026-07-17, main)
Probe method: html_probe via CF Worker IP (2026-07-17)

### Confirmed working endpoints

| Path | Returns | TTL |
|------|---------|-----|
| `/statistics/players/competitions/MLS-COM-000001/seasons/MLS-SEA-0001KA` | Per-player season stats, sortable | 3600s |
| `/statistics/clubs/competitions/MLS-COM-000001/seasons/MLS-SEA-0001KA` | Club xG, possession, shots conversion | 3600s |
| `/clubs/competitions/MLS-COM-000001/seasons/MLS-SEA-0001KA` | Club registry: club_id, three_letter_code, city | 3600s |
| `/competitions` | 20 competitions, all IDs | 3600s |
| `/matches/seasons/MLS-SEA-0001KA?competition_id=X` | Schedule + bracket | 300s |
| `/competitions/{id}/seasons/{id}/standings` | Standings tables | 3600s |
| `/v1/matches?competition_id=X&season_id=X` | Live scores | 30s |
| `/v1/goals?match_id=X` | Goalscorer events | 60s |
| `/v1/commentaries?match_id=X` | Full event stream | 60s |

### Confirmed 404 upstream (do not retry)

- `/v1/players` — no player roster endpoint exists at this path
- `/clubs/{id}` — no single-club lookup; use `/clubs/competitions/.../seasons/...`

### `statistics/players` field inventory (Hugo Cuypers, LAFC — #1 scorer MD16)

```
player_id, player_first_name, player_last_name, goal_keeper
normalized_player_minutes, playing_time
goals (13), assists, second_assists, penalties_successful/not_successful
shots_at_goal_sum (47), shots_at_goal_held (on target: 24)
shots_at_goal_inside_box (47), shots_at_goal_outside_box (0)
shots_at_goal_right_leg/left_leg/head
passes_sum, passes_successful_sum → pass accuracy
crosses_sum, crosses_successful_sum
cards_yellow, cards_red, offsides, fouls_sum, fouls_suffered
defensive_clearances
tackling_games_air_won/lost → aerial duel %
distance_covered (m), maximum_speed (km/h)
participations_goal (goal involvement count)
participations_shot_at_goal (shot involvement count)
sitters (big chance received), shots_on_target
```

Supports `?sort_by=goals&sort_order=desc` (sortable by any field).

### `clubs/` field inventory

```
club_id (MLS-CLU-000001...), club_name, three_letter_code (LAFC, PHI, ATX…)
short_name, club_short_name, city, country
competition_id, competition_name, season_id, season
```

Key use: bridge ESPN team names → opta `club_id` for stats joins.

### Computable metrics (no new sources needed)

- Shot efficiency: `goals / shots_at_goal_sum × 100`
- Aerial duel %: `tackling_games_air_won / tackling_games_air_sum × 100`
- Goal involvement per 90: `participations_goal / normalized_player_minutes × 90`
- Box shot ratio: `shots_at_goal_inside_box / shots_at_goal_sum × 100`
- Pass accuracy: `passes_successful_sum / passes_sum × 100`

---

## Apple TV Label — Pending Fix (client-only, no relay dep)

### Issue 1 — Wrong label on live SR entry

`SR.apple` (~line 6214, index.html) displays `"Apple TV+"` — the retired name.
MLS Season Pass was discontinued December 2025; service is now plain "Apple TV."
`apple` is actively referenced in both `MLS_FOX` and `MLS_FS1` bundle arrays,
so every MLS card showing an Apple TV chip currently displays the wrong name.

**Fix:** `SR.apple[0]`: `"Apple TV+"` → `"Apple TV"` (label only, no other change)

### Issue 2 — Orphaned SR entry

`SR.mlspass` (~line 6266, `"MLS Season Pass via Apple TV+ required"`) has zero
real references anywhere beyond its definition — confirmed orphaned, not actively
misleading anything. Safe to remove. Re-check before removing (this note may be stale).

### Suggested CC-CMD (small, self-contained)

1. Change `SR.apple` label: `"Apple TV+"` → `"Apple TV"`
2. Remove `SR.mlspass` (confirm zero references first via grep)
3. `node smoke.js index.html` — 0 failed
4. Bump SW_VERSION, commit, push

---

## CI Failure Note (relay run 29611084394)

Not a regression. `/journalism/generate` POST timed out at 20s (curl exit 28).
Wrangler deploy succeeded and health check passed. LLM proxy latency flap only.

---

## Session Reference

Date: 2026-07-17
Relay HEAD: `5455cb3` (allowlist expansion — /v1/players, /clubs/, /statistics/players)
Client HEAD: `84ea683` (Bundesliga broadcast update, SW_VERSION 2026-07-17b, smoke 958/0)
MLS resumes: July 19-20 2026
