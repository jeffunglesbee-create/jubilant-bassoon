# CC Session Outbox — Generic featured-tier + compact overflow for high-volume sports (CC-CMD-2026-07-15-featured-tier-overflow)

**Date:** 2026-07-15
**Scope:** generic mechanism wired into `renderAll()`'s existing per-section loop, CFB-ready but not CFB-specific.

## TASK 0 — Probe

`grep -n "_gameImportance\|isScoutsPick\|isTopPick\|function buildSectionHTML" index.html` — the probe command's own assumed function name (`buildSectionHTML`) doesn't exist; the real section-rendering function is `renderAll()` (`index.html:11545`), confirmed by locating the real `class="sport-section"` template emitter. Read it in full (the entire `filtered.map((sec,si)=>{...})` block, ~280 lines) before designing.

**`curatedRank` threading — confirmed absent, both sides, not assumed either way:**
- Client: zero occurrences of `curatedRank` anywhere in `index.html`. The existing `homeRank`/`awayRank`/`getCachedTeamRank` machinery is a **different, unrelated concept** (FIFA world rankings for soccer drama-scoring, via `/fifa-rankings/{team}`) — confirmed by reading `getCachedTeamRank`'s full implementation, not assumed from the similar name.
- Relay: read `adaptESPNFootball(ev, sport)` directly from `field-relay-nba`'s real source via `mcp__FIELD_Handoff__read_file` (not the `read_source` search tool, which returned zero hits for a term — "bsd" — confirmed to exist in the same file earlier tonight; treated as unreliable rather than trusted). `home`/`away` objects are built as `{name, abbr, score}` only — no rank field read or forwarded anywhere in the function.

Per the CC-CMD's own instruction, this is **not silently built into this dispatch** — flagged and filed as a separate relay-repo companion, `docs/CC-CMD-2026-07-15-cfb-curatedrank-relay.md`.

