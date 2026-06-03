# FIELD Handoff — June 2 2026 PM-19.5 close (TYPE C — verification + infra)

**jubilant-bassoon HEAD:** e37acf2 (e3b0d64 PM-19 close + `[skip ci]` CI bump) · Smoke: 388/0 · SW_VERSION source `2026-06-02h`
**field-relay-nba HEAD:** 75df91c (PM-19.5 regex fix · superseded 880e3ae as last meaningful)

**This session was TYPE C, not TYPE B.** Verification + planning + memory governance, not a feature build. Single relay commit shipped as a verification follow-on (regex fix on `get_smoke_count`). PM-19's HANDOFF body is preserved structurally below — this session adds a delta.

## TYPE C SESSION DELIVERIES (PM-19.5)

**T1 MCP verified live end-to-end.** The pending PM-13 round-trip verification ("Live round-trip verification is the next-session P1") completed in this session. Three live calls returned real data via the claude.ai connector → relay `/mcp` → GitHub API path. The OAuth bearer path through `MCP_OAUTH` KV is healthy. No 401s, no degraded auth flows. T1 is production-quality.

**T2 relay handoff channel — detailed and correctly deferred.** Documented the full design space using the canonical Drive build plan (`1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg`, section 9). Three earlier framings corrected: (1) the four auth paths are OAuth bearer + FIELD_MCP_SECRET across three transport surfaces (Authorization header, X-FIELD-MCP-Secret, ?token=); (2) the PM-19 health-panel 401 was a PWA-client bug, not an MCP fragility signal, and the fix bypassed the relay entirely — evidence AGAINST T2 urgency, not for it; (3) the deferral has explicit Drive precedent — "wait at least a week of T1 use before T2." T1 is ~7 hours old; the gate is on track.

**Today's handoff usage traced.** PM-13 used T1 `write_handoff` once (inaugural production write). PM-14 through PM-19 all closed via bash + git push. T1 is live but underused — bash is the de facto workhorse because feature commits ride bash anyway, making a separate T1 hop for HANDOFF.md a context switch with no reward. This is not failure; it's the natural shape. This session (PM-19.5) writes HANDOFF via T1 to dog-food the channel.

**Relay regex fix shipped.** `field-relay-nba` commit `75df91c`: `get_smoke_count` regex `/^assert\(/gm` → `/^\s*assert\(/gm`. Now matches indented `assert()` calls. Pre-fix returned 289; post-fix returns 325 (verified live). Residual gap to canonical 388 is runtime-loop-invocation count which source regex cannot capture without AST parsing. The HANDOFF note "get_smoke_count MCP tool — now reports stale 378; canonical 382" can be closed.

**Memory edit #18 updated.** Added step 1.5 to SESSION START: `tool_search 'FIELD Handoff'` → `get_head_sha`; if SHA ≠ memory anchor, note drift in baseline declaration. T1 unreachable → continue with bash, do not block. Catches anchor-vs-origin drift at minute 1 of every future session instead of mid-session by accident. Hit the 500-char memory limit so phrasing is compressed; semantics preserved.

**Anchor drift caught in real time.** Memory anchor `e3b0d64` (PM-19 close) vs origin `e37acf28` (post-PM-19 auto-CI bump at 02:27:52 UTC). The drift is structural: anchor updates only on human-driven session-end, but `[skip ci]` automated CI commits advance origin without any session. New step 1.5 above surfaces this on next session start.

## STATE INVARIANTS AT END OF PM-19.5

- jubilant-bassoon HEAD: `e37acf2` (CI auto-bump) — this HANDOFF write will advance one more
- jubilant-bassoon smoke: **388/0** (unchanged — no jubilant-bassoon code changes this session)
- jubilant-bassoon SW_VERSION: `2026-06-02h` (PM-19 final, unchanged)
- field-relay-nba HEAD: `75df91c` (regex fix shipped)
- field-relay-nba get_smoke_count: now returns 325 (was 289)
- T1 channel: VERIFIED LIVE, used for this HANDOFF write
- T2 channel: NOT BUILT (correctly deferred per Drive build plan)
- T3 memory anchor: will be updated post-write to new HEAD via memory_user_edits
- STANDARDS.md: no rule changes
- Memory edit #18: SESSION START updated with T1 probe step 1.5

## NEXT SESSION P1 IMMEDIATE — PM-20 LEAD-OFF

**Source-Tagged Score Store + Confidence Layer** (~60-90 min). Spec: Drive `15c5euHkvuFnrF63my0rsNJ6QVkjHN06TdphwoYt1_gU`.

Re-confirmed scope reading the Drive spec end-to-end this session. Five-step migration, smoke +5 (388 → 393), SW first-of-day bump `l` (since this is the next session after `h` on June 2, but if it lands June 3 the suffix resets to `a` per Rule 23).

