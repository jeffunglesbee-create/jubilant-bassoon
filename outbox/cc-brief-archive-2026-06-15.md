# Brief Archive — Execution Log

**Date:** 2026-06-15
**Spec:** `docs/CC-CMD-2026-06-15-brief-archive.md`
**Pre-state:** HEAD post `ae4d615`, smoke `656/0`, SW_VERSION `2026-06-15c`.
**Session scope:** write access to `jeffunglesbee-create/jubilant-bassoon` only.
`field-relay-nba` is a separate repo and is **out of scope** for this session
— same constraint flagged in `outbox/cc-archive-d1-2026-06-15.md`.

---

## ✅ D1 schema — created via Cloudflare MCP

Database `field-archive` (id `cc49101c-0569-4d41-8e7a-be139cde4f26`).

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

Verification: `SELECT name FROM sqlite_master WHERE tbl_name='briefs'` returns
`briefs`, `idx_briefs_date`, `idx_briefs_type`, `sqlite_autoindex_briefs_1` —
table + 2 explicit indexes + the PK autoindex.

---

## ✅ Task 1 — Client `archiveBrief()` helper + wiring

### Helper

Placed at the top of the journalism section (just above
`// ── FIELD Journalism Tab` line 11871, now 11904 post-insert):

```js
function archiveBrief(type, sport, gameId, text, hash) {
  if (!text || text.length < 50) return;
  const date = new Date().toISOString().slice(0, 10);
  const id = type + '_' + date + '_' + (gameId || 'all');
  const base = (typeof V2_RELAY_BASE !== 'undefined')
    ? V2_RELAY_BASE : 'https://field-relay-nba.jeffunglesbee.workers.dev';
  fetch(base + '/archive/brief', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      id, brief_type: type, date,
      sport: sport || null,
      game_id: gameId || null,
      brief_text: text,
      context_hash: hash || null,
      word_count: text.split(/\s+/).length,
    }),
  }).catch(() => {});
}
```

Fire-and-forget contract enforced — no `await`, no `.then(handler)` on
success, the `.catch(() => {})` swallows every network/parse failure.
Min length 50 chars rejects skeleton placeholders and dev stubs.

### Wiring — 20 archive call sites across 10 brief functions

| # | Spec function | Type | Call sites | Notes |
|---|---|---|---|---|
| 1 | `fetchFIELDBriefFromClaude` | `slate` | 26281, 26314, 26406 | Relay-prerendered, compound-borrowed, direct-Haiku paths |
| 2 | `fetchCompoundEditorial` | `compound` | 23791, 23797 | Retry pass + main; main also iterates `result.series[]` → `series_preview` and `result.game_briefs{}` → `game_ondemand` |
| 3 | `fetchMLBGameBriefFromClaude` renderer | `mlb_game` | 26740, 26750 | KV-prerendered + direct |
| 4 | `fetchWNBAGameBriefFromClaude` renderer | `wnba_game` | 26838, 26848 | KV-prerendered + direct |
| 5 | `fetchEPLMatchBriefFromClaude` | `epl_match` | 27437 | Direct path |
| 6 | `fetchStakesBriefFromClaude` renderer | `stakes` | 26992, 27002 | KV-prerendered + direct |
| 7 | `fetchNightOwlFromClaude` renderer | `night_owl` | 35153 | Final renderCard write |
| 8 | `fetchWCTabBrief` | `wc_tab` | 27992 | Journalism Queue poll-result path |
| 9 | `fetchGameBriefOnDemand` | `game_ondemand` | 29079, 29103 | Queue poll-result + direct |
| 10 | `fetchSeriesPreviewFromClaude` renderers | `series_preview` | 24042, 24058 | Big-game inline + small-game placeholder |
| 11 | `fetchPrerenderedJournalism` | `slate` | (#1 path 26281) | Covered indirectly — its `data.brief` flows into `relayJournalism.brief` in `fetchFIELDBriefFromClaude`, which calls `archiveBrief('slate', …)`. Belt-and-suspenders per spec. |

For each, the archive call sits **immediately after** the
`sessionStorage.setItem(cacheKey, …)` line, wrapped in
`try { … } catch(_) {}` so even an unexpected ReferenceError inside the
archive call would not surface to the user.

Skipped per spec: `buildFIELDBriefStatic`, `buildEPLMatchBriefStatic` (static
fallbacks, not AI-generated).

### SW_VERSION

`2026-06-15c` → `2026-06-15d` in both `index.html` and `sw.js`.

---

## ✅ Task 3 — Smoke assertion A614

```js
assert('A614 — Brief archive: archiveBrief() fire-and-forget helper wired to brief call sites',
  html.includes('function archiveBrief(') &&
  html.includes('/archive/brief') &&
  html.includes('.catch(() => {})') &&
  /archiveBrief\('slate'/.test(html) &&
  /archiveBrief\('compound'/.test(html) &&
  /archiveBrief\('mlb_game'/.test(html) &&
  /archiveBrief\('wnba_game'/.test(html) &&
  /archiveBrief\('epl_match'/.test(html) &&
  /archiveBrief\('stakes'/.test(html) &&
  /archiveBrief\('night_owl'/.test(html) &&
  /archiveBrief\('wc_tab'/.test(html) &&
  /archiveBrief\('series_preview'/.test(html) &&
  /archiveBrief\('game_ondemand'/.test(html),
  'archiveBrief() persists AI-generated brief text to D1 via relay POST /archive/brief. Fire-and-forget — must never block UI. All 11 brief types covered (slate covers #1+#11).');
```

Pinned: helper presence + `/archive/brief` URL substring + fire-and-forget
contract + all 10 distinct `type` strings present somewhere as an
`archiveBrief()` first argument. Together with the visible call-count of 20
across the file, this guards against silent regression where someone replaces
a brief function and forgets the archive hook.

Smoke: 656 → **657 / 0**. Units 66 / 0.

---

## ⏸ Task 2 — Relay endpoint (carry-forward for `field-relay-nba` session)

Out of session scope. Below is everything the relay-session CC needs —
copy-paste ready.

### 2a — `wrangler.jsonc`

Append to the `d1_databases` array (or add it if absent):

```jsonc
{
  "binding": "FIELD_ARCHIVE",
  "database_name": "field-archive",
  "database_id": "cc49101c-0569-4d41-8e7a-be139cde4f26"
}
```

### 2b — `ensureBriefsTable` idempotent migration

The table is **already created** via Cloudflare MCP D1 query (see top of this
file). The relay does not need to run any migration. If a defensive
`ensureBriefsTable()` is desired anyway:

```js
let _briefsReady = false;
async function ensureBriefsTable(env) {
  if (_briefsReady) return;
  await env.FIELD_ARCHIVE.prepare(`
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
    )`).run();
  _briefsReady = true;
}
```

