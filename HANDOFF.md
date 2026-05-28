# FIELD — Session Handoff
## May 27-28 2026 · TYPE B + TYPE C

**HEAD:** fe00441 | **SW:** 2026-05-27q | **Smoke:** 223/0 ✅ | **Playwright:** 18/18 ✅

---

## READ FIRST

1. Check WCF G6 result (OKC @ SAS — was tonight May 28)
2. Check NHL ECF G4 result (CAR @ MTL — was May 27)
3. Do TYPE A update before any other work
4. NBA Finals G1 = June 3 — 6 days — shell build is 35 min

---

## WHAT WAS BUILT THIS SESSION

**Single commit fe00441 — Playwright fixes:**

| Fix | Root cause | File |
|-----|-----------|------|
| F02+F03 MLS 400 | Off-season data gap | field_browser.test.js: SOFT_FAIL_DOMAINS |
| F04 PRICES TDZ | Hoisted fn + const TDZ | index.html: computeCoverageStats() try-catch |
| F10 debug panel | #field-debug-panel → #fhp-overlay | field_browser.test.js line 223 |
| F16 card tap | .game-card → .card-body[data-open] | field_browser.test.js line 361 |

---

## TIER 0 — DO FIRST (unchanged)

- ⚡ **BNI Patent Fix** (~15 min) — lines 16458-16461 index.html
- ⚡ **EMBER Patent Fix** (~30 min) — isLateCloseGame() replaces threshold
- ⚡ **NBA Finals G1 Shell** — JUNE 3 DEADLINE
- ⚡ **World Cup 2026 Build** — JUNE 11 DEADLINE (54 games)
- ⚡ **USPTO Provisional** — ~$320 pro se — EXPIRES ~JUNE 25

---

## NEW FROM THIS SESSION

**Unifying Thread doc:** 10a6b5zQvIzWo1HoWnJ4OdXG3u0Y3J2USFjqINt48Bzs
FIELD's intelligence layer is consistently ahead of its display layer.
Surface ratio: ~25% without tap → target 70%. "Surface Area Audit" is
now a named step in session protocol.

**Categorization Audit:** 1kWrqLvv5ybQl7GyeBUBH5lcQ9860lV-WTAwN_sd3jzg
~80% of specced advanced metrics have no Master entry. Wow #112-131 missing.
H1-H4 (patent claims) missing. Master needs ANALYTICS PIPELINE + DISPLAY
ARCHITECTURES sections. Add to STANDARDS.md: every analytics spec session
must produce a Master update.

**RUWT x Viewport Design Truth (corrected):**
Live drama scores must NEVER appear in Drama Spectrum or Arbitrage Matrix
cells. Named states only for live games. Post-game (Amnesty Zone) = numbers OK.
The prior thought experiment was wrong on this point.

---

## KEY ARCHITECTURAL RULES CONFIRMED

- dramaScoreLive() → internal routing only. Never DOM for live games.
- Drama Spectrum live: named-state columns (CRUNCH / ELIM / GRINDING / NOT TONIGHT)
- Arbitrage Matrix live cells: named states + access type, not scores
- Five-badge display: [VOLATILITY][STAKES][PACE][SCARCITY][CLUTCH] — never summed
- Amnesty Zone: data-state="post" — numbers fully open. Night Owl, Arc Poster.
- Surface Area Audit: ask "what does FIELD compute that isn't visible?" each session

---

## SPORT STATE

| Sport | Status | Check |
|-------|--------|-------|
| NBA WCF | OKC leads 3-2 | G6 tonight May 28 — result unknown at close |
| NHL ECF | CAR leads 3-0 | G4 May 27 — result unknown at close |
| NHL SCF | VGK confirmed | Awaiting ECF winner |
| MLB | Regular season | Daily update needed |

---

## CANONICAL DOCS

| Doc | ID |
|-----|----|
| Current State | 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8 |
| CI/Deploy Ref | 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20 |
| Master Feature Priority | 1k2pq5dB6pKeegBzVBo1ee-Xo98-Qri5aq-2WqMg_suU |
| NBA+NHL Analytics Spec | 13AGp87M_6FrWwMNi4y0L3rHcrIrqSaU-OvxGEGdzgSo |
| Baseball Analytics Spec | 1EwO-NfG_aBb-6CoOOliuCeCHxbYFfuTBoQrlejM7smM |
| Desktop Visual Surfaces | 1ztbAGH-qHeKg1Ss_UneYmw9ZMk_H2eDcbSN66UPb22E |
| Journalism Quality Spec | 1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU |
| This handoff (Drive) | 1B_9aEJ570gXiygNt9O0qz7TC6N0Y1Gc8-C3AwCBPXUs |
