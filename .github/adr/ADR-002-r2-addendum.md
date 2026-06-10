# ADR-002 R2 Storage Addendum

**R2 Object Storage Within the Three-Component Architecture**  
Date: June 10 2026  
Status: Accepted addendum to ADR-002  
Drive: 1C0Cw4w7Rx4kHqdQhy-mDN3mJK398DbWP  
Disclaimer: NOT legal advice. Engineering analysis for counsel review.

## Context

ADR-002 was written before Cloudflare R2 was activated for FIELD (May 31 2026).
R2 is now used as an analytics data layer within Component 1 (the relay).

The question that prompted this addendum: *Is R2 just another server we should
avoid regarding RUWT?*

## Finding: R2 is not a RUWT concern under current usage

R2 (bucket: `field-relay-data`) is a storage layer within Component 1. What
matters is not that R2 exists but what it stores and which components read it.

**Current R2 contents are team performance statistics, not game ratings:**

| Key pattern | Content | RUWT category |
|-------------|---------|---------------|
| `mlb/2026/*.json` | ABS rates, xBA/xSLG, sprint speed, pitch tempo/arsenals | Team statistics — published Savant tables |
| `nfl/2026/*.json` | Player EPA, NGS CPOE, PFR receiving | Player/team statistics — published nflverse |
| `soccer/fbref/*.json` | xG, xGDivergence, pressing, PSxG diff | Squad analytics — published FBref |
| `nhl/scf-2026/series-stats.json` | Series PP%, PK%, PDO | Derived from boxscore goals + SOG |
| `nhl/2026/gsax-playoffs.json` | GSAX per goalie | Derived from MoneyPuck xG model |
| `nba/2026/clutch_*.json` | Team clutch DRTG/ORTG/NET_RATING | Published from stats.nba.com |
| `soccer/wc2026-patches.json` | Editorial text amendments | No ratings |

None of these describe "how exciting is this game right now" — the RUWT core
concept. They describe team quality on specific dimensions from historical/
aggregate data.

## The Coupled-Pair Test

Every RUWT apparatus claim requires a **rating engine AND a notification engine
coupled to it**. Applied to R2:

- Does R2 contain output of a "rating engine"? **No.** Team performance stats.
- Does Component 3 (push cron) read from R2? **No.** Push reads raw game data only.
- Is there any path from R2 to a push notification? **No.**

R2 data flows only to: (a) journalism prompt enrichment (Component 1 prose
generation), and (b) client-side analytics chips (Component 2 browser rendering).
Neither terminates in a push notification. The coupled pair does not form.

## New Pattern: Server-Side Derived Computation Before R2 Write

ADR-002 Rule A forbids computing "game classifications or interest values."
R2 introduced a pattern the original ADR didn't address: the relay computing
team-level derived metrics before writing.

Computations currently performed server-side:

```
nhl-series-r2.js:
  PP%  = ppGoals / ppOpportunities
  PK%  = 1 - (pkGoalsAgainst / pkOpportunities)
  PDO  = (goalsFor / shotsFor) + (1 - goalsAgainst / shotsAgainst)

nhl-gsax-r2.js:
  GSAX = xGoals - goalsAllowed
```

These are team analytics, not game ratings. They satisfy Rule A. But they
established a new computational pattern this addendum must bound explicitly.

**Permitted:** Relay computes team performance statistics from raw published
data (box scores, official APIs, analytics tables). Results written to R2.
Client reads R2 for display and journalism context.

**Forbidden:** Relay computes a value representing the excitement, interest
level, or desirability of watching a specific game. Such a value must never
be written to R2, KV, D1, or any shared storage.

**Distinguishing test:** Could the value be described as "how exciting is this
game"? PP% and GSAX cannot. An "excitement score" can. The relay may never
compute the latter regardless of labeling.

## The PDO Edge Case

PDO (shooting% + save%) is used as a luck indicator. "Running hot" language
is directionally adjacent to "momentum" or "excitement."

PDO is clean because:
- Team-level metric, not game-level excitement
- Computed from historical boxscore arithmetic, not live event monitoring
- Used in journalism prose and client-side chips only; never in push path
- The "running hot/cold" label is generated **client-side** in `_buildAnalyticsChips()` — Component 2 behavior. The relay stores only the raw number.

The exposure would occur if a future feature wrote a "team hotness score" to R2
and Component 3 read it to decide whether to push. That path must not be built.

## New Rule F (binding from this addendum)

> **RULE F — R2 STORES STATISTICS, NOT RATINGS.**
>
> R2 may store team performance statistics derived from raw game data
> (PP%, PK%, PDO, GSAX, clutch DRTG, xG, sprint speed, EPA, etc.).
>
> R2 must not store any value representing the excitement, interest level,
> desirability, or game-level quality rating for a live or upcoming game.
>
> **Test:** "Does this value answer the question 'how exciting is this game
> right now?'" If yes, it may not be written to R2 (or any relay storage).
> If no, it may be written.
>
> **Component 3 (push cron) must never read from R2 regardless of what R2
> contains.** This constraint is unconditional — it is not sufficient that
> current R2 contents are clean.

## Rule C Clarification for R2

ADR-002 Rule C: "Each component reads RAW data only."

R2 is within Component 1. The journalism cron (also Component 1) reading from
R2 is Component 1 reading its own derived storage — permitted. It does not form
a cross-component coupling.

| Action | Status |
|--------|--------|
| Relay journalism cron reads R2 → injects into journalism prompt | ✅ Permitted |
| Relay serves R2 data via `/mlb-stats/`, `/nhl-series/`, etc. | ✅ Permitted |
| Component 3 reads any R2 value to decide whether to push | ❌ Forbidden |
| Any component reads Component 2 output from any storage | ❌ Forbidden |

## Open Item

ADR-002 remains PROPOSED (pending registered patent attorney review + Jeff's
approval). Rule F is added to the PROPOSED state. The split-operations question
(can server-side drama scoring happen post-game while live scoring remains
client-side?) requires attorney input and is unresolved.
