# CC-CMD: Smoke coverage sweep — 899 flat through 16+ real changes

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Confirmed directly via `get_smoke_count` (836 + known 63 MCP-undercount
= 899): smoke has been flat at 899 through every real code change
tonight, matching the exact pattern already found and fixed once this
session (890 flat through 6 real changes) — this time at more than
twice the scale, 16+ real, verified, behavior-changing shipments with
zero new assertions:

lead-differential upper bound, write-side monotonicity repair, prompt/
data structural separation (9 sites), deterministic post-generation
leak strip (10 call sites), ranked-slot primitive, card-region claim
primitive, `field:otw_changed_significant`, PM-27 envelope
standardization for `field:all_final`, realID fix + generalization,
bootstrap-collision hardening, WC advancementProb mutation fix,
`saveEspnFinal` internal guard, espnScores display-consumer sweep,
anti-fabrication shared guard, `getGameReasonTags` + its 3-signal
extension.

**Same proven method as the last sweep: mine each fix's own outbox
live-verification proof into a real assertion, don't re-derive from
scratch.** Every one of these already has a real, verified behavior
documented in its own outbox — the work is converting that into a
permanent check, not re-investigating.

## PROBE BLOCK

```bash
git log --oneline -20

ls docs/outbox/ | grep -E "lead-differential|monotonicity|prompt-data|prompt-leak|ranked-slot|card-region|otw-significant|all-final-envelope|realid-fix|realid-bootstrap|wc-advprob|saveespnfinal|espnscores-display|anti-fabrication|game-reason-tags|reason-tags-siloed"
# Confirm the real outbox filename for each — this doc's citations may
# not exactly match. Read each in full before writing its assertion.

grep -n "get_smoke_count\|smoke.js" HANDOFF.md | tail -5
# Confirm current authoritative count and the known MCP-undercount
# delta before and after this sweep.
```

## TASK 1 — One real assertion per fix, mined from its own outbox

For each of the 16 items: read its outbox's actual live-verification
section, and write one `console.assert` (or matching the file's
existing smoke pattern) that checks the real, specific behavior
already proven there — not a generic "function exists" check. Examples
of the right specificity, adjust to what each outbox actually proved:

- Lead-differential ceiling: assert a constructed 2-0-final game with
  an injected 4-run mid-game snapshot produces `maxHomeLead <= 2`.
- Prompt-data separation: assert `stripPromptLeaks` (or the relevant
  restructured prompt builder) rejects/strips the exact leak pattern
  already proven in that outbox.
- Ranked-slot primitive: assert a below-margin challenger does NOT
  replace an existing occupant — the specific case already tested.
- `getGameReasonTags` extension: assert a rival + national-broadcast +
  weather-extreme combination produces all three tags in correct order.

Do not write a shallower assertion than what the outbox already proved
— if the outbox tested 3 cases, the smoke suite should assert the most
diagnostic one, not a weaker version of it.

## TASK 2 — Verify each new assertion actually fails without its fix

For at least 5 of the 16 (spread across different categories — not
all from the same fix), temporarily revert just that fix's core logic
locally, confirm the new assertion actually fails, then restore it.
This proves the assertions are real regression protection, not just
passing decoration. Report which 5 were spot-checked this way.

## TASK 3 — Update the authoritative count

Confirm the real total via `node smoke.js index.html`, update
HANDOFF.md's authoritative count, and note the new `get_smoke_count`
MCP delta (should still be exactly 63 below the real total, per the
tool's known consistent undercount — flag clearly if the delta has
changed, since that would indicate something else worth investigating).

## DONE CONDITIONS

- [x] One real, specific assertion added per fix, mined from that
      fix's own outbox proof — not generic existence checks
- [x] At least 5 assertions spot-verified to actually fail without
      their corresponding fix, spread across different categories
- [x] Authoritative count updated in HANDOFF.md, MCP delta re-confirmed
      or flagged if changed

## CONFIDENCE SCORING

- +40 — all 16 real, specific assertions added, correctly mined from
  each fix's own proof
- +35 — at least 5 spot-checked to genuinely fail without their fix,
  not just assumed to work
- +25 — count updated, delta re-confirmed or any change flagged clearly

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-smoke-coverage-sweep.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
