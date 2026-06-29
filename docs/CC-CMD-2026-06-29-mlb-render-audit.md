# CC-CMD — MLB Render Pipeline Audit: Simplification Opportunities

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Read render pipeline, map MLB card fields to sources, identify where
           MLB Stats API fields can replace manual logic
**Target time:** 30 min
**No code changes.** Analysis only. Output is a Drive doc.

---

## CONTEXT

C2 found 6/15 MLB Stats API endpoints are CONSUMED. The relay probe found
the API provides rich broadcast data (isNational, homeAway, freeGame,
availableForStreaming, mvpdAuthRequired, availability code), standings with
magicNumber/clinched, weather from GUMBO, gameDurationMinutes for PACE,
and per-play win probability. The client has manual logic for several of
these things. This audit maps what the client builds manually vs what
the API already provides.

---

## PHASE A — Read the render pipeline

```bash
# A1: Find where normalized games become card schema objects
# C3 found 18 keys. Find the function that creates them.
grep -n "_awayAbbr\|_homeAbbr\|_sport\|_insights" index.html | head -10
# Read 50 lines around the match

# A2: Find parseBroadcasts — full function
grep -n "function parseBroadcasts" index.html | head -3
# Read full body (probably 50-80 lines)

# A3: Find MLB_BROADCAST_CHIP_MAP, MLB_TEAM_RSN, MLB_DAILY_OVERRIDES
grep -n "MLB_BROADCAST_CHIP_MAP\|MLB_TEAM_RSN\|MLB_DAILY_OVERRIDES" index.html | head -10
# Read each constant

# A4: Find Peacock time resolution logic
grep -n "PEACOCK\|peacock.*GOTD\|SNB\|LEADOFF\|peacockGOTD" index.html | head -15

# A5: Find standings consumption
grep -n "fetchMLBStandingsParsed\|magicNumber\|clinched\|CLINCH" index.html | head -10

# A6: Find weather usage (if any)
grep -n "weather\|gameData\.weather\|condition.*temp\|PACE\|gameDuration" index.html | head -10

# A7: Find Savant win probability path
grep -n "fetchSavantGameFeed\|winProbability\|win_exp\|delta_home" index.html | head -10

# A8: Find where streams/broadcast chips are rendered on cards
grep -n "stream-chip\|broadcast.*chip\|renderBroadcast\|buildStreamChips" index.html | head -10
```

---

## PHASE B — Map each MLB card field to its source

For each of the 18 card schema keys, document:
- Where the value comes from (which function, which API field)
- Whether the MLB Stats API provides it directly
- Whether manual logic exists that the API could replace

```
CARD FIELD         CURRENT SOURCE              API EQUIVALENT           SIMPLIFIABLE?
────────────────────────────────────────────────────────────────────────────────────
_awayAbbr          normalizeMLBGame            teams.away.team.abbr    No (already direct)
_homeAbbr          normalizeMLBGame            teams.home.team.abbr    No (already direct)
_id                normalizeMLBGame            gamePk composite        No
_insights          ?                           ?                       ?
_postponed         ?                           status.detailedState    ?
_sport             hardcoded 'Baseball'        —                       No
away               normalizeMLBGame            teams.away.team.name   No
confirmed          ?                           ?                       ?
espnGOTD           MLB_DAILY_OVERRIDES         ?                       ?
home               normalizeMLBGame            teams.home.team.name   No
isPlayoff          ?                           gameType=='P'           ?
league             ?                           —                       No
mlbnShowcase       parseBroadcasts             broadcasts[].isNational ?
nationalBundle     parseBroadcasts             broadcasts[].isNational YES — API has isNational
peacockGOTD        MLB_DAILY_OVERRIDES         ?                       ?
sport              'Baseball'                  —                       No
start_time         normalizeMLBGame            gameDate                No
streams            parseBroadcasts             broadcasts[]            YES — see analysis
venue              normalizeMLBGame            venue.name              No (already direct)
```

---

## PHASE C — Identify simplification opportunities

For each card field where the API provides a direct equivalent to manual logic,
document:

1. **What the client does today** (function name, line count, manual lookups)
2. **What the API provides natively** (field name, values, coverage)
3. **What changes** (remove manual logic / simplify to direct read)
4. **Risk** (does removing manual logic break other sports sharing that path?)

Focus areas from prior analysis:
- `parseBroadcasts` + `MLB_BROADCAST_CHIP_MAP` + `MLB_TEAM_RSN` vs API `broadcasts[].isNational + homeAway`
- `MLB_DAILY_OVERRIDES.espnGOTD/peacockGOTD` vs API broadcast flags
- Standings magic number (direct field vs computed)
- Weather from GUMBO vs not surfaced
- Win probability from Savant vs MLB Stats API

---

## PHASE D — Write findings to Drive

Title: `FIELD — MLB Render Pipeline Audit: API Simplification Opportunities (June 29 2026)`
Parent: Drive `0ABxH84VndHL7Uk9PVA`

Structure:
1. Card schema → source mapping (full table)
2. Simplification opportunities (ranked by impact)
3. Fields the API provides that FIELD doesn't use at all
4. Risk assessment per change
5. Recommended implementation order

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| Render pipeline function found and read | 20 | Line number documented |
| parseBroadcasts fully read | 20 | All manual lookups mapped |
| All 18 card fields mapped to source | 25 | No "?" in table |
| Simplification opportunities ranked | 20 | At least 3 identified |
| Drive doc written | 15 | File exists in Drive |

Score < 95: do not publish. Investigate gaps.

---

**Session: 2026-06-29 · CLIENT ONLY · 30 min target · Analysis only, no code changes**
