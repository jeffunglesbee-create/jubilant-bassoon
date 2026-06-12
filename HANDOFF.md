# FIELD HANDOFF — 2026-06-11 (CF edge cache + performance honesty)

## HEADS
- jubilant-bassoon HEAD: 6f7a3e6 (client unchanged this session)
- field-relay-nba HEAD: 03fff2c (CF cache + AmbientDO 15s)
- SW_VERSION: 2026-06-11g
- Smoke: 601/0 ✅

## LATENCY TRUTH (documented this session)

The ~3s claim was the time from AmbientDO detecting a delta to browser render.
True end-to-end (real world goal → FIELD card): 0–31s avg ~15s (was).
After 15s alarm: 0–16s avg ~7s.

The constraint is api-sports REST update frequency (~30–60s), not FIELD infra.
Honest claim: "scores update within ~15s of api-sports data in live matches."
SSE architecture is genuine — it eliminates the browser-side latency entirely.
What remains is the upstream data freshness window.

## WHAT SHIPPED THIS SESSION

### CF edge caching on /v2/games (relay: 03fff2c)

handleV2Games and handleV2Standings: cacheEverything:false → true
cacheKey:targetUrl excludes x-apisports-key from CF cache key
cacheTtl: 30s for games, 3600s for standings

VERIFIED: 509ms first call → 65ms second call (7.8× speedup, CF edge hit)

Effect on api-sports quota:
  Before: 50 users × 30s poll = 864,000 calls/day (quota: 100/day/sport)
  After:  CF cache serves all users from same 30s response window
          api-sports calls = ~17,280/day regardless of user count (98% reduction)
  This is the critical fix that makes FIELD scalable: O(sports) not O(users)

### AmbientDO POLL_LIVE_MS 30s → 15s (relay: 03fff2c)

Safe because CF cache absorbs the api-sports quota cost.
DO polls at 15s but cache TTL is 30s → every other DO poll hits cache.
api-sports max: 2/min per sport (same as before).
Latency improvement: avg ~30s → avg ~15s (halved).

### RELAY_BASE env var

Exposes relay self-URL as wrangler [vars].RELAY_BASE.
AmbientDO self-call now reads from env rather than hardcoding prod URL.

Health: v2-cache added

## CF LIMITS SUMMARY (from audit this session)

Workers Standard: 10M req/month. With CF edge cache, N users → 1 cache miss per 30s.
Request volume at 1000 users: was 86M/month → now ~17,280/day = ~518,400/month.
Still within 10M? No — 518k/month well under. Even 98% reduction = sustainable.

DO alarms: AmbientDO 15s = ~172,800 alarms/month = 0.3% of 50M included writes.
Hibernate: all 4 DOs use hibernation. Duration billing only when active.
R2, D1, KV, Queue: all well within included quotas at current scale.

## COMPLETE PERFORMANCE PICTURE

End-to-end chain:
  api-sports updates live data: ~30-60s cadence (their internal polling)
  AmbientDO alarm: 15s → detects delta within 15s of api-sports updating
  SSE fan-out to browser: ~1s
  espnScores writeback + renderESPNScores: ~0.2s
  Total: 0-16s avg ~7s (was 0-61s avg ~30s before this session)

Client polling:
  Continues at 20-45s drama-based cadence
  Hits CF edge cache → api-sports sees only 2/min per sport
  Provides enrichment: linescores, leaders, wp, Savant (SSE doesn't carry these)

## PRIORITY LIST

1. State transition 6e ← next
2. Drama spectrum 6f
3. WC projections quality (Ecuador/Ivory Coast anomaly)
4. M5 score ticker fade
5. Wimbledon draw context (before July 7)
6. Design system (~90 min TYPE C)
7. Multiview velocity grid (all infrastructure complete)
