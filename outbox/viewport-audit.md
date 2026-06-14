# Viewport v4 CSS Audit — index.html

**Date:** 2026-06-14 (revised)
**HEAD:** d68e4ae
**Spec:** `docs/VIEWPORT-V4-SPEC.md` — original 15-item checklist (lines 92-109) + expanded design system (lines 114-278)
**Total media queries:** ~80 in single `<style>` block (lines 22-3528)

## Summary

| Status | 15-item checklist | Design system (A–G) | Total |
|---|---|---|---|
| EXISTS | 7 | 0 | 7 |
| PARTIAL | 5 | 3 | 8 |
| MISSING | 1 | 4 | 5 |
| BROKEN | 2 | 0 | 2 |

**Headline:** Original viewport surface is mostly in place; design-system migration (semantic tokens, motion/opacity layers, typography roles, Circadian) is essentially un-started in code.

---

## Part 1 — Original 15-item checklist

### 1. All 11 breakpoint media queries present and non-overlapping
**Status:** BROKEN
**Evidence:** `index.html:475-478, 1156-1158, 3257, 3325, 3464`
**Gap:** CSS does NOT use the 11 spec breakpoints. Actual scheme: `max-width:375/420/430/480/600/640px`, `min-width:601/768/820/900/950/1180/1199/1200/1440/1600/1800px`. Many overlap (e.g. 768-900 with 820-1199; 601-900 with 820). D1/D2 cutoff at 1200-1439 honored (2318, 2506); D3/D4 at 1440+ exists (2342, 2532). No explicit P1/P2/P3 boundaries at 375/414/430 — only one shim at `max-width:375px` (3257) and `max-width:430px` (1156). Phone tiering mostly via `[data-phone-tier=…]` JS attribute (3396-3426), not media queries.

### 2. Card tiering CSS (featured vs standard vs compact)
**Status:** PARTIAL
**Evidence:** `index.html:772-776` (`.rn-card--compact`, `.rn-featured`), `4726-4791` (JS tiers)
**Gap:** Tiering exists for "Right Now" mini-cards only (rn-*). General `.game-card` has no featured/standard/compact CSS variants. No `.card-tier-featured` / `-standard` / `-compact` class system as spec implies.

### 3. CompactGrid implementation (2-col phone, 3-col laptop)
**Status:** PARTIAL
**Evidence:** `index.html:475-478, 3266-3268, 3406-3408`
**Gap:** 2-col at 1200+, 3-col at 1800+ (not 1440 as spec suggests). Phone 2-col only via phone-landscape-wide JS tier. No dedicated `.compact-grid` class — uses `.games-list` with `--cols` var.

### 4. Ambient panel visibility rules by viewport
**Status:** EXISTS
**Evidence:** `index.html:3027-3038, 2318-2324, 2342-2348`
**Gap:** T1/T2 (820-1199) always-on; D1/D3 hidden by default, shown only in `body.wf-mode`. Hidden in journalism-mode and wc-mode. Matches spec.

### 5. WHOLE FIELD toggle (ESSENTIALS vs WHOLE FIELD)
**Status:** EXISTS
**Evidence:** `index.html:2310-2387, 28570-28589, 4072`
**Gap:** None — toggle, `body.wf-mode` class, persistence, CENTRE column injection all present.

### 6. Filter bar scroll-snap on mobile
**Status:** EXISTS
**Evidence:** `index.html:3368-3374`
**Gap:** Applied globally rather than gated by mobile breakpoint, harmless on larger viewports.

### 7. Touch targets ≥44px on mobile
**Status:** PARTIAL
**Evidence:** `index.html:882, 2248, 3445`
**Gap:** Only attention chips, setup services, one sticky banner enforce 44px. `.filter-btn`, `.date-nav-btn`, `.share-btn`, drama-badge tap zones do not — many at .15-.4rem padding (3334: 32px date-nav-btn; 3387: .15rem watch-btn). Apple HIG floor breached for primary tap targets.

### 8. iOS safe-area (env(safe-area-inset-*))
**Status:** EXISTS
**Evidence:** `index.html:2106, 2257, 2294, 3469-3477`
**Gap:** Used in 5 places, syntactically valid. Bottom sheet (1011) and bottom-fixed attention bar (2245) correctly account for safe-area.

