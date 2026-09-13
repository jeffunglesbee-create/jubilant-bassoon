# CC session — two defects found by asking what was still open

**Date:** 2026-09-12 ET (runs stamped 2026-09-13 UTC)
**CC-CMDs:** `09-10-eu-sections-not-injected` CLOSED ·
`09-12-v2-sections-in-model-not-in-dom` Tasks 0+1 done, green run 1 of 5
**HEAD:** `c0a54d0a` → `1ccfedf7` · Smoke 1049/0 · Units 69/0
**SW:** `2026-09-12p` → `q` → `r` · Deploys 963, 964 both success

---

## Both defects were found by auditing open work, not by anything surfacing

Nothing was going to surface either one: no error, no empty section, no gap in
any count, no red check.

### 1. Bundesliga had no injector call site — two days, eight games a poll

`CC-CMD-2026-09-10-eu-sections-not-injected` shipped seven of its eight European
competitions. `bundesliga` never got one. Across three probe runs:

```
espn_scores_by_sport   bundesliga 8
slate_by_sport         Bundesliga ABSENT
_v2SectionInjected     bundesliga undefined
```

**The check that existed to prevent this passed.** `check-v2-section-labels.mjs`
printed `6 key(s) have no injector: their sections are built elsewhere` and
exited 0. The number was correct and asserted nothing — bundesliga was inside it.

Counting a set and naming a set are different claims, and only the second one
can be wrong out loud. `SECTION_BUILT_ELSEWHERE` now enumerates every uninjected
key with the path that builds it (nba/nhl/mlb via the ESPN sweep, afl via the
Squiggle push, wc26 via the FIFA block); an unlisted key fails with the remedy
in the message. Three mutations, the first removing the bundesliga call site to
reproduce the defect exactly as it stood.

### 2. The V2 poll never rendered what it injected

The armed follow-up from the previous session fired on the **first red run**
after the ledger shipped and answered its own question, with no session looking
for it.

```
manifest 20260913T022107Z, SW 2026-09-12q
renderLedger               renders 5, pushesSinceLastRender 11
render_after_last_push_ms  -31708                    <- NEGATIVE
allData.sportsLength       16   /   DOM sections 4   /   21 cards
```

Eleven sections pushed, the last **31.7 seconds after the last render**, and no
render since. Per the ledger's own decision table, negative means they were
never offered to the DOM: **the renderer was not dropping them — it never ran.**

Whether the ESPN poll's `renderAll` happened to land after the inject block was
a race. That is the whole of the 129/128/45/129/45/134/140/21 oscillation.

**The fix is one conditional call:**

```js
if (_renderLedger.pushesSinceLastRender > 0) scheduleRenderAll();
```

- `scheduleRenderAll`, not `renderAll` — debounced, so eleven injections in one
  poll coalesce into one render; signature-guarded, so an unchanged poll costs a
  compare rather than a rebuild. Twenty existing call sites (Rule 62).
- **The guard is Rule 24.** This fires on the V2 poll cycle; unguarded it would
  schedule a render every poll forever. `pushesSinceLastRender` is non-zero only
  when a section was actually added, which per sport happens once per session —
  the injector takes its merge branch afterwards and does not increment.
  Steady-state cost is zero.
- Not a second call "to be safe", which the CC-CMD explicitly ruled out.

## Verified live, one run

```
manifest 20260913T022634Z, SW 2026-09-12r
slate_cards                144        highest of the day
sections_model_not_in_dom  []
render_after_last_push_ms  +6036      was -31708 one run earlier
renderLedger               renders 6, pushesSinceLastRender 0
Bundesliga                 8 cards    first time it has ever rendered
```

**One green run is not proof.** The done condition is five consecutive, because
earlier greens were the race landing well — the gap field read `[]` at 20:43
with no fix in place at all. What is different now is a mechanism rather than
luck; a mechanism observed once is still observed once. The two scheduled runs
accumulate the count without a session.

## A harness detail worth keeping

`mutate-v2-section-labels.mjs` deletes a line, so its replacement is the empty
string and "is the replacement present" is meaningless. It asserts the **anchor
is gone** instead. A harness that cannot tell a deletion from a substitution
reports NOT CAUGHT on a mutation it never applied — the failure this project has
already produced once.

## Carried forward

Nothing loose from these two. Four items remain user-only and unchanged: revoke
the `GITHUB_PAT`; rotate the Odds API key at the provider; remove the 13
`RELAY_SHARED_SECRET` literals from the relay's `src/index.js` **before**
rotating (reversed, `bootstrap-relay-secret.yml` reinstalls the old value); set
`ODDS_API_KEY` as a repo secret.
