# Design Doc: Pick 'em's Top-Level Surface

**Date:** 2026-07-05
**CC-CMD:** docs/CC-CMD-2026-07-05-pick-em-surface-design.md
**Status:** Investigation complete. Design recommendation below. No application code in this doc or this CC-CMD — this is the integration-point spec for a follow-up build CC-CMD.

---

## Important context this doc's reader needs first

The prior CC-CMD this doc supersedes (`CC-CMD-2026-07-05-pick-em-ui.md`,
game-card affordance) **was already executed** in the session turn
immediately before this one — commit `702fb7b`, deployed, live in
production, with an outbox at
`docs/outbox/cc-pick-em-ui-2026-07-05.md`. This CC-CMD's own text says
"do not execute that one," but by the time I read it, it had already
run. Per this CC-CMD's explicit scope ("No UI code in this CC-CMD"), I
have **not** reverted or modified that existing implementation — that
decision belongs to whoever reads this doc next, not to this
investigation. Flagging it here so it isn't missed: **there are now two
things to reconcile** — the live card-based pick UI, and whatever
surface a follow-up CC-CMD builds from this doc's recommendation.

## PROBE BLOCK — real findings, not guesses

```bash
grep -n "function.*[Ww]c[Mm]ode\|wcModeActive\|enterWCMode\|id=\"wc-mode" index.html
# → zero matches. Confirms the CC-CMD's own claim: these guessed names don't exist.

grep -n "buildFilterBar\|renderFilterBar\|FILTER_BAR" index.html
# → zero matches. There is no dedicated "filter bar builder" function by
#   that name. `.filter-bar` (a real CSS class, line 3797) styles a
#   scrollable chip row, but no JS function is named after it.

grep -n "function show[A-Z]\|function render[A-Z].*[Vv]iew\|currentView\b" index.html
# → matches exist (showFieldHealthPanel, showPrivacyPolicyModal,
#   showEUPushConsent, showShareToast, showFreshnessStrip) but none of
#   them are top-level content-view switches — they're panels/modals/
#   toasts layered on top of whatever's currently showing, not
#   alternatives to it. No `currentView` variable exists at all.
```

**The guessed names in the probe block don't exist — but the real
mechanism does, just under different names.** Found by following the
one credible lead the CC-CMD itself named (`switchWCTab`) upward to
what actually controls it:

### The real mechanism: two existing body-class "modes"

FIELD already has **two working, general-purpose, full-viewport-swap
top-level surfaces** — Journalism and WC Groups/Bracket — built on an
identical, hand-duplicated (not abstracted into a shared helper)
pattern:

| | Journalism | WC Groups/Bracket |
|---|---|---|
| Toggle function | `toggleJournalismView()` (line 13298) | `toggleWCView()` (line 31747) |
| Body class | `journalism-mode` | `wc-mode` |
| Nav link | `#jrn-nav-link` (line 4496) | `#wc-nav-link` (line 4497) |
| Content container | `#field-journalism-section` (line 4576) | `#wc-section` (line 4620) |
| Render function | `renderJournalism()` (line 13362) | `renderWCSection()` (line 32156, async) |
| Hides on activation | `.main`, `#night-owl`, `#field-desk-section`, `#media-section`, `#streaming-section`, `#wc-section`, `.page-divider`, `.legend-section`, `#upper-slots`, `#field-right-now`, `#ambient-panel` (CSS lines 2462-2472) | `.main`, `#night-owl`, `#field-desk-section`, `#media-section`, `#field-journalism-section`, `.page-divider`, `.legend-section`, `#upper-slots`, `#field-right-now`, `#ambient-panel` (CSS lines 2695-2704) |
| Mutual exclusion | Dismisses `wc-mode` if active (13308-13314) | Dismisses `journalism-mode` if active (31758-31764) |
| State persistence | `localStorage.setItem('field_journalism_mode', ...)` (13306) | **None found** — doesn't persist across reloads (real asymmetry, not something to silently copy) |
| Scroll handling | Saves `window.scrollY` on activate, restores on deactivate (13303, 13338) | Not observed in `toggleWCView` itself |
| Cleanup on exit | None beyond hiding | Closes `_bracketWS` WebSocket, `_bsdDeactivate()` (31772-31775) |

