# Backfill Enrichment — Execution Log

**Spec:** `docs/CC-CMD-2026-06-15-enrichment.md`
**D1:** `field-archive` (cc49101c-0569-4d41-8e7a-be139cde4f26)
**Source field:** `'enrichment'` on every insert. `ON CONFLICT(id) DO NOTHING`.
**Pre-state:** `briefs` row count had `slate_2026-06-15_cron` (live) +
  `slate_2026-06-08_backfill` already present. No prior `source='enrichment'`
  rows.

---

## Total enrichment rows inserted: **130**

| brief_type          | rows | source       |
|---------------------|------|--------------|
| `narrative_context` |   50 | `enrichment` |
| `wc_matchup`        |   72 | `enrichment` |
| `standings_snapshot`|    8 | `enrichment` |

Verification query:
```sql
SELECT brief_type, source, COUNT(*) AS n
  FROM briefs WHERE source='enrichment'
  GROUP BY brief_type, source
  ORDER BY brief_type;
-- narrative_context | enrichment | 50
-- standings_snapshot| enrichment |  8
-- wc_matchup        | enrichment | 72
```

---

## Task 1 — KV Harvest ⏸ BLOCKED + SKIP per spec

### Slate brief (`slate_2026-06-15_cron`) — SKIPPED PER SPEC

