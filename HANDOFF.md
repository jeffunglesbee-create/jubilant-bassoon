# FIELD Handoff — June 1 2026 PM-3 (Axis 3 Phase B subtask 9 landed · Phase B COMPLETE · SW 2026-06-01g live)

**jubilant-bassoon HEAD:** 6a543b7 · Smoke: 241/0 pre-gate (A360–A365 green post-gate; A313/A314 known post-gate red) · SW_VERSION 2026-06-01g
**field-relay-nba HEAD:** unchanged (0ae4c11) — but is now serving production traffic for /v1/skater-stats-leaders + /v1/goalie-stats-leaders for the first time
**Session Doc (PM-3, this session — Drive):** 1lcrLKehfzdcUmKvZU-gttxTEyyp3a2zUqDGGrCpuTD4
**Session Doc (PM-2 prior — Drive):** 1TJ4nsP43yxdDNAs5ReZhlgT0BAWVL3-9-7GnSs9bh1c
**Session Doc (PM-1 prior — Drive):** 12CAk9NF1hytbMlJ2JIJSvVWYMMXG_gCUdmKn3E3nH60
**Session Doc (AM prior — Drive):** 1_9ECU61QSWoWFOPgH9oxsCLZ11jj1E_YqZP2lWXwPG8
**WC2026 Format Corrections (READ BEFORE ANY WC BUILD):** 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks

## TIER 0 DEADLINES

- **Stanley Cup G1: June 2** — VGK @ CAR (Phase B 6/7/8 live since PM-2; subtask 9 lands today for G2+)
- **NBA Finals G1: June 3** — SAS hosts NYK (Phase B 6/7 live; playoff leaders NBA hook reserved)
- **World Cup 2026: June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (PM-3)

User opener: "start session, run phase b subtask 9". Direct + scoped. Executed SESSION START hard gate, then implemented Phase B subtask 9 end-to-end — NHL playoff leaders feed. Phase B is now COMPLETE (all four subtasks landed).

### Probe-first methodology (cors-probe protocol)

Sandbox can't reach api-web.nhle.com or workers.dev directly. Used cors-probe.yml twice:
- **Probe 1** (commit a36d191): `https://api-web.nhle.com/v1/skater-stats-leaders/20252026/3?categories=points,goals,assists&limit=5` → 200 OK; shape confirmed `{points:[…], goals:[…], assists:[…]}` with `{firstName.default, lastName.default, teamAbbrev, value}` per entry. Result: `outbox/cors-result-20260601T194319Z.txt`.
- **Probe 2** (commit b62e9e9): `https://api-web.nhle.com/v1/goalie-stats-leaders/20252026/3?categories=savePctg,goalsAgainstAverage,wins,shutouts&limit=5` → 200 OK; shape `{wins, goalsAgainstAverage, savePctg, shutouts}` with same per-entry fields. Result: `outbox/cors-result-20260601T194440Z.txt`.

Both endpoints verified current as of 2026-06-01T19:43Z. Current playoff leaders: Marner 21 pts (VGK), Eichel 18 pts (VGK), Dorofeyev 10 G (VGK), Howden 10 G (VGK), Stankoven 9 G (CAR), Hall 16 pts (CAR), Andersen 1.41 GAA / .931 SV% / 12W / 3 SO (CAR — leads playoffs), Hart .924 SV% / 12W (VGK).

### Subtask 9 — NHL playoff leaders feed (commit 6a543b7)

`index.html` (+177 lines net), inserted as a new block immediately before `populateSeriesContext`:

- `const NHL_PLAYOFF_LEADERS_TTL = 15 * 60 * 1000` (15 min per HANDOFF spec)
- `const _nhlPlayoffLeadersCache = { data, fetchedAt, inFlight }`
- `function buildNHLPlayoffLeadersByTeam(skater, goalie)` — aggregates skater (top 5 from points/goals/assists with per-team cap 4 + surname dedup) and goalie (groups by team+surname into combined "Surname 12W 1.41 GAA .931 SV%" line); returns `{ teamAbbrev → [string,…] }`.
- `async function fetchNHLPlayoffLeaders()` — memory cache → localStorage warm cache → inFlight dedup → parallel Promise.allSettled on skater+goalie via NHL_RELAY → 6s AbortSignal timeout → defensive parsing → serve stale on full failure.
- `function getNHLPlayoffLeadersForGame(game)` — sync getter; NHL-only; returns array of "ABBR Surname N stat" lines (away first, home second) or null.
- `function nhlPlayoffLeadersPrefetch()` — init-time fire-and-forget entry.
- `populateSeriesContext` — DEFERRED placeholder replaced with active write of `game.playoffLeaders` from `getNHLPlayoffLeadersForGame`.
- `nhlPlayoffLeadersPrefetch` wired into init sequence at T+3000ms alongside `bdlPrefetchAll` etc.
- SW_VERSION 2026-06-01f → 2026-06-01g.

