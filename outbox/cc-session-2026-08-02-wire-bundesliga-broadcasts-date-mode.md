# CC-CMD-2026-08-02-wire-bundesliga-broadcasts-date-mode — Result

## Status: SHIPPED. Real chain wired, code-complete and logic-verified.
Live end-to-end verification against a real game card deferred to
2026-08-22 (the real break-window resume date), with the exact command
below — consistent with this project's established pattern for this
exact situation.

## Task 1 — re-verified fresh, not assumed

Both relay routes confirmed live right now
(`outbox/verify-bundesliga-date-mode-routes-live-result.json`):
`/bundesliga-bapi/resolve-dayid?season=2025-2026&date=2026-05-09` →
real `matchday:33`, `dayId:DFL-DAY-004C9X` (cache hit from
field-relay-nba's own verification run); `/bundesliga-bapi/broadcasts`
for that pair → real `available:true`, `data:{broadcasts:[]}`.

Re-read `fetchSoccerFixtures()` fresh: confirmed the exact attachment
point (`streams:resolveBundle(bundle)` inside the per-event `.map()`)
and that `dateStr` (the single date driving that whole ESPN fetch call)
is available at the right scope to enrich all of that date's Bundesliga
games with one relay round-trip, not one per game.

## Task 2 — chain wired

`src/legacy/field.js`:
- `_bundesligaSeasonFromDate(year, month)` — same real convention
  field-relay-nba's date-mode already uses (Jul-Dec → this year starts
  the season; Jan-Jun → last year did).
- `_fetchBundesligaRealBroadcastStreams(dateStr8)` — calls
  `resolve-dayid?date=...` then `broadcasts?comId&dayId` once for the
  whole fetched date (Rule 78 — not per game). Returns `null` on any
  failure, timeout, `available:false`, or empty `broadcasts` array —
  the caller keeps the existing static `BUNDESLIGA` bundle in that
  case, never breaking the card.
- Wired into `fetchSoccerFixtures()`: for `league === 'ger.1'` only,
  after building that date's games, one enrichment call; if it returns
  real, non-empty broadcaster names, all of that date's Bundesliga
  games get `g.streams` overwritten with the real data (2 fallback
  levels total: real per-match data, else the existing static bundle —
  Rule 76 compliant).

**Disclosed, honest limit on the extraction itself**: every live check
this session and prior sessions has returned `data.broadcasts: []`
(genuinely empty — preseason/no-archive data, not a bug). The
per-entry field-name extraction (`b.name || b.broadcaster || b.channel
|| b.title`) is therefore defensive/best-effort, **not confirmed
against a real non-empty example**. If none of those field names match
the real shape once real data exists, the function correctly returns
`null` (falls back to the static bundle) rather than showing broken
text — but the mapping itself needs a real check once real broadcaster
data appears.

## Task 3 — verification

- `node smoke.js index.html`: 965 passed, 0 failed.
- Season/date-derivation logic — pure function, testable without any
  live game: verified 5 real dates spanning a full season boundary
  (`2026-08`, `2026-12`, `2027-01`, `2027-05` → `2026-2027`;
  `2027-07` → `2027-2028`), all correct.
- End-to-end verification against a real Bundesliga game card cannot
  happen until `2026-08-22` — `isDomesticLeagueInBreak('Bundesliga')`
  correctly returns `true` until then, so `fetchSoccerFixtures` (and
  therefore this enrichment) creates zero real invocations today. This
  is the code doing exactly what it should, not a gap.

SW_VERSION bumped `2026-08-02d` → `2026-08-02e` (real behavior change).

## Unblock criteria (Rule 74) for the two remaining real limits

**1. End-to-end verification against a real game:**
**Blocked by:** `isDomesticLeagueInBreak('Bundesliga')` still `true`
until `2026-08-22`.
**Verify then:** with `FIELD_DEBUG=true` in a live browser session on
or after Aug 22, confirm a real Bundesliga game card renders and
`console.debug` shows a real `_fetchBundesligaRealBroadcastStreams`
call resolving to a real matchday for that date.

**2. Broadcast field-name mapping unconfirmed against real data:**
**Blocked by:** every live check so far has returned an empty
`broadcasts` array — no real entry to inspect.
**Verify then:** once a real non-empty `broadcasts` array is observed
(via the same CI-as-proxy probes already established), print one real
entry's actual keys and confirm `_fetchBundesligaRealBroadcastStreams`
extracts the right one; update the field-name list if the real shape
doesn't match any of the current guesses.
