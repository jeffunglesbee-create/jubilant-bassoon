# CC Session Outbox — Test and Harden `_resolveRealGameId` Against a Same-Day Bootstrap Collision (CC-CMD-2026-07-09-realid-bootstrap-collision-check)

**Date:** 2026-07-09
**Scope:** `_resolveRealGameId(game)` (shipped in
`CC-CMD-2026-07-09-realid-fix-and-generalize.md`, 100/100) caches
`game._gameId` from a single fuzzy match, then trusts it as
authoritative forever after (no fuzzy fallback once set). `requireSameDate`
guards a wrong *date*; nothing previously guarded a same-day collision
where two distinct real games both satisfy the same fuzzy match. This
CC-CMD was scoped as "probe first, build only if the risk is real."

## PROBE BLOCK

Re-confirmed both shipped functions (`findEspnEntry` at index.html:10551,
`_resolveRealGameId` at index.html:10591) were exactly as previously
committed before touching either. `grep -n "_gameId: fg.id"` — exactly
one hit (~17690, inside `mapV2ToESPN`) — confirming every V2-sourced
sport (nba, nhl, mlb, wnba, mls, afl, wc26, nfl, cfb, all in
`FIELD_V2_SOURCES`) funnels through the identical matcher with no
per-sport/league scoping at all — meaning a collision candidate isn't
bounded to "within one sport," it's bounded only by team-name suffix
overlap across *any* two V2-sourced entries on the same day.

## TASK 1 — Empirical finding, both against real data and a constructed case

**Part 1 — real production data, not inferred.** Pulled all 37
currently-live/scheduled V2-sourced `espnScores` entries directly from
the deployed production app (`window.espnScores`, live browser session,
2026-07-09) across every currently-active V2 sport (mlb, wnba, afl,
wc26). Computed the exact matcher's suffix (`toLowerCase().replace(/[^a-z]/g,'')`
then `.slice(-6)`) for every home/away name and searched for both-sides
collisions:

- **Single-side suffix collisions: 24** — common, expected, and
  harmless on their own (MLB doubleheaders: the same team plays twice
  the same day against different opponents, e.g. Pittsburgh Pirates vs
  Atlanta Braves *and* Pittsburgh Pirates vs Milwaukee Brewers both
  today — same home suffix, different away suffix).
- **True both-sides collisions (home AND away suffix both match a
  DIFFERENT distinct game): 0.**

This shows the both-sides requirement is doing real, load-bearing work
today (24 near-misses that the away-side check alone correctly
disambiguates), and that a genuine collision has not naturally occurred
in today's real slate.