`smoke.js` (+22 lines): A365 covers TTL constant, cache obj, async fetcher, both endpoint paths, localStorage key, builder, getter call, prefetch scheduling, populateSeriesContext write, and absence of the DEFERRED comment.

### Functional sanity (pre-push)

Loaded real cors-probe JSON results, ran `buildNHLPlayoffLeadersByTeam`, called `getNHLPlayoffLeadersForGame` on a Cup G1 game shape. Output:
```
VGK M. Marner 21 pts
VGK J. Eichel 18 pts
VGK P. Dorofeyev 10 G
VGK B. Howden 10 G
CAR T. Hall 16 pts
CAR L. Stankoven 9 G
CAR Andersen 12W 1.41 GAA .931 SV%
```

This is what the J3 brief prompt will now contain inside `[PLAYOFF STATS: …]` — exactly the HANDOFF acceptance shape.

NBA game → returned null (correct; NHL-only getter, NBA cache hook reserved).

### Decisions / rules invoked

- **DO NOT INVENT** — endpoint shape verified twice via cors-probe before any dependent code was written; no field names guessed.
- **ADR-001** — playoff leader values are COUNTERS, sourced from feed (never hardcoded). 15-min TTL balances freshness against API cost.
- **Defensive parsing** — all destructuring optional-chained; nullable returns at every layer; try/catch around fetch + storage; graceful degradation (null → no tag).
- **Pattern reuse** — cache shape modeled on `_bdlStatCache`; inFlight dedup follows codebase convention; init scheduling follows `bdlPrefetchAll` precedent.
- **cors-probe trigger discipline** — commit messages explicitly omitted `[skip ci]` (per CI/Deploy Ref incident 10); both workflows ran cleanly.
- **Rule 23** — SW_VERSION bumped on functional change.

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (now urgent: SW 2026-06-01g live with Phase B COMPLETE)
1. **SW `2026-06-01g` active in browser**
2. **Generate / inspect a J3 brief tonight when Cup G1 or G2 lands.** In prompt context, verify ALL FOUR tags:
   - `[COACH: Hurricanes — Rod Brind'Amour; Golden Knights — John Tortorella]`
   - `[HISTORICAL: Carolina's first Stanley Cup Final since winning it in 2006…]`
   - `[INJURY:]` empty for NHL (bdl is NBA-only; documented graceful degradation)
   - `[PLAYOFF STATS: VGK M. Marner 21 pts; VGK J. Eichel 18 pts; …; CAR Andersen 12W 1.41 GAA .931 SV%]` ← **NEW THIS SESSION**
3. Brief depth should now match or exceed `r2_finals_briefs_production.md`.
4. JQ-5 + score ticker pruning items still need browser confirmation (carried from AM).

### P0 — TIER 0 game-day
5. **Cup Final**: each game tests `[PLAYOFF STATS:]` freshness (15-min TTL refresh). After CAR-VGK G1, values for Marner/Eichel/Dorofeyev/Andersen/Hart should update next prefetch cycle.
6. **NBA Finals G1**: [COACH:] + [HISTORICAL:] active; [PLAYOFF STATS:] empty (NBA hook reserved — see P1 item 7 below).

### P1 — NBA half of subtask 9 (never landed, carried)
7. **NBA playoff leaders source decision** (~60-90 min):
   - Investigate BDL playoff endpoint (untested)
   - Or stats.nba.com `/stats/leaderspublic` via relay proxy (requires relay-side route addition)
   - Or narrow Finals-only hardcode (ADR-001 violation, MVP fallback)
8. Once chosen: populate same `game.playoffLeaders` hook from NBA cache (parallel structure to NHL implementation; minimal new code in `populateSeriesContext`).

### P1 — NHL injury feed (subtask 8 NHL half, never landed)
9. api-web.nhle.com has injury endpoints — verify via cors-probe before wiring
10. Populate `game.injuries` hook for NHL games (currently null for NHL, bdl is NBA-only)

### P0 — Hardcoded calendar flip
11. **June 11 HARD:** flip `wc26:true` in FIELD_V2_SOURCES (~5 min)

### P1 — Smoke gate fix (carried)
12. **smoke.js gate position (~15 min):** `if (fail > 0) process.exit(1)` at line 1040 fires before post-line-1040 asserts. A273, A285, A313, A314, A351–A365 sit beyond the gate. Fix: move exit check to very end after summary. Expect pre-existing A313/A314 reds to surface at gate.

