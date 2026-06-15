# Claude Code Command — Brief Archive Write Hook

git pull. Read CLAUDE.md.

## CONTEXT

FIELD generates 12 types of AI briefs (Gemini 3.1 Flash-Lite primary via proxy,
Haiku fallback). All are ephemeral — stored in sessionStorage (client) and KV
(relay, TTL-governed). No brief text is persisted to D1 or R2. Every brief ever
generated has been lost after cache expiry.

The field-archive D1 database (cc49101c-0569-4d41-8e7a-be139cde4f26) already
has 3 tables (postseason_games, postseason_series, regular_season_games) with
May+June game data. Adding a `briefs` table to this database captures the
editorial output alongside the game data.

This is a TWO-REPO task:
- **jubilant-bassoon** (client): add `archiveBrief()` helper + wire into brief call sites
- **field-relay-nba** (relay): add `/archive/brief` POST endpoint + D1 binding + relay-side write

Relay repo: jeffunglesbee-create/field-relay-nba
Relay PAT: same as jubilant-bassoon (stored in CLAUDE.md / memory — do not hardcode)

### Just shipped today (context only, don't rebuild)

- Cape Verde name fix (7826c38, A613) — _WC_NAME_FIX module-level normalization
- WebDriverIO desktop test infra (78308af–544d558) — 12 assertions, Fix #3 selector
- June game archive — 90 games inserted into D1 via chat (no code changes)

## D1 SCHEMA

Create table in field-archive D1 (cc49101c):

```sql
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  brief_type TEXT NOT NULL,
  sport TEXT,
  game_id TEXT,
  brief_text TEXT NOT NULL,
  model TEXT,
  quality_score REAL,
  context_hash TEXT,
  word_count INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_briefs_date ON briefs(date);
CREATE INDEX IF NOT EXISTS idx_briefs_type ON briefs(brief_type, date);
```

`brief_type` enum: slate, mlb_game, wnba_game, epl_match, stakes, night_owl,
wc_tab, series_preview, championship, compound, game_ondemand

`id` format: `{brief_type}_{date}_{game_id or "all"}` — e.g., `slate_2026-06-15_all`

## TASK 1: Client-side archiveBrief helper (jubilant-bassoon)

Add a fire-and-forget helper near the journalism section of index.html:

```javascript
function archiveBrief(type, sport, gameId, text, hash) {
  if (!text || text.length < 50) return;
  const date = new Date().toISOString().slice(0, 10);
  const id = type + '_' + date + '_' + (gameId || 'all');
  fetch((typeof V2_RELAY_BASE !== 'undefined' ? V2_RELAY_BASE : 
    'https://field-relay-nba.jeffunglesbee.workers.dev') + '/archive/brief', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id, brief_type: type, date, sport, game_id: gameId,
      brief_text: text, context_hash: hash,
      word_count: text.split(/\s+/).length})
  }).catch(() => {});
}
```

CRITICAL: fire-and-forget. The `.catch(() => {})` is mandatory. The archive
write must NEVER delay or break brief display. No await, no error handling
beyond the catch.

Wire into these call sites — add the `archiveBrief()` call right after each
`sessionStorage.setItem(cacheKey, ...)` line:

1. `fetchFIELDBriefFromClaude` — type: 'slate', sport: null
2. `fetchCompoundEditorial` — type: 'compound', sport: null (covers the main brief + series + game briefs in one call)
3. `fetchMLBGameBriefFromClaude` — type: 'mlb_game', sport: 'MLB'
4. `fetchWNBAGameBriefFromClaude` — type: 'wnba_game', sport: 'WNBA'
5. `fetchEPLMatchBriefFromClaude` — type: 'epl_match', sport: 'EPL'
6. `fetchStakesBriefFromClaude` — type: 'stakes', sport from game
7. `fetchNightOwlFromClaude` — type: 'night_owl', sport from game
8. `fetchWCTabBrief` — type: 'wc_tab', sport: 'FIFA World Cup 2026'
9. `fetchGameBriefOnDemand` — type: 'game_ondemand', sport from game
10. `fetchSeriesPreviewFromClaude` — type: 'series_preview', sport from game
11. `fetchPrerenderedJournalism` — type: 'slate', sport: null (relay-served brief, archive from client too as belt-and-suspenders)

