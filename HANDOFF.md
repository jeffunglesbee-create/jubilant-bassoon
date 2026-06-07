# FIELD HANDOFF — 2026-06-07

## HEADS
- jubilant-bassoon HEAD: 0e85831
- SW_VERSION: 2026-06-07a
- Smoke: 513/0 (canonical — node smoke.js)
- field-relay-nba HEAD: 5608845 (unchanged this session)

## SESSION TYPE
Daily Update + TYPE C feature build (PM-26-P, PM-26-T, CLS probe automation)

## WHAT SHIPPED THIS SESSION

### Data fixes
- `36270cc` — NBA Finals G3 home/away inverted (SAS listed as home; NYK is home at MSG). Fixed home/away, venue, start_time (was yesterday's date), gameLabel, nationalBundle, seriesRecord. NHL SCF G3 seriesRecord was "SCF" with no record — patched to "Tied 1-1". Both matchupNotes updated with verified factual context.

### PM-26-P: State Transition Performance Marks + CLS Phase Tagging
- `9857173` — `performance.mark('field:cards'/'field:ready'/'field:supplemental')` at the three cold-load phase boundaries. `recordShift()` now tags each `__cls.events` entry with its load phase. A503 new. 512/0.

### CLS Probe Automation (cls-probe.yml + cls_probe.js)
- `e999796` — Headless Chromium Playwright loads live site, waits for `_fieldDataReady` + 4s buffer, reads `window.__cls` from page context, commits `outbox/cls-probe-{TS}.json` including byPhase breakdown, topSources, marks. Triggered via `workflow_dispatch` or `outbox/.trigger-cls-probe`.

### A504: CLS Budget Assertions (calibrated from live data)
- `257b515` — A504 locks structural contract for per-phase CLS budgets: S-1 :has() gate, M-1 #upper-slots, K-1 font-fallback all required simultaneously. Calibrated from cls-probe-2026-06-07T0217Z (total=0.2607).

### PM-26-T: .skim-strip min-height:50px (auto-applied)
- `689c722` — skim-probe measured #the-skim at 40px across 3 viewports. apply_skim_fix.py computed 50px recommendation. Auto-patched .skim-strip with min-height:50px;contain:layout. Same M-1 pattern.
- `34d4c07` — SW_VERSION bump to deploy PM-26-T to Cloudflare (2026-06-07a).

### Skim Probe Automation (skim-probe.yml + skim_probe.js + apply_skim_fix.py)
- `9aa7c63` / `18e7103` — Full automated pipeline: measure #the-skim height at 3 viewports → compute min-height → patch index.html → smoke gate → commit → dispatch cls-probe for re-measurement.

### A504 Budget Update
- `0e85831` — A504 tightened to 0240Z game-night ceiling (total=0.3641 with Night Owl active). ready budget: 0.35 → 0.40. All other phases unchanged (0.05).

## CLS STATE — POST SESSION
- Calibration runs: 0217Z (no Night Owl) = 0.2607; 0240Z (Night Owl active) = 0.3641
- PM-26-T skim reservation live on Cloudflare (50px)
- Dominant remaining source: #night-owl (0.0607) — next target, same M-1/N-2 pattern
- To address: dispatch skim-probe against #night-owl (or build night-owl-specific probe)
- Budget: skeleton≤0.05, cards≤0.05, ready≤0.40, supplemental≤0.05

## CONFIRMED RESOLVED (not P0)
- Scoreboard panel — shipped bcae437 (Jun 5), parseNBAScoreboardGames, A491
- R2 Finals Narrative Context — fetchFinalsDesk + buildCompoundPrompt both wire matchupNote; verified in live index.html

## STAT SEPARATION — CONFIRMED CLEAN
- STAT bootstrap used jubilant-bassoon as temporary scaffold; fully cleaned up in fdb33b2
- index.html, STANDARDS.md, HANDOFF.md: zero STAT touches
- STAT repo (jeffunglesbee-create/stat) fully self-contained with own CLOUDFLARE_API_TOKEN

## OPEN ITEMS
### P1 — Patent-priority
- JQ Gate brand-safe fallback (~60 lines)
- Drama Dial header chip (~20 lines)

### P2
- Arc Poster SVG (~200 lines) — "Amnesty data" still undefined; need definition before PPUBS
- #night-owl min-height reservation (next CLS target — dispatch skim-probe variant)

### Hard deadline
- World Cup 2026 pre-flight — June 11 (4 days). Auto-activation confirmed in place; endpoint probe pass needed.

### CLS follow-up (non-blocking)
- Run cls-probe without ?clsdebug=1 for cleaner future calibration (panel adds ~0.014 artifact)
- Consider adding `paths: ['index.html']` trigger to cls-probe.yml for automatic post-deploy re-measurement

## PROBE INFRASTRUCTURE NOW AVAILABLE
- `cls-probe.yml` — CLS cold-load measurement (dispatch anytime)
- `skim-probe.yml` — Element height measurement + CSS auto-fix + CLS re-measure (dispatch anytime)
- Both reuse Playwright Chromium cache; ~2min end-to-end

## BROADCAST RULES VERIFIED TODAY
- NBA Finals: ABC/ESPN, G3 NYK home (MSG), NYK leads 2-0
- NHL SCF: ABC, G3 VGK home (T-Mobile Arena), series tied 1-1

## SW_VERSION
- 2026-06-07a (deployed to Cloudflare)
- Next session: increment to 2026-06-07b or 2026-06-08a depending on date
