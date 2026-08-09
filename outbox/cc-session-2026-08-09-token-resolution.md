# Token resolution — park badge vs condition tags (2026-08-09)

## The blocker, and why it had no answer

Both follow-ups stalled on: *"which `COLOUR-SYS-A` token does a park
factor badge take?"* Nothing fits. Every candidate is already reserved:
`--caution` = something to know before deciding; `--sport-epl` = English
football; `--access-free` = free/discovery; `--drama-*` = priority tiers.

The question has no answer because **it assumes park factor belongs on
the priority axis. It does not.**

## The reframe

`COLOUR-SYS-A`'s own principle section states the test and the answer in
one line:

> *"gold means pay attention, teal means discovery, amber means caution,
> **smoke means honest low-stakes information**."*

and SMOKE's definition: *"low stakes, honest, no drama, skeptical
register."*

A park factor is **honest contextual information**. It is not urgent, not
free, not a caution, not a discovery. It is exactly what smoke is for.
**`--smoke` / `--drama-low` (`#6a6a8a`). No new token. No sign-off.**

## The second half: colour was doing work the text already does

Four variants exist — `park-hitter`, `park-hitter-extreme`,
`park-pitcher`, `park-pitcher-extreme` — encoding **direction and
intensity in hue**. That is what produced the violation:

- green on `park-hitter` reads as *go / free* (teal-green is reserved for
  free access + discovery)
- amber on `park-hitter-extreme` reads as *caution* (reserved for
  "something to know before deciding")

Neither is what a hitter-friendly park means. The colours were saying
something false, globally, under a spec that reserves meanings globally.

**The badge text already carries direction.** This is ADR-002's own
principle — *"every consumer reads a named tier, never a raw number"* —
applied to colour: the name does the work. Spending four reserved colour
meanings on one factual, non-priority attribute is the actual bug.

**Resolution: all four park variants collapse to `--smoke`.
Differentiation stays in the text.**

## Which also answers the other CC-CMD, cleanly

The two badge families split on one question — *is this a priority
signal?*

| family | example | priority? | token |
|---|---|---|---|
| **drama condition tags** | `[GOALIE DUEL]`, `[CRUNCH TIME]`, `[HIGH SCORING]` | **yes** — from `_otwGetLiveTier` | `--drama-must` / `--drama-watch` / `--drama-low` per the tier mapping |
| **contextual badges** | `[HITTER PARK]`, park factor | **no** — factual context | `--smoke` |

Gold's usage list already names *"CRUNCH TIME pulse"* and *"OTW FIRE
state"*, so the drama side needs no new decision either.

## Honest tradeoff, stated not buried

Four hues become one. That is a **real reduction in visual
differentiation** on park badges, and it should be a conscious choice
rather than a side effect. The argument for it: the differentiating
information survives in the text, and the four hues were each asserting a
global meaning that was false. A spec whose whole premise is *"users
build intuition because colour means one thing"* is not served by four
borrowed meanings on one badge.

**This is a design decision with a visible consequence. It is the
spec-compliant one, but it is Jeff's to accept or reject.** If rejected,
the alternative is defining a park-factor token family under Rule 37 with
meaning + non-confusion + sign-off — which is a governance change, not an
implementation detail.

## Effect on the two open CC-CMDs

- `park-badge-token-compliance` — **unblocked**. Task 2's "decide per
  rule" resolves to: all four → `--smoke`.
- `condition-tag-badge-styling-v2` — **unblocked**. Its Task 1 blocking
  question is answered: park factor is not a drama tier, takes `--smoke`;
  the drama condition tags keep the tier mapping.

Neither needs a new token, so neither needs governance sign-off — only
acceptance of the tradeoff above.
