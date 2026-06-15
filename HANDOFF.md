# FIELD Handoff — June 15 2026 (Session B — Cape Verde name fix)

**jubilant-bassoon HEAD:** `7826c38` · Smoke: **656/0** · SW_VERSION `2026-06-15c`
**field-relay-nba HEAD:** `4133d59`

---

## SHIPPED THIS SESSION

### Cape Verde Team Name Normalization (7826c38, A613)
- API-Sports D1 returns "Cape Verde Islands"; FIELD uses "Cape Verde"
- Without fix: Group H gets duplicate row + Monte Carlo H2H lookups fail
- Promoted local `_d1NameFix` to module-level `_WC_NAME_FIX` + `_wcFixTeamName()`
- Applied normalization in both standings merge AND `_wcBuildGroupInput` results mapping
- A560 updated for renamed constant; A613 added

## PRIOR SESSION (same day)

### Game Archive D1 — FULLY OPERATIONAL
- D1 field-archive (cc49101c): 19 postseason + 146 regular + 5 series
- 5 relay endpoints live (series, last-meeting, date, tagged, sport)
- ARCHIVE_RELAY_READY = true, 3 client consumers active
- enrichChampionshipFromArchive wired into 4 championship call sites (A611)
- 193 May entries removed from index.html (-56KB)

### CC Combined Cleanup — 3 commits
- Task A: May entry removal via brace-aware parser (2525c12)
- Task B: Betting dead code cleanup (741cef4)
- Task C: enrichChampionshipFromArchive + _PATH_TO_FINALS_KEY (3396c20)

### Desktop Layout Fixes — 3 bugs fixed by CC (eb9fa8e, A612)
- WC tab: hide list missed #field-journalism-section; default-hidden rule mobile-only
- Journalism tab: .main fixed rail at 1200+; hide rules mobile-only
- Ambient panel: renderAmbientPanel() early-return at >=1200; inline display residue

### Drive Upload Automation — FIXED
- YAML parse error + curl POST→GET on Google 302 → Python urllib
- Apps Script deployed v4; first successful upload: run #30

### Cross-Engine Viewport Testing (A609)
- iOS Safari: 5-device matrix, all producing results
- Android Chrome: 4-device matrix, awaiting first run

### Bracket Width Fix
- WC section max-width 900px → 1300px for 9-column bracket grid

## PENDING
- WebDriverIO desktop test infrastructure (chromedriver + safaridriver workflows)
- Backfill 23 missing archive entries + regular season scores
- Fix #3 test selector (#sport-filters) across 3 suites
- Android Chrome first successful run
- Clean up test outbox files (cc-drive-test-*.md)
- WC Groups G-L D1 updates
- Flag SVGs from Wikimedia Commons
