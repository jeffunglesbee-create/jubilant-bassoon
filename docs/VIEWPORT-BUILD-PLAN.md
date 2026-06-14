# Viewport v4 Build Plan — Claude Code Execution Spec

## Authority
- `docs/VIEWPORT-V4-SPEC.md` is the AUTHORITATIVE spec (supersedes all prior docs)
- `outbox/viewport-audit.md` (v3 final) is the gap analysis — 15 items + observations
- This file is the BUILD PLAN — ordered tasks, one commit per task, smoke after each

## Scope
- All 15 audit checklist items (in remediation order from v3 audit)
- `--caution` fix (from Observations — actively broken on live site)
- Token foundation (COLOUR-SYS-A, motion/opacity, typography roles — future scaffold)

## Pre-build
1. `git pull` to get latest main
2. Read `docs/VIEWPORT-V4-SPEC.md` (authoritative spec)
3. Read `outbox/viewport-audit.md` (v3 final gap analysis)
4. Read this file (build plan)
5. Run `node smoke.js index.html` — record baseline count
6. Run `node field_unit.js` — confirm passing

---

## Phase 1: BROKEN items (Tier A — fix first)

### 1. Typography migration (audit item #10 — BROKEN)
**What:**
1. Replace Google Fonts `<link>`: load Chakra Petch (400,600,700) + DM Sans (300,400,500). Keep JetBrains Mono for monospace.
2. Update `:root` tokens:
   - `--ff-display: 'Chakra Petch', sans-serif;` (was Playfair Display)
   - `--ff-body: 'DM Sans', sans-serif;` (was Barlow)
   - Remove `--ff-cond` (Barlow Condensed — no longer needed)
3. Remove Playfair Display, Barlow, Barlow Condensed from font link
4. Search for any hardcoded `font-family: 'Playfair` or `font-family: 'Barlow` — replace with var()
**Why:** Spec lines 218-224: "These are SUPERSEDED."
**Smoke:** assert Chakra Petch in font link, assert no Playfair/Barlow in font link
**Commit:** `feat(V1): typography migration — Chakra Petch + DM Sans [audit #10]`

### 2. Breakpoint scheme — add explicit P1/P2/P3 boundaries (audit item #1 — BROKEN)
**What:** Add explicit media queries for the three phone tiers that are currently missing or implicit:
- P1 (<375px): verify existing `max-width:375px` shim covers spec needs
- P2 (375-413px): add `@media(min-width:375px) and (max-width:413px)` rules where phone-specific CSS differs from P1
- P3 (414-430px): verify existing `max-width:430px` covers spec needs
- Add orientation gates for T1 (portrait) vs T2 (landscape) within the 820-1199 range
- Resolve 768-900 / 820-1199 overlap
**Why:** Current scheme doesn't map to 11-bucket model. Phone tiering via JS attribute is acceptable alongside CSS.
**Smoke:** assert P2 media query exists, assert orientation gate for T1/T2
**Commit:** `fix(V2): explicit P1/P2/P3 breakpoints + T1/T2 orientation gates [audit #1]`

---

## Phase 2: PARTIAL/MISSING items (Tier B)

### 3. Bottom sheet viewport gate (audit item #12 — PARTIAL)
**What:** Add `@media(min-width:820px){ .bottom-sheet { display:none !important; } }`
**Why:** Sheet shows on iPad/desktop where spec routes to ambient panel / inline expand (lines 68-73)
**Smoke:** assert bottom-sheet hidden rule for min-width:820px
**Commit:** `fix(V3): gate bottom-sheet to phone-only [audit #12]`

