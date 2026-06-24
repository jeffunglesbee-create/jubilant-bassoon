# CC-CMD-2026-06-24-night-owl-wc-drama — Manifest

DATE   : 2026-06-24 ET
PROMPT : docs/CC-CMD-2026-06-24-night-owl-wc-drama.md
REPO   : jubilant-bassoon (sole)
SW     : 2026-06-24d → 2026-06-24e
HEAD   : 6f6bada (feature)
DEADLINE: Met (committed well before 19:00 UTC).

================================================================
EDIT
================================================================

  ✓ Task 1 — WC sport strings added to late-game isFinalPeriod ternary (L32918).
  ✓ Task 2 — WC/soccer added to drama isFinalPeriod ternary (L34263–34264).
  ✓ Task 3 — preGameScore fallback added to topGame sort (~L38260).
  ✓ Task 4 — Smoke A733, A734 added; A658 regex updated to match new shape.
  ✓ Task 5 — Smoke 745/0, SW_VERSION bumped, committed, pushed.

================================================================
PROBES (Rule 68)
================================================================

PROBE 1  Late-game ternary at L32918:
         `(sp.includes('soccer') || sp.includes('epl')) ? period === 2 :`
         Confirmed `'wc26'` NOT matched.

PROBE 2  Drama isFinalPeriod ternary at L34263 ends at
         `(sp.includes('baseball')||sp.includes('mlb')) ? period >= 9 : false`
         Confirmed soccer absent — WC goals never trigger +15 burst.

PROBE 3  topGame sort at L38254. Three levels: sustained → peakDelta →
         _affScore. No preGameScore fallback.

PROBE 4  preGameScore defined at L9546 as `function preGameScore(g)` —
         global, in scope at L38254.

PROBE 5  Highest assertion: A732. New: A733, A734.

================================================================
INVESTIGATION — A658 regression (Rule 77)
================================================================

After adding the preGameScore fallback, A658 failed.

  Root cause : A658's regex `/return _affScore\(b\)-_affScore\(a\)/`
               matched the exact pre-edit substring.
  My change  : replaced `return _affScore(b)-_affScore(a);` with
               `const affinityDelta = _affScore(b) - _affScore(a);
                if (affinityDelta !== 0) return affinityDelta;`
               followed by the preGameScore fallback.
  Semantics  : affinity is STILL a tiebreaker between sustained-tied AND
               peak-tied games — the prompt-10 wiring is preserved. Only
               the literal return-line shape changed.
  Fix        : Updated A658 regex to `/_affScore\(b\)\s*-\s*_affScore\(a\)/`
               so it still verifies the affinity-based tiebreaker exists
               in the night owl topGame sort.

NOT rationalized — the prompt explicitly upgrades the sort with a 4th
fallback, so the literal return line had to change. The semantic check
A658 enforces (affinity as topGame tiebreaker) remains intact.

================================================================
SMOKE
================================================================

Before : 743 passed, 0 failed   (baseline at HEAD 9751bee)
After  : 745 passed, 0 failed   (+2: A733, A734; 0 regressions after A658 regex update)

================================================================
SW_VERSION
================================================================

  index.html : '2026-06-24d' → '2026-06-24e'
  sw.js      : '2026-06-24d' → '2026-06-24e'

================================================================
USER-VISIBLE BEHAVIOUR
================================================================

Before:
  • A 1-0 WC game in the 88th scores ~55 drama (late+close gate misses
    `sp = 'wc26'`; lead-change burst never fires for WC goals).
  • Equal-drama tiebreak between WC group-decider and blowout MLB falls
    back to user affinity only — stake tier (tierBoost 40 vs 0) is
    ignored entirely.

After:
  • Same 1-0 WC game in the 88th now hits late+close path and lead-change
    burst (+15) when the score swings in the 2nd half → ~70-75 drama.
  • topGame sort: when sustained drama AND peak AND affinity all tie,
    the WC group-decider wins on preGameScore (tierBoost 40) over a
    regular MLB game (tierBoost 0). Night owl now covers stakes.

================================================================
SCOPE BOUNDARY
================================================================

DO list:
  ✅ Two soccer-family ternaries extended with WC strings
  ✅ topGame sort extended with preGameScore fallback
  ✅ A658 regex updated (forced by intentional shape change)
  ✅ Two new assertions A733, A734
  ✅ SW_VERSION bump (Rule 4)

DO NOT (all respected):
  ✅ No drama formula constants changed
  ✅ No new top-level state introduced
  ✅ No journalism path touched
  ✅ Relay code NOT touched
  ✅ Other sort branches (sustained, peakDelta) left intact

================================================================
PRE-COMMIT BYPASS NOTE
================================================================

Used --no-verify with [no-verify: ...] tag (per Rule 16 + established
pattern from a39f869, aecb909, etc.).

Reasons:
  • Structural smoke: PASSING (745/0).
  • field_smoke.js: env mismatch — hardcoded /home/claude/index.html
    path doesn't exist in this sandbox. Pre-existing.
  • Lint error at index.html:26546:33 — outside my edit footprint
    (32918, 34263, 38260, 22450). Pre-existing; matches prior session's
    `[no-verify: pre-existing lint at 26391 unchanged]` pattern.

================================================================
COMMITS
================================================================

Commit 1 (feature, triggers deploy gate):
  6f6bada "fix: night owl WC drama + topGame stake fallback"

Commit 2 (manifest, [skip ci]):
  (this file)
