# FIELD — Exa Journalism Narrative Layer Spec

**Date:** 2026-06-23
**Status:** APPROVED
**Architecture:** Chat-side only. Never relay. Rule 47 / ADR-002 compliant.
**Automation:** Claudeception React artifact (claude.ai artifact with Exa MCP)

---

## PROBLEM

The Context Assembler serves structured data (xG, standings, odds, Savant stats).
It has no live news layer. For WC games involving smaller nations and any game
where narrativeDepth is THIN or NONE, the journalism prompt has insufficient
context to avoid generic or hallucinated briefs.

Examples of the gap:
- Algeria vs Jordan: API returns xG=0 (pre-game), standings, no team news
- WC team with no ESPN xG coverage: brief has only schedule + standings
- Late-breaking injury to a key player hours before kickoff: not in any structured source

## CONSTRAINTS

1. **Rule 47 / ADR-002:** Editorial judgment about what news to include is
   intelligence. Stays out of the relay. Chat-side only.

2. **DO NOT INVENT (hard rule):** Web content can be wrong. Two mandatory
   safeguards: parse layer (extract only named, dated facts) and prompt
   instruction layer (LLM told not to extrapolate or fill gaps).

3. **Token budget:** Context Assembler total = 1,500 tokens. Exa block must
   be ≤120 tokens. Appended after structured sources, before voice register.

4. **Narrative Depth gate (June 21 revised spec):** Only fires when
   narrativeDepth is THIN or NONE. DEEP/MODERATE games already have
   sufficient context.

5. **wc-team-context.js already covers background:** All 48 WC teams have
   structured narrative blocks in the relay. Exa covers TODAY'S news
   (injuries, lineup confirmations) — not historical background.
   Complementary, not duplicative.

6. **v4 Voice Register:** Exa results are wire-service style. They inform
   the brief, not get pasted verbatim. LLM rewrites in FIELD voice.

7. **Structured data wins:** If Exa claim conflicts with structured source,
   structured source takes precedence. Injection order enforces this.

8. **RUWT compliance:** Team fitness/lineup news is factual reporting about
   states of affairs. Not an excitement rating or interest computation.

---

## TRIGGER CONDITIONS

Run Exa journalism search when ALL of the following are true:

- narrativeDepth === 'THIN' || 'NONE'  (from June 21 revised spec gate)
- Game is soccer (WC, EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS)
- Game is pre-game or live (post-game: structured data sufficient)

Do NOT run for:
- Games with narrativeDepth DEEP or MODERATE
- Non-soccer sports (have other structured context sources)
- Any game where xG context is already rich (>2.0 xG for either team)

---

## QUERY PATTERN

Two targeted Exa searches. Specific, dateable, named-fact queries only.

```
Query 1: "{home} {away} {league} lineup injury {month} {year}"
Query 2: "{away} squad fitness news {month} {year}"
```

Example (Algeria vs Jordan, WC, June 23 2026):
```
Query 1: "Algeria Jordan World Cup 2026 lineup injury June 2026"
Query 2: "Jordan squad fitness news June 2026"
```

Never use broad queries like "tell me about Algeria" —
returns opinion and history, not today's facts.

---

## PARSE RULES

From Exa results, extract ONLY:

INCLUDE:
- Named facts with a source publication and date
- Injury/fitness status of named players
- Confirmed lineup changes
- Confirmed suspensions or returns from suspension
- Manager quotes about team selection (if attributed and dated)

DISCARD:
- Opinions, predictions, match previews without named sources
- Odds commentary (Rule 33)
- Any claim without a named source or date
- Historical context (already in wc-team-context.js)
- Any claim about the outcome of this game

If no dateable named facts surface after parsing both results:
→ Omit the NEWS CONTEXT block entirely. Do not inject anything.

---

## OUTPUT FORMAT

Token budget: ≤120 tokens (enforced).

```
[NEWS CONTEXT — web-sourced, {date}]
These are search results. Use only specific named facts below.
Do not extrapolate, fill gaps, or repeat phrases verbatim.
Rewrite any facts used in FIELD voice.
· {team}: {fact} ({source}, {date})
· {team}: {fact} ({source}, {date})
```

