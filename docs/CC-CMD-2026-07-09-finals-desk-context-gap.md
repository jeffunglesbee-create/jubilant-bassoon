# CC-CMD: finals-desk has the identical enqueue-context-gap bug, never checked

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — relay side already handles
this correctly for any caller, per CC-CMD-2026-07-09-enqueue-context-gap TASK 3)

**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Found via a Rule 89 repo-radius sweep applied properly against tonight's
already-shipped enqueue-context-gap fix — the sweep the original fix
should have included and didn't, since it stopped at the two call sites
(`night-owl`, `scouts-pick`) the triggering A/B test happened to name,
rather than checking every `JOURNALISM_ENQUEUE_RELAY` caller sharing the
same `scoreThreshold`-hardcoding pattern.

`finals-desk-nba`/`finals-desk-nhl`'s enqueue call (~line 33978) has a
real, single `game` object in scope — `game.league` is referenced
directly, and `_buildFinalsDeskPrompt(game, sport)` is built from it —
but the JSON body sent to `JOURNALISM_ENQUEUE_RELAY` carries only
`prompt, sport, briefType, max_tokens, scoreThreshold`. No `home`,
`away`, `homeScore`, `awayScore`, or `matchupNote`, despite `game`
being right there. This is the identical bug fixed tonight for
night-owl/scouts-pick: Context Anchoring (25 pts) and Matchup Depth (30
pts) are structurally unreachable for every finals-desk brief, right
now, in production — the relay's queue consumer already correctly
reads these fields (confirmed shipped, `field-relay-nba` TASK 3), it's
purely that this one caller never sends them.

**`wc-tab-brief` confirmed NOT affected, verified not assumed:** its
comment states "relay injects WC team context at prompt time," and its
prompt is built from `gameLines.map(...)` — a multi-game slate,
architecturally the same shape as the `slate` brief type
(`sport: null // slate brief covers multiple sports`). There is no
single `home`/`away`/score to send. Do not touch this call site.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "briefType: /nba/i.test" -B15 index.html
# Re-confirm the exact current enqueue body and what fields `game`
# genuinely exposes at this call site — do not assume the same field
# names (`home`/`away`/`homeScore`/`awayScore`) apply without checking,
# `game.league` is confirmed but the score/team-name field names on this
# specific object were not directly verified in this doc, only inferred
# from the sibling night-owl/scouts-pick fix's shape.

grep -n "function _buildFinalsDeskPrompt" -A15 index.html
# Confirm what data this function actually pulls from `game` — reuse
# exactly that, don't fetch anything new.

grep -rn "JOURNALISM_ENQUEUE_RELAY" index.html
# Full repo-radius sweep, done properly this time: enumerate every
# caller, not just the ones already known. Report each as fixed,
# confirmed-exempt-with-reason (matching wc-tab-brief's precedent), or
# newly found and requiring the same fix — do not stop at finals-desk
# alone if a fourth caller exists that this doc didn't anticipate.
```

## TASK 1 — Send game/matchupNote at finals-desk's enqueue call

Add `home`, `away`, `homeScore`, `awayScore` (from whatever `game`
genuinely exposes per the probe, not assumed field names) and
`matchupNote` (construct from whatever context `_buildFinalsDeskPrompt`
already uses — reuse, don't fetch new data) to the enqueue body.

## TASK 2 — Complete the repo-radius sweep properly

If the probe's full `JOURNALISM_ENQUEUE_RELAY` enumeration finds any
caller beyond `night-owl`, `scouts-pick` (already fixed), `wc-tab-brief`
(confirmed exempt), and `finals-desk` (this doc's fix) — report it
explicitly in the outbox as fixed, exempt-with-reason, or a new,
separate finding requiring its own follow-up. Do not let a fifth caller
go unchecked the same way finals-desk did.

## TASK 3 — Live verification

Same methodology as tonight's proven approach: real POST to
`JOURNALISM_ENQUEUE_RELAY` with real finals-desk data, poll to
completion, confirm via the response's score breakdown (reuse the
`breakdown`/`_diag` pattern already proven tonight) that
`contextAnchoring`/`matchupDepth` are genuinely non-zero — not inferred
from a higher total score alone.

## DONE CONDITIONS

- [x] finals-desk sends real game/matchupNote data, field names
      confirmed via probe not assumed
- [x] Full `JOURNALISM_ENQUEUE_RELAY` caller list swept, every one
      accounted for explicitly
- [x] Live test proves Context Anchoring/Matchup Depth are genuinely
      reachable, not inferred

## CONFIDENCE SCORING

- +35 — finals-desk correctly sends real data, field names verified not assumed
- +25 — full caller sweep completed, every instance explicitly accounted for
- +40 — live test proves the dimensions are genuinely scoreable now, not inferred

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-finals-desk-context-gap.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