### 9. Sport stripe colors per league
**Status:** PARTIAL (downgraded from EXISTS — naming + hex divergence with COLOUR-SYS-A)
**Evidence:** `index.html:83-85` (tokens), `419-461` (per-sport selectors), `5127-5142` (raw-hex SPORT_COLORS dict)
```
--c-nba:#f97316;--c-nhl:#38bdf8;--c-mlb:#22c55e;
--c-soccer:#a3e635;--c-tennis:#facc15;
```
**Gap:** Tokens exist under non-spec names (`--c-nba` not `--sport-nba`). Only 8 sports; spec calls for 12 (MLS/EPL/NFL/F1/Champions League/WC absent as distinct tokens). `--c-nhl` (#38bdf8) ≠ spec `--sport-nhl` (#60a5fa). MLB matches. Sport stripe only on section headers, not card left border per design-system §F.

### 10. Typography: Chakra Petch and DM Sans only
**Status:** BROKEN (spec confirms SUPERSEDED — implementation hasn't caught up)
**Evidence:** `index.html:21, 86-89`
```
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:…&family=Barlow:…&family=Barlow+Condensed:…&family=JetBrains+Mono:…">
--ff-display:'Playfair Display',…; --ff-body:'Barlow',…; --ff-cond:'Barlow Condensed',…; --ff-mono:'JetBrains Mono',monospace;
```
**Gap:** Spec lines 218-224: *"Prior specs reference Playfair Display (headlines) and Barlow (verdict). These are SUPERSEDED."* Code ships the superseded fonts; zero matches for Chakra Petch or DM Sans anywhere.

### 11. Night Owl / Journal tab CSS
**Status:** EXISTS
**Evidence:** `index.html:1294-1373, 2097-2107`
**Gap:** Full Night Owl card system + journalism-mode viewport swap. Mobile (max-1199) full swap; desktop co-resident.

### 12. Bottom sheet CSS (phone only)
**Status:** PARTIAL
**Evidence:** `index.html:1009-1024, 2609-2615`
**Gap:** Styles exist but no `@media` gate — visually shown at all viewports. Spec routes T1+ to ambient-panel / inline expand. No CSS rule hides `.bottom-sheet` at T1+.

### 13. WC-specific styles (group tables, bracket, advancement)
**Status:** EXISTS
**Evidence:** `index.html:164-183, 2110-2298, 2127-2204, 2389-2533, 2181-2192`
**Gap:** Group tables, advancement bars, R32 matchup cards, bracket tree gated to ≥1180px. Sub-tabs, traps, projections all styled.

### 14. Journalism inline brief CSS by card tier
**Status:** PARTIAL
**Evidence:** `index.html:1143, 1384-1396, 3168-3180`
**Gap:** Two-tier brief (mobile hidden, desktop full) but no MID (2-line) intermediate per spec (P3-L2 should be 2 lines). featured/standard/compact tier classes don't gate brief CSS.

### 15. Live WP bar + attention bar
**Status:** EXISTS
**Evidence:** `index.html:2218, 2236-2260`
**Gap:** Live WP bar (3 segments), confidence states, attention bar with scroll-snap, urgency-high/med/low chip variants, safe-area bottom padding, comeback badge. Complete.

---

## Part 2 — Design system sections (A–G, from expanded spec)

### A. COLOUR-SYS-A semantic tokens (spec lines 116-181)
**Status:** PARTIAL — only 6 of ~36 spec tokens defined; sport identity uses different naming; angles/access/drama tokens entirely missing.

**Defined (6/36):** `--obsidian` (#070710 ✓), `--card` (#121224 ✓), `--edge` (#ffffff0f ✓), `--gold` (#c9a84c ✓), `--smoke` (#6a6a8a ✓), `--white` (#f2f2fa ✓). All hex match.

**Missing (30):**
- Foundation: `--card-highlight` (zero matches). Existing `--card2:#181830` matches the spec's value under a non-semantic name.
- Drama: `--drama-must`, `--drama-watch`, `--drama-low` — zero matches.
- Access: `--access-free`, `--access-trial` — zero matches.
- Angles (10): `--angle-comeback`, `--angle-upset`, `--angle-gem`, `--angle-hype`, `--angle-elim`, `--angle-deciding`, `--angle-standard`, `--angle-quiet`, `--angle-rivalry`, `--angle-series-lead` — zero matches.
- Sport tokens (12): `--sport-*` family — zero matches under spec name.

**BROKEN — `--caution` used but never defined:** `index.html:13343` references `var(--caution)` but the token is never declared in `:root`. Silently resolves to nothing.

**Naming drift:** Code uses `--c-nba`, `--c-nhl`, `--c-mlb`, `--c-soccer`, `--c-tennis`, `--c-cricket`, `--c-afl`, `--c-rugby` (lines 83-85). 8 sports vs spec's 12.

**Raw hex in JS/inline (spec line 118 forbids):**
- `SPORT_COLORS = { "NBA Playoffs": "#f97316", "NHL Playoffs": "#38bdf8", … }` at `index.html:5127-5142` — 16-key dictionary of raw hex.
- 36 inline `style="…#hex…"` occurrences, 131 quoted-string hex literals in JS overall.
- Examples: `index.html:9617` `const sportColor=SPORT_COLORS[sec.sport]||"#c9a84c";`, `28766` `border-left:3px solid var(--c-nba,#f97316)`.

### B. SEMANTICS-SYS-A vocabulary (MUST / WATCH / DISCOVERY / CAUTION / QUIET)
**Status:** PARTIAL via a different (smaller) vocabulary.
**Evidence:** `index.html:1161-1163`
```
.skim-strip[data-urgency="must"]{border-left:3px solid var(--gold2);}
.skim-strip[data-urgency="watch"]{border-left:3px solid #4a9eff;}
.skim-strip[data-urgency="quiet"]{border-left:3px solid var(--smoke);}
```
**Gap:** Colors approximate spec (gold/blue/smoke), but **borders are 3px, spec demands 4px for MUST/WATCH**. No DISCOVERY or CAUTION variants. No `.drama-must`, `.drama-watch`, `.discovery` classes anywhere. No opacity (1/1/1/1/0.6) or motion contracts wired to these states. `--quietHour` (17412) is unrelated (audio mute).

### C. Motion tokens (spec lines 199-204)
**Status:** MISSING
**Gap:** Zero matches for `--motion-instant`, `--motion-urgent`, `--motion-deliberate`, `--motion-ambient`. Transitions are scattered bare durations across CSS — `index.html:146` `transition:all .2s` and ~39 similar — not gated by tokens.

### D. Opacity tokens (spec lines 207-211)
**Status:** MISSING
**Gap:** Zero matches for `--opacity-live`, `--opacity-seen`, `--opacity-trace`, `--opacity-gone`. Opacity set via raw values throughout (line 98 `opacity:.4`, 1344 `.night-owl-meta-sep{opacity:.4}`).

### E. Typography roles (spec lines 227-232)
**Status:** MISSING
**Gap:** Zero matches for `--type-verdict`, `--type-headline`, `--type-data`, `--type-label`, `--type-chip`, `--type-context`. Font roles exist under different names (`--ff-display`, `--ff-body`, `--ff-cond`, `--ff-mono` at 86-89) but role-abstraction layer (verdict/headline/data/label/chip/context) not introduced. Compounds with item #10 — fonts themselves are also wrong.

### F. Border treatment (spec lines 236-248)
**Status:** PARTIAL — tier collapse.
**Evidence:** searches across all `border-left:` declarations
**Gap:**
- **4px primary editorial: ABSENT.** Zero `border-left: 4px` matches anywhere.
- **3px is de-facto primary:** skim-strip (1161-63), scout-pick (1216), sport section heads (9674), desk-card types (2027-31), sport game briefs (3483-84).
- **2px:** used for tertiary accents (gold left rules at 658/1523/2057/2148).
- **1px:** structural as spec'd.
- **Compound (sport + drama):** NOT implemented. No `.game-card.drama-must` class; no `box-shadow: inset 2px 0 0 var(--drama-must)` over sport border.
- Net effect: primary editorial (4px) and compound drama-inset (2px shadow) both missing; everything renders at 3px.

### G. Circadian Layout C1-C5 (spec lines 273-278)
**Status:** MISSING (raw materials present, no integration).
- **C1 (night by local time):** No `body.night-mode` toggle, no `night-mode` class. Local-hour reads exist at 5 sites (11450, 11471, 24730, 33180, 34677, 35014) but feed SMT phase / timestamp swaps, not theme switching.
- **C2 (post-midnight Night Owl):** `#night-owl` panel exists (1294-1376, 3500-3502) but is a persistent recap panel, not a midnight-triggered layout shift.
- **C3 (morning "What happened"):** No morning-specific recap layout. `getCurrentSMTPhase()` returns 'morning' but consumed for media-card sorting only.
- **C4 (afternoon pre-game):** Same — phase 'afternoon' exists for SMT sorting, no afternoon-specific layout.
- **C5 (300-weight in night mode):** Zero `font-weight:300` declarations.

---

## Breakpoint coverage map (from Part 1, retained)

| Spec ID | Spec range | Found in CSS | Status |
|---|---|---|---|
| P1 | <375px | `index.html:3257` `@media(max-width:375px)` | PARTIAL (off by 1) |
| P2 | 375-413px | covered by generic `max-width:600px` (3377) | MISSING explicit |
| P3 | 414-430px | `index.html:1156` `(max-width:430px)`, `3464` `(max-width:480px)` | PARTIAL |
| L1 | <700px landscape | `index.html:782` `(orientation:landscape) and (max-width:699px)` | EXISTS |
| L2 | 700-819px landscape | `index.html:786` | EXISTS |
| T1 | 820-1199 portrait | `index.html:3037` — no orientation gate | PARTIAL |
| T2 | 820-1199 landscape | `index.html:2399` `(min-width:1180px)` bracket tree | PARTIAL |
| D1 | 1200-1439 | `index.html:2318, 2506` | EXISTS |
| D2 | 1200-1439 + wf | `index.html:2318` (gated by `body.wf-mode`) | EXISTS |
| D3 | 1440-1919 | `index.html:2342, 2532` `(min-width:1440px)` | PARTIAL (no upper bound) |
| D4 | 1440+ + wf | `index.html:2342` (gated by `body.wf-mode`) | EXISTS |
| W1 | any | `.wc-bars`, `.wc-bar-wp`, `.wc-bar-adv` (164-183) | EXISTS |

**Overlaps:** 768-900 / 820-1199, 601-900 / 820+, 950-1199 sub-bucket of T1, 1180+ straddling T2/D1.

---

## Consolidated remediation order

**Tier A — broken, fix first:**
1. **Define `--caution`** in `:root` — currently used at `index.html:13343` but undefined → broken style on the live site.
2. **Typography migration** — load Chakra Petch + DM Sans, retire Playfair / Barlow / Barlow Condensed / JetBrains Mono (per spec lines 218-224 SUPERSEDED note).
3. **Gate `.bottom-sheet { display:none }` above 820px** so tablet/desktop routes through ambient panel / inline expand per spec.

**Tier B — design-system foundation:**
4. Add the 30 missing COLOUR-SYS-A tokens to `:root` (10 angles + 3 drama + 2 access + 12 sport names + `--card-highlight`).
5. Refactor `SPORT_COLORS` dict (5127-5142) and the 36 inline-hex sites to consume the new tokens — eliminates "no raw hex" violation in one pass.
6. Fix `--c-nhl` hex (#38bdf8 → #60a5fa) and add MLS/EPL/NFL/F1/Champions League/WC.
7. Add `--motion-{instant,urgent,deliberate,ambient}` and `--opacity-{live,seen,trace,gone}` tokens; migrate bare `transition:.2s` and `opacity:.4` sites.
8. Add `--type-{verdict,headline,data,label,chip,context}` roles bound to Chakra Petch / DM Sans.
9. Promote skim-strip urgency to full SEMANTICS-SYS-A class set: `.must` / `.watch` / `.discovery` / `.caution` / `.quiet` with the 4/4/4/3/1px borders and 1/1/1/1/0.6 opacity.
10. Implement compound border: `.game-card { border-left: 3px solid var(--sport-…); }` + `.game-card.drama-must { box-shadow: inset 2px 0 0 var(--drama-must); }`.

**Tier C — viewport + Circadian:**
11. Add explicit P1/P2/P3 breakpoints at 375 / 414 / 430 (move from `[data-phone-tier]` JS to pure CSS or maintain both).
12. Add orientation gates for T1 vs T2.
13. Add `.card-brief-inline-text` MID (2-line) tier at 414-819 per spec.
14. Cap D3 at 1919 (or accept D3/D4 as ≥1440 by design).
15. Enforce 44px min on `.filter-btn`, `.date-nav-btn`, `.share-btn`, `.watch-btn`, drama-badge tap zones.
16. Introduce `.card-tier-{featured,standard,compact}` classes on `.game-card` so per-tier brief surfacing is CSS-addressable.
17. Circadian C1: `body.night-mode` toggle driven by local hour (centralize existing `getHours()` reads).
18. C2-C4: Three layout variants gated by phase (Night Owl after midnight; recap before noon; pre-game afternoon).
19. C5: `body.night-mode { font-weight: 300 }` cascade rule.
