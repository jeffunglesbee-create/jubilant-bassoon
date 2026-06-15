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

## TASK 1: POSTSEASON_ARCHIVE (restructure, not delete)

### What

Extract the 17 May playoff entries (8 NBA ECF/WCF + 9 NHL CF/Semis) into a `POSTSEASON_ARCHIVE` object keyed by series. Delete the 196 non-playoff May entries.

### Why

The playoff entries contain editorial context no API provides — matchupNotes with stats, series margins, game importance flags, narrative arc from G1→G7. The journalism layer (`buildChampionshipContext`, Night Owl, series previews) needs this when writing about current Finals matchups.

### Structure

```javascript
// ── POSTSEASON_ARCHIVE — completed 2026 playoff series ─────────────────
// Keyed by series slug. Feeds buildChampionshipContext(), Night Owl
// championship prompts, and bracket display. NOT rendered as game cards.
// Source: restructured from expired schedule entries (June 15 2026).
const POSTSEASON_ARCHIVE = {
  'nba-ecf-2026': {
    sport: 'NBA', round: 'East CF', season: 2026,
    teams: { higher: 'New York Knicks', lower: 'Cleveland Cavaliers' },
    result: { winner: 'New York Knicks', games: '4-0' },
    seriesMargins: [11, null, 13, 37],  // positive = higher seed win margin
    mvp: 'Jalen Brunson',
    games: [
      {
        game: 1, date: '2026-05-20', home: 'New York Knicks',
        homeScore: 115, awayScore: 104,
        note: 'Brunson 38 pts. Knicks erased a 22-point Q4 deficit to win in OT.',
      },
      // ... G2-G4
    ],
    narrative: 'NYK swept CLE. Brunson named ECF MVP. First Finals since 1999.',
  },
  'nba-wcf-2026': {
    sport: 'NBA', round: 'West CF', season: 2026,
    teams: { higher: 'Oklahoma City Thunder', lower: 'San Antonio Spurs' },
    result: { winner: 'San Antonio Spurs', games: '4-3' },
    seriesMargins: [9, 9, 15, -21, 13, -27, null],  // from OKC perspective
    games: [
      // ... G1-G7 with notes from matchupNote fields
    ],
    narrative: 'SAS won G7 on the road. Wembanyama 28.2 PPG, 3.7 BPG. Road teams won 4 straight.',
  },
  'nhl-ecf-2026': { /* CAR series */ },
  'nhl-wcf-2026': { /* VGK series */ },
  'nhl-east-semis-2026': { /* MTL-BUF G6-G7 */ },
};
```

### Fields per series

- `sport`, `round`, `season` — identifiers
- `teams.higher` / `teams.lower` — by seed
- `result.winner`, `result.games` — outcome
- `seriesMargins[]` — per-game margin (positive = higher seed won)
- `mvp` — if known (NBA only)
- `games[]` — array of `{ game, date, home, homeScore, awayScore, note }` — the `note` is the matchupNote text from the original entry
- `narrative` — 1-2 sentence series summary for journalism prompts

### Consumers to wire

After building the archive, add a lookup function:

```javascript
// Returns series archive entry or null. Used by journalism prompts.
function getSeriesArchive(sport, round) {
  const key = `${sport.toLowerCase()}-${round.toLowerCase().replace(/\s+/g,'-')}-2026`;
  return POSTSEASON_ARCHIVE[key] || null;
}
```

Then wire into `buildChampionshipContext()` — when generating context for a Finals game, include the path-to-Finals narrative from the archive. Example: "The Spurs who won Game 7 on the road at OKC (Wembanyama 28.2 PPG) now face the Knicks who swept Cleveland."

### Delete (non-playoff May entries)

Delete all 196 May entries where `league` does NOT contain "Playoff" or "Playoffs". These are AFL, IPL, MLS, EPL, Ligue 1, La Liga, UFL, WNBA, WWE regular season — no journalism value.

**Verify after:** `grep -c '"2026-05-' index.html` should be ~17 (the archive game dates) plus 1-2 code references. NOT 213.

### Commit

Single commit: "refactor: POSTSEASON_ARCHIVE from expired playoff entries; delete 196 dead non-playoff May entries"

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

1. Task 1 (POSTSEASON_ARCHIVE) is the largest and most important. Build the archive object, add `getSeriesArchive()`, wire into `buildChampionshipContext()`, delete 196 non-playoff entries. Single commit.
2. Tasks 2-7 (betting CSS, dead functions, dead variables, dead localStorage, stale comments, gray items): one commit per task. 6 commits max.
3. Run smoke after EACH commit. Baseline: 652/0. Archive restructure should not affect smoke. CSS/function removal should not affect smoke.
4. After all tasks, report: `wc -c index.html` before and after. Expected savings: ~40KB net (46KB non-playoff removed, ~3KB archive added, ~2KB dead code removed).
5. Write the full manifest to outbox/cc-dead-code-removal-2026-06-15.md with before/after byte counts, grep verification, POSTSEASON_ARCHIVE key list, and any items you chose NOT to remove with reasoning.
6. Add a smoke assertion: A610 — POSTSEASON_ARCHIVE exists with at least 3 series entries and `getSeriesArchive` function present.
7. Push when complete.

## KNOWN LIMITATIONS

- Line numbers are approximate — betting removal and subsequent commits shifted them. Use content matching, not line numbers.
- The moneyline function (item 3) needs its parent function identified before removal. If the parent function has other live callers, only remove the moneyline branch, not the whole function.
- May schedule entries are interspersed with June entries in the same arrays. Surgical deletion required — don't accidentally remove array commas or break JSON-like structure.
