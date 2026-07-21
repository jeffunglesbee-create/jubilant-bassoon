# CC-CMD: Ambient panel skeleton overlaps real content — Diagnosis-First Spec

**Date:** 2026-07-21
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** `#ambient-panel`'s loading skeleton vs. its real Solid-mounted
content (`src/solid/ambient-island.jsx`). Same component as
`docs/AMBIENT-SCROLL-SPEC.md` — that fix is unrelated and must not be
touched or re-litigated.

**Why — real, confirmed bug, not a hypothetical.** Screenshot from Jeff,
2026-07-21 3:21 PM, two-column desktop layout: the top of the right-column
ambient panel shows garbled overlapping text — "UPCOMING" (a real section
header) directly on top of "...LIGENCE" (the tail of "Live Intelligence").
Codex decision `ambient-panel-skeleton-overlap` has the rule this violates:
nothing may ever render underneath the ambient panel's real content, in any
state.

**Real, honest scope acknowledgment — this is diagnosis-first, not a
prescribed fix.** Chat confirmed the following via LIVE DOM INSPECTION of
the deployed site (not source grep — `ambient-skeleton` and
"Live Intelligence" could not be located via the FIELD Handoff MCP's
read_source/read_file on field.js/index.html despite being directly
confirmed present live; flag this to Jeff separately as a possible search
tool gap, it is not this bug):

```html
<div id="ambient-panel">
  <div class="ambient-skeleton" aria-hidden="true">
    <div class="ambient-skeleton-label">Live Intelligence</div>
    <div class="ambient-skeleton-block"></div>
  </div>
  <div class="ambient-scroll-inner"><!-- Solid-mounted AmbientPanel renders here --></div>
</div>
```
`.ambient-skeleton` and `.ambient-scroll-inner` are DIRECT SIBLINGS. Per
`ambient-island.jsx`, `mountAmbientIsland(panelEl, ...)` calls
`render(() => <AmbientPanel .../>, panelEl)` with `panelEl = #ambient-panel`
itself — Solid APPENDS `.ambient-scroll-inner` as a new child; it does not
replace `.ambient-skeleton`. At time of check the skeleton had
`display:flex`, `visibility:visible`, no `hidden` attribute — i.e. nothing
observed was actually hiding it. `aria-hidden="true"` is accessibility-only
and does NOT affect visual rendering — do not mistake it for a visibility
fix. Chat could NOT fully reproduce the live overlap end-to-end (headless
browser's default viewport kept `#ambient-panel` at its own
`display:none` — the panel only shows at the 820-1199px breakpoint and
whatever wider desktop rule produces the two-column layout in the
screenshot; chat did not confirm that rule's exact breakpoint).

**Target time:** ~20 min diagnosis + ~15 min fix, more if the probe reveals
the skeleton-hide mechanism doesn't exist at all (a genuine gap) vs. exists
but is broken (a genuine bug) — these need different fixes, do not assume
which one it is before probing.

---

## Do NOT Touch

- `docs/AMBIENT-SCROLL-SPEC.md`'s fix (`.ambient-scroll-inner`'s
  `position:absolute` inset CSS, or the `renderAmbientPanel()` scrollTop
  save/restore JS) — different bug, same component, do not conflate.
- `ambient-island.jsx`'s section order, section components, or the
  `createStore`/`reconcile` data flow — the six-section Solid rewrite
  itself is correct and unrelated to this bug.
- Any section's actual content/logic (OtwCard, ScoresList, SoonList,
  UpcomingList, ContextPill, ArbCard, EditorialCard).

---

## Pre-Build Probe / Diagnosis (run FIRST, write real answers to
`outbox/ambient-skeleton-diagnosis.md` before writing any fix code —
same discipline as AMBIENT-SCROLL-SPEC.md's original diagnosis-first
process)

```bash
git log --oneline -5
grep -n "ambient-skeleton" src/legacy/field.js
grep -n "ambient-skeleton" index.html
grep -n "mountAmbientIsland" src/legacy/field.js
grep -n "class=\"ambient-panel\"\|id=\"ambient-panel\"" index.html
grep -n "@media(min-width:820px)\|@media (min-width: 820px)" index.html
```

Answer these, with real evidence (line numbers, actual current code),
before implementing anything:

1. Where is `.ambient-skeleton`'s HTML created — static markup in
   `index.html`, or built by a JS function? If JS, which function, and
   when does it run relative to `mountAmbientIsland()`?
2. Is there ANY existing code — CSS rule, class toggle, `.remove()`,
   `display:none` assignment, anything — whose apparent INTENT is to hide
   `.ambient-skeleton` once real content is ready? If yes: why isn't it
   firing (timing bug, wrong selector, wrong condition)? If no: this is a
   missing step, not a broken one — say so explicitly, don't invent a
   history that isn't there.
3. Does `mountAmbientIsland()`'s call site (wherever it's invoked from
   `field.js`) do anything with the skeleton at all — before, during, or
   after the call?
4. At what exact viewport width does the two-column desktop layout in
   Jeff's screenshot actually activate (`#ambient-panel` visible,
   `display:flex` or similar)? Confirm via the real CSS, not the 820-1199px
   tablet range alone — the screenshot's proportions look wider than
   tablet.
