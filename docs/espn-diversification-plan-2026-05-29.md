# FIELD — ESPN Diversification Plan + Metric→Feed Audit (TYPE D)

**Date:** May 29 2026. **Terms checked live 2026-05-29.** Persisted in-repo (Drive writes
unavailable from sandbox). Governed by STANDARDS.md Rule 45 (no legal verdicts; source-clearance
gate). **Not legal advice** — the commercial step needs counsel.

## The reality (stated plainly)

ESPN is the **spine** of FIELD's live data layer — ~94 touchpoints in index.html (scoreboard,
summary/win-prob arc, NFL EPA PBP, golf leaderboard, situation data). It is also the weakest-posture
source: an unofficial site endpoint, no agreement, and ESPN's site terms don't grant automated use.

There is **no free, clean-grant, real-time, multi-sport scores feed.** Every option is one of:
- **Clean grant (GREEN)** but narrow: nflverse (CC-BY, commercial OK w/ attribution), Football-Data.org
  (licensed free tier), The Odds API (licensed), Open-Meteo, Wikimedia. These actually grant rights —
  but none is a general live multi-sport scores feed.
- **Provider-contract access**: API-Sports, SportsDataIO, Sportradar, TheSportsDB. You operate under
  a real agreement (better than breaching a site's terms), but they **disclaim downstream rights** —
  see API-Sports below. Live multi-sport lives here.
- **Unofficial site endpoints (RED-ish)**: ESPN, and league-own undocumented APIs (MLB StatsAPI,
  NHL api-web) — official infra, no grant, site terms restrict automated use.

So "diversify from ESPN" ≠ "find a clean free feed." It = move the live spine onto a **provider you
have an agreement with**, lean on the GREEN-grant sources where they exist, and defer the
underlying-commercial-rights question to a counsel review before launch.

## API-Sports — the anchor, with its real limits

FIELD **already** proxies API-Sports through field-relay-nba (`/apisports/{sport}/...`, key in
`env.APISPORTS_KEY`), currently for AFL; routes already exist for football(soccer)/basketball(NBA)/
hockey(NHL)/american-football(NFL)/afl. Free plan: 100 req/day per API; paid tiers scale.

Its ToS (api-sports.io/terms, 2026-05-29): individual account; **no reselling the data**; and
critically — **"it is the responsibility of the user to verify and obtain any necessary
authorizations or licenses to use or publish such data… We do not grant any commercial rights on
such competitions,"** with mass-media distribution possibly needing rights-holder licenses.

POSTURE: **access-posture upgrade, not a commercial clearance.** Moving the live spine ESPN→API-Sports
converts "breaching a website's terms via an unofficial endpoint" into "operating under a provider
contract you accepted." That is a real improvement and the fastest one (already integrated). It does
NOT make FIELD commercially licensed — that caveat is deferred to launch + counsel, same as everything
else. Requires Jeff's recorded accept-the-risk decision per Rule 45 before expanding.

## Metric → feed audit (the part you asked for)

Key structural finding: the ESPN dependency is **concentrated**, not scattered. Almost every live
in-game metric consumes the single unified "game" object that today is built from the ESPN
scoreboard+summary pipeline. So re-pointing ONE pipeline (behind an adapter) diversifies all of them
at once. Built metrics and their current feed:

| Metric (exists in index.html) | Current feed | Posture | Replacement |
|---|---|---|---|
| computeGameNarrative, narrativeGrade | ESPN unified game obj | RED-ish | API-Sports live games/events |
| win-probability arc | ESPN summary | RED-ish | API-Sports predictions/live; arc is FIELD's own calc |
| getStatisticalExtremes, drama/situation bonus | ESPN summary/situation | RED-ish | API-Sports events+statistics |
| getFranchiseMisery | FIELD static + scores | low (own data) | any scores feed |
| computeWatchValue, buildStayUpSignal, computeInsights | unified game obj | RED-ish (via ESPN) | follows the spine swap |
| NFL EPA PBP | ESPN core | RED-ish | **nflverse (GREEN)** post-game |
| fetchESPNAthleteStats/Context | ESPN | RED-ish | API-Sports players / BallDontLie |
| buildArbitrageReport, beatTheBook | The Odds API | GREEN | already clean (VERIFY no Betfair path) |
| MLB momentum/pitchers | MLB StatsAPI / Savant | YELLOW | keep derived-only/low-rate |
| AFL metrics | Squiggle | GREEN(etiquette) | already clean |
| Soccer | Football-Data.org | GREEN | already clean |

The metric **algorithms are FIELD's own IP and are not "tainted"** — they're portable. The exposure
is feed-dependency, fixed by swapping inputs, not by deleting metrics.

## Plan (fast where it's safe; gated where it's new)

**Phase 0 — Provider abstraction (do first; pure refactor, NO clearance needed).**
Introduce one normalized game model + a provider-adapter interface. Today metrics read ESPN-shaped
objects directly across ~94 sites; this makes a feed swap a config change, not a rewrite. Touches no
new external source → does not trip the Rule 45 gate. This is the real "as quickly as possible" lever.
(TYPE E refactor; smoke must stay green; add an adapter-contract assertion.)

**Phase 1 — Move the live spine ESPN→API-Sports** (NBA/NHL/MLB/NFL/soccer where covered).
Already integrated; biggest single posture improvement. GATE: Jeff records accept-the-risk noting the
no-commercial-rights caveat (deferred to launch+counsel). Verify coverage/latency/tier vs need.

**Phase 2 — Pin GREEN-grant inputs where they exist.**
NFL advanced/EPA → nflverse. Soccer → Football-Data.org (primary). Odds → The Odds API. AFL → Squiggle.
Weather → Open-Meteo. Cultural/interest → Wikimedia. These carry actual grants; prefer them for
anything shipped.

**Phase 3 — Demote ESPN to fallback, then removable.**
Behind the adapter, ESPN becomes a transitional fallback and is dropped once API-Sports parity is
verified (esp. the win-prob arc's situational granularity).

**Honest gap:** no path makes live multi-sport data a clean commercial grant for free. The defensible
posture is: GREEN sources where they exist + provider-contract access for live + derived analysis
(never raw redistribution) + non-commercial until cleared + one counsel review before launch.

## Verify items
- Confirm `buildArbitrageReport`/`beatTheBook` don't pull Betfair (RED for commercial).
- Confirm API-Sports win-data granularity is enough to recompute the win-prob arc.
- Read TheSportsDB / SportsDataIO terms if a second provider is wanted (TheSportsDB: free, ~$1 Patreon,
  attribution; documented — verify commercial terms before relying).
