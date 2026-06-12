# FIELD HANDOFF — 2026-06-11 (SSE espnScores writeback complete)

## HEADS
- jubilant-bassoon HEAD: ffae7d6 (auto-overlay after bd4f0f1)
- Last dev commits:
    bd4f0f1 — feat: AmbientDO SSE espnScores writeback (card display ~3s)
    916a107 — fix: remove 90s SSE polling reduction
- SW_VERSION: 2026-06-11g
- Smoke: 601/0 ✅
- field-relay-nba HEAD: e4bd33c (unchanged)

## WHAT SHIPPED THIS SESSION

### 90s polling regression fix (916a107)

computeLiveInterval SSE safety-net branch removed. SSE doesn't write to
espnScores[], so reducing polling to 90s would stale card score display.
Correct model: SSE supplements polling for event reactions; polling owns
card state until writeback is complete.
A553 updated to assert 90s branch NOT present.

### espnScores writeback (bd4f0f1)

SSE now writes directly to espnScores[] on every score/lead_change/final/
connected event, triggering renderESPNScores() at ~3s latency.

score/lead_change writeback:
  Key: data.home + '|' + data.away (matches fetchV2AllScores format)
  Guards: key must already exist (polling seeds); never overwrite state:post
  Updates: homeScore, awayScore, period, clock, detail, homeWinning, state
  Preserves: linescores, leaders, wp, espnEventId (other sources own these)
  Updates: espnScoreTs[key], _scoresBySource[key].apisports (source:'sse')
  Render: _sseRenderTimer (200ms coalesce) → renderESPNScores()

connected seed writeback:
  Applies current DO live state to espnScores on SSE connect
  Triggers single renderESPNScores() after seeding

final writeback:
  Writes state:'post' immediately, triggers renderESPNScores()

Speed result:
  Card score display: was 20-45s → now ~3s (SSE latency)
  Event reactions (Night Owl, lead change burst, CRUNCH): ~3s (unchanged)
  Polling: continues at 20-45s as safety net + for fields SSE doesn't carry
    (linescores, leaders, wp, Savant data)

Smoke: A555-A558 added (601/0 ✅)

### CF limits audit

Workers Standard (Paid): 10M req/month included, 30s CPU/req, 5min CPU/cron.
Subrequests: 10,000/invocation (raised from 1,000 Feb 2026).
DOs: billed for active duration; hibernation = $0. setAlarm = 1 row write.
AmbientDO alarms: ~30,000 writes/month = 0.06% of 50M included. Fine.
Main scaling concern: request volume at 1,000+ users → SSE writeback path
reduces this via coalesced rendering, but polling still runs per-browser.

## COMPLETE SSE ARCHITECTURE STATE

AmbientDO (relay: bc2fac4):
  Single DO "field:ambient". Alarm 30s. Sports: nba/nhl/mlb/wc26/mls/5×soccer.
  SSE events: score, lead_change, final, all_final, ping, connected.

AmbientEventSource (client: bd4f0f1):
  window._ambientES. Auto-connects. Reconnects 1.5× backoff.
  On score/lead_change: writes espnScores[] + coalesced renderESPNScores()
  On final: writes state:post + renderESPNScores()
  On connected: seeds espnScores from DO live state
  On all events: emitScoreEvent → fieldEvents bus → all subscribers

Result: both card display AND subscriber reactions at ~3s.
Polling remains safety net at 20-45s for richer data fields.

## PRIORITY LIST

1. State transition 6e ← next
2. Drama spectrum 6f
3. WC projections quality (Ecuador/Ivory Coast anomaly)
4. M5 score ticker fade
5. Wimbledon draw context (before July 7)
6. Design system (~90 min TYPE C)
7. Multiview velocity grid (infrastructure complete — A555 enabled)

## SMOKE
601/0 ✅ CI: Deploy gate success bd4f0f1, Smoke Test success bd4f0f1
