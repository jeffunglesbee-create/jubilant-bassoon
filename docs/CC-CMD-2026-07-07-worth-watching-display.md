# CC-CMD: Display "What's Worth Watching" — the ranked list, finally

**Date:** 2026-07-07
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

**Source:** `bundle.pick.ranked` has been computed and served, correctly
tier-ordered, by the relay since `0bf2ea4` — and has had zero client
code reading it since. Deferred across all three Field's Pick CC-CMDs
(`fields-pick-ranked-list.md`, `fields-pick-tiered-ranking.md`,
`fields-pick-tier-upgrade.md`) as explicitly out of scope each time.
This is that deferred piece, finally picked up.

**The RUWT-compliance floor, restated precisely for this specific
task:** the raw-number-display prohibition (`ADR-002-CONTEXT.md`, "What
is PROHIBITED" #3) is untouched by anything this session changed. This
CC-CMD must never render `ranked[n].score` to the user. `tier` is safe
to use — it's already a named integer bucket, not the raw scalar — but
must be translated to an existing, established qualitative label, not
displayed as a number either.

**Reuse existing vocabulary, do not invent new labels** — confirmed
real, already-used elsewhere in this file:
- Tier 0 → `"ELIMINATION"` (`index.html:9793`, `:26688` — existing tier
  name)
- Tier 1 → `"CRUNCH TIME"` (`index.html:1226`, `:6934` — existing badge
  language)
- Tier 2 → no special badge, plain listing

## PROBE BLOCK
```bash
sed -n '22083,22091p' index.html
```
Confirm this still matches — the existing "Tonight's Pick" section,
insertion point for the new section immediately after it.

## TASK — Add a "What's Worth Watching" section

Insert immediately after the existing Tonight's Pick block (after line
~22090):
```javascript
// 5b. What's Worth Watching — the relay's tier-ordered ranked list.
// Never render raw score. tier -> existing named label only.
if (Array.isArray(bundle.pick?.ranked) && bundle.pick.ranked.length) {
  const tierLabel = t => t === 0 ? 'ELIMINATION' : t === 1 ? 'CRUNCH TIME' : '';
  const rows = bundle.pick.ranked.map(g => {
    const label = tierLabel(g.tier);
    const badge = label ? `<span class="ww-tier-badge">${label}</span>` : '';
    return `<div class="ww-row">${badge}<span class="ww-matchup">${esc(g.away)} @ ${esc(g.home)}</span></div>`;
  }).join('');
  parts.push(`<div class="np-section np-worth-watching"><div class="np-label">WHAT'S WORTH WATCHING</div>${rows}</div>`);
}
```
Use the existing `esc()` helper already used elsewhere in this function
for team names (confirm its exact name/signature in this file before
using it — do not assume it matches this sketch verbatim).

Add minimal CSS for `.ww-row`/`.ww-tier-badge`/`.ww-matchup`, matching
the existing visual pattern used for `.pickem-row`/`.pickem-matchup`
(same font sizes, same `var(--platinum)` for matchup text — reuse, do
not invent a new visual language for what is conceptually the same kind
of row).

## VERIFICATION

- `node smoke.js index.html` clean.
- Load the real page, confirm "WHAT'S WORTH WATCHING" renders with real
  data from a real `/analytics/newspaper` fetch — report the actual
  rendered output, not a hypothetical.
- Grep the finished diff for `.score` and `ranked[` to confirm no raw
  score value is interpolated into any template string anywhere in the
  new code — this is the one thing that must not slip through.
- Confirm existing sections (Tonight's Pick, Preview, Streak Board)
  are visually unaffected — this is a pure addition.

## DONE CONDITIONS
- [ ] Probe block confirms citation before editing
- [ ] Section added using real `bundle.pick.ranked`, tier-labeled with existing vocabulary
- [ ] Confirmed via grep that no raw `.score` value appears anywhere in the new template code
- [ ] CSS reuses existing `--platinum`/row patterns, no new visual language invented
- [ ] Real page load confirms actual rendered output
- [ ] Existing sections confirmed unaffected
- [ ] Smoke clean

## CONFIDENCE SCORING TABLE
+30  Section correctly reads and renders real `ranked` data
+25  Confirmed via grep: zero raw score values anywhere in new code
+20  Tier labels use existing, real vocabulary, not invented terms
+15  Real page-load verification, not hypothetical
+10  Smoke clean, existing sections unaffected

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-worth-watching-display.md. Add a
"What's Worth Watching" section rendering bundle.pick.ranked, immediately
after the existing Tonight's Pick section. Tier 0/1 get existing,
real badge labels ("ELIMINATION"/"CRUNCH TIME") -- never render the raw
score anywhere, confirm this via grep on the finished diff. Reuse
existing CSS patterns (var(--platinum), .pickem-row-style layout), do
not invent new visual language. Verify against a real page load. Do
not commit unless confidence >= 95. If score < 95, report verbatim and
stop.
