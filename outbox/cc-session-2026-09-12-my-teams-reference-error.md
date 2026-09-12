# CC session 2026-09-12 — isFeaturedTierGame threw on every call

Rule 67 session doc. No CC-CMD preceded this: it was found by an instrument
built for a different question.

HEAD `d397bba4` → `1669e2e2`. Deploy-gate 951, SUCCESS. SW `2026-09-12c` → `d`.
Smoke 1044 → 1045, 0 failed.

## How it surfaced

While diagnosing a blank past-date page, I added `page.on('pageerror')` to the
live probe — instrumentation for a different defect entirely.
`outbox/odds-line-probe-manifest-20260912T152317Z.json`:

```
page_error_count: 12
[boot] MY_TEAMS is not defined
    at isFeaturedTierGame (…/:9681:3)
    at Array.filter (<anonymous>)
```

Twelve uncaught ReferenceErrors at boot, on the live site, invisible to every
DOM-shaped check this repo has.

## The cause

`src/utils/tier-game.js` carried this comment:

> *"Reads MY_TEAMS and calls isScoutsPick as bare globals (both owned by
> field.js IIFE scope)."*

That belief is false. esbuild gives the module its own scope, and `MY_TEAMS` is
a `let` inside field.js's IIFE — never on `window`. `isScoutsPick` survived only
because it was reached through a `typeof` guard; `MY_TEAMS` was not.

CFB carried 80 rows that day, crossed `FEATURED_TIER_OVERFLOW_THRESHOLD`, and
`games.filter(isFeaturedTierGame)` threw on every call.

**Measured effect:** the slate rendered 16 cards where the same page rendered 44
ninety minutes earlier, and 129 after the fix.

## The fix

`MY_TEAMS` is a parameter. Passing the predicate bare to `.filter` also handed it
the index and the array as arguments 2 and 3 — which is how a one-parameter
signature hid this: the second argument was always a number, never a Set.

## Verification

- `A-FTO-2b` added: the module must read `myTeams` as a parameter and must not
  name `MY_TEAMS` at all. Mutation-proven — restoring the global read turns it red.
- `A-FTO-3` extended to reject the bare `games.filter(isFeaturedTierGame)` form.
  Mutation-proven at 1044/1.
- Live after deploy: `page_error_count: 0`, slate 129 cards.

## What I got wrong

My first mutation run reported A-FTO-3 "NOT CAUGHT". That result was meaningless:
restoring `index.html` from a `/tmp` copy left it diverged from `field.js`,
`sync-source` blocked, and smoke read a stale artifact. The harness said
"NOT APPLIED" and I had to be told by my own tool. `git checkout --` is the
correct restore; `cp` is not.

## Automated follow-up

The live probe now FAILS on any uncaught page error, with phase and stack. An
exception is invisible from the DOM — every DOM-shaped check passed straight
through this one for as long as it existed.

## Open

Nothing. The 129 → 45 slate variance observed later the same day is separate,
filed as `docs/CC-CMD-2026-09-12-slate-size-variance.md`.