5. Reproduce live: load the deployed site at the confirmed desktop
   viewport width, at a moment (or forced via dev tools / mocked state)
   where One to Watch + Live + Soon are all empty so Upcoming is the first
   real section. Screenshot the ambient panel's top. Confirm the overlap
   actually happens exactly as described, and confirm whether it ALSO
   happens in the normal case (sections populated) — this determines
   whether the skeleton never hides (universal bug) or only fails to hide
   in this specific empty-sections edge case (narrower bug, different fix).

If the real cause turns out to be something not covered by questions 1-5,
document what you actually found instead of forcing it into this shape.

---

## TASK 1 — Fix based on the real diagnosis above

Do not guess the fix here — it depends entirely on what TASK 0 finds. Two
likely shapes, pick whichever the diagnosis actually supports (or a third,
if the evidence points elsewhere):

- **If the hide-mechanism is simply missing:** add an explicit step in
  `mountAmbientIsland()` (or its caller) that hides/removes
  `.ambient-skeleton` at the correct moment — on first real mount, and
  again defensively on every `updateAmbientData()` call in case a race
  condition lets a poll cycle re-show it. Prefer `remove()` over
  `display:none` if the skeleton has no legitimate reason to exist in the
  DOM after first real content — a removed node can never bleed through
  again, a hidden one can if something un-hides it.
- **If a hide-mechanism exists but is broken:** fix the actual defect
  (wrong selector, wrong event timing, wrong condition) — do not add a
  second, parallel hide path alongside a broken one.

Whichever shape, the fix must hold in BOTH the populated-sections case and
the all-empty-until-Upcoming case tested in the probe.

## TASK 2 — Add the durable rule to CLAUDE.md

Add a new, properly numbered rule (grep CLAUDE.md for the current highest
`Rule N` first — chat could not confirm this number with certainty from a
partial read) stating: no ambient-panel chrome element (skeleton, loading
state, or future additions) may remain visible once real section content
has mounted, in any state including all-sections-empty. Cite this CC-CMD
and Codex key `ambient-panel-skeleton-overlap` as the case study, same
pattern as Rule 24's AMBIENT-SCROLL-SPEC.md citation.

## TASK 3 — Smoke assertion

Add a smoke assertion confirming `.ambient-skeleton` is absent or
`display:none`-and-verified-inert after `mountAmbientIsland()` has run
with non-empty state (use whatever the existing A598/A602-style pattern
for this component is).

## TASK 4 — Real behavioral verification

Live-verify via headless browser at the confirmed desktop viewport width:
screenshot the ambient panel top in BOTH states (populated sections; all
three lead sections empty so Upcoming is first) and confirm no overlapping
text in either. Do not rely on "the code looks right" — this bug already
survived at least one round of code that looked plausible (the skeleton
markup itself, `aria-hidden="true"` and all).

## TASK 5 — Commit + outbox manifest

Outbox manifest per Rule 67, including: the real diagnosis findings
(questions 1-5 above, with actual answers), the fix shape chosen and why,
both before/after screenshots from TASK 4, and the new CLAUDE.md rule
number added.

---

## Done Condition

Live ambient panel shows no overlapping/garbled text at its top in either
the populated-sections state or the all-empty-until-Upcoming state,
confirmed via real screenshots in both states — not code inspection alone.
New CLAUDE.md rule added and correctly numbered. AMBIENT-SCROLL-SPEC.md's
existing fix (scroll behavior) confirmed untouched.

**Confidence scoring:**
+30 Diagnosis (questions 1-5) answered with real evidence, written to
    outbox, BEFORE any fix code was written
+30 Fix matches what the diagnosis actually found (missing mechanism vs.
    broken mechanism) rather than a guessed generic patch
+15 New CLAUDE.md rule added, correctly numbered, cites this CC-CMD and
    the Codex key
+15 Real screenshot verification in BOTH states (populated and
    all-empty-until-Upcoming)
+10 Clean smoke addition, clean commit, honest outbox manifest

Automate follow-ups. No fallbacks, only fixes — if the skeleton turns out
to serve a real purpose you weren't told about (e.g. some other code
depends on it existing), do not route around it with a visual patch
(z-index hack, opacity trick); find out what actually needs it and fix
the real interaction.

Do not commit unless confidence >= 95. If score < 95, report verbatim and
stop.

---

## ONE-LINER

git pull. Read docs/CC-CMD-2026-07-21-ambient-skeleton-overlap.md.
Diagnose FIRST (write real findings to outbox/ambient-skeleton-diagnosis.md
before any fix code) why #ambient-panel's loading skeleton ("Live
Intelligence" label) is not being hidden/removed once real content mounts
via mountAmbientIsland -- confirmed live that the skeleton and
.ambient-scroll-inner are DOM siblings, not confirmed why nothing hides the
former. Fix based on what the diagnosis actually finds, not a guess. Add
a properly-numbered CLAUDE.md rule for this. Verify with real screenshots
in both the populated-sections and all-empty-until-Upcoming states.
Automate follow-ups. No fallbacks, only fixes.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
