# CC-CMD: Display the tier-ranked list — folded into Tonight's Pick, not a new named section

**Date:** 2026-07-07 (v2 — corrects two real gaps found before execution:
an unresolved design question, and a naming collision)
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## WHAT CHANGED FROM v1, AND WHY — READ BEFORE THE TASK

**Gap 1 — an open design question got silently defaulted instead of
resolved.** An earlier turn asked directly: does this feature mean
tonight's slate, computed once, or does it need to re-rank live as
scores change through the evening? v1 answered by silently reading
`ranked` from the existing one-shot `bootNewspaper()` fetch, without
ever stating that as a deliberate choice. **Checked directly, not
assumed: `bootNewspaper()` is a one-shot IIFE
(`(async function bootNewspaper(){...})()`), called exactly once at
page load, with zero recurring poll anywhere calling it again.** So
"live re-rank" was never actually free — it would require building a
new polling mechanism that doesn't currently exist, which is real,
separate scope, not a display decision. **Explicit resolution: this
CC-CMD displays tonight's slate, computed once, matching the same
freshness as everything else `bootNewspaper()` already delivers.**
Live re-ranking is out of scope here and would need its own,
separately-decided CC-CMD if wanted later.

**Gap 2 — a real naming collision with an existing, different feature.**
`"👀 WORTH WATCHING"` already exists as a specific, live per-card badge
(`index.html:23063`, `:35717`) — it fires when `fieldGameTier() ===
'CLOSE_LATE'` specifically, one tier below `CRUNCH TIME`
(`CRUNCH`/`EXTRA_TIME`), computed from live margin/period state. That
badge's criteria has nothing to do with this CC-CMD's relay-computed
tier (elimination-round vs. OT-or-late-close vs. other). Naming a new
section "What's Worth Watching" would put an already-specific, already-
claimed term over content that doesn't use the same definition —
genuinely confusing, not just similar-sounding. **Resolution: no new
section, no new section title at all.** Fold the ranked rows directly
into the existing "TONIGHT'S PICK" section, underneath the existing
`brief` prose — extending something that already exists rather than
naming something new.

## THE RUWT-COMPLIANCE FLOOR (unchanged from v1)

Never render `ranked[n].score`. `tier` is a named integer bucket, safe
to use, but must be translated to a label — and that label must NOT
reuse `"CRUNCH TIME"` or `"WORTH WATCHING"` verbatim, since both are
already claimed by the live per-card badge system with different,
narrower criteria. Use `"ELIMINATION"` for tier 0 only (confirmed real,
already used as a tier concept elsewhere — `index.html:9793`, `:26688`
— and confirmed NOT used as either existing badge's literal text).
**Tier 1 and tier 2 get no badge at all** — list position alone conveys
relative order; inventing a second new badge term risks the same
collision problem this doc exists to avoid.

## PROBE BLOCK
```bash
sed -n '22083,22091p' index.html
grep -n "WORTH WATCHING" index.html
```
Confirm the existing Tonight's Pick block still matches, and confirm
the badge collision citations still hold before writing anything.

## TASK — Extend the existing Tonight's Pick section, no new section

Inside the existing block (after line ~22090's `pickText` handling),
add the ranked rows to the *same* `.np-pick` section, not a new one:
```javascript
if (bundle.pick) {
  const pickText = bundle.pick.type === 'pass'
    ? (bundle.pick.brief || "Not every night has a must-watch. Tonight's one of those.")
    : (bundle.pick.brief || '');
  let rankedHTML = '';
  if (Array.isArray(bundle.pick.ranked) && bundle.pick.ranked.length) {
    rankedHTML = bundle.pick.ranked.map(g => {
      const badge = g.tier === 0 ? '<span class="ww-tier-badge">ELIMINATION</span>' : '';
      return `<div class="ww-row">${badge}<span class="ww-matchup">${esc(g.away)} @ ${esc(g.home)}</span></div>`;
    }).join('');
  }
  if (pickText || rankedHTML) {
    parts.push(`<div class="np-section np-pick"><div class="np-label">TONIGHT'S PICK</div><p class="np-prose">${pickText}</p>${rankedHTML}</div>`);
  }
}
```
Confirm the exact name/signature of the existing `esc()` helper used
elsewhere in this function before using it here — do not assume it
matches this sketch verbatim.

Add minimal CSS for `.ww-row`/`.ww-tier-badge`/`.ww-matchup`, reusing
`var(--platinum)` for matchup text (matching `.pickem-matchup`'s
established pattern) — do not invent a new visual language.

## VERIFICATION

- `node smoke.js index.html` clean.
- Real page load: confirm the existing "TONIGHT'S PICK" section now
  shows the ranked rows underneath the brief text — report the actual
  rendered output.
- Grep the finished diff for `.score` to confirm zero raw score
  interpolation anywhere in the new code.
- Grep the finished diff to confirm neither `"CRUNCH TIME"` nor
  `"WORTH WATCHING"` (as literal badge text) appears in the new code —
  only `"ELIMINATION"`, confirming the collision was actually avoided,
  not just intended to be avoided.
- Confirm no new `.np-label`/section header was added — this must be
  an extension of the existing section, not a new one.

## DONE CONDITIONS
- [ ] Probe block confirms both citations before editing
- [ ] Ranked rows added inside the existing Tonight's Pick section, no new section/label
- [ ] Only tier 0 gets a badge, using "ELIMINATION" — confirmed via grep that "CRUNCH TIME"/"WORTH WATCHING" don't appear in the new code
- [ ] Confirmed via grep: zero raw `.score` values in the new code
- [ ] CSS reuses `var(--platinum)`, no new visual language invented
- [ ] Real page-load verification reported
- [ ] Smoke clean
- [ ] Outbox explicitly restates both resolved gaps (static-not-live, no new section name) as deliberate, stated choices

## CONFIDENCE SCORING TABLE
+20  Ranked rows correctly folded into the existing section, no new section created
+20  Only "ELIMINATION" used, confirmed via grep that no collision term appears
+20  Confirmed via grep: zero raw score values anywhere in new code
+15  Real page-load verification, not hypothetical
+15  CSS reuses existing patterns
+10  Outbox explicitly documents both resolved design questions

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-worth-watching-display.md (v2).
Fold bundle.pick.ranked into the EXISTING Tonight's Pick section -- do
not create a new section or section title, "What's Worth Watching"
collides with an existing, differently-defined per-card badge. Only
tier 0 gets a badge ("ELIMINATION" -- confirmed not used elsewhere as
badge text); tier 1/2 get no badge, list position conveys order. Never
render raw score anywhere -- confirm via grep. This displays tonight's
slate as of page load, not live-updating -- that's a deliberate,
resolved choice (bootNewspaper is a one-shot fetch, live re-rank would
need new polling work, explicitly out of scope here). Do not commit
unless confidence >= 95. If score < 95, report verbatim and stop.
