# FIELD Handoff — June 1 2026 PM-10 TYPE B (Voice Positioning v3 — grammar + ratio)

**jubilant-bassoon HEAD:** 6e89c6a (PM-10 close: v3 Moves E1+E2 — numbers-in-prose grammar + one-number-per-sentence ratio) · Smoke: 367/0 (full assertion run, gate at EOF) · SW_VERSION source 2026-06-01o
**field-relay-nba HEAD:** 6144d17 (unchanged since PM-6)

**This session closed:** Voice Positioning v3 after Jeff's diagnostic observation that v2 only partially landed — voice survived in J2/bottom-sheet briefs (no numbers) but J3 omnibus brief still collapsed to wire copy when numbers were involved.

**Session Doc (PM-10, this session — Drive):** 1r1Msf9g8QD7uV2wSql6qK_ydFZJTcis3x8Fp10sQ1gk
**Session Doc (PM-9 prior — Drive):** 1IEGlJZDCxm8lS5LDS3_YKr5EpRJFIvBfS_-UutVdeQ8
**Session Doc (PM-8 prior — Drive):** 1GFu8I3NPJEjJ35meUOwkLQYGkVq2l1KBB4E8ou6MdZw
**Session Doc (PM-7 prior — Drive):** 1Zi6pCB5dTOURvWyRvWU4KOFiDBzc2z6GZTsFQ1vsqoY
**Data Skrive Patent Analysis v3:** 1yCXY5AF5J1jvo_b5wCV7nzp_FwQ1SIWGJqusZ4AaVqU
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`

## TIER 0 DEADLINES

- **NBA Finals G1: June 3** — first major test of Voice Positioning v3
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (PM-10)

Jeff observation: J3 brief still reading as wire copy when numbers appeared. Specifically:
- "Sebastian Aho leads Carolina with 80 points this season"
- "Matz holds a 4.67 ERA this season"
- "Nola brings a 5.72 ERA this season"
- "Wilson leads the Aces with 24.8 PPG this season"

**Diagnosis:** v2 anti-exemplar told the AI "don't say 'with X ERA.'" The AI obeyed at the surface — swapped to "holds a X ERA" / "carries a X ERA." Same grammatical structure (Subject + stat-verb + Number + qualifier), different verb. **The AI matched phrases, not grammar.**

**Key insight:** The AI lacks a SYNTACTIC ALTERNATIVE to the wire-copy pattern. v1 showed flowing prose, v2 named the trap, but neither taught the META-RULE that numbers must be subordinated to claims (never main-clause predicates).

### v3 Moves shipped (Jeff approved)

**Move E1 — NUMBERS-IN-PROSE GRAMMAR BLOCK.** Added inside `FIELD_VOICE_EXEMPLARS` between the anti-exemplar and the priority statement. Six syntactic patterns with wire-copy-vs-FIELD before/after:
1. APPOSITIVE — "Aho, an 80-point center, is the reason..."
2. POSSESSIVE COMPOUND — "Matz's 4.67 ERA tells the story"
3. PREPOSITIONAL EMBED — "Eichel at 90 is the headline"
4. PARENTHETICAL — "Nola's getting hit (5.72), but..."
5. THRESHOLD / COLLECTIVE — "ERAs north of 4.50 across the board"
6. PUNCTUATION — "Wilson does what Wilson does. 24.8 a night."

Plus an explicit FORBIDDEN section naming the wire-copy verb signature: `SUBJECT + [has/holds/carries/posts/leads with/brings/maintains/enters with/sits at/owns/averages] + NUMBER + qualifier`. The verb is the tell.

**Move E2 — ONE-NUMBER-PER-SENTENCE RATIO.** Each sentence gets AT MOST ONE number. Breathing heuristic: "A brief with 4 numbers in 12 sentences breathes. A brief with 15 numbers in 8 sentences is wire copy regardless of register." When multiple stats want listing, use Pattern 5 (Threshold).

### Smoke

A373 NEW — verifies grammar block + 6 patterns + forbidden signature + verb list + ratio rule.

Baseline: **366/0 → 367/0**

SW_VERSION: `2026-06-01n` → `2026-06-01o`

### v3 footprint

- ~450 words added to `FIELD_VOICE_EXEMPLARS` (~700 → ~1150). Voice block grows but stays at the top of prompts as framing.
- 3 wiring sites unchanged (compound, J3, J2). No structural code changes.
- Single commit (6e89c6a). Rule 7 honored.

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (June 3 NBA Finals G1)

1. **SW_VERSION 2026-06-01o (or later ET-stamp) shown in Health Panel**
2. **v3 grammar landing.** Watch for:
   - **POSITIVE:** numbers in appositives / possessives / prepositional embeds, multiple stats compressed via Pattern 5, sentences without numbers carrying voice, "this season" qualifiers reduced, fewer total numbers per brief
   - **PARTIAL:** some sentences subordinate (good), others still main-clause predicate (failed)
   - **CONTINUED FAILURE:** AI does another surface swap (avoids the 10 forbidden verbs but finds new ones like "checks in at," "comes in with"). If this happens → escalate to **Move F (data pre-selection)** rather than another prompt-layer move
3. NBA Finals G1 J3 brief — all 4 context tags + extended attribution still live
4. Cup Final tags regression check

### P0 — TIER 0

5. NBA Finals each game (June 3, 5, 7, …)
6. Cup Final each game (June 4, 6, …)
7. **June 11 HARD** — `wc26:true` flip

### P1 — Documentation amendments (carried from PM-6/7/8)

8. CI/Deploy Ref update (also PM-9 ET fix + PM-10 v3)
9. Add ADR-003 to STANDARDS.md ADR list
10. Build Backlog Canonical updates (Voice Positioning v1, v2, v3 shipped)
11. PM-5 relay tracking gap investigation

### P1 — GREEN-path successor

12. Verify API-Sports league-leaders endpoint (~15 min FREE)

### P2 — USPTO provisional prep (~June 25)

13. Patent narrative now includes the FULL Voice Positioning iteration cycle (PM-8 v1 → PM-9 v2 → PM-10 v3). Defense #5 architecture is not just the artifact (the prompt) but the maintenance practice (observe → diagnose → versioned fix). The cycle itself is what competitors can't replicate.

### P2 — If v3 doesn't fully land

14. **Move F — Data pre-selection.** Pre-select 3-5 headline games; expose only those games' stats to the AI in the compound prompt. Rest of the slate gets stub data ("X @ Y, time, network"). Removes the AI's pressure to list 16 ERAs because the data isn't there. ~2-3 hours.
15. **Move G — Pre-interpreted stat framings.** Data layer ships pre-voiced framings (`Matz is in his "give-up-runs-late" stretch — 4.67 since April`) instead of raw stats. AI assembles rather than generates voice. ~half-day. Highest leverage, highest cost, most patent-relevant.

### P2 — Product layer alternatives (if prompt iteration plateaus)

16. **Change word budget:** 300-word brief covering 8 games well, rather than 200 words covering 16. Removes the irreducible compression problem.
17. **Change surface:** J3 becomes "tonight's three stories" rather than "tonight's slate." Different product, different prompt.

### P2 — Build backlog highlights (carried)

18. WC2026 mini-build before June 11
19. `[MOBILE-INTEL-A]` Right Now mobile hero card

### P2 — Decisions waiting on Jeff (§D)

20. SeatGeek affiliate / BDL milestone A vs B (recommend B) / F07 / F12 Rule 45 gates

### P3 — Voice Positioning Move D (held since PM-9)

21. Loosen STRUCTURE rule in prompts ("Paragraph 1 opens on the highest-stakes game..."). Still held — only deploy if v3 + F together don't reach quality bar.

### P3 — Cosmetic STANDARDS.md cleanup

22. Rule 47/48 reorder

### P3 — Deferred console errors (carried)

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: 6e89c6a, deploys SUCCESS
- field-relay-nba HEAD: 6144d17 (unchanged)
- **Smoke: 367/0** (full assertion run, gate at EOF, all green)
- SW_VERSION source `2026-06-01o` (CI computes ET-correct stamp)
- **CI ET fix LIVE** (PM-9)
- **Voice Positioning v3 LIVE** — exemplars hoisted (v2 Move A), anti-exemplar (v2 Move B), priority statement (v2 Move C), grammar bank (v3 Move E1), ratio rule (v3 Move E2)
- Move D held; Moves F + G mapped but not built
- All prior session state preserved
- Cosmetic carry: Rule 47/48 ordering (P3)

## ITERATION RECEIPT (PM-8 → PM-9 → PM-10)

For future reference — this is what the Voice Positioning iteration looks like:

- **PM-8 (June 1 day):** Shipped v1 (exemplars in rules section, mandatory time-period loosened)
- **PM-9 (June 1 PM):** Live observation — v1 didn't land. Diagnosed as buried placement. Shipped v2 (hoist + anti-exemplar + priority).
- **PM-10 (June 1 PM):** Live observation — v2 partially landed (no-number surfaces work, with-number surfaces fail). Diagnosed as syntactic gap. Shipped v3 (grammar bank + ratio).

Each step had a SPECIFIC failure mode observed, a SPECIFIC diagnosis, and a SPECIFIC fix. The discipline that maintains this — observe → diagnose → versioned fix → measure — is itself the architecture, not just any single prompt.
