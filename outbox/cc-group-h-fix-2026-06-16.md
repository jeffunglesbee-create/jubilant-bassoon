# Group H Standings Gap — Fix Execution Log

**Date:** 2026-06-16
**Symptom:** Group H standings showed only Spain + Cape Verde Islands (1 pt each). Saudi Arabia 1-1 Uruguay (June 15, Hard Rock Stadium Miami) was visible on ESPN / api-sports but missing from `wc_results` in the wc2026 D1 (`f26669de-e772-4b56-a6d1-f8fdea08a4d4`).
**Status:** ✅ FIXED — all 4 Group H teams now in standings, 1 pt each.

---

## Pre-state verification

```sql
SELECT group_id, COUNT(*) AS results FROM wc_results GROUP BY group_id ORDER BY group_id;
-- A: 2, B: 2, C: 2, D: 2, E: 2, F: 2, G: 2, H: 1, I: 1
```

```sql
SELECT * FROM wc_results WHERE group_id='H';
-- game_id="football:1489380" Spain 0–0 Cape Verde Islands · 2026-06-15
```

```sql
SELECT team, points FROM wc_group WHERE group_id='H';
-- Cape Verde Islands 1, Spain 1
-- (only 2 of 4 teams)
```

Group H had 1 result vs Groups A–G's 2 results. Group I also had 1 result, but per spec that group's MD1 is in-progress and matches the expected schedule, so no action needed there.

---

## Diagnosis — why `writeWCResult` missed the fixture

Walked the relay's wc-ingest pipeline. Source pulled via the
Cloudflare MCP `workers_get_worker_code` for `field-relay-nba`.

### `writeWCResult(db, game, env)` (relay line 6548)

```js
async function writeWCResult(db, game, env) {
  const groupId = extractWCGroup(game.round, game.home?.name, game.away?.name);
  if (!groupId) return;
  …
  await db.prepare(`INSERT OR IGNORE INTO wc_results …`).run();
  await recomputeGroupStandings(db, groupId);
}
```

### `extractWCGroup(round, homeName, awayName)` (relay line 6505)

```js
function extractWCGroup(round, homeName, awayName) {
  const m = (round || "").match(/Group\s+([A-L])\b/i);
  if (m) return m[1].toUpperCase();
  if (/round of|quarter|semi|final/i.test(round || "")) return null;
  const norm = s => (s||"").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g,"").trim();
  const g = _WC_TEAM_GROUP[norm(homeName)] || _WC_TEAM_GROUP[norm(awayName)];
  return g || null;
}
```

### `_WC_TEAM_GROUP` map — Group H rows (relay line ~6480)

```js
// Group H
"spain": "H",
"cape verde": "H",
"saudi arabia": "H",
"uruguay": "H",
```

Both Saudi Arabia and Uruguay are present under their bare normalized names, so even with a non-matching round string the team-name fallback would have returned `"H"`. The group resolution is NOT the bug.

### Caller — `handleV2Games` finals filter (relay line 7214-7220)

```js
if (sport === "wc26" && env.WC2026_DB) {
  const finals = games.filter((g) => g.state === "final");
  if (finals.length > 0) {
    if (ctx?.waitUntil) {
      ctx.waitUntil(Promise.allSettled(finals.map((g) => writeWCResult(env.WC2026_DB, g, env))));
    } else {
      await Promise.allSettled(finals.map((g) => writeWCResult(env.WC2026_DB, g, env)));
    }
  }
}
```

**This is the gate.** `writeWCResult` is only invoked for games where `g.state === "final"`. The `state` field is set by `adaptFootball()` via `v2State(sport, status?.short)` from the api-sports `fixture.status.short` value. If api-sports reported a non-"final" state for KSA-Uruguay at the moment the cron / client poll observed it (delayed finalization on the upstream side, transient FT vs AET vs PEN variant, or the fixture finalizing between cron windows), the filter excludes it and no row is written.

### Conclusion

The pipeline did NOT fail on group identification — both teams are in the fallback map. The miss is upstream:

1. **Most likely:** the WC fixture finalized in a window the cron did not poll. `handleV2Games` is called by client `/v2/games?sport=wc26&date=...` requests and by the `runWCTournamentProjections` cron. The cron's edge cache (`cf:cacheTtl:300`) means the relay can serve stale `state:"live"` payloads while api-sports has flipped to `final` upstream. The `finals.filter()` then sees no new finals.
2. **Possible secondary:** api-sports returned a `status.short` value that `v2State()` doesn't map to `"final"` (e.g., `AET`, `PEN`, `AWD` — penalty / awarded results occasionally use unusual short codes). The KSA-Uruguay box says 1-1 with no shootout indicator, so this is less likely than #1.
3. **Round-format mismatch alone is NOT sufficient** to explain the miss — the team-name fallback would have caught it.

The relay-side hardening (when the relay session is in-scope) should:
- Re-poll within an additional grace window after the scheduled match end time
- Treat unknown `state` values like `"final"` if `home_score` and `away_score` are both populated AND the scheduled match start was more than 2.5 hours ago
- Drop the `cache:"no-store"` bypass that defeats the CF edge cache and force a fresh upstream read once per hour during WC days (see the F2.1 carry-forward in `outbox/cc-odds-audit-results.md`)

