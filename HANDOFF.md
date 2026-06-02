# FIELD Handoff — June 1 2026 PM-8 TYPE B (Voice Positioning Moves 1+2 shipped)

**jubilant-bassoon HEAD:** cae307e (PM-8 close: Voice Positioning Moves 1+2 — TIME-PERIOD loosened + FIELD_VOICE_EXEMPLARS wired) · Smoke: 365/0 (full assertion run, gate at EOF) · SW_VERSION 2026-06-01l
**field-relay-nba HEAD:** 6144d17 (unchanged since PM-6)

**This session closed:** Item 16 from PM-7 priority list — Voice Positioning Moves 1+2. Unblocked by Jeff approvals in chat (Move 1 = accept loosening; Move 2 voice register = wise, intelligent, cheeky, wry, a tad cynical but not that much).

**Session Doc (PM-8, this session — Drive):** 1GFu8I3NPJEjJ35meUOwkLQYGkVq2l1KBB4E8ou6MdZw
**Session Doc (PM-7 prior — Drive):** 1Zi6pCB5dTOURvWyRvWU4KOFiDBzc2z6GZTsFQ1vsqoY
**Session Doc (PM-6 prior — Drive):** 1fF-5hrXThTw7cawgIxEz2rD5PussHAP7iYJV4Y8Vp-Q
**Data Skrive Patent Analysis v3 (source of Voice Positioning plan):** 1yCXY5AF5J1jvo_b5wCV7nzp_FwQ1SIWGJqusZ4AaVqU
**ADR-003 — stats.nba.com Source Acceptance:** 1XUPoayJUTh2Ki_DYXgw8uOAYZoGtpDt2c7510vGq64w
**NBA Stats GREEN-Path Successor Investigation:** 1qKrX_K6mk7aLN8e4h2g7C8sOO9JiWR_q4fqB2W5wmiE
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`

## TIER 0 DEADLINES

- **NBA Finals G1: June 3** — SAS @ NYK · Voice Positioning result quality tested live; all 4 context tags + extended attribution still live from PM-6/PM-7
- **Stanley Cup G2: June 4** — VGK @ CAR
- **World Cup 2026: June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)
- **USPTO provisional: ~June 25** — Voice Positioning is the primary Defense #5 deliverable

## WHAT HAPPENED THIS SESSION (PM-8)

User chat flow: "Present priority list" → "Detail item 16" → "Move 2: voice should be wise, intelligent, cheeky, wry and a tad cynical but not that much. Move 1: accept loosening suggestions."

That third message was the unblocking approval. PM-8 TYPE B started from there.

### Move 1 — TIME-PERIOD ANCHORING loosened (in FIELD_PROSE_STYLE)

**Was:** `every numeric statistic must be qualified with its time period in the SAME sentence ... Bare numbers ... ARE FORBIDDEN.`

**Now:** `anchor a numeric statistic to its time period whenever ambiguity would exist ... ELIDED constructions are acceptable when the period is unambiguous from context ... TEST: would a reader plausibly misread the period without the qualifier? If yes, anchor. If no, elide for rhythm.`

Patent-defense intent preserved (anchor where ambiguity exists). Noun-anchor pattern retained.

### Move 2 — FIELD_VOICE_EXEMPLARS constant + wired at 3 long-form surfaces

New constant declared after FIELD_PROSE_STYLE. Contains voice register palette (Jeff's 5 descriptors), anti-copy safeguard, and 3 exemplars:

- **Exemplar A** (NBA Finals Game 1, ~145 words) — demonstrates elided time-period + line-movement reading
- **Exemplar B** (WNBA Commissioner's Cup, ~110 words) — structural-edge-vs-mirage framing
- **Exemplar C** (NHL playoff, ~100 words) — home-ice dynamics + injury-info doublespeak observation

**Wired at:**
1. `buildCompoundPrompt` template (`${FIELD_VOICE_EXEMPLARS}` interpolation)
2. `fetchFIELDBriefFromClaude` (J3 standalone, comma-prefixed)
3. `fetchSeriesPreviewFromClaude` (J2 standalone, array entry)

**NOT wired at** short sub-prompts (35-70 word EPL/MLB/generic briefs) — exemplar length would dominate the output budget. Those still inherit FIELD_PROSE_STYLE with Move 1's loosening.

### Why the pairing matters

Move 1 alone gives the AI rope without an anchor. Move 2 alone gives a target but mandatory TIME-PERIOD rule contradicts the exemplars' rhythm. Together: Move 1 makes Move 2 reachable. The exemplars demonstrate the loosened rule in practice ("23.2 and 9" elides because Finals context is obvious).

### Commit

- `cae307e` — PM-8: Voice Positioning Moves 1+2 — TIME-PERIOD loosened + FIELD_VOICE_EXEMPLARS wired (single concern, Rule 7)

### Smoke

- A370 NEW — Voice Positioning Move 2 wiring (constant + register + 3 exemplars + delimiters + anti-copy + ≥3 wirings)
- A371 NEW — Voice Positioning Move 1 loosening (ELIDED + TEST + noun-anchor retained + old mandatory wording GONE)
- A151 updated — accepts FIELD_PROSE_STYLE,FIELD_VOICE_EXEMPLARS,VOICE chain
- A358 updated — asserts the LOOSENED shape (not the old mandatory shape)

Baseline: **363/0 → 365/0**

### Restraint check (logged)

- No banned phrases in exemplars
- "Quoted phrases" in Exemplar C are characterizations of typical team-issued updates, not attributed quotes
- No prediction language ("Expect" is scene-setting, not outcome-calling)
- Second-person imperative "Watch the warmups" reworded to "The warmups are the tell."

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (URGENT, Finals G1 June 3 + Cup G2 June 4)

1. SW `2026-06-01l` active in browser
2. **NEW — Voice Positioning result quality** — does the J3 Brief read with voice? Watch for:
   - Elided time-period constructions ("23.2 and 9" not "23.2 PPG this postseason and 9 RPG this postseason")
   - Cheeky/wry register (a turn of phrase that feels like a columnist)
   - All journalism integrity rules still observed (no fake stats, no predictions, no second person, no banned phrases)
3. Failure modes to specifically watch for:
   - AI copies exemplar PLAYER NAMES into non-NBA-Finals briefs (anti-copy safeguard should prevent)
   - AI inflates output to exemplar length when word budget is lower
   - AI copies exemplar STRUCTURE too closely (every brief opens with historical reference)
   - Voice drifts into BNI/hype territory (would violate J-BUDGET-A)
4. NBA Finals G1 J3 brief — all 4 tags + extended attribution still live from PM-7
5. Cup Final tags regression check
6. Smoke gate at EOF still working in CI

### P0 — TIER 0 game-day cadence

7. NBA Finals each game (June 3, 5, 7, …)
8. Cup Final each game (June 4, 6, …)
9. **June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES

### P1 — Documentation amendments (carried from PM-6/7)

10. Update CI/Deploy Ref for `/nba-stats/*` route
11. Add ADR-003 to STANDARDS.md ADR list
12. Update Build Backlog Canonical — move §D NBA → §A; add §A entry for Voice Positioning shipped
13. Investigate PM-5 relay tracking gap (fff6e3c + 0e9a9d9)

### P1 — GREEN-path successor (when ADR-003 re-evaluation trigger fires)

14. Verify API-Sports league-leaders endpoint or filter+sort approach (~15 min FREE). See Drive `1qKrX_K6mk7aLN8e4h2g7C8sOO9JiWR_q4fqB2W5wmiE`.

### P2 — USPTO provisional prep (~June 25)

15. Patent narrative now includes PM-8: Voice Positioning shipped (the primary Defense #5 deliverable — "intelligent editorial layer that competitors can't replicate"). The pairing pattern (rule-loosening + exemplar demonstration) is itself patent-relevant architecture.

### P2 — Build backlog highlights (carried)

16. WC2026 mini-build before June 11 (F09 REST Countries + F08 Nager.Date Holidays)
17. `[MOBILE-INTEL-A]` Right Now mobile hero card (~50 min, prereq PWA-A)

### P2 — Decisions waiting on Jeff (§D Build Backlog)

18. SeatGeek affiliate link A vs B
19. BDL milestone A (pay GOAT $39.99/mo) vs B (remove, PM-4 found inert) · recommend B
20. F07 TheSportsDB attribution terms read (Rule 45)
21. F12 Google Trends alpha stability (Rule 45 + Rule 48 Class B)

### P2 — Voice Positioning v2 if exemplars don't land

22. If live verification shows the AI not matching the register, mid-session iteration on exemplars. Have observation log ready: which voice descriptor was missed (wise/intelligent/cheeky/wry/cynical), which exemplar failed, what the AI defaulted to instead.

### P3 — Cosmetic STANDARDS.md cleanup

23. Reorder Rule 47/48 in STANDARDS.md (Rule 48 at line 2633 precedes Rule 47 at line 2700). No content change.

### P3 — Deferred console errors

- `/espn-summary/.../nba/summary` 404
- `/mlb-umpire-scrape` 502
- `api.openf1.org` URL encoding
- WNBA Aces logo path 404

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: cae307e, deploys SUCCESS
- field-relay-nba HEAD: 6144d17 (unchanged)
- **Smoke: 365/0** (full assertion run, gate at EOF, all green)
- SW_VERSION `2026-06-01l` live
- **Voice Positioning Moves 1+2 LIVE** — first J3 Brief that uses them is Finals G1 June 3
- TIME-PERIOD ANCHORING loosened to permit elided constructions
- FIELD_VOICE_EXEMPLARS constant + wired at 3 long-form surfaces
- All prior session state preserved (PM-7 extended attribution, PM-6 NBA leaders feed, etc.)
- Restraint check passed (no banned phrases, no fake quotes, no predictions, no second person)
- Cosmetic carry: Rule 48 / Rule 47 ordering (P3)
- Voice Positioning result quality verification carried into P0 next session