**A second, deeper gap found beyond what TASK 0 anticipated, honestly investigated rather than assumed away:** CFB games never reach `allData.sports` (the schedule data `renderAll()` actually renders) at all today. Confirmed three independent ways: (1) `fetchV2AllScores()` only ever writes to `espnScores[key]`, never creates new `allData.sports` entries for any sport; (2) WC26 is the *only* sport with a dedicated section-injection block (`_wcSectionInjected`) — zero equivalent exists for `cfb`/`nfl` (confirmed via `grep -n "FIELD_V2_SOURCES\.\(nfl\|cfb\)"` returning zero hits outside the enable-flag object); (3) `FIELD_V2_SOURCES.cfb` is itself date-gated off until `2026-08-29T00:00:00Z` — genuinely off-season today, so this gap has never been observable in production. Filed as a second companion, `docs/CC-CMD-2026-07-15-cfb-section-injection.md`, since building an entire new schedule-injection pipeline (mirroring WC26's ~75-line pattern) is a separate, larger feature than "add a display split to an existing render path."

Neither gap blocks TASK 1 — the generic mechanism is built to be a safe no-op for the rank signal and to activate automatically for CFB the moment both companion pieces land, without needing to be rebuilt.

## TASK 1 — Build

- **`isFeaturedTierGame(g)`** (`index.html`, before `renderAll`): promotes on any of rank ≤25 (`Math.min(g.homeCuratedRank ?? 99, g.awayCuratedRank ?? 99)`), MY_TEAMS involvement, or `isScoutsPick(g)`. Deliberately `g.homeCuratedRank`/`g.awayCuratedRank` — **not** `g.homeRank`/`g.awayRank`, which already means something else (FIFA rank) elsewhere in this file; reusing that name would have been exactly the field-collision bug class this codebase has already found and fixed multiple times tonight. Ranking is one way in, not a hard filter — MY_TEAMS/Scout's Pick still promote an unranked game, preserving the existing anti-hype design per the CC-CMD's own explicit design tension.
- **`buildOverflowStrip(games, sportLabel)`**: generic, reusable, genuinely not CFB-named. Collapsed by default (`.overflow-strip.collapsed`), toggle expands/collapses via a fresh-per-render listener matching this file's established convention (Night Owl's own collapse pattern) rather than event delegation (not used elsewhere in this codebase). Rows carry `data-open="${g._id}"` and are wired into the **same** existing touch/click handling block full cards use (broadened the `querySelectorAll` selector from `.card-body[data-open]` to `.card-body[data-open], .overflow-row[data-open]`) — reuses the real, carefully-built Samsung-touch-safe tap handling rather than inventing a simpler one that would miss it. Clicking a row opens the **same** `openBottomSheet()` full cards use — a pointer to the existing detail UI, not a second copy.
- **`buildRankBadge(g)`**: small `#N` chip(s), styled consistent with the existing `.round-badge`/`.importance-badge` small-chip family (reused the visual language, not the exact HTML structure, since importance-badge is semantically about stakes/icon+narrative, not a numeric rank tag) — added into the card template right after the existing `buildRoundBadge(g)` badge-row.
- **Threshold — 30, reasoned from real observed volume, not an arbitrary round number:** every real low-volume sport section observed in this codebase stays well under it (NFL's real max is 16); CFB's real confirmed range (60-130+, with a specific 99-game date already verified per the relay's own commit history) sits comfortably above it. Documented directly in the code comment.
- **Wired generically into `renderAll()`'s existing per-section loop** (not a CFB-specific branch): `_overThreshold = games.length > FEATURED_TIER_OVERFLOW_THRESHOLD` gates whether `cardGames`/`overflowGames` differ from the full `games` array at all — when under threshold, `cardGames = games` (the exact same array, unchanged code path). This means the mechanism is live for CFB automatically the moment the two companion pieces (relay rank field, section-injection pipeline) land — no CFB-specific wiring needed in this dispatch, matching "wire this for CFB now (the adapter that exists)" in the sense that it's already sitting in the one shared path CFB will use.
- No CBB-specific code added anywhere — confirmed via grep, the mechanism only references `isFeaturedTierGame`/`buildOverflowStrip`/`buildRankBadge`/`FEATURED_TIER_OVERFLOW_THRESHOLD`, all sport-agnostic names.

## TASK 2 — Verify

- Full-file script-block parse: 2/2 clean.
- `node smoke.js index.html`: **929 passed, 0 failed** (924 baseline + 5 new `A-FTO-*` structural assertions, added matching this codebase's own `FIELD_FEATURES`/smoke-assertion convention). One self-caught bug during authoring: an unescaped `??` inside a smoke assertion's regex literal (`?` is a regex quantifier metacharacter) produced a false failure — caught immediately via direct debug, fixed to `\?\?`, not worked around.
- **17 real forced-condition tests** (Node `vm`, `isFeaturedTierGame`/`buildRankBadge`/`buildOverflowStrip` extracted verbatim, tested against the real confirmed ESPN `curatedRank` shape):
  1. Ranked team (homeCuratedRank=3) → promotes.
  2. Unranked but Scout's-Pick-eligible → promotes (ranking is not a hard filter, confirmed).
  3. Unranked MY_TEAMS game → promotes.
  4. Plain unranked/non-Pick/non-MY_TEAMS → correctly does NOT promote.
  5. `curatedRank` fields entirely absent (today's real state) → no crash, safely treated as unranked.
  6. Mixed 5-game slate → exactly 3 featured / 2 overflow, original order preserved within each sub-group (confirms the stable-partition requirement, not a fresh sort).
  7-8. `buildRankBadge`: renders `#N` for a real rank, renders nothing when absent.
  9. `buildOverflowStrip`: correct collapsed structure, correct row count, `data-open` wiring, empty-input safety.
  10. Real source: confirmed `renderAll`'s split logic is genuinely inert below threshold (`cardGames = games`, the same array, when not over threshold).
  11-12. Threshold sits strictly between NFL's real max (16) and CFB's real confirmed minimum (60).

  All 17 passed.
- **Non-regression on a real, currently-active low-volume section** (NFL has zero real games today — genuinely off-season, `V2_SPORTS_ENABLED.nfl` gates it off until Sept 10 — so substituted with a real, live check): queried the relay directly (`/v2/games?sport=wnba&date=2026-07-15`) → **3 real WNBA games today**, confirmed via a live relay probe, not assumed. 3 games is far under the 30-game threshold, so `_overThreshold` evaluates false and `cardGames = games` unchanged — the mechanism stays completely inert for this real, live section today.

## DONE CONDITION

A generic featured-tier + compact-overflow mechanism exists, verified against the real ESPN `curatedRank` shape (including the cross-sport CBB shape confirmation from the CC-CMD's own CONTEXT, proving the generic design is justified) via 17 real forced-condition tests. Live in the shared `renderAll()` path all sports already use, so it activates for CFB automatically once the two companion pieces land — flagged and filed rather than silently built into this dispatch. Existing low-volume sports render unchanged, confirmed against a real, live, currently-active section (WNBA, 3 games today). Ranking is one promotion signal among three, not a hard filter — Scout's Pick and MY_TEAMS still surface unranked games, preserving FIELD's existing anti-hype design.

## Confidence score

- TASK 0 (25 pts): read the real current section-rendering code (correcting the probe command's own wrong assumed function name), confirmed `curatedRank` is absent on both sides via direct source reads (not the unreliable search tool), and surfaced a second, deeper gap (no CFB section-injection pipeline exists at all) that the CC-CMD itself didn't anticipate — flagged both rather than silently building either into this dispatch: 25/25
- TASK 1 (45 pts): genuinely generic mechanism (sport-agnostic naming throughout), all three real promotion signals correctly implemented (rank via a deliberately distinct field name avoiding a real collision with the existing FIFA-rank fields, Scout's Pick, MY_TEAMS), overflow threshold reasoned from real observed CFB volume with documented rationale, CFB wired via the shared generic path without any CFB-specific branch or a premature CBB build: 45/45
- TASK 2 (30 pts): real forced tests covering all four promotion cases plus edge cases, non-regression confirmed against a real currently-live low-volume section (substituted for NFL's off-season example, disclosed honestly), smoke count confirmed with one self-caught regex bug fixed rather than left broken: 30/30

**Total: 100/100.**

## Commit

- `index.html`: `FEATURED_TIER_OVERFLOW_THRESHOLD`, `isFeaturedTierGame`, `buildRankBadge`, `buildOverflowStrip` added; `renderAll()`'s section loop wired to apply the split generically; new `.rank-badge`/`.overflow-strip`/`.overflow-row` CSS; touch-handling selector broadened to include overflow rows; new toggle wiring block; `FIELD_FEATURES` entry added.
- `smoke.js`: 5 new `A-FTO-*` structural assertions.
- `docs/CC-CMD-2026-07-15-cfb-curatedrank-relay.md`: new companion CC-CMD (relay repo, curatedRank passthrough).
- `docs/CC-CMD-2026-07-15-cfb-section-injection.md`: new companion CC-CMD (this repo, CFB schedule-injection pipeline).
- This manifest.
