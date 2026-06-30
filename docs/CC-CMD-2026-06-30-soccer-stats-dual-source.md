# CC-CMD — Soccer Stats Dual-Source (ESPN per-game + stats-api season-form)

**Repos:** field-relay-nba (Tasks 1-2), jubilant-bassoon (none — doc only)
**Date:** 2026-06-30
**Baseline:** field-relay-nba HEAD d78db9d4 · jubilant-bassoon HEAD 790175b0
**Builds on:** CC-CMD-2026-06-23-soccer-xg-espn.md (FBref→ESPN xG replacement, already shipped)

git pull. Read CLAUDE.md. Run `git log --oneline -5` in field-relay-nba first.

Write all findings to outbox/cc-soccer-dual-source-2026-06-30.md.

---

## BACKGROUND

Confirmed live 2026-06-30: ESPN Core API returns **zero xG fields** for MLS
(`expectedGoals` absent on every offensive-category stat for a completed MLS
game, event 761644). `buildSoccerXGContext` (context-assembler.js:275-337)
hard-gates on `_hasXG` (line 307) — when xG is absent, MLS games get **no**
soccer stats context at all, even though ESPN's `/soccer/xg` route already
fetches a payload containing 40+ other real per-game stats (possession%,
passPct, shots on/off target, tackles, interceptions, fouls, cards, corners)
that the route's `extractXG()` (index.js:10383-10395) discards because it
only keeps fields in a hardcoded `XG_FIELDS` Set (index.js:10378-10382).

Separately, stats-api.mlssoccer.com's club statistics endpoint
(`/statistics/clubs/competitions/{comp}/seasons/{season}`) — confirmed live
2026-06-30, NOT yet in `MLS_STATS_ALLOWED_PREFIXES` — returns 144 fields per
club including real `xG`, `xG_efficiency`, `xg_rankings`, `clean_sheets`,
`shots_conversion_rate`, `possession_ratio`, `matches_played`. This is
**season-to-date aggregate**, not per-match — a different grain than ESPN's
per-game competitor stats. Confirmed via live probe:
`stats-api.mlssoccer.com/statistics/clubs/competitions/MLS-COM-000001/seasons/MLS-SEA-0001KA?per_page=1`.

These two sources answer different questions (what happened tonight vs. how
has this team trended all season) and should ship as two separate
CONTEXT_SOURCES entries, not merged into one.

---

## PRE-BUILD PROBES (Rule 68 — run before writing any code)

```bash
cd field-relay-nba

# 1. Confirm current XG_FIELDS allowlist + extractXG (should match this doc — if not, STOP, re-read, adjust patches below before proceeding)
grep -n "XG_FIELDS\|extractXG\|_hasXG" src/index.js

# 2. Confirm buildSoccerXGContext gate + field derivation (should match this doc)
grep -n "buildSoccerXGContext\|_hasXG\|game.eventId\|game.sourceId" src/context-assembler.js

# 3. CRITICAL DEPENDENCY CHECK — does the live journalism cron path actually
#    populate game.eventId / game.espnEventId for soccer games, or only the
#    D1-backfill path (which we know is NULL — confirmed regular_season_games
#    .espn_event_id is null on all MLS rows seeded this session)?
#    Find the call site that builds the `game` object for the live cron
#    (NOT the WC team-context path, NOT backfill) and confirm what fields
#    it carries for soccer/MLS games specifically.
grep -n "assembleContext(" src/index.js | head -20

# Then read 30 lines around each soccer-relevant call site to see how
# `game` is constructed there — specifically whether .id / .eventId from
# the ESPN scoreboard response is passed through.

# STOP CONDITION: if no live-cron call site passes a usable event id for
# MLS games, do NOT proceed to Task 1/2 — instead write a single follow-up
# CC-CMD scoped ONLY to wiring espnEventId through the live soccer cron
# path, and stop after writing outbox/cc-soccer-dual-source-2026-06-30.md
# documenting exactly which call site is missing it. Do not guess a fix
# for an unverified path.

# 4. Confirm /statistics/ prefix is currently blocked (expect 403)
curl -s -w "\nHTTP %{http_code}" "https://field-relay-nba.jeffunglesbee.workers.dev/mls/stats/statistics/clubs/competitions/MLS-COM-000001/seasons/MLS-SEA-0001KA?per_page=1"

# 5. Confirm MLS_STATS_ALLOWED_PREFIXES current state (expect: no /statistics/ entry)
grep -n "MLS_STATS_ALLOWED_PREFIXES" -A 8 src/index.js

# 6. Confirm CONTEXT_SOURCES current soccer_xg entry (expect priority 7, budget 150)
grep -n "soccer_xg" -A 2 src/context-assembler.js
```

