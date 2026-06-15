# FIELD Handoff — June 14 2026 (Mega-Session Part 3 Close)

**jubilant-bassoon HEAD:** `821d445` (Rule 58: No Article Scraping) · Smoke: **646/0** · SW_VERSION `2026-06-14k`
**field-relay-nba HEAD:** `0aa14d9` (unchanged this part)
**Session span:** ~14 hours total across 3 parts, iPad-only

---

## WHAT SHIPPED THIS SESSION (Part 3 — governance + fixes)

### Claude Code Governance Framework
- `docs/CLAUDE-CODE-PROMPT-RULES.md` — 6 rules: failed-attempts registry, explain-before-implement, acceptance criteria over implementation, separate diagnosis from implementation, Playwright as gate, no structural escalation without authorization
- `CLAUDE.md` Rules 8-16 — prompt architecture, structural guardrail, 7 STANDARDS.md cross-references (Rules 7, 13, 24, 29, 39, 42, 48)
- CSS Grid escalation (`9ce7ef2`) REVERTED (`fb72cc1`) — broke ambient panel visibility
- Rule 9: ambient panel is position:fixed, must not be replaced without authorization

### Ambient Panel Scroll — RESOLVED (5th attempt)
- **iPad-18** (`59c78fd`): CSS inset-positioned inner div. `.ambient-scroll-inner` changed to `position:absolute; top:0; right:0; bottom:0; left:0; display:block; overflow-y:auto`. Filament Group/Bootstrap 5 iOS pattern.
- **iPad-19** (`41bb8df`): JS scrollTop preservation across re-renders. Save before innerHTML write, restore after. Rule 24 case study.
- **Confirmed working on real iPad** — portrait and landscape.
- `docs/AMBIENT-SCROLL-SPEC.md` updated to RESOLVED status.

### WC Schedule Consistency — RESOLVED
- **iPad-20** (`ca335e1`): `buildTodaySchedule()` never called `maybePushWorldCup()`. Added three `maybePush*` calls before `return sections`. wc26Raw is static data — zero network risk. V2 merges live state on top via existing dedup logic. A603 pins the calls.

### Rule 58 — No Article Scraping (JOURNALISM-SOURCE-A)
- `821d445`: FIELD never scrapes journalism prose. Uses verifiable match facts, public press conference quotes, official records, structured statistical data. The synthesis is FIELD's contribution.

### Team Fit + Cohesion Spec v2
- Drive: `1m0fMR0ojbxugxmq1Re4jgw_MmqF2KiCGXPchT1u_FAo`
- Supersedes Section B of Soccer Analytics Spec v1 (May 27)
- 3 new dimensions: B8 Club Adversaries, B9 Decompression Window, updated B5 compound (7 dims)
- Case study: Gabriel (Arsenal) vs Marquinhos (PSG) — CL final 14 days before WC opener
- DECISION: journalism/editorial display only. Does NOT feed Monte Carlo. ADR-002 prevents composite scores; DO NOT INVENT prevents unvalidated weighting.

---

## PENDING (carry forward)

### WC Immediate
- [ ] ESPN WC live scores (relay `soccer/fifa.world` — Claude Code command given, not yet executed)
- [ ] WC match minute display (depends on ESPN integration)
- [ ] Duplicate LIVE indicators on WC cards
- [ ] Germany "F·52" status parsing
- [ ] Live WP bar on WC matches (odds API coverage TBD)
- [ ] Dixon-Coles BLEND mode for soccer WP

### Team Fit Build
- [ ] B8 Club Adversaries ~30 min (Wave 1)
- [ ] B9 Decompression Window ~20 min (Wave 1)
- [ ] B1 Club Pairs ~25 min (Wave 1)
- [ ] B5 Compound Display v2 ~15 min (Wave 1)

### Infrastructure
- [ ] Path B: ambient panel injection (future build)
- [ ] Playwright viewport tests need browser binaries in CI
- [ ] V10-V12 design tokens scaffold only (not consumed by CSS)

---

## KEY DOCS CREATED/UPDATED
- `docs/CLAUDE-CODE-PROMPT-RULES.md` — 6 rules + STANDARDS.md cross-reference table
- `docs/AMBIENT-SCROLL-SPEC.md` — RESOLVED, 5 attempts documented
- `docs/WC-SCHEDULE-SPEC.md` — diagnosis-first spec, RESOLVED
- `outbox/ambient-scroll-diagnosis.md` — Claude Code's diagnosis (inset positioning)
- `outbox/wc-schedule-diagnosis.md` — Claude Code's diagnosis (missing maybePush calls)
- Drive: Team Fit v2 spec (`1m0fMR0ojbxugxmq1Re4jgw_MmqF2KiCGXPchT1u_FAo`)
- STANDARDS.md Rule 58 (JOURNALISM-SOURCE-A)
- CLAUDE.md Rules 8-16