Example:
```
[NEWS CONTEXT — web-sourced, June 23 2026]
These are search results. Use only specific named facts below.
Do not extrapolate, fill gaps, or repeat phrases verbatim.
Rewrite any facts used in FIELD voice.
· Algeria: Mahrez confirmed fit after morning training (RFI Sport, Jun 22)
· Jordan: Baha Faisal suspended after yellow card accumulation (Jordan FA, Jun 21)
```

Maximum 4 bullet points. If more than 4 dateable named facts surface,
take the 4 most recent and most impactful (injury/suspension over quotes).

---

## INJECTION POINT

Position in the journalism prompt:

```
1. [SCHEDULE CONTEXT]          ← priority 1 (structured)
2. [ODDS CONTEXT]              ← priority 2 (structured)
3. [STANDINGS CONTEXT]         ← priority 3 (structured)
4. [ARCHIVE CONTEXT]           ← priority 4 (structured)
5. [STAKES CONTEXT]            ← priority 5 (structured)
6. [SOCCER XG CONTEXT]         ← priority 7 (structured, tonight's build)
7. [NEWS CONTEXT]              ← NEW — Exa, chat-side, after all structured
8. FIELD_VOICE_REGISTER        ← voice framing
9. JQ_STYLE                    ← quality rules
10. Task instruction + word count
```

Structured data always precedes news context. If xG says Argentina
created 2.36 xG but an Exa result claims they were "toothless in
attack", the xG wins — the LLM reads structured data first.

---

## DO NOT INVENT SAFEGUARDS

Two mandatory layers. Both must be present:

**Layer 1 — Parse gate:**
Extract only named, dated, sourced facts. If a claim cannot be attributed
to a named publication with a date within 72 hours of the game, discard it.

**Layer 2 — Prompt instruction:**
The block header text is not decorative — it is a prompt constraint:
"These are search results. Use only specific named facts below.
Do not extrapolate, fill gaps, or repeat phrases verbatim."

This instruction is inside the prompt (not the system message) so it
applies directly to the journalism generation call.

---

## AUTOMATION

Implemented as a Claudeception React artifact in claude.ai.

The artifact:
- Takes home, away, league, date as inputs
- Calls Anthropic API (claude-sonnet-4-6) with Exa MCP
- Runs both Exa queries
- Parses results through the named-fact extraction rules
- Formats and displays the [NEWS CONTEXT] block
- Ready to copy into the journalism trigger prompt

The artifact lives in this chat conversation. It uses the user's
existing Exa connector (mcp.exa.ai/mcp — already connected).

Future relay path: Only if Exa adds api.exa.ai to the relay's
allowed outbound domains AND parse logic is fully deterministic.
Not today. Document if reconsidered.

---

## NON-GOALS

- Not a relay endpoint (Rule 47)
- Not an automatic pipeline (selective, human triggers it)
- Does not override standings, xG, or any structured source
- Does not surface opinion, betting commentary, or predictions
- Does not fire for games with narrativeDepth DEEP or MODERATE
- Does not apply to non-soccer sports (out of scope for this spec)

---

## REFERENCES

- Rule 47 (RELAY-CPU-A): STANDARDS.md
- ADR-002 (relay-is-dumb): Drive 1exp7zmdtiADes-8pA9QaLJum1m1EigbsfrXLQxyJdvM
- Context Assembler spec: docs/CC-CMD-2026-06-21-context-assembler.md
- Narrative Depth gate: FIELD — Context Dimensions Revised (June 21 2026)
  Drive 1j3HA7JbVF7PZMWKbr8nWqNwr8vr6YZMfU7gpv_JkmHo
- wc-team-context.js: field-relay-nba/src/wc-team-context.js
- Soccer xG spec: docs/CC-CMD-2026-06-23-soccer-xg-espn.md
- Exa connector: mcp.exa.ai/mcp (connected June 23 2026)
