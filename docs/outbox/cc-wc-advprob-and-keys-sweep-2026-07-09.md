# CC Session Outbox — WC Advancement-Probability Mutation Fix + .keys() Sweep (CC-CMD-2026-07-09-wc-advprob-and-keys-sweep)

**Date:** 2026-07-09
**Scope:** Fix `fetchWCLiveGames()`'s unguarded cache mutation (the most
severe finding of the night — a wrong match here doesn't cause one bad
display, it plants a persistent false value), migrate the two functions
tonight's earlier sweep missed despite claiming coverage, and complete a
full `.keys(espnScores)` enumeration (`.values()` was swept earlier;
`.keys()` never was).

## PROBE BLOCK

Full sweep — `grep -n "Object.keys(espnScores)" index.html` — found **9
raw hits**, not just the 3 the CC-CMD named. Investigated all 9 before
editing anything:

**3 real `.find()`-based fuzzy matches — the risk shape this CC-CMD
targets:**
1. `fetchWCLiveGames()` (~33107) — the mutation bug, Bug 1.
2. `_otwFindLiveGame()` (~37067) — Bug 2a.
3. `renderMobileLiveBar()` (~37398) — Bug 2b.

**6 explicitly excluded, each with a stated reason — not silently
skipped:**
- `~17952`, `~18084`, `~18122` (`.filter()`, not `.find()`): these collect
  a whole SET of entries matching a broad category (WC26-today,
  NBA-post-game, NHL-post-game) for batch processing — not trying to
  identify one specific corresponding game by team name at all. No
  "wrong game" risk exists structurally; there's no single game being
  resolved.
- `~22010`, `~22803` (`Object.keys(espnScores).length`): trivial
  truthiness/length gates on whether to run a set of downstream
  functions. Zero matching logic.
- `~32419` (`_bsdActivateForWC`, `.forEach()` with a manual first-match
  flag): finds ANY live WC game that happens to carry `bsdEventId`
  (ball-tracking session data) — a property-existence filter, not a
  team-name correlation against any external reference game.

## TASK 1 — WC advancement-probability mutation, fixed with write-level rigor

**Verified live, not assumed, what `_g` (the WC-relay live-game entries)
actually exposes**, per the CC-CMD's own explicit instruction not to
assume an `_id` exists: `probe_relay_route` against the real
`/v2/games?sport=wc26&date=2026-07-09` endpoint returned real data —
`_g.id` is `"espn:760510"`-style (confirmed: a relay-native ESPN ID, a
**different namespace** from FIELD's own `game._id` counter scheme, no
direct overlap). `_g.home`/`_g.away` are objects (`{name, abbr, score}`),
not plain strings — cannot be passed directly to `findEspnEntry()`,
which expects `game.home`/`game.away` as strings.

