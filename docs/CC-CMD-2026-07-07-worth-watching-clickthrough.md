# CC-CMD: Click-to-scroll on tier-ranked rows — a follow-up, not bundled into the display

**Date:** 2026-07-07
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

**Deliberately kept separate from `CC-CMD-2026-07-07-worth-watching-
display.md` (v2)** — per Rule 7 (single-concern commits). That CC-CMD
adds a read-only display; this one adds interactivity on top of it.
Different concerns, different commits, easier to isolate either one if
something needs debugging or reverting later.

**Hard dependency: do not run this before v2 is live.** This CC-CMD's
probe block will fail cleanly if `.ww-row` doesn't exist yet — that's
the correct signal to stop, not work around.

**The design, reusing two already-existing, already-proven patterns —
nothing invented:**
- Every card already carries a stable `data-gameid` attribute, and
  there's already a real, in-production click-to-scroll pattern
  (`index.html:13301`, the existing top-pick desk card):
  `document.querySelector('[data-gameid="..."]').scrollIntoView({behavior:'smooth',block:'center'})`.
- There's already a transient, auto-fading highlight keyframe,
  `@keyframes scoreFlash` (`index.html:706`), gold tint fading to
  transparent — built for something else, reused here for "briefly
  confirm arrival, then disappear."

**Why this doesn't add clutter:** nothing changes on any card at rest.
The only visible change is a brief flash after a user actively clicks a
ranked row — cards are pixel-identical to today outside of that
momentary, self-clearing state.

## PROBE BLOCK
```bash
grep -n "\.ww-row\|\.ww-tier-badge\|\.ww-matchup" index.html
grep -n "@keyframes scoreFlash" index.html
```
Confirm `.ww-row` exists (v2 is live) before proceeding. If it doesn't,
stop and report that v2 hasn't shipped yet — do not attempt this CC-CMD
against the pre-v2 codebase.

## TASK — Make each ranked row clickable

For each `.ww-row` generated in the ranked-list mapping (added by v2),
wrap it with a click handler using the exact existing scroll pattern:
```javascript
rankedHTML = bundle.pick.ranked.map(g => {
  const badge = g.tier === 0 ? '<span class="ww-tier-badge">ELIMINATION</span>' : '';
  return `<div class="ww-row" style="cursor:pointer" onclick="(()=>{const c=document.querySelector('[data-gameid=\\"${g.game_id||''}\\"]');if(c){c.scrollIntoView({behavior:'smooth',block:'center'});c.classList.add('ww-flash');setTimeout(()=>c.classList.remove('ww-flash'),1200);}})()">${badge}<span class="ww-matchup">${esc(g.away)} @ ${esc(g.home)}</span></div>`;
}).join('');
```
Add a `.ww-flash` class reusing the existing `scoreFlash` keyframe:
```css
.ww-flash{animation:scoreFlash 1.2s ease-out}
```
If `g.game_id` doesn't match any real `data-gameid` on the current page
(the card may not exist in the current view, e.g. a different sport
filter is active), the click should silently do nothing — do not throw,
do not show an error, this is a soft-fail case worth confirming
directly, not assuming works correctly.

## VERIFICATION

- `node smoke.js index.html` clean.
- Real page load: click a ranked row, confirm the page actually scrolls
  to the matching card and a brief gold flash plays then clears —
  report the actual observed behavior, not a hypothetical.
- Test the soft-fail case directly: a `game_id` with no matching card
  currently in the DOM — confirm no error, no console warning, no
  visible failure state.
- Confirm cards are visually unchanged at rest (before any click) —
  this is the core promise of the feature, verify it's actually true.

## DONE CONDITIONS
- [ ] Probe block confirms `.ww-row` exists (v2 live) before proceeding
- [ ] Click handler added using the exact existing scroll pattern
- [ ] `.ww-flash` reuses the existing `scoreFlash` keyframe, not a new animation
- [ ] Soft-fail case (no matching card) verified silent, not just assumed
- [ ] Real click-through verified on a live page load
- [ ] Cards confirmed visually unchanged at rest
- [ ] Smoke clean

## CONFIDENCE SCORING TABLE
+15  Probe block correctly gates on v2 being live
+30  Click handler correct, reuses the exact existing scroll pattern
+20  Flash reuses the existing keyframe, not a new one
+15  Soft-fail case verified, not assumed
+10  Real click-through verified on a live page
+10  Smoke clean, cards confirmed unchanged at rest

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-worth-watching-clickthrough.md.
FIRST confirm .ww-row exists (v2's display CC-CMD must already be live)
-- if not, stop and report, do not proceed. Add a click handler to each
ranked row using the exact existing scroll pattern from index.html:13301
(data-gameid + scrollIntoView), plus a brief flash reusing the existing
scoreFlash keyframe, not a new animation. Verify the soft-fail case (no
matching card) is silent, and confirm cards are visually unchanged at
rest. Do not commit unless confidence >= 95. If score < 95, report
verbatim and stop.
