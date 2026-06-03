# FIELD Handoff — June 3 2026 PM-20 close (Source-Tagged Score Store + Confidence Layer LIVE)

**jubilant-bassoon HEAD:** 83a34fc · Smoke: 393/0 · SW_VERSION source `2026-06-02p`
**field-relay-nba HEAD:** 75df91c (unchanged this session — PM-19.5 regex fix held)

**This session shipped:** PM-20 lead-off per Drive spec `15c5euHkvuFnrF63my0rsNJ6QVkjHN06TdphwoYt1_gU`. Five single-concern feature commits + two same-session fixes (Step 2 SW-lock regression and Step 5 forward-compat for A394).

Seven commits total, in chronological order:

- **Step 1** `8dfdd54` — Source-tagged score store + `findScore` confidence helper + `findESPNScore` wrapper. `_scoresBySource[key] = { espn:{...}, apisports:{...} }`. Structural — behaviorally no-op until writers wire.
- **Step 2 (regression)** `fb9d346` — ESPN-native writer wired BUT A395 smoke locked SW `2026-06-02l` which Step 2's `m` bump invalidated. Pushed smoke-red. Superseded ~90 sec later.
- **Step 2 fix** `99b0c26` — Removed SW-string locks from A395 + A396. Lesson: feature assertions should not embed exact SW versions; per-step bumps invalidate fixed strings.
- **Step 3** `6543bb6` — V2 (api-sports) writers wire to `_scoresBySource[key].apisports`. Both paths instrumented: main NHL/MLB merge path (with `_scoresNull` guard) and ESPN fallback cascade path.
- **Step 4** `437a9e0` — FIELD Health panel "🎯 Score Confidence" row. Tallies verified / mismatch / single. Mismatch rows list both source scores side-by-side (capped at 3 with "+N more"). When no live scores, shows "· no live scores" annotation.
- **Step 5** `83a34fc` — `buildCardTimeDisplay` extended to render confidence glyph from `eData.confidence`. Verified → ` ✓`, mismatch → ` ⚠`, single/null → ``. Applies in both Final ("4–2 F ✓") and Live ("3–2 P2 ⚠") states. Also updated A394 (PM-19 assertion) to accept post-PM-20 string form `${a}–${h} F${glyph}` — same forward-compat lesson as Step 2.

## TIER 0 DEADLINES (advanced)

- **Stanley Cup G1: tonight** ✅ over (started 8 PM ET, PM-20 work landed mid-game, no effect on hockey tonight)
- **NBA Finals G1: TOMORROW (June 3 8:30pm ET, ABC)** — first Finals exposure of PM-20 confidence layer
- **Stanley Cup G2:** June 4
- **World Cup 2026:** June 11 HARD
- **USPTO provisional:** ~June 25

## WHAT PM-20 BUILT

Two independent witnesses (ESPN scoreboard + API-Sports via V2 adapter) were polling the same MLB/NHL games tonight, but both wrote into the same anonymous `espnScores[key]` store with last-writer-wins. Cross-source verification was structurally impossible despite both sources being active.

PM-20 keeps them separate.

**`_scoresBySource[key] = { espn: { ...ts }, apisports: { ...ts } }`** — independent slots per source. `findScore(g)` reads both, returns confidence-aware view:
- both present + agree → `confidence: 'verified'`
- both present + disagree → `confidence: 'mismatch'` + `mismatch: { espn:{h,a}, apisports:{h,a} }`
- only one → `confidence: 'single'`
- neither → null

`findESPNScore` rewritten as wrapper: tries `findScore` first (shape-compat — confidence fields are additive), falls back to legacy `espnScores` iteration during migration. All 20 existing callers continue working unchanged.

Both writers wire in parallel — legacy `espnScores[key]` keeps getting written so any code path that doesn't go through `findScore` (or `findESPNScore`) still works.

UI surfaces:
1. **FIELD Health panel** "🎯 Score Confidence" row with verified/mismatch/single tallies + mismatch detail list (espn:A-H · apisports:A-H format, capped 3 + "+N more").
2. **Card-right time slot** confidence glyph — ` ✓` verified, ` ⚠` mismatch, no badge for single.

The verification capability was dormant in the codebase before this commit. Live on deploy.

## INFRASTRUCTURE

SW_VERSION progression this session: `k → l → m → n → o → p` (five same-day suffix bumps per Rule 23). All sessions on June 2-3 2026 boundary kept `2026-06-02` prefix.

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `83a34fc` (will advance one more after this HANDOFF write)
- jubilant-bassoon smoke: **393/0**
- jubilant-bassoon SW_VERSION: `2026-06-02p`
- field-relay-nba HEAD: `75df91c` (PM-19.5 regex fix, unchanged this session)
- STANDARDS.md: no rule changes
- T3 memory anchor: will update to new HEAD post-write via memory_user_edits
- Memory edits #18 + #30: governance-stable, both updated PM-19.5