The five steps:
1. ~15 min — Introduce `_scoresBySource` + `findScore(g)` confidence-aware lookup. Rewrite `findESPNScore` as thin wrapper. Smoke A395.
2. ~10 min — Wire ESPN writer to `_scoresBySource[key].espn`. Keep `espnScores[key]` parallel write during migration. Smoke A396.
3. ~10 min — Wire V2 writer to `_scoresBySource[key].apisports`. Keep V2-into-espnScores parallel. Smoke A397.
4. ~15 min — FIELD Health panel "Score Confidence" row (verified / mismatch / single tallies, mismatch detail listing). Smoke A398.
5. ~10 min — Card-time confidence glyph (✓ verified, ⚠ mismatch, no badge for single). Smoke A399.

Backwards-compatible via `findESPNScore` wrapper — 15+ existing call sites unchanged. Zero new external deps. Zero relay changes. Zero new auth surface. The verification capability is **dormant in the codebase tonight** — emerges on deploy.

## TIER 0 DEADLINES (unchanged)

- **Stanley Cup G1: TONIGHT** (June 2 8pm ET, ABC) — PM-19's Items A-F voice v3 enforcement live; PM-20 score confidence will NOT land before puck drop
- **NBA Finals G1: TOMORROW** (June 3 8:30pm ET, ABC) — PM-20 landing window is between G1 hockey and G1 basketball
- **Stanley Cup G2:** June 4
- **World Cup 2026:** June 11 HARD
- **USPTO provisional:** ~June 25

## P1 CARRY-FORWARD FROM PM-19

- Wire NHL play-by-play relay route (~45 min) — activates Tier A #3 Penalty Drift + unlocks Tier B #5 Goalie Hot Hand
- Cloudflare connector mismatch (PM-15 carry)
- R2 Finals Narrative Context (past deadline)
- Queues / WOW 8 — hard June 11
- R2 World Cup Team Context — before June 11

## OTHER NEXT-SESSION PRIORITIES (unchanged)

- P2 — USPTO provisional toward ~June 25
- P2 — Sandbox gotcha codification (worth a memory edit on inline git config requirement)
- P2 — Probe-outbox cleanup
- P2 — `tool_search "handoff"` ranking tuning
- P3 — `index.html:3137` dead `MCP` var cleanup
- P3 — `field_smoke.js` 4 pre-existing failures (A30, A53, A67, A69)

## SCOPE DEFERRED (PM-19 → PM-20+, ready)

- Schedule view collapse (corollary to Journalism Tab, ~30 min)
- Phase 2 progressive disclosure J3→J2→J1 time-aware visibility (~2-3 hr)
- Team-order canonicalization in tickers (small Rule 7 follow-up to PM-20)
- Score history + monotonic anomaly detection (~45 min, PM-20 follow-on)

## CLOSED IN PM-19.5

- T1 round-trip verification — was PM-13 P1 carry, now COMPLETE
- T2 framing — was loose; now anchored to Drive build plan precedent
- get_smoke_count regex bug — was reporting stale; now closes most of gap (289 → 325)
- Memory edit #18 — was missing T1 probe; now includes step 1.5
- HANDOFF anchor drift detection — was reactive; now proactive at every session start

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE — verified end-to-end PM-19.5):** MCP server on field-relay-nba at `/mcp`. OAuth bearer (claude.ai connector) + FIELD_MCP_SECRET across three transport surfaces. This HANDOFF written via T1.
**Tier 2 (NOT BUILT — correctly deferred per Drive 1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg section 9 "wait at least a week of T1 use").**
**Tier 3 (LIVE):** userMemories anchor #30 — will be updated to new HEAD post-write.

---

## PM-19 BODY (preserved structurally for context)

PM-19 shipped Journalism Tab v1 — 8 single-concern commits including scaffold, mobile/tablet UX, multi-pane layouts, bottom-sheet cross-link, SW bump + smoke A385-A388, J3/J2/J1 patent-visibility badges retro (`1563ee2`), MCP RELAY 401 fix routing to public GitHub API (`85f5bbd`), and Layer 2g state tautology extension catching "begins at 0-0" / "clean slate" at G1 (`f834815`). Plus post-close: journalism compound brief fix (`f0ee1b1`), state-aware time slot ESPN-gap fallback (`508d987`), CI state bumps, and PM-20 carry-forward doc (`e3b0d64`). Full PM-19 detail in session doc `(PM-19 — Drive, set at end of PM-19)` and Recovery Doc `10udrJmsVd0FSf-hU2qEuNTN1PL4hQ6tMlTji0IfpmN0`.

**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-20 Lead-off Spec:** `15c5euHkvuFnrF63my0rsNJ6QVkjHN06TdphwoYt1_gU`
**Tier 1 MCP-on-Relay Build Plan (historical):** `1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg`
