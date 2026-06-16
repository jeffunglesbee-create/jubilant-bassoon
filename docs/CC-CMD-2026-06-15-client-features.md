# Claude Code Command — Archive-Consuming Features: Narrative Graph + Broadcast Archaeology + Conflict Map

git pull. Read CLAUDE.md.

## CONTEXT

The relay now has /archive/query (shipping via Relay Prompt 1). This session
builds the client-side features that consume archive data. Three features,
each independently valuable, each querying the relay's archive endpoints.

The client is jubilant-bassoon — a single-file PWA (index.html ~920KB).
All features render in the existing tab/section architecture. No new tabs.

Relay endpoint: GET /archive/query?date=X&sport=X&team=X&brief_type=X&limit=N
Returns: JSON array of brief/game records from the archive.

IMPORTANT: If the relay endpoint is not yet deployed (Relay Prompt 1 hasn't
run), stub the fetch calls with a graceful fallback that shows "Archive
loading..." and retries on next render cycle. The features must not error
if the endpoint 404s — same fire-and-forget pattern as archiveBrief().

## PRE-WORK

Before writing any code:
1. Read the existing Journal tab implementation — find where Night Owl,
   FIELD Brief, and other journalism surfaces render.
2. Read the existing Streaming Discovery / My Services section.
3. Read the filter bar implementation — understand how sport filters work.
4. Understand the existing card rendering pipeline — game cards, sport
   stripes, the card-body grid.

## TASKS

### COMMIT 1 — Historical Narrative Graph (Journal tab section)

Add a new section to the Journal tab: "FIELD Archive" or "Editorial History."

UI: a compact timeline showing recent archived briefs. Each entry shows:
- Date (e.g., "June 14")
- Brief type badge (slate, game_recap, wc_tab)
- First ~100 chars of brief text, truncated with ellipsis
- Quality score if available (small chip: "QS: 242")

Data source:
```javascript
fetch(V2_RELAY_BASE + '/archive/query?brief_type=slate&source=cron&limit=7')
  .then(r => r.json())
  .then(briefs => renderArchiveTimeline(briefs))
  .catch(() => {}); // Silent failure
```

Render as a vertical timeline with date markers. Use existing Journal tab
styling: DM Sans body, dim context color, sport stripe accent for the
brief type badge.

Tap interaction: tapping a brief entry expands it to show the full text
in a bottom-sheet style overlay (mobile) or inline expansion (desktop).
Use the existing card expand pattern if one exists.

Cache in sessionStorage with key 'field_archive_timeline' to avoid
re-fetching on tab switches.

### COMMIT 2 — Broadcast Archaeology (Streaming Discovery section)

Add a "Broadcast History" subsection to the Streaming Discovery / My Services
area. Shows aggregate broadcast data from the archive.

Data source:
```javascript
fetch(V2_RELAY_BASE + '/archive/query?brief_type=&limit=50')
  .then(r => r.json())
  .then(games => buildBroadcastSummary(games))
  .catch(() => {});
```

Actually — the /archive/query endpoint returns briefs, not games. For
broadcast data, we need game records. Check if /archive/query supports
querying game tables, or if a separate endpoint is needed. If the endpoint
only returns briefs, use the existing /archive/date/{iso} endpoint instead
to fetch game records with streams fields.

buildBroadcastSummary(games):
- Group games by streams bundle (MLB_FOX, MLB_TBS, NHL_ABC, etc.)
- Count games per bundle
- Sort by count descending
- Render as a compact list: "FOX Saturday MLB: 14 games | ABC NHL: 6 games"

Styling: use existing service card styling from My Services. Each bundle
gets a row with the network name, game count, and a sport stripe.

### COMMIT 3 — Schedule Conflict Map (pure client-side)

Add a visual conflict indicator when games overlap in time. This is pure
client-side — no relay endpoint needed. Works from the already-loaded
game schedule data.

Detection logic:
```javascript
function findConflicts(games) {
  const slots = {};
  games.forEach(g => {
    const hour = new Date(g.start_time).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    if (!slots[hour]) slots[hour] = [];
    slots[hour].push(g);
  });
  return Object.entries(slots)
    .filter(([_, games]) => games.length >= 3)
    .map(([slot, games]) => ({ slot, games, count: games.length }));
}
```

Render: when 3+ games share a time slot, show a "Conflict" chip on the
filter bar or above the sport stripe: "3 games at 8pm — FOX (free), 
Peacock, ESPN+"

Styling: use the CAUTION tier color (amber/warning from the semantic
color system). Small chip, tappable to expand and see the conflicting
games listed with their platform.

This feature works immediately — no archive or relay dependency.

### COMMIT 4 — Smoke assertions

Add smoke assertions for each feature:

A6XX — Archive timeline: checks for the renderArchiveTimeline function,
the /archive/query URL pattern, and the sessionStorage cache key.

A6XX — Broadcast summary: checks for buildBroadcastSummary function and
the broadcast history render element.

A6XX — Conflict map: checks for findConflicts function and the conflict
chip render logic.

Pin function names + URL patterns + render element IDs. Follow the same
pattern as A614 (archiveBrief).

### COMMIT 5 — SW_VERSION bump

Bump SW_VERSION in index.html and sw.js per Rule 23.

## RULES

- Read CLAUDE.md before every commit.
- Single-concern commits (Rule 4).
- All relay fetches must be fire-and-forget with .catch(() => {}).
  Archive features are enhancements — they must never block the main
  schedule rendering or cause errors if the relay is down.
- Use existing styling patterns — DM Sans body, semantic color system,
  card grid, sport stripes. Do not invent new design tokens.
- sessionStorage for caching. NOT localStorage (artifact restriction).
- Mobile-first: all features must work at P2 (375px) viewport.
  Use the existing responsive breakpoint patterns from the CSS.
- SW_VERSION bump in both index.html and sw.js on every commit that
  touches those files.

## VERIFY

Run smoke: node smoke.js index.html
Expected: 660+/0 (657 baseline + 3 new assertions + SW version)

Verify on deployed site:
1. Journal tab shows Archive timeline section (may show "loading" if
   relay endpoint not yet deployed)
2. My Services shows Broadcast History subsection
3. When 3+ games share a time slot, conflict chip appears

Write findings to outbox/cc-client-features-2026-06-15.md.
Commit outbox file + all source changes. Push when complete.
