# Viewport v4 CSS Audit — index.html

**Date:** 2026-06-14 (revised — single source of truth)
**HEAD:** 3d7a772
**Spec:** `docs/VIEWPORT-V4-SPEC.md`
**Authoritative scope:** the 15-item CSS Audit Checklist at spec lines 92-109. The COLOUR-SYS-A, SEMANTICS-SYS-A, Typography, Border Treatment, and Circadian Layout sections (lines 114-278) are **context** that informs how each checklist item is assessed; they are not themselves separate audit categories. Where any external referenced document conflicts with the v4 spec, the v4 spec wins.

**Total media queries:** ~80 in single `<style>` block (lines 22-3528).

## Summary

| Status | Count |
|---|---|
| EXISTS | 7 |
| PARTIAL | 5 |
| MISSING | 1 |
| BROKEN | 2 |

---

## Per-checklist findings

### 1. All 11 breakpoint media queries present and non-overlapping
**Status:** BROKEN
**Evidence:** `index.html:475-478, 1156-1158, 3257, 3325, 3464`
**Gap:** CSS does NOT use the 11 spec breakpoints. Actual scheme: `max-width:375 / 420 / 430 / 480 / 600 / 640px`, `min-width:601 / 768 / 820 / 900 / 950 / 1180 / 1199 / 1200 / 1440 / 1600 / 1800px`. Many overlap. D1/D2 cutoff at 1200-1439 honored (2318, 2506); D3/D4 at 1440+ exists (2342, 2532). No explicit P1/P2/P3 boundaries at 375 / 414 / 430 — only one shim at `max-width:375px` (3257) and `max-width:430px` (1156). Phone tiering mostly via `[data-phone-tier=…]` JS attribute (3396-3426), not media queries.

**Breakpoint coverage map:**

| Spec ID | Range | Found | Status |
|---|---|---|---|
| P1 | <375px | `index.html:3257 @media(max-width:375px)` | PARTIAL (off by 1) |
| P2 | 375-413px | covered by generic `max-width:600px` (3377) | MISSING explicit |
| P3 | 414-430px | `index.html:1156 (max-width:430px)`, `3464 (max-width:480px)` | PARTIAL |
| L1 | <700px landscape | `index.html:782 (orientation:landscape) and (max-width:699px)` | EXISTS |
| L2 | 700-819px landscape | `index.html:786` | EXISTS |
| T1 | 820-1199 portrait | `index.html:3037` — no orientation gate | PARTIAL |
| T2 | 820-1199 landscape | `index.html:2399 (min-width:1180px)` bracket tree | PARTIAL |
| D1 | 1200-1439 | `index.html:2318, 2506` | EXISTS |
| D2 | 1200-1439 + wf | `index.html:2318` (gated by `body.wf-mode`) | EXISTS |
| D3 | 1440-1919 | `index.html:2342, 2532 (min-width:1440px)` | PARTIAL (no upper bound) |
| D4 | 1440+ + wf | `index.html:2342` (gated by `body.wf-mode`) | EXISTS |
| W1 | any | `.wc-bars`, `.wc-bar-wp`, `.wc-bar-adv` (164-183) | EXISTS |

**Overlaps:** 768-900 ↔ 820-1199; 601-900 ↔ 820+; 950-1199 ⊂ T1; 1180+ straddles T2/D1.

### 2. Card tiering CSS (featured vs standard vs compact)
**Status:** PARTIAL
**Evidence:** `index.html:772-776` (`.rn-card--compact`, `.rn-featured`), `4726-4791` (JS tiers: condensed/standard/compact)
**Gap:** Tiering exists for "Right Now" mini-cards only (`rn-*`). General `.game-card` has no featured/standard/compact CSS variants. Tier classes computed in JS but applied only to RN. No `.card-tier-featured` / `-standard` / `-compact` class system on `.game-card` as the spec's Two-Target Interaction Architecture (lines 62-73) and Journalism Surfacing (75-86) both rely on.

### 3. CompactGrid implementation (2-col phone, 3-col laptop)
**Status:** PARTIAL
**Evidence:** `index.html:475-478, 3266-3268, 3406-3408`
```
@media(min-width:1200px){.games-list{grid-template-columns:repeat(2,minmax(320px,1fr));...}}
@media(min-width:1800px){.games-list{grid-template-columns:repeat(3,minmax(360px,1fr));...}}
[data-phone-tier="phone-landscape-wide"] .sport-section-games{display:grid;grid-template-columns:1fr 1fr;...}
```
**Gap:** 2-col at 1200+, 3-col at 1800+ (not 1440 as spec breakpoints suggest). Phone 2-col only via phone-landscape-wide JS tier, not portrait. No dedicated `.compact-grid` class — uses `.games-list` with `--cols` var.