---

## Fix executed

### 1. Insert missing wc_results row

```sql
INSERT INTO wc_results
  (game_id, group_id, home, away, home_score, away_score, phase, match_date)
VALUES
  ('manual:wc26_ksa_uru_2026-06-15', 'H',
   'Saudi Arabia', 'Uruguay', 1, 1,
   'group', '2026-06-15')
ON CONFLICT(game_id) DO NOTHING;
```

Result: `changes: 1`. game_id uses `manual:` prefix instead of `football:NNNNNN` so that when the upstream relay backfills the real api-sports fixture id, it won't collide via PK conflict. The recompute is keyed by `group_id` not by `game_id`, so dedup safety is on standings already.

### 2. Recompute Group H standings — mirrors `recomputeGroupStandings(db, 'H')`

```sql
DELETE FROM wc_group WHERE group_id = 'H';
INSERT INTO wc_group (group_id, team, played, won, drawn, lost, gf, ga, gd, points)
SELECT group_id, team,
       SUM(played) AS played, SUM(won) AS won, SUM(drawn) AS drawn, SUM(lost) AS lost,
       SUM(gf) AS gf, SUM(ga) AS ga, SUM(gf) - SUM(ga) AS gd,
       SUM(won)*3 + SUM(drawn) AS points
FROM (
  SELECT group_id, home AS team, 1 AS played,
         CASE WHEN home_score > away_score THEN 1 ELSE 0 END AS won,
         CASE WHEN home_score = away_score THEN 1 ELSE 0 END AS drawn,
         CASE WHEN home_score < away_score THEN 1 ELSE 0 END AS lost,
         home_score AS gf, away_score AS ga
    FROM wc_results WHERE group_id = 'H'
  UNION ALL
  SELECT group_id, away AS team, 1 AS played,
         CASE WHEN away_score > home_score THEN 1 ELSE 0 END AS won,
         CASE WHEN away_score = home_score THEN 1 ELSE 0 END AS drawn,
         CASE WHEN away_score < home_score THEN 1 ELSE 0 END AS lost,
         away_score AS gf, home_score AS ga
    FROM wc_results WHERE group_id = 'H'
) r
GROUP BY group_id, team;
```

Result: `DELETE changes: 2`, `INSERT changes: 4`.

---

## Verification

```sql
SELECT team, played, won, drawn, lost, gf, ga, gd, points
  FROM wc_group WHERE group_id='H'
  ORDER BY points DESC, gd DESC, gf DESC, team ASC;
```

| Team | P | W | D | L | GF | GA | GD | Pts |
|---|---|---|---|---|---|---|---|---|
| Saudi Arabia | 1 | 0 | 1 | 0 | 1 | 1 | 0 | **1** |
| Uruguay | 1 | 0 | 1 | 0 | 1 | 1 | 0 | **1** |
| Cape Verde Islands | 1 | 0 | 1 | 0 | 0 | 0 | 0 | **1** |
| Spain | 1 | 0 | 1 | 0 | 0 | 0 | 0 | **1** |

All four Group H teams present, all four on 1 point. Cross-group sanity check:

```sql
SELECT group_id, COUNT(*) AS results,
       (SELECT COUNT(DISTINCT team) FROM wc_group wg WHERE wg.group_id = wr.group_id) AS teams
  FROM wc_results wr GROUP BY group_id ORDER BY group_id;
```

| group_id | results | teams |
|---|---|---|
| A | 2 | 4 |
| B | 2 | 4 |
| C | 2 | 4 |
| D | 2 | 4 |
| E | 2 | 4 |
| F | 2 | 4 |
| G | 2 | 4 |
| **H** | **2** | **4** |
| I | 1 | 2 |

Group H now matches A-G shape. Group I is intentionally short (MD1 mid-window).

---

## Files touched in `jubilant-bassoon`

Only this outbox file — D1 mutations were direct via Cloudflare MCP. Smoke unaffected, SW_VERSION unchanged. No code commit needed in jubilant-bassoon.

## Carry-forward for the `field-relay-nba` session

Per the spec's diagnosis ask:

1. Tighten the `state === "final"` filter to also accept `state` from the `home_score`/`away_score` populated path when the scheduled match end has clearly passed (the relay should not need the upstream's `status.short` to flip to `FT` to record a result — once a posted score appears on a stale fixture, that IS the result).
2. Add a 30-minute post-match-end grace re-poll for any same-day WC fixture whose state is still `live` 30+ minutes past the scheduled end. One additional Odds-API-free fetch per fixture is cheap insurance against the cron-window miss.
3. Strip the `{cache:"no-store"}` from `runWCTournamentProjections` (covered separately in `outbox/cc-odds-audit-results.md` F2.1) — that defeats the edge cache AND keeps stale `state` payloads in rotation.
4. When the relay's automated ingest catches up and writes a real `football:NNNNNN` row for KSA-Uruguay, drop the `manual:wc26_ksa_uru_2026-06-15` row to avoid double-counting on a future recompute:

```sql
-- only run when the upstream re-ingest has landed
DELETE FROM wc_results WHERE game_id = 'manual:wc26_ksa_uru_2026-06-15';
-- then re-run the Group H recompute SQL block above
```