Both are triggered from **the exact same real top-level nav bar**:
```html
<nav class="controls">
  <div class="controls-inner">
    <div class="date-nav">...</div>
    <div id="sport-filters">...</div>   <!-- sport FILTER chips, activeFilter-driven -->
    ...
    <a class="desk-jump-link" id="desk-jump-link" href="#field-desk-section">📰 Desk</a>
    <a class="desk-jump-link jrn-nav-link" id="jrn-nav-link" href="#field-journalism-section">📖 Journal</a>
    <a class="desk-jump-link wc-nav-link" id="wc-nav-link" href="#wc-section" style="display:none">⚽ Groups</a>
    <button id="wf-toggle">ESSENTIALS</button>
  </div>
</nav>
```
(index.html ~4483-4500). This bar itself is **never hidden** by either
mode's CSS (only its `margin-right` shifts when the ambient panel is
hidden) — confirmed via `grep -n "nav\.controls"` against both mode
prefixes. A user in Journalism or WC mode can always reach the other
via this same persistent bar.

**Important, easily-missed distinction:** `#desk-jump-link` ("📰 Desk")
looks identical (same `.desk-jump-link` CSS class) but works completely
differently — its click handler (line 10995-10998) is a plain
`scrollIntoView`, nothing else. No body class, no hide/show, no mode.
`#field-desk-section` is a permanent, always-visible section further
down the same scrolling page. Desk is NOT a third mode — it's a
same-page anchor jump. Only Journal and WC are true modes.

## Answering the three questions

### 1. Does a general top-level surface-switching mechanism already exist?

**Yes, functionally — but not as one shared abstraction.** It exists as
two independently-written functions (`toggleJournalismView`,
`toggleWCView`) that happen to follow an identical shape: toggle a
`body` class → mutual-exclusion-dismiss any other active mode → hide a
fixed list of top-level containers via CSS → show one section → lazy-
render its content → wire a nav-link's `active` class. There is no
`currentView` variable, no shared `toggleMode(name)` dispatcher, no
registry of modes — each one hand-implements the same shape. A third
mode extends this shape, it doesn't join a preexisting abstraction that
already generalizes past two cases.

### 2. What's the smallest real addition that creates a third mode?

Following the exact existing shape, not inventing a new one:

1. **A third body class**, e.g. `pickem-mode`, toggled by a new
   `togglePickEmView()` function mirroring `toggleWCView()`'s shape
   (simpler of the two — no WebSocket cleanup needed for a first
   build).
2. **A third nav link**, `#pickem-nav-link`, `.desk-jump-link`-styled,
   added as a sibling of `#jrn-nav-link`/`#wc-nav-link` in the same
   `<nav class="controls">` bar — unlike WC's link, it should NOT
   default to `style="display:none"` (WC's link is hidden until the
   tournament is in season; pick 'em is always relevant when there are
   any upcoming games across any sport, which is effectively always).
3. **A third section container**, `<section id="pickem-section"
   hidden>`, as a sibling of `#field-journalism-section`/`#wc-section`
   in the same markup region (~4576-4650).
4. **Extend the existing CSS hide-lists** (2462-2472 and 2695-2704) to
   also hide `#pickem-section` when the OTHER two modes are active, and
   add the mirror rule hiding `.main`/desk/media/etc. (the same list
   both existing modes already use) when `pickem-mode` is active. This
   is a 3-way mutual exclusion now, not 2-way — all three toggle
   functions need a third `classList.remove` line for the two sibling
   modes.
