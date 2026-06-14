# Viewport v4 Build Plan — Claude Code Execution Spec

## Authority
- `docs/VIEWPORT-V4-SPEC.md` is the AUTHORITATIVE spec (supersedes all prior docs)
- `outbox/viewport-audit.md` contains the gap analysis
- This file is the BUILD PLAN — ordered tasks, one commit per task, smoke after each

## Pre-build
1. `git pull` to get latest main
2. Read `docs/VIEWPORT-V4-SPEC.md` (authoritative spec)
3. Read `outbox/viewport-audit.md` (gap analysis)
4. Run `node smoke.js index.html` — record baseline count
5. Run `node field_unit.js` — confirm 66/0

---

## Build Phase 1: Critical Fixes (Tier A)

### A1: Define missing `--caution` token
**What:** Add `--caution: #f59e0b;` to `:root` in index.html
**Why:** Used at line 13343 but never declared — broken style on live site
**Smoke:** assert `--caution` token present in :root
**Commit:** `fix(A1): define --caution token in :root`

### A2: Gate bottom sheet above 820px
**What:** Add `@media(min-width:820px){ .bottom-sheet { display:none !important; } }`
**Why:** Bottom sheet shows on iPad/desktop where spec routes to ambient panel
**Smoke:** assert bottom-sheet hidden rule exists for min-width:820px
**Commit:** `fix(A2): gate bottom-sheet to phone-only (≤819px)`

### A3: Typography migration — Chakra Petch + DM Sans
**What:**
1. Replace Google Fonts link: load Chakra Petch (400,600,700) + DM Sans (300,400,500) + JetBrains Mono (keep for monospace)
2. Update `:root` tokens:
   - `--ff-display: 'Chakra Petch', sans-serif;` (was Playfair Display)
   - `--ff-body: 'DM Sans', sans-serif;` (was Barlow)
   - Remove `--ff-cond` (Barlow Condensed — no longer needed)
3. Remove Playfair Display, Barlow, Barlow Condensed from font link
4. Search for any hardcoded `font-family: 'Playfair` or `font-family: 'Barlow` — replace with var()
**Why:** June 12 2026 decision superseded all prior typography. Spec lines 218-224.
**Smoke:** assert Chakra Petch loaded, assert no Playfair/Barlow references except in comments
**Commit:** `feat(A3): typography migration — Chakra Petch + DM Sans`

---

## Build Phase 2: Design System Tokens (Tier B)

### B1: Add all COLOUR-SYS-A tokens to :root
**What:** Add the 30 missing tokens to `:root` block. Exact values from spec lines 116-181:
```css
/* Drama intensity */
--drama-must:  #c9a84c;
--drama-watch: #4a9eff;
--drama-low:   #6a6a8a;

/* Access */
--access-free:  #2dd4bf;
--access-trial: #f59e0b;

/* Angles */
--angle-comeback:    #c9a84c;
--angle-upset:       #f59e0b;
--angle-gem:         #2dd4bf;
--angle-hype:        #6a6a8a;
--angle-elim:        #ef4444;
--angle-deciding:    #c9a84c;
--angle-standard:    #f2f2fa;
--angle-quiet:       #6a6a8a;
--angle-rivalry:     #a78bfa;
--angle-series-lead: #4a9eff;

/* Card highlight */
--card-highlight: #181830;

/* Sport identity (rename from --c-* to --sport-*) */
--sport-nba:  #f97316;  --sport-wnba: #f97316;
--sport-nhl:  #60a5fa;  /* FIX: was #38bdf8 */
--sport-mlb:  #4ade80;
--sport-epl:  #22c55e;  --sport-mls:  #16a34a;
--sport-nfl:  #1e40af;  --sport-afl:  #f59e0b;
--sport-tennis: #facc15; --sport-f1:  #ef4444;
--sport-champions-league: #1d4ed8;
--sport-wc:   #c9a84c;
```
**Keep old `--c-*` tokens as aliases** pointing to new `--sport-*` names for backward compat.
**Smoke:** assert all 30+ tokens present in :root
**Commit:** `feat(B1): add COLOUR-SYS-A semantic tokens to :root`

### B2: Add motion + opacity tokens to :root
**What:** Add to `:root`:
```css
--motion-instant:    0ms;
--motion-urgent:     150ms;
--motion-deliberate: 280ms;
--motion-ambient:    2000ms;
--opacity-live:  1.0;
--opacity-seen:  0.6;
--opacity-trace: 0.25;
--opacity-gone:  0.0;
```
**Smoke:** assert motion and opacity tokens present
**Commit:** `feat(B2): add motion + opacity semantic tokens`

### B3: Add typography role tokens to :root
**What:** Add to `:root`:
```css
--type-verdict:  600 1.1rem/1.3 var(--ff-display);
--type-headline: 700 1.75rem/1.2 var(--ff-display);
--type-data:     500 1rem/1.3 var(--ff-body);
--type-label:    600 .75rem/1.3 var(--ff-body);
--type-chip:     500 .8rem/1.3 var(--ff-body);
--type-context:  400 .85rem/1.4 var(--ff-body);
```
**Smoke:** assert type role tokens present
**Commit:** `feat(B3): add typography role tokens`

### B4: Refactor SPORT_COLORS dict to use tokens
**What:** Replace raw hex dict at line ~5127 with token references:
```js
const SPORT_COLORS = {
  "NBA Playoffs": "var(--sport-nba)", "NBA": "var(--sport-nba)",
  "NHL Playoffs": "var(--sport-nhl)", "NHL": "var(--sport-nhl)",
  /* ... etc for all sports ... */
};
```
Also fix inline `style="…#hex…"` sport color references to use `var(--sport-*)`.
**Smoke:** assert no raw hex in SPORT_COLORS dict
**Commit:** `refactor(B4): SPORT_COLORS dict uses semantic tokens`

### B5: Fix skim-strip border weights to match semantic system
**What:** `.skim-strip[data-urgency="must"]` and `[data-urgency="watch"]` border from 3px → 4px per spec
**Smoke:** assert 4px border on must/watch skim strips
**Commit:** `fix(B5): skim-strip editorial border 4px per SEMANTICS-SYS-A`

---

## Build Phase 3: Viewport Fixes (Tier C)

### C1: Touch targets 44px floor
**What:** Add min-height:44px to `.filter-btn`, `.date-nav-btn`, `.share-btn`, `.watch-btn`
**Smoke:** assert 44px touch target on primary interactive elements
**Commit:** `fix(C1): enforce 44px touch target floor per Apple HIG`

### C2: Journalism brief MID tier (2-line)
**What:** Add `@media(min-width:414px) and (max-width:819px)` rule:
`.card-brief-inline-text { -webkit-line-clamp: 2; max-height: calc(1.55em * 2); }`
**Smoke:** assert 2-line clamp exists for mid-width viewport
**Commit:** `feat(C2): journalism brief MID tier (2-line) for P3-L2`

---

## Post-build
1. Run `node smoke.js index.html` — confirm 0 failures
2. Run `node field_unit.js` — confirm 0 failures
3. Bump SW_VERSION (index.html + sw.js must match)
4. Update HANDOFF.md
5. Push branch, report commit ledger

---

## Rules
- One commit per task
- Smoke must pass after each commit (0 failures)
- SW_VERSION format: `YYYY-MM-DD[letter]` in ET timezone
- Do NOT modify relay code (field-relay-nba)
- If a change would break an existing smoke assertion, fix the assertion in the same commit
- Keep old `--c-*` sport tokens as aliases — do not break existing CSS that references them
