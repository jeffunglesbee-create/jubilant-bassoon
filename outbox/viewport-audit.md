# Viewport v4 CSS Audit — index.html

**Date:** 2026-06-14
**HEAD:** 66f23e1
**Spec:** `docs/VIEWPORT-V4-SPEC.md` (checklist at lines 92-109)
**Total media queries found:** ~80 in single `<style>` block (lines 22-3528)

## Summary

| Status | Count |
|---|---|
| EXISTS | 8 |
| PARTIAL | 5 |
| MISSING | 1 |
| BROKEN | 1 |

---

## Per-item findings

### 1. All 11 breakpoint media queries present and non-overlapping
**Status:** BROKEN
**Evidence:** `index.html:475-478, 1156-1158, 3257, 3325, 3464`
**Gap:** CSS does NOT use the 11 spec breakpoints. Actual scheme: `max-width:375/420/430/480/600/640px`, `min-width:601/768/820/900/950/1180/1199/1200/1440/1600/1800px`. Many overlap (e.g. 768-900 with 820-1199; 601-900 with 820). Spec D1/D2 cutoff at 1200-1439 honored (2318, 2506); D3/D4 at 1440+ exists (2342, 2532). No explicit P1/P2/P3 boundaries at 375/414/430 — only one shim at `max-width:375px` (3257) and `max-width:430px` (1156). Phone tiering mostly handled via `[data-phone-tier=…]` JS attribute (3396-3426), not media queries.

### 2. Card tiering CSS (featured vs standard vs compact)
**Status:** PARTIAL
**Evidence:** `index.html:772-776` (`.rn-card--compact`, `.rn-featured`), `4726-4791` (JS tiers: condensed/standard/compact)
```
.rn-card--compact{padding:.3rem .6rem;...}
.game-card.rn-featured{opacity:.65;}
```
**Gap:** Tiering exists for the "Right Now" mini-cards only (rn-*). General `.game-card` has no featured/standard/compact CSS variants. Tier classes computed in JS (4784) but applied only to RN. No `.card-tier-featured` / `-standard` / `-compact` class system as spec implies.

### 3. CompactGrid implementation (2-col phone, 3-col laptop)
**Status:** PARTIAL
**Evidence:** `index.html:475-478, 3266-3268, 3312-3313, 3406-3408`
```
@media(min-width:1200px){.games-list{grid-template-columns:repeat(2,minmax(320px,1fr));...}}
@media(min-width:1800px){.games-list{grid-template-columns:repeat(3,minmax(360px,1fr));...}}
[data-phone-tier="phone-landscape-wide"] .sport-section-games{display:grid;grid-template-columns:1fr 1fr;...}
```
**Gap:** 2-col at 1200+, 3-col at 1800+ (not 1440 as spec suggests). Phone 2-col only via phone-landscape-wide JS tier, not portrait. No dedicated `.compact-grid` class — uses `.games-list` with `--cols` var.

### 4. Ambient panel visibility rules by viewport
**Status:** EXISTS
**Evidence:** `index.html:3027-3038, 2318-2324, 2342-2348, 2103, 2281`
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
**Gap:** Only attention chips, setup services, and one sticky banner enforce 44px. `.filter-btn`, `.date-nav-btn`, `.share-btn`, drama-badge tap zones do not — many at .15-.4rem padding (3334: 32px date-nav-btn, 3387: .15rem watch-btn). Apple HIG floor breached for primary tap targets.

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
**Status:** EXISTS
**Evidence:** `index.html:83-85` (tokens), `419-461` (per-sport selectors)
```
--c-nba:#f97316;--c-nhl:#38bdf8;--c-mlb:#22c55e;
--c-soccer:#a3e635;--c-tennis:#facc15;
.sport-section[data-sport="NBA Playoffs"] .section-head::after{background:var(--c-nba)}
```
**Gap:** 17+ sports covered. Section-head bar acts as stripe; no `.sport-stripe` element on cards themselves — only on section headers.

