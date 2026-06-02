# FIELD Handoff — June 1 2026 PM-9 TYPE B (ET fix + Voice Positioning v2 shipped)

**jubilant-bassoon HEAD:** e4f7ef1 (PM-9 close: Voice Positioning v2 — Moves A+B+C) · Smoke: 366/0 (full assertion run, gate at EOF) · SW_VERSION source 2026-06-01n
**field-relay-nba HEAD:** 6144d17 (unchanged since PM-6)

**This session closed:** Two live observations from Jeff at 10:28pm ET June 1:
1. Health Panel showed 2026-06-02l (UTC-stamped, wrong calendar day) → fixed CI workflows ET (commit 406242d)
2. J3 Brief read as wire copy → Voice Positioning v2 A+B+C shipped (commit e4f7ef1). Move D held for observation.

**Session Doc (PM-9, this session — Drive):** 1IEGlJZDCxm8lS5LDS3_YKr5EpRJFIvBfS_-UutVdeQ8
**Session Doc (PM-8 prior — Drive):** 1GFu8I3NPJEjJ35meUOwkLQYGkVq2l1KBB4E8ou6MdZw
**Session Doc (PM-7 prior — Drive):** 1Zi6pCB5dTOURvWyRvWU4KOFiDBzc2z6GZTsFQ1vsqoY
**Data Skrive Patent Analysis v3:** 1yCXY5AF5J1jvo_b5wCV7nzp_FwQ1SIWGJqusZ4AaVqU
**ADR-003 — stats.nba.com Source Acceptance:** 1XUPoayJUTh2Ki_DYXgw8uOAYZoGtpDt2c7510vGq64w
**NBA Stats GREEN-Path Successor:** 1qKrX_K6mk7aLN8e4h2g7C8sOO9JiWR_q4fqB2W5wmiE
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`

## TIER 0 DEADLINES

- **NBA Finals G1: June 3** — first major test of Voice Positioning v2 result quality
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD** — flip `wc26:true`
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (PM-9)

### Finding 1 — Version stamp UTC instead of ET (commit 406242d)

`.github/workflows/deploy-gate.yml` line 51 used `date -u +%Y-%m-%d`. My PM-8 push committed at ~02:01 UTC June 2 = ~10:01 PM ET June 1. CI rewrote SW_VERSION from `2026-06-01l` (source) to `2026-06-02l` (deployed). Health Panel showed the future.

**Fix:** `DEPLOY_DATE=$(TZ='America/New_York' date +%Y-%m-%d)` at both surfaces (deploy-gate.yml line 51 and daily-brief.yml line 284 for SW_VERSION health check consistency).

### Finding 2 — Voice didn't land (commit e4f7ef1)

Live J3 Brief was wire copy. Specifically: "this season" repeated mechanically, records/stats stacked without angle, "with X" + "has Y" parallel template throughout, no observation.

**Diagnosis:** v1 buried `FIELD_VOICE_EXEMPLARS` in the rules section after `FIELD_PROSE_STYLE`. AI processed them as "more rules" alongside 50+ other instructions. Safety-discipline rules crowded out voice. Default fallback: maximum-density data transcription = wire copy.

**v2 Moves shipped (Jeff approved A+B+C, held D):**

**Move A — HOIST.** `FIELD_VOICE_EXEMPLARS` moved from rules section to TOP of each long-form prompt:
- Compound prompt template: opens with `${FIELD_VOICE_EXEMPLARS}` before "You are FIELD's sports intelligence editor"
- J3 standalone: first array element before "Write a FIELD Brief..."
- J2 series preview: first array element before "Write a FIELD Series Brief..."

**Move B — ANTI-EXEMPLAR.** Added inside the constant after positive exemplars. Paraphrases the actual failing brief. Followed by "Why this fails" enumeration (records stacked, "this season" mechanical, parallel template, "a press release could have written this"). Closes with: "If the brief reads like a list of facts linked by 'with' and 'against,' the voice has failed."

**Move C — PRIORITY.** Single sharp instruction: "Voice over completeness. If you have 30 facts and a 150-word budget, pick the 5 that matter most and write them with voice. Do NOT list all 30 as a transcribed data dump. ... Compression through selection IS the editorial act — it is WHY the reader chose FIELD over a box score feed. When in doubt: write fewer things better, not more things flatly."

**Move D — NOT APPLIED.** Held for observation. Would loosen the STRUCTURE rule ("Paragraph 1 opens on the highest-stakes game with the specific situation"). Higher risk — could backfire toward hot-take register. Decision: see if A+B+C is sufficient before pulling D.

### Smoke

- A370 expanded — now includes anti-exemplar (Move B) and priority (Move C) content checks
- A372 NEW — verifies Move A hoisting (old adjacency GONE, new top-of-prompt position present, total 4 occurrences)
- A151 updated — accepts both adjacency forms

Baseline: 365/0 → **366/0**

SW_VERSION: `2026-06-01l` → `2026-06-01m` (ET fix bump) → `2026-06-01n` (v2 bump). Going forward, CI computes ET-correct dates.

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (URGENT)

1. **SW_VERSION shows ET calendar day** — verify Health Panel shows `2026-06-01n` (or whatever the latest ET-stamp produces). The CI bug that wrote `2026-06-02l` is fixed.
2. **Voice Positioning v2 result quality on next live brief.** Watch for:
   - **POSITIVE signs:** opens with insight not template ("Vegas at home in May is..." vs "53-22-7 Hurricanes face..."), elided time-period constructions ("Dorofeyev at 37" vs "Dorofeyev has 37 goals this season"), fewer games with voice, compression evident
   - **CONTINUED FAILURE signs:** "this season" still repeating, all 16 matchups still listed, "with X" + "against Y" parallel throughout — if so, **deploy Move D**
3. **If still failing after v2:** deploy **Move D** (loosen STRUCTURE rule that forces "Paragraph 1 opens on the highest-stakes game"). Higher risk but at this point the safety-discipline rules clearly outweigh the voice exemplars.
4. NBA Finals G1 J3 brief — all 4 context tags + extended attribution (PM-6/7) still live
5. Cup Final tags regression check

### P0 — TIER 0 cadence

6. NBA Finals each game (June 3, 5, 7, …)
7. Cup Final each game (June 4, 6, …)
8. **June 11 HARD** — flip `wc26:true`

### P1 — Documentation amendments (carried)

9. CI/Deploy Ref update (now includes PM-9 ET fix)
10. Add ADR-003 to STANDARDS.md ADR list
11. Build Backlog Canonical updates (Voice Positioning v1 + v2 shipped)
12. PM-5 relay tracking gap investigation

### P1 — GREEN-path successor

13. Verify API-Sports league-leaders endpoint (~15 min FREE)

### P2 — USPTO provisional prep (~June 25)

14. Patent narrative now includes the **PM-9 iteration cycle itself** — Defense #5 architecture is not just the voice work but the OBSERVATION → DIAGNOSIS → VERSIONED FIX cycle that maintains it. Voice Positioning shipped (PM-8) → observed failing (PM-9 Finding 2) → diagnosed → v2 deployed in one cycle.

### P2 — Build backlog highlights

15. WC2026 mini-build before June 11
16. `[MOBILE-INTEL-A]` Right Now mobile hero card (~50 min)

### P2 — Decisions waiting on Jeff (§D)

17. SeatGeek affiliate
18. BDL milestone A vs B (recommend B)
19. F07 / F12 Rule 45 gates

### P3 — Voice Positioning Move D (if A+B+C insufficient)

20. Loosen STRUCTURE rule that forces "Paragraph 1 opens on the highest-stakes game with the specific situation." Lower priority IF v2 lands; high priority IF v2 still produces wire copy.

### P3 — Cosmetic STANDARDS.md cleanup

21. Reorder Rule 47/48 in STANDARDS.md (line 2633 precedes line 2700).

### P3 — Deferred console errors

- `/espn-summary/.../nba/summary` 404
- `/mlb-umpire-scrape` 502
- `api.openf1.org` URL encoding
- WNBA Aces logo path 404

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: e4f7ef1, deploys SUCCESS
- field-relay-nba HEAD: 6144d17 (unchanged)
- **Smoke: 366/0** (full assertion run, gate at EOF, all green)
- SW_VERSION source `2026-06-01n` (CI computes ET-correct deploy stamp)
- **CI ET fix LIVE** — deploy-gate.yml + daily-brief.yml use America/New_York
- **Voice Positioning v2 LIVE** — exemplars hoisted to TOP of 3 long-form prompts, anti-exemplar present, priority statement present
- Move D held for observation
- All prior session state preserved (PM-6 NBA leaders feed, PM-7 attribution extension, PM-8 v1 Voice Positioning)
- The PM-7 cosmetic carry (Rule 47/48 ordering) still open
