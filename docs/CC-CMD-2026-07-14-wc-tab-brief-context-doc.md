# Claude Code Command — Document wc-tab-brief's deliberate context exclusion

**Date:** 2026-07-14
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-wc-tab-brief-context-doc-2026-07-14.md. Commit the outbox manifest with `[skip ci]` in the message.

## CONTEXT

`wc-tab-brief` (index.html, `JOURNALISM_ENQUEUE_RELAY` call site, ~L34285, "FIELD World Cup Today" brief) sends no `home`/`away`/`matchupNote` to the enqueue relay, unlike the other three real enqueue call sites (Scout's Pick, Finals Desk, Night Owl), which were each fixed under their own CC-CMDs this month specifically because Dimensions 7+10 (Context Anchoring + Matchup Depth, 55/300) are structurally unreachable without this data. `wc-tab-brief` is a multi-game slate summary (`gameLines.map()` across the day's full WC schedule) — the same shape as the relay's own `cron-slate` path, which deliberately passes `sport: null` with no single-game context, correctly documented as such in that code. `wc-tab-brief` has the same structural shape but no equivalent documentation — this CC-CMD's job is to confirm that reasoning holds and state it explicitly, matching the existing pattern, not to add game context where no single game exists to anchor it to.

## TASK 0 — Probe

```bash
grep -n "briefType:\s*'wc-tab-brief'" index.html
```
Read the full call site fresh — confirm it is still genuinely multi-game (not narrowed to a single game since this doc was written) before assuming the exclusion is still correct.

## TASK 1 — Document, don't change behavior

Add a comment immediately above this call site's `body: JSON.stringify({...})`, matching the tone and specificity of the existing `cron-slate`/Scout's-Pick/Finals-Desk comments already in this codebase: state plainly that this is a deliberate exclusion (multi-game slate summary, no single game to anchor Dimensions 7/10 to), not an oversight, and reference this CC-CMD by name the way sibling comments do. Zero behavior change — this task adds documentation only.

## TASK 2 — Verify

- `node smoke.js` (or the repo's real current equivalent smoke command): confirm no regression, same pass count as before this commit.
- Confirm via `git diff` that the only change is the added comment — no functional lines touched.

## DONE CONDITION

The exclusion is explicitly documented with real, specific reasoning, matching the existing convention for deliberate multi-game exclusions elsewhere in this file. Zero behavior change, confirmed via diff and smoke count.

**Confidence scoring:**
- TASK 0 confirms the call site is still genuinely multi-game before proceeding (30 pts)
- TASK 1 comment added, matches existing convention, zero functional change (40 pts)
- TASK 2 real smoke/diff verification, not asserted (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