If probe 3's stop condition triggers, halt here. Otherwise continue.

---

## TASK 1 — Widen ESPN `/soccer/xg` route to return full match-stat payload

File: `src/index.js`, the `/soccer/xg` route handler (~line 10328).

Replace the `XG_FIELDS` Set + `extractXG()` with a broader extraction that
keeps xG fields (for leagues where present) AND a fixed set of always-useful
match stats (present for every soccer league ESPN covers, confirmed live for
MLS): `possessionPct`, `totalPasses`, `passPct`, `totalShots`,
`shotsOnTarget`, `totalTackles`, `interceptions`, `foulsCommitted`,
`yellowCards`, `redCards`, `totalCrosses`, `wonCorners`.

```javascript
const XG_FIELDS = new Set([
    'expectedGoals', 'expectedGoalsNonPenalty', 'expectedGoalsOpenPlay',
    'expectedAssists', 'bigChanceCreated', 'bigChanceMissed',
    'ppda', 'expectedGoalsConceded',
]);
const MATCH_FIELDS = new Set([
    'possessionPct', 'totalPasses', 'passPct', 'totalShots',
    'shotsOnTarget', 'totalTackles', 'interceptions', 'foulsCommitted',
    'yellowCards', 'redCards', 'totalCrosses', 'wonCorners',
]);
function extractStats(statsObj) {
    if (!statsObj) return {};
    const out = {};
    for (const cat of statsObj.splits?.categories || []) {
        for (const stat of cat.stats || []) {
            if (XG_FIELDS.has(stat.name) || MATCH_FIELDS.has(stat.name)) {
                const v = parseFloat(stat.displayValue);
                if (!isNaN(v)) out[stat.name] = v;
            }
        }
    }
    return out;
}
```

Rename call sites `extractXG(homeStats)` → `extractStats(homeStats)` (same
for away). Keep `hasXG` logic unchanged (`'expectedGoals' in homeXG`) — this
still correctly reports whether xG specifically was found. Add a second flag:

```javascript
const hasMatchStats = 'possessionPct' in homeXG && 'possessionPct' in awayXG;
```

Add `_hasMatchStats: hasMatchStats` to the response payload alongside
`_hasXG`. Keep the existing TTL logic unchanged (it's keyed off `hasXG`,
which is fine — match stats freshness tracks the same game-state signal).

---

## TASK 2 — Add stats-api season-form relay route + allowlist fix

### 2a. Allowlist fix

File: `src/index.js`, `MLS_STATS_ALLOWED_PREFIXES` array (~line 250).