### 10. Typography: Chakra Petch and DM Sans only
**Status:** BROKEN
**Evidence:** `index.html:21, 86-89`
```
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:...&family=Barlow:...&family=Barlow+Condensed:...&family=JetBrains+Mono:..." rel="stylesheet"/>
--ff-display:'Playfair Display',...; --ff-body:'Barlow',...; --ff-cond:'Barlow Condensed',...; --ff-mono:'JetBrains Mono',monospace;
```
**Gap:** Spec says Chakra Petch + DM Sans ONLY. Actual: Playfair Display + Barlow + Barlow Condensed + JetBrains Mono. Zero instances of Chakra Petch or DM Sans. Either spec is stale or implementation diverged intentionally — needs product decision.

### 11. Night Owl / Journal tab CSS
**Status:** EXISTS
**Evidence:** `index.html:1294-1373, 2097-2107`
```
#night-owl{padding:.5rem 1rem .25rem;max-width:1200px;...}
.night-owl-card{...} .night-owl-text.pending{...}
body.journalism-mode .main,...#ambient-panel{display:none !important}
```
**Gap:** Full Night Owl card system (card, winner, score, meta, expand-hint, pending/loaded states) + journalism-mode viewport swap. Mobile (max-1199) full swap; desktop co-resident.

### 12. Bottom sheet CSS (phone only)
**Status:** PARTIAL
**Evidence:** `index.html:1009-1024, 2609-2615`
```
.bottom-sheet{position:fixed;bottom:0;...transform:translateY(100%);transition:...;max-height:88vh;...}
.bottom-sheet.open{transform:translateY(0)}
.bs-handle-row{position:sticky;top:0;...touch-action:none;cursor:grab;...}
```
**Gap:** Bottom sheet styles exist but with no `@media` gate — visually shown at all viewports. Spec says phone+L1/L2 only; tablet/desktop should use ambient-panel injection / inline expand. No CSS rule hides `.bottom-sheet` at T1+.

### 13. WC-specific styles (group tables, bracket, advancement)
**Status:** EXISTS
**Evidence:** `index.html:164-183` (advancement bars), `2110-2298` (mode), `2127-2204` (groups/table), `2389-2533` (bracket tree), `2181-2192` (R32 cards)
```
.wc-bars{...} .wc-bar-wp{...} .wc-bar-adv{...}
.wc-groups{display:grid;grid-template-columns:1fr;gap:1rem}
@media(min-width:1180px){...} /* bracket tree shown */
.wc-r32-grid{display:grid;...} @media(min-width:560px){...} @media(min-width:900px){...}
```
**Gap:** Group tables, advancement bars (W1 spec surface), R32 matchup cards, bracket tree gated to ≥1180px. Sub-tabs, traps, projections all styled.

### 14. Journalism inline brief CSS by card tier
**Status:** PARTIAL
**Evidence:** `index.html:1143, 1384-1396, 3168-3180`
```
.card-drama-line{font-size:.62rem;...max-height:1.5em} /* 1 line — TIGHT */
.card-brief-row{...} @media(max-width:600px){.card-brief-row{display:none !important}}
.card-brief-inline-text{...-webkit-line-clamp:3;...max-height:calc(1.55em * 3)}
@media(min-width:601px){.card-brief-inline-text{-webkit-line-clamp:unset;display:block;overflow:visible}}
```
**Gap:** Two-tier brief (mobile hidden, desktop full) but no MID (2-line) intermediate per spec (P3-L2 should be 2 lines). featured/standard/compact tier classes don't gate brief CSS.

### 15. Live WP bar + attention bar (new, shipped today)
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

## Breakpoint coverage map