### 4. Ambient panel visibility rules by viewport
**Status:** EXISTS
**Evidence:** `index.html:3027-3038, 2318-2324, 2342-2348`
```
#ambient-panel{display:none;...}
@media(min-width:820px) and (max-width:1199px){#ambient-panel{display:flex;...}}
@media(min-width:1200px) and (max-width:1439px){body.wf-mode #ambient-panel{display:flex !important;...}}
@media(min-width:1440px){body.wf-mode #ambient-panel{display:flex !important;...}}
```
**Gap:** T1/T2 (820-1199) always-on; D1/D3 hidden by default, shown only in `body.wf-mode`. Hidden in journalism-mode and wc-mode. Matches spec.

### 5. WHOLE FIELD toggle (ESSENTIALS vs WHOLE FIELD)
**Status:** EXISTS
**Evidence:** `index.html:2310-2387, 28570-28589, 4072`
```
#wf-toggle{display:none;...} @media(min-width:1200px){#wf-toggle{display:inline-flex;...}}
@media(min-width:1440px){body.wf-mode #ambient-panel{...} body.wf-mode #field-desk-section,...{display:block;margin-right:390px}}
```
**Gap:** None — toggle button, `body.wf-mode` class, persistence, CENTRE column injection all present.

### 6. Filter bar scroll-snap on mobile
**Status:** EXISTS
**Evidence:** `index.html:3368-3374`
```
.filter-bar{-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;scrollbar-width:none;}
.filter-btn{ scroll-snap-align:start; }
```
**Gap:** Applied globally rather than gated by mobile breakpoint, but harmless on larger viewports.

### 7. Touch targets ≥44px on mobile
**Status:** PARTIAL
**Evidence:** `index.html:882, 2248, 3445`
```
.attn-chip{...min-height:44px;min-width:140px;...}
.setup-svc{...min-height:44px;...}
```
**Gap:** Only attention chips, setup services, and one sticky banner enforce 44px. `.filter-btn`, `.date-nav-btn`, `.share-btn`, drama-badge tap zones do not — many at `.15-.4rem` padding (3334: 32px date-nav-btn; 3387: .15rem watch-btn). Apple HIG floor breached for primary tap targets.

### 8. iOS safe-area (env(safe-area-inset-*))
**Status:** EXISTS
**Evidence:** `index.html:2106, 2257, 2294, 3469-3477`
```
@supports(padding:max(0px)){
  .masthead{padding-left:max(1rem, env(safe-area-inset-left));...}
  #pwa-banner{padding-bottom:max(.85rem, env(safe-area-inset-bottom));}
}
#field-attention-bar{padding-bottom:calc(6px + env(safe-area-inset-bottom,0px))}
```
**Gap:** Used in 5 places, syntactically valid. Bottom sheet (1011) and bottom-fixed attention bar (2245) correctly account for safe-area.

### 9. Sport stripe colors per league
**Status:** PARTIAL
**Evidence:** `index.html:83-85` (tokens), `419-461` (per-sport selectors), `5127-5142` (raw-hex `SPORT_COLORS` dict)
```
--c-nba:#f97316;--c-nhl:#38bdf8;--c-mlb:#22c55e;
--c-soccer:#a3e635;--c-tennis:#facc15;--c-cricket:#fb923c;--c-afl:#e879f9;--c-rugby:#34d399;
```
**Gap:** Eight sport tokens defined under `--c-*` naming; the spec's COLOUR-SYS-A context (lines 163-172) names them `--sport-*` and lists 12 sports (adds MLS, EPL distinct from generic soccer, NFL, F1, Champions League, WC). One hex mismatch: `--c-nhl` (`#38bdf8`) vs spec `--sport-nhl` (`#60a5fa`). Sport stripe renders only on section headers, not on card left border per spec border-treatment context (lines 236-248). Also: `SPORT_COLORS` JS dict at `5127-5142` is raw hex literals, violating the spec context's "no raw hex in JS or inline styles" rule (line 118).