Skip `buildFIELDBriefStatic` and `buildEPLMatchBriefStatic` — those are
static fallbacks, not AI-generated. Not worth archiving.

For compound editorial: the response is JSON with `{brief, series, game_briefs}`.
Archive the main `brief` field. Series and game_briefs are separate archive
entries if present — iterate and archive each.

## TASK 2: Relay endpoint (field-relay-nba)

Clone field-relay-nba if not already cloned (use the PAT from CLAUDE.md git config).

### 2a: Add D1 binding to wrangler.jsonc

Add the field-archive D1 binding:
```json
"d1_databases": [
  { "binding": "FIELD_ARCHIVE", "database_name": "field-archive", "database_id": "cc49101c-0569-4d41-8e7a-be139cde4f26" }
]
```

Check if there's already a d1_databases array — if so, append to it.

### 2b: Create the briefs table

Run the CREATE TABLE SQL from the schema section above via the D1 binding
at worker startup or via a one-time migration. Simplest: add an `ensureBriefsTable`
function that runs CREATE TABLE IF NOT EXISTS on first request (idempotent).

### 2c: Add POST /archive/brief route

```javascript
if (url.pathname === '/archive/brief' && request.method === 'POST') {
  const body = await request.json();
  const {id, brief_type, date, sport, game_id, brief_text, context_hash, word_count} = body;
  if (!id || !brief_type || !date || !brief_text) {
    return new Response('Missing required fields', {status: 400});
  }
  await env.FIELD_ARCHIVE.prepare(
    `INSERT INTO briefs (id, date, brief_type, sport, game_id, brief_text, model, context_hash, word_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET brief_text=excluded.brief_text, word_count=excluded.word_count`
  ).bind(id, date, brief_type, sport || null, game_id || null, brief_text,
    null, context_hash || null, word_count || null).run();
  return new Response('ok', {status: 200, headers: corsHeaders});
}
```

The `model` field: the proxy sets `X-FIELD-Model` response header. The client
can read this from the fetch response and pass it through. If too complex for
this pass, leave model as null — we can backfill from relay logs later.

### 2d: Relay-side write in journalism cron

In `handleJournalismCycle` (or wherever the cron writes the slate brief to
FIELD_JOURNALISM KV), add a D1 write immediately after the KV put:

```javascript
// After: await env.FIELD_JOURNALISM.put('tonight', briefText, {expirationTtl: 3600});
// Add:
try {
  const date = new Date().toISOString().slice(0, 10);
  await env.FIELD_ARCHIVE.prepare(
    `INSERT INTO briefs (id, date, brief_type, sport, brief_text, model, word_count)
     VALUES (?, ?, 'slate', null, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET brief_text=excluded.brief_text`
  ).bind('slate_' + date + '_cron', date, briefText, 'gemini-3.1-flash-lite',
    briefText.split(/\s+/).length).run();
} catch(e) { /* archive failure must not break journalism */ }
```

### 2e: CORS

Ensure the `/archive/brief` route returns proper CORS headers for the
jubilant-bassoon origin. Check existing CORS patterns in the relay.

## TASK 3: Smoke assertion (jubilant-bassoon)

Add assertion A614:
```javascript
assert('A614 — Brief archive: archiveBrief() fire-and-forget helper wired to brief call sites',
  html.includes('function archiveBrief(') &&
  html.includes('/archive/brief') &&
  html.includes('.catch(() => {})'),
  'archiveBrief() persists AI-generated brief text to D1 via relay POST. Fire-and-forget — must never block UI.');
```

## RULES

- Single-concern commits (Rule 7). Separate commits for: D1 schema, relay endpoint,
  relay cron write, client helper, client wiring, smoke assertion.
- Smoke gate: 656/0 must hold or increase after jubilant-bassoon commits.
- SW_VERSION: bump on the index.html commit (client helper + wiring).
- The relay has its own CI — push relay commits separately.
- DO NOT modify the proxy worker (field-claude-proxy). The write hook goes in
  the relay and client, not the proxy.

## OUTPUT

Write findings to outbox/cc-brief-archive-2026-06-15.md:
- Pre-work smoke count
- Each task: what was created/modified, any issues
- Post-work smoke count for jubilant-bassoon
- Relay commit hashes
- Confirmation that D1 table was created

Run smoke. Push both repos when complete.
