# CC Session Outbox — Dead fallback clause in MLB analytics context (direct user request, 2026-07-12)

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Direct conversational request: "Find and
resolve another silent failure using novel thinking. No Fallbacks, only
fixes." — explicitly steering away from tonight's repeated
`captureFieldError`-instrumentation pattern (render-surface visibility,
per-card render isolation, journalism silent-failure visibility). This one
is a different bug class: a broken fallback chain, not a missing catch.

## Investigation — a bug class no exception-visibility fix could ever catch

Tonight's prior four fixes all instrumented `catch` blocks that were
already discarding real thrown exceptions. That pattern doesn't apply
here: the target bug never throws, so no amount of `captureFieldError`
placement would surface it. Went looking instead for **structurally
dead code inside `||` fallback chains** — the case where a chain
*looks* like it has N levels of resilience but a duplicate clause makes
one level unreachable, silently, with zero trace anywhere (not even a
debug log), because `x || y || x` is mathematically identical to `x || y`.

Wrote a script to extract every 2+-level `||` fallback expression in
`index.html` and flag any where the same operand appears twice. Nine
matches; eight were false positives from the regex catching common
`!x || x === y` / `!x || x <= 0` guard idioms (a different, legitimate
pattern — not a duplicate fallback). One was real:

**`index.html:8013`**, inside `getMLBAnalyticsContext(game)`:
```js
const pf = getParkFactor(game._homeAbbr || game.homeTeam || game._homeAbbr);
```
The third clause (`|| game._homeAbbr`) repeats the first. Since
`game._homeAbbr` already failed the first check to reach the third
clause at all, re-testing it again is a no-op — this function has only
2 real fallback levels while reading like it has 3.

**Confirmed no legitimate 3rd fallback was ever intended and just typo'd
wrong** (checked before assuming this was "just" a duplicate — per Rule
71, read the current behavior before changing it): grepped for an
MLB-specific name→abbreviation converter that could plausibly have been
the intended third clause. None exists — `nameToAbbr` (the only such
helper in the file, ~line 30209) is NHL/NBA-specific and scoped locally
inside a different function entirely. The established, correct pattern
for this exact lookup already exists at the sibling call site,
`buildParkFactorBadge()` (~line 8039): `game._homeAbbr ||
game.homeTeam` — 2 real levels, no duplicate. `8013` is the only one of
the file's ~10 `_homeAbbr`-fallback call sites carrying the dead clause.

## Fix — removed the dead clause, no fallback added

```diff
- const pf = getParkFactor(game._homeAbbr || game.homeTeam || game._homeAbbr);
+ const pf = getParkFactor(game._homeAbbr || game.homeTeam);
```

Matches the sibling call site exactly. Per the user's explicit "No
Fallbacks, only fixes": this is a subtraction, not an addition — no new
fallback level, no new instrumentation, no new mechanism. The bug was
dead code masquerading as resilience; the fix removes the mask.

**Why this matters even though it's currently a no-op at runtime**:
`getParkFactor(x)` returns `null` for any falsy `x` regardless of
*which* falsy value it receives, so today the dead clause changes
nothing observable. The real risk is what it does to the next reader:
a maintainer investigating "why is park-factor context missing for this
game" would trust the apparent 3-level chain and rule out
`_homeAbbr`-derivation issues incorrectly, wasting time on a
resilience path that structurally cannot exist. This is the same class
of defect CLAUDE.md's Rule 76 (FALLBACK-CAP-A) warns about — a broken
data-access contract disguised as redundancy — just caught one level
earlier, before it accumulates to 3+ real distinct guesses.

**Consequence path (both call sites, confirmed unmodified/unaffected)**:
`getMLBAnalyticsContext()` feeds MLB analytics lines (park factor, HP
umpire, pitcher arsenal/tempo) into the compound-editorial and
game-brief journalism prompts via two callers — `fetchCompoundEditorial`
context building (~line 27676) and `fetchMLBGameBriefFromClaude`
(~line 31374) — the same journalism subsystem instrumented for silent
failures earlier tonight, but a genuinely different function and a
genuinely different bug type within it.

## VERIFICATION

Real extraction test (Node `vm`), not asserted — pulled
`getMLBAnalyticsContext`, `getParkFactor`, `PARK_FACTORS`,
`BASEBALL_CONST` verbatim via brace-matched extraction:

1. Both `_homeAbbr` and `homeTeam` missing → `[]` (no Park line) — same
   before and after the fix, confirmed no regression.
2. `_homeAbbr: 'COL'` present → `["  Park: [LAUNCH PAD] Coors Field:
   +28% runs · HR factor 130"]` — real park data resolved correctly.
3. `_homeAbbr` missing, `homeTeam: 'COL'` present (2nd fallback level
   exercised) → same Coors Field line — confirms the real 2-level
   chain still works after the dead 3rd clause was removed.
4. Non-baseball game → `[]`, early-bail unaffected.

Additionally probed the raw `x||y||x` vs `x||y` expressions across 8
truthy/falsy input combinations: 7 of 8 identical; the one divergence
(`null` vs `undefined` when both inputs are `null`/`undefined`) is not
observable here — `getParkFactor()` treats any falsy input as `return
null` regardless of which falsy value it receives, confirmed by reading
`getParkFactor`'s own first line (`if (!teamAbbr) return null;`). Zero
behavioral difference in the actual call path.

- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_smoke.js index.html`: **Failures: 0**, unaffected.
- `node field_unit.js`: 66 passed, 0 failed.

## DONE CONDITION

The one genuine duplicate-fallback-clause defect found in `index.html`
is removed; the call site now matches its established sibling pattern
exactly. Verified via real extraction test across all reachable input
combinations (both fallback levels, the early-bail path, and direct
expression-equivalence probing) — not asserted from reading the diff
alone.

## Commit

- `index.html`: `getMLBAnalyticsContext()`'s dead `|| game._homeAbbr`
  duplicate clause removed (line ~8013). No fetch/generation/render
  logic changed. `SW_VERSION` bumped `2026-07-11m` → `2026-07-11n`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
- **Not touched, correctly out of scope**: the function's own
  `catch(e){}` (empty catch swallowing any thrown exception in the
  park/umpire/pitcher context loop) — surveyed and real, but
  instrumenting it would be exactly the `captureFieldError`-visibility
  pattern this task explicitly asked to move past. Left as a genuine,
  separate, still-open item for a future "make it visible" pass, not
  silently folded into this one.
