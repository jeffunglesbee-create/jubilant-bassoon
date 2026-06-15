# FIELD Audit Catalog + Flag SVG Opportunity
## June 15, 2026

---

## OPPORTUNITY: Wikimedia Commons Country Flag SVGs

### What
48 World Cup national team flags as inline SVGs, sourced from Wikimedia Commons (public domain). Replace text abbreviations on WC game cards with visual flag identifiers.

### Verification
- **ADR-002**: CLEAN. Static decorative assets, not a data pipeline. No relay involvement. No Source Clearance Gate trigger (Rule 45) — public domain assets don't require ToS review.
- **RUWT (US 9,421,446 B2 + continuations)**: NOT APPLICABLE. Flags are decorative identity elements, not interest-level scores, thresholds, or recommendations.
- **ADR-002 Addendum (Rule E)**: NOT APPLICABLE. No drama state, no excitement classification.
- **Wikimedia Commons licensing**: National flags are public domain or CC-0. Wikimedia explicitly EXCLUDES copyrighted logos/trademarks, but national flags are a different category — they are government works or traditional designs not subject to copyright in most jurisdictions. The Mediawiki API (`action=query&prop=imageinfo&iiprop=url`) returns direct SVG URLs with license metadata.
- **Wikimedia Commons for team logos**: NOT VIABLE. Club crests are copyrighted/trademarked. Only 83 total SVG sports logos on all of Commons. Wikipedia uses "fair use" for logos but Commons doesn't accept fair use. Would not clear FIELD's Source Clearance Gate.

### Implementation path
1. Harvest 48 WC team flag SVGs via Mediawiki API
2. Optimize (SVGO) to minimize file size
3. Inline as `<symbol>` sprite sheet in index.html OR host on R2 bucket
4. Map ISO country codes (already in wc26Raw) to flag symbols
5. Render via `<svg><use href="#flag-BRA"/></svg>` on WC game cards
6. Extend to MLB (player nationalities), EPL (international weeks) later

### Cost: $0/mo. No API key. No rate limit for static assets.

---

## AUDIT CATALOG — FIELD is due for the following

### 1. Pattern Extraction Audit (TYPE D)
**Rule 20 checklist — current counts:**

| Pattern | Count | Should Use | Priority |
|---|---|---|---|
| `AbortSignal.timeout` | 95 | `fieldFetch()` | HIGH — 95 is extreme duplication |
| `allData?.sports` | 71 | `forEachGame()` / `allGamesFlat()` | HIGH — 71 direct traversals |
| `split(' ').pop()` | 31 | `teamNick()` | MEDIUM |
| `.filter-bar` (tests) | 7 | `#sport-filters` | LOW — test selector only |

**197 total helper extraction candidates.** The `AbortSignal.timeout` count (95) is the most urgent — every fetch call reinvents timeout handling instead of using the centralized `fieldFetch` wrapper.

### 2. RUWT Risk Register Audit (TYPE D)
**Rule 51 — last classified: 2026-06-04**

One MODERATE item remains deferred:
- `_otwFindLiveGame(minScore=50)` at line 31980: uses `dramaScoreLive() > minScore` for ESPN game selection. Display is mitigated (named labels via `buildOTWStateLabel`), but selection mechanism is composite + threshold. Found at 4 call sites in current code.

Planned fix: replace with `buildOTWStateLabel()` category-based selection. This was scoped for the Drama Dial build session but Drama Dial itself is not yet built (LONG-TERM FTO path). Patent provisional filing was shelved June 2026, reducing urgency but not eliminating the risk.

**Recommendation:** Audit the 4 `_otwFindLiveGame` call sites, verify Drama Dial references (23 in codebase), classify any new patterns introduced since June 4.

### 3. Dead Code / Betting Residue Audit (TYPE D)
**Betting intelligence was removed May 29, 2026.**

Current state: **144 references** to betting/odds/BETTING_LINES still in index.html. These are likely:
- Dead CSS classes
- Commented code blocks
- BETTING_LINES_FALLBACK_DATA structures
- Conditional checks that always evaluate false

**28 expired May schedule entries** still in file. Rule 14 requires expired entries be pruned — they cause silent drift and inflate file size.

**index.html is 2,066,688 bytes (2.0 MB) with 718 functions.** Dead code removal could meaningfully reduce this. Rule 14 notes: "the growth rate is partly from accumulating expired schedule entries, stale BETTING_LINES_FALLBACK_DATA."

### 4. Stale External Reference Audit (TYPE D)
**Tracked gap from STANDARDS.md Rule 11:**

Architecture Index (`1SD5bjd1cZs1p7T4YyDJEpEEaJGUpc2V-Ux6zqUCvEU0`) still references Build Session v7.2 and Master v29.1. Scheduled for "next TYPE D session" — not yet done.

8 Architecture docs content is valid but cross-reference pointers are stale.

### 5. Test Selector Audit (TYPE D)
**Discovered this session via iOS Safari real-engine testing:**

`viewport-all.spec.js` uses `.filter-bar` selector — element doesn't exist in production DOM. Actual element is `#sport-filters`. The Playwright suite passes because Playwright's WebKit doesn't match real Safari behavior for this selector (or the test is silently skipping).

All three test suites need selector alignment:
- `tests/viewport-all.spec.js` — Playwright (3 references)
- `tests/ios-safari-viewport.js` — iOS Safari (2 references)
- `tests/android-chrome-viewport.js` — Android Chrome (2 references)

### 6. CC Governance Audit (TYPE D)
**Rule 59 (CC-AUDIT-A) — last audited: June 15, 2026**

CC governance is documented (CLAUDE.md 17 rules, CLAUDE-CODE-PROMPT-RULES.md 6 rules, session-start hook). The June 15 audit verified J2 championship brief wiring and found a stale-HEAD issue (CC running from old commit). Periodic re-audit recommended after any CC session that touches layout or data pipeline code.

### 7. World Cup Data Integrity Audit (TYPE D)
**wc26Raw is live with group stage matches.**

As WC progresses through group stage → knockout, the D1 database and Monte Carlo projections need verification against actual FIFA results. Group tiebreaker rules, goal difference, and fair play points all need to match FIFA's official calculations. This is a rolling audit, not a one-time check.

---

## Recommended Audit Sequence

| Priority | Audit | Estimated Effort | Why Now |
|---|---|---|---|
| 1 | Dead code + betting residue | 1 session | 144 references, 28 expired entries, 2MB file |
| 2 | Pattern extraction (AbortSignal.timeout) | 1-2 sessions | 95 instances, highest duplication |
| 3 | Test selector fix | 30 min | Blocks iOS/Android test accuracy |
| 4 | RUWT risk register refresh | 1 session | 12 days since last classification |
| 5 | Stale architecture references | 30 min | Tracked gap, quick fix |
| 6 | Pattern extraction (allData?.sports) | 1 session | 71 instances |
| 7 | WC data integrity (rolling) | ongoing | Tournament in progress |