### 10. Typography: Chakra Petch and DM Sans only
**Status:** BROKEN
**Evidence:** `index.html:21, 86-89`
```
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:…&family=Barlow:…&family=Barlow+Condensed:…&family=JetBrains+Mono:…">
--ff-display:'Playfair Display',…; --ff-body:'Barlow',…; --ff-cond:'Barlow Condensed',…; --ff-mono:'JetBrains Mono',monospace;
```
**Gap:** Spec lines 218-224 are explicit: *"Prior specs reference Playfair Display (headlines) and Barlow (verdict). These are SUPERSEDED. Audit against Chakra Petch + DM Sans only."* Code ships the superseded fonts; zero matches for `Chakra Petch` or `DM Sans` anywhere in the file.

### 11. Night Owl / Journal tab CSS
**Status:** EXISTS
**Evidence:** `index.html:1294-1373, 2097-2107`
```
#night-owl{padding:.5rem 1rem .25rem;max-width:1200px;...}
.night-owl-card{...} .night-owl-text.pending{...}
body.journalism-mode .main,...#ambient-panel{display:none !important}
```
**Gap:** Full Night Owl card system (card, winner, score, meta, expand-hint, pending/loaded states) + journalism-mode viewport swap. Mobile (max-1199) full swap; desktop co-resident. Matches spec's Journalism Surfacing #5 (lines 82-83 / 259-260).

### 12. Bottom sheet CSS (phone only)
**Status:** PARTIAL
**Evidence:** `index.html:1009-1024, 2609-2615`
```
.bottom-sheet{position:fixed;bottom:0;...transform:translateY(100%);transition:...;max-height:88vh;...}
.bottom-sheet.open{transform:translateY(0)}
.bs-handle-row{position:sticky;top:0;...touch-action:none;cursor:grab;...}
```
**Gap:** Styles exist but no `@media` gate — visually shown at all viewports. Spec lines 68-73 route the destination surface by viewport: P1-P3 / L1-L2 → bottom sheet, T1/T2 → ambient panel, D1-D4 → inline/RIGHT/CENTRE. No CSS rule hides `.bottom-sheet` at T1+, so it can fire on iPad/desktop where the spec routes to a different surface.

### 13. WC-specific styles (group tables, bracket, advancement)
**Status:** EXISTS
**Evidence:** `index.html:164-183, 2110-2298, 2127-2204, 2389-2533, 2181-2192`
```
.wc-bars{...} .wc-bar-wp{...} .wc-bar-adv{...}
.wc-groups{display:grid;grid-template-columns:1fr;gap:1rem}
@media(min-width:1180px){...} /* bracket tree shown */
.wc-r32-grid{display:grid;...} @media(min-width:560px){...} @media(min-width:900px){...}
```
**Gap:** Group tables, advancement bars (the W1 spec surface), R32 matchup cards, bracket tree gated to ≥1180px. Sub-tabs, traps, projections all styled. Spec's Projections surface (line 39) for BracketMini on phone is represented in the WC views.

### 14. Journalism inline brief CSS by card tier
**Status:** PARTIAL
**Evidence:** `index.html:1143, 1384-1396, 3168-3180`
```
.card-drama-line{font-size:.62rem;...max-height:1.5em} /* 1 line — TIGHT */
.card-brief-row{...} @media(max-width:600px){.card-brief-row{display:none !important}}
.card-brief-inline-text{...-webkit-line-clamp:3;...max-height:calc(1.55em * 3)}
@media(min-width:601px){.card-brief-inline-text{-webkit-line-clamp:unset;display:block;overflow:visible}}
```
**Gap:** Two-tier brief (mobile hidden, desktop full) but no **MID (2-line) intermediate** per spec lines 78 / 255 (P3-L2 should be 2 lines). featured/standard/compact tier classes don't gate brief CSS, so item #2's tiering gap propagates here.

### 15. Live WP bar + attention bar
**Status:** EXISTS
**Evidence:** `index.html:2218, 2236-2260`
```
.wc-wp-bar{display:flex;width:100%;height:22px;...}
.live-wp-bar{display:flex;width:100%;height:20px;border-radius:4px;...transition:all .3s ease}
.live-wp-bar[data-confidence="low"]{opacity:.7;border:1px dashed rgba(251,191,36,.3)}
#field-attention-bar{position:fixed;bottom:0;left:0;right:0;z-index:200;...}
.attn-chip{...min-height:44px;...scroll-snap-align:start}
@media(max-width:600px){.attn-chip{min-width:120px;max-width:180px;...}}
```
**Gap:** Live WP bar (3 segments), confidence states, attention bar with scroll-snap, urgency-high/med/low chip variants, safe-area bottom padding, comeback badge. Complete.

---

## Observations beyond the explicit checklist

