# CC-CMD-2026-09-12 — the debrief's odds layer renders a MUST/HOT/QUIET tier

Raised while executing `CC-CMD-2026-09-11-client-odds-story`. **Not fixed there
and not fixed here** — it is pre-existing code outside that task's scope
(Rule 69), and the judgement it needs is not mine to make alone.

## What is there

`src/debrief/index.ts:139` `buildOddsStory()`:

```ts
const scenario = !favWon ? 'UPSET' : (margin <= 1 || wentToOT) ? 'SWEAT' : 'CHALK';
labelRow.appendChild(_fieldChip!(scenario,
  scenario === 'UPSET' ? 'MUST' : scenario === 'SWEAT' ? 'HOT' : 'QUIET',
  { small: true }));
```

It takes the opening moneyline, the final score, the margin and `wentToOT`,
reduces them to one of three labels, and renders that label as a **chip** whose
variant vocabulary is `MUST` / `HOT` / `QUIET`.

## Why this is worth a decision rather than a shrug

The ADR-002 / Rule F test, as `ODDS-PROOF.md` states it, clears a bookmaker's
price and its implied probability — "anything a neutral data vendor could
plausibly publish" — while rendering **"no composite, threshold, tier or
recommendation."**

This is all four:

- **composite** — four inputs reduced to one label
- **threshold** — `margin <= 1`
- **tier** — three ranked buckets
- **recommendation vocabulary** — `MUST`, which is the chip variant, not the
  scenario name

`UPSET` / `SWEAT` / `CHALK` are defensible as factual descriptions of a
completed game. The `MUST` / `HOT` / `QUIET` **chip variant** is the part that
reads as a watch verdict.

## The mitigations that may already cover it, and must be checked first

This is exactly the case `jubilant-bassoon/CLAUDE.md` rule 6 warns about:
*"Many patterns that look like violations are already mitigated."* Do not act
before reading `docs/ADR-002-CONTEXT.md`. Specifically:

1. **It is post-game.** It reads `homeScore` / `awayScore`, so it cannot
   function as a signal about whether to watch something — the game is over.
   That may place it in the amnesty zone.
2. **It is pull-only.** It renders inside a card the user is already looking at.
   Rule A is about autonomous push; nothing here pushes.

If the ADR clears it, the correct outcome is a comment at the call site saying
so and why, not a change. An uncited clearance is how this gets re-litigated
every six months.

## Tasks

0. **Read `docs/ADR-002-CONTEXT.md` first**, in particular the amnesty zone and
   the Rule A / Rule F split. Then state, with a citation, whether a post-game
   chip is covered.
1. If covered: add the citation at `src/debrief/index.ts:139` and close. No code
   change.
2. If not covered: the minimal change is the chip **variant**, not the scenario
   label — `UPSET`/`SWEAT`/`CHALK` can keep a neutral variant. Do not delete the
   layer; it is the only place opening prices for both sides are shown.
3. Either way, add a check that pins the outcome, so the next session does not
   have to re-derive it.

## Out of scope

The movement line added by `CC-CMD-2026-09-11-client-odds-story` is separate and
already shipped: it is plain text, carries no chip, no colour and no tier, and
`A-ODDS-6` fails if a `font-weight` is added to it. It reads `closing`;
`buildOddsStory` never destructures `closing` at all, so the two do not overlap.
