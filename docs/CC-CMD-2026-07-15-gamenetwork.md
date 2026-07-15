# Claude Code Command — Resolve gameNetwork's disposition (real history, unresolved since June)

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull.

Write findings to docs/outbox/cc-gamenetwork-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

`gameNetwork` (index.html, "field_utils.js functions inlined" block) is a real, deliberately-built function — part of the original June 5 2026 `field_utils.js` engine export list, not accidental. It's been independently confirmed a genuine orphan three separate times now: the original tree-sitter sweep, `string-referenced-verify`'s Category D (zero real callers, its 3 sibling functions from the same inlined block — `shiftTime`/`parseMatchweek`/`dramaTier` — all have multiple real call sites), and this session's own AST call-graph tool (zero real CALLS or REFS).

**Real historical context, found via chat search, not previously connected to tonight's investigation:** a June 15 2026 session was already auditing this exact function, running:
```
echo -n "streams?.[0]?.label (should use gameNetwork): " && grep -c "streams\?\.\[0\]\?\.label" index.html
```
— meaning `gameNetwork` was built specifically to replace a scattered inline pattern (`streams?.[0]?.label`) for reading broadcast network info, and someone was already checking whether that consolidation had happened. **That inline pattern no longer exists anywhere in the current codebase either** (confirmed live tonight: 0 occurrences) — so this isn't simple neglect. Either a different mechanism now handles stream/network display (matching the `normalizeApiFootballStats`/`buildStatOfDayBadge` shape found earlier tonight — a different solution won independently), or the feature itself no longer exists in the form it did in June.

## TASK 0 — Find the real, current mechanism

Determine how broadcast network info is actually displayed today, if at all. Search for how `streams`-shaped data is currently read/rendered (the data shape itself may have changed since June — check, don't assume it's still `streams[0].label`). If a different real mechanism exists, confirm what it is and whether it's a genuine functional equivalent to what `gameNetwork` computes, or something different enough that `gameNetwork` still has a real, non-duplicate use.

## TASK 1 — Fix, branching on TASK 0's real finding

**If a different real mechanism already covers this:** `gameNetwork` is genuinely superseded — remove it, following the established convention from tonight's `orphan-cleanup-dead`/`never-adopted-utilities-disposal` dispatches.

**If no real mechanism exists and broadcast network info is genuinely missing from the UI today:** wire `gameNetwork` into a real display location, following whatever pattern its 3 live siblings (`shiftTime`/`parseMatchweek`/`dramaTier`) use for their own real integration points as a model.

## TASK 2 — Verify

If removed: confirm zero regression via `node smoke.js index.html`, confirm the real current mechanism (if one exists) genuinely covers what `gameNetwork` would have. If wired: real forced-condition test with real game/stream-shaped data proving it renders correctly.

## DONE CONDITION

`gameNetwork`'s disposition matches real, current evidence about how (or whether) broadcast network info is actually displayed — not just "it's an orphan, remove it" without checking what happened to the feature it was built for.

**Confidence scoring:**
- TASK 0 (45 pts): finds the real current mechanism (or confirms none exists) with real evidence, checks whether the data shape itself changed since June
- TASK 1 (35 pts): correct branch taken based on real evidence
- TASK 2 (20 pts): real verification matching whichever branch was taken

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
