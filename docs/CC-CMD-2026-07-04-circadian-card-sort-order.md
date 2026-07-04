# CC-CMD: Implement the original circadian card sort order (PRIME > NIGHT > PREVIEW > LATE) — deferred since v2.1, never picked up

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One insertion point (~index.html:10704, inside `renderAll`'s
section-map, before the per-card `cards=games.map(...)` step).

**Why — real, confirmed gap, my own dropped item, not new work:**
The original circadian spec (quoted verbatim in this session's own
`CC-CMD-2026-07-04-circadian-visual-treatment.md` SCOPE BOUNDARY) called
for card sort order: "PRIME first, then NIGHT, then PREVIEW, then LATE"
— live games surfaced above recently-finished, above upcoming, above
stale. That CC-CMD explicitly deferred it ("a separate, distinct piece
of work, not in scope here") and no CC-CMD across the entire session's
circadian arc (v2.1 → v2.2 → v2.3 → visual-treatment → voice-late-gap-
fix) ever picked it up. Confirmed via direct code read: `games=sec.games
||[]` (index.html ~10704) flows straight into `games.map((g,gi)=>{...})`
(~10708) with zero `.sort()` call anywhere between them. Cards currently
render in whatever order the source schedule/API returned, with no
circadian-aware reordering at all — meaning a stale `LATE` card can sit
visually above a live `PRIME` card within the same sport section,
undercutting the actual point of the circadian classification work.

**Confirmed via three checks before concluding this was real and
complete (not a partial read):**
1. Only 3 real call sites of `getCardCircadian` exist (`getNewspaperVoice`,
   `renderAll`'s per-card loop ~10737, `CARD_ATTRIBUTE_SYNC` ~21112) —
   none feed a sort comparator.
2. Grep across index.html + all circadian CC-CMD docs for "PRIME first"/
   "sort order"/circadian+sort finds only the one SCOPE BOUNDARY line —
   no implementation anywhere.
3. Direct read of the render loop confirms `games` is consumed in raw
   source order with no `.sort()` between the section filter and the
   card map.

**Target time:** ~30 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
grep -n "const games=sec.games" index.html
grep -n "^function getCardCircadian" index.html
grep -n "typeof findESPNScore==='function'?findESPNScore(g):null" index.html
```
Re-confirm the exact current line numbers and that `findESPNScore` and
`getCardCircadian` still have the same signatures this doc describes —
this file changes daily.

## TASK 1 — Sort games within each section by circadian tier, before the render map

Find (index.html ~10703-10705, re-verify):
```javascript
  const _renderAllHTML = filtered.map((sec,si)=>{
    const games=sec.games||[];
    if(!games.length) return "";
```
Insert a sort immediately after the length check, before any other
per-section logic:
```javascript
  const _renderAllHTML = filtered.map((sec,si)=>{
    const games=sec.games||[];
    if(!games.length) return "";
    // Circadian sort order (CC-CMD-2026-07-04-circadian-card-sort-order):
    // the original spec's "PRIME first, then NIGHT, then PREVIEW, then
    // LATE" -- deferred since the v2.1 circadian CC-CMD, never
    // implemented until now. Scoped to WITHIN each sport section only
    // (does not merge/reorder across sections) -- a stale LATE MLB game
    // should not jump above a live PRIME NHL game in a DIFFERENT
    // section; it should only be reordered relative to other games in
    // its OWN section. Stable sort (spec-guaranteed since ES2019):
    // games within the same tier keep their existing relative order,
    // only cross-tier ordering changes.
    const _CIRCADIAN_SORT_RANK = { PRIME: 0, NIGHT: 1, PREVIEW: 2, LATE: 3 };
    games.sort((a, b) => {
      const aEData = typeof findESPNScore === 'function' ? findESPNScore(a) : null;
      const bEData = typeof findESPNScore === 'function' ? findESPNScore(b) : null;
      const aTier = getCardCircadian({ state: aEData ? aEData.state : null, status: a.status, _aflComplete: a._aflComplete, _id: a._id });
      const bTier = getCardCircadian({ state: bEData ? bEData.state : null, status: b.status, _aflComplete: b._aflComplete, _id: b._id });
      return (_CIRCADIAN_SORT_RANK[aTier] ?? 4) - (_CIRCADIAN_SORT_RANK[bTier] ?? 4);
    });
```
**Note the `_circInput` construction here is deliberately identical to**
**the one already used inside the per-card loop (~10736)** — same two
fields sourced from `findESPNScore`, same two fields sourced directly
from the game object. Do not invent a different shape. The per-card
loop will recompute this again for its own rendering purposes (cheap —
`findESPNScore` is an existing hot-path lookup already called on every
render) — this is intentional duplication for clarity, not a bug to
"optimize away" by threading a precomputed tier through.

## TASK 2 — Verify this composes safely with Phase 1/2 DOM reconciliation

**This is not optional — a real, new interaction to check, not assumed
safe.** Today's card-level DOM reconciliation (`applyMainHTML`, Phase 2)
reuses existing DOM nodes when a card's computed `outerHTML` is
byte-identical to what's already rendered, matched by `data-gameid`.
Reordering the underlying `games` array changes which POSITION each
card's HTML appears at in the string passed to `applyMainHTML`, but the
reused/matched DOM NODE OBJECT is the same one from before. Confirm via
live test (not just code review) that when a game's circadian tier
changes across a poll cycle (e.g., a game goes from PREVIEW to PRIME
between two live polls), its card visibly MOVES to its new sorted
position — not just that its content stays correct. `main.replaceChildren
(...tmp.children)` takes an explicit ordered list, so this should work
correctly by construction, but state that explicitly as a verified
conclusion, not an assumption, after checking.

## TASK 3 — Smoke assertions

```javascript
smoke.assert(!!html.match(/_CIRCADIAN_SORT_RANK\s*=\s*\{\s*PRIME:\s*0,\s*NIGHT:\s*1,\s*PREVIEW:\s*2,\s*LATE:\s*3\s*\}/), 'A[NEXT]: circadian card sort rank map exists with the spec-correct tier order');
smoke.assert(!!html.match(/games\.sort\(\(a, b\) => \{/), 'A[NEXT+1]: games are sorted by circadian tier before the per-card render map');
```
(CC: assign real sequential A-numbers; verify both regexes actually
match your real committed code before trusting them.)

## SCOPE BOUNDARY

DO:
- Add the sort exactly as specified, scoped to within each section's `games` array
- Verify (Task 2) the DOM reconciliation interaction live, not just by code review
- 2 smoke assertions
- Bump SW_VERSION

DO NOT:
- Reorder or merge games ACROSS different sport sections — sort stays scoped within one section's `games` array only
- Modify `getCardCircadian`, `findESPNScore`, `getNewspaperVoice`, or `applyMainHTML` — this task only adds a sort call, it doesn't change any classification or rendering logic
- Add any tie-breaking logic beyond the stable-sort default (e.g., do not sort same-tier games by start time, score margin, or anything else) — same-tier games keep their existing relative order, full stop
- Apply this sort to any other array/render path in the file beyond this one `renderAll` section-map

## DONE CONDITIONS
- [ ] Probe block re-run, exact current line numbers confirmed
- [ ] Sort added exactly as specified, scoped correctly per-section
- [ ] Task 2's DOM-reconciliation interaction verified live (a game changing tier across polls visibly moves position) — reported as a checked conclusion, not assumed
- [ ] Confirmed via code read: no other function touched
- [ ] `node smoke.js index.html` exits 0 with both new assertions green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-circadian-card-sort-order-{date}.md`, explicitly recording the live tier-change-reorder observation

## COMPLIANCE
- Rule 47/ADR-002/RUWT: pure display-ordering change, no new composite scores, no interest values, no change to what's fetched or classified
- Rule 68: probe block first
- Rule 87: self-completing on the CC-verifiable portion; Task 2's live observation is part of this CC-CMD's own required verification, not deferred to chat, since it's checkable within this session

## CONFIDENCE SCORING TABLE
+30  Sort added exactly as specified, correctly scoped per-section, stable ordering preserved within tiers
+30  Phase 1/2 DOM reconciliation interaction verified live, not assumed
+20  Smoke 2/2 green
+20  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-circadian-card-sort-order.md.
Re-confirm the exact current line numbers via PROBE BLOCK. Add the
games.sort() call exactly as specified, scoped within each section only
-- do not reorder across sections, do not add tie-breaking beyond stable
sort. Verify live (not just by code review) that a game changing
circadian tier across polls visibly moves to its new sorted position,
confirming this composes safely with the Phase 1/2 DOM reconciliation.
Do not commit unless confidence ≥ 95. If score < 95 report verbatim and
stop — do not invent results.
