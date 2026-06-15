# Desktop Layout Bug Fixes — CC-CMD-2026-06-15-desktop-layout

**Date:** 2026-06-15
**Spec:** `docs/CC-CMD-2026-06-15-desktop-layout.md`
**Pre-state:** HEAD `f72fe68`, smoke `654 / 0`, `wc -c index.html` = 2,013,115
**Post-state:** smoke `655 / 0`, `wc -c index.html` = 2,015,980 (+2,865 bytes)
**SW_VERSION:** 2026-06-15b → **2026-06-15c**

---

## Test environment note

Playwright browser binaries were not downloadable from this sandboxed remote
execution environment — `npx playwright install chromium` fails on the
network egress policy. Bug analysis is therefore static CSS/JS tracing
verified by structural smoke + JS-parse round-trip; full Playwright runs at
D1 / D2 / D3 / D4 / T1 / P2 happen via the GitHub-Actions viewport workflow
against the deployed Worker. The new A612 smoke assertion pins the post-fix
selectors so any future revert of these rules trips CI before deploy.

---

## Diagnosis

### Bug 1 — WC Groups tab does not enter its own viewport on desktop

**Root cause: two cascade leaks plus a missing JS reset.**

1. **wc-mode hide list omitted `#field-journalism-section`.** The global rule
   at line 2388 listed `.main`, `#night-owl`, `#field-desk-section`,
   `#media-section`, `.page-divider`, `.legend-section`, `#upper-slots`,
   `#field-right-now`. The journalism section was not in the list. If a user
   ever opened the Journal tab, then clicked the WC tab, the journalism
   section's `[hidden]` attribute had been cleared by `toggleJournalismView`
   and nothing re-applied it at desktop (the `body:not(.journalism-mode)
   #field-journalism-section{display:none}` rule was wrapped in
   `@media(max-width:1199px)`). Result: WC + journalism rendered stacked.

2. **`body:not(.wc-mode) #wc-section{display:none}` was inside
   `@media(max-width:1199px)`.** On desktop, when wc-mode was off, the
   wc-section relied on its `[hidden]` attribute alone — fine on first load,
   broken after any inline-style residue cleared it.

3. **`toggleWCView` did not re-add `[hidden]` to the journalism section** when
   activating wc-mode. The function did remove the body class and active
   nav-link class, but the section's display state was undefined.

### Bug 2 — Journalism does not enter its own viewport on desktop

**Root cause: explicit design override at desktop.**

The CSS at lines 2614-2668 was wrapped in `@media(min-width:1200px)` and
treated journalism-mode at desktop as a *split layout*: `.main` was
re-positioned as a `position:fixed; left:0; width:280px` schedule rail, and
`#field-journalism-section` shifted right by 300px. The mobile/iPad hide
rules at lines 2202-2214 only fired at `@max-width:1199px`. The user's
expectation per the bug report is full-viewport behavior at every width.

### Bug 3 — Ambient panel does not respond to ESSENTIALS/WHOLE FIELD toggle

**Two root causes.**

1. **`renderAmbientPanel()` returned early at desktop.** Line 29185 hardcoded
   `if(w<820||w>=1200){panel.style.display='none';return;}`. That predates
   the WHOLE FIELD ambient-panel-on-desktop design. When the user toggled
   WHOLE FIELD on at 1366×768, the CSS `body.wf-mode #ambient-panel
   {display:flex !important}` showed the panel, but renderAmbientPanel never
   populated content — user saw an empty skeleton.

2. **Cascade collision between wc-mode and wf-mode `#ambient-panel` rules.**
   - `body.wc-mode #ambient-panel{display:none !important}` (line 2387, global)
   - `body.wf-mode #ambient-panel{display:flex !important}` (line 2427, @media)
   - Same specificity (one class, one id), both `!important`. CSS tie-break is
     source order — wf-mode came LATER, so a user with WHOLE FIELD on who
     then entered WC saw the ambient panel re-appear on top of the WC viewport.

---

## Fixes

### CSS

1. **Globalize journalism-mode hide list** (lines 2202-2214 → moved out of
   `@media`). Added `#streaming-section`, `#wc-section`, `#upper-slots`,
   `#field-right-now` to the list so journalism-mode is a true viewport swap
   on all breakpoints. Kept the `.jrn-back-pill` sticky-positioning rule in
   `@media(max-width:1199px)` since the laptop+ layout has no back pill.

2. **Add `#field-journalism-section` to wc-mode hide list** (line 2388).

3. **Move `body:not(.wc-mode) #wc-section{display:none}` to global** (out of
   `@media(max-width:1199px)`). Same treatment for
   `body:not(.journalism-mode) #field-journalism-section{display:none}`.

4. **Remove desktop journalism-mode schedule-rail override** (lines 2614-2668
   restructured). `.main` no longer gets `position:fixed; left:0` at
   `@media(min-width:1200px) and (max-width:1439px)` or `@media(min-width:1440px)`.
   `#field-journalism-section` now uses `margin:0 auto` for centering instead
   of `margin-left:300px`. At 1440+, `margin-right:320px` reserves room for
   the J1-J5 patent-visible `.jrn-companion` rail, which is retained at
   desktop only.

5. **Qualify wf-mode rules with `:not(.wc-mode):not(.journalism-mode)`**
   (lines 2436-2486). When wf-mode coexists with wc-mode or journalism-mode,
   the wf-mode rules no longer fire. The full-viewport modes win the
   cascade unambiguously.

### JS

