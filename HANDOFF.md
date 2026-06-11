# FIELD HANDOFF — 2026-06-11 (WC Bracket + UserDO)

## HEADS
- jubilant-bassoon HEAD: 1897128
- SW_VERSION: 2026-06-11a
- Smoke: 572/0
- field-relay-nba HEAD: 61d309f

## WHAT SHIPPED

### feat: WC Live Conditional Bracket (05eed4a)
Two sub-tabs within WC mode: Groups (existing) + ⚡ Bracket (new).

Bracket tab shows all 16 Round of 32 matchups as they'd form right now
given current standings — "If today's results hold." One concrete bracket,
most-likely-current-path. Updates live as match data refreshes.

- WC_R32_SLOTS: all 16 R32 matchups from FIFA Annex C (matches 73–88)
  - 8 fixed: 1st vs 2nd, no 3rd place (73, 75, 76, 78, 83, 84, 86, 88)
  - 8 conditional: group winner vs best 3rd from eligible groups
- resolveWCBracketTeam(): resolves slot descriptors → team names from
  perGroupTable (currentTable from computeGroupScenarios). 3rd-place slots
  use best current 3rd from eligible groups (Pts→GD→GF sort).
- renderWCConditionalBracket(): renders all 16 matchups grouped by date
  (Jun 28 – Jul 3). Handles Day 1 gracefully (all TBD).
- switchWCTab(tab): Groups ↔ Bracket. Caches standings/results/odds/live
  for tab-switch re-render via window._wcLast* pattern.
- renderWCSection() refactored: caches data, renders both tabs, auto-
  switches to bracket in knockout phase (June 29+).
- CSS: .wc-sub-tabs, .wc-r32-grid (1→2→3 col responsive), .wc-r32-card
- Smoke A527–A529 added.

### feat: UserDO Architecture — relay + client bridge (61d309f + 1897128)

Relay (field-relay-nba@61d309f):
- src/user-do.js: Durable Object, UUID-keyed, no PII.
  Stores seriesLedger, watchHistory (30d TTL), dramaticMomentsMissed (7d TTL).
  deviceSyncToken = SHA-256(userId) — PREF-SYNC-QR upgrade path.
  Routes: /user/init, /user/state, /user/event
- wrangler.toml: USER_DO binding + v2-user-do migration.

Client (jubilant-bassoon@1897128):
- getFieldUserId(): crypto.randomUUID() → localStorage.field_user_id
- _userDoRelay(): fire-and-forget, keepalive:true
- recordWatchOpen(): wired into openBottomSheet() + mvAdd()
- recordSeriesGame(): fires when game.seriesRecord present on sheet open
- recordPeakMissed(): visibilitychange → drama >= 75 while hidden
- FIELD_FEATURES 'user-do-client': '2026-06-11'
- Smoke A523–A526 added.

## PRIORITY LIST

1. Series dots 6a                ← both finals still live
2. Arc sparkline GLYPH 6b        ← pair with 6a
3. WHOLE FIELD toggle 6c
4. State transition 6e
5. Drama spectrum 6f
6. WC bracket — SHIPPED ✅       (deadline met, June 27)
7. UserDO — SHIPPED ✅
8. M5 score ticker fade (assess severity)
9. Wimbledon draw context        (before July 7)
10. Design system (~90 min TYPE C)

## SMOKE
572/0