### 4. Card tiering classes on .game-card (audit item #2 — PARTIAL)
**What:** Introduce `.card-tier-featured`, `.card-tier-standard`, `.card-tier-compact` classes on `.game-card`. Wire the existing JS tier computation (4726-4791) to apply these classes to general game cards, not just RN mini-cards.
**Why:** Scaffold required for journalism brief tiering (#14) and Two-Target Architecture (lines 62-73)
**Smoke:** assert card-tier class names present in CSS
**Commit:** `feat(V4): card-tier-featured/standard/compact classes [audit #2]`

### 5. Journalism brief MID tier (audit item #14 — PARTIAL)
**What:** Add `@media(min-width:414px) and (max-width:819px)` rule:
`.card-brief-inline-text { -webkit-line-clamp: 2; max-height: calc(1.55em * 2); }`
Gate brief visibility by card tier: featured=visible, standard=1-line, compact=hidden.
**Why:** Spec lines 78/255: P3-L2 should show 2-line brief
**Depends on:** task #4 (card tier classes)
**Smoke:** assert 2-line clamp media query exists
**Commit:** `feat(V5): journalism brief MID tier (2-line) for P3-L2 [audit #14]`

### 6. Sport stripe alignment (audit item #9 — PARTIAL)
**What:**
1. Add `--sport-*` tokens to `:root` (all 12 per spec lines 163-172). Keep `--c-*` as aliases.
2. Fix NHL hex: `--sport-nhl: #60a5fa` (was `--c-nhl: #38bdf8`)
3. Add missing sports: MLS, EPL (distinct from generic soccer), NFL, F1, Champions League, WC
4. Refactor `SPORT_COLORS` JS dict (line ~5127) to use `var(--sport-*)` instead of raw hex
**Smoke:** assert --sport-nba token present, assert no raw hex in SPORT_COLORS
**Commit:** `refactor(V6): sport stripe tokens + SPORT_COLORS refactor [audit #9]`

### 7. Touch targets 44px floor (audit item #7 — PARTIAL)
**What:** Add `min-height:44px` to `.filter-btn`, `.date-nav-btn`, `.share-btn`, `.watch-btn`, drama-badge tap zones
**Why:** Apple HIG floor breached on primary tap targets
**Smoke:** assert 44px on filter-btn
**Commit:** `fix(V7): enforce 44px touch target floor [audit #7]`

### 8. CompactGrid threshold (audit item #3 — PARTIAL)
**What:** Move 3-col grid breakpoint from 1800px to 1440px per spec D3/D4 breakpoints. Confirm 2-col phone portrait behavior.
**Smoke:** assert 3-col grid at min-width:1440px
**Commit:** `fix(V8): CompactGrid 3-col at 1440px [audit #3]`

---

## Phase 3: Observation fixes + Token foundation

### 9. Define `--caution` token (Observation — BROKEN on live site)
**What:** Add `--caution: #f59e0b;` to `:root`
**Why:** Used at line 13343 but never declared — broken style on production
**Smoke:** assert --caution token in :root
**Commit:** `fix(V9): define --caution token in :root`

### 10. COLOUR-SYS-A token foundation
**What:** Add remaining semantic tokens to `:root` that aren't already added by task #6:
```css
--drama-must:  #c9a84c;  --drama-watch: #4a9eff;  --drama-low: #6a6a8a;
--access-free: #2dd4bf;  --access-trial: #f59e0b;
--card-highlight: #181830;
--angle-comeback: #c9a84c;  --angle-upset: #f59e0b;  --angle-gem: #2dd4bf;
--angle-hype: #6a6a8a;  --angle-elim: #ef4444;  --angle-deciding: #c9a84c;
--angle-standard: #f2f2fa;  --angle-quiet: #6a6a8a;
--angle-rivalry: #a78bfa;  --angle-series-lead: #4a9eff;
```
**Smoke:** assert --drama-must and --angle-comeback tokens present
**Commit:** `feat(V10): COLOUR-SYS-A semantic token foundation`

### 11. Motion + opacity token foundation
**What:** Add to `:root`:
```css
--motion-instant: 0ms;  --motion-urgent: 150ms;
--motion-deliberate: 280ms;  --motion-ambient: 2000ms;
--opacity-live: 1.0;  --opacity-seen: 0.6;
--opacity-trace: 0.25;  --opacity-gone: 0.0;
```
**Smoke:** assert --motion-urgent and --opacity-seen tokens present
**Commit:** `feat(V11): motion + opacity semantic tokens`

### 12. Typography role token foundation
**What:** Add to `:root`:
```css
--type-verdict:  600 1.1rem/1.3 var(--ff-display);
--type-headline: 700 1.75rem/1.2 var(--ff-display);
--type-data:     500 1rem/1.3 var(--ff-body);
--type-label:    600 .75rem/1.3 var(--ff-body);
--type-chip:     500 .8rem/1.3 var(--ff-body);
--type-context:  400 .85rem/1.4 var(--ff-body);
```
**Smoke:** assert --type-verdict and --type-data tokens present
**Commit:** `feat(V12): typography role tokens`

---

## Phase 4: Remaining EXISTS items — verify only (no build needed)

Items #4 (ambient panel), #5 (WHOLE FIELD toggle), #6 (filter bar scroll-snap), #8 (iOS safe-area), #11 (Night Owl/Journal), #13 (WC styles), #15 (live WP bar) — all scored EXISTS. No action required. Confirm smoke still passes.

---

## Post-build
1. Run `node smoke.js index.html` — confirm 0 failures
2. Run `node field_unit.js` — confirm 0 failures
3. Bump SW_VERSION (index.html + sw.js must match)
4. Update HANDOFF.md
5. Push branch, report commit ledger

## Rules
- One commit per task
- Smoke must pass after each commit (0 failures)
- SW_VERSION format: `YYYY-MM-DD[letter]` in ET timezone
- Do NOT modify relay code (field-relay-nba)
- If a change would break an existing smoke assertion, fix the assertion in the same commit
- Keep old `--c-*` sport tokens as aliases — do not break existing CSS that references them