Add `'/statistics/'` as a new entry. Also add a new TTL bucket in
`mlsStatsTtl()`: statistics should cache like standings (`MLS_STATS_TTL_STANDINGS`,
3600s — season aggregates don't change mid-match).

```javascript
const MLS_STATS_ALLOWED_PREFIXES = [
    '/v1/matches',
    '/v1/goals',
    '/v1/commentaries',
    '/matches/seasons/',
    '/competitions',
    '/statistics/',       // NEW — club season-aggregate stats
];
```

```javascript
function mlsStatsTtl(path) {
    if (path.startsWith('/competitions')) return MLS_STATS_TTL_STANDINGS;
    if (path.startsWith('/statistics/')) return MLS_STATS_TTL_STANDINGS;  // NEW
    if (path.startsWith('/matches/seasons/')) return MLS_STATS_TTL_SCHEDULE;
    if (path.startsWith('/v1/goals') || path.startsWith('/v1/commentaries')) return MLS_STATS_TTL_GOALS;
    return MLS_STATS_TTL_LIVE;
}
```

### 2b. New trimmed-payload route `/soccer/season-form`

The raw stats-api club-statistics payload is 144 fields/club — too large and
noisy for a prompt. Add a new route that fetches it server-side and returns
only the fields useful for journalism framing, for one specific club.

```javascript
// ── /soccer/season-form → stats-api club season aggregates, trimmed ───────
// Confirmed live 2026-06-30: stats-api club statistics has real xG fields
// (xG, xG_efficiency, xg_rankings) at season-to-date grain — distinct from
// ESPN's per-match stats (Task 1). Currently MLS-only; extend competition_id
// param to other leagues only after confirming stats-api covers them.
if (pathname === '/soccer/season-form') {
    const compId   = url.searchParams.get('competition_id') || 'MLS-COM-000001';
    const seasonId = url.searchParams.get('season_id') || 'MLS-SEA-0001KA';
    const teamId   = url.searchParams.get('team_id');
    if (!teamId) {
        return new Response(JSON.stringify({ error: 'team_id required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
    }
    try {
        const target = `${MLS_STATS_BASE}/statistics/clubs/competitions/${compId}/seasons/${seasonId}?per_page=50`;
        const resp = await fetch(target, { headers: MLS_STATS_HEADERS });
        if (!resp.ok) throw new Error(`stats-api ${resp.status}`);
        const data = await resp.json();
        const team = (data.team_statistics || []).find(t => t.team_id === teamId);
        if (!team) {
            return new Response(JSON.stringify({ _hasForm: false, team_id: teamId }),
                { headers: { 'Content-Type': 'application/json', ...CORS } });
        }
        const payload = {
            _hasForm: true,
            _source: 'mls-stats-api',
            team_id: team.team_id,
            team_name: team.team_name,
            matches_played: team.matches_played,
            xG: team.xG,
            xG_efficiency: team.xG_efficiency,
            goals: team.goals,
            clean_sheets: team.clean_sheets,
            possession_ratio: team.possession_ratio,
            shots_conversion_rate: team.shots_conversion_rate,
            passes_conversion_rate: team.passes_conversion_rate,
        };
        return new Response(JSON.stringify(payload), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `public, max-age=${MLS_STATS_TTL_STANDINGS}`,
                'X-Source': 'mls-stats-api',
                ...CORS,
            },
        });
    } catch (e) {
        return new Response(JSON.stringify({ _hasForm: false, _error: e.message }),
            { headers: { 'Content-Type': 'application/json', ...CORS } });
    }
}
```

Place this route block adjacent to the existing `/mls/stats` block (~line 9574),
not inside it — `team_id` lookup needs the trimmed-payload logic above, not a
raw passthrough.

### 2c. New context-assembler builder

File: `src/context-assembler.js`. Add near `buildSoccerXGContext`.

```javascript
// ── Soccer season-form via stats-api club aggregates ──────────────────────
// Distinct from buildSoccerXGContext: that's per-match, this is season-to-
// date. Needs game.homeTeamId/awayTeamId in stats-api's MLS-CLU-xxxxxx
// format — NOT the same ID space as ESPN's numeric competitor ids. If the
// game object doesn't carry stats-api club IDs, this returns '' silently
// (do not attempt name-matching here — that's a separate identity-resolver
// concern, see resolveTeamKey).
async function buildSoccerSeasonFormContext(env, game) {
    const sportRaw = (game.sport || '').toLowerCase();
    if (sportRaw !== 'mls' && sportRaw !== 'major league soccer') return '';
    const homeId = game.mlsHomeTeamId || game.homeStatsApiId;
    const awayId = game.mlsAwayTeamId || game.awayStatsApiId;
    if (!homeId || !awayId) return '';
    const base = env?.RELAY_BASE || 'https://field-relay-nba.jeffunglesbee.workers.dev';
    try {
        const [hResp, aResp] = await Promise.all([
            fetch(`${base}/soccer/season-form?team_id=${encodeURIComponent(homeId)}`),
            fetch(`${base}/soccer/season-form?team_id=${encodeURIComponent(awayId)}`),
        ]);
        if (!hResp.ok || !aResp.ok) return '';
        const h = await hResp.json(), a = await aResp.json();
        if (!h._hasForm || !a._hasForm) return '';
        const lines = ['', '[SOCCER SEASON FORM]'];
        lines.push(
            `${h.team_name} season: ${h.matches_played}MP, xG ${h.xG?.toFixed?.(1) ?? h.xG}, ` +
            `${(h.possession_ratio * 100).toFixed(0)}% poss avg`
        );
        lines.push(
            `${a.team_name} season: ${a.matches_played}MP, xG ${a.xG?.toFixed?.(1) ?? a.xG}, ` +
            `${(a.possession_ratio * 100).toFixed(0)}% poss avg`
        );
        return lines.join('\n');
    } catch (_) { return ''; }
}
```

Add to `CONTEXT_SOURCES` array, immediately after the existing `soccer_xg`
entry:

```javascript
{ id: 'soccer_season_form', priority: 8, budget: 100, builder: buildSoccerSeasonFormContext,
  sports: ['mls'] },
```

Priority 8 (one below `soccer_xg`'s 7) so per-match stats win the budget
first; season form is supplementary, not primary.

**Known gap to document, not solve here:** `game.mlsHomeTeamId` /
`game.mlsAwayTeamId` almost certainly don't exist anywhere yet — this builder
will return `''` for every game until something populates stats-api club IDs
onto the game object (likely via `identity-resolver.js`, mapping team name →
`MLS-CLU-xxxxxx`). Document this as the explicit next gap in the outbox
summary. Do not attempt to build the identity-resolver mapping in this
CC-CMD — out of scope, needs its own spec.

---

## TASK 3 — Smoke assertions

```javascript
// A-SOCCER-DUAL-1: /soccer/xg response includes _hasMatchStats field
// A-SOCCER-DUAL-2: /soccer/season-form with team_id=MLS-CLU-000008 (Inter
//   Miami) returns _hasForm:true and a numeric xG field
// A-SOCCER-DUAL-3: /mls/stats/statistics/clubs/... no longer 403s
// A-SOCCER-DUAL-4: context-assembler CONTEXT_SOURCES contains
//   soccer_season_form entry with builder buildSoccerSeasonFormContext
```

---

## TASK 4 — Verify end-to-end

```bash
# 1. Match stats now present even without xG (MLS)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/soccer/xg?league=usa.1&event=761644" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('_hasXG:',d['_hasXG'],'_hasMatchStats:',d.get('_hasMatchStats')); print('home:',d['home'])"

# 2. Season-form route works for a known stats-api club id
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/soccer/season-form?team_id=MLS-CLU-000008" \
  | python3 -m json.tool

# 3. Allowlist fix confirmed (expect 200, not 403)
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://field-relay-nba.jeffunglesbee.workers.dev/mls/stats/statistics/clubs/competitions/MLS-COM-000001/seasons/MLS-SEA-0001KA?per_page=1"
```

---

## SCOPE (Rule 69 — TOUCH-ONLY-A)

Repo: field-relay-nba only.

DO:
- Widen `/soccer/xg` extraction (Task 1)
- Add `/statistics/` to MLS_STATS_ALLOWED_PREFIXES + TTL function (Task 2a)
- Add `/soccer/season-form` route (Task 2b)
- Add `buildSoccerSeasonFormContext` + CONTEXT_SOURCES entry (Task 2c)
- Smoke assertions (Task 3)
- Single commit, all four tasks together (Tasks 1+2+3 are tightly coupled —
  do not split into separate commits)

DO NOT:
- Build the `mlsHomeTeamId`/`mlsAwayTeamId` identity-resolver mapping —
  document as the explicit next gap instead
- Modify `buildOddsStoryContext`, `buildFinalsContextBlock`, or
  `buildWCTeamContextBlock`
- Extend `/soccer/season-form` to non-MLS competitions in this CC-CMD
- Touch jubilant-bassoon (this doc lives there per two-repo separation rule,
  but all code changes target field-relay-nba only)
- Proceed past the Task-1/2 probe stop condition if game.eventId isn't
  confirmed present at the live soccer cron call site

---

## OUTBOX MANIFEST (last task)

Write `outbox/cc-soccer-dual-source-2026-06-30.md` containing:
1. Probe 3 result — which call site constructs `game` for live soccer
   journalism, and whether it carries a usable event id
2. Confirmation Task 1-4 verification commands all passed
3. Explicit statement of the `mlsHomeTeamId` gap (Task 2c) as the next
   carry-forward, with a one-sentence description of what a follow-up
   CC-CMD for identity-resolver MLS club-ID mapping would need to do
4. Final relay HEAD sha after this commit
