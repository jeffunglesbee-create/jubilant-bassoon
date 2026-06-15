# Claude Code Command — Game Archive D1 + Relay Endpoints

git pull. Read CLAUDE.md. Read docs/ADR-002-CONTEXT.md (data sourcing rules).

Write all findings to outbox/cc-archive-d1-2026-06-15.md.

## CONTEXT

D1 database `field-archive` (ID: cc49101c-0569-4d41-8e7a-be139cde4f26) has been
created with 3 tables: postseason_games, postseason_series, regular_season_games.
39 rows already seeded (19 postseason + 20 regular). 129 regular season rows
remaining in docs/seed_reg_chunk_1.sql and docs/seed_reg_chunk_2.sql.

This command completes the archive infrastructure: seed remaining data, add relay
endpoints, wire client-side consumers, remove dead entries from index.html.

## ADR-002 STATUS: CLEAN

This is factual game data — scores, teams, dates, editorial notes. No drama scores,
no interest levels, no recommendations cross the wire. Same pattern as existing WC D1 data.

## TASK 1: Finish D1 Seed

Execute the remaining SQL files against field-archive D1:
- docs/seed_reg_chunk_1.sql (chunks 1: ~50 rows)
- docs/seed_reg_chunk_2.sql (chunks 2: ~49 rows)

Method: Use wrangler d1 execute or the Cloudflare API. The database binding
needs to be added to field-relay-nba wrangler.toml:

```toml
[[d1_databases]]
binding = "ARCHIVE_DB"
database_name = "field-archive"
database_id = "cc49101c-0569-4d41-8e7a-be139cde4f26"
```

Also seed the postseason_series summary table:

```sql
INSERT OR REPLACE INTO postseason_series (series_key, sport, round, season, higher_seed, lower_seed, winner, result, mvp, narrative) VALUES
('nba-ecf-2026', 'NBA', 'East CF', 2026, 'New York Knicks', 'Cleveland Cavaliers', 'New York Knicks', '4-0', 'Jalen Brunson', 'NYK swept CLE. Brunson 38pts in G1 comeback, named ECF MVP. First Finals since 1999.'),
('nba-wcf-2026', 'NBA', 'West CF', 2026, 'Oklahoma City Thunder', 'San Antonio Spurs', 'San Antonio Spurs', '4-3', NULL, 'SAS won G7 on the road. Wembanyama 28.2 PPG, 3.7 BPG. Road teams won 4 straight. OKC was 64-18 defending champs.'),
('nhl-ecf-2026', 'NHL', 'East CF', 2026, 'Carolina Hurricanes', 'Montreal Canadiens', 'Carolina Hurricanes', '4-1', NULL, 'CAR won 4-1 including 3 OT wins. First SCF since 2006. Andersen shutout in G4.'),
('nhl-wcf-2026', 'NHL', 'West CF', 2026, 'Vegas Golden Knights', 'Colorado Avalanche', 'Vegas Golden Knights', '4-0', NULL, 'VGK swept COL. Outscored 14-7. Stone scored G4 winner.'),
('nhl-east-semis-2026', 'NHL', 'East Semis', 2026, 'Montreal Canadiens', 'Buffalo Sabres', 'Montreal Canadiens', '4-3', NULL, 'MTL won G7 after BUF won G6 8-3 to force it.');
```

Verify: `SELECT COUNT(*) FROM postseason_games` = 19, `SELECT COUNT(*) FROM regular_season_games` >= 149, `SELECT COUNT(*) FROM postseason_series` = 5.

## TASK 2: Relay Endpoints (field-relay-nba)

Add these routes to the relay worker. Bind ARCHIVE_DB in wrangler.toml.

### GET /archive/series/:key
Returns full series with all games. Example: /archive/series/nba-wcf-2026

```javascript
// Returns: { series: {...}, games: [...] }
const series = await env.ARCHIVE_DB.prepare('SELECT * FROM postseason_series WHERE series_key = ?').bind(key).first();
const games = await env.ARCHIVE_DB.prepare('SELECT * FROM postseason_games WHERE series_key = ? ORDER BY game_number').bind(key).all();
return Response.json({ ok: true, series, games: games.results });
```

### GET /archive/last-meeting?home=X&away=Y
Most recent game between two teams (checks both home/away permutations).

```javascript
const game = await env.ARCHIVE_DB.prepare(
  `SELECT * FROM regular_season_games
   WHERE (home LIKE ? AND away LIKE ?) OR (home LIKE ? AND away LIKE ?)
   ORDER BY date DESC LIMIT 1`
).bind(`%${home}%`, `%${away}%`, `%${away}%`, `%${home}%`).first();
```

### GET /archive/date/:iso
All games on a date (both tables).

### GET /archive/tagged/:tag
All games with a specific tag (uses JSON LIKE on tags field).

### GET /archive/sport/:sport
All games for a sport (e.g., /archive/sport/EPL).

All endpoints return `{ ok: true, ... }` with CORS headers matching existing relay pattern.

## TASK 3: Client-Side Consumers (index.html)

Add fetch/cache functions:

```javascript
// Archive cache (sessionStorage, 30 min TTL)
async function fetchSeriesArchive(seriesKey) {
  const cacheKey = `field_archive_series_${seriesKey}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) { const c = JSON.parse(cached); if (Date.now() - c.ts < 1800000) return c.data; }
  const r = await fetch(`${RELAY_BASE}/archive/series/${seriesKey}`);
  if (!r.ok) return null;
  const data = await r.json();
  sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
  return data;
}

async function fetchLastMeeting(teamA, teamB) {
  const r = await fetch(`${RELAY_BASE}/archive/last-meeting?home=${encodeURIComponent(teamA)}&away=${encodeURIComponent(teamB)}`);
  if (!r.ok) return null;
  return r.json();
}
```

## TASK 4: Wire into Journalism Layer

Update `buildChampionshipContext()` to fetch series archive for the current matchup's path-to-finals. When building a Finals brief, inject:
- "The Spurs who won G7 on the road at OKC (Wembanyama 28.2 PPG)" for SAS context
- "The Knicks who swept Cleveland (Brunson ECF MVP)" for NYK context

This is an async enrichment — don't block rendering on it. Fire the fetch in parallel with other journalism prefetches.

## TASK 5: Remove Dead Entries from index.html

After relay endpoints are live and verified:
1. Remove all May schedule entries from index.html (the data now lives in D1)
2. Keep the schedule array structure intact for June+ entries
3. Run smoke — should still be 652/0 (entries were data, not assertion targets)

## TASK 6: Betting Dead Code (from original CC command)

Execute Tasks 2-7 from docs/CC-CMD-2026-06-15-dead-code.md (betting CSS, dead functions, dead variables, dead localStorage, stale comments, gray items). These are independent of the archive work.

## INSTRUCTIONS

1. This is a two-repo task: jubilant-bassoon (client) + field-relay-nba (relay).
2. Relay changes first (D1 binding + endpoints), then client changes.
3. Smoke after each commit in jubilant-bassoon. Baseline: 652/0.
4. Add A610 smoke: archive relay endpoints respond (probe /archive/series/nba-ecf-2026).
5. Write manifest to outbox/cc-archive-d1-2026-06-15.md.
6. Push both repos when complete.

## DATABASE REFERENCE

- Database: field-archive
- ID: cc49101c-0569-4d41-8e7a-be139cde4f26
- Region: ENAM
- Tables: postseason_games, postseason_series, regular_season_games
- Current rows: 19 postseason, 20 regular, 0 series summaries
- Seed files: docs/seed_reg_chunk_1.sql, docs/seed_reg_chunk_2.sql
