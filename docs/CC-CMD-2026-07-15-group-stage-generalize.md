# Claude Code Command — Generalize the WC group-stage renderer beyond WC26

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-group-stage-generalize-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

`renderWCGroups`/`renderWCGroupsEmpty`/`buildRound` (the WC bracket-shell variant, distinct from the real, live `buildRoundBadge`) hold the group-stage/bracket rendering logic. The computational core is already generic — `renderWCGroups`'s own parameters (`standings, matchResults, oddsProbs, liveGames`) carry no WC-specific typing, and the win-probability-bar/tiebreaker-scenario logic already operates on plain data. Three real, hardcoded WC26 assumptions block reuse:

1. `'ABCDEFGHIJKL'.split('')` — hardcoded to exactly 12 groups (WC26's specific 48-team format)
2. `"Top 2 from each group advance · Best 8 third-place teams also advance"` — hardcoded advancement-rule text, specific to WC26's rule
3. `document.getElementById('wc-groups')` — hardcoded target element

Currently unused by any other tournament (`renderWCGroupsEmpty`/`renderWCGroups` are both orphaned per tonight's sweep, despite being tested/working WC26 infrastructure), but Leagues Cup or any future group-stage tournament could reuse this without rebuilding it.

## TASK 0 — Probe

Confirm the real, current signatures and full bodies of all three functions (line numbers will have drifted). Check whether any other real tournament in the codebase (Leagues Cup, US Open Cup, TELUS Canadian Championship — all touched by tonight's other MLS work) has a genuine, real group-stage format that could serve as a second real test case for the generalized version, rather than generalizing speculatively with no second consumer to validate against.

## TASK 1 — Fix

Parameterize the three hardcoded assumptions: group letters/count, advancement-rule text, and target element ID all become real parameters rather than literals. Preserve WC26's own exact current behavior as the default/first real caller — this is a signature change, not a rewrite; WC26 rendering must be provably unchanged before and after.

## TASK 2 — Verify

Real forced-condition test: WC26's own real data, called through the new parameterized signature, produces byte-identical output to the current hardcoded version (non-regression). If TASK 0 found a real second tournament with group-stage structure, a real or realistic test case for it renders correctly through the same generalized function.

## DONE CONDITION

Group-stage rendering is genuinely reusable — group count, advancement rules, and target element are parameters, not literals — with WC26's own current output provably unchanged.

**Confidence scoring:**
- TASK 0 (25 pts): confirms real current implementation, checks for a genuine second real consumer rather than assuming one
- TASK 1 (45 pts): all three hardcoded assumptions correctly parameterized, WC26 behavior preserved as default
- TASK 2 (30 pts): real non-regression test proving byte-identical WC26 output, second-tournament case tested if one was found

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