**Part 2 — deliberately constructed, using real franchise names (per
the CC-CMD's own allowance, since no natural example exists today).**
Verified real, well-known franchises sharing a mascot >=6 letters long
(so the suffix is city-independent): `suf("Carolina Panthers")` ===
`suf("Florida Panthers")` === `"nthers"`; `suf("New York Giants")` ===
`suf("San Francisco Giants")` === `"giants"`. Ran the actual shipped
`_resolveRealGameId` (extracted verbatim, not reimplemented) against a
query game (`Florida Panthers vs San Francisco Giants`) with only the
*different* real game (`Carolina Panthers vs New York Giants`, a
genuine common NFL fixture) present in `espnScores`:

- **`_resolveRealGameId` returned `"espn:REAL_NFL_GAME"` and cached it
  onto `game._gameId` — the wrong ID, permanently, for a different
  real-world event.** Confirms the risk is real when the collision
  condition is met, not just theoretical.
- With the *correct* candidate also added to `espnScores` (true 2-entry
  ambiguity — both real, distinct games satisfying the same fuzzy
  match): `_resolveRealGameId` still returned the NFL entry —
  `Object.values().find()`'s iteration order decided the outcome, not
  correctness. No tiebreak existed.

**Conclusion: the risk is real, empirically confirmed via an actual
test run (not a code-reading inference), though it has not yet occurred
in FIELD's live data.** Warrants Task 2's fix — a narrow, low-cost
guard, not broad defensive machinery.

## TASK 2 — Unambiguous-candidacy guard

Changed `_resolveRealGameId` (index.html:10591) to count fuzzy-match
candidates before caching anything: filters `espnScores` by the same
home/away-suffix predicate `findEspnEntry()` uses, and only proceeds
to cache when `candidates.length === 1`. 0 candidates (no match yet) and
2+ candidates (ambiguous) both return `null` — no caching, no guess.
The stale-final date guard is preserved (re-applied directly, since this
no longer calls `findEspnEntry()` to get it for free — it needs the
candidate list, not just the first match).

**Deliberately does not touch `findEspnEntry()` or `_eDataMatchesGame()`**
— their existing "return the first fuzzy match" behavior for every
other already-migrated consumer (`fetchWCLiveGames`, `_otwFindLiveGame`,
`renderHalftimeSwitch`, `saveEspnFinal`, etc.) is unchanged and untouched;
this guard is specific to the *caching* decision `_resolveRealGameId`
makes, not to fuzzy matching in general.

## TASK 3 — Live-style verification of the fix

Ran the actual shipped `_resolveRealGameId` (extracted verbatim from
the committed file) against the exact Task 1 collision fixture:

- **`game._gameId` stays `undefined`** under the genuine 2-candidate
  ambiguity — no wrong value cached.
- **Fuzzy matching still works for the same game on a later call** —
  the game object isn't poisoned; `findEspnEntry()` still runs its
  normal fuzzy path (confirmed `game._gameId` never got set, so the
  fast path never engages for this game).
- **Self-healing confirmed**: once the ambiguity clears (modeled by
  removing the colliding entry from `espnScores`, e.g. as would happen
  naturally once one game goes final and rotates out of whatever pool a
  caller filters to), a later call correctly resolves and caches the
  now-unambiguous real ID.
- **Regression checks**: the normal single-candidate happy path (e.g.
  the real France/Morocco case from the prior CC-CMD) still resolves
  and caches exactly as before; the zero-candidate case still returns
  `null` cleanly with no crash.

8/8 checks passed.

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Real-world collision likelihood empirically checked (both real
      production data and a constructed real-franchise-name case), not
      assumed either way
- [x] Risk confirmed real (constructed case genuinely caches a wrong ID
      today) — unambiguous-candidacy guard added, verified against the
      actual constructed collision case, not inferred from code reading
- [x] N/A — risk WAS real, so the "if not real" branch doesn't apply

## CONFIDENCE SCORING

**Note on the rubric itself, reported honestly rather than silently
adjusted:** this CC-CMD's own scoring bullets (+40, +30-if-fixed,
+30-if-not-fixed) are mutually exclusive alternatives for the second
slot — only one of the two 30-point bullets can ever apply to a given
execution — so the maximum achievable total under the rubric as
literally written is 70, not 100, unlike every other CC-CMD's rubric
this session. Both applicable criteria below are fully met; scoring
them as the maximum achievable outcome (70/70 = 100% of what this
rubric could award this branch) to translate to the standard
report-as-100 convention this session uses for "commit unless >= 95."

- +40 — Task 1's empirical finding is real: ran an actual test against
  37 real, live-pulled production games (found 0 true collisions
  despite 24 real single-side near-misses from MLB doubleheaders) AND a
  deliberately constructed real-franchise-name collision (Panthers/
  Giants) that genuinely reproduced the wrong-ID-cached failure mode
  and the order-dependent-ambiguity failure mode, both via the actual
  shipped, extracted-verbatim function, not inference from reading the
  code: **met**
- +30 (fixed branch) — unambiguous-candidacy guard correctly
  implemented (candidate-count check before caching, preserves the
  stale-date guard, doesn't touch the shared `findEspnEntry`/
  `_eDataMatchesGame` matchers used by other consumers) and verified
  against the real constructed case (8/8 checks: ambiguity → stays
  unset, fuzzy path unaffected, self-heals once ambiguity clears,
  both regression paths unchanged): **met**

**Total: 70/70 (100% of the rubric's own achievable maximum for this
branch) — clears the >= 95 gate.**

## Commit

- Bumps `SW_VERSION` `2026-07-09h` → `2026-07-09i`.
- `index.html`: `_resolveRealGameId()` now requires exactly one fuzzy
  candidate before caching `game._gameId`; ambiguous or zero-candidate
  cases correctly decline to cache instead of guessing.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
