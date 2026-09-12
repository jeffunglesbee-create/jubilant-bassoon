# CC-CMD-2026-09-12 — the client's movement line will claim "unchanged" with no sequence evidence

Found by comparing `buildOddsMovement` (shipped today, `2403a9c8`) against
field-laboratory's `OddsStory`. **The laboratory is ahead, and this is a real
defect in the client code I shipped.**

## The client's guard, and what it misses

`src/debrief/index.ts`, `buildOddsMovement`:

```ts
} else if (open.captured_at && close.captured_at && open.captured_at === close.captured_at) {
    text = `Home line opened ${opened}`;          // one observation, not two
} else {
    // ... compares moneylines, may say "unchanged from open" or report a shift
}
```

The guard fires only when **both timestamps exist and are equal**. Two other
cases fall straight through to the movement branch:

| case | what the client says | what is true |
|---|---|---|
| `captured_at` absent on either side | "unchanged from open", or a pp shift | the sequence is **unverifiable** |
| closing captured **before** opening | "unchanged from open", or a pp shift | the pair is **not a sequence** |

The second is not hypothetical. `docs/ODDS-PROOF.md` records it as the actual
2026-08-09 defect: the "closing" snapshot was captured **~22 seconds BEFORE**
the opening one, same adapter, identical across moneyline, spread and total.
One snapshot written to two columns.

## What the laboratory already does

`field-laboratory/src/Desk.fs:1324`, `OddsStory` — five states, and the
sequence test is a single expression:

```fsharp
match o.CapturedAt, c.CapturedAt with
| Some ot, Some ct -> ct > ot      // STRICTLY after
| _ -> false                        // no timestamps: unverifiable, so not a sequence
```

`NotASequence of opening * closing` is a first-class outcome, with the comment:

> *"No timestamps at all means the sequence is unverifiable, and assuming it
> holds is exactly the assumption this case exists to stop being made silently."*

The client makes that assumption silently. The laboratory refuses to.

## Tasks

0. **Probe.** Measure how often each case occurs in live data: rows where either
   `captured_at` is absent, and rows where closing precedes opening. The
   2026-09-12 wire probe found 0 of 116 sharing a timestamp — run the other two
   questions, because "rare today" and "cannot happen" are different claims.
1. **Port the discipline, not the code.** `buildOddsMovement` needs the same
   three-way answer: a sequence, not a sequence, or a single observation. All
   three already render as "opened" today except the two that leak — the fix is
   which branch they reach, not new copy.
2. **Mutation (Rule 90).** Two fixtures: closing before opening, and a missing
   `captured_at`. Both must stop claiming movement. The existing A-ODDS-2
   assertion covers only the equal case and will pass while these fail — widen
   it or add siblings.
3. **Done condition.** A fixture with closing-before-opening renders "opened",
   not "unchanged from open".

## Note on direction

This is the laboratory doing the job it exists for: a model built there caught a
defect in the client. `field-laboratory/CLAUDE.md` frames it as "laboratory
exists so that ideas better than client can exist and be tested" — this is one,
and the client should take it.
