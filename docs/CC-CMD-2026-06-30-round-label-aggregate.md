# CC-CMD — Round Label Display + Two-Legged Tie Aggregate (All Soccer Competitions)

**Repos:** field-relay-nba (Tasks 1-2), jubilant-bassoon (Task 3 — client)
**Date:** 2026-06-30
**Baseline:** field-relay-nba HEAD d78db9d4 · jubilant-bassoon HEAD cf583122
**Builds on:** CC-CMD-2026-06-30-tournament-multiplexer.md (MLS-side round data,
already lands in postseason_games.round), CC-CMD-2026-06-30-soccer-stats-dual-source.md

git pull both repos. Read CLAUDE.md. Run `git log --oneline -5` in each first.

Write findings to outbox/cc-round-label-aggregate-2026-06-30.md (jubilant-bassoon).

---

## BACKGROUND

Confirmed live 2026-06-30: `adaptESPNWCSoccer` (index.js:1268-1330) is the
adapter used for EVERY espnLeague-configured soccer competition via
`/v2/games` (handleV2Games:2982) — not just WC26. Despite the name, it's the
generic ESPN-soccer path: MLS-via-ESPN-fallback, EPL, La Liga, Serie A,
Bundesliga, Ligue 1, UEFA Champions League, Europa League, etc. all flow
through it. It hardcodes `round: ''` (line 1326) and never reads
`comp.notes`, even though ESPN's bare scoreboard response already carries
it for free — confirmed via live probe: a March 2026 UCL Round-of-16 fixture
(Arsenal at Bayer Leverkusen, event 401862578) returned
`notes: [{"headline": "1st Leg"}]` directly on `competitions[0]` in the
`/scoreboard` response, no extra fetch needed. The tennis adapter two
branches up (line 2943) already does exactly this:
`round: match.notes?.[0]?.headline || match.round?.displayName` — same
pattern, just never ported to the soccer adapter.

For two-legged ties specifically, ESPN's richer `/summary` endpoint
(already fetched by the existing `/soccer/xg` relay route, index.js:10343,
solely to resolve competitor names) carries a `series` object on
`header.competitions[0]` that the route currently discards entirely:

```json
"series": {
  "title": "Round of 16",
  "completed": false,
  "leg": 1,
  "totalCompetitions": 2,
  "competitors": [
    {"id": "131", "aggregateScore": 1, "team": {"$ref": "..."}},
    {"id": "359", "aggregateScore": 1, "team": {"$ref": "..."}}
  ],
  "events": [{"id": "401862578"}, {"id": "401862581"}]
}
```

`aggregateScore` is pre-computed by ESPN across both legs, correctly
handling the home/away flip between legs — no goal-summing needed
FIELD-side. `events[]` gives the event id of the OTHER leg directly.

WC26 soccer already gets a `round` value, but via a completely separate
mechanism (BSD group_name lookup, lines 3012-3044, gated to `sport ===
'wc26'` only) that overwrites `_g.round` after adaptESPNWCSoccer runs.
That block is correct and must not be touched — it's more specific
(actual group letter) than the generic notes-based fallback this CC-CMD
adds, and since it runs after and only overwrites when a BSD match is
found, the two layer correctly without conflict.

Client-side: confirmed via full-file grep of index.html (2.2MB) — zero
existing references to `.round`, `'round'`, `"round"`, `aggregateScore`,
or `totalCompetitions` anywhere. This is not "extend an existing badge to
soccer" — round-badge display does not exist for any sport today,
including the NBA/NHL series the `postseason_games.round` column has
carried since before this session.

---

## PRE-BUILD PROBES (Rule 68)

```bash
# field-relay-nba
cd field-relay-nba

# 1. Re-confirm adaptESPNWCSoccer still hardcodes round: '' (may have changed)
grep -n "function adaptESPNWCSoccer" -A 65 src/index.js | grep -n "round:"

# 2. Re-confirm tennis's notes-reading pattern (copy this exact pattern, don't invent a new one)
grep -n "match.notes" src/index.js

# 3. Re-confirm /soccer/xg's summary fetch + current discard of series data
grep -n "header?.competitions?.\[0\]" src/index.js

# 4. Live-check whether the test UCL tie has resolved (won't still be 1-1 by now —
#    use whatever the live scoreboard shows for the most recent UCL/EPL fixture
#    with notes containing "2nd Leg" to get a fresh, real aggregate to verify against)
curl -s "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=$(date -u +%Y%m%d)" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); [print(e['id'], e['competitions'][0].get('notes')) for e in d.get('events',[])]"

# jubilant-bassoon
cd ../jubilant-bassoon

# 5. Find the actual soccer card-rendering template (do not guess line numbers —
#    this file is 39000+ lines / 2.2MB, search for it)
grep -n "function renderGameCard\|function renderSoccerCard\|class=\"game-card\"" index.html | head -10

# 6. Confirm postseason_games rows reach the client with a `round` field already
#    present in the payload shape (the column exists; verify it survives serialization
#    to whatever endpoint the client actually polls for the schedule)
grep -n "postseason_games" src/index.js | grep -i "select \*\|SELECT \*"
```