5. **A render function**, `renderPickEmSection()`, mirroring
   `renderWCSection()`'s/`renderJournalism()`'s role: build the actual
   pick 'em content (upcoming cross-sport pick opportunities, pending
   picks, resolved history) into `#pickem-section` on activation. This
   is where the *existing* pick logic from the already-executed
   card-affordance CC-CMD (`_getPickCache()`, `buildPickWidgetHTML()`,
   `makePick()`, `_userDoRelay` calls) could be **reused as the
   per-game rendering unit inside this new surface**, rather than
   rebuilt — the card-level implementation isn't wasted, it just needs
   a new home to render into instead of (or in addition to) individual
   game cards. That reconciliation is a decision for the follow-up
   build CC-CMD, not this one.
6. **State persistence**: Journalism persists to localStorage, WC
   doesn't. Recommend following Journalism's precedent (persist
   `pickem-mode` state) since pick 'em is something a user would
   plausibly want to return to across a reload, same as journalism
   reading — but this is a minor, cheap addition either way, not a
   structural decision.

### 3. Where does it sit — nav-bar peer, or reached via My Services?

**A nav-bar peer alongside Desk/Journal/WC — not inside My Services.**

Checked what's actually in My Services (`#setup-overlay`,
`role="dialog" aria-modal="true"`, line ~4670 area) before ruling it
out, rather than assuming: it is a genuine **modal dialog** for
selecting streaming services, with a read-only "Journalism Quality"
diagnostic section appended inside it (`buildJournalismQualitySection()`),
and — as of the already-executed prior CC-CMD — a read-only "Pick 'em"
cumulative-stats summary appended the same way
(`buildPickEmStatsSection()`, `docs/outbox/cc-pick-em-ui-2026-07-05.md`).

A modal dialog is the wrong shape for the **primary** pick 'em
interaction surface — browsing cross-sport pick opportunities and
making/reviewing picks is a content-browsing task, structurally the
same kind of thing Journalism and WC already are (a full page you
navigate *to*, spend time in, and navigate *away from*), not a
settings action you complete and dismiss. Nesting the primary flow in
a settings modal would be a real, avoidable mismatch — same class of
problem this CC-CMD was written to avoid with the game-card version.

The **read-only cumulative-stats summary already living in My
Services** is a different, smaller thing than the primary surface, and
is a reasonable complementary placement, not a wrong fit — it's exactly
analogous to how My Services already hosts the read-only Journalism
Quality diagnostic alongside the real Journalism mode's own full
surface. Recommend: **keep the small stats summary in My Services as
a supplementary view, and build the primary pick/browse/reveal
experience as the new third nav-bar mode** described above. This isn't
an either/or — both placements already coexist for Journalism's own
quality metrics vs. its main reading surface, and pick 'em can follow
the same split.

## Recommendation summary (for the follow-up build CC-CMD)

1. Add `togglePickEmView()` + `pickem-mode` body class + `#pickem-nav-link`
   + `#pickem-section`, mirroring `toggleWCView()`'s exact shape (WC is
   the simpler of the two existing precedents to copy from).
2. Extend the two existing modes' mutual-exclusion and CSS hide-lists
   to a true 3-way exclusion.
3. Build `renderPickEmSection()` reusing the already-shipped
   `_getPickCache()`/`makePick()`/`buildPickWidgetHTML()`/
   `_resolvePickIfExists()` logic from the card-affordance CC-CMD as
   the per-game unit inside the new surface, rather than discarding
   that work.
4. Decide explicitly (as its own stated decision in that CC-CMD, not
   silently): does the new surface **replace** the card-based
   affordance, or do both coexist for this first iteration? Either is
   defensible, but per this session's own "no undiscussed duplication"
   precedent (the golf/CFL hardcoded-vs-live bug pattern flagged
   earlier this session), it should be a stated choice, not an
   accident.
5. Keep the existing My Services stats summary as-is; it's a valid,
   separate, complementary placement.

---

## Done Conditions

- [x] Real top-level navigation mechanism found and reported — two
      existing body-class modes (`journalism-mode`/`wc-mode`), not the
      guessed names, with exact function/line references
- [x] Design doc answers all three questions with real code evidence
      (line numbers, function names, CSS rule locations)
- [x] No application/UI code written in this CC-CMD
- [x] Outbox manifest written (see `docs/outbox/cc-pick-em-surface-design-2026-07-05.md`)
