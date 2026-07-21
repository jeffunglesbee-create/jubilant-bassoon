# CC-CMD: Ambient panel skeleton overlaps real content — CONFIRMED diagnosis, implement fix

**Date:** 2026-07-21 (diagnosis completed same-day by chat via full-repo
archive read — `get_archive_url` + local ripgrep, bypassing the GitHub
Contents API's 1MB inline-content ceiling that had been silently emptying
`read_file`/`read_lines` responses for this file all session)
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** One line added to `renderAmbientPanel()` in `src/legacy/field.js`.
**Supersedes:** This CC-CMD replaces the diagnosis-first version committed
earlier today (same filename, commit `1f5fcbab`). That version's probe
questions are now answered below with certainty — implement directly, no
further diagnosis needed.

**Why — real, confirmed bug.** Screenshot from Jeff, 2026-07-21 3:21 PM:
garbled overlapping text at the top of the ambient panel — "UPCOMING" over
"Live Intelligence". Codex decision `ambient-panel-skeleton-overlap` has
the rule this violates.

---

## CONFIRMED DIAGNOSIS (verified directly against real source, not inferred)

**1. Where the skeleton lives:** `index.html:4798`, static markup, the
ENTIRE initial content of `#ambient-panel`:
```html
<aside id="ambient-panel" aria-live="polite" aria-label="Live intelligence panel"><div class="ambient-skeleton" aria-hidden="true"><div class="ambient-skeleton-label">Live Intelligence</div><div class="ambient-skeleton-block"></div></div></aside>
```
CSS at `index.html:2127-2134` (`.ambient-skeleton`, `.ambient-skeleton-label`,
`.ambient-skeleton-block`, shimmer animation). This is the entirety of
`.ambient-skeleton`'s footprint in the codebase alongside one more
reference below.

**2. Confirmed: NO hide/remove code exists anywhere.** `rg -n
"ambient-skeleton" src/legacy/field.js` returns ZERO matches. This is not
a broken mechanism — it is a genuinely missing one. Full stop, no
remaining uncertainty on this point.

**3. Why it's missing (real causal explanation, not just "forgot a
line"):** Checked how the OTHER skeleton pattern in this codebase
(`.game-card-skeleton`, same CSS shimmer convention) gets cleared —
also zero JS references. The old pattern self-cleans skeletons as a
side effect of wholesale `container.innerHTML = ...` replacement (the
skeleton was inside whatever got overwritten). The ambient panel's
Solid rewrite (`CC-CMD-2026-07-20-solid-2-rewrite`) deliberately does
fine-grained, surgical DOM updates via `reconcile()` — that is the whole
point of the rewrite, and it is correct. But it means Solid's `render()`
never touches anything outside what it explicitly mounts, so the
skeleton — a sibling, not a descendant of anything Solid controls — is
never implicitly cleared the way the old whole-innerHTML pattern used to
clear it for free. Nobody added the now-necessary explicit cleanup step
when the rendering model changed. This is the real root cause.

**4. Exact mount call site — confirmed correct, do not touch:**
`src/legacy/field.js:32717-32729`, inside `renderAmbientPanel()`:
```js
function renderAmbientPanel(){
  const panel=(_DOM?.ambientPanel||document.getElementById('ambient-panel'));
  if(!panel) return;
  // Solid island mount (CC-CMD-2026-07-20-solid-2-rewrite): mount once, on
  // whichever of this function's 6 real call sites happens to fire first.
  // Idempotent via the _solidMounted flag on the panel element itself --
  if (!panel._solidMounted) {
    mountAmbientIsland(panel, _apScrollToFilter);
    panel._solidMounted = true;
  }
  ...
```
The idempotency design (flag-gated, not call-site-order-dependent) is
correct and well-reasoned — six real call sites feed this function
(confirmed: lines 7830, 7879, 7884, 20463, 26920, 32406), so the flag
approach is the right one. Do not change this pattern.

**5. Desktop breakpoint (resolves the earlier open question about
Jeff's screenshot's exact viewport):** Not a pure CSS media-query
breakpoint — `renderAmbientPanel()` allows rendering at >=1200px when
`document.body.classList.contains('wf-mode')` (WHOLE FIELD mode) AND
neither `wc-mode` nor `journalism-mode` are active (see the "Desktop bug
fix (June 15 2026)" block immediately following the mount code). Jeff's
screenshot is WHOLE FIELD desktop mode, not the 820-1199px tablet range
alone.

---

## Do NOT Touch

- `docs/AMBIENT-SCROLL-SPEC.md`'s fix, the section order/components in
  `ambient-island.jsx`, the `_solidMounted` idempotency pattern, or any
  section's content logic — all confirmed correct and unrelated.

---

## Pre-Build Probe (still required — confirm HEAD hasn't moved since this
diagnosis, then proceed straight to TASK 1)

