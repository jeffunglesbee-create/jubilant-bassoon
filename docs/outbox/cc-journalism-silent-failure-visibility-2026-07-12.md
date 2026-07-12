# CC Session Outbox — Find and resolve silent failure in journalism (direct user request, 2026-07-12)

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Direct conversational request, no
formal CC-CMD doc — same rigor applied regardless.

## Investigation — finding the highest-leverage real silent failure, not just any one

Grepped for the journalism subsystem's core generation functions
(`generateJournalismViaRelay`, `fetchCompoundEditorial`,
`initJournalismQueue`, `fetchFIELDBriefFromClaude`,
`fetchMLBGameBriefFromClaude`, `fetchWNBAGameBriefFromClaude`,
`fetchStakesBriefFromClaude`, `fetchEPLMatchBriefFromClaude`,
`fetchNightOwlFromClaude`, `fetchSeriesPreviewFromClaude`).

**Found the shared, foundational function**: `generateJournalismViaRelay(prompt, opts)`
(line ~17417) is called from **5 distinct places** —
`fetchSeriesPreviewFromClaude` (`briefType:'j2-series'`),
`fetchFIELDBriefFromClaude`'s compound path (`briefType:'j3-brief'`),
`fetchMLBGameBriefFromClaude` (`briefType:'mlb-brief'`),
`fetchStakesBriefFromClaude` (`briefType:'stakes-brief'`), and
`fetchNightOwlFromClaude` (`briefType:'night-owl'`) — confirmed each
already passes a genuine, distinct `briefType`, making per-type
tagging immediately useful rather than defaulting to `'generic'`
everywhere. This is the same "one shared boundary, not many scattered
call sites" pattern used for tonight's earlier relay-init and
render-surface fixes.

**Traced the real, consequential failure mode**: `fetchFIELDBriefFromClaude`
(FIELD's headline "Brief" feature) has a 2-layer fallback chain —
Layer 2, `fetchPrerenderedJournalism()` (relay pre-rendered cache,
first choice), then falls through to `fetchCompoundEditorial()`
(which internally calls `generateJournalismViaRelay`, second choice).
**If both layers fail, the brief never updates from its initial
static/loading placeholder — with zero durable trace anywhere.**
Neither function wrote to `window._fieldErrors`; both only
`console.warn`/`console.log` when `FIELD_DEBUG` happens to be on.

## Fix — reused `captureFieldError` exactly, no new mechanism

**`generateJournalismViaRelay`** — 3 failure points instrumented, all
`silent=false`:
- `!r.ok` (real HTTP error)
- `!data || !data.text` (a 200 response with no usable text — a
  distinct, real failure mode from a clean HTTP error, given its own
  tag)
- the `catch(e)` block (thrown exceptions — network failure, JSON
  parse error, timeout)

All three tagged `journalism:generate:{opts.briefType}` — e.g.
`journalism:generate:mlb-brief`, `journalism:generate:night-owl`.
Reasoned `silent=false` (not defaulted): this function is the *last*
generation layer for several flows — once it fails, there is no
further fallback beyond a static placeholder, matching the established
`initFIELDBrief`/`mlb-whos-up-next` precedent (primary,
no-redundant-fallback failures get `silent=false`), not the
relay-fetch/background-source precedent (`silent=true`).

**Explicitly left untouched**: the model-refusal suppression branch
(`_isModelRefusal(data.text)`) — this is a quality gate working
*correctly* (Haiku declining to fabricate, caught and suppressed
before it reaches the user), not a bug. Instrumenting it as an "error"
would misrepresent working-as-intended behavior as a failure.

**`fetchPrerenderedJournalism`** — 3 failure points instrumented, all
`silent=true`:
- `!r.ok`
- `!data?.brief`
- the `catch(e)` block

Tagged `journalism:prerendered-fetch`. Reasoned `silent=true`
(different from `generateJournalismViaRelay`'s decision, not copied):
this layer has a genuine, real redundant fallback —
`fetchCompoundEditorial`/`generateJournalismViaRelay` — matching the
relay-fetch/background-source precedent exactly.

**Preserved exactly, confirmed via `git diff`**: every existing
`FIELD_DEBUG`-gated console log, every return value, every existing
fallback path. The diff is purely additive — no renderer/fetch logic
changed on any touched line.

## VERIFICATION

**Real forced-failure + real-success test** (Node `vm`, extracted
verbatim — `captureFieldError`, `generateJournalismViaRelay`,
`fetchPrerenderedJournalism`, not reimplemented). 7 cases, all passed:

1. `generateJournalismViaRelay` forced HTTP 500 (`briefType:'mlb-brief'`)
   → `null` returned, `_fieldErrors` captured exactly
   `{fn:"journalism:generate:mlb-brief", err:"HTTP 500"}`.
2. `generateJournalismViaRelay` forced 200-but-no-`data.text`
   (`briefType:'night-owl'`) → `null` returned, captured
   `{fn:"journalism:generate:night-owl", err:"relay 200 but no usable data.text"}`.
3. `generateJournalismViaRelay` forced a real thrown exception
   (`briefType:'stakes-brief'`) → `null` returned, captured
   `{fn:"journalism:generate:stakes-brief", err:"network unreachable — forced test failure"}`.
4. `generateJournalismViaRelay` **real success** (`briefType:'j3-brief'`)
   → the real generated text returned correctly, `_fieldErrors`
   **empty** — confirms zero false positives on the happy path.
5. `fetchPrerenderedJournalism` forced HTTP 503 → `null` returned,
   captured `{fn:"journalism:prerendered-fetch", err:"HTTP 503"}`.
6. `fetchPrerenderedJournalism` forced a real thrown exception →
   `null` returned, captured correctly.
7. `fetchPrerenderedJournalism` **real success** → the real
   pre-rendered data returned correctly, `_fieldErrors` **empty**.

All 4 distinct `briefType` tags exercised across the test (mlb-brief,
night-owl, stakes-brief, j3-brief) confirming per-type tagging
genuinely differentiates failures, not a single generic bucket.

- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: **Failures: 0**, unaffected —
  still the clean state reached earlier tonight.

## DONE CONDITION

The highest-leverage silent failure in the journalism subsystem — the
shared generation function underlying 5 distinct brief types, plus its
upstream pre-rendered-cache layer — now reports every real failure
into the existing `_fieldErrors` mechanism with a specific,
per-brief-type tag, instead of discarding it silently. Verified with a
real forced-failure-and-success test across both functions and all
relevant `briefType`s, not asserted.

## Commit

- `index.html`: `generateJournalismViaRelay` (3 failure points) and
  `fetchPrerenderedJournalism` (3 failure points) instrumented with
  `captureFieldError`, reasoned `silent` values per function. No
  fetch/generation logic changed. `SW_VERSION` bumped `2026-07-11l` →
  `2026-07-11m`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
- **Not touched, correctly out of scope**: the 5 individual callers'
  own logic (unmodified — they already receive `null` on failure and
  handle it via their own existing fallback/static-text logic, which
  this fix doesn't change). The model-refusal quality-gate branch
  (working as intended, not a bug). Other journalism functions
  (`fetchCompoundEditorial`, `initJournalismQueue`, and the 4 other
  `fetch*BriefFromClaude` functions) were surveyed but not
  independently instrumented — their own failure paths route through
  the now-instrumented `generateJournalismViaRelay`, which is where
  this fix concentrated for maximum coverage with minimal surface
  area, matching tonight's established "one shared boundary" pattern.