These are real concerns the spec's context sections call out, but they are not items #1-#15 themselves. Flagged for awareness; deciding whether to act is product-level.

- **`--caution` referenced but undefined.** `index.html:13343` uses `var(--caution)` with no fallback; the token is never declared in `:root`. Silently resolves to nothing, so the styled element is missing its intended color. Spec context (line 160) defines `--caution: #f59e0b`. This is a live broken style.
- **`--card-highlight` token exists under a non-spec name.** Code has `--card2:#181830` (matches spec hex). Pure naming alignment, not a behavioral bug.
- **Spec context tokens absent in `:root`:** drama (`--drama-must/watch/low`), access (`--access-free/trial`), 10 angles (`--angle-*`), motion (`--motion-*`), opacity (`--opacity-*`), typography roles (`--type-*`). None of these are required by the 15-item checklist, but their absence means future work that wants to reference the spec's semantic vocabulary has no token foundation to build on.
- **Border treatment context (lines 236-248):** spec describes a 4px primary editorial / 3px sport-identity / 2px compound inset / 1px structural ladder. Code de-facto renders everything at 3px (no 4px `border-left` anywhere; no compound `.game-card.drama-must { box-shadow: inset 2px 0 0 … }`). Touches the visual hierarchy but is not a checklist item.
- **Circadian Layout (lines 271-278):** C1-C5 describe night-mode / morning recap / afternoon pre-game / 300-weight cascade. None implemented in code (raw `getHours()` reads exist for SMT phase but feed sorting, not theme). Not a checklist item; flagged because the spec spends a section on it.

---

## Remediation order (15-item checklist)

**Tier A — broken, fix first:**
1. **Item #10 — Typography migration.** Replace Playfair Display + Barlow + Barlow Condensed + JetBrains Mono with Chakra Petch + DM Sans per spec lines 218-224. Update `<link>` (21) and the four `--ff-*` tokens (86-89).
2. **Item #1 — Breakpoint scheme alignment.** The 600/820/1200/1440/1800 scheme doesn't map to the 11-bucket spec model. Either (a) introduce explicit P1/P2/P3 (375/414/430) and orientation-gated T1/T2 boundaries, or (b) update the spec to ratify the current scheme. Either path is needed because the current state is BROKEN against the spec as written.

**Tier B — missing / high impact:**
3. **Item #12 — Bottom sheet viewport gate.** Add `@media(min-width:820px){.bottom-sheet{display:none}}` so tablet/desktop routes through ambient panel / inline expand per spec lines 68-73. One-line change.
4. **Item #2 — `.card-tier-{featured,standard,compact}` classes on `.game-card`.** Required scaffold for items #14 and the Two-Target Interaction Architecture (lines 62-73).
5. **Item #14 — MID (2-line) brief tier** at 414-819 per spec lines 78 / 255. Depends on item #2's tier classes.
6. **Item #9 — Sport stripe alignment.** Either rename `--c-*` → `--sport-*` and fix the NHL hex (`#38bdf8` → `#60a5fa`), add missing MLS/EPL/NFL/F1/Champions-League/WC tokens, and refactor `SPORT_COLORS` (5127-5142) + 36 inline-hex sites to consume them; OR keep current naming and update the spec context. The hex mismatch is the only behavior bug — naming is cosmetic.

**Tier C — cleanup:**
7. **Item #3 — CompactGrid:** confirm 3-col at 1440 (or accept current 1800+). Phone 2-col at portrait if desired.
8. **Item #7 — Touch targets.** Enforce 44px min on `.filter-btn`, `.date-nav-btn`, `.share-btn`, `.watch-btn`, drama-badge tap zones. ~5 selectors.
9. **Item #1 — Resolve 768-900 / 820-1199 overlap, cap D3 at 1919.**

---

## What changed from v2 → v3

v2 added a "Part 2 — Design system A-G" that audited COLOUR-SYS-A, SEMANTICS-SYS-A, motion, opacity, typography roles, border treatment, and Circadian Layout as separate categories with their own EXISTS/PARTIAL/MISSING/BROKEN counts. v3 strips that. The 15-item checklist (spec lines 92-109) is the authoritative scope; spec sections 114-278 are context that informs how each checklist item is assessed. Concerns from the context sections that are genuinely worth flagging (e.g. undefined `--caution`) move into a brief "Observations beyond the checklist" section so they're visible without being conflated with the audit.

Counts changed from v2 (7/8/5/2) to v3 (7/5/1/2) by removing the A-G categories. The 15-item findings themselves are unchanged.