| Spec ID | Spec range | Found in CSS | Status |
|---|---|---|---|
| P1 | <375px | `index.html:3257` `@media(max-width:375px)` | PARTIAL (boundary off by 1) |
| P2 | 375-413px | none distinct; covered by generic `max-width:600px` (3377) | MISSING explicit |
| P3 | 414-430px | `index.html:1156` `@media(max-width:430px)`, `3464` `(max-width:480px)` | PARTIAL |
| L1 | <700px landscape | `index.html:782` `(orientation:landscape) and (max-width:699px)` | EXISTS |
| L2 | 700-819px landscape | `index.html:786` `(orientation:landscape) and (min-width:700px) and (max-width:819px)` | EXISTS |
| T1 | 820-1199 portrait | `index.html:3037` `(min-width:820px) and (max-width:1199px)` — no orientation gate | PARTIAL (no portrait gate) |
| T2 | 820-1199 landscape | `index.html:2399` `(min-width:1180px)` bracket tree | PARTIAL (no orientation gate) |
| D1 | 1200-1439 | `index.html:2318, 2506` `(min-width:1200px) and (max-width:1439px)` | EXISTS |
| D2 | 1200-1439 + wf | `index.html:2318` (gated by `body.wf-mode`) | EXISTS |
| D3 | 1440-1919 | `index.html:2342, 2532` `(min-width:1440px)` | PARTIAL (no upper bound; spans into D4) |
| D4 | 1440+ + wf | `index.html:2342` (gated by `body.wf-mode`) | EXISTS |
| W1 | any | `.wc-bars`, `.wc-bar-wp`, `.wc-bar-adv` (164-183) | EXISTS |

**Overlaps flagged:**
- `(min-width:768px) and (max-width:900px)` (3021) overlaps T1's 820-1199
- `(min-width:601px) and (max-width:900px)` (3004) overlaps T1
- `(min-width:950px) and (max-width:1199px)` (3075) is a sub-bucket of T1 (intentional 2-col override)
- `(min-width:1180px)` (2399) straddles T2/D1 boundary

---

## Notable broken patterns

1. **Typography token mismatch** (#10) — spec demands Chakra Petch + DM Sans; code ships Playfair + Barlow. Largest single divergence.
2. **Bottom sheet not viewport-gated** (#12) — no `@media(min-width:820px){.bottom-sheet{display:none}}` rule. Sheet can appear on iPad/desktop where spec routes to ambient panel / inline expand.
3. **Breakpoint scheme is "max-width:600px"-centric** (#1) — mobile rules use 600px, not 375/414/430 phone boundaries. Tablet at 820, desktop at 1200/1440/1800. Doesn't map cleanly to spec's 11-bucket model.
4. **Touch target floor** (#7) — only ~3 selectors enforce 44px; primary card/filter/date-nav targets are smaller.

---

## Recommended remediation order

**Tier A (broken — fix first):**
1. Decide typography — either swap Playfair → Chakra Petch and Barlow → DM Sans, or update the spec.
2. Gate `.bottom-sheet { display:none }` above 820px so tablet/desktop routes through ambient/inline.

**Tier B (missing / high impact):**
3. Add explicit P1/P2/P3 breakpoints at 375 / 414 / 430 (move from `[data-phone-tier]` JS to pure CSS, or maintain both).
4. Add orientation gates for T1 vs T2 (currently single 820-1199 bucket).
5. Add `.card-brief-inline-text` MID (2-line) tier at 414-819 per spec.
6. Cap D3 at 1919 (or accept D3/D4 as ≥1440 by design).

**Tier C (cleanup):**
7. Enforce 44px min on `.filter-btn`, `.date-nav-btn`, `.share-btn`, `.watch-btn`, drama-badge tap zones.
8. Resolve 768-900 / 820-1199 overlap by aligning iPad-landscape rule to spec.
9. Introduce `.card-tier-featured / -standard / -compact` classes on `.game-card` to mirror the RN tier system, so per-tier brief surfacing rules are CSS-addressable.
