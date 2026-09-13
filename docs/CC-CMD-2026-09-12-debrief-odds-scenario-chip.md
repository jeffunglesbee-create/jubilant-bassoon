# CC-CMD-2026-09-12 — the debrief's odds layer renders a MUST/HOT/QUIET tier

**STATUS: CLOSED 2026-09-12. Decision 1 answered by the user — amnesty covers
it — so Task 1 applied: citation added at the call site, no code change to the
chip.** Task 3's check is `scripts/check-debrief-postgame-only.mjs`, four
invariants and four mutations, in deploy-gate.

**Decision 2 (what a draw should render) remains OPEN** and is not a compliance
question. The inconsistency is pinned in `check-odds-story-scenario.mjs` as
`[pinned, not endorsed]` so it cannot drift; answering it is a product call.

One separate defect found during Task 0 and fixed (`fd065473`). Session doc:
`outbox/cc-session-2026-09-12-odds-scenario-chip-task0.md`.

## Task 0 — the ADR reading, with citations

`docs/ADR-002-CONTEXT.md` Step 4: *"Post-game only: NOT APPLICABLE — amnesty
zone."* Defense 4: *"Any code that only runs in the post-game context is not
subject to ADR-002."*

So the whole question turns on one verifiable fact, and this CC-CMD's own
mitigation #1 asserted it from reading (*"it reads homeScore/awayScore, so it
cannot function as a signal"*). **That is the precise trap the ADR's own
2026-09-04 case study records**: the bottom-sheet Drama Arc was a real
violation *"missed here because two prior documents asserted this section was
post-game and neither claim was re-verified (Rule 72)."* So it was traced, not
read.

**Traced, at HEAD:**

| path to `buildOddsStory` | gate |
|---|---|
| `injectDebriefCards` (field.js:2569) -> `buildDebrief` (2640) | `if (!rawGame \|\| !isGameOver(rawGame)) return;` — GATED |
| `renderCard` (field.js:2474) -> `fillSlot(card,'debrief',buildDebrief(...))` (2510) | **UNGATED** |

`renderCard`'s two apparent call sites (41909, 41915) resolve to a **local
arrow function** `const renderCard=(text,loaded)=>` at **41871**, which shadows
the global and renders `night-owl-inner` HTML without touching `buildDebrief`.
The global `renderCard` at 2474 therefore has **zero callers** — it is STAGED,
as its own comment says.

**Conclusion on the fact:** today, `buildOddsStory` runs only behind
`isGameOver`. Post-game only, so ADR Step 4 amnesty applies on its face.

**Two caveats that go with it, not around it:**

1. `isGameOver` is not `isAmnestyState`. It returns true for
   `status === 'postponed'` and for `_aflComplete >= 100`; the ADR's own remedy
   for the 09-04 violation was a named predicate returning true only for
   `'post'` or `'final'`. A postponed game is not a concluded event.
2. The ungated `renderCard` path is dead, not absent. The 09-04 violation was
   exactly a section that lacked a gate its neighbour had.

## THE DECISIONS THIS SESSION WILL NOT MAKE

Both are flagged rather than taken, under the session's confidence gate
(commit only at >= 95) and `field-relay-nba/CLAUDE.md` Rule 45 (*"Do not make
legal assessments about ... patent compliance. Flag for human review."*).

**Decision 1 — does amnesty clear the MUST/HOT/QUIET chip variant?**
The ADR says post-game-only code is not subject to ADR-002, which on its face
clears it. Against that: this CC-CMD's own framing is that `MUST` is a
recommendation vocabulary rather than a description, and the amnesty zone's
basis for US10328326B2 is narrower than "the event is over" (it is that a
rating computed once and never recomputed has no second value to have changed
from — see the ADR's 2026-07-06 patent-family note). Applying a documented
procedure is one thing; deciding that the procedure covers a label that reads
as a watch verdict is not a call to make alone.

**Decision 2 — what should a draw render?**
Measured: the same 1-1 draw renders `UPSET/MUST` when the home side was
favoured and `SWEAT/HOT` when the away side was, because `homeWon = homeScore >
awayScore` is false in any draw and `favWon = homeFav === homeWon` therefore
flips with `homeFav`. One real-world outcome, two labels, decided by which team
the bookmaker preferred. That the current behaviour is inconsistent is a fact;
what a draw *should* say is a product judgement. Both orientations are pinned
in `check-odds-story-scenario.mjs` and explicitly marked not-endorsed, so the
behaviour cannot change silently while the question is open.

## Found and fixed during Task 0 — not a judgement call (`fd065473`)

`buildOddsStory` guarded only on `opening`. With scores null or undefined,
`?? 0` made both sides 0, `homeWon` false, `favWon` false, and it rendered
`UPSET` / chip `MUST` — the strongest label in the vocabulary, out of data that
was not there. `isGameOver`'s `'postponed'` branch is a live route to it.

Guarded with `if (homeScore == null || awayScore == null) return null;`
(Rule 99, Rule 1). Eleven enumerated cases, four mutations, both in
deploy-gate.

---

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
