# FIELD Handoff — June 1 2026 PM-7 TYPE B+D mixed (items 9, 10, 11, 16, 17, 18 closed)

**jubilant-bassoon HEAD:** 1a3681d (PM-7 close: gate move + PWA dual-form + ADR-003 attribution extended + STANDARDS rule audit) · Smoke: 363/0 (full assertion run, all green) · SW_VERSION 2026-06-01k
**field-relay-nba HEAD:** 6144d17 (unchanged from PM-6)

**This session closed six PM-6 priority list items:**
- Items 9, 10, 16: shipped as commit c36f5f2 + 54bea56 (smoke split)
- Item 11: shipped as commit 1a3681d (STANDARDS.md rule audit)
- Item 17: investigated as no-op (current code already general-purpose; PM-6 HANDOFF mischaracterized scope)
- Item 18: Drive doc 1qKrX_K6mk7aLN8e4h2g7C8sOO9JiWR_q4fqB2W5wmiE (NBA Stats GREEN-Path Successor Investigation)

**Session Doc (PM-7, this session — Drive):** 1Zi6pCB5dTOURvWyRvWU4KOFiDBzc2z6GZTsFQ1vsqoY
**Session Doc (PM-6 prior — Drive):** 1fF-5hrXThTw7cawgIxEz2rD5PussHAP7iYJV4Y8Vp-Q
**Session Doc (PM-5 prior — Drive):** 1po-q4yp3qFg5AXzCYvf-IazI9Q1OviyaoZu4HysjBuQ
**ADR-003 — stats.nba.com Source Acceptance:** 1XUPoayJUTh2Ki_DYXgw8uOAYZoGtpDt2c7510vGq64w
**NBA Stats GREEN-Path Successor Investigation (NEW):** 1qKrX_K6mk7aLN8e4h2g7C8sOO9JiWR_q4fqB2W5wmiE

**CANONICAL BUILD BACKLOG (READ FIRST):** Drive `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk` — §D "NBA PLAYOFF LEADERS SOURCE" closed by ADR-003 (PM-6) + extended attribution (PM-7).

## TIER 0 DEADLINES

- **NBA Finals G1: June 3** — SAS @ NYK · all four context tags now live with extended attribution discipline
- **Stanley Cup G2: June 4** — VGK @ CAR (all four tags live since PM-4)
- **World Cup 2026: June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (PM-7)

User opener: "Run items 9, 10, 11, 16, 17, 18" — explicit enumeration from PM-6 priority list. Mixed TYPE B + TYPE D, all six items closed.

### Item-by-item

**Item 9 — Smoke gate fix**
Moved `if (fail > 0) process.exit(1)` from line ~1047 to EOF of `smoke.js`. Previously A245-A368 ran but failures were invisible to CI: the gate had already exited based on the pre-gate count (241). Now the gate sees the full 363 assertion run. Single Results log + single process.exit at EOF.

**Item 10 — PWA-A manifest A313/A314 fix**
Investigation revealed the manifest IS conformant — inline as a data: URI with both `purpose:"any"` and `purpose:"maskable"` entries, plus `prefer_related_applications:false`. But smoke patterns checked `html.includes('"purpose":"any"')` which fails on URL-encoded JSON in data URIs. Added `_hasManifestSubstr` helper that accepts raw JSON form OR URL-encoded form. Both valid per W3C Manifest spec.

**Item 11 — STANDARDS.md duplicate-rule audit**
- Rule 48 had non-standard banner heading (`=== RULE 48 -- ===`). Normalized to `## Rule 48 — DO NOT ASSUME (...)`.
- Duplicate Rules 39/40/41/42 (second set: sport-display) renumbered to 50/51/52/53.
- First set (infra-related at lines 2140-2442) preserved since all in-body cross-references point there.
- Each renumbered rule carries `was Rule X` annotation in preamble.

**Item 16 — Audit attribution surfaces beyond J3 Brief**
Surveyed compound editorial output. Identified three additional surfaces that can carry NBA leader data through the [PLAYOFF STATS:] tag in the compound prompt:
- `compound.series[].preview` (J2 series previews) — wrapped
- `compound.scouts_pick` (J4-equivalent footer) — wrapped
- `compound.game_briefs[].brief` (per-game brief cache) — wrapped with **single-game scope** `[{games:[g]}]` so attribution only fires when THIS specific game has the NBA flag

Verified Night Owl (J5) and standalone fetchSeriesPreviewFromClaude (J2) DO NOT include populateSeriesContext in their prompts → no NBA attribution risk → no wrapping needed.

A369 smoke assertion added (≥7 total `_enforceNBAAttributionFooter` occurrences: 1 def + 3 FIELD Brief + 3 compound surfaces).

**Item 17 — INVESTIGATED, no code change needed**
Traced `populateSeriesContext` and `getNBAPlayoffLeadersForGame`. Code is general-purpose: sport gate is `sport.includes('nba')`, cache holds all 16 playoff teams. The "Finals-only" appearance in the PM-6 HANDOFF was a mischaracterization — the only NBA games in today's schedule ARE Finals (regular season ended ~April 13). The CODE would fire for any NBA playoff game. Logged as no-op.

**Item 18 — Paid NBA stats successor investigation**
Drive doc written with comparison matrix across 6 candidates:
| Candidate | $/mo | License Clarity | Risk |
|---|---|---|---|
| stats.nba.com (current ADR-003) | $0 | LOW (non-commercial) | HIGH (commercial) |
| BDL GOAT | $40 | MEDIUM (paid contract) | LOW-MED |
| API-Sports NBA (ADR-002) | $15-35 | MED-HIGH (existing) | **LOW** |
| Highlightly | $8+ | UNCERTAIN | MED-HIGH |
| SportsDataIO | $500+ | HIGH (B2B contract) | LOW |
| Sportradar | $500+ | HIGHEST (official) | LOWEST |
| MySportsFeeds | variable | MEDIUM | LOW-MED |

