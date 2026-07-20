# CC Session — 2026-07-20 — /pl/match pagination fix + textstream probe

## Repos touched
- `jeffunglesbee-create/field-relay-nba`

## HEAD progression

### field-relay-nba
| Commit | Message |
|--------|---------|
| `45329db` | fix: /pl/match/:id fetches all textstream pages (pageSize=100, paginated) |

### jubilant-bassoon
No code changes this session.

## Smoke
No change — jubilant-bassoon smoke not re-run (no code changes).

## SW_VERSION
Not bumped.

## What was done

### Textstream probe (no code)
Probed PulseLive directly via `html_probe` (CF Worker IP bypasses sandbox):
- `GET /football/fixtures?compSeasons=719&statuses=C` — confirmed completed fixture IDs. Used fixture `116197` (Bournemouth 2-0 Leicester, GW38 2024/25).
- `GET /football/fixtures/116197/textstream/EN?pageSize=100` — confirmed pageSize param accepted; collapses 14 pages → 2 pages for this match (135 events).
- `GET /football/fixtures/116197/textstream/EN?pageSize=100&page=1` — confirmed goal and substitution event shapes.

**Confirmed event types:** `lineup`, `start`, `free kick won`, `free kick lost`, `corner`, `miss`, `attempt blocked`, `offside`, `goal`, `substitution`

**Goal event shape:**
```json
{
  "id": 2495058,
  "time": { "secs": 4396, "label": "74" },
  "type": "goal",
  "text": "Goal! Bournemouth 1, Leicester City 0. Antoine Semenyo (Bournemouth) right footed shot from the centre of the box to the bottom left corner. Assisted by Illia Zabarnyi with a headed pass following a corner.",
  "playerIds": [25474, 67546]
}
```

**Substitution event shape:**
```json
{
  "id": 2495110,
  "time": { "secs": 4665, "label": "78" },
  "type": "substitution",
  "text": "Substitution, Bournemouth. Dean Huijsen replaces Marcos Senesi.",
  "playerIds": [123585, 54989]
}
```

### /pl/match/:id pagination fix (field-relay-nba `45329db`)
Previous handler fetched textstream with default pageSize=10 (14 pages for a full match), returning only page 0 — goals late in matches would not appear.

Fix: fetches `pageSize=100` on page 0, reads `numPages` from `pageInfo`, then fetches remaining pages in parallel via `Promise.all`. All pages concatenated into a flat `events[]` array in the response. Response shape changed from `{ fixture, events: <raw page object> }` to `{ fixture, events: <flat array> }`.

Verified via `probe_relay_route /pl/match/116197`:
- HTTP 200, 50,400 bytes
- `fixture` includes: `halfTimeScore`, `matchOfficials` (referee + VAR), `teamLists` (full lineup + subs with position, shirt number, nationality, DOB, formation grid), `formation.label` ("4-2-3-1")
- `events` — flat array, all pages, confirmed goal and sub events present

### MCP allow-list verification (no code change needed)
Confirmed `/pl` already in `ALLOWED_PREFIX` at line 15756 of `src/index.js`. The prefix check uses `startsWith(p + '/')` so `/pl/match/:id` was already covered by the existing entry. No change required.

## Integration status
- RELAY CONTRACT: `GET /pl/match/:id` → `{ fixture: <full PL fixture object>, events: <flat array of all match events> }`. TTL 30s. Verified live via probe.
- CLIENT CONSUMER: **None.** `/pl/match/:id` has no consumer in field.js. The endpoint is relay-complete but client-dark.
- INTEGRATION STATUS: STAGED — relay complete, no client wiring.

## Gap analysis: what this data could feed in FIELD

| FIELD structure | PL data available | Status |
|---|---|---|
| `espnScores` score display | Score, clock, status | ✅ wired via `/pl/fixtures` |
| Half-time score | `fixture.halfTimeScore` | ❌ not wired |
| Bottom sheet match detail | teamLists, formation, officials | ❌ not wired |
| Play-by-play (NBA has this) | `events[]` 135 timestamped incidents | ❌ not wired |
| Lineup/injury context | Starting XI, subs, positions, nationalities | ❌ not wired |
| Journalism context | Goal scorers, assisters, formations | ❌ not wired |

## Relation to ChatGPT architectural suggestions
The textstream event types (`goal`, `substitution`, `miss`, `corner`, `offside`) are a primitive Situation Grammar (suggestion 1) — structured incident classifications already produced by PulseLive. The `time.secs` field enables momentum reconstruction across the match timeline. The `formation.label` and `teamLists` enable a Team World Model delta (suggestion 7) when compared across gameweeks. None of this is wired into FIELD yet.

## Open carry-forwards
- **Bottom sheet PL wiring** — when a user taps a PL game card, `openBottomSheet()` should call `/pl/match/:id` and surface starting XI, formation, and key events (goals, cards, subs). This is the highest-value next step.
- **`halfTimeScore`** — trivial add to `/pl/fixtures` normalization or bottom sheet.
- **Card event types** — not observed in this match (clean sheet). `yellow card` / `red card` types presumed standard but not confirmed. Verify against a match with bookings before building card display.
