# Claude Code Command — Wire Home Run Derby bracket to live relay data

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** wire the already-built, already-tested buildHRDBracket()/renderHRDBracket()/buildHRDPromptContext() to real live data. Time-sensitive — Derby is tonight, 8 PM ET.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/hrd-live-wiring-2026-07-13.md.

## CONTEXT — both preconditions the prior CC-CMD flagged are now confirmed true

The bracket-building CC-CMD (docs/CC-CMD-2026-07-13-hrd-bracket-client.md, already shipped, 100/100) built `buildHRDBracket(liveResults)`, `renderHRDBracket(bracket)`, `buildHRDPromptContext(bracket)` as tested, standalone infrastructure — deliberately not wired to live data, since at the time neither precondition was confirmed. Its own outbox names exactly what was needed:

1. **A static HRD schedule card to inject into** — CONFIRMED landed since (hrd-entry-v2 CC-CMD, real content at the "T-Mobile Home Run Derby" entry with the real 8-player field).
2. **A confirmed-live relay endpoint with a real gamePk** — CONFIRMED live tonight: `GET https://field-relay-nba.jeffunglesbee.workers.dev/mlb-stats/homeRunDerby/839032` returns real bracket/pool data (verified directly, HTTP 200, real `"2026 MLB Home Run Derby"` / `"Citizens Bank Park"` / real Preview-state fields).

Both true now — this CC-CMD is the actual wiring.

**Model to follow, read fresh:** `injectPGALeaderboard(pgaData)` (~L16678) — the established pattern for finding an existing schedule card and injecting live tournament data into it post-render. Match this pattern's real structure, don't invent a different injection approach.

## TASK 0 — Probe

Read `injectPGALeaderboard` in full, fresh, to confirm its real DOM-finding/injection mechanics (don't assume from this doc's description). Confirm the real, current shape of the `/mlb-stats/homeRunDerby/839032` response fresh — the game is pre-event (`state: "Preview"`) as of this doc's writing, so also check what the `in_progress`/completed-round response shape looks like if any historical Derby data is reachable via the same endpoint pattern (a past gamePk), so the render logic isn't only tested against the pre-event shape.

Map the real API response fields to `buildHRDBracket()`'s expected `liveResults` shape — the CC-CMD that built it defined its own internal shape; this task is real field-mapping work (e.g. matchups→seeds, topDerbyHitData→hrTotal/longestHR), not a guess.

## TASK 1 — Wire the fetch + injection

Add a fetch call (matching `loadPGASlate()`'s established async + cache-pattern conventions) that calls the relay endpoint, maps the real response to `buildHRDBracket()`'s shape, and injects `renderHRDBracket()`'s output into the static HRD card — mirroring `injectPGALeaderboard`'s real injection mechanics. Poll/refresh cadence should make sense for a live, ~2-hour event (check what cadence `loadPGASlate` or similar live-tournament fetchers use during active play, match it — don't invent a new interval).

## TASK 2 — Wire journalism context

Call `buildHRDPromptContext()` with the real fetched bracket data wherever FIELD's existing journalism-context injection points call sport-specific context builders (find the real call site pattern for `buildGolfPromptContext`, mirror it for HRD).

## TASK 3 — Verify

- `node smoke.js` clean.
- Real live fetch confirmed working against the actual relay endpoint right now — not mocked.
- Confirm graceful behavior is preserved: since the event is `state: "Preview"` until it starts, confirm the card correctly shows pre-event state (not broken/empty) if this CC session runs before 8 PM ET, and would correctly update once real rounds populate.
- Confirm zero regression to the golf card / any other existing schedule card — this must be purely additive to the HRD card specifically.

## DONE CONDITION

HRD bracket card shows real, live data from the relay when available, correct pre-event placeholder state otherwise, real journalism context wired in. Zero regression elsewhere.

**Confidence scoring:**
- TASK 0 confirms real injectPGALeaderboard mechanics and real API-to-bracket field mapping, not guessed (30 pts)
- TASK 1 correct fetch + injection, matches established conventions (35 pts)
- TASK 2 journalism context correctly wired at the right call site (15 pts)
- TASK 3 real verification against the live endpoint, zero regression confirmed (20 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