## DEPLOY-GATE OBSERVATIONS

All 5 step commits triggered deploy-gate (all touched index.html or sw.js). Final commit `83a34fc` deploy-gate green at 03:03:03 UTC. The bad Step 2 commit `fb9d346` would have had a red smoke gate if it had been the active deploy — but it was superseded ~90s later by `99b0c26` which CI picked up next.

The Step 2 SW-lock regression is the single discipline lesson from this session: **verify `node smoke.js` locally BEFORE every push**. Steps 3, 4, 5 all followed that protocol. The single regression caught nothing in production because CI gating worked correctly, but the discipline matters.

## NEXT SESSION P1 IMMEDIATE — PM-21 OPTIONS

The PM-20 spec's "Next-next steps" list provides four candidate PM-21 leads:

1. **Team-order canonicalization in tickers** (~15-30 min, Rule 7 single-concern follow-up) — always Away–Home, never leader-first reorder. Observed flip in PM-19 screenshots ("9:32 PM Astros 4-2 Pirates → 9:56 PM Pirates 6-4 Astros same game, team order switched as lead changed").
2. **Score history + monotonic anomaly detection** (~45 min) — catches stale-data and attribution-flip beyond what cross-source agreement catches. Natural extension of PM-20.
3. **Source priority configuration** — per-sport preferred-source ranking (NHL playoffs: NHL API > ESPN > API-Sports; MLB: MLB Stats API > API-Sports > ESPN). Requires NHL play-by-play relay route first.
4. **Source attribution in bottom-sheet game-intel** — power-user diagnostics showing raw values from each source.

Plus standing carry-forward:

- Wire NHL play-by-play relay route (~45 min) — activates Tier A #3 Penalty Drift + unlocks Tier B #5 Goalie Hot Hand
- Queues / WOW 8 — hard June 11 deadline (8 days)
- R2 World Cup Team Context — before June 11
- USPTO provisional toward ~June 25

Recommend PM-21 = team-order canonicalization (small, Rule 7 clean follow-up that surfaces in PM-20's confidence telemetry — mismatched team order can present as score mismatch).

## CARRY-FORWARD STANDING ITEMS

- Cloudflare connector mismatch (PM-15 carry)
- R2 Finals Narrative Context (past deadline)
- P2 — Sandbox gotcha codification
- P2 — Probe-outbox cleanup
- P2 — `tool_search "handoff"` ranking tuning
- P3 — `index.html:3137` dead `MCP` var cleanup
- P3 — `field_smoke.js` 4 pre-existing failures (A30, A53, A67, A69)
- P3 — Memory edit path-string cleanup

## CLOSED IN PM-20

- Source-Tagged Score Store + Confidence Layer — PM-20 lead-off, the full 5-step spec landed
- Tigers @ Rays diagnostic gap — now answerable via Health panel mismatch row
- `findESPNScore` last-writer-wins — preserved as fallback; tagged store is primary
- `buildCardTimeDisplay` confidence glyph — card-surface signal for source agreement

## DAILY WORK SUMMARY (June 2-3 2026)

Five build sessions across June 2 + bridge into June 3:
- PM-16: NHL Tier A 1-3 (Pull Window, PDO Regression, Penalty Drift)
- PM-17: Layer 2f wire-copy retry (3 brief paths)
- PM-18: Items A-F voice v3 enforcement parity (6 features, 4 commits)
- PM-19: Journalism Tab v1 (5 features, 8 commits — interrupt-recovered)
- PM-19.5: TYPE C verification + infra (T1 round-trip verified, T2 detailed, relay regex fix, memory edits)
- PM-20: Source-Tagged Score Store + Confidence Layer (5 features, 7 commits)

Total smoke growth: 367/0 (start of day June 2) → 393/0 (PM-20 close). 26 new assertions covering 23+ new features across two days.

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE — used for PM-20 close):** MCP server on field-relay-nba at `/mcp`. PM-20 used `write_handoff` for this HANDOFF write (second consecutive session-end via T1 after PM-19.5).
**Tier 2 (NOT BUILT — correctly deferred per Drive 1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg section 9).**
**Tier 3 (LIVE):** userMemories anchor #30 — will be updated to new HEAD post-write via memory_user_edits.

## CANONICAL DOC REFS

**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-20 Lead-off Spec (closed this session):** `15c5euHkvuFnrF63my0rsNJ6QVkjHN06TdphwoYt1_gU`
**Tier 1 MCP-on-Relay Build Plan (historical):** `1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg`
**PM-19.5 Session Doc:** `12do4Hfrkb1QEMHaEl-MBUUjrVXeZ6ll8H4wY7onhtqw`
**PM-20 Session Doc (this session):** set at SESSION END after Drive write
