# CC Session Outbox — Generic-lead detector silently missed most generic leads (direct user request, 2026-07-12)

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Direct request, framed as senior
SWE + copy editor: "what silent failure currently in journalism would
make a brief more dynamic? Resolve that with novel thinking. No
Fallbacks, only fixes."

## Investigation — reading the quality chain as an editor, not just a debugger

Surveyed FIELD's prose quality-control chain (`retryWithoutCliches`,
`checkLeadSentence`, `checkStatVerification`, `checkCrossSport`,
`maybeScoreRetry`, `scoreProse`) for a mechanism whose whole *purpose*
is enforcing variety/dynamism — one that could be silently failing to
do its job with zero errors, zero crashes, just quietly letting
formulaic writing through.

**`checkLeadSentence()`** (~line 26893) is exactly that: it exists
specifically to catch the laziest AI sports-writing pattern — opening
with the team name as subject ("The [Team] are...") instead of a
specific fact, stat, or stake — and trigger a one-shot rewrite. It's
called from **11 sites** across nearly every brief type (compound
editorial, MLB/WNBA/Stakes/EPL briefs, Night Owl, secondary capsules),
making it the single highest-leverage lever for "how dynamic do FIELD's
leads read" across the whole product.

Its detector, `_LEAD_SENTENCE_RE`, was:
```js
/^The [A-Z][a-z]+ (are|have|will|...)\b/
```
— exactly ONE capitalized word (no quantifier) allowed between "The"
and the verb. **Verified empirically, not assumed**: ran it against 10
realistic generic leads. It caught **1 of 10** — only single-word
nicknames directly followed by the verb ("The Yankees are..."). It
silently missed:
- Every two-word nickname: "The Red Sox are...", "The Blue Jays
  have...", "The White Sox will...", "The Maple Leafs need...", "The
  Trail Blazers face..."
- Every full City+Nickname lead: "The Los Angeles Dodgers are...",
  "The New York Yankees have..."
- Record-prefixed leads: "The 53-43 Phillies are..." — a real shape
  confirmed present in production output via the live `/archive/query`
  probe run earlier this session.

Since the majority (9/10) of realistic generic-lead shapes were never
detected, the rewrite-to-something-more-dynamic retry never fired for
them — the exact opening pattern this mechanism exists to eliminate
was shipping uncorrected in the majority of cases where it occurred.
This is a silent failure in the specific sense the copy-editor framing
asks about: not a crash, not a missing brief — a *quality* regression
with zero trace, invisible unless someone actually reads a run of
briefs and notices how many start with "The [Team]..."

## Fix — widened the regex to match reality, not a new mechanism

```diff
- /^The [A-Z][a-z]+ (are|have|...)\b/
+ /^The (?:\d+-\d+ )?(?:[A-Z][a-zA-Z'.]*\s+){1,3}(are|have|...)\b/
```
Adds: an optional record prefix (`\d+-\d+ `, e.g. "53-43 "), and lets
the team-name span be 1-3 capitalized words instead of exactly 1
(covers two-word nicknames and full City+Nickname forms). No new
mechanism, no new retry path, no fallback layer — the existing
one-shot rewrite retry now actually fires on the cases it was always
supposed to catch.

Deliberately **not** widened further to catch qualifier-prefixed leads
like "The defending champion Warriors are..." (lowercase descriptive
words before the team name) — verified this correctly stays unflagged,
and is a rarer, lower-value case not worth the added false-positive
risk of a broader match.

## VERIFICATION

Real extraction test (Node `vm`), `_LEAD_SENTENCE_RE` +
`checkLeadSentence()` pulled verbatim, with a mock `fetch` that reports
whether the retry actually fired. 7 cases, all passed:

1-3. **Previously-uncaught generic leads** (two-word nickname, full
   City+Nickname, record-prefixed) → retry now fires, text changes.
4. **Regression check** — the already-working single-word case ("The
   Yankees are...") → still fires, unchanged behavior confirmed.
5-7. **Negative controls** — real dynamic leads pulled from the live
   archive probe (player-stat lead, stat-lead, and a "The Braves'
   bullpen..." specific-subject lead that starts with "The" but isn't
   generic) → retry correctly does **not** fire for any of them — zero
   new false positives, zero wasted API calls on already-good writing.

- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_smoke.js index.html`: **Failures: 0**, unaffected.
- `node field_unit.js`: 66 passed, 0 failed.
- `node --check` on the extracted inline `<script>` body: clean.

## DONE CONDITION

The generic-lead rewrite retry — called from 11 brief-generation sites
— now actually catches the realistic range of generic "The [Team]..."
openings instead of only the single-word-nickname case. Verified via a
real test against the extracted, unmodified function comparing
before/after coverage on realistic inputs, plus confirmed zero
regressions against real dynamic leads already shipping correctly.

## Commit

- `index.html`: `_LEAD_SENTENCE_RE` widened (~line 26892). No change to
  `checkLeadSentence()`'s own logic, retry prompt, or any of its 11
  call sites. `SW_VERSION` bumped `2026-07-11r` → `2026-07-11s`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
- **Not touched, correctly out of scope**: the rest of the quality
  chain (`retryWithoutCliches`, `checkStatVerification`,
  `checkCrossSport`, `scoreProse`) — surveyed, not found to have an
  equivalent coverage gap in this pass. Qualifier-prefixed leads
  ("defending champion Warriors") — a real but lower-value, rarer
  pattern not worth the added false-positive surface.