### 2c — `POST /archive/brief` route

```js
if (url.pathname === '/archive/brief' && request.method === 'POST') {
  await ensureBriefsTable(env);
  const body = await request.json();
  const { id, brief_type, date, sport, game_id, brief_text,
          context_hash, word_count } = body;
  if (!id || !brief_type || !date || !brief_text) {
    return new Response('Missing required fields', { status: 400, headers: corsHeaders });
  }
  await env.FIELD_ARCHIVE.prepare(
    `INSERT INTO briefs
       (id, date, brief_type, sport, game_id, brief_text, model, context_hash, word_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       brief_text = excluded.brief_text,
       word_count = excluded.word_count`
  ).bind(
    id, date, brief_type,
    sport || null,
    game_id || null,
    brief_text,
    null, // model — backfill from relay-side cron path or X-FIELD-Model header later
    context_hash || null,
    word_count || null
  ).run();
  return new Response('ok', { status: 200, headers: corsHeaders });
}
```

### 2d — Relay-side write in journalism cron

In `handleJournalismCycle` (or wherever the cron writes the slate brief to
`FIELD_JOURNALISM` KV), add a D1 write immediately after the KV put:

```js
// After: await env.FIELD_JOURNALISM.put('tonight', briefText, { expirationTtl: 3600 });
try {
  await ensureBriefsTable(env);
  const date = new Date().toISOString().slice(0, 10);
  await env.FIELD_ARCHIVE.prepare(
    `INSERT INTO briefs
       (id, date, brief_type, sport, brief_text, model, word_count)
     VALUES (?, ?, 'slate', null, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET brief_text = excluded.brief_text`
  ).bind(
    'slate_' + date + '_cron',
    date,
    briefText,
    'gemini-3.1-flash-lite',
    briefText.split(/\s+/).length
  ).run();
} catch (_) {
  // Archive failure must NEVER break journalism. Silent by design.
}
```

### 2e — CORS

Reuse the existing relay CORS headers (presumably set on every response via
a shared `corsHeaders` object). The `Access-Control-Allow-Origin` should
already include the deployed `jubilant-bassoon` origin since other
`/archive/*` routes ship there.

### 2f — Probe once deployed

```
curl -X POST https://field-relay-nba.jeffunglesbee.workers.dev/archive/brief \
  -H 'Content-Type: application/json' \
  -d '{"id":"smoke_test_2026-06-15","brief_type":"slate","date":"2026-06-15","brief_text":"Smoke test brief — should appear in D1.","word_count":8}'
# Expect: HTTP 200, body "ok"
```

Then via Cloudflare MCP:
```sql
SELECT id, brief_type, date, word_count, created_at FROM briefs
 WHERE id = 'smoke_test_2026-06-15';
```

---

## Files modified

| File | Change |
|---|---|
| `index.html` | `archiveBrief()` helper (1 def) + 20 wired call sites across 10 brief functions; SW_VERSION `2026-06-15c` → `2026-06-15d` |
| `sw.js` | SW_VERSION `2026-06-15c` → `2026-06-15d` |
| `smoke.js` | A614 assertion added (10 type-string regexes + helper + URL + fire-and-forget contract) |
| `outbox/cc-brief-archive-2026-06-15.md` | This file |

---

## What ships in `jubilant-bassoon`

Single commit (`feat(brief-archive): client archiveBrief + 20 wiring sites + A614`):

- `index.html` — helper + 20 hooks + SW bump
- `sw.js` — SW bump
- `smoke.js` — A614
- `outbox/cc-brief-archive-2026-06-15.md`

Smoke: 656 → **657 / 0**. JS parse OK across all 3 script blocks.

## What still needs to happen (`field-relay-nba` session)

1. Add `FIELD_ARCHIVE` D1 binding to `wrangler.jsonc`.
2. Implement the `POST /archive/brief` route (code in 2c above).
3. Wire the cron-side D1 write into `handleJournalismCycle` (code in 2d).
4. Deploy + probe per 2f.

The client side is already live with `archiveBrief()` firing on every
brief render. While the relay endpoint doesn't exist, the fetch will
404 silently and the `.catch(() => {})` swallows it — **zero user
impact during the gating window**, and once the endpoint ships every
subsequent brief is archived automatically.

## ADR-002 status

**CLEAN.** Brief text is editorial copy — AI-generated prose about
factual game state. No drama scoring, no composite interest levels, no
recommendations cross the wire. The `quality_score` column accepts the
JQ scoring result (0-300 range, same scale already used in the FIELD
Health Panel) — that's a quality metric of the brief itself, not a
classification of the game.