Posture (NOT verdict): pre-revenue → API-Sports under existing ADR-002 envelope (lowest friction, smallest cost, risk already accepted). Post-revenue → Sportradar OR SportsDataIO B2B contract.

### Decisions / rules invoked
- **Rule 7** — three commits (gate+PWA+attribution combined, A369 smoke, STANDARDS audit)
- **Rule 23** — SW_VERSION 2026-06-01j → k
- **Rule 45** — Item 18 explicitly posture not verdict; Drive doc reserves vendor decision for Jeff + counsel
- **Rule 46** — Drive docs plain text ≤220KB
- **ADR-001, ADR-002, ADR-003** — all preserved; Item 18 builds on ADR-003 re-evaluation triggers

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (Finals G1 tomorrow June 3, Cup G2 June 4)
1. SW `2026-06-01k` active in browser
2. NBA Finals G1 J3 brief — all four tags fire with **"Stats: NBA.com"** attribution (preserved by AI OR appended by guardrail)
3. **NEW — verify extended attribution surfaces** (Item 16 from this session):
   - J2 NBA Finals series preview shows attribution
   - Per-game NBA brief shows attribution when surfaced in bottom-sheet
4. Cup Final tags regression check (NHL still fires correctly)
5. **NEW — confirm smoke gate works at EOF position** in CI (was previously gating at 241 pre-gate; now gates at 363 full run)

### P0 — TIER 0 game-day
6. NBA Finals each game (June 3, 5, 7, …)
7. Cup Final each game (June 4, 6, …)
8. **June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)

### P1 — Documentation amendments (carried from PM-6)
9. Update CI/Deploy Ref for `/nba-stats/*` relay route
10. Add ADR-003 to STANDARDS.md ADR list (currently lists ADR-001 + ADR-002 only)
11. Update Build Backlog Canonical — move §D "NBA PLAYOFF LEADERS SOURCE" → §A SHIPPED with all PM-6 + PM-7 commits
12. **Investigate PM-5 relay tracking gap** — commits fff6e3c + 0e9a9d9 landed outside any documented session

### P1 — GREEN-path successor (when ADR-003 re-evaluation trigger fires)
13. Verify API-Sports has league-leaders endpoint OR /players/statistics with appropriate filter+sort returns equivalent data (~15 min, FREE, uses existing API-Sports free tier). If yes: ADR-002 already accepted, Path A becomes trivial swap. See Drive 1qKrX_K6mk7aLN8e4h2g7C8sOO9JiWR_q4fqB2W5wmiE.

### P2 — USPTO provisional prep (~June 25)
14. Patent narrative now includes PM-7 deliverables:
    - Smoke gate visibility fix (CI quality discipline)
    - Manifest dual-form check (architecture flexibility)
    - ADR-003 attribution defense-in-depth (extended to compound surfaces)
    - GREEN-path vendor investigation (proactive license posture documentation)
    - STANDARDS.md rule audit (governance hygiene)

### P2 — Build backlog highlights (carried)
15. **WC2026 mini-build (~35 min, BEFORE June 11)** — F09 REST Countries + F08 Nager.Date Holidays
16. **Voice Positioning Moves 1+2** — pending Exemplar B v2 approval
17. **`[MOBILE-INTEL-A]`** (HIGHEST per v7.27) — Right Now mobile hero card (~50 min)

### P2 — Decisions waiting on Jeff (§D Build Backlog)
18. SeatGeek affiliate link — A (no affiliate) vs B (with affiliate, Rule 33 conflict possible)
19. BDL milestone — A (pay GOAT $39.99/mo) vs B (remove entirely)
20. F07 TheSportsDB attribution terms read (Rule 45)
21. F12 Google Trends alpha stability (Rule 45 + Rule 48 Class B)
22. Voice Positioning Exemplar B v2 approval (blocks Moves 1+2)

### P3 — NEW cosmetic STANDARDS.md cleanup
23. Reorder Rule 47/48 in STANDARDS.md so source order matches numerical order (Rule 48 at line 2633 currently precedes Rule 47 at line 2700). Block-move ~65 lines. No content change.

### P3 — Deferred console errors (carried)
- `/espn-summary/.../nba/summary` 404
- `/mlb-umpire-scrape` 502
- `api.openf1.org` URL encoding
- WNBA Aces logo path 404

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: 1a3681d, deploys SUCCESS
- field-relay-nba HEAD: 6144d17 (unchanged from PM-6)
- **Smoke: 363/0** (full assertion run, gate now at EOF, all green)
- SW_VERSION `2026-06-01k` live
- **Smoke gate at EOF** — A361-A369 visible to CI for the first time
- **PWA-A manifest A313/A314 green** via dual-form check (raw JSON OR URL-encoded)
- **ADR-003 attribution extended** beyond J3 Brief to three compound surfaces (series preview / scouts pick / game briefs) — guardrail call sites now ≥ 7
- **STANDARDS.md duplicate-rule problem resolved**: Rule 48 heading normalized, Rules 39-42 second set renumbered to 50-53
- New Drive deliverable: NBA Stats GREEN-Path Successor Investigation
- All prior session state preserved:
  - PM-6: NBA playoff leaders feed end-to-end (relay + app + guardrail) + ADR-003
  - PM-5/PM-4: ESPN injuries feed, Phase B subtasks 6+7+8
  - PM-3: NHL playoff leaders feed
  - PM-2: Axis 3 Phase A + B scaffolding
- Cosmetic carry: Rule 48 / Rule 47 ordering in STANDARDS.md (P3)
