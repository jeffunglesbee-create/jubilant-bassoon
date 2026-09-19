# CC session 2026-09-19 — render-target completeness: STOPPED at Task 1

**CC-CMD:** `docs/CC-CMD-2026-09-19-render-target-completeness.md`
**Outcome:** Task 0 complete. **Task 1 stopped by its own stop condition.**
Tasks 2–4 depend on Task 1 and were not started. **No code committed.**

The CC-CMD says: *"If no honest enumeration exists, say so and stop — a
completeness check built on a guess is worse than none."* No honest enumeration
exists in this repo. This records the four candidates and why each was
disqualified, so the next session does not re-derive it.

## Task 0.1 — TARGETS at HEAD

One entry, as the document said.

| field | value |
|---|---|
| name | odds movement line |
| symbol | `buildOddsMovement` (`src/debrief/index.ts`) |
| container | `buildDebrief` (`src/debrief/index.ts`) |
| chain | `buildDebrief` -> `injectDebriefCards` (`src/legacy/field.js`) |

`ROOT_PATTERNS`: 5 — two `setTimeout` shapes, `setInterval`, `addEventListener`,
and a bare top-level call.

## Task 0.2 — green today, and still catches both founding failures

```
self-test against the two chains that actually shipped:
  caught  updateCard (the 327678bc mistake — 0 callers)
  caught  renderCard via NightOwl only (the d207c191 mistake)
  passed  injectDebriefCards (the path that does run)

checked 1 declared render target(s): chain in src/legacy/field.js, layer in src/debrief/index.ts
PASS — every declared render target reaches a caller that runs
```

## Task 0.3 — the named siblings are NOT in this repo

`check-opts-keys-are-read.mjs`, `watch-silently-dead-crons.mjs`,
`check-collision-reach.mjs`, `mutate-collision-reach.mjs` and the `staged-*`
family all live in **field-relay-nba**. None is in jubilant-bassoon.

That is a Rule 79 violation in the CC-CMD itself (PROMPT-HEAD-A: a prompt must
reference only files that exist in the target repo). Read from the other repo
anyway, since the conventions are what the task needs:

| script | what it already covers | convention to follow |
|---|---|---|
| `check-opts-keys-are-read` | a key passed in an options literal that the callee no longer reads (39 days silent) | declared `WATCH` list + `allowUnread: {}` waiver map — *"An entry here needs a reason, because 'it's fine' is how the last one lasted 39 days"* |
| `check-collision-reach` | three predicates deciding a watch condition | enumerated assertions, each with a paired mutation; not an enumerator |
| `watch-silently-dead-crons` | crons that die at their first guard, across 4 repos | ratchet against a declared baseline with per-entry reason + `review_by`; three counts; coverage line |
| `staged-*` family | staged-but-unverified claims | verdicts recorded as data, not prose |

**0.4 — yes, they establish the convention.** A reachability check with no
demonstrated failure proves nothing. Task 2 was correctly specified.

## Task 1 — STOPPED. Four candidate enumerators, four disqualifications

| candidate | measured result |
|---|---|
| explicit marker (`RENDER-TARGET`, `@render`) | **does not exist** — 0 occurrences in `src/legacy/field.js` or `src/debrief/*.ts` |
| manifest / registry | **does not exist** — `TARGETS` is the only list, and it is the thing being guarded |
| naming prefix | **does not discriminate** — of **90** `build*` functions in field.js, **2 build DOM and 88 build data** (`buildEnrichedGame`, `buildDateSchedule`, `buildRightNowTiers`, `buildCardTimeDisplay`, `buildParkFactorBadge`, `buildUmpWatchBadge` …). Counts by prefix in field.js: build 90, render 60, inject 18, update 9, show 5. The declared target's own symbol is in `src/debrief/index.ts`, so a field.js prefix sweep would not even contain it. |
| DOM-production | computable, and it DOES contain `buildOddsMovement` (1 `createElement`). But it over-enumerates leaf helpers — `fieldChip` and `fieldSection` produce DOM and are not independent targets. Reducing to subtree roots requires reachability, which is the next row. |

### Reachability is the disqualifying one

`scripts/call-graph.js` is real: 365 lines, AST-based, tracks CALLS and REFS,
has `--orphans`. Using it to decide "already covered" **reinstates the exact
inference this check exists to replace**:

> *"The inference that failed both times was 'this function has callers,
> therefore it is the path that runs'."*

`d207c191` had **two** callers and never ran. A call graph cannot tell a live
path from a dead one — that is the whole premise of
`check-render-reaches-dom.mjs`. Its own header also records a blind spot it
cannot parse: onclick references inside template-literal HTML strings. So
"unreachable" is untrustworthy in the other direction too.

A completeness check built on any of these is the guessing linter the header
rejects, wearing a waiver list as cover. **88 waivers for data builders is not a
decision record.**

## Which render symbols the enumerator cannot see

**All of them.** There is no enumerator. That is the finding, not a caveat on
one. Any list this session could produce would be an inference about which
functions are "render" functions, which is what the check's header forbids.

## What would unblock Task 1

An explicit convention, adopted deliberately. Cheapest: a one-line marker
comment above each render entry point, which `check-render-reaches-dom.mjs` then
enumerates — a declaration, not an inference, preserving the design the header
defends. That is a decision about how this codebase marks intent. It belongs to
the owner, not to a session inventing it.

**Until then `TARGETS` stays a list of one, and its green means "the one declared
target is fine", not "render targets reach the DOM".** That distinction is the
real carry-forward.