Spec explicitly says: *"Skip the slate brief if `slate_2026-06-15_cron` already
exists (it does — the cron write already captured today's brief)."*

Pre-state verification:
```sql
SELECT id, brief_type, date, word_count, source FROM briefs
  WHERE id='slate_2026-06-15_cron';
-- slate_2026-06-15_cron | slate | 2026-06-15 | 222 | cron
```

The cron path captured it; no harvest needed. 0 rows added.

### WC tournament brief — BLOCKED

`curl https://field-relay-nba.jeffunglesbee.workers.dev/wc/brief/tournament`
returns:
```
Host not in allowlist: field-relay-nba.jeffunglesbee.workers.dev.
Add this host to your network egress settings to allow access.
HTTP 403
```

`WebFetch` against the same URL returns `403 Forbidden` (proxy egress
policy). The Cloudflare MCP KV tools (`kv_namespace_get`, `kv_namespaces_list`)
manage namespace metadata only — there is no MCP tool to read a KV value
directly. KV namespace `field-journalism` (`83edf19398da4ed184a42746cb85c9d7`)
holds the brief at key `wc:brief:tournament`, but value reads require an
authenticated relay call or a wrangler-based read, neither available from
this sandbox.

**Carry-forward.** When the next session has either (a) outbound egress to
`*.workers.dev` or (b) a KV-value-read MCP tool, harvest:

```bash
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/wc/brief/tournament \
  -o /tmp/wc_tab_brief.json
```

then insert:

```sql
INSERT INTO briefs
  (id, date, brief_type, sport, brief_text, source, model, word_count)
VALUES
  ('wc_tab_2026-06-15_harvest', '2026-06-15', 'wc_tab',
   'FIFA World Cup 2026', ?, 'kv_harvest', 'gemini-3.1-flash-lite', ?)
ON CONFLICT(id) DO NOTHING;
```

---

## Task 2 — Narrative Context Modules → D1 ✅ COMPLETE (50 rows)

### 2a — `finals-context.js` (2 rows)

Worker source for `field-relay-nba` pulled via Cloudflare MCP
`workers_get_worker_code`. The bundle is 10,690 lines / 439 KB; the two
arrays sit at lines 4152 (NBA) and 4162 (NHL). Both are
`var X = [ ... ].join("\n")` patterns. Extracted via Node `eval()` after
stubbing relay-only helpers.

| id | date | sport | game_id | words |
|---|---|---|---|---|
| `narrative_nba_finals_2026` | 2026-06-03 | NBA | `nba_finals_2026` | 213 |
| `narrative_scf_2026`        | 2026-06-03 | NHL | `scf_2026`        | 417 |

`brief_text` is the literal `join("\n")` of each array — 8 lines for NBA,
10 lines for SCF. Source-cited narrative facts; identical to what the
relay's `buildFinalsContextBlock()` injects into the slate prompt.

### 2b — `wc-team-context.js` (48 rows)

`WC_TEAM_CONTEXT` is a single object literal at bundle line 903.
Brace-tracking scan with string/escape handling extracted the literal,
then `eval()` parsed it. 48 keys (3-letter FIFA codes). For each team,
the `brief_text` is a composed narrative:

```
{displayName} (FIFA {fifaCode}) — Group {group}
- FIFA rank: {fifaRank}
- WC appearances: {wcAppearances}
- Best WC result: {bestResult}
- Manager: {manager}
- Key players: {keyPlayers.join(', ')}
- Qualifying: {qualifyingNote}
- DEBUT: first World Cup appearance     (if debutFlag)
- Guardrail: {guardrail}                (if present)
- Narrative: {narrativeNote}
```

Inserted via 2 chunks × 24 rows = 48 (4 params × 24 = 96, just under D1's
~100-variable cap — the original 192-param batch failed with SQLITE
`too many SQL variables`).

id format: `narrative_wc_team_{lowercase_3letter}`
date: `2026-06-11` (WC opener)
game_id: `wc_team_{lowercase_3letter}`

48 / 48 rows inserted; 0 conflicts.

---

## Task 3 — WC matchupNotes from `wc26Raw` ✅ COMPLETE (72 rows)

`wc26Raw` array extracted from `index.html` line 32318 with the same
brace-tracking scan. Stubbed `resolveBundle`, `fmtTime` in a Node sandbox
and `eval()` parsed the literal. Of 72 game objects, **all 72** had a
`matchupNote` — the spec's expected "30-40" was conservative; the array is
fully populated.

Each row:
- id: `wc_matchup_{_id}`
- date: `start_time.slice(0,10)`
- game_id: `_id` (e.g. `wc26_g15_esp_cpv`)
- brief_text: `matchupNote` verbatim
- word_count: counted

Inserted via 4 chunks × 18 rows = 72 (5 params × 18 = 90 vars/chunk).
0 conflicts.

---

## Task 4 — WC Standings Snapshots ✅ COMPLETE (8 rows)

Source: `wc2026` D1 (`f26669de-e772-4b56-a6d1-f8fdea08a4d4`).

```sql
SELECT group_id, team, played, won, drawn, lost, gf, ga, gd, points
  FROM wc_group
  ORDER BY group_id, points DESC, gd DESC, gf DESC;
```

Returned 28 rows across groups A-H. Groups I, J, K, L are absent — those
groups open later (Day 6-7 of the tournament) and no matches have been
played yet, so `wc_group` has no rows for them. Per spec: *"Only groups
with matches played will have data … Insert whatever is available."*

`_WC_NAME_FIX` applied:
- `Czech Republic` → `Czechia` (Group A)
- `USA` → `United States` (Group D)
- `Bosnia & Herzegovina` → `Bosnia and Herzegovina` (Group B)
- `Cape Verde Islands` → `Cape Verde` (Group H)

The other map entries (`Turkey`, `Cote D'Ivoire`, `Korea Republic`,
`Curacao`) did not appear — `wc_group` already stores the post-normalization
form (`Türkiye`, `Ivory Coast`, `South Korea`, `Curaçao`).

Formatting matches the spec literal:
```
Group A: 1. Mexico (3pts, +2 GD) 2. South Korea (3pts, +1 GD)
         3. Czechia (0pts, -1 GD) 4. South Africa (0pts, -2 GD)
```

All 8 snapshots:

| group | text |
|---|---|
| A | Group A: 1. Mexico (3pts, +2 GD) 2. South Korea (3pts, +1 GD) 3. Czechia (0pts, -1 GD) 4. South Africa (0pts, -2 GD) |
| B | Group B: 1. Bosnia and Herzegovina (1pts, 0 GD) 2. Canada (1pts, 0 GD) 3. Qatar (1pts, 0 GD) 4. Switzerland (1pts, 0 GD) |
| C | Group C: 1. Scotland (3pts, +1 GD) 2. Brazil (1pts, 0 GD) 3. Morocco (1pts, 0 GD) 4. Haiti (0pts, -1 GD) |
| D | Group D: 1. United States (3pts, +3 GD) 2. Australia (3pts, +2 GD) 3. Türkiye (0pts, -2 GD) 4. Paraguay (0pts, -3 GD) |
| E | Group E: 1. Germany (3pts, +6 GD) 2. Ivory Coast (3pts, +1 GD) 3. Ecuador (0pts, -1 GD) 4. Curaçao (0pts, -6 GD) |
| F | Group F: 1. Sweden (3pts, +4 GD) 2. Japan (1pts, 0 GD) 3. Netherlands (1pts, 0 GD) 4. Tunisia (0pts, -4 GD) |
| G | Group G: 1. Belgium (1pts, 0 GD) 2. Egypt (1pts, 0 GD) **(2/4 teams — Iran, New Zealand not yet played)** |
| H | Group H: 1. Cape Verde (1pts, 0 GD) 2. Spain (1pts, 0 GD) **(2/4 teams — Saudi Arabia, Uruguay not yet played)** |

id format: `standings_wc_group_{a-h}_2026-06-16` (snapshot date = today,
per spec's literal template). date column also `2026-06-16`.

8/8 rows inserted; 0 conflicts. Groups I-L can be backfilled in subsequent
daily runs as their matches land in `wc_group`.

---

## Items needing chat follow-up

1. **WC tournament brief KV harvest (Task 1).** Egress blocked from this
   sandbox. Re-run with relay access or a KV-value MCP tool — payload-ready
   INSERT in the Task 1 section above.
2. **Groups I-L standings.** `wc_group` is empty for these. Re-run the
   Task 4 query daily; expect a row to appear once each group plays its
   opener (Group I opens June 16-17, J on June 16-17, K on June 17, L on
   June 17). The `ON CONFLICT(id) DO NOTHING` on a date-specific id means
   re-running the same day is safe — to capture *today's* snapshot vs.
   *yesterday's*, vary the id date.

---

## Files touched in `jubilant-bassoon`

Only one — this outbox file. No source-file changes. Per spec: "Commit only
the outbox file."

Smoke (657 / 0) unchanged; SW_VERSION `2026-06-15d` unchanged.

## ADR-002 status

CLEAN. All inserted text is sourced from already-CLEAN content:
- Narrative context = relay's `finals-context.js` and `wc-team-context.js`
  (source-cited factual background)
- matchupNote = FIELD's proprietary editorial copy (already shipped on
  every card)
- Standings = aggregate match outcomes from `wc_group`

No drama scoring, no composite interest levels, no recommendations.
