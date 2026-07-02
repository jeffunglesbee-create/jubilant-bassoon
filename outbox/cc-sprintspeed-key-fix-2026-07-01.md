# CC Outbox — Fix getSprintSpeed/getRegressionAlert Key Mismatch

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-sprintspeed-key-fix.md
**Commit:** 45af666
**Smoke:** 821 → 823 (2 new assertions, 0 failed, no regressions)

---

## Pre-build probe

Confirmed exact current line numbers with zero drift from the CC-CMD's
own probe: `getSprintSpeed` at index.html:7642 (pre-edit), `getRegressionAlert`
at 7652 — both using `playerLastName.toLowerCase().replace(/\s+/g,'_')`.
Confirmed real Python `name_key()` (scripts/mlb-weekly-update.py:43-48).

## Task 1 — Fix, plus a real discrepancy caught before shipping

Implemented `_mlbPlayerKey()`. **Before trusting the CC-CMD's own
snippet, cross-checked it against actual Python execution** (not mental
tracing) and found a real discrepancy: the CC-CMD's proposed regex
(`/ ii$/`, `/ iii$/`, anchored to end-of-string) does NOT reproduce a
genuine bug in the real Python `name_key()` function — Python's
`.replace(" ii","").replace(" iii","")` runs `" ii"` removal BEFORE
`" iii"` removal, and `" ii"` is a literal substring prefix of `" iii"`,
so `name_key("Smith III, John")` actually produces `'smithi'`, not
`'smith'` (verified via direct Python execution, not assumed):

```python
>>> name_key('Smith III, John')
'smithi'
```

The CC-CMD's anchored-regex version would have produced the "corrected"
`'smith'` — which would NOT match Python's real generated key the moment
a real Player III enters `PLAYER_SPEED`/`PITCHER_TEMPO`/etc. Checked the
real committed data for any currently-affected player (none found — all
`sprint_speed.json`/`expected_stats.json` keys ending in a trailing "i"
are legitimate surnames: Ohtani, Suzuki, Murakami, Yastrzemski,
Benintendi, Caratini, Siri, Antonacci — not mangling artifacts) — so no
active player is affected today, but the JS key derivation must still
match Python's ACTUAL behavior, not an idealized one, since the client's
job is to look up keys the data generator actually produces. Rewrote
`_mlbPlayerKey()` as a literal, verified-bug-compatible JS port instead
of the CC-CMD's anchored-regex snippet, and confirmed exact parity
against Python for 5 test cases (`Witt Jr.`, `Smith III`, `Jones II`,
`Wood`, `De La Cruz`) before shipping.

Also confirmed Python's `name_key()` does NOT strip `" iv"` at all — a
real committed key, `pitch_tempo.json`'s `"lynch_iv"`, keeps the suffix.
`_mlbPlayerKey()` correctly does not strip it either.

**"Also check" — getPitchArsenal/getPitchTempo confirmed to have the
same latent bug class, compounded, and fixed:**

- `lastNameOf()` (added earlier tonight): `.split(' ').pop()` on a
  suffixed full name returns the WRONG WORD entirely, not just an
  unstripped suffix — `lastNameOf("Bobby Witt Jr.")` returned `"Jr."`,
  not `"Witt"`. This is a more severe variant of the same bug class.
- `getPitchTempo`/`getPitchArsenal`: bare `.toLowerCase()` lookup, no
  suffix-stripping AND no multi-word-to-underscore normalization.
  Confirmed real `pitch_tempo.json` has multi-word underscore-joined
  keys (`de_jesus`, `woods_richardson`, `lynch_iv`) that this lookup
  could never have matched even for non-suffixed cases.

Fixed both: `lastNameOf()` now recognizes a trailing suffix token
(jr/sr/ii/iii/iv) and **reattaches** it to the preceding word (returns
`"Witt Jr."` or `"Lynch IV"` whole) rather than discarding it — this
matters specifically because `_mlbPlayerKey()` must see `"IV"` to
reproduce the real `"lynch_iv"` key (it deliberately does not strip IV),
so simply discarding all suffix tokens would have broken IV-suffixed
pitchers while fixing Jr./Sr./II/III ones. `getPitchTempo`/
`getPitchArsenal` now route through `_mlbPlayerKey()` instead of bare
`.toLowerCase()`.

**Verified end-to-end against real committed data before shipping, not
just that the code runs:**
- `_mlbPlayerKey("Witt Jr.")` → `"witt"` — confirmed this key exists in
  the real `outbox/mlb/sprint_speed.json` with Bobby Witt Jr.'s actual
  data (`sprintSpeed: 30.3, pctile: 99, tier: 'elite', team: 'KC'`).
- `_mlbPlayerKey(lastNameOf("Trey Lynch IV"))` → `"lynch_iv"` — confirmed
  this exact key exists in the real `outbox/mlb/pitch_tempo.json`.
- `_mlbPlayerKey(lastNameOf("Kevin Gausman"))` → `"gausman"` — unaffected
  normal case, confirmed unchanged.

## Task 2 — Verification

`node smoke.js index.html`: 823 passed, 0 failed (821 + 2, exact expected
delta). Added `MLBKEY-001`/`MLBKEY-002` — these **actually execute** the
real committed `_mlbPlayerKey`/`lastNameOf` functions (extracted from
`index.html` via regex, run via `new Function()`, matching the precedent
already established by `A347`'s hoisting-scope-trap check) against real
test inputs and assert on the real return values, rather than a static
source-pattern check — per the CC-CMD's own explicit instruction that
this "is the actual test that validates the fix, not just that the code
runs." Confirmed no regression in the pre-existing `SCOUT-ARSENAL-1`/`-2`
assertions, which check for literal call-site patterns unaffected by the
internal lookup-key change.

**Chat-side follow-up (per CC-CMD, not checkable by CC):** confirm live
that Bobby Witt Jr.'s sprint speed/regression data actually renders
wherever `getSprintSpeed`/`getRegressionAlert` feed the UI, post-deploy.

## Task 3 — Outbox manifest

`getPitchArsenal`/`getPitchTempo` **did** have the same latent bug class
— confirmed via probe, not assumed, and fixed in this same CC-CMD (not
deferred): `lastNameOf()`'s suffix-token handling and the routing of
both functions through `_mlbPlayerKey()`. No follow-up needed for this
specific bug class in this file. (A separate, unrelated finding —
`getUmpireABSRating`'s own last-name key derivation — was not
investigated; out of this CC-CMD's stated scope, which named
`getSprintSpeed`/`getRegressionAlert` specifically plus the pitcher-arsenal
functions already touched tonight.)

---

## Done Conditions

- [x] `_mlbPlayerKey("Witt Jr.")` produces `"witt"` — verified against the
      real live key in `sprint_speed.json`, not just the isolated test case
- [x] `_mlbPlayerKey` verified bug-compatible with the REAL Python
      `name_key()` (including its own III-substring quirk), not the
      CC-CMD's snippet's idealized/corrected version — a real discrepancy
      caught by cross-checking against actual Python execution rather
      than trusting the snippet
- [x] `lastNameOf()`/`getPitchTempo`/`getPitchArsenal` confirmed to share
      the same bug class and fixed in the same commit — not deferred
- [x] IV-suffix handling verified correct in both directions (kept, not
      stripped) via the real `"lynch_iv"` committed key
- [x] `MLBKEY-001`/`MLBKEY-002` actually execute the real functions
      against real test inputs, not a static pattern check
- [x] 823/0 smoke, no regressions
- [x] Outbox written
