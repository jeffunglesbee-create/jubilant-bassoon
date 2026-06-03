# FIELD Handoff — June 3 2026 TYPE A close (PM-22 L1 band-aid · Path A of Path C)

**jubilant-bassoon HEAD:** `dcb0096` (advanced from `aaaaed6`) · Smoke: **394/0** (was 393/0 — added A400) · SW_VERSION `2026-06-02p`
**field-relay-nba HEAD:** `75df91c` (unchanged)
**Deploy:** fast smoke gate ✅ green on `dcb0096` at 10:59:49Z · live verify in_progress at close

**This session shipped:** PM-22 L1 band-aid — `!isTied` guard on verdict emission in `computeGameNarrative`. Plus a live-scores audit that uncovered a structural PM-20 weakness, plus a Drive doc sketching the PM-23 canonical key design.

---

## SESSION TIMELINE

Started as TYPE B (Daily Update + MLB broadcast verification). Switched cleanly to TYPE A (band-aid commit) per Path C decision. Closing TYPE A here.

### TYPE B/D phase outputs

1. **MLB broadcast verification (June 3 slate)** — 15 games, all MLB_LOCAL. The CLE @ NYY 7:05p Prime Video game is **NOT a national exclusive** (initial chip-rule reading was wrong). It's an in-market regional substitution for YES Network — out-of-market fans get it via MLB.TV normally, Cleveland's CLEG RSN chip behaves as normal. No new MLB_PRIME chip class needed; a label override (Prime Video → home in-market network) for the 21 Yankees Prime dates would suffice as a polish item. Defer to PM-24+.

2. **L1 scope (Confidence-Gated Narrative)** — fully detailed scope produced inline in chat: bug location at `index.html:15218`, design with verified/single permit + mismatch/undefined block, smoke A400-A402 plan, unit tests, STANDARDS Rule 48 draft, 2hr time budget. Path C decision changed the scope.

3. **Live scores audit** — empirical finding: PM-20 `'verified'` confidence is structurally unreachable for V2-enabled sports. Two writers populate `_scoresBySource` at different keys (ESPN uses full names like "New York Knicks"; api-sports uses partials like "Knicks" sourced from relay `src/index.js:856` etc.). `findScore` returns the first fuzzy-matched entry, so it never sees both sources in one entry → confidence always `'single'`. Bug #3 (Hurricanes def. Golden Knights 0-0 final from TYPE D June 3) was therefore primarily a state-mapping issue (api-sports state=final with null scores → coerced to 0-0 → leaderIsHome=true on 0>=0 → home team falsely declared winner), not a confidence problem. The L1 gate as originally scoped would have degenerated to `!isTied && margin > 0` because 'single' is the universal V2 state.

### TYPE A phase output

**Commit dcb0096:** PM-22 L1 band-aid

```diff
- if(isFinal&&!sc.isSoccer){
+ if(isFinal&&!sc.isSoccer&&!isTied){
    statusLine=`${leaderNick} def. ${trailerNick}`;
  }
```

Plus comment block referencing TYPE D Bug #3 and the PM-23 follow-up. Smoke assertion A400 added with both regex pattern check and comment-anchor check (so future refactors can't silently strip the guard).

**Net behavior change:** in the 0-0 placeholder scenario, "Hurricanes def. Golden Knights" becomes empty status — the card still shows "0–0" and "Final" period label, but no fabricated winner. When scores are real and non-tied, full verdict resumes.

Single-concern Rule 7 ✓. Deploy gate ✅ on dcb0096.

---

## PATH C STATUS

| Step | Status |
|---|---|
| 1. Ship Path A band-aid (single-concern, pre-Finals) | ✅ DONE — dcb0096, smoke 394/0 |
| 2. Sketch the canonical key design as Drive doc | ✅ DONE — Drive ID `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao` |
| 3. Plan PM-23 for dedicated session (target: tomorrow ahead of Stanley Cup G2) | ⏭ NEXT SESSION |

---

## PM-23 — CANONICAL KEY DESIGN (PATH B)

**Drive sketch:** `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao` (FIELD PM-23 — PM-20 Canonical Key Design)

