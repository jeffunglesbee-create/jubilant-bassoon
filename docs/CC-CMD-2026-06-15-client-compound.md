# Claude Code Command — Client Compound: Card Enrichment Layer + Remaining Features

git pull. Read CLAUDE.md.

## CONTEXT

The archive loop is closed with 15+ relay endpoints live. The client has
individual features (archive timeline, upsets, conflict map, crew chip, etc.)
each wired independently. This session compounds them.

The insight: a game card currently gets enriched by 6+ independent code paths
(scores, briefs, crew, broadcast, drama, series record). Each fires separately,
each renders separately. With the archive, a SINGLE enrichment pass can inject
odds, venue, history, crew, upset potential, and line movement all at once —
one fetch, one render cycle, zero layout shift.

Baseline: smoke 664/0, SW_VERSION 2026-06-15f

## TASKS

### COMMIT 1 — enrichCardFromArchive() compound function

Create a single enrichment function that takes a card element and its game
data, makes ONE batched query, and applies all archive-sourced enrichments:

```javascript
async function enrichCardFromArchive(cardEl, game) {
  if (!game || !game.date) return;
  try {
    const base = (typeof V2_RELAY_BASE !== 'undefined')
      ? V2_RELAY_BASE : 'https://field-relay-nba.jeffunglesbee.workers.dev';

    // Single fetch: get all archive data for this game's date + teams
    const params = new URLSearchParams({
      date: game.date.slice(0, 10),
      limit: '20'
    });
    const resp = await fetch(base + '/archive/query?' + params);
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data.results) return;

    // Extract enrichments from the batch response
    const enrichments = {};

    // 1. Historical meeting — prior game between same teams
    enrichments.lastMeeting = data.results.find(r =>
      r.brief_type === 'game_recap' &&
      r.brief_text && r.brief_text.includes(game.home) &&
      r.brief_text.includes(game.away) &&
      r.date !== game.date.slice(0, 10)
    );

    // 2. Odds context — from game object if opening_odds present
    if (game.opening_odds) {
      try {
        enrichments.odds = JSON.parse(game.opening_odds);
      } catch(_) {}
    }

    // 3. Venue — from game.venue, parsed client-side
    if (game.venue) {
      const parts = game.venue.split(',');
      enrichments.venue = {
        name: parts[0]?.trim(),
        location: parts.slice(1).join(',').trim()
      };
    }

    // 4. Upset potential — if odds show heavy favorite
    if (enrichments.odds?.moneyline) {
      const ml = enrichments.odds.moneyline;
      const maxDog = Math.max(ml.home || 0, ml.away || 0);
      if (maxDog >= 300) enrichments.upsetPotential = true;
    }

    // Apply to card DOM
    applyCardEnrichments(cardEl, enrichments);
  } catch(_) {
    // Enrichment failure is never visible to the user
  }
}
```

Call this ONCE per card after initial render, with a dedup Set to avoid
re-enriching cards on re-render cycles.

### COMMIT 2 — applyCardEnrichments() renderer

Takes enrichments object and applies to card DOM:

```javascript
function applyCardEnrichments(cardEl, e) {
  const enrichRow = cardEl.querySelector('.card-enrichment-row')
    || document.createElement('div');
  enrichRow.className = 'card-enrichment-row';
  enrichRow.innerHTML = '';

  // Odds chip
  if (e.odds?.spread) {
    const chip = document.createElement('span');
    chip.className = 'enrich-chip odds-chip';
    const spread = e.odds.spread.home;
    chip.textContent = spread > 0 ? '+' + spread : spread;
    enrichRow.appendChild(chip);
  }

  // Line movement chip (if closing differs from opening)
  if (e.odds?.spread && e.closingOdds?.spread) {
    const open = e.odds.spread.home;
    const close = e.closingOdds.spread.home;
    if (open !== close) {
      const chip = document.createElement('span');
      chip.className = 'enrich-chip movement-chip';
      chip.textContent = open + ' → ' + close;
      enrichRow.appendChild(chip);
    }
  }

  // Upset potential badge
  if (e.upsetPotential) {
    const chip = document.createElement('span');
    chip.className = 'enrich-chip upset-chip';
    chip.textContent = 'UPSET WATCH';
    enrichRow.appendChild(chip);
  }

  // Last meeting chip
  if (e.lastMeeting) {
    const chip = document.createElement('span');
    chip.className = 'enrich-chip history-chip';
    chip.textContent = 'Last: ' + e.lastMeeting.date;
    enrichRow.appendChild(chip);
  }

  if (enrichRow.children.length > 0) {
    // Insert after card-streams row, before card-brief-row
    const streams = cardEl.querySelector('.card-streams, .stream-row');
    if (streams) streams.after(enrichRow);
    else cardEl.appendChild(enrichRow);
  }
}
```

