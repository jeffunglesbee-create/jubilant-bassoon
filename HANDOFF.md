# FIELD Handoff — June 15 2026 (Extended Session: Testing + Archive + Audits)

**jubilant-bassoon HEAD:** `6033bae` · Smoke: **653/0** · SW_VERSION `2026-06-15a`
**field-relay-nba HEAD:** `4133d59` (archive endpoints deployed)

---

## WHAT SHIPPED

### 1. Cross-Engine Viewport Testing (A609)

iOS Safari + Android Chrome viewport audit suites using Appium + real device simulators on GitHub Actions ($0/mo vs BrowserStack $129/mo).

**iOS Safari (XCUITest + iOS Simulator on macos-latest):**
- `tests/ios-safari-viewport.js`: 16 assertions from viewport-all.spec.js
- `.github/workflows/ios-safari-audit.yml`: 5-device matrix (iPhone SE 3rd gen, iPhone 16, iPhone 16 Pro Max, iPad Air M2 portrait, iPad Air M2 landscape)
- ALL 5 DEVICES PRODUCING RESULTS (v8 run):
  - P1 iPhone SE: 7/9 | P2 iPhone 16: 7/9 | P3 iPhone 16 Pro Max: 7/9
  - T1 iPad Air portrait: 8/10 | T2 iPad Air landscape: 9/10
- **#14 ambient scroll architecture PASSES on all iPad viewports** — the iOS Safari bug class that Playwright missed 5 times, confirmed fixed on real Apple WebKit
- Universal failure: #3 filter bar selector (`.filter-bar` → should be `#sport-filters`) — stale selector in all 3 test suites
- XCUITest driver required (Safari driver v5.0.1 incompatible with iOS 18.x). WDA compile ~228s on first session.

**Android Chrome (UiAutomator2 + Android Emulator on ubuntu-latest):**
- `tests/android-chrome-viewport.js`: 16 assertions
- `.github/workflows/android-chrome-audit.yml`: 4-device matrix (Pixel 4a, 7, 7 Pro, Pixel Tablet)
- External bash script pattern (emulator-runner runs each line via separate `sh -c`)
- Emulator boots in ~42s. Awaiting first successful assertion run (v7 pending).

### 2. Game Archive D1 (A610)

**D1 database `field-archive` (cc49101c-0569-4d41-8e7a-be139cde4f26):**

| Table | Rows | Content |
|---|---|---|
| postseason_games | 19 | NBA ECF (3G) + WCF (5G), NHL ECF (4G) + WCF (3G) + East Semis (2G), UFL (2G) |
| postseason_series | 5 | Series summaries with narratives, winners, MVPs |
| regular_season_games | 146 | MLB 61, EPL 26, WNBA 19, AFL 16, La Liga 10, MLS 10, IPL 2, Ligue 1 2 |

**Relay endpoints (field-relay-nba, all live and verified):**
- `GET /archive/series/:key` — full series with games (verified: WCF returns 5 games, SAS winner)
- `GET /archive/last-meeting?home=X&away=Y` — fuzzy team match (verified: Dodgers vs Rockies)
- `GET /archive/date/:iso` — all games on a date (verified: 14 games on May 25)
- `GET /archive/tagged/:tag` — tagged games (verified: 20 final-day games)
- `GET /archive/sport/:sport` — sport filter (verified: 26 EPL games)

**Client consumers (index.html):**
- `fetchSeriesArchive(seriesKey)` — 30-min sessionStorage cache
- `fetchLastMeeting(teamA, teamB)` — 2.5s timeout
- `fetchArchiveDate(iso)` — 2.5s timeout
- `ARCHIVE_RELAY_READY = true` — consumers active

### 3. Audit Catalog + CC Commands

**`outbox/audit-catalog-2026-06-15.md`** — 7 audit surfaces identified:
1. Pattern extraction: 197 candidates (AbortSignal.timeout: 95, allData?.sports: 71, split(' ').pop(): 31)
2. RUWT risk register: 12 days stale, 1 MODERATE item deferred
3. Dead code + betting residue: 144 refs, 28 expired entries
4. Stale architecture references
5. Test selector alignment (#sport-filters)
6. CC governance
7. WC data integrity (rolling)

**CC command specs pushed:**
- `docs/CC-CMD-2026-06-15-dead-code.md` — Tasks 2-7 (betting CSS, dead functions, dead variables, dead localStorage, stale comments, gray items)
- `docs/CC-CMD-2026-06-15-archive-d1.md` — D1 seed + relay + client wiring (partially executed by CC, partially by this session)
- `docs/seed_*.sql` — D1 seed SQL files (executed)

### 4. Wikimedia Flag SVG Opportunity (documented)

Country flag SVGs for World Cup 2026 — 48 teams, public domain from Wikimedia Commons. Verified clean against ADR-002, RUWT, Source Clearance Gate. Documented in audit catalog.

## Iteration Log (iOS Safari troubleshooting)

8-step chain to get real WebKit testing working:
1. Device names → macos-latest has iPhone 16, not 15 Pro
2. safaridriver --enable required
3. Safari driver v5.0.1 → XCUITest driver (iOS 18.x incompatible)
4. Appium startup 20s → 60s wait with health check
5. WDA compile 228s → connectionRetryTimeout 600s
6. Simulator boot 119s default → simulatorStartupTimeout 300s
7. Android dash shell → external bash script
8. Android line splitting → script in /tmp

## Known Issues (carry forward)

- May entry removal: entries span multi-line, need CC with AST-aware removal (D1 has the data, entries are dead weight)
- Missing archive entries: 23 entries lost in extraction (UCL Final, UECL Final, UFL, WWE, some EPL) — re-extract needed
- Regular season archive has 0 scores and only 8 editorial notes — backfill from API-Sports historical data
- Journalism wiring: `enrichChampionshipFromArchive` wrapper needed (CC deferred — correct)
- Android Chrome audit: awaiting first successful assertion run (v7)
- #3 test selector: `.filter-bar` → `#sport-filters` across 3 test suites
- Layer 3 relay score cache — deferred
- ESPN WC live scores relay endpoint — pending

## Priority Queue

1. CC: Remove May entries from index.html (AST-aware, multi-line)
2. CC: Dead code cleanup (Tasks 2-7 from dead-code spec)
3. CC: Wire enrichChampionshipFromArchive into journalism
4. Backfill archive: re-extract 23 missing entries + seed scores
5. Fix #3 test selector across all 3 suites
6. WC Groups G-L D1 updates
7. Flag SVGs from Wikimedia Commons
