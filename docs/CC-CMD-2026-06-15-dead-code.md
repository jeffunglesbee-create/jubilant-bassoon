# Claude Code Command — Dead Code + Betting Residue Removal

git pull. Read CLAUDE.md. Read STANDARDS.md Rule 14 (expired schedule entries).

Write all findings to outbox/cc-dead-code-removal-2026-06-15.md.

## CONTEXT

Betting intelligence was removed May 29, 2026. CSS, functions, variables, and comments remain. 213 expired May schedule entries (~46KB) are still in index.html — 17 are playoff games (high-value editorial context), 196 are non-playoff (truly dead). This session restructures the playoff data and removes everything else.

## CRITICAL: DO NOT TOUCH THESE (live win probability, not betting)

- `_wcOddsCache` / `fetchWCOddsProbabilities()` — WC Monte Carlo
- `_cflOddsCache` / `_cflMatchOdds()` — CFL drama engine
- `_liveOddsWP` — score overlay WP
- `buildWCBars` `oddsData` reference — WC WP bars
- `sportsbook` in the disclaimer at line ~4147 — editorial content
- Any function with "WP" or "winProb" or "drama" in its name
- `fetchWCOddsProbabilities`, `fetchCFLOddsProbabilities`

## TASK 1: GAME_ARCHIVE — regular season + postseason (restructure, not delete)

### What

Extract ALL 213 expired May entries into two archive structures:
- `POSTSEASON_ARCHIVE` — playoff/elimination/championship games (keyed by series)
- `REGULAR_SEASON_ARCHIVE` — all other games (keyed by date + league)

Delete ZERO game data. Every matchupNote is FIELD's proprietary editorial — preserve it.

### Why

FIELD already has a series brief system. The archive feeds it with historical context:
- **Postseason**: series arc, per-game margins, elimination narratives, MVP performances
- **Regular season**: "last time these teams met" context, league narrative ("EPL Final Day saw X relegated"), broadcast history, venue context, season arc

The journalism layer writes better briefs when it knows what happened before.

### Structure — POSTSEASON_ARCHIVE (keyed by series)

```javascript
const POSTSEASON_ARCHIVE = {
  'nba-ecf-2026': {
    sport: 'NBA', round: 'East CF', season: 2026,
    teams: { higher: 'New York Knicks', lower: 'Cleveland Cavaliers' },
    result: { winner: 'New York Knicks', games: '4-0' },
    mvp: 'Jalen Brunson',
    games: [
      { game: 1, date: '2026-05-20', home: 'New York Knicks', away: 'Cleveland Cavaliers',
        homeScore: 115, awayScore: 104,
        note: 'Brunson 38 pts. Knicks erased a 22-point Q4 deficit to win in OT.' },
      // ... G2-G4
    ],
    narrative: 'NYK swept CLE. Brunson named ECF MVP. First Finals since 1999.',
  },
  // nba-wcf-2026, nhl-ecf-2026, nhl-wcf-2026, nhl-east-semis-2026,
  // ufl-playoffs-2026 (Week 9-10 Playoff Eliminator)
};
```

Include these as postseason:
- NBA Playoffs (ECF G1-G4, WCF G1-G7)
- NHL Playoffs (East Semis G6-G7, East CF G2-G5, West CF G2-G4)
- UFL Playoff Eliminator weeks
- Any game with `_gameImportance: "elimination"`

### Structure — REGULAR_SEASON_ARCHIVE (keyed by date)

```javascript
const REGULAR_SEASON_ARCHIVE = {
  '2026-05-17': [
    { sport: 'EPL', league: 'Premier League – Matchweek 36',
      home: 'Arsenal', away: 'Newcastle',
      homeScore: 2, awayScore: 1,
      note: 'Original matchupNote text preserved here.',
      tags: [] },
  ],
  '2026-05-25': [
    { sport: 'EPL', league: 'Premier League – Final Day MW38',
      home: 'Manchester City', away: 'Southampton',
      homeScore: 3, awayScore: 0,
      note: 'Original matchupNote text.',
      tags: ['final-day', 'standings-deciding'] },
    { sport: 'La Liga', league: 'La Liga — Matchday 38 · Final Day',
      // ...
      tags: ['final-day'] },
    { sport: 'UCL', league: 'UEFA Champions League – Final',
      // ...
      tags: ['final', 'one-off'] },
  ],
};
```

