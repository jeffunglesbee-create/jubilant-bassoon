# FIELD HANDOFF — 2026-06-04 (SESSION END)

## State
jubilant-bassoon HEAD: 1a01349 (CI) / smoke HEAD: 5ff7ede (source)
Deploy HEAD: 1a01349 · Smoke: 494/0 · Unit tests: 60/0

## CI Speedup — Measured Results

### Root cause of 10-minute CI
20 Playwright tests × waitForTimeout(15000) fixed ceiling × sequential execution
= 300s of pure arithmetic sleep for what renders in ~1.5s.

### Fixes shipped (1a01349)

Fix 1: playwright.config.js — workers:4 + fullyParallel:true
  20 sequential → 4 parallel groups. One config flag.

Fix 2: window._fieldDataReady sentinel in index.html
  Set after first renderAll(). Typically resolves ~1.5s after DOMContentLoaded.
  Structural tests were waiting 15s for hardcoded schedule that renders in ~1.5s.

Fix 3: awaitReady(page, bufferMs) helper in field_browser.test.js
  Replaces all waitForTimeout(N) fixed waits with event-based detection.
  9 calls replaced: F02(8s→5.5s), F03(15→4.5s), F04(15→3.5s), F09(5→2s),
  F10(5→2s), F11(15→4.5s), F17(8→6.5s), F18(20→13.5s), F20(20→13.5s).

### Measured improvement
  Playwright tests:   301s → 155s  (49% faster)
  Browser-test job:   336s → 193s
  Total CI wall time: 433s → 292s  (33% faster, ~5 min vs 7+ min)
  Smoke A485 added.

### Why not 4x? 
  GitHub Actions ubuntu-latest = 2 vCPUs (not 4).
  Playwright I/O-bound — parallelism helps but 4 workers on 2 cores ≠ 4x.
  Effective speedup: ~2x parallel + ~2x sentinel = compound ~2x total.

### Remaining headroom
  - CF propagation wait: 25s hard constraint (separate from deploy timing)
  - Playwright install: 22s × 2 jobs = 44s waste (share via artifact or cache)
  - Editorial tests (F18/F20): 12s AI proxy waits — new per-worker bottleneck
  - If editorial tests skipped on non-editorial commits: ~20s more savings
  - Local serve via wrangler dev: eliminates CF wait entirely (saves 25s)

## Priority List (Current)
  ← NEXT: Scoreboard P0 (NBA Finals live, daily breakage)
  ← NEXT: R2 Finals Narrative Context Phase 1 (NBA Finals ongoing)  
  ← June 11: BALLDONTLIE trial (Mexico vs SA 7pm ET opening match)
  ← June 11: WC pre-flight verification
  ← June 25: Drama Dial (patent defense, highest-value unbuilt feature)
  ← June 25: wpDelta → drama signal hookup

## Key Refs
jubilant-bassoon HEAD: 1a01349
field-relay-nba HEAD: b888a5f
Smoke: 494/0 · Unit tests: 60/0