STOP CONDITION: if probe 5 finds no single soccer card template (e.g. card
rendering is generated via string concatenation scattered across many call
sites rather than one function), do not attempt a sweeping multi-site edit.
Instead add the badge to the ONE highest-traffic call site (today's slate)
and document the rest as a follow-up CC-CMD scope, per Rule 69.

---

## TASK 1 — Round label on every ESPN-sourced soccer game (cheap, no extra fetch)

File: `src/index.js`, `adaptESPNWCSoccer` (~line 1268).

Replace:
```javascript
round:       '',
```
With:
```javascript
round:       comp.notes?.[0]?.headline || comp.notes?.[0]?.text || '',
```

This is additive only — the existing WC26 BSD block (lines 3012-3044) runs
afterward and will still overwrite this with the more specific group_name
when one is found. Do not modify the BSD block.

---

## TASK 2 — Two-legged aggregate, conditionally fetched

### 2a. Widen `/soccer/xg`'s existing summary fetch

File: `src/index.js`, `/soccer/xg` route (~line 10328). The summary fetch
already happens (line 10343); extract `series` from the same response
instead of discarding it.

After the existing competitor-extraction loop (~line 10360), add:

```javascript
const seriesData = summaryData?.header?.competitions?.[0]?.series?.[0] || null;
let seriesPayload = null;
if (seriesData) {
    const homeAgg = seriesData.competitors?.find(c => c.id === homeId)?.aggregateScore;
    const awayAgg = seriesData.competitors?.find(c => c.id === awayId)?.aggregateScore;
    seriesPayload = {
        title: seriesData.title || null,
        leg: seriesData.leg ?? null,
        totalLegs: seriesData.totalCompetitions ?? null,
        completed: seriesData.completed ?? null,
        homeAggregate: homeAgg ?? null,
        awayAggregate: awayAgg ?? null,
        otherLegEventId: (seriesData.events || []).find(e => e.id !== eventId)?.id || null,
    };
}
```

Add `_series: seriesPayload` to the existing response `payload` object
(~line 10401-10408), alongside `_hasXG`/`_hasMatchStats`.

### 2b. Conditional fetch in `/v2/games` — only call `/soccer/xg` for likely second legs

File: `src/index.js`, inside the `cfg.espnLeague` branch of `handleV2Games`
(~line 2963-2990), after `espnGames` is built.

Do NOT call `/soccer/xg` for every game in the slate — only for games whose
cheap `round` value (from Task 1) indicates a second leg, to avoid an
N+1 `/summary` fetch across the full day's schedule:

```javascript
// ── Two-legged aggregate enrichment — only for likely second legs ─────────
// Cheap pre-filter on the free `round` string avoids fetching /summary
// (one extra request per game) for the ~95% of soccer games that aren't
// part of a multi-leg tie. False negatives (a "2nd Leg" phrased differently
// by ESPN for some competition) just mean no aggregate badge — degrades
// silently, never blocks the card.
if (cfg.espnSport !== 'baseball' && !['basketball','australian-football'].includes(cfg.espnSport)) {
    const secondLegGames = games.filter(g =>
        /2nd leg|second leg/i.test(g.round || '')
    );
    if (secondLegGames.length) {
        const relayBase = env.RELAY_BASE || 'https://field-relay-nba.jeffunglesbee.workers.dev';
        await Promise.all(secondLegGames.map(async g => {
            try {
                const eid = (g.espnEventId || '').toString();
                const resp = await fetch(
                    `${relayBase}/soccer/xg?league=${encodeURIComponent(cfg.espnLeague)}&event=${encodeURIComponent(eid)}`
                );
                if (!resp.ok) return;
                const d = await resp.json();
                if (d?._series) g.series = d._series;
            } catch (_) { /* non-blocking */ }
        }));
    }
}
```

Place this after the existing AFL/BSD enrichment blocks, same pattern
(non-blocking, try/catch per game, never aborts the response).

---

## TASK 3 — Client: round badge on game cards (jubilant-bassoon)

Use whatever single card-rendering location probe 5 identifies. Requirements:

- Render a small badge/label when `game.round` is a non-empty string —
  same field name regardless of whether the game came from `/v2/games`
  (live ESPN path, Task 1/2) or the D1 schedule-serving endpoint
  (`postseason_games.round`, from the tournament-multiplexer CC-CMD). Both
  paths use the same field name — one badge component, two data sources,
  no source-specific branching needed in the UI layer.
- When `game.series` is present (Task 2b) with both `homeAggregate` and
  `awayAggregate` non-null, render "Agg: {homeAggregate}-{awayAggregate}"
  instead of (or alongside) the bare round label. When `game.series.leg`
  is 1, the aggregate equals that leg's own score — not useful information
  yet; prefer showing just the round/leg label ("1st Leg") until leg 2.
- Follow whatever existing badge/pill visual pattern the codebase already
  uses elsewhere (check frontend-design conventions already in place before
  inventing new styling) rather than introducing a new visual language for
  a single field.
- Do not attempt this for NBA/NHL series in this CC-CMD even though
  `postseason_games.round` already has data for them ("East CF" etc.) —
  scope this to soccer only for now per Rule 69; once the component exists
  it's a one-line extension to apply elsewhere, but verifying NBA/NHL
  round-label correctness is a separate review this CC-CMD doesn't cover.

---

## TASK 4 — Smoke assertions

```
# A-ROUND-1: adaptESPNWCSoccer no longer hardcodes round: ''
# A-ROUND-2: /soccer/xg response includes a _series key (null when not
#   applicable, populated object when ESPN returns series data)
# A-ROUND-3: /v2/games does NOT call /soccer/xg for games where round
#   doesn't match /2nd leg|second leg/i — verify via call-count assertion
#   or mock, not just code inspection
# A-ROUND-4: client renders a round badge for at least one soccer game
#   with a non-empty round field (manual/visual check acceptable if no
#   existing UI test harness covers card rendering)
```

---

## TASK 5 — Verify end-to-end

```bash
# 1. Round label now populated for a live club-league game (not just WC26)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=epl&date=$(date -u +%Y-%m-%d)" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); [print(g.get('round'), g['home']['name'], 'v', g['away']['name']) for g in d.get('games',[])]"

# 2. Series/aggregate populated for a confirmed second-leg fixture (use the
#    event id surfaced by probe 4)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/soccer/xg?league=uefa.champions&event={SECOND_LEG_EVENT_ID}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('_series'))"

# 3. Confirm N+1 avoidance — count /soccer/xg calls triggered for a full
#    day's EPL slate (should be 0 unless an actual two-legged EPL fixture
#    exists, which is rare/never in normal league play — confirms the
#    pre-filter is working, not silently fetching for everything)
```

---

## SCOPE (Rule 69 — TOUCH-ONLY-A)

DO:
- `adaptESPNWCSoccer` round fix (Task 1)
- `/soccer/xg` series extraction (Task 2a)
- Conditional second-leg enrichment in `handleV2Games` (Task 2b)
- One client-side round badge component, soccer cards only (Task 3)
- Single commit per repo

DO NOT:
- Touch the WC26 BSD round-overwrite block — it already works, runs after,
  and is more specific
- Fetch `/soccer/xg` unconditionally for every soccer game — defeats the
  entire point of Task 2b
- Extend the round badge to NBA/NHL series in this CC-CMD
- Build FIELD-side aggregate-score computation — ESPN's `aggregateScore`
  already does this correctly; do not duplicate it
- Touch `regular_season_games` or `postseason_games` schema — this CC-CMD
  is read/display only, no new D1 writes

---

## KNOWN GAPS TO DOCUMENT (not solve here)

1. Domestic cups with occasional two-legged early rounds (varies by country/
   season) may phrase ESPN's `notes` differently than "1st/2nd Leg" — the
   regex pre-filter in Task 2b may miss some. Not solvable generically;
   note any misses found during probe 4/Task 5 verification for a future
   pass.
2. MLS tournament rounds (postseason_games.round, stats-api-sourced) use
   different label strings ("Quarterfinal") than ESPN's notes-based labels
   ("1st Leg", "Round of 16") — Task 3's badge renders whatever string is
   in `game.round` as-is; no normalization between the two vocabularies is
   attempted here.

---

## OUTBOX MANIFEST (last task)

Write `outbox/cc-round-label-aggregate-2026-06-30.md` with: probe results,
which call site Task 3 landed on, Task 5 verification output (including the
real second-leg event id tested against), and any "1st/2nd Leg" phrasing
variants discovered that the regex missed.
