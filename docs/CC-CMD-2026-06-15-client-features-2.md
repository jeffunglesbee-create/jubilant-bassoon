# Claude Code Command — Client Features Phase 2: Odds Intelligence + Corpus + Crew

git pull. Read CLAUDE.md.

## CONTEXT

Relay Prompt 3 (odds layer) is shipping. It adds /archive/upsets, odds
columns on game tables, and odds context in briefs. This session builds
the client features that consume odds data plus remaining standalone features.

The relay may still be deploying. All relay fetches MUST be fire-and-forget
with .catch(() => {}). Features must render gracefully when endpoints 404.

Relay endpoints available:
- GET /archive/query — parameterized briefs read (LIVE)
- GET /archive/upsets — games where result contradicted pre-game odds (DEPLOYING)
- GET /archive/date/{iso} — all games on a date with odds columns (LIVE)

Baseline: smoke 660/0, SW_VERSION 2026-06-15e

## TASKS

### COMMIT 1 — Upset Archaeology (Journal tab section)

Add an "Upsets" section to the Journal tab, below the Archive Timeline
from Client Prompt 1.

Data source:
```javascript
fetch(V2_RELAY_BASE + '/archive/query?limit=20')
  .then(r => r.json())
  .then(data => {
    // Filter for games with odds where underdog won
    // If /archive/upsets exists, use that instead
    const upsets = data.results.filter(g =>
      g.opening_odds && g.home_score != null && g.away_score != null
    );
    renderUpsets(upsets);
  })
  .catch(() => {});
```

If the /archive/upsets endpoint exists and returns data, use it directly.
If it 404s, fall back to /archive/date with client-side filtering of games
that have opening_odds where the moneyline underdog won.

Render each upset as a compact card:
- Teams + score
- Pre-game odds context: "+1200 underdog" or "3.5-point dog"
- Date
- Sport stripe accent

Styling: use DISCOVERY tier (teal) for major upsets (moneyline > +300),
standard styling for moderate upsets.

Cache in sessionStorage key 'field_archive_upsets'.

### COMMIT 2 — Market Consensus Tracker (Journal tab section)

Add a "By the Numbers" section to the Journal tab showing aggregate
betting market outcomes.

Data: fetch all archived games with odds from /archive/query or
/archive/date endpoints. Compute client-side:
- Favorite win rate by sport
- Home vs away cover rate
- Average total vs over/under line

Render as a compact stats block:
```
MARKET WATCH
NBA Playoffs: Favorites 67% | Home 54% | Overs 48%
World Cup: Favorites 58% | Home 42% | Overs 55%
```

Use DM Sans body, Chakra Petch for the "MARKET WATCH" label.
Dim color for the stats. No sport stripes needed — this is aggregate data.

If no games have odds data yet (relay still deploying), show nothing.
Check for opening_odds !== null before including in calculations.

### COMMIT 3 — Brief Corpus Intelligence (Health panel extension)

Add a "Brief Quality" row to the existing FIELD Health panel.

Data source:
```javascript
fetch(V2_RELAY_BASE + '/archive/query?brief_type=slate&source=cron&limit=14')
  .then(r => r.json())
  .then(data => renderBriefQualityRow(data.results))
  .catch(() => {});
```

Render in the Health panel:
- "Brief Quality" label
- Average quality_score across last 14 days
- Trend arrow: ↑ if last 7 days avg > prior 7 days avg, ↓ if lower
- Brief count: "14 archived"

Use existing Health panel row styling. Green if avg > 200, amber if
150-200, red if < 150.

### COMMIT 4 — Crew Tracker (card enrichment)

When a game card renders and has crew data in its game object, show the
commentator names in a subtle chip below the broadcast bundle chip.

Implementation: in the card render function, after the streams/bundle
chip, check if the game object has a `crew` field. If so:
```javascript
if (game.crew) {
  const crewChip = document.createElement('span');
  crewChip.className = 'crew-chip';
  crewChip.textContent = game.crew;
  cardEl.querySelector('.card-streams').appendChild(crewChip);
}
```

Styling:
```css
.crew-chip {
  font-size: 0.7rem;
  color: var(--text-dim, #888);
  display: block;
  margin-top: 2px;
}
```

No relay dependency — crew data is already in the game objects for
postseason games.

### COMMIT 5 — Smoke assertions

A618 — Upset archaeology: renderUpsets function + /archive/ URL pattern
A619 — Market consensus: MARKET WATCH or market-consensus render element
A620 — Brief corpus: Brief Quality health panel row + quality trend logic
A621 — Crew tracker: crew-chip class + crew field check

### COMMIT 6 — SW_VERSION bump

Bump in index.html and sw.js per Rule 23.

## RULES

- All relay fetches fire-and-forget with .catch(() => {}).
- Features must render gracefully when endpoints 404 or return empty data.
- sessionStorage for caching. NOT localStorage.
- Mobile-first: all features at P2 (375px).
- Single-concern commits.
- Use existing styling patterns — do not invent new design tokens.

## VERIFY

Run smoke: node smoke.js index.html
Expected: 664+/0 (660 baseline + 4 new assertions)

Write findings to outbox/cc-client-features-2-2026-06-15.md.
Commit outbox + all source changes. Push when complete.
