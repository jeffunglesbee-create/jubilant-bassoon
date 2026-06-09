# FIELD HANDOFF — 2026-06-09 (Session End — Bug Audit + Deploy Fix)

## HEADS
- jubilant-bassoon HEAD: 94953eb
- SW_VERSION: 2026-06-09b
- Smoke: 531/0
- field-relay-nba: 790f9da (JQ v3, unchanged)

## SESSION TYPE
TYPE B/D (Bug audit + fixes, screenshot infrastructure)

## WHAT SHIPPED THIS SESSION

### C1 — OTW [object Object] + C2 — Duplicate series record (b1f2be3, 7f9802a, 89a86d5)
C1 root cause: auto-overlay (field-data-today.json) was injecting seriesRecord:'SCF' and
a hallucinated matchupNote ("franchise's first championship trophy" — wrong; VGK won 2023;
"decisive Game 7" — wrong, this is G4). Fixed: typeof guard in buildOTWWhyLine isPreGame
branch (net&&typeof net==='string'), overlay corrected to seriesRecord:'VGK leads 2-1'
and factual matchupNote.
C2 root cause: matchupNote.split('.')[0] for NHL SCF G4 = "VGK leads 2-1" = seriesRecord.
Both pushed to parts → duplicate in why line.
Fix: skip matchupNote if _mn===g.seriesRecord||parts.includes(_mn).

### Deploy gate unblocked — .git exclusion (94953eb)
Root cause: .git/objects/pack/pack-*.pack grew to 51.7 MiB (>25 MiB CF asset limit)
as screenshot commits added large binary objects to git history. Wrangler was scanning
the .git directory because it was not in .assetsignore. Fixed by adding .git to .assetsignore.
Deploy gate was broken for 4+ hours (commits 89a86d59 → 94953eb).
INCIDENT POSTMORTEM: See CI/Deploy ref doc (Drive 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo).
Add .git to .assetsignore on EVERY new jubilant-bassoon repo clone.

### Screenshot probe infrastructure (screenshot_probe.js, screenshot-probe.yml)
11 viewports: iPhone SE 3rd gen portrait/landscape, Pixel 8 portrait/landscape (custom),
Galaxy A36 portrait/landscape (custom), standard mobile portrait/landscape, tablet
portrait/landscape, desktop. ?wpt bypass for My Services modal. Multi-pass scroll
(8 passes, re-read scrollHeight each pass) to trigger content-visibility:auto sections
before capture.

### WC bars — confirmed wired (no work needed)
HANDOFF CRITICAL "wc-bars pre-game not wired" was stale. buildWCBars(g) was wired into
renderAll card template in e0820ad with "Wired into renderAll card template" commit message.
A520 passes. Will render on June 11 when WC games appear (isToday).

### Bug audit results — C3/C4/C5/H1/H2/H3/H6 all CLOSED
C3: false alarm — V2 relay sets _sport correctly for all live sports (NBA/NHL/MLB all true).
C4/C5: content-visibility:auto screenshot artifact — DOM correct, 19/19 cards at all viewports.
H1/H6: same artifact — WNBA section below fold not rendered before capture. Probe scroll fixed.
H2: false alarm — tz-pill shows "🕐 loca" (local.slice(0,4)), correct 4-char abbreviation.
H3: false alarm — Scout's Picks third column has correct sparse content (game + series record).
FIELD Desk shows 3 cards: Field Brief, Series Brief, Scout's Picks. Layout correct at 1440px.

### Probe scripts excluded from deploy (.assetsignore)
screenshot_probe.js, otw_diag_probe.js, layout_probe.js added to .assetsignore.
Diagnostic workflows added: otw-diag-probe.yml, layout-diag-probe.yml.
Diagnostic files in outbox/: otw-diag-*.json, layout-diag-*.json, deploy-result-*.txt.

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

### MEDIUM
- M1: MLB card density inconsistency (mobile)
- M2: NHL matchup note density (~.63rem, mobile)
- M3: FuboTV chip label order ("FuboTV $92.99/mo → FREE")
- M4: Tablet OTW empty state dead gap
- M5: Score ticker desktop right-edge fade

### INFRA NOTE
.git is now in .assetsignore. This must remain permanently. If .assetsignore is
ever reset/regenerated, add .git back immediately or the next deploy touching
index.html will fail with "Asset too large" for the pack file.

## SMOKE
531/0 (unchanged)

## SESSION DOCS
- Session doc: TBD (write at true session end)
- Drive Current State: 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
- Drive CI/Deploy: 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
