# Claude Code Command — Build the CFB (and future CBB) schedule section-injection pipeline

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-cfb-section-injection-2026-07-15.md.

## CONTEXT — real gap found while executing CC-CMD-2026-07-15-featured-tier-overflow

That CC-CMD built a generic featured-tier + compact-overflow rendering mechanism, wired into `renderAll()`'s existing per-section loop so it applies automatically to any section (present or future) whose game count crosses `FEATURED_TIER_OVERFLOW_THRESHOLD`. It's genuinely generic and live in the shared render path today.

**A real, deeper gap found while verifying it, beyond what that CC-CMD's own scope anticipated:** CFB games never reach `allData.sports` (the schedule/card-section data `renderAll()` actually renders) at all today. Confirmed three ways:

1. `fetchV2AllScores()` (the generic V2 poll loop covering `cfb` via `FIELD_V2_SOURCES`) only ever writes to `espnScores[key]` (the score-lookup store used by bottom sheets/badges for games that already have a *schedule* card) — it never creates new `allData.sports` entries for any sport.
2. WC26 is the *only* sport with a dedicated section-injection block (`_wcSectionInjected`, ~L18673-19010) that splices a new section into `allData.sports` from V2 poll data. No equivalent exists for CFB (or NFL) — confirmed via `grep -n "FIELD_V2_SOURCES\.\(nfl\|cfb\)"` returning zero hits outside the enable-flag object itself.
3. `FIELD_V2_SOURCES.cfb` is itself date-gated off until `2026-08-29T00:00:00Z` (correctly, off-season) — so this has never been observable as a live gap in production; it would only surface once the CFB season starts and someone expects games to actually appear.

**Net effect:** the relay's CFB adapter (`adaptESPNFootball`, confirmed real and working) and the client's `V2_SPORTS_ENABLED.cfb` date-gate both exist, but nothing between them ever turns a fetched CFB game into a renderable `allData.sports` entry. The featured-tier/overflow mechanism is correctly wired and ready, but has nothing to apply to for CFB until this pipeline is built. This is a separate, larger piece of missing infrastructure than "add a display split to an existing render path" — flagged here rather than silently built into the featured-tier-overflow dispatch, per that CC-CMD's own repo-scope note about not silently building out-of-scope changes.

## TASK 0 — Probe

```bash
grep -n "_wcSectionInjected" index.html
grep -n "FIELD_V2_SOURCES\.cfb\|FIELD_V2_SOURCES\.nfl" index.html
```
Read the full WC26 section-injection block (~L18935-19010) in detail — it's the direct template to mirror. Confirm whether `CC-CMD-2026-07-15-cfb-curatedrank-relay.md` (relay-side, separate repo) has landed yet; if not, this CC-CMD can still proceed (the pipeline should thread `fg.home.curatedRank`/`fg.away.curatedRank` through defensively — `?? null` — so it's a safe no-op today and picks up real rank data automatically once the relay ships it, matching `isFeaturedTierGame`'s own existing defensive pattern).

## TASK 1 — Build

Mirror the WC26 pattern: a `_cfbSectionInjected` flag, idempotent first-injection + subsequent-poll-merge branches, gated on `FIELD_V2_SOURCES.cfb`. Build the schedule game object with `home`/`away` as plain name strings (matching every other section's convention `renderAll()` expects), plus `homeCuratedRank`/`awayCuratedRank` threaded from `fg.home.curatedRank`/`fg.away.curatedRank` (both `?? null` if absent — do not invent placeholder rank data). Section label should be genuinely generic in the underlying function signature (parameterized by sport key/label), even though this task only wires CFB — matching the featured-tier-overflow CC-CMD's own precedent of building generic mechanisms ready for CBB without prematurely building a CBB adapter.

## TASK 2 — Verify

Real forced-condition test using the real ESPN CFB shape confirmed tonight: a synthetic `fetchV2Games('cfb', ...)` response with `home.curatedRank`/`away.curatedRank` populated → the resulting `allData.sports` entry carries `homeCuratedRank`/`awayCuratedRank` correctly, and `isFeaturedTierGame` (from featured-tier-overflow) correctly promotes it. Confirm idempotent re-injection (a second poll cycle merges into the existing section rather than duplicating it, mirroring WC26's own dedup logic). `node smoke.js index.html`: same pass count plus new assertions. Live end-to-end verification isn't possible until CFB season starts (Aug 29) — state that plainly per this repo's own Rule 61 (STAGED, not SHIPPED) rather than asserting a live render that can't happen yet.

## DONE CONDITION

CFB games fetched via the existing V2 poll loop become real `allData.sports` card entries the moment the season's date-gate opens, with `homeCuratedRank`/`awayCuratedRank` threaded through so `isFeaturedTierGame` (already built and wired) can actually promote/demote them. Generic enough that a future CBB adapter can reuse the same injection function, not rebuild it.

**Confidence scoring:**
- TASK 0 (25 pts): reads the real WC26 template in full, confirms the relay-side curatedRank dependency status honestly rather than assuming
- TASK 1 (45 pts): mirrors the real WC26 pattern correctly, threads rank defensively, genuinely generic (not CFB-hardcoded) function signature
- TASK 2 (30 pts): real forced test using the real confirmed shape, idempotency confirmed, live-verification limitation honestly disclosed (STAGED per Rule 61, not asserted as SHIPPED)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