Compact format — drop these fields (not useful in archive):
- `confirmed` (always true for completed games)
- `streams` / `resolveBundle()` calls (broadcast info is in the `league` string if needed)
- `venue` (keep only for finals/special events)
- `start_time` ISO string (replaced by `date` key)

Keep these fields:
- `sport`, `league` — identity
- `home`, `away` — teams
- `homeScore`, `awayScore` — result (if present in original)
- `note` — the matchupNote text (FIELD's editorial voice)
- `tags[]` — categorization: 'final-day', 'rivalry', 'final', 'one-off', 'milestone', 'elimination'

Tag assignment rules:
- League final day (MW38, Matchday 38) → `'final-day'`
- UCL/UEL/UECL Final → `'final'`, `'one-off'`
- UFL regular season (non-eliminator) → no special tag
- AFL regular rounds → no special tag
- IPL matches → no special tag
- WNBA regular season → no special tag
- WWE → `'entertainment'`
- MLS last before WC break → `'milestone'`

### Consumers to wire

```javascript
// Lookup postseason series. Used by buildChampionshipContext, Night Owl.
function getSeriesArchive(sport, round) {
  const key = `${sport.toLowerCase()}-${round.toLowerCase().replace(/\s+/g,'-')}-2026`;
  return POSTSEASON_ARCHIVE[key] || null;
}

// Lookup regular season games by date. Used by "last time" context.
function getArchivedGames(dateISO) {
  return REGULAR_SEASON_ARCHIVE[dateISO] || [];
}

// Find last meeting between two teams in archive.
function getLastMeeting(teamA, teamB) {
  const normA = teamA.toLowerCase(), normB = teamB.toLowerCase();
  const dates = Object.keys(REGULAR_SEASON_ARCHIVE).sort().reverse();
  for (const d of dates) {
    for (const g of REGULAR_SEASON_ARCHIVE[d]) {
      if ((g.home.toLowerCase().includes(normA) && g.away.toLowerCase().includes(normB)) ||
          (g.home.toLowerCase().includes(normB) && g.away.toLowerCase().includes(normA))) {
        return { ...g, date: d };
      }
    }
  }
  return null;
}
```

Wire `getSeriesArchive` into `buildChampionshipContext()` — when generating context for a Finals game, include the path-to-Finals narrative.

### Verify after

- `grep -c '"2026-05-' index.html` — should drop from 213 to ~1-2 (code references only)
- `grep -c 'POSTSEASON_ARCHIVE' index.html` — should be ≥ 2 (declaration + consumer)
- `grep -c 'REGULAR_SEASON_ARCHIVE' index.html` — should be ≥ 2
- All matchupNote text from original entries preserved in archive (spot-check 5 entries)

### Commit

Single commit: "refactor: GAME_ARCHIVE — postseason series + regular season history from expired May entries"

## TASK 2: Betting CSS (~12 rules)

Remove these CSS rules entirely:
- `.betting-head` block (starts `display:flex;align-items:center;gap:.75rem`)
- `.betting-head::after` block
- `.betting-title` rule
- `.betting-icon` block
- `.betting-disclaimer` block
- `.bet-odd.changed` rule
- `@keyframes oddsFlash` block
- `.bet-grid{grid-template-columns:1fr}` (in responsive blocks)
- `.bet-title{font-size:.92rem}` (in responsive blocks)
- `.betting-section` in responsive comma lists (remove from comma list, keep `.media-section,.streaming-section`)
- `.bet-grid{ grid-template-columns:1fr !important; }` responsive override

**Do NOT remove:** `.odds-source-ai` CSS (may be referenced by live WP display).

## TASK 3: Dead functions (zero callers)

Remove entire function bodies:
- `fetchNBAOddsViaRelay()` (~line 16182) — defined, never called
- `toImplied(oddsStr)` (~line 12011) — zero callers
- `toImpliedNum(oddsStr)` (~line 21513) — zero callers
- The moneyline check at ~lines 32886-32887: `if (!game.odds?.moneyline) return false; return Math.abs(...)` — find the containing function and verify it has zero callers before removing

## TASK 4: Dead variables

- `oddsIntervalId` declaration at ~line 16252: `let oddsIntervalId = null;` — remove
- `oddsIntervalId` cleanup at ~line 7703: `if(oddsIntervalId){ clearTimeout(oddsIntervalId); oddsIntervalId=null; }` — remove

## TASK 5: Dead localStorage references

- `odds_req` health panel check (~lines 4640-4644): the `try` block reading `localStorage.getItem('odds_req')` — remove entire try/catch for odds budget
- `field_odds_*` TTL sweep (~line 6048): remove `k.startsWith('field_odds_')` from the OR condition in the localStorage cleanup. Keep `field_brief_*` and `field_drama_history_*`.
- `'odds-relay-adapter'` feature date (~line 5196) — remove this entry from the feature inventory object

## TASK 6: Stale comments

Update or remove these misleading comments:
- `<!-- Attention bar — live odds urgency (Step 7) -->` (~line 4276) — change to `<!-- Attention bar — live game urgency (Step 7) -->`
- `// Note: odds polling, media and betting are today-specific` (~line 7760) — remove "odds polling," and "and betting" from this comment
- `// Odds chips — inject after sport odds load from The Odds API cache` (~line 19596) — remove this comment
- `// Also re-renders Betting Intelligence section if it was empty on first try` (~line 19596) — remove this comment
- `// Media + betting rendered lazily by IntersectionObserver` (~line 19626) — change to `// Media rendered lazily by IntersectionObserver`
- `// All functions below were inadvertently dropped in the betting-engine removal commit.` (~line 19634) — update to remove betting reference, keep the Squiggle context

## TASK 7: GRAY items — verify then remove if dead

- `_cflSpread` / `_cflTotal` / `_cflBookmakers` properties (~lines 11201-11204): grep for any render/display usage. If zero DOM writes reference these properties, remove the assignment lines (keep `g.wp = odds.pHome` — that's live WP).
- CFL `gotd-badge` with odds label (~line 9826): check if this code path is reachable with current CFL data. If `_cflOddsCache` is always empty (no relay endpoint serving CFL odds), this badge never renders — remove.

## INSTRUCTIONS

1. Task 1 (GAME_ARCHIVE) is the largest and most important. Build BOTH archive objects, add all 3 lookup functions, wire `getSeriesArchive` into `buildChampionshipContext()`, remove original entries from schedule arrays. ALL 213 entries preserved in archive form — zero editorial data deleted. Single commit.
2. Tasks 2-7 (betting CSS, dead functions, dead variables, dead localStorage, stale comments, gray items): one commit per task. 6 commits max.
3. Run smoke after EACH commit. Baseline: 652/0. Archive restructure should not affect smoke. CSS/function removal should not affect smoke.
4. After all tasks, report: `wc -c index.html` before and after. Net change may be SMALL (data restructured, not deleted) — the savings come from Tasks 2-7 (~2KB dead code) and compact archive format (dropped streams/confirmed/venue fields saves ~15-20KB).
5. Write the full manifest to outbox/cc-dead-code-removal-2026-06-15.md with before/after byte counts, grep verification, archive key lists (both POSTSEASON and REGULAR_SEASON), and any items you chose NOT to archive with reasoning.
6. Add smoke assertion A610 — GAME_ARCHIVE present: `POSTSEASON_ARCHIVE` has ≥3 series entries, `REGULAR_SEASON_ARCHIVE` has ≥5 date keys, `getSeriesArchive` and `getLastMeeting` functions exist.
7. Push when complete.

## KNOWN LIMITATIONS

- Line numbers are approximate — betting removal and subsequent commits shifted them. Use content matching, not line numbers.
- The moneyline function (Task 3) needs its parent function identified before removal. If the parent function has other live callers, only remove the moneyline branch, not the whole function.
- Some May entries may lack homeScore/awayScore (pre-game entries that were never updated with results). Archive these with `homeScore: null, awayScore: null` — the matchupNote still has value.
- The REGULAR_SEASON_ARCHIVE keyed by date may have many entries per date. This is fine — the lookup functions handle arrays.
- Long-term, both archives should migrate to D1 or R2 to avoid unbounded index.html growth. For now, in-file is correct — it keeps the data accessible to the client-side journalism layer without a relay call.
