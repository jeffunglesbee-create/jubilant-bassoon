# CC Session Outbox — Doubleheader Hot-Fix + Scout-Pick/Drama-Peak Follow-Up

**Date:** 2026-07-08
**Scope:** Two related fixes, requested together, both flowing from the same
durability audit of `docs/outbox/cc-pick-cross-session-resolution-2026-07-08.md`
(commit `6789cd8`):
1. A real collision defect found in that commit's own delivered code.
2. Extending the same cross-session-stable-key mechanism to two other
   consumers of the volatile `game._id` found during the audit.

## Why this exists

After shipping the pick cross-session fix, a deeper audit (prompted by a
direct question: "is this durable, and holistic?") found the fix was
collision-prone for a real, modeled scenario (doubleheaders) and was not
holistic — the same `game._id`-volatility bug exists in at least two other
localStorage-persisted features. Both are fixed here.

## PART 1 — Doubleheader collision hot-fix

**Defect:** `_pickStorageKey(game)` keyed on `sport_date_home_away`
(date-only, `.slice(0,10)` of `start_time`). Two games between the same
teams on the same day — a real MLB scenario, not hypothetical: the
codebase already has dedicated doubleheader-tagging logic
(`fetchMLBFixtures`'s `_dhCount`/`_dhSeq`/`g._subtitle = 'Game N'`) and an
established doubleheader-safe convention elsewhere
(`gameHourKey = g => \`${g.home}|${g.away}|${(g.start_time||'').slice(0,13)}\``,
`index.html` ~20531/20585, with the explicit comment "Hour-bucket key...
prevents doubleheader games... from collapsing onto one override") — would
collapse onto the identical pick key. Picking game 2 of a doubleheader
would silently refuse (`if (cache[gameId]) return`) and game 2's widget
would show game 1's pick.

**Fix:** `_pickStorageKey` now hour-buckets (`.slice(0,13)`), reusing the
already-established, already-vetted convention instead of inventing a
coarser one (Rule 62 — follow existing conventions; this should have been
checked before the original implementation and wasn't).

**Verification:** real synthetic test — two games, same sport/date/home/away,
different hours (17:05 and 23:35 UTC) — confirms distinct keys, independent
pick storage, and that game 2's widget shows its own pick, not game 1's.
Re-ran the original cross-session-resolution proof test (mismatched `_id`
across two simulated sessions) to confirm the hour-bucket change didn't
regress that fix — still passes.

## PART 2 — Scout's Pick and Drama Peak: same bug class, extended fix

Audited every `localStorage` key built from `game._id` (not just the pick
cache). Found two more genuinely cross-session-relevant consumers (a third,
`field_game_notes_`, has a lower-severity, date-unqualified fallback — left
out of this scope, it's a stale-content-reuse risk not a silent-failure
one; `field_owl_job_`/`field_nox_secondary_` use `sessionStorage`, correctly
already session-scoped, not part of this bug class).

### Scout's Pick (`field_scout_pick_*`)

Written pre-game in `injectJ1J4Badges()` (real game object, has
`start_time`), read at game-end inside `fetchNightOwlFromClaude()` — an
always-on, automatic feature (not opt-in like Pick'em), arguably higher
user-facing impact than the original pick bug.

**Complication found while designing the fix, not assumed away:** the
read-side object (`topGame`) is not the live game object — it's a snapshot
persisted into `localStorage['field_tonight_finals_<date>']` by
`saveEspnFinal()`'s own `entry` object, which (before this fix) had no
`start_time` field and stored sport as `sport` rather than `_sport`
(`_gameSport()` reads `_sport` first). Naively calling `_pickStorageKey(topGame)`
on the unmodified snapshot would have silently computed a *different*,
wrong key (falling through to `league`, mismatching the write side's
`_sport`-derived key) — found by tracing the actual field names before
writing the read-side fix, not by testing after the fact.

**Fix:** added `start_time` and `_sport` to `saveEspnFinal`'s persisted
`entry` object (backward-compatible additive field), and to the parallel
in-memory-only `finals.push(...)` fallback inside `renderNightOwlRecap()`'s
F5 block (a second, independent snapshot constructor feeding the same
`topGame` selection — found by tracing every path that can produce
`topGame`, not just the primary one). Both write and read sides now call
`_pickStorageKey()` on objects with matching field names. Read falls back
to the old `id`/`_id` lookup for entries written before this deploy.

**Verification:** real synthetic test — write with `_id="g4"`, read with a
`topGame`-shaped object carrying `_id="g9"` (simulating a `_gid` reset
between pre-game write and game-end read) — confirms the same key on both
sides and successful lookup. Also confirmed a legacy, pre-fix-shaped
`topGame` (no `start_time`) correctly falls back to `id` rather than
silently losing the entry.

### Drama Peak (`field_drama_peak_*`)

Traced all 8 call sites (more than the 4 the codebase's own
`getDramaPeak()` comment claimed to consolidate — that consolidation was
incomplete). Write: `injectDramaBadges()` (has a real `game` object via
`findGameById()`). Reads: `getDramaPeak()` (one caller, the postgame bottom
sheet, has `game` in scope), `saveEspnFinal()`'s archival read (has `game`),
`buildDramaLineTiers()` and `buildLifeStageContent()` (2 sites, both have
`game`), `renderNightOwlRecap()`'s F5 fallback (has `game`). One read,
`ViewingConditions.evaluate()` (via `renderCardBadges`), only has a `gid`
string from `card.dataset` with no `start_time` available without a further
signature change — confirmed this one is same-render-pass only (evaluated
on the same live-poll tick as the write, using whatever `gid` is current
right now), not exposed to the cross-session bug, and deliberately left
untouched rather than threading a game object through unrelated function
signatures for no benefit.

**Note on severity:** lower-stakes than Scout's Pick or the original pick
bug — the codebase's own `delta15()` daily pruner already treats
`field_drama_peak_*` as "cheap to regenerate," wiping all entries
unconditionally once per day, and the failure mode (a peak badge
undershoots) is cosmetic, not a silent user-facing correctness bug like a
never-resolving pick. Fixed anyway per the explicit request, and because
the mechanism (dual-write) is cheap and low-risk.

**Fix:** `injectDramaBadges()` dual-writes — the existing `gid`-keyed value
(unchanged, so `ViewingConditions.evaluate`'s same-session-only read is
unaffected) plus a new stable-keyed value, with the running-max comparison
considering both (so a `_gid` reset mid-accumulation doesn't regress the
tracked peak). `getDramaPeak(gameId, game)` gained an optional second
param: tries the stable key first when a real game object is passed, falls
back to the volatile `gameId` key otherwise — genuinely completing the
consolidation its own pre-existing comment claimed ("Replaces 4 inline...
patterns") but hadn't actually finished. All 4 previously-inline reads with
a real `game` object in scope now route through it.

**Verification:** real synthetic test — 3 simulated live-poll ticks (rising
drama score 45→72→88) under one `_id`, then a simulated `_gid` reset
(different `_id`, same real game) reading via `getDramaPeak(newId, game)` —
confirms the peak (88) survives the reset, where the pre-fix behavior would
have read `0` (a fresh key under the new `_id`). Also confirmed the
same-session-only consumer's plain `gid`-keyed read is unaffected.

## Smoke / tests

`node smoke.js index.html`: 890 passed, 0 failed (no assertion needed
updating this round — the two guards updated in the prior commit already
cover the relevant invariants). `node field_unit.js`: 66/0. `node
field_smoke.js index.html`: 21 failures, re-confirmed matches the
documented pre-existing baseline, not a regression. Both inline `<script>`
blocks syntax-checked via `node --check` after extraction. Both new
synthetic test scripts (doubleheader + cross-session pick re-run;
scout-pick/drama-peak cross-session) run against the actual committed
function source in a Node `vm`, not reasoned about.

## DONE CONDITIONS

- [x] Doubleheader collision reproduced synthetically, fixed by reusing the
      established `home|away|hour` convention, re-verified against a real
      doubleheader test
- [x] Original cross-session pick resolution test re-run after the
      hour-bucket change — still passes, no regression
- [x] Scout's Pick: every path that can produce `topGame` (both the
      persisted and in-memory-fallback snapshot constructors) updated
      consistently, field-name mismatch risk (`sport` vs `_sport`) found
      and fixed before it could ship broken
- [x] Drama Peak: all 8 real call sites traced; the one left unmigrated
      (`ViewingConditions.evaluate`) has a stated, verified reason
      (same-render-pass only, no game object available)
- [x] Both fixes proven via real synthetic tests against the actual
      committed function source, not asserted
- [x] Smoke clean (890/0), unit clean (66/0), field_smoke matches known
      pre-existing baseline (21)

## Commit

- Bumps `SW_VERSION` `2026-07-08b` → `2026-07-08c`.
- `index.html`: `_pickStorageKey` hour-bucket fix; `getDramaPeak` extended
  and consolidated; `injectJ1J4Badges`, `injectDramaBadges`, `saveEspnFinal`,
  `fetchNightOwlFromClaude`, `buildDramaLineTiers`, `buildLifeStageContent`
  (2 sites), `openBottomSheet`, `renderNightOwlRecap` updated.
- This manifest.