```bash
git log --oneline -3
sed -n '32717,32730p' src/legacy/field.js
```
If this doesn't match the block quoted in point 4 above, STOP — something
changed since this diagnosis was written; re-diagnose rather than applying
the fix blind.

## TASK 1 — The fix (one line)

In `src/legacy/field.js`, immediately after `panel._solidMounted = true;`:
```js
  if (!panel._solidMounted) {
    mountAmbientIsland(panel, _apScrollToFilter);
    panel._solidMounted = true;
    panel.querySelector('.ambient-skeleton')?.remove();
  }
```
`remove()`, not `display:none` — per the original CC-CMD's own reasoning:
a removed node can never bleed through again; a hidden one can if
something later un-hides it. Optional-chained since a second call to
`renderAmbientPanel()` before mount (race) would find `_solidMounted`
already true and skip this block entirely — the skeleton query only runs
once, at the real mount moment, so `?.` is defensive, not load-bearing.

## TASK 2 — Add the durable rule to CLAUDE.md

Grep CLAUDE.md for the current highest `Rule N` and add the next number:
no ambient-panel chrome element (skeleton, loading state, or future
additions) may remain visible once real section content has mounted, in
any state including all-sections-empty. Cite this CC-CMD and Codex key
`ambient-panel-skeleton-overlap`, same pattern as Rule 24's
AMBIENT-SCROLL-SPEC.md citation. Include the real causal explanation from
point 3 above (surgical-update rewrites need explicit cleanup that
wholesale-replace rewrites got for free) since it generalizes beyond this
one component — any future fine-grained-rendering conversion has the same
exposure.

## TASK 3 — Smoke assertion

Add an assertion: after `renderAmbientPanel()` has run once (mount fired),
`document.querySelector('#ambient-panel .ambient-skeleton')` is `null`.

## TASK 4 — Real behavioral verification

Live-verify via headless browser in WHOLE FIELD desktop mode (`wf-mode`
class on body) AND iPad-width (820-1199px) — both real paths into this
function. Screenshot the ambient panel top in both a populated-sections
state and an all-empty-until-Upcoming state (force via mocked
`updateAmbientData` call if a naturally-empty moment isn't available at
test time). Confirm no skeleton element remains in the DOM after mount in
any of these, and no overlapping text in the screenshots.

## TASK 5 — Commit + outbox manifest

Outbox manifest per Rule 67: commit hash, the new CLAUDE.md rule number,
screenshots from TASK 4, confirmation AMBIENT-SCROLL-SPEC.md's scroll fix
still works (quick regression check — this touches the same DOM subtree).

---

## Done Condition

`.ambient-skeleton` is absent from the DOM after `renderAmbientPanel()`'s
first real mount, verified live in both WHOLE FIELD desktop and iPad-width
paths, in both populated and all-empty-until-Upcoming states. New CLAUDE.md
rule added. Scroll behavior (AMBIENT-SCROLL-SPEC.md) unregressed.

**Confidence scoring:**
+35 One-line fix matches TASK 1 exactly (or a better variant if the
    live re-probe in the Pre-Build Probe step surfaces something changed)
+15 New CLAUDE.md rule added, correctly numbered, includes the real
    causal explanation (point 3), not just "add a rule"
+15 Smoke assertion added
+25 Real screenshot verification across all 4 combinations (2 viewport
    paths × 2 content states) — not just one
+10 Clean commit, honest outbox manifest, scroll-regression spot-check

Automate follow-ups. No fallbacks, only fixes — if the Pre-Build Probe
shows the mount code has changed since this diagnosis, do not force this
exact one-line patch onto different code; re-diagnose against what's
actually there.

Do not commit unless confidence >= 95. If score < 95, report verbatim and
stop.

---

## ONE-LINER

git pull. Read docs/CC-CMD-2026-07-21-ambient-skeleton-overlap.md --
diagnosis is now CONFIRMED (verified directly via full repo archive read,
not partial/inferred), go straight to TASK 1: one line in
renderAmbientPanel() (src/legacy/field.js ~line 32727) --
panel.querySelector('.ambient-skeleton')?.remove() right after
panel._solidMounted = true. Re-verify the exact block first via the
Pre-Build Probe in case HEAD moved. Add the CLAUDE.md rule (TASK 2) and
smoke assertion (TASK 3). Verify live in BOTH wf-mode desktop and iPad-width
paths, both populated and all-empty-until-Upcoming states. Automate
follow-ups. No fallbacks, only fixes.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