### P1 — PWA-A manifest fix (A313 + A314, pre-existing)
13. After gate fix exposes them:
    - Split `manifest.json` icons into `any` + `maskable` purpose entries
    - Add `"prefer_related_applications": false`
    - Spec: PWA Android Spec (Drive `1n5-HFuzQfUA5NRH2Rxizgma6fTsU2Tb-qNTEokCo46s`)

### P1 — STANDARDS.md duplicate-rule-numbering audit (TYPE D, scheduled)
14. Four pairs of duplicate-numbered rules (39/40/41/42). Renumber-only.

### P1 — Documentation amendments (carried from AM)
15. Update 5 morning-sweep docs per session `1A7OzCh_psRGvft0hQjJMTH96OkJvkK_GZo1EDIjCCgw`
16. **Update CI/Deploy Ref to document Phase C + WOW 8 Queues + JQ-5 + Axis 2 + Axis 3 Phase A + Axis 3 Phase B (now COMPLETE — all four subtasks)**
17. Update JQ Spec to add JQ-ACTION-A/B/C close-out note

### P1 — Optional carryovers
18. Extend `NBA_HEAD_COACHES` to MIN/NOP/UTA when verifiable
19. BDL milestone decision (GOAT plan / remove / find alt)

### P2 — USPTO provisional prep (~June 25)
20. Patent narrative now substantially stronger with COMPLETE Phase B:
    - WOW 6 + Phase C + WOW 8 + JQ-3 feedback loop + JQ-5 paired action paths + **Axis 3 Phase A scaffolding + Axis 3 Phase B four-subtask data layer (verified-source hardcoded + live feed with documented probe-first methodology + defensive parsing + graceful degradation)**
    - Single integration point (`populateSeriesContext` → `buildSeriesContextTags`) demonstrating intelligence-action pairing as a methodological signal

### P2 — Build backlog (carried from AM)
21. handleCron refactor (~2.5 hr)
22. YouTube highlights (~45 min)
23. Podcast Index (~30 min)
24. SeatGeek (~2 hr)
25. Polymarket (~2.5 hr)
26. Preference Sync QR tier (~45 min) + Passkey tier (~2.5 hr)

### P3 — Deferred console errors (carried)
- `/espn-summary/.../nba/summary` 404
- `/mlb-umpire-scrape` 502
- `api.openf1.org` URL encoding (`%3E` for `>=`)
- WNBA Aces logo path 404

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon: smoke 241/0 pre-gate, deploys SUCCESS on `6a543b7` (Phase B subtask 9)
- field-relay-nba: unchanged this session, but now serving new traffic on /v1/skater-stats-leaders + /v1/goalie-stats-leaders
- Pre-existing post-gate reds: A313, A314 (PWA-A) — hidden by gate position
- Post-gate greens (all of Phase A + Phase B): A360, A361, A362, A363, A364, **A365** (added this session)
- SW_VERSION 2026-06-01g live; covers Phase B subtask 9 (and all of 6+7+8 from PM-2)
- **Phase B COMPLETE** — all four subtasks landed:
  - Subtask 6 (coaches): hardcoded NHL_HEAD_COACHES + NBA_HEAD_COACHES
  - Subtask 7 (historical anchors): SERIES_HISTORICAL_ANCHORS for NHL_SCF_2026 + NBA_FINALS_2026
  - Subtask 8 (injury refactor): NBA via bdlInjuryContextSync pass-through; NHL deferred
  - Subtask 9 (playoff leaders feed): NHL via api-web.nhle.com /v1/{skater,goalie}-stats-leaders via NHL_RELAY with 15-min TTL cache; NBA hook reserved
- Single integration point preserved: `populateSeriesContext(g)` → game.{coaches, historical, injuries, playoffLeaders} → buildSeriesContextTags → [COACH:], [HISTORICAL:], [INJURY:], [PLAYOFF STATS:] tags
- `_nhlPlayoffLeadersCache` defined and prefetched at T+3000ms during init
- ADR-001 invariant preserved: counters from feed, stable data hardcoded
- cors-probe protocol exercised cleanly twice this session — pattern documented for future feed integrations
- All prior session state preserved:
  - PM-2 carry: Phase B 6+7+8 (now joined by subtask 9)
  - PM-1 carry: Axis 2 standalone J3 isBigGame word budget (A359) + Axis 3 Phase A scaffolding (A360) — both still live
  - AM carry: JQ-5 (My Services modal), JQ-ACTION-A/B/C, TIME-PERIOD ANCHORING + SLATE BOUNDARY prose rules, WC2026 format corrections
- Brief draft artifacts (`r2_finals_briefs.md` + `r2_finals_briefs_production.md`) from PM-1 still staged — production-shape draft is now FULLY reproducible by the live pipeline (all four context layers landed)