**Recommended path:** Option A — relay-side canonicalization. New file `field-relay-nba/src/canonical-names.js` with per-sport tables (NBA/NHL/MLB/WNBA/MLS), `canonicalize()` applied at 5 writer sites in `src/index.js`. Client receives ESPN-format names from both writers, keys converge, PM-20 `'verified'` becomes reachable.

**Time budget:** ~3.5 hrs (curation 110 min + code 50 min + verification 30 min + smoke/STANDARDS 30 min)

**Verification window:** Stanley Cup G2 (June 4 8pm ET, VGK @ CAR at CAR, ABC). Both writers polling live, both sources should report identical scores → Health panel `verified ≥ 1` confirms the fix end-to-end.

**Sequencing toward USPTO (~June 25):**
- June 3 (today) — PM-22 band-aid live ✅
- June 4 target — PM-23 canonical keys
- June 5–10 — PM-24 restore full confidence-aware L1 gate
- June 11+ — L2 (claim-level provenance AST) — patent-priority visual
- ~June 25 — USPTO provisional filed with L1+L2 demonstrated

---

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `dcb0096`
- jubilant-bassoon smoke: **394/0**
- jubilant-bassoon SW_VERSION: `2026-06-02p` (unchanged — band-aid did not touch SW)
- field-relay-nba HEAD: `75df91c` (unchanged)
- STANDARDS.md: no rule changes (Rule 48 deferred to PM-24 when full L1 ships)
- T3 memory anchor: will update to `dcb0096` post-write

---

## TIER 0 DEADLINES (unchanged)

- **NBA Finals G1: TONIGHT** (June 3 8:30pm ET, ABC, NYK @ SAS) — first Finals exposure of PM-22 band-aid
- **Stanley Cup G2:** June 4 (VGK @ CAR, ABC) — PM-23 verification window
- **World Cup 2026:** June 11 HARD
- **USPTO provisional:** ~June 25 — L1+L2 framing per Drive PM-23 sketch §5

---

## NEXT SESSION P1 IMMEDIATE

**Recommended: PM-23 canonical key implementation** (per Drive sketch). 3.5 hr session, single-concern Rule 7. Verification window = Stanley Cup G2 live.

**Also fire-and-forget:** A398 augmentation — current assertion only checks the Score Confidence row renders. Add to it: assert that the tally-computation code distinguishes verified from single (it does, but the assertion doesn't lock that in).

**Defer to PM-24+:**
- Full L1 confidence gate restoration (needs PM-23 first)
- MLB_PRIME label refinement for 21 Yankees Prime dates
- Team-order canonicalization (~30 min, can ride any commit)
- Confidence Ledger v0 (Drive doc reference from yesterday's TYPE D HANDOFF)

---

## CARRY-FORWARD STANDING ITEMS

- Cloudflare connector mismatch (PM-15 carry)
- R2 Finals Narrative Context (past deadline)
- P2 — Sandbox gotcha codification
- P2 — Probe-outbox cleanup
- P2 — `tool_search "handoff"` ranking tuning
- P3 — `index.html:3137` dead `MCP` var cleanup
- P3 — `field_smoke.js` 4 pre-existing failures (A30, A53, A67, A69)
- P3 — Memory edit path-string cleanup
- P3 (new) — Smoke count tool discrepancy: tool reported 330/331, smoke output reports 393/394. Tool counts a different pattern (likely raw `assert(` calls vs. actual evaluations). Not blocking.

---

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE — used for this TYPE A close):** MCP server on field-relay-nba at `/mcp`. Fourth consecutive session-end via T1.
**Tier 2 (NOT BUILT — correctly deferred).**
**Tier 3 (LIVE):** userMemories anchor — updated post-write.

---

## CANONICAL DOC REFS

**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-20 Lead-off Spec (closed PM-20):** `15c5euHkvuFnrF63my0rsNJ6QVkjHN06TdphwoYt1_gU`
**Tier 1 MCP-on-Relay Build Plan (historical):** `1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg`
**TYPE D June 2 (Bug #3 + four-levels framework):** the predecessor TYPE D HANDOFF content is preserved in repo history at commit `aaaaed6`
**PM-23 Canonical Key Design (THIS SESSION):** `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao` ← NEW
**June 3 Session Documentation:** to be created at SESSION END close, will reference this HANDOFF + PM-23 sketch