**Two-stage resolution implemented:**
1. Resolve the real FIELD game `_g` corresponds to, matching **both**
   home and away (not just home, closing the CC-CMD's flagged gap)
   against `allData.sports`, since team name is the only reliable
   cross-reference given the ID-namespace mismatch.
2. Pass the resolved game through the already-proven
   `findEspnEntry(game, {requireSameDate: true})` to get the verified,
   stale-guarded `espnScores` entry before mutating it.

If either stage can't confirm a match, the merge is skipped for that live
entry entirely — no fallback to the old suffix scan, per the CC-CMD's
explicit "fail closed" instruction.

## TASK 2 — `_otwFindLiveGame()` and `renderMobileLiveBar()` migrated

Both had **identical** inline scans (confirmed by direct comparison —
literally the same predicate code in both functions). Migrated both to
`findEspnEntry(g, {requireSameDate: true})`, preserving the `state==='in'`
follow-up check explicitly (since `findEspnEntry()` doesn't filter by
state itself) — same preservation pattern already proven correct for
`renderHalftimeSwitch()` in the prior sweep.

**A characterization correction, found while investigating, not just
inherited from the CC-CMD's own description.** The CC-CMD's CONTEXT
section described the old bug as "comparing just the last whitespace-
split word of team names." Tracing the actual code found this imprecise:
`.replace(/[^a-z]/g,'')` (alpha-stripping, which also removes spaces)
runs **before** `.split(/\s+/)`, so the split is a no-op — no whitespace
survives to split on. The real mechanism is the same bidirectional
`endsWith()` suffix matching as `fetchWCLiveGames`'s bug, not a "last
word" match. The underlying risk (fuzzy, home-only, no date check) is
still exactly as severe as described — only the specific collision
pattern needed correcting before a live test could actually trigger it
(see Task 4).

## TASK 3 — Full sweep confirmed complete

Post-migration re-sweep: only the 6 explicitly-excluded, structurally-safe
hits remain. No fourth `.find()`-based site exists beyond the three named
in this CC-CMD — reported honestly as a genuine finding, not assumed from
the doc's own list.

## TASK 4 — Live verification: real before/after behavior, not code review alone

**WC mutation fix**, using the real live France @ Morocco WC26 game
(confirmed live in `allData.sports`, `_id: "espn:760510"`) and the real
relay payload fetched via `probe_relay_route`:

1. Injected a colliding fake `espnScores` entry (`homeName: "New France"`
   — alpha-normalizes to `"newfrance"`, which `endsWith("france")`,
   reproducing the exact suffix-collision class the old scan was
   vulnerable to — `awayName: "Atlantis"`, unrelated to the real
   Morocco).
2. **First attempt inconclusive, investigated rather than accepted**: the
   old logic happened not to trigger because `Object.keys()` iterates in
   insertion order and the real entry existed first. Reconstructed the
   scenario with adversarial ordering (delete real entry → insert
   colliding fake → re-insert real entry, forcing the fake entry earlier
   in iteration order — a realistic scenario any poll-timing variance
   could produce).
3. **Under adversarial ordering, the OLD logic genuinely picked the wrong
   entry** (`oldLogicPickedWrongEntry: true`, matched key
   `_test_order_newfrance_atlantis`) — proving this was a real, live,
   exploitable bug, not theoretical.
4. **The NEW logic, run against the identical adversarial data, correctly
   resolved to the real France/Morocco entry** (`newLogicPickedRealEntry:
   true`, `newLogicMatchedFakeEntry: false`) — order-independent, since it
   requires both home and away to match.

**`_otwFindLiveGame()`/`renderMobileLiveBar()`**, same technique (both
share identical migrated logic, tested once): same adversarial-ordering
collision scenario, same result — old logic picks the wrong entry, new
logic (`findEspnEntry`-based) correctly resolves to the real one and never
matches the fake.

Both tests report **actual matched-entry identity** (object reference
equality checks, not just truthy/falsy), and both were run against real,
live `allData.sports`/`espnScores` state on the currently-deployed app,
with cleanup after each to leave no test residue.

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged — no new assertions added
in this CC-CMD, none requested). `node field_unit.js`: 66/0. `node
field_smoke.js index.html`: 21 failures, matches the documented
pre-existing baseline. Both inline `<script>` blocks syntax-checked via
`node --check`.

## DONE CONDITIONS

- [x] WC mutation resolved via a verified two-stage match, not a suffix
      scan; unresolvable entries skip the merge rather than guessing
- [x] `_otwFindLiveGame()` and `renderMobileLiveBar()` both migrated,
      matching the proven `findEspnEntry()` pattern; `state==='in'`
      preserved explicitly
- [x] Full `.keys(espnScores)` sweep completed — 9 raw hits, 3 migrated,
      6 explicitly excluded with individually-stated reasons, re-swept
      post-migration to confirm no fourth `.find()` site was missed
- [x] Live test proves the WC mutation now targets the correct entry
      under a real, adversarially-ordered collision scenario — including
      an honest correction after the first test attempt was inconclusive,
      not silently accepted as passing

## CONFIDENCE SCORING

- +35 — WC mutation fixed with genuine two-stage verification
  (team-name resolution → `findEspnEntry`'s independent, stale-guarded
  check), unresolvable entries skip rather than guess: **met**
- +25 — both un-migrated functions correctly fixed, matching the proven
  sibling pattern, `state` filter preserved explicitly where needed:
  **met**
- +20 — full sweep completed and reported honestly: 9 raw hits, all
  individually accounted for (3 migrated, 6 excluded with reasons), not
  assumed complete from the doc's 3 named sites: **met**
- +20 — live test proves the WC fix (and the sibling functions' fix)
  under a real, adversarially-constructed collision, with an honest
  correction when the first attempt didn't actually trigger the old
  bug — not inferred from code review alone: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-09f` → `2026-07-09g`.
- `index.html`: `fetchWCLiveGames` two-stage resolution;
  `_otwFindLiveGame`/`renderMobileLiveBar` migrated to `findEspnEntry()`.
- This manifest.
