# CC Outbox — Live Pitch Arsenal in At-Bat Edge

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-atbat-edge-arsenal.md
**Commit:** 11bea7b
**Smoke:** 818 → 819 (SCOUT-ARSENAL-1 updated in place, SCOUT-ARSENAL-2 added new — net +1; 0 failed, no regressions)

---

## Pre-build probe

Re-confirmed exact current shapes (line numbers had drifted slightly from
the CC-CMD's own probe, ~11 lines, from prior commits landing on `main`):
- `fmtP`: index.html:18421-18443 (was ~18421 per CC-CMD, unchanged)
- At-Bat Edge block: index.html:18500-18529 (CC-CMD said ~18505-18517,
  drifted ~7 lines from the tempo-fix commit's insertions)
- `getPitchTempo`/`getPitchArsenal`: index.html:7622/7659 (unchanged)

## Task 1 — Shared `lastNameOf()` helper

Added exactly as specified, placed immediately before `getPitchTempo`
(index.html ~7622). Accepts either a raw string (At-Bat Edge's
`p.pitcherName`) or an object with `.name`/`.lastName`/`.fullName`
(`fmtP`'s `p` parameter).

## Task 2 — fmtP refactored

Replaced the inline `const pLast = (p.name || p.lastName || '').split('
').pop();` with `const pLast = lastNameOf(p);`. **Verified identical
output before committing** — tested 5 representative object shapes
(`{name:'Kevin Gausman'}`, `{name, era}`, `{lastName:'Gausman'}`,
`{name:'TBD'}`, `{}`) against both the old inline logic and the new
helper: all 5 produced byte-identical results. The helper's extra
`.fullName` fallback is unreachable for `fmtP`'s specific call site
(`normalizeMLBPitcher` always populates `.name`), so this is purely
additive robustness for future callers, not a behavior change for the
existing one.

## Task 3 — At-Bat Edge arsenal/tempo

Added exactly as specified: `pitcherLast`/`pArsenal`/`pTempo` computed
from `p.pitcherName` (the live per-at-bat platoon cache's current
pitcher, which the CC-CMD's context confirms updates on reliever
substitutions — distinct from `fmtP`'s pre-game starter). Extended the
pitcher row template to `${p.pitcherName}${arsenalStr}${tempoStr}`. Reused
the exact null-whiffRate-skip logic from the Scouting Report fixes
verbatim (not reinvented).

**Verified against real data before shipping:**
- `Kevin Gausman` (in both stores): `"Pitcher: Kevin Gausman ·
  Split-Finger 39% whiff · Average tempo"`
- `Brent Suter` (tempo-only, not in the 120-pitcher arsenal set):
  `"Pitcher: Brent Suter · Fast tempo"` — arsenal clause correctly omitted
- `Nobody Real` (unknown): `"Pitcher: Nobody Real"` — both clauses omitted
- Empty/missing `pitcherName`: row omitted entirely, no crash

## Explicitly out of scope — confirmed untouched

The card-level `.rai-line` written by `buildMLBPlatoonLine`
(index.html:34149) / `injectMLBPlatoon` (index.html:34166, called at
34867) is untouched — confirmed via grep before and after the edit, no
diff in that block. Per the CC-CMD: this is a separate, more
space-constrained render of the same `_mlbPlatoonCache`, already carrying
platoon + count context in one compact line; adding arsenal/tempo text
there risks illegibility on a card. **Restating for the record (per Task
5's explicit instruction not to lose this):** a future CC-CMD could
consider a very compact arsenal/tempo addition there (e.g. a single
abbreviated token, not the full "Split-Finger 39% whiff" phrase used in
the bottom-sheet surfaces) if there's ever a card-level use case for it —
not built here, not currently planned.

## Task 4 — Verification

- `node smoke.js index.html`: 819 passed, 0 failed.
- `SCOUT-ARSENAL-1` updated in place (not left stale) — its old regex
  matched the literal inline extraction string, which no longer exists
  post-refactor (Task 2 replaced it with `lastNameOf(p)`). Re-pointed the
  assertion at the helper's existence + fmtP's usage of it, which is
  actually a stronger, more direct check than the old inline-pattern
  regex (a helper existing and being called is less brittle to further
  refactors than matching an exact inline expression).
- `SCOUT-ARSENAL-2` added new for the At-Bat Edge surface — judged this a
  genuinely distinct render surface (different section, different data
  source: live per-at-bat cache vs. static pre-game pitcher object) per
  the CC-CMD's own precedent guidance ("extend in place when it's testing
  the same underlying helper, new assertion when testing a genuinely
  distinct render surface").

**Chat-side follow-up (per CC-CMD, not checkable by CC):** confirm live
during an actual in-progress MLB game with a pitching change that the
At-Bat Edge pitcher line updates to the new (relief) pitcher's
arsenal/tempo, not just the original starter's — this is the entire
point of it being the live surface, and cannot be verified from a static
dry-run against a snapshot of `pitch_tempo.json`/`pitch_arsenals.json`.

## Task 5 — Outbox manifest

**`lastNameOf()` fully replaced both prior inline extractions cleanly:**
yes — one clean replacement in `fmtP` (Task 2, verified byte-identical
output), one new call site in the At-Bat Edge block (Task 3, using the
string-input branch of the helper).

Ran `grep -n "split(' ').pop()" index.html` to check for remaining
duplicates before writing this claim (not assumed): the file has ~30
call sites total, but the overwhelming majority are for unrelated
purposes (team-name-to-nickname shortening, umpire last names, NBA
player/leader names, generic squad-name matching) — not duplicates of
what `lastNameOf()` was built to consolidate. Scoped narrowly to "extracts
a pitcher's last name specifically to key into PITCHER_ARSENAL/
PITCHER_TEMPO," exactly ONE other site remains:
`getMLBAnalyticsContext` (index.html:7705,
`(pitcher.lastName||pitcher.fullName||'').split(' ').pop().toLowerCase()`).
Not touched by this CC-CMD (out of its stated scope — Task 1/2 only
named `fmtP`), but flagged here as the one true remaining duplicate of
this specific pattern, worth folding into `lastNameOf()` in a future
one-line CC-CMD.

**`.rai-line` deferral restated:** see "Explicitly out of scope" section
above — not lost.

---

## Done Conditions

- [x] `lastNameOf()` helper added, accepts string or object
- [x] `fmtP` refactored to use it — verified byte-identical output vs. the old inline extraction before committing
- [x] At-Bat Edge pitcher row shows live arsenal/tempo — verified against real data (both-present, tempo-only, unknown, empty cases)
- [x] Null-whiffRate handling reused verbatim, not reinvented
- [x] Card-level `.rai-line` confirmed untouched, deferral restated
- [x] `SCOUT-ARSENAL-1` updated in place (stale regex would have false-failed); `SCOUT-ARSENAL-2` added new for the distinct surface
- [x] 819/0 smoke, no regressions
- [x] Outbox written
