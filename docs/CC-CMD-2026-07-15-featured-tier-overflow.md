# Claude Code Command — Generic featured-tier + compact overflow for high-volume sports (CFB now, CBB later)

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — display/sectioning logic; if TASK 0 finds `curatedRank` needs normalizing at the adapter layer, that's field-relay-nba and should be flagged, not silently built here)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-featured-tier-overflow-2026-07-15.md. Commit the outbox manifest with `[skip ci]` in the message.

## CONTEXT

CFB can have 60-130+ games on one Saturday (FBS alone). No existing FIELD mechanism caps or paginates a section's card count — `_gameImportance` is a stakes-badge for playoff drama (elimination, series_deciding, clinch), not a volume-management tool, and even NFL's 16-game Sunday has never needed one. This needs to be genuinely generic, not CFB-specific — the same volume problem applies to college basketball, confirmed not yet built as an adapter but coming later, and the design should not need rebuilding when it lands.

**Real, confirmed-live data this design is grounded in, both checked tonight:**
- ESPN's `curatedRank: {current: N}` sits directly on each competitor object for CFB (`site.api.espn.com/.../football/college-football/scoreboard`), 1-25 for ranked teams, 99 for unranked — confirmed via a real live query.
- The identical field, identical shape, confirmed on a real historical college-basketball query (`.../basketball/mens-college-basketball/scoreboard`) — Michigan Wolverines `curatedRank: {current: 3}` on a real March 2026 date. This is a genuine ESPN-wide convention for ranked-sport competitors, not something specific to one sport's payload — the generic design is justified by this, not just assumed.

**Explicit design tension to preserve, not accidentally erase:** a pure "only show ranked teams" filter would be the wrong instinct for FIELD specifically — it would reintroduce exactly the "only the hyped game matters" bias the existing Scout's Pick / Anti-Hype system exists to counter, just relabeled as objective. Ranking must be one way *into* the featured tier, not the only way, and not a hard filter on what exists at all.

## TASK 0 — Probe

```bash
grep -n "_gameImportance\|isScoutsPick\|isTopPick\|function buildSectionHTML" index.html
```
Read the real, current section-rendering function(s) in full before designing around them. Confirm whether `curatedRank` (or an equivalent) is already threaded from the relay's CFB adapter through to the client's game objects, or whether TASK 1 needs to add that plumbing — do not assume either way. If the relay doesn't currently forward it, this needs a small relay-side companion CC-CMD (flag it explicitly in the outbox; do not silently build relay-side changes into a jubilant-bassoon-scoped dispatch).

## TASK 1 — Build the generic mechanism

**Featured-tier promotion** — a game promotes to the full-card featured section if *any* of: either team's rank (generic field, not CFB-hardcoded — confirm the real field name TASK 0 finds or establishes) is ≤25, the existing Scout's Pick trigger fires, or the game involves a MY_TEAMS team. Reuse these three signals; don't invent a fourth unless TASK 0 finds a real gap none of them cover.

**Compact overflow list** — a new, generic, reusable rendering function (not CFB-specific naming) for everything not promoted: team names, start time/score, no full card treatment — closer to a schedule strip than the existing card grid. Collapsed by default below the featured section, expandable on tap. Any sport section can call this when its game count exceeds a real, sensible threshold — pick one based on the real CFB volume already observed (99 real events on a real recent date, confirmed tonight) rather than an arbitrary round number, and document the reasoning.

**Ranking badge** — a small `#N` tag on featured cards for ranked teams, reusing `_gameImportance`'s existing badge-rendering pattern rather than inventing new card chrome.

Wire this for CFB now (the adapter that exists). Do not build a college-basketball adapter or any CBB-specific wiring — the mechanism should be ready for it, not preemptively applied to a sport with no real data source yet.

## TASK 2 — Verify

- Full-file script-block parse: clean.
- Real forced-condition test using the real CFB data shape confirmed tonight: a slate with ranked, Scout's-Pick-eligible, MY_TEAMS, and plain unranked games correctly sorts into featured vs. overflow.
- Confirm a sport section with a normal, low game count (e.g., NFL's real 16) renders exactly as before — this mechanism should be inert until a section's count crosses the real threshold, not change existing behavior for sports that don't need it.
- `node smoke.js index.html`: same pass count plus new assertions for the added behavior.

## DONE CONDITION

A generic featured-tier + compact-overflow mechanism exists, wired for CFB today, verified against real ESPN data shapes (including the cross-sport CBB shape check from tonight, proving the generic design is justified). Existing low-volume sports render unchanged. Ranking is one promotion signal among three, not a hard filter — Scout's Pick and MY_TEAMS can still surface an unranked game.

**Confidence scoring:**
- TASK 0 (25 pts): reads real current section-rendering code, confirms whether relay-side plumbing is needed and flags it rather than silently building it
- TASK 1 (45 pts): generic mechanism (not CFB-hardcoded naming), three real promotion signals reused/added correctly, overflow threshold reasoned from real observed volume, CFB wired without a premature CBB build
- TASK 2 (30 pts): real forced test covering all four promotion cases, non-regression on a real low-volume sport confirmed, smoke count confirmed

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
