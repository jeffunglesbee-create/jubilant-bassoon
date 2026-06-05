# FIELD HANDOFF — 2026-06-05 (Session END)

## State
jubilant-bassoon HEAD: 295dc8c · Smoke: 508/0 · Unit tests: 66/0
field-relay-nba HEAD: 25d8fbc
SW_VERSION: 2026-06-05a

## Session Ships (chronological)

### PM-25a/b/c — Card Render Slot + Tier Refactor + Confidence Glyph
See prior entries. All shipped earlier today.

### Daily update — June 5 2026 (efeebbe)
SCF G2 CAR 4-3 VGK series tied 1-1, WNBA Fri/Sat, CFL Week 1,
Apple FNB (CLE@TEX + KCR@MIN), MLB June 5 slate.

### PM-27 — Event Bus Payload Standard (295dc8c, A497–A499)

PM-27a: data-gameimportance on card root template
  data-gameimportance="${g._gameImportance}" written when set.
  Enables CSS/JS playoff-card queries without DOM traversal.

PM-27b: field:crunch emitter + CRUNCH Fan-Out chip (S3)
  renderCardBadges() emits field:crunch on CRUNCH TIME badge.
  Subscriber S3 scans .game-card.espn-live[data-gameimportance="playoffs"]
  excluding source → .fan-out-chip "⚡ via {matchup}" with scroll-anchor.
  "Related card" = playoffs data-gameimportance (championship tier).
  NBA Finals fans out to SCF and vice versa. A497.

PM-27c: field:otw_changed emitter + OTW Changeover beat (S4)
  _prevOTWId tracks last OTW selection. renderOneToWatch() emits on swap.
  Subscriber S4 → .otw-changed "JUST CHANGED ↑" for 12s → timestamp stamp.
  CLS budget = 0. A498.

PM-27d: field:ws_fresh emitter + WS Pulse dot (S5)
  GameSocket.onmessage emits field:ws_fresh. _lastWSMessageTime Map.
  updateWsPulseDot() renders .ws-pulse beside .game-time (solid/dim/stale).
  Self-healing resubscribe on stale. 15s sweep. CLS budget = 0. A499.

CSS: .otw-changed, .otw-changed-stamp, .fan-out-chip, .ws-pulse variants.
Smoke: 505→508 (A497, A498, A499).

## DO NOT ASSUME corrections

getDramaHistory() EXISTS. Population during live games UNVERIFIED.
Must confirm before Arc Poster build.

Hub 1 (PM-25) COMPLETE. Hub 2 (PM-27) COMPLETE.
All three Hub 2 subscribers now shipped:
  S3 CRUNCH Fan-Out: SHIPPED
  S4 OTW Changeover: SHIPPED
  S5 WS Pulse: SHIPPED

## Priority List

### Time-gated (this week)
  1. WC pre-flight — probe all relay endpoints before June 11 opener
     → MEX vs RSA at Azteca, 12pm ET, FOX/Telemundo
     → D1 wc2026 f26669de-e772-4b56-a6d1-f8fdea08a4d4
  2. BALLDONTLIE trial — June 11 opening match data source test

### Remaining subscribers (parallel-trackable)
  3. JQ Gate brand-safe fallback (~60 lines, no hub dep)
  4. iOS PWA Add-to-Home (~40 lines, parallel-trackable)
  5. Drama Dial header chip discoverability (~20 lines)

### Build items (patent-adjacent)
  6. Arc Poster (~200 lines, no backend)
     → BLOCKER: verify getDramaHistory() populated during live games
  7. State Transition PerformanceObserver (~30 lines + assertions)

### Deferred / maintenance
  8. A399 cleanup — detail string says "verified unreachable" (now wrong)
  9. field-relay-nba scoreboard-probe.yml — delete or keep

## Key Refs
jubilant-bassoon HEAD: 295dc8c
field-relay-nba HEAD: 25d8fbc
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4
Smoke: 508/0 · Unit: 66/0

## Drive Docs (this day)
Amnesty Zone Definition: 1qyek7_eBtPvrqhVVljnKZhtmHn9GgVF9h1NilaGX9xc
Session doc (PM-25a/b): 15ZflDC7r1tbZ7UdFP2ToTjUwJp_bHAAOKXO4IYE46nI