CSS for enrichment chips:
```css
.card-enrichment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 0;
  grid-column: 2 / -1;
}
.enrich-chip {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.06);
  color: var(--text-dim, #888);
}
.odds-chip { color: var(--text-secondary, #aaa); }
.upset-chip {
  color: var(--teal, #2dd4bf);
  background: rgba(45, 212, 191, 0.1);
}
.movement-chip { color: var(--amber, #f59e0b); }
.history-chip { font-style: italic; }
```

### COMMIT 3 — Venue Intelligence client rendering

Enhance applyCardEnrichments to include venue context. For known
high-altitude or notable venues, add a venue chip:

```javascript
const NOTABLE_VENUES = {
  'Coors Field': { note: '5,280ft', tag: 'altitude' },
  'Estadio Azteca': { note: '7,200ft • WC 1970/1986', tag: 'altitude+historic' },
  'Wembley Stadium': { note: 'WC 1966 Final', tag: 'historic' },
  'MSG': { note: 'sellout streak', tag: 'atmosphere' },
  'Fenway Park': { note: 'est. 1912', tag: 'historic' }
};
```

Keep the list small (10-15 entries). Only show the chip when the venue
adds context worth showing. Most venues get no chip.

### COMMIT 4 — Quality × Balance visualization (Health panel)

Add a "Quality × Odds" row to the Health panel that shows the correlation
data from /archive/quality-correlation:

```javascript
fetch(V2_RELAY_BASE + '/archive/quality-correlation')
  .then(r => r.json())
  .then(data => {
    // data: {tight_avg, medium_avg, wide_avg, by_sport: {...}}
    const row = buildHealthRow('Quality × Odds',
      `Tight: ${data.tight_avg} | Wide: ${data.wide_avg}`);
    healthPanel.appendChild(row);
  })
  .catch(() => {});
```

Use existing Health panel row styling. Color: green if tight > wide
(competitive games produce better briefs), amber otherwise.

### COMMIT 5 — Line Movement narrative on featured cards

For FEATURED cards (playoff games, Scout's Pick, WC knockout), if both
opening_odds and closing_odds exist, render a one-line narrative:

"Line moved: SAS -4 → -1.5 (opened -4, closed -1.5)"

Place below the card enrichment row, using the card-brief-row pattern
(spans full card width). Only on featured cards — compact/standard cards
get the chip only.

### COMMIT 6 — Smoke assertions + SW_VERSION

A622 — enrichCardFromArchive function exists + applyCardEnrichments exists
A623 — card-enrichment-row class + enrich-chip class in CSS
A624 — NOTABLE_VENUES object exists
A625 — Quality × Odds health row references /archive/quality-correlation

SW_VERSION bump in index.html and sw.js.

## COMPOUNDING RATIONALE

This is why compounding matters for game cards: enrichCardFromArchive makes
ONE fetch per card and applies ALL enrichments in ONE render pass. If these
were built as 5 separate features, each would make its own fetch and its
own DOM mutation — 5 fetches and 5 layout shifts per card instead of 1.

The single-function pattern also makes the enrichment layer REMOVABLE.
If any enrichment causes a problem, you remove one line from
applyCardEnrichments, not hunt through 5 separate code paths. Testable,
auditable, revertable.

## RULES

- Fire-and-forget pattern. enrichCardFromArchive failure is invisible.
- Dedup: use a Set to avoid re-enriching cards on re-render.
- Mobile-first: enrichment chips must fit on P2 (375px). Use flex-wrap.
- NO layout shift: enrichment row reserves no space until populated.
  Use content-visibility or min-height:0 to avoid CLS.
- Single-concern commits.

## VERIFY

Run smoke: node smoke.js index.html
Expected: 668+/0 (664 + 4 new assertions)

Write findings to outbox/cc-client-compound-2026-06-15.md.
Push when complete.
