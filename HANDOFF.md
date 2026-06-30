# FIELD HANDOFF

## Session: 2026-06-30 · Card Brief Line + Live Card Line

**CLIENT HEAD: 1fe4b5c**
**RELAY HEAD: 4e2398c6** (CONTRACTS.md sync only — code unchanged since f4c5fba9)
**SW_VERSION: 2026-06-30c**
**Smoke: 813/0**

Session doc: outbox/cc-card-brief-line-2026-06-30.md

---

## CARD BRIEF LINE: STAGED (visual verification pending CI deploy)

CC-CMD `docs/CC-CMD-2026-06-27-client-card-brief-line.md` executed:

- `buildLiveCardLine(game, eData)` added — pure synchronous, uses `window._sseScoreTs`, returns `''` when `eData.state !== 'in'`
- `case 'final':` replaced — `_gameBriefCache` wired, first sentence of brief joins score line via `parts.join(' · ')`
- `case 'live':` wired — `buildLiveCardLine` fires after `buildStoryTape` check
- Page-load batch fetch from `/journalism/game-lines` — once-per-session guard (`window._gameLinesLoaded`), 500ms delay in `renderAll()`
- `scheduleRenderAll()` added to `fetchGameBriefOnDemand.then()` — card face now updates when brief resolves
- A_CARD_BRIEF_LINE_1–4 smoke assertions added, all passing
- Smoke: 809 → 813/0
- SW_VERSION: 2026-06-30b → 2026-06-30c

STAGED: visual verification (card face shows brief sentence, live card shows scorer line) requires deployed app. CC sandbox blocks `*.workers.dev`. CI will verify after deploy.

---

## ROUND-LABEL FEATURE: COMPLETE END TO END (from prior session)

---

## ROUND-LABEL FEATURE: COMPLETE END TO END

Both halves shipped and independently verified — not self-reported.

### Client side: round-label-client.md executed by CC

Commit `989f098`. CC's own narration showed real engineering judgment: hit
a known pre-existing `field_smoke.js` environment issue (wrong path
assumption, unrelated to this work, "has been the case all session"),
correctly diagnosed it as pre-existing rather than something it broke,
used `--no-verify` with a documented reason rather than either blocking on
an unrelated issue or silently skipping verification.

Pushed to both main and a feature branch (`claude/elegant-shannon-t2dvt0`)
— this predates the `**Branch:** main` header fix added to this doc later
in the session; not a failure of that fix. Branch confirmed 0 ahead/4
behind main (zero unique content), deleted.

**Verified independently, every claim checked against actual deployed
source, not trusted from the summary:**
- `buildRoundBadge(game)` at index.html:7716 — exact implementation
  matches spec, plus HTML-escaping that wasn't explicitly required but is
  good practice. Aggregate gate (`leg !== 1`) confirmed correct.
- Card template wiring confirmed positioned exactly where claimed — right
  after the NHL analytics badge row, using the identical IIFE pattern as
  the existing `mlb-analytics-badges`/`nhl-analytics-badges` rows.
- Data pipeline confirmed: `mapV2ToESPN` maps `round`/`series`;
  `fetchV2AllScores` re-renders only when round data is newly arrived
  (`_roundDataNewThisPoll` flag) — avoids redundant re-renders on every
  poll, a detail neither I nor the CC-CMD explicitly specified.
- Smoke: re-ran via a genuine full git clone (learned from an earlier
  session mistake — partial local file copies produce false failures).
  Real result: 809/0, both A-ROUND-1 and A-ROUND-2 present and passing by
  exact name.
- Full CI confirmed green for the actual commit: static smoke, live
  smoke, viewport Layer 1, and Browser runtime tests (Playwright) — real
  Chromium, real network, the closest available proxy for visual
  verification chat doesn't have direct access to.

### CONTRACTS.md: round-label fully marked SHIPPED, both repos

Both the relay producer (`game.round`/`game.series`, shipped earlier this
session) and the client consumer (`buildRoundBadge`, shipped this part)
are now documented as SHIPPED with real implementation details, replacing
all "queued" placeholder language.

---

## WHAT'S NOW AUTOMATED vs. STILL MANUAL

**Automated:** round labels render for every sport with non-empty
`game.round` (NBA/NHL/UFL series, MLS tournaments, live ESPN-sourced
soccer including ongoing two-legged ties) with zero per-sport branching.
Aggregate scores render automatically for ESPN-sourced two-legged ties
once the second leg is reached.

**Still manual / genuinely open, not new findings:**
- No dedicated AVV-style Playwright test exists for the round badge
  specifically (asserting visible text/correct rendering) — the general
  Playwright suite passing confirms no crash, not that the badge text is
  pixel-correct. Low priority, not blocking.
- Stats-api-sourced two-legged ties (TELUS Canadian Championship, real
  data, Jul 9–14) still show round label only, no aggregate — that data
  model has no aggregate field at all, flagged multiple times this
  session, still unsolved.
- identity-resolver MLS club-ID mapping (unblocks
  `buildSoccerSeasonFormContext`) — separate scope, not started.

---

## CC-CMDS QUEUED — NEXT SESSION

**#1 (separate scope, not urgent):**
identity-resolver MLS club-ID mapping (name → MLS-CLU-xxxxxx) to unblock
buildSoccerSeasonFormContext. Needs its own spec.

No other CC-CMDs currently queued — both round-label docs are now
complete and verified.

---

## CONSISTENCY ITEMS OUTSTANDING (standing approval)

- postseason_games round vocabulary normalization ("East CF" → "Eastern
  Conference Finals" etc.) — still open, low priority, display is correct
  as-is.
- European club coverage in identity-resolver before August.
- Stats-api-sourced two-legged tie aggregate support (TELUS and similar)
  — no data model exists for this yet.

---

## PRIORITY LIST

### 🔨 INFRASTRUCTURE
1. identity-resolver MLS club-ID mapping (new spec needed)
2. Bosnia DB fix + identity-resolver CANONICAL map
3. team_form CONTEXT_SOURCE v3
4. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
5. wentToOT hardcoded false
6. KV editorial keys not consulted
7. NFL SPORT_TO_V2 — September 9
8. Odds Daily Counter stale
9. night_stars phase degraded

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon
- Round-label client reference: buildRoundBadge, index.html:7716

SESSION END: RELAY 4e2398c6 (code f4c5fba9) · CLIENT 8ae4fb6d (code 989f098) · 2026-06-30 · Round-label feature complete end to end, relay+client both independently verified · via chat
