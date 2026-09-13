# CC session — odds scenario chip: Task 0, and two decisions left to a human

**Date:** 2026-09-12 ET · **CC-CMD:** `CC-CMD-2026-09-12-debrief-odds-scenario-chip.md`
**Status: CLOSED.** Decision 1 answered by the user — amnesty covers it — so
Task 1 applied (citation, no chip change) and Task 3 shipped as
`check-debrief-postgame-only.mjs`. **Decision 2 (what a draw should render)
remains open; it is a product call, not a compliance one.**
One separate defect found during Task 0 and fixed (`fd065473`).
**HEAD:** `fd919d1a` → `fd065473` · Smoke 1049/0 · Units 69/0 · SW `r` → `s`

---

## Task 0 — traced, not read

ADR-002 Step 4: *"Post-game only: NOT APPLICABLE — amnesty zone."* Defense 4:
*"Any code that only runs in the post-game context is not subject to ADR-002."*

So the question turns on one fact — and the CC-CMD asserted it from reading
(*"it reads homeScore/awayScore, so it cannot function as a signal"*). That is
the exact trap the ADR's own 2026-09-04 case study records: the bottom-sheet
Drama Arc was a real violation *"missed here because two prior documents
asserted this section was post-game and neither claim was re-verified."*

| path to `buildOddsStory` | gate |
|---|---|
| `injectDebriefCards` (2569) → `buildDebrief` (2640) | `isGameOver(rawGame)` — GATED |
| `renderCard` (2474) → `fillSlot(card,'debrief',…)` (2510) | **UNGATED** |

`renderCard`'s two apparent call sites resolve to a **local arrow function** at
line 41871 that shadows the global and never touches `buildDebrief`. The global
has **zero callers** — STAGED, as its comment says.

**So: post-game only today, and Step 4 applies on its face.** Two caveats travel
with that, not around it:

1. **`isGameOver` is not `isAmnestyState`.** It returns true for
   `status === 'postponed'` and `_aflComplete >= 100`. The ADR's own remedy for
   the 09-04 violation was a named predicate true only for `'post'`/`'final'`.
   A postponed game is not a concluded event.
2. **The ungated path is dead, not absent.** The 09-04 violation was precisely a
   section missing a gate its neighbour had.

## The defect found on the way — fixed, not a judgement call

`buildOddsStory` guarded only on `opening`. With scores null or undefined,
`?? 0` made both sides 0, `homeWon = 0 > 0` false, `favWon` false:

```
both scores null            -> UPSET/MUST
both scores undefined       -> UPSET/MUST
home null, away real        -> UPSET/MUST
away undefined, home real   -> UPSET/MUST
```

The strongest label in the vocabulary, built entirely out of data that was not
there — and `isGameOver`'s `'postponed'` branch is a live route to it.

**My own prediction before running it was SWEAT/HOT, and it was wrong.** I
missed that equal scores make `homeWon` false. Measuring rather than reasoning
is the only reason the write-up says UPSET.

Guarded with `if (homeScore == null || awayScore == null) return null;`
(Rule 99, Rule 1). 11 enumerated cases, 4 mutations, both in deploy-gate.

## Two decisions this session did not make

Under the confidence gate (commit only at ≥ 95) and `field-relay-nba/CLAUDE.md`
Rule 45 — *"Do not make legal assessments about … patent compliance. Flag for
human review."*

**1. Does amnesty clear the MUST/HOT/QUIET chip variant?** The ADR says
post-game-only code is not subject to ADR-002, which on its face clears it.
Against: this CC-CMD's own framing is that `MUST` is a recommendation
vocabulary rather than a description, and the amnesty zone's basis for
US10328326B2 is narrower than "the event is over" — per the ADR's 2026-07-06
patent-family note, it is that a rating computed once and never recomputed has
no second value to have changed from. Applying a documented procedure is one
thing; deciding it covers a label that reads as a watch verdict is another.

**2. What should a draw render?** The same 1-1 draw renders `UPSET/MUST` when
the home side was favoured and `SWEAT/HOT` when the away side was, because
`homeWon` is false in any draw and `favWon` flips with `homeFav`. One outcome,
two labels, decided by which team the bookmaker preferred. **That it is
inconsistent is a fact; what it should say is a product judgement.** Both
orientations are pinned in the check and explicitly marked not-endorsed, so the
behaviour cannot drift while the question is open.

## What is automated

`check-odds-story-scenario.mjs` + `mutate-odds-story-scenario.mjs` run on every
deploy. If either decision lands, the enumerated rows are where it gets written
down — the draw rows are labelled `[pinned, not endorsed]` precisely so a future
session cannot mistake "the test passes" for "the question was answered".


---

## Closed out — the citation, and why it does not stand alone

Decision 1: **amnesty covers it.** Task 1 applied — a citation at the call site,
no change to the chip.

The citation states what the chip *is* rather than arguing it is something
milder: a composite, a threshold, a tier and a recommendation vocabulary, which
under Rule F alone would not clear. It clears on Defense 4 / Step 4 instead.

**And it records that the clearance is conditional.** The only live path is
`injectDebriefCards` gated on `isGameOver`; `renderCard` reaches `buildDebrief`
ungated at field.js:2510 but has zero callers, because both apparent call sites
resolve to a local arrow function at field.js:41871 that shadows the global.

That is a fact about code, and facts about code change. The ADR's own
2026-09-04 case study is a real violation *"missed here because two prior
documents asserted this section was post-game and neither claim was
re-verified"* — an unenforced citation would be a third such document.

`scripts/check-debrief-postgame-only.mjs` enforces four invariants, each a way
the claim could lapse silently:

| invariant | mutation that breaks it |
|---|---|
| exactly 2 `buildDebrief` call sites | a third appears |
| `injectDebriefCards` gates on `isGameOver` | the gate is removed |
| the local `renderCard` shadow exists | it is renamed — both calls bind to the ungated global |
| every `renderCard()` sits after the shadow | one appears above it |

All four caught on their named clause. The check is the reason the citation is
allowed to stand.

## Still open

**Decision 2 — what a draw should render.** Not a compliance question, so it was
not bundled into the answer that was given. Pinned `[pinned, not endorsed]` so
the current inconsistency cannot drift while it is outstanding.
