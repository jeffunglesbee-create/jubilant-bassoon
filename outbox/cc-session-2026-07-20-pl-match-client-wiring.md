# CC Session — 2026-07-20 — /pl/match/:id client wiring (Key Moments + Lineups)

## Repos touched
- `jeffunglesbee-create/jubilant-bassoon`

## HEAD progression

### jubilant-bassoon
| Commit | Message |
|--------|---------|
| `e818a23` | feat: wire /pl/match/:id into bottom sheet (Key Moments) and Stats tab (Lineups) |

### field-relay-nba
No code changes this session (relay already complete at `45329db`).

## Smoke
- Start: 963 passed, 0 failed
- End: 963 passed, 0 failed

## SW_VERSION
Not bumped — no deploy-triggering structural change (JS only, no HTML/SW changes that require cache bust).

## What was done

### Pre-build probe (confirmed live)
Probed `/pl/match/116197` via `probe_relay_route`. Confirmed exact field shapes:
- `fixture.halfTimeScore: { homeScore, awayScore }` ✓
- `fixture.matchOfficials[].role` — main referee is `"MAIN"` (not "REFEREE"), VAR is `"VAR"` ✓
- `fixture.teams[].team.{ id, name }` — used to map `teamLists[n].teamId → team name` ✓
- `fixture.teamLists[n].{ lineup[], formation.label }` — starters in `lineup[]` ✓
- Per player: `name.display`, `info.position`, `matchShirtNumber` (match-specific shirt number) ✓
- `events[]` flat array, event type `"goal"` and `"substitution"` confirmed, `time.label`, `text` ✓

### TASK 1 — `fetchPLMatch(fixtureId)` (`e818a23`)
Added after `fetchPLFixtures` closing brace (~L18675 post-edit). Per-fixture `Map` cache
with 30s TTL (matches relay's own `PL_TTL_LIVE`). Direct `fetch` to `${PL_RELAY_BASE}/match/${fixtureId}`
with 8s abort. Returns `null` on any error. Not called proactively — only when a sheet
is opened or Stats tab renders a PL game.

### TASK 2 — Bottom sheet Key Moments section (`e818a23`)
- Added `<div id="bs-pl-inject"></div>` anchor in `openBottomSheet()` template before `bs-last-meeting`
- After last-meeting async block: fires when `eData?._plId` is present
- Filters events to `type === 'goal' || type === 'substitution'` only (135 total events → narrative-relevant subset)
- Sorted ascending by `time.secs`
- HT score shown as `HT: 0–0` line above events (uses `fixture.halfTimeScore`)
- Each event row: `{minute}′ {event.text}` — PulseLive's own prose used directly, no reformatting
- Stale-sheet guard: `window._currentBottomSheetGameId !== gameId` abort preserved
- Card types (yellow/red card) NOT included — clean match probed (Bournemouth 2-0 Leicester), type string unconfirmed. To add: verify against a match with bookings, add type string to filter.

### TASK 3 — Stats tab Lineups sub-section (`e818a23`)
- `_tgPlId = _tgEData?._plId || null` collected inside Today's Games loop
- Early-return guard updated: `|| _tgPlId` added so a PL game with no other data still renders
- `_tgPlPairs` array collects `{ id: _tgId, plId: _tgPlId }` before push
- Placeholder `<div id="tg-pl-${_tgId}"></div>` appended in `_todayGames.push()`
- After `content.innerHTML = blocks.join('')`: async fill per pair
  - Team names resolved by cross-referencing `fixture.teams[].team.{ id, name }` with `teamLists[n].teamId`
  - Starters only (no subs) — `tl.lineup[]` per team
  - Row format: `#shirt | pos | name` (shirt = `matchShirtNumber`, pos = `info.position`, name = `name.display`)
  - Formation label appended to team header: `"Bournemouth · 4-2-3-1"`
  - Officials line: `REF: Lewis Smith · VAR: James Bell` (role MAIN + VAR only)
  - `bs-section` wrapper with label "Lineups" — same container class as rest of Stats tab

## Integration status
- RELAY CONTRACT: `GET /pl/match/:id` → `{ fixture: <PL fixture>, events: <flat array> }`. TTL 30s. Verified.
- CLIENT CONSUMER: `fetchPLMatch(fixtureId)` consumed by `openBottomSheet()` (Key Moments) and `renderStatsSection()` (Lineups)
- INTEGRATION STATUS: STAGED — sandbox egress blocks E2E browser verification. Structure verified via smoke 963/0 and field shape verified via relay probe.
- KNOWN MISMATCHES: None — all field names written from live probe output, not assumptions.

## STAGED verification (unblock criteria)
**Blocked by:** sandbox egress (cannot open browser against live field.js deploy)
**Unblocked when:** any browser session with access to the deployed FIELD app
**Verify — Key Moments:**
```
1. Open FIELD in browser
2. Tap a completed PL game card (status 'C' in espnScores, source 'pl')
3. Bottom sheet Key Moments section should appear with goal/substitution events
4. Cross-check: probe_relay_route /pl/match/{id} and compare events manually
```
**Verify — Lineups:**
```
1. Open Stats tab in FIELD during/after a PL gameweek
2. Today's Games section should show Lineups sub-section for each PL game
3. Starting XI, formation, REF/VAR names should match PulseLive data
```

## Open carry-forwards
- **Card event types** — yellow/red card type strings not yet confirmed (need a booked match). When verified, add `|| e.type === 'yellow card' || e.type === 'red card'` to the Key Moments filter in `openBottomSheet`.
- **halfTimeScore in Game Summary body** — CC-CMD spec said to add to existing Game Summary section body, but that section only renders when `_bsIsFinal && _bsPostgameDrama`. The HT score is instead shown as the first line of the Key Moments section (which is always present for completed matches with events). If the spec intent was specifically in the Game Summary body, a follow-up can move it there.
