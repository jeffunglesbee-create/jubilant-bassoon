# CC-CMD-2026-09-12 — stepping back one day renders neither cards nor a message

**STATUS: CLOSED 2026-09-12. Root cause found, fixed, verified live.**

Not `goToDate`. `applyMainHTML`'s zero-change fast path
(`CC-CMD-2026-07-06-zero-change-render-fast-path`) silently discarded EVERY
card-less render. Rendering an `.empty-note` over the spinner, all four of its
conditions hold — no `.game-card` on either side so `anyCardChanged` never
flips, no `[data-lcp-anchor]` anywhere, and `[div.loading-wrap]` and
`[div.empty-note]` are both length 1 — so it returned without committing.

`comparedAnyCard` now gates it on the reconciliation having actually compared
something (`5f171c06`, SW `2026-09-12i`, A-DATENAV-3, mutation-proven).

Verified live, `outbox/odds-line-probe-manifest-20260912T180809Z.json`:

```
before   main_children: [section#field-newspaper, div.loading-wrap]
         failure_kind: null   loading_wrap_in_main: 1   ok: false

after    main_children: [section#field-newspaper, div.empty-note]
         failure_kind: "no-events"   loading_wrap_in_main: 0   ok: true
         note: "No major events on Yesterday Try a different date with the ‹ › arrows"
```

**The branch that finally rendered is `no-events` — one of the three that
predate this session.** It had been firing correctly and being thrown away the
whole time. The defect was older and wider than the symptom that surfaced it:
every card-less render in the app was affected, not only past dates.

Both guards I added while hunting this (the end-of-function check, then the
watchdog) were correct and were being eaten by the same renderer. The watchdog
stays — it is the thing that would have caught this in one run instead of nine.

**Succeeded by `CC-CMD-2026-09-12-no-events-is-false.md`:** the message now
shown is itself untrue. 2026-09-11 had 15 completed MLB games with full odds.


Found while verifying `CC-CMD-2026-09-12-context-game-slate-id`'s done
condition. **Pre-existing, and it blocks any live verification of a debrief
layer**, because every debrief layer needs a completed game and the only dates
full of completed games are past dates.

## Measured, live, four runs

`outbox/odds-line-probe-manifest-20260912T1354*.json`, `…1357*`, `…1400*`.

| step | date label | `.game-card[data-gameid]` |
|---|---|---|
| 0 | Today | 44 (39 on one run) |
| 1 | Yesterday | **0** |

Not slow — sampled every 5s to 60s, twelve consecutive zeros:

```
Yesterday [{"at_s":5,"cards":0},{"at_s":10,"cards":0}, … ,{"at_s":60,"cards":0}]
```

Fri 2026-09-11 is not an empty day. `/v2/games?sport=mlb&date=2026-09-11`
returns 15 completed games, and `/context/game/espn:401816899` carries
`opening_odds_parsed` and `closing_odds_parsed` 8 of 8.

**And there is no message either.** `m.empty_note` is `null` — no
`.empty-note` element at all.

## Why that last line is the whole finding

`goToDate` has three failure branches and every one of them renders an
`.empty-note` into main:

- `No major events on <label>`
- `Today's AI schedule lookups are used up` (budget-exhausted)
- `Couldn't load <label>'s schedule` + Retry (genuine failure)

Zero cards AND zero `.empty-note` is none of those three. So the page is in a
fourth state the code does not appear to have a branch for — `goToDate` threw
before reaching any of them, or main was left holding something else entirely.

Do not guess which. One read answers it.

## Tasks

0. **Probe.** Extend `odds_line_probe.js` to capture, when `slate_cards === 0`:
   `document.querySelector('main')?.innerHTML.slice(0, 800)`, the count of
   `.empty-note`, and any `window.onerror` / `pageerror` messages Playwright
   saw during the date change. Run it. **The artifact is the captured HTML in
   the committed manifest** — not a description of it.
1. **Read `goToDate` at HEAD** (`src/legacy/field.js`, the `#date-prev`
   listener is immediately below it) and say which of the four states the
   captured HTML is, naming the line. If it is an uncaught throw, name the
   throwing call.
2. **Fix** so that stepping back a day either renders the slate or renders one
   of the existing three messages. A date-nav control that produces a blank
   page is the same defect class as `game: null` — a state the UI cannot
   express, so the user cannot tell "no games" from "it broke".
3. **Mutation (Rule 90).** Force each of the three existing `.empty-note`
   branches and assert the probe reports the right one. A branch that has
   never been observed rendering is not known to render.
4. **Done condition.** A committed manifest where `step 1` has either
   `cards > 0` or a non-null `empty_note` whose text is one of the three
   known messages. Both zero is the failure being fixed.

## Not in scope

The odds movement layer, `/context/game`, and the `_gameId` propagation — all
settled by `CC-CMD-2026-09-12-context-game-slate-id`. This is the date
navigation only.
