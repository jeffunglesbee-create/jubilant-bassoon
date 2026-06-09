# FIELD HANDOFF — 2026-06-09 (Documentation Pass — C/H/M Items)

## HEADS
- jubilant-bassoon HEAD: 36b9a0c
- SW_VERSION: 2026-06-09d
- Smoke: 531/0
- field-relay-nba: 790f9da (JQ v3, unchanged)

## SESSION TYPE
TYPE D (Bug verification + fix) + Documentation pass

## WHAT SHIPPED THIS SESSION

### M5 — Score ticker desktop right-edge fade (closed)
Root cause: `#score-ticker-wrap` had no positional context and no pseudo-elements.
.score-ticker overflows at scrollWidth 1603 vs clientWidth 1200 with zero visual cue.
Fix: `position:relative` on wrap + `::after` (64px right gradient, always visible) +
`::before` (40px left gradient, opacity driven by `--m5-left-opacity` CSS var).
JS scroll listener on `.score-ticker` sets var after `renderScoreTicker` mounts;
`_m5ScrollBound` guard prevents duplicate listeners on re-renders.
Verified via live DOM probe: `hasFadeGradient: True` at 1280/1440/1920px. Pass on attempt 1.
Commits: 867f128 (fix), 1b3519d (sw.js SW_VERSION sync — A190 gate).

### M-item audit (all items verified against live DOM)
- M1 ✅ CLOSED (6484c7a) — legend hidden on mobile/landscape
- M2 ✅ CLOSED (multiple commits) — matchupNote clamp + hide
- M3 ✅ CLOSED (68494d0) — FREE badge suppressed when chip visible
- M4 ✅ CLOSED (db4dd4b) — quiet OTW empty state suppressed
- M5 ✅ CLOSED (867f128) — right-edge fade + scroll-driven left fade

### STANDARDS.md — Rules 55-57 added (36b9a0c)
Rule 55 (OVERLAY-TYPEOF-A): typeof guard before overlay string values in prose context.
  Root: C1 (OTW [object Object], buildOTWWhyLine, June 9 2026)
Rule 56 (PARTS-DEDUP-A): dedup check before pushing to why-line parts array.
  Root: C2 (duplicate series record in OTW why-line, June 9 2026)
Rule 57 (SCREENSHOT-CV-A): content-visibility:auto defers off-screen sections in
  headless Chromium. All screenshots require forceExpand() scroll pass.
  Root: C4/C5/H1/H6 (false alarm bug reports, June 9 2026)

### Infrastructure shipped
- m5_ticker_probe.js + m5-ticker-probe.yml — targeted DOM audit
- screenshot_probe.js + screenshot-probe.yml — 11-viewport content-aware probe
- Rules 55-57 in STANDARDS.md

## C/H ITEM HISTORY (from Bug Audit session 2026-06-09b)

C1 ✅ CLOSED — OTW [object Object]: typeof guard in buildOTWWhyLine (b1f2be3)
C2 ✅ CLOSED — Duplicate series record: parts dedup in buildOTWWhyLine (7f9802a)
C3 ✅ CLOSED — _sport relay: false alarm (V2 relay correct, no fix)
C4 ✅ CLOSED — Mobile card layout: false alarm (content-visibility:auto artifact)
C5 ✅ CLOSED — Mobile card row: false alarm (same artifact as C4)
H1 ✅ CLOSED — WNBA missing: false alarm (content-visibility:auto artifact)
H2 ✅ CLOSED — tz-pill truncation: false alarm (local.slice(0,4) intentional)
H3 ✅ CLOSED — Scout's Picks empty: false alarm (sparse content correct)
H6 ✅ CLOSED — WNBA missing: false alarm (same as H1)

## DEFERRED — TUE JUN 10 2026 10AM ET
1. R2 WC team context (Drive 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks)
2. WC journalism tab brief

## OPEN ISSUES

### HIGH (product)
- Series dots board (~40 lines) — spec surface 6a
- Arc sparkline SVG (~25 lines) — spec surface 6b
- WHOLE FIELD toggle (~30 lines) — spec surface 6c
- Night Owl amnesty arc (~20 lines) — spec surface 6d (mini-spec approved)
- State transition timeline (~30 lines) — spec surface 6e
- Drama spectrum RUWT-safe (~60 lines) — spec surface 6f
- Focus trap bottom sheet (0 :focus-visible, 0 aria-modal)

### INFRA NOTE
.git is in .assetsignore — permanent. See CI/Deploy Addendum (INCIDENT 11).
If .assetsignore is ever reset/regenerated, add .git back immediately.

## SMOKE
531/0

## SESSION DOCS
- Bug Audit + Deploy Fix session doc: Drive 1H_3h9SGRIS0TCqse92mhb3KLluMEqE5z
- M-item verification + M5 session doc: Drive 1mmdKe6IDIeebXlM5J34tiFoyyG7fWQaw
- C/H/M Item Registry: Drive 1XEdWui58L5YCn2-CoN5NEcDrNdcsf2Ah
- CI/Deploy Addendum (Incident 11): Drive 1JWvyNA5BcMpW6p7bVJDXNIAGJBwR8w75
- Drive Current State: 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
- Drive CI/Deploy (main): 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
