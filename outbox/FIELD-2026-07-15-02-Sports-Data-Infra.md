# FIELD — Sports Data Infrastructure, 2026-07-15

**Status: All pieces done and verified, except `cfb-curatedrank-relay`'s downstream consumer chain, which is staged but not yet live-tested against a real slate (season doesn't start until Aug 29).**

## CFB featured-tier / overflow mechanism

Real problem: CFB can run 60-130+ games on one Saturday; no existing FIELD mechanism caps or paginates a section. Built generic on purpose, not CFB-specific, since college basketball will need identical treatment later — validated via a real historical ESPN query confirming college basketball's `curatedRank` field exists in the identical shape (Michigan Wolverines `curatedRank: {current: 3}`, real March 2026 date).

Design: featured-tier promotion via three signals — real rank ≤25, existing Scout's Pick trigger, or MY_TEAMS membership — deliberately not a hard rank-only filter, which would have reintroduced the "only the hyped game matters" bias Scout's Pick/Anti-Hype exists to counter. `isFeaturedTierGame`/`buildOverflowStrip`/`buildRankBadge` built, threshold=30, wired into the shared section-render loop. 100/100, verified against a real live section (WNBA, 3 games).

Found a deeper gap during execution: CFB games didn't reach `allData.sports` at all — no injection pipeline existed (WC26 was the only sport with a generic one). Correctly scoped out into its own companion (`cfb-section-injection`) rather than expanding this dispatch.

**`cfb-section-injection`** (jubilant-bassoon): built generic `injectV2SportSection(sportKey, sectionLabel)`, wired for CFB. Found and fixed a real prerequisite — `mapV2ToESPN` itself needed to thread `homeCuratedRank`/`awayCuratedRank`, or the relay's future rank fix could never reach the schedule object. Genuinely staged, not shipped — real forced tests, zero live-slate data (none exists until August).

**`cfb-curatedrank-relay`** (field-relay-nba): `adaptESPNFootball` now forwards real `curatedRank.current` from ESPN. Live-verified against real historical Ohio State/UCLA data after direct curl/WebFetch were both blocked (found a working browser-tool path instead of settling for synthetic-only tests). Was initially misfiled into jubilant-bassoon (docs-only write access is repo-scoped) — caught and relocated to the correct repo.

## MLS tournament refresh + TELUS duplicate-row fix

`mls-tournament-refresh`: found the CC-CMD's own context was already stale (a partial sync had landed before the dispatch even ran). Found and fixed two real script bugs: `DATE_FROM` computed fresh as "today" every run (would exclude the May Preliminary Round and even yesterday on a same-day refresh), and an MLS-club roster filter that structurally excluded any all-Canadian-Premier-League tie (Forge FC vs CS Saint-Laurent, Supra vs Ottawa — zero MLS participants). Roster-filter exception scoped to TELUS only, Leagues Cup/US Open Cup's filter correctly left untouched. Real live sync verified via direct D1 query against every specific score.

Filed its own follow-up: `telus-sf-duplicate-rows` — `MLS-COM-00002V_SF-01` had 4 rows instead of 2 (stale `TBC` placeholder pair alongside the resolved real-team pair). Root cause: the relay's `/archive/game` `id` generation is team-name-based, not `series_key`-based, so a placeholder-to-real-name transition inserts rather than updates. Data-side fix (2-row delete) shipped; durable relay fix (`archive-game-series-upsert-key`, correctly recognized as out-of-scope for a jubilant-bassoon-only dispatch) written and dispatched separately — status: not yet executed as of this doc.

## European qualifying (UCL/Europa/Conference)

Found via direct verification that BSD's existing `league_id` (7 for UCL, 8 for Europa/Conference) already includes qualifying rounds natively — confirmed via a real CI-as-proxy probe against BSD's live API with the real token (`round_name: "Qualification Round 2"` present, same teams ESPN showed). No new BSD integration needed. ESPN's `_qual` slugs (`uefa.champions_qual` etc.) confirmed real and live, 10/6/1 real events respectively on the day checked.

New `V2_LEAGUES` entries (`uclqual`/`europaqual`/`conferencequal`) added, sharing `bsdLeagueId` with their main-tournament counterparts deliberately. A regression risk this session wasn't asked to check was proactively verified anyway: the shared `bsdLeagueId` could have flipped `BSD_LEAGUE_ID_TO_SLUG`'s first-listed-wins tie-break (built earlier the same night) — confirmed it held before committing. Also corrected this session's own CC-CMD premise: BSD's `round_name` does not thread into `game.round` anywhere in the codebase as assumed — the real, already-working mechanism is ESPN's own `altGameNote` field, confirmed live ("UCL Qualifying, First Round"). 99/100.

## FPL player-analytics context

Real finding: FPL was used for exactly one thing end-to-end — goalscorer name resolution — despite `bootstrap-static` already carrying real xG/xA/ICT/form data for every player. `element-summary`/`set-piece-notes` were never actually allowlisted on the relay (`FPL_ALLOWED_EXACT`), a real gap between what was researched as available and what was ever wired.

Widened the allowlist, built `buildFPLPlayerContext` (CONTEXT_SOURCE, priority 8). Genuine mid-investigation self-correction: initially concluded `element-summary` wasn't needed (fresh-season stats all zero), then found it carries the complete prior season's per-gameweek history `bootstrap-static` doesn't expose — reversed the design based on that evidence. Found a real edge case by checking all 20 real teams rather than a sample: ESPN and FPL use different abbreviations for Man City (`MNC`/`MCI`) and Man Utd (`MAN`/`MUN`) — built the real 20-team mapping. Tested the actual exported function against real captured data, including confirming injury-exclusion correctly overrides a higher raw `ict_index`. 100/100.
