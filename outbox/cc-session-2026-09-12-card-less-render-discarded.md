# CC session 2026-09-12 — every card-less render was silently discarded

Rule 67 session doc for `docs/CC-CMD-2026-09-12-past-date-slate-renders-nothing.md`
(CLOSED) and its successor `docs/CC-CMD-2026-09-12-no-events-is-false.md` (OPEN).

HEAD `22e9f735` → `4558a0d1`. Deploy-gate 952 (failed, ratchet), 953, 954, 955 —
all SUCCESS after the ratchet fix. SW `2026-09-12d` → `i`. Smoke 1045 → 1048.

## The root cause

`applyMainHTML`'s zero-change fast path
(`CC-CMD-2026-07-06-zero-change-render-fast-path`):

```js
if (!anyCardChanged
    && !anchorMorphWillRun
    && !(main.querySelector('[data-lcp-anchor]') && !tmp.querySelector(...))
    && main.children.length === tmp.children.length) { ...; return; }
```

Rendering an `.empty-note` over the loading spinner, **all four hold**: neither
side has a `.game-card` so `anyCardChanged` never flips, no anchor exists, and
`[div.loading-wrap]` and `[div.empty-note]` are both length 1.

It returns without committing. That is not a no-op — it discards the render.

It is a CARD-COUNT change detector applied to content that has no cards. It
cannot see "spinner → message" because neither is a card, and the child counts
coincidentally match.

**This affected every card-less render in the app, not only past dates**, for as
long as that fast path has existed.

## The fix

`comparedAnyCard` gates the fast path on the reconciliation having actually
compared something. The `catch` sets it true, so a mid-loop throw cannot reopen
the hole. `A-DATENAV-3`, mutation-proven at 1047/1.

## Verified live

`outbox/odds-line-probe-manifest-20260912T180809Z.json`:

```
before   main_children: [section#field-newspaper, div.loading-wrap]
         failure_kind null   loading_wrap_in_main 1   ok false

after    main_children: [section#field-newspaper, div.empty-note]
         failure_kind "no-events"   loading_wrap_in_main 0   ok true
```

**The branch that finally rendered is `no-events` — one of the three that
predate this session.** It had been firing correctly and being thrown away the
whole time.

## Four hypotheses died before the right one

| hypothesis | killed by |
|---|---|
| the spinner's awaits never settle | both are bounded — 8s per ESPN league, 15s AI fallback |
| the `[data-lcp-anchor]` morph (documented in that file's own comment) | `lcp_anchor_anywhere: 0` |
| a synchronous throw | `page_error_count: 0` |
| an async throw | `rejections: []` — and `pageerror` does not see those, so that took a separate instrument |

The anchor hypothesis is worth naming: the function's own comment describes
almost exactly this symptom. A matching comment is not proof, and it was wrong.

## What I got wrong, in order

1. **Placed the guard at the end of `goToDate`** — after `renderAll()`, which
   only runs if everything before it completed, the one thing five runs of
   evidence said was not happening. Shipped as `2026-09-12e..g` and never fired.
2. **Replaced it with a watchdog and assumed that was the fix.** The watchdog
   was correct. `applyMainHTML` was eating its output too. Both guards I wrote
   while hunting this were right and invisible.
3. **Reused the fetch-error message for the new note**, which made
   `date_nav_check` pass on "an `.empty-note` exists" — so the open defect would
   have reported itself fixed the moment the symptom was papered over. That is
   the exact collapse this line of work exists to stop, committed by the fix for
   it. Corrected with `data-failure` markers before it shipped a lie.
4. **Added a ⚠️ glyph**, which deploy-gate 952 rejected on the chrome ratchet at
   40 of a declared 39. The gate caught me breaking a rule I was being told to
   follow.
5. **`main_state` read placed before `out` was initialised** — a TDZ throw that
   produced `main_state: null` and a wasted run.
6. **Claimed "the page is stuck on the spinner" from a document-wide
   `.loading-wrap` count** that could not support it. It turned out true;
   I stated it before the number said it.

Nine probe iterations. Seven of the defects in them were mine.

## Automated follow-ups

- date-nav check: fails on `render-incomplete`, and on a `no-events` claim the
  relay archive contradicts. Independent of `STEP_BACK_DAYS` so an input cannot
  switch it off.
- uncaught page errors and unhandled rejections: fail the run, with phase + stack.
- `if: always()` on the commit step — runs 7, 8 and 9 each produced a real
  diagnosis and committed nothing.
- every manifest records `triggered_by`, because the 16:10 cron did not fire on
  its first slot and no artifact said so.

## Open — and worse than what was fixed

`no-events` is now visible and **false**. 2026-09-11 had 24 archive rows and 15
completed MLB games. Measured from the live page:

```
espn_mlb_probe: { status: 200, events: 0 }
```

ESPN answers 200 with zero events for that date; the relay has the same day's
games (`source: "espn-wc"`). The client asks the wrong source for a past date,
not badly. `docs/CC-CMD-2026-09-12-no-events-is-false.md`, Task 2 revised to
route past-date slates through the relay.

Fixing the blank page made a worse problem visible. That is the correct trade and
not a win.