6. **`renderAmbientPanel()` — desktop wf-mode branch** (line 29185+). New
   `isWfDesktop` predicate detects desktop + wf-mode + neither
   wc-mode/journalism-mode. The early-return is skipped when isWfDesktop is
   true. The function also clears `panel.style.display = ''` when no mode
   shows the panel, letting the CSS base rule
   `#ambient-panel{display:none}` apply cleanly.

7. **`apply()` in `initWFToggle`** (line 28898+). Now calls
   `renderAmbientPanel()` on BOTH transitions (whole→essentials and
   essentials→whole). Previously only the whole transition called it; the
   essentials transition left the inline `display:flex` (set by a prior
   iPad-range render) in place, fighting the CSS base rule.

8. **`toggleWCView`**: when activating wc-mode, set `[hidden]` on
   `#field-journalism-section` and clear its inline `style.display`. Belt
   and suspenders with the new wc-mode hide rule.

9. **`toggleJournalismView`**: when deactivating, set `[hidden]` on
   `#field-journalism-section` and clear inline `style.display`. When
   activating journalism-mode, set `[hidden]` on `#wc-section` (mutual
   exclusion already did this in part — added the inline-style clear).

### Smoke

- **A386** (PM-19 Journalism Tab) regex widened. The old assertion pinned
  `position:fixed; left:0` on `.main` in journalism-mode — that rule was
  removed by Fix 4. The new assertion pins the centered-reading-column +
  companion-rail layout AND the global hide-list rules.

- **A535** (`body.wf-mode #ambient-panel`) widened. Accepts both the old
  bare form and the new `:not(.wc-mode):not(.journalism-mode)` qualified
  form.

- **A612** added. Pins all eight discriminators of the fix so any future
  revert trips CI before deploy.

---

## Regression check — mobile/tablet (T1 + P2)

Static trace (no live browser, see test-environment note above):

| Viewport | Width | Behavior before | Behavior after |
|---|---|---|---|
| P2 phone | 390 | Schedule + ambient panel (none on phone) + journalism hidden by `[hidden]` | Unchanged — global hide list is a SUPERSET of the previous mobile-only list. Ambient panel base rule `display:none` still applies. |
| T1 iPad portrait | 820 | Schedule + ambient panel always visible; journalism/wc hidden via `[hidden]` | Unchanged — `@media(min-width:820px) and (max-width:1199px)` ambient-panel rule still fires. Hide rules are global supersets. |
| iPad journalism-mode | 820 | `.main` hidden, journalism shown, back pill sticky | Unchanged — hide rule moved from `@max-width:1199px` to global is a superset. The back-pill `@max-width:1199px` block retained. |
| iPad wc-mode | 820 | `.main` hidden, wc shown, back pill sticky | Unchanged — same wc-mode rules apply; added `#field-journalism-section` to hide list is additive. |

No mobile/tablet selectors removed. The transformation is:
`@media(max-width:1199px) { rule }` → `rule` (apply at all widths). The
previously-narrower scope is fully covered by the wider one.

---

## Files touched

| File | Change |
|---|---|
| `index.html` | CSS lines 2192-2214 (journalism hide globalized) · 2382-2402 (wc-mode hide + globalize) · 2414-2425 (wc-mode desktop layout — no functional change, just retained the margin reset) · 2435-2495 (wf-mode rules qualified with `:not(.wc-mode):not(.journalism-mode)`) · 2614-2668 (desktop journalism-mode schedule-rail removed, centered reading column) · `toggleWCView` (line 27828+) · `toggleJournalismView` (line 11890+) · `initWFToggle.apply` (line 28890+) · `renderAmbientPanel` (line 29181+). SW_VERSION 2026-06-15b → 2026-06-15c. |
| `sw.js` | SW_VERSION 2026-06-15b → 2026-06-15c. |
| `smoke.js` | A386 regex widened · A535 widened to accept qualified selector · A612 added · section header bumped to A604-A612. |
| `outbox/cc-desktop-layout-2026-06-15.md` | This file. |

---

## Smoke + JS parse

| Step | Smoke | JS parse |
|---|---|---|
| Pre-work | 654 / 0 | 3 / 0 fail |
| After Fix 1-6 (CSS + JS) | 652 / 2 (A386 + A535 pin old design) | 3 / 0 fail |
| After A386 + A535 update | 654 / 0 | 3 / 0 fail |
| After A612 add | **655 / 0** | 3 / 0 fail |

`wc -c index.html`: 2,013,115 → 2,015,980 (+2,865 bytes / +0.14%).

---

## What remains

The deploy-gate Playwright workflow at `.github/workflows/deploy-gate.yml`
will exercise the suite at D1 (1366×768) and D3 (1920×1080) after this
commit lands on `main`. If the suite's #18, #20, #21 assertions pass on
both viewports, the fixes are confirmed in real WebKit + Chromium. The
existing iOS Safari / Android Chrome workflows cover P2 + T1 + T2 + iPad
landscape.

If post-deploy testing surfaces any layout-specific regression, the
candidates to look at first are:
- `.jrn-companion` at 1440+ (still position:fixed right rail — schedule now
  hidden may leave it overlapping the journalism reading column if
  margin-right:320px is insufficient).
- `body.wf-mode:not(.wc-mode):not(.journalism-mode)` specificity (0,3,1 vs
  the original 0,2,1) — could shift the cascade for any rule that overrides
  wf-mode margin-right at 390px.

Both are minor and can be tuned post-deploy.
