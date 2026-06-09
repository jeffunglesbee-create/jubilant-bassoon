# FIELD HANDOFF — 2026-06-09 (Session End — M-item verification + M5 fix)

## HEADS
- jubilant-bassoon HEAD: 1b3519d
- SW_VERSION: 2026-06-09d
- Smoke: 531/0
- field-relay-nba: 790f9da (JQ v3, unchanged)

## SESSION TYPE
TYPE D (Bug verification + fix)

## WHAT SHIPPED THIS SESSION

### M5 — Score ticker desktop right-edge fade (closed)
Root cause: `#score-ticker-wrap` had no positional context and no pseudo-elements.
.score-ticker overflows at scrollWidth 1603 vs clientWidth 1200 with zero visual cue.
Fix: `position:relative` on wrap + `::after` (64px right gradient, always visible) +
`::before` (40px left gradient, opacity driven by `--m5-left-opacity` CSS var).
JS scroll listener on `.score-ticker` sets var after `renderScoreTicker` mounts;
`_m5ScrollBound` guard prevents duplicate listeners on re-renders.
Verified via live DOM probe (m5_ticker_probe.js / m5-ticker-probe.yml):
`hasFadeGradient: True` at 1280/1440/1920px. Pass on attempt 1.
Commits: 867f128 (fix), 1b3519d (sw.js SW_VERSION sync — A190 gate).

### M-item audit (all items verified against live DOM)
- M1 ✅ CLOSED (prior session 6484c7a) — legend hidden on mobile/landscape
- M2 ✅ CLOSED (prior session, multiple commits) — matchupNote clamp + hide
- M3 ✅ CLOSED (prior session 68494d0) — FREE badge suppressed when chip visible
- M4 ✅ CLOSED (prior session db4dd4b) — quiet OTW empty state suppressed
- M5 ✅ CLOSED (this session 867f128) — right-edge fade + scroll-driven left fade

### Infrastructure shipped this session
- m5_ticker_probe.js — targeted DOM audit (styles, pseudo-elements, scroll metrics,
  chip overflow detection) at 3 desktop viewports
- m5-ticker-probe.yml — CI workflow, trigger via outbox/.trigger-m5-ticker-probe

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
.git is in .assetsignore — permanent. If .assetsignore is ever reset/regenerated,
add .git back immediately or deploy will fail with "Asset too large" for pack file.

## SMOKE
531/0

## SESSION DOCS
- Drive Current State: 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
- Drive CI/Deploy: 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
