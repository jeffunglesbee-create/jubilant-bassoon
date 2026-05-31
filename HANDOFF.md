# FIELD Handoff — May 31 2026 (TYPE C — WOW 1 + WOW 2 + S0 + Layer 2e Cross-Sport)
**jubilant-bassoon HEAD:** pending push · Smoke: 238/0 (gate) + 13 new post-gate (A328–A340)
**field-relay-nba HEAD:** 237e132 · Deploy: SUCCESS

## TIER 0 DEADLINES
- World Cup 2026: June 11 HARD — flip wc26:true in FIELD_V2_SOURCES
- Stanley Cup Final G1: June 2 — VGK @ CAR (wired)
- NBA Finals G1: June 3 — SAS vs NYK (wired)
- USPTO provisional: ~June 25

## WHAT WAS BUILT THIS SESSION

### WOW 1 + WOW 2 — DurableObject score push + CRUNCH fan-out
field-relay-nba 237e132 (DEPLOYED): GameDO class, /ws/game/, /signal/crunch/.
jubilant-bassoon: GameSocket client, page-side + SW-side CRUNCH emitters.

### S0 — FIELD Event Bus
fieldEvents EventTarget + emitter wiring + Night Owl/lead-burst subscribers.
GameSocket.onFacts defaults to bus dispatch (source: 'ws').

### Layer 2e — Cross-Sport Hallucination Detector (NEW)

**Root cause:** May 31 brief said "San Antonio advances to face the winner of
the Stanley Cup Final." NBA winner does not face NHL winner. JQ scored 170/170
because grammar/specificity were clean — only the FACTS were wrong.

**Three-layer fix:**

**Layer A — Prompt rule (FIELD_PROSE_STYLE)**
Added LEAGUE BOUNDARIES rule explicitly forbidding cross-league advancement
claims. Catches the common case via prompting alone.

**Layer B — Post-generation detector + retry**
- `hasCrossSportHallucination(text)` — trophy-first detection
- `_LEAGUE_TROPHIES` maps unambiguous championship phrases per league
- `_LEAGUE_TEAMS` provides secondary team-level signal (only when trophy present)
- `_CROSS_LINK_VERBS` regex captures "face," "advance to," "play," "meet,"
  "winner of," "takes on," "squares off"
- `checkCrossSport(prompt, text, proxyUrl)` — same retry pattern as 2b/2c/2d
- Wired into 5 chains: Compound Brief, J2 Series, J3 Brief, MLB Brief, Stakes Brief
- _jqDelay used (now 6 quality retry paths, A311 updated)
- Unit tests: 9/10 cases pass (player-only refs is known limit, see code comment)

**Layer C — Prompt assembly isolation**
- buildCompoundPrompt now emits `[LEAGUE: X]` tag per game line
- League map normalizes raw `_sport`/`_section`/`league` strings to canonical
  codes: NBA, NHL, MLB, NFL, MLS, EPL, UCL/UEFA, WNBA, AFL, NCAA-MB, NCAA-FB,
  F1, PGA, Tennis, World Cup
- Prompt body instructs model to treat each [LEAGUE: X] as self-contained
- Specifically forbids the verbs "face/advance/play/meet/matchup with/takes on/
  winner of" when bridging leagues

**Smoke:** A338 (Layer A), A339 (Layer B), A340 (Layer C) all passing.
A311 (_jqDelay count) bumped from 5 to 6.

### Smoke state
- Gate: **238/0**
- Post-gate: A328–A340 all passing (13 new assertions across WOW 1+2, S0, L2e)
- Pre-existing post-gate failures unchanged: A273 (EPL), A313/A314 (PWA-A)
- File size: 1.247MB (down from session start ~1.28MB after edits)

## REMAINING DEPLOY WORK

### 1. CRITICAL — Cloudflare KV namespace creation (manual, carry-forward)
PUSH_SUBS_PLACEHOLDER_REPLACE_WITH_REAL_ID + JOURNALISM_PLACEHOLDER_REPLACE_WITH_REAL_ID
in field-relay-nba/wrangler.toml.

### 2. Browser verification
- Layer 2e on tonight's brief: should NOT contain the Stanley Cup hallucination
  on a slate that has both NBA Finals + Stanley Cup Final
- bus subscribers: `fieldEvents.addEventListener('field:score', e=>console.log(e.detail))`
- WS health: GET https://field-relay-nba.jeffunglesbee.workers.dev/health

### 3. Documentation updates
- STANDARDS.md: add Layer 2e architecture reference
- Update Architecture Spec v2 (1K4RAoaqbK7wUmauX-JjAonluS3MFjCZ6MEE8_6xYN48): mark S0 DONE
- Journalism Quality Spec (1dS0ldiE9Y0aUu2DAl7Ez5yo5evxlMAZXtghnmdScIHw): add Layer 2e section
- Infrastructure Backlog (1RQovuK208W6v6AEouA-w6DFU70Cgia4uxmOMkp0eOJU): move [UPDATE S0] to COMPLETED

## ARCHITECTURE NOTES

**ADR-002, RUWT, DO NOT INVENT:** all upheld throughout.
- Bus carries facts only
- Cross-sport detector ships factual error indicators, not invented facts
- Retry prompts explicitly state observed violations rather than fabricating context

**Journalism Quality Chain (now 6 layers, all browser-side):**
1. Layer 1 — prompt engineering (FIELD_PROSE_STYLE + BANNED_PHRASES + LEAGUE BOUNDARIES)
2. Layer 2 — cliché detection + retry
3. Layer 2b — sport vocabulary contamination + retry
4. Layer 2c — generic lead sentence + retry
5. Layer 2d — stat verification + retry
6. Layer 2e — cross-sport hallucination + retry (NEW)
7. Layer 3 — Datamuse prose scoring (specificity/freshness/density/variety/stats)
8. Layer 3b — score-triggered rewrite

## KEY DOC IDs
- CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
- STANDARDS.md: 1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM
- ADR-002: 1exp7zmdtiADes-8pA9QaLJum1m1EigbsfrXLQxyJdvM
- Update Arch v2 (S0): 1K4RAoaqbK7wUmauX-JjAonluS3MFjCZ6MEE8_6xYN48
- Journalism Quality Spec: 1dS0ldiE9Y0aUu2DAl7Ez5yo5evxlMAZXtghnmdScIHw
- 10 Wow Factors: 1O_JueImuL7JkqToDOr1OaXDOqMPVPLjm-CPW2OK_qoQ
- Infrastructure Backlog: 1RQovuK208W6v6AEouA-w6DFU70Cgia4uxmOMkp0eOJU
