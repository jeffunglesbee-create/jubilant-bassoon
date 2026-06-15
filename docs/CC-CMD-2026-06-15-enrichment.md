# Claude Code Command — Backfill Enrichment: Context Maximization (Items 1-4)

git pull. Read CLAUDE.md.

## CONTEXT

The brief archive system is live. The backfill engine runs during dead hours
(UTC 2:00-10:00) and reconstructs briefs for ~51 archived dates. The quality
of reconstructed briefs is bounded by the context available in D1.

This task enriches the D1 field-archive (cc49101c) with contextual data from
four sources so the backfill engine produces higher-quality briefs. All inserts
use the existing briefs table with source='enrichment' and dedicated brief_type
values. No schema changes needed.

D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26 (Cloudflare MCP)
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4 (Cloudflare MCP)
Relay: https://field-relay-nba.jeffunglesbee.workers.dev (curl accessible)
Relay raw files: https://raw.githubusercontent.com/jeffunglesbee-create/field-relay-nba/main/src/

## TASK 1 — KV Harvest (TIME-SENSITIVE — do first)

Probe relay endpoints via curl to capture live briefs before KV TTL expires.

```bash
# Slate brief
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/journalism/tonight

# WC tournament brief
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/wc/brief/tournament
```

For each successful response containing brief text:
- Insert to briefs table via Cloudflare MCP D1 query
- brief_type='slate' or 'wc_tab', source='kv_harvest'
- date=today (2026-06-15), model='gemini-3.1-flash-lite'
- word_count=text.split(/\s+/).length

Skip if response is empty, null, error, or placeholder text.
Skip the slate brief if slate_2026-06-15_cron already exists (it does — the
cron write already captured today's brief).

## TASK 2 — Narrative Context Modules → D1

Fetch relay source files. field-relay-nba is a PRIVATE repo — raw.githubusercontent.com
won't work. Use Cloudflare MCP `workers_get_worker_code` tool to read the deployed
worker source (worker name: "field-relay-nba"). The source bundle includes
src/finals-context.js and src/wc-team-context.js. If workers_get_worker_code
returns a bundled single file, search for the relevant exports/constants within it.

### 2a: finals-context.js

Parse the NBA_FINALS_2026_CONTEXT and SCF_2026_CONTEXT arrays (or equivalent
exports). These are arrays of strings containing source-cited narrative facts.

Insert two rows:
```sql
INSERT INTO briefs (id, date, brief_type, sport, game_id, brief_text, source, word_count)
VALUES ('narrative_nba_finals_2026', '2026-06-03', 'narrative_context', 'NBA',
  'nba_finals_2026', ?, 'enrichment', ?)
ON CONFLICT(id) DO NOTHING;

INSERT INTO briefs (id, date, brief_type, sport, game_id, brief_text, source, word_count)
VALUES ('narrative_scf_2026', '2026-06-03', 'narrative_context', 'NHL',
  'scf_2026', ?, 'enrichment', ?)
ON CONFLICT(id) DO NOTHING;
```

The brief_text should be the full concatenated array content (join with newlines).

### 2b: wc-team-context.js

Parse the WC_TEAM_CONTEXT object. It's keyed by country code with narrative
blocks per team. Insert one row per team:

```sql
INSERT INTO briefs (id, date, brief_type, sport, game_id, brief_text, source, word_count)
VALUES ('narrative_wc_team_{code}', '2026-06-11', 'narrative_context',
  'FIFA World Cup 2026', 'wc_team_{code}', ?, 'enrichment', ?)
ON CONFLICT(id) DO NOTHING;
```

Where {code} is the country code key (e.g., 'usa', 'esp', 'bra').
Expect ~48 rows (one per WC team).

Note: These JS files export objects/arrays. Parse them with Node.js —
require() or dynamic import, or regex extraction if the module format
doesn't allow direct import. Use whichever approach works.

## TASK 3 — WC matchupNotes from wc26Raw

Parse const wc26Raw (line ~32263 in index.html) and extract all game objects
with non-null matchupNote fields.

For each WC game with a matchupNote:
```sql
INSERT INTO briefs (id, date, brief_type, sport, game_id, brief_text, source, word_count)
VALUES ('wc_matchup_{_id}', '{date from start_time}', 'wc_matchup',
  'FIFA World Cup 2026', '{_id}', '{matchupNote}', 'enrichment', ?)
ON CONFLICT(id) DO NOTHING;
```

The _id field on each WC game object (e.g., 'wc26_g15_esp_cpv') is the game_id.
Extract the date from start_time (first 10 chars).

Note: wc26Raw is inside a function scope — you'll need to extract it via
regex or by finding the array boundaries (starts at "const wc26Raw=[" and
ends at the matching "];" — same technique used by the June archive extraction
earlier today).

Expected: ~30-40 rows (not all 72 games have matchupNotes).

## TASK 4 — WC Standings Snapshots

Query the wc2026 D1 database for current group standings:

```sql
-- Query against wc2026 D1 (f26669de), NOT field-archive
SELECT group_id, team, played, won, drawn, lost, gf, ga, gd, points
FROM wc_group ORDER BY group_id, points DESC, gd DESC, gf DESC;
```

Format standings as readable text per group:
"Group A: 1. Mexico (3pts, +2 GD) 2. South Korea (3pts, +1) 3. Czechia (0pts, -1) 4. South Africa (0pts, -2)"

Insert one row per group (12 groups A-L):
```sql
INSERT INTO briefs (id, date, brief_type, sport, game_id, brief_text, source, word_count)
VALUES ('standings_wc_group_{letter}_2026-06-15', '2026-06-15', 'standings_snapshot',
  'FIFA World Cup 2026', 'wc_group_{letter}', '{formatted standings}', 'enrichment', ?)
ON CONFLICT(id) DO NOTHING;
```

Note: Only groups with matches played will have data. Groups G-L may be
empty or partial (opened today/tomorrow). Insert whatever is available.

Apply _WC_NAME_FIX normalization to team names from D1:
Czech Republic→Czechia, Cape Verde Islands→Cape Verde, USA→United States,
Turkey→Türkiye, Bosnia & Herzegovina→Bosnia and Herzegovina,
Cote D'Ivoire→Ivory Coast, Korea Republic→South Korea, Curacao→Curaçao

## RULES

- DO NOT modify index.html, sw.js, smoke.js, or any source file.
- All work is D1 inserts via Cloudflare MCP + curl fetches. Zero commits to jubilant-bassoon.
- ON CONFLICT DO NOTHING on all inserts — never overwrite existing data.
- source='enrichment' on every insert.
- If a curl fetch fails or returns empty, skip that item and note it. Do not block on failures.
- Log what was inserted: count per task, any skips, any errors.

## OUTPUT

Write a summary to outbox/cc-enrichment-2026-06-15.md with:
- Per-task: rows inserted, rows skipped, any errors
- Total enrichment rows added to D1
- Any items that need chat follow-up (e.g., KV already expired)

Commit only the outbox file. Push when complete.
