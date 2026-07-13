# TYPED-RESULT-MIGRATION-QUEUE.md

**Generated:** 2026-07-12, by the CC-CMD-2026-07-12-typed-result-survey session.
**Source:** every `return null;` (406), `return false;` (77), and silent-swallow
`catch(...) {}` (344) site in `index.html` at HEAD (commit `4812642`),
re-confirmed fresh (TASK 0) — total 827, up from the CC-CMD doc's own
earlier-the-same-day count of 825 (2 more `return false;` sites landed
between the two counts, from unrelated same-day commits).

**Purpose:** this file is the durable, ranked artifact future single-concern
migration CC-CMDs read from to pick ONE target at a time. It does not itself
migrate anything — zero behavior change in this commit.

**Methodology:** all 827 sites classified via 10 parallel background agents,
each assigned a contiguous slice by line number (not by subsystem — see the
CC-CMD's own rationale: subsystem-based chunking optimizes for "looks tidy,"
not real migration leverage). Each site required reading the enclosing
function AND grep'ing every real call site before assigning a bucket — not
guessed from the function name. Raw per-site output preserved in this
session's scratchpad (`survey_results/all_sites_classified.txt`, not
committed — ephemeral) for anyone who needs the full 827-line detail beyond
what's summarized below.

## Bucket definitions

- **A — differentiated-response candidate:** the caller(s) could plausibly
  act differently depending on WHY this failed. Migrating to
  `fieldOperation()` (see `docs/CC-CMD-2026-07-12-field-operation-primitive.md`)
  + updating the caller(s) would be a real behavior fix.
- **B — decorative only, for now:** callers currently discard the
  distinction regardless. Migrating improves telemetry only (via
  `FIELD_OPERATIONS.recordFailure`), no behavior change. Sorts below A.
- **C — legitimately fine as-is:** `null`/`false` IS the complete, correct
  semantic. Do not migrate these.

## ⚠️ Confirmed bug found during TASK 4 spot-check (not a migration candidate — a plain typo)

While spot-checking 3 real Bucket C entries against fresh code reads (not
trusting the classifying agent's own reasoning), one was found to be
**misclassified because the agent pattern-matched against sibling code
without checking actual variable scope**:

**`renderEPLMatchBriefCard` (index.html ~L32552):**
```js
try { archiveBrief('epl_match', 'EPL', g&&(g._id||g.id)||null, aiText, null); } catch(_){}
```
This function's only game variable is named `game` (the function parameter
is `gameCard`, and `let game = null;` is set at L32498) — **`g` is not bound
anywhere in this function's scope.** Confirmed via grep: no local/enclosing
`g` declaration exists. Every single invocation throws
`ReferenceError: g is not defined`, immediately swallowed by the
surrounding `try/catch`. **`archiveBrief()` has never actually executed for
a single EPL match brief since this code was written.**

This is NOT a typed-result migration question (the catch's job — "don't let
a fire-and-forget archival call block the render" — is legitimately Bucket
C in intent) — it's a plain one-line typo bug, unrelated to whether the
catch should differentiate failure modes. **Not fixed in this CC-CMD**
(explicit scope: survey only, zero behavior change) — flagged here as a
trivial, high-confidence, ready-to-fix follow-up: change `g` to `game` on
line 32552. Recommend a tiny, single-line follow-up CC-CMD or direct fix in
the next session touching this area.

This finding is itself evidence for the survey's own TASK 4 discipline: 2 of
3 Bucket C spot-checks confirmed correct on independent re-derivation, 1
of 3 was wrong. See the outbox doc for the other 2 confirmed-correct C
checks (`isRivalGame`, `getSmoothedDrama`) and all 3 confirmed-correct A
checks (`saveEspnFinal`, `findESPNScore`, `fetchTeamRank`).

## TASK 0 — re-confirmed counts

```
grep -c "return null;" index.html    # 406
grep -c "return false;" index.html   # 77
grep -cE "catch\s*\([^)]*\)\s*\{\s*(/\*.*\*/\s*)?\}" index.html   # 344
```
Total: 827. Reconciles exactly against the classification totals below
(26 + 281 + 519 + 1 non-bucket confirmed-bug = 827).

## Bucket totals

| Bucket | Count | % |
|---|---|---|
| A — differentiated-response candidate | 26 | 3.1% |
| B — decorative only (telemetry gap) | 283 | 34.2% |
| C — legitimately fine as-is | 517 | 62.5% |
| (confirmed bug, not a bucket) | 1 | 0.1% |

2026-07-13 correction (CC-CMD-bucketb-tierc-cluster3): 2 sites reclassified C→B on reconsideration (`fetchGameBriefOnDemand`'s champ-archive-enrichment catch, `fetchEPLMatchBriefFromClaude`'s H2H/form-context catch) — both are optional-enrichment failures structurally identical to the already-shipped `dramaScoreLive` weather-lookup case, not complete/correct business-logic states. Counts above updated; totals below unchanged (827).

## Bucket A — ranked (26 sites across 13 functions)

Ranked by (1) call-site count (more callers = more leverage per fix), (2)
whether this session's own investigation history already implicated this
exact function in a real, confirmed incident (per TASK 2) — a
self-confirmed bug or a function already touched during tonight's
journalism-silent-failure/save-guard work outranks a theoretically-ambiguous
site, even at lower call-site count.

**3/3 of the top entries this session independently re-derived (TASK 4
spot-check) were confirmed correct** — see the outbox doc for the full
re-derivation of `saveEspnFinal`, `findESPNScore`, and `fetchTeamRank`.

### 1. `saveEspnFinal` (index.html ~L39433) — 2 real callers, CONFIRMED BUG

- **L39666:** the function's outer `catch(e){}` (actually L39681, the true
  top-level catch matching the `try{` at L39434) swallows ANY mid-function
  exception (e.g. a `JSON.parse` failure on a corrupted `localStorage`
  entry) into an implicit `undefined` return — **the exact same return
  value as the genuine SUCCESS path**, which also falls off the end of the
  function with no explicit `return true`.
- **L39434:** both real callers explicitly branch on the return value —
  `L23281: if (saveEspnFinal(...) !== false) domFinalsAdded++;` and
  `L41881: if (saveEspnFinal(...) === false) return;` — **neither
  distinguishes "genuinely saved" from "an exception occurred mid-save."**
  A mid-function failure is silently counted as a successful save by both
  callers.
- **Current behavior:** save failure (exception) is indistinguishable from
  save success.
- **Target differentiated behavior:** `fieldOperation()` wrapping would let
  both callers correctly detect "the save did not complete" and either
  retry or surface it, instead of silently believing a broken save
  succeeded.
- **Re-verified independently this session (TASK 4 spot-check): CONFIRMED.**

### 2. `fetchNHLRelayScores` (index.html ~L20262) — 1 caller, CONFIRMED BUG

- The sole caller chains `.catch(e=>captureFieldError(...))`, but this
  function's own internal `catch` swallows the error FIRST — the
  telemetry call downstream never fires. The Health Panel is structurally
  blind to every real failure of this function.
- **Target:** migrate so the real error reaches the caller's
  `captureFieldError` chain, restoring the telemetry this code was
  written to produce.

### 3. `findESPNScore` (index.html ~L20723) — 25+ real callers

- **L20743 / L20762 / L20766:** the stale-final guard (`_staleFinalGuard`)
  ALREADY internally computes the exact reason a score is being rejected
  (a FINAL score from api-sports.io tagged to a future game's start_time —
  the documented June 10 2026 bug this guard exists to prevent) — then
  discards that computed reason and returns a bare `null`, identical to
  the genuine "no match found at all" case at L20770.
- **Current behavior:** every one of 25+ call sites treats "blocked as
  stale" and "genuinely no data" identically (a bare truthy check on the
  result).
- **Target:** since the reason is already computed internally, this is a
  near-zero-cost migration — thread the already-known reason through
  instead of discarding it. Highest-leverage single fix in the queue by
  call-site count.
- **Re-verified independently this session (TASK 4 spot-check): CONFIRMED.**

### 4. `generateJournalismViaRelay` (index.html ~L17548) — ✅ MIGRATED 2026-07-13

- **The original "unwanted live call" premise above was investigated and
  found NOT to hold — do not re-attempt a fix for it.** Traced a real
  caller (`renderSeriesPreviewCard`'s legacy-proxy fallback) end to end:
  in proof mode, `window.fetch` is globally monkey-patched (~L4866) to
  return `{}` for every request, including the legacy proxy's own
  `fetch(CLAUDE_PROXY_URL, ...)` call. That fallback also gets
  intercepted — `data.content` is undefined, `text` stays empty, the
  caller returns `null` regardless. No real live API call occurs whether
  or not `generateJournalismViaRelay`'s `_proofMode` skip is
  distinguished from a real failure. Rule 72 (inherited claims must be
  re-verified) applied here: the queue's own prior finding was wrong,
  caught before building a fix on top of it.
- **What WAS a real, present bug (fixed):** of this function's 3 real
  failure causes (HTTP error, missing `data.text`, model refusal), model
  refusal was the only one with no `captureFieldError` telemetry — despite
  its own header comment flagging model refusal as a "CRITICAL
  user-facing fix" (iPad-7). Added the same telemetry call the other 2
  causes already had. Verified via a real extraction test: model refusal
  now records exactly 1 `_fieldErrors` entry (was 0); the two
  already-telemetered causes and genuine success are unchanged.
  See `docs/outbox/cc-generatejournalismviarelay-typed-migration-2026-07-13.md`.

### 5. `journalismCallsToday().canCall` (index.html ~L25848) — ✅ MIGRATED 2026-07-13

- Added `blockedReason()` (additive; `canCall()`'s boolean contract
  unchanged, all 9 real callers keep working exactly as before) returning
  `'budget-exhausted' | 'backoff' | null`.
- **A confirmed, real bug found while surveying the 9 real callers (not
  a hypothetical opportunity):** `fetchCompoundEditorial` already tried to
  differentiate — it had a SEPARATE, more informative 429-backoff check
  (setting `window._compoundLastError` with a countdown) a few lines after
  its `canCall()` check. That second check could never fire: `canCall()`
  already returns `false` under the exact same `Date.now() <
  _compoundRetryAfter` condition, so the function always exited at the
  first check whenever backoff was active — the countdown message was
  dead code. Moved the diagnostic to the check that actually fires.
- Surveyed the other 8 call sites: `fetchFIELDBriefFromClaude` already
  deliberately bypasses `canCall()` for a documented reason ("J3 brief...
  compound 429 backoff must not gate it... bypassing canCall() backoff
  bleed" — already correct). The remaining 5
  (`fetchSeriesPreviewFromClaude`, the MLB/WNBA-own-budget branch, `fetchEPLMatchBriefFromClaude`,
  `fetchNightOwlFromClaude`, and the Scout's-Pick div-removal site
  ~L42351) just do a plain `if(!budget.canCall()) return null;` with no
  existing differentiation attempt to fix — `blockedReason()` is now
  available to them if a future session finds real value in adding it,
  not force-added here without a confirmed need (matching the same
  restraint used for `findESPNScore`'s untouched callers).
- Real verification: `journalismCallsToday()` itself (3 scenarios:
  available, budget-exhausted, in-backoff) and `fetchCompoundEditorial`'s
  guard specifically (backoff sets the message, budget-exhaustion does
  NOT set a misleading one, not-blocked proceeds normally) — 6 assertions,
  all passed. See
  `docs/outbox/cc-journalismcallstoday-typed-migration-2026-07-13.md`.

### 6. `fetchTeamRank` (index.html ~L24710) — 3 real callers, CONFIRMED BUG

- **L24726:** `catch(_) {}` on a `fetch()` with a 5s `AbortSignal.timeout`
  leaves `rank = null` — **the exact same value as a genuine
  "team not found in FIFA rankings" response** (`d.ok:false`).
- **L24728 / `FIFA_RANK_TTL = 7 * 24 * 60 * 60 * 1000`:** this `null` gets
  persisted to `localStorage` for a full **7 days**, identical treatment
  to a permanent "not ranked" result.
- **Current behavior:** a single transient network hiccup silences the
  upset-bonus signal for that team for a full week.
- **Re-verified independently this session (TASK 4 spot-check): CONFIRMED**
  — including the exact 7-day TTL value.

### 7. `fetchCompoundEditorial` (index.html ~L28308) — ✅ MIGRATED 2026-07-13

- The backoff-active branch's `window._compoundLastError` side-channel
  was fixed as part of entry #5 (it was dead code — see that entry).
  Extended the same mechanism to the budget-exhausted branch, which set
  no message at all: the Health Panel (~L5120/5123) displays
  `_compoundLastError` verbatim whenever the brief is static/missing, so
  a budget-exhausted state was showing whatever error happened to be set
  LAST — possibly hours old, from an unrelated failure — misleading
  anyone reading the panel about the real current cause. Now sets
  `journalism budget exhausted (N/50 calls used today)`.
- Proof-mode-skip (`if (_proofMode) return null;`) left untouched — its
  own comment explicitly documents this as deliberate ("prevents
  _fieldErrors entries" — avoids telemetry noise during test runs), not a
  gap.
- Real verification: forced budget-exhaustion with a pre-set stale
  `_compoundLastError` value, confirmed it's overwritten with the
  accurate current-cause message including the real call count.
  See `docs/outbox/cc-fetchcompoundeditorial-typed-migration-2026-07-13.md`.

### 8. `fetchFIELDBriefFromClaude` (index.html ~L31334) — ✅ MIGRATED 2026-07-13

- FIELD's flagship brief feature. The sole caller used to show ONE
  generic "Tonight's narrative is unsettled... didn't pass FIELD's
  verification chain" message for all 6 of: proof-mode (deliberate test
  skip), budget-exhausted (a resource-limit state, not a failure), "no
  ranked games" (a genuine data-state), deliberate suppression (decided
  game, intentional), legacy-proxy HTTP failure, and a quality-too-short/
  exception catch-all.
- **Real fix (return contract changed from `string|null` to
  `{ok:true,text}` / `{ok:false,reason}` — exactly 1 real caller, updated
  in the same commit, zero risk beyond this function):** the caller
  already renders a sensible static fallback (`buildFIELDBriefStatic`)
  into the DOM *before* this function is even called. For the 4
  intentional/expected reasons (`proof-mode`, `budget-exhausted`,
  `no-ranked-games`, `suppressed`), the caller now simply leaves that
  static text alone — no invented new copy, just correct routing. The 3
  genuine-failure reasons (`http-failure`, `quality-too-short`,
  `exception`) still show the exact same brand-safe "verification chain"
  card as before, unchanged.
- Real verification: 7 forced scenarios on the function itself (all 6
  reasons + genuine success) confirmed correctly tagged, plus 8 routing
  scenarios (including the success case) confirmed the caller sends each
  to the right UI outcome. See
  `docs/outbox/cc-fetchfieldbrieffromclaude-typed-migration-2026-07-13.md`.

### 9. `fetchMLBGameBriefFromClaude` (index.html ~L31786) — ✅ MIGRATED 2026-07-13

- **Investigated, found different from #8's shape:** unlike
  `fetchFIELDBriefFromClaude`, neither real caller has a "leave existing
  content alone" option — both show a "pending" loading card that must
  resolve to real text or removal. A sibling comment elsewhere in the
  codebase states the actual correct rule explicitly: "Always remove card
  on failure — never leave 'Loading brief…' stuck." Card removal on ANY
  failure reason (including a hypothetical budget-exhausted case) is
  already the right behavior here — there's no better UI a caller could
  offer. Caller-side differentiation would have been invented complexity
  with no real behavior to attach it to.
- **The real, confirmed gap:** this function had ZERO telemetry on either
  failure path — not even a `console.warn`, let alone `captureFieldError`.
  The Health Panel was completely blind to MLB brief failures. Added
  `captureFieldError('journalism:mlb-brief', ...)` to both the HTTP-failure
  and exception paths, matching the pattern `generateJournalismViaRelay`
  already uses.
- Real verification: forced HTTP failure and forced exception each now
  produce exactly 1 `_fieldErrors` entry (was 0); genuine success
  unaffected (0 entries, real brief text returned). See
  `docs/outbox/cc-fetchmlbgamebrieffromclaude-typed-migration-2026-07-13.md`.

### 10. `fdFetchStandings` (index.html ~L16983) — ✅ MIGRATED 2026-07-13

- **Investigated the "add a slashGolfFetch-style backoff" suggestion
  before building it:** `fdFetchStandings` has exactly 1 real caller
  (`toggleStandings`, a click-triggered panel expand, not a poll loop),
  and `fdStandingsCache` already prevents repeat fetches for the same
  competition within a session. The "hammering a 10 req/min free-tier
  limit" risk a dedicated backoff system exists to prevent is much lower
  for a user-click-triggered, already-cached call than for something
  polled on an interval — building that machinery here would be
  over-engineering relative to the actual risk.
- **What was real:** the catch had zero persistent telemetry (only a
  `FIELD_DEBUG`-gated `console.warn`). Added `captureFieldError`.

### 11. `fetchDateSchedule` (index.html ~L7231) — ✅ MIGRATED 2026-07-13

- Confirmed real: budget-exhausted (`canUseAPI()` false — a resource
  limit, retrying is futile until the daily counter resets) and a genuine
  HTTP/parse failure (retrying might work) both produced the same
  "⚠️ Couldn't load schedule... Check the browser console... Retry"
  message, with a Retry button that would fail again immediately for the
  budget case.
- Migrated the return contract from `array|null` to `{ok:true,sections}`
  / `{ok:false,reason}`. The sole caller (`goToDate`) now shows a calm,
  non-alarming "Today's AI schedule lookups are used up... try a date
  already covered by ESPN, or check back tomorrow" message (no Retry
  button — retrying can't help) for budget-exhaustion, and the exact same
  error-with-retry message as before for genuine failures. New copy was
  required here (unlike #8) since there's no pre-existing static fallback
  to simply leave alone — written in the app's existing calm/informational
  tone (matching the "no major events" empty-state), not the alarming
  ⚠️ style, since budget-exhaustion isn't a broken state.
- Real verification: 4 forced scenarios on the function (budget-exhausted,
  HTTP failure, no-games success, real-games success) all correctly
  tagged; 4 caller-routing scenarios confirmed each routes to the right
  UI outcome.

### 12. `fetchESPNFixturesForDate` (index.html ~L7369) — ✅ MIGRATED 2026-07-13

- **Investigated before building the suggested caller differentiation:**
  the sole caller (`goToDate`, shared with entry #11) falls back to the
  AI schedule generator whenever this returns `null`, regardless of
  cause — and correctly so, since the AI prompt covers leagues (tennis,
  rugby, cricket) this ESPN sweep doesn't fetch at all. No caller-visible
  behavior would change from telling "genuinely empty day" apart from
  "every per-league fetch failed" — same conclusion as `findESPNScore`
  earlier this session.
- **What was real:** this function fans out `Promise.all` across 15+
  per-league ESPN endpoints, each with its own catch that silently
  discarded any error (`FIELD_DEBUG`-gated `console.debug` only). An
  ESPN-wide outage affecting every league would have been completely
  invisible — indistinguishable from a genuinely quiet sports day. Added
  a failure counter and a single summary `captureFieldError` call
  (`"N/M per-league fetches failed for {date}"`) when any league fails.
- Real verification: forcing every league fetch to fail now produces
  exactly 1 summary telemetry entry (was 0); a genuinely empty day (all
  fetches succeed, zero events) correctly produces zero telemetry — no
  false-positive noise.

### 13. `shareGame` (index.html ~L38874) — ✅ MIGRATED 2026-07-13 — LAST BUCKET A ITEM

- Confirmed the original finding: both `navigator.share` and the
  clipboard fallback failing left zero user feedback — no toast, unlike
  the success path. Fixed with a real failure toast.
- **A second, more interesting issue found while reading closely, not in
  the original note:** `navigator.share()` throws a `DOMException` named
  `'AbortError'` when the user simply cancels the native share sheet — a
  deliberate choice, not a failure. The old code treated an `AbortError`
  identically to a genuine share failure: silently writing the share text
  to the clipboard anyway and showing "Copied to clipboard!" for an
  action the user never took. Fixed to respect a deliberate cancel — no
  clipboard fallback, no toast, nothing happens, matching what the user
  actually asked for.
- Real verification: 5 forced scenarios (share succeeds, user cancels,
  genuine share failure → clipboard succeeds, no share API → clipboard
  succeeds, total failure) all produce the correct toast/no-toast/
  clipboard-call outcome. See
  `docs/outbox/cc-sharegame-typed-migration-2026-07-13.md`.

**This closes all 13 ranked Bucket A entries in this queue.** Bucket B
(281 sites, telemetry-only) remains a candidate for a future, separate,
lower-priority sweep — not attempted in this pass.
## Bucket B — grouped by function, not itemized (281 sites across 129 functions)

Batch cleanup candidate for a future, separate, lower-priority telemetry
CC-CMD — not individually prioritized. Grouped per TASK 3's own
instruction. "Call Sites" = number of real callers found for that function.

| Count | Function | Call Sites | Representative Reason |
|---|---|---|---|
| 8 | `fetchBDLRecentForm` (~L18765) | 0 | ✅ INVESTIGATED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 1b): NOT dead code — deliberate staged/gated work, own comment documents "Layer 2" of a planned 3-layer BDL momentum integration; no shipped Momentum feature found to wire it into. Left exactly as-is, untouched — not deleted, not force-wired. |
| 8 | `fetchFinalsDesk` (~L34794) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): this function has 3 distinct real catches (enqueue, poll, direct-proxy fallback), each hitting genuinely different infrastructure — unlike the NBA-standings tier pattern, granular instrumentation is more useful here, not less. Added `captureFieldError` to all 3: `journalism:finals-desk-enqueue`, `journalism:finals-desk-poll`, `journalism:finals-desk-fallback`. Step 1's sessionStorage cache-read catch is a separate, already-classified Bucket C entry (~L520) — correctly left untouched. Forced-tested all 3 (isolated snippets — function too complex/large for full extraction). Zero caller behavior change. |
| 7 | `renderFieldDesk` (~L13706) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): the queue's own reasoning ("sibling Card-1 catch DOES log, showing this is a gap not a design choice") applies verbatim to every other silent card catch in this function, not just Card 2 — found 6 more identical-shape silent catches (Cards 3, 4, 5, 6×2 [a duplicate "Card 6" label exists in the source itself], plus the P5 static-fallback), all within this same named function. Added `captureFieldError` to all 7: `render:field-desk-card{2,3,4,5}`, `render:field-desk-card6-{antihype,epl}`, `render:field-desk-static-fallback`. The trivial nested per-entry title lookup inside Card 3's forEach is a separate, already-classified Bucket C entry (~L548) — correctly left untouched. Forced-tested all 7 (isolated snippets — function is DOM-heavy). Zero caller behavior change. |
| 7 | `fetchCompoundEditorial` (~L28152) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): checked especially closely per the CC-CMD's own warning (touched twice already this session, `3a9a52a`/`dbd91f7`). The main outer catch already had direct `window._fieldErrors.push({fn:'fetchCompoundEditorial',...})` telemetry (pre-existing, unrelated to this session's work) — the Chunk 1 cap/dedup protects it automatically since it's a real `.push()` call. The genuinely still-uninstrumented gap was the cached-JSON parse-failure catch at the top of the function. Added `captureFieldError('journalism:compound-cache-parse', ...)`. Forced-tested. Zero caller behavior change. |
| 6 | `_bundleFinalizedAt` (~L6973) | 1 | Single caller does bare `bundleTs \|\| _finalizedAt[...]`; all 6 distinct null causes in this function collapse to the same fallback. |
| 6 | `fetchStakesBriefFromClaude` (~L31946) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): added `captureFieldError('journalism:stakes-brief', ...)` to the generation catch. Forced-tested. Zero caller behavior change. |
| 5 | `_computeSRPlayEPA` (~L10355) | 1 | Sole caller events.map(_computeSRPlayEPA).filter(Boolean) discards all null reasons identically |
| 5 | `_resolveRealGameId` (~L10646) | 5 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierb) — NOT migrated: this function has zero try/catch anywhere in its body. Every `return null;` is a deliberate decision boundary (no `_gameId` field yet, `espnScores` TDZ guard, 0-or-2+ ambiguous fuzzy-match candidates, stale-final guard) — not an exception. Adding `captureFieldError()` here would fabricate a failure signal for normal, correct branching. No code change. |
| 5 | `generateJournalismViaRelay` (~L17545) | 5 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): its 3 real failure causes (HTTP error, missing data.text, model refusal) already had telemetry from an earlier session (Bucket A #4). This CC-CMD's actual target was the earlier "bad prompt" guard (`!prompt \|\| prompt.length < 10`) — added `captureFieldError('journalism:generate:'+briefType, ...)` there. The `_proofMode` bypass one line above was deliberately left untouched — already confirmed a real, deliberate skip, not a failure (see entry #4 above). Forced-tested (bad-prompt fires, proof-mode does not). Zero caller behavior change. |
| 5 | `fetchWNBAGameBriefFromClaude` (~L31847) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): added `captureFieldError('journalism:wnba-brief', ...)` to the generation catch. Forced-tested. Zero caller behavior change. |
| 5 | `computeBroadcastNarrativeIndex` (~L35883) | 7 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierb) — NOT migrated: zero try/catch anywhere in this function. Every `return null;` is a deliberate business-logic branch (not national, genuinely-exciting-live-situation exclusion, not elimination-inflation, not home-market) — not an exception. Same finding as `_resolveRealGameId` above; no code change. |
| 4 | `renderJournalism` (~L14029) | ~7 | Date-label formatting failure silently skipped; sibling code later in same function (14162-14167) DOES use captureFieldError, showing the gap |
| 4 | `fetchLeagueRSS` (~L31004) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): added `captureFieldError('journalism:league-rss', ...)` to the fetch/parse catch. Forced-tested. Zero caller behavior change. |
| 4 | `fetchCountryContext` (~L31079) | 1 | Sole caller does bare `if (!cc) return;` inside a `.then()` — every failure reason collapses identically. |
| 4 | `fetchSeriesArchive` (~L31738) | 1 | Sole caller returns `ctx` unchanged on any falsy result — relay-not-ready and missing-key indistinguishable. |
| 4 | `fetchGameBriefOnDemand` (~L32289) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3, corrected 2026-07-13 same day): this function has 2 real catches, both now instrumented. Added `captureFieldError('journalism:game-brief-on-demand', ...)` to the generic NBA/NHL/other branch's generation catch. **The championship-archive enrichment catch was initially instrumented, briefly reverted on discovering the pre-existing Bucket C entry (~L735) for this exact site, then RECLASSIFIED B AND REINSTATED** on reconsideration: "null-safe, returns ctx unchanged on any failure" describes the fallback's correctness, not whether the failure deserves telemetry — structurally identical to `dramaScoreLive`'s weather-lookup catch (Tier A, already shipped as Bucket B), an optional-enrichment failure that leaves a variable at its prior value either way. Added `captureFieldError('journalism:champ-archive-enrich', ...)`. See the corresponding Bucket C entry below, marked reclassified. **Real bug found and fixed via this same investigation:** `budget` was declared `const` inside `if (!usesOwnBudget) {...}`, but referenced via `budget.inc()` in the generic branch well outside that block — a genuine `ReferenceError` on every successful generic-branch generation, previously invisible because it landed in the (until-now-silent) catch. Hoisted the declaration to function scope; `journalismCallsToday()` itself is a pure factory (safe to call unconditionally). Forced-tested including a direct proof that a genuine success now reaches `budget.inc()` without throwing. Zero *intended* caller behavior change (the bug fix is a correctness restoration, not a new behavior). |
| 4 | `fetchEPLMatchBriefFromClaude` (~L32421) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3, corrected 2026-07-13 same day): this function has 2 real catches, both now instrumented. Added `captureFieldError('journalism:epl-brief', ...)` to the main generation catch. **The H2H/form-context builder catch was initially instrumented, briefly reverted on discovering the pre-existing Bucket C entry (~L736) for this exact site, then RECLASSIFIED B AND REINSTATED** on reconsideration — same reasoning as `fetchGameBriefOnDemand`'s champ-archive site above: an optional-enrichment failure leaving strings blank is structurally identical to `dramaScoreLive`'s weather catch, not a complete/correct business-logic state in the way true Bucket C entries are. Added `captureFieldError('journalism:epl-brief-context', ...)`. See the corresponding Bucket C entry below, marked reclassified. Forced-tested both sites. Zero caller behavior change. |
| 4 | `fetchMLBPlatoon` (~L36632) | 1 | Sole caller (injectMLBPlatoon) does if(!platoon) return; regardless of which internal guard fired. |
| 4 | `restoreSnapshot` (~L42541) | 1 | Sole caller uses .finally() only — the false return is never read, so this branch is purely decorative. |
| 4 | `predictNextOpenHour` (~L42600) | 0 | ✅ QUEUE CORRECTION 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous): flagged for removal by this queue's caller-census, but smoke.js A405 requires its existence as part of the documented P5 anticipatory-prefetch startup-polish bundle (patent-relevant, USPTO-filing-adjacent). Not dead code by the codebase's own definition — NOT removed. |
| 3 | `fetchMLBTeamMomentum` (~L8565) | 2 | Both callers use `.catch(()=>null)` plus `m?.last10?.length` — unknown-team-ID, HTTP failure, and thrown exception are all treated identically today. |
| 3 | `loadCFLScoreboard` (~L12661) | 2 | Both callers treat null and empty array identically (`!games\|\|!games.length`), discarding HTTP-not-ok vs other reasons |
| 3 | `bdlFetch` (~L14785) | 2 | Both callers (bdlFetchInjuries/bdlFetchStats) do bare `if(!data\|\|!data.data) return []`, no distinction from missing key vs other failure. |
| 3 | `fetchPrerenderedJournalism` (~L17622) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3) — STALE ENTRY, not migrated: already fully migrated. All 3 real branches (`!r.ok`, missing `data.brief`, and the catch) already call `captureFieldError('journalism:prerendered-fetch', ...)`. This entry describes pre-migration state from an earlier, undated session. No code change. |
| 3 | `fplLoadBootstrap` (~L21651) | 1 | sessionStorage parse failure falls through to live fetch attempt; single caller only checks final boolean, no differentiation. |
| 3 | `fetchSchedule` (~L23093) | 4 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('schedule:perf-mark', ...)` to the `performance.mark('field:cards')` wrapper. Genuinely near-impossible to trigger in a real browser, but a real catch nonetheless. Updated smoke.js A503 (exact-string structural assertion) to match. Forced-tested. Zero caller behavior change. |
| 3 | `fetchSchedule (golf load callback)` (~L23350) | 1 | Wraps computeGolfDerivedMetrics(); hasGolfSection logic proceeds identically whether or not derived metrics computed. |
| 3 | `fetchSeriesPreviewFromClaude` (~L28527) | 2 | Both call sites just do `if(text){...} else if(staticText){...}`, discarding why generation failed. |
| 3 | `fetchUserState` (~L29063) | 3 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('user:fetch-state', ...)` to both the `!r.ok` branch and the catch block. Forced-tested (both failure sites fire, real success fires none). Zero caller behavior change. |
| 3 | `getESPNInjuriesForGame` (~L30456) | 1 | Sole caller only checks `inj && inj.length`; every null cause collapses to "no injury tag". |
| 3 | `getNHLPlayoffLeadersForGame` (~L30619) | 1 | Sole caller does `if(leaders && leaders.length)` then falls to NBA check regardless of cause. |
| 3 | `getNBAPlayoffLeadersForGame` (~L30777) | 1 | Sole caller only checks `nbaLeaders && nbaLeaders.length`; reason for null unused. |
| 3 | `fetchNHLGameNotes` (~L30986) | 1 | Same P1-P4 cascade caller pattern; missing-id vs fetch-failure indistinguishable. |
| 3 | `fetchLastMeeting` (~L31757) | 0 | ✅ QUEUE CORRECTION 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous): flagged for removal by this queue's caller-census, but smoke.js A610 documents it as deliberately staged/gated Archive D1 work (behind `ARCHIVE_RELAY_READY`, same pattern as `fetchBDLRecentForm`) — a zero-caller count alone doesn't mean dead when the codebase's own structural checks protect it as staged. NOT removed. |
| 3 | `fetchArchiveDate` (~L31769) | 1 | Caller does `if (!r) continue;` per date in a 14-day loop — every failure reason skipped identically. |
| 3 | `fetchPrerenderedGameBrief` (~L31779) | 4 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('journalism:prerendered-game-brief', ...)` to the fetch/parse catch. Forced-tested (fetch rejection fires, real success fires none). Zero caller behavior change. |
| 3 | `fetchWCTabBrief` (~L33298) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): same enqueue/poll shape as `fetchFinalsDesk` (no direct-fallback tier here). Added `captureFieldError` to both: `journalism:wc-tab-brief-enqueue`, `journalism:wc-tab-brief-poll`. Step 1's sessionStorage cache-read catch is a separate, already-classified Bucket C entry (~L523) — correctly left untouched. Forced-tested both. Zero caller behavior change. |
| 3 | `_wcComputeAllScenarios` (~L34239) | 3 | ✅ RESOLVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 2): investigated directly against source, all 3 real callers confirmed correct as Bucket B (none need differentiation). Narrow telemetry added: `captureFieldError` on the `typeof computeGroupScenarios !== 'function'` branch only (real code-integrity failure) — the other 2 `return null;` paths (empty standings, caught exception) are genuinely benign and left untouched. Proven via forced-condition test: fires only on the missing-function branch. |
| 3 | `fetchNBAPBP` (~L36278) | 1 | Feeds a tiered fallback (if(cdnActions)) inside fetchRosterAdvantage that only cares about truthiness to advance to the next data tier. |
| 3 | `fetchRosterAdvantage` (~L36387) | 1 | Sole caller does if(!rai) return;; missing cacheKey indistinguishable from any other failure. |
| 3 | `_eDataMatchesGame` (~L39398) | 1 | Invalid-input false is one of three false paths saveEspnFinal (L39429) collapses into a single reject-and-log action; no differentiation used. |
| 2 | `fetchESPNFixturesForDate (events.map callback)` (~L7389) | 1 | Per-event null is immediately `.filter(Boolean)`ed away in the same function; caller never distinguishes malformed-competition from any other skip reason. |
| 2 | `soccerFBrefInit` (~L8535) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): this function already had telemetry via `_recordRelayInit()` — a separate, pre-existing system (`window._relayInitStatus`, latest-status-only, from `CC-CMD-2026-07-11-relay-init-staleness-visibility`) that does NOT feed the Health Panel's "Runtime Errors" count. Added `captureFieldError('soccer:fbref-init', ...)` alongside the existing calls at both the `!r.ok` and catch sites — genuinely additive, not redundant, since it makes this failure visible in the same Health Panel surface as every other Bucket B/C addition. Forced-tested (both existing `_recordRelayInit` and new `captureFieldError` fire together). Zero caller behavior change. |
| 2 | `getSoccerFBrefStats` (~L8546) | 2 | Both call sites (home/away) just do `if(hStats)`; exact-match miss vs fuzzy-match miss are indistinguishable and unneeded to distinguish. |
| 2 | `subscribeToPush` (~L9158) | 2 | Both callers (`Notification.requestPermission` handlers) fire-and-forget without reading the returned boolean at all — the real UX differentiation already happens via btn.textContent side effects inside the function. |
| 2 | `getVolatilityIndex` (~L10465) | 1 | Sole caller getVolatilityLabel does bare `if (v === null) return null`, discarding why history was too short |
| 2 | `renderAll` (~L11503) | 30+ | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): added `captureFieldError('render:all-signature-stamp', ...)` to the signature-stamp write's bare catch. Forced-tested (failure fires 1 entry, success fires none). Zero caller behavior change. |
| 2 | `buildPlayoffSpecials` (~L13472) | 1 | journalNote stat-edge enrichment failure silently dropped, no telemetry despite established captureFieldError pattern elsewhere |
| 2 | `renderJournalismCompanion` (~L14615) | 2 | "Later Tonight" block build failure silently omits that block from the sidebar with zero telemetry anywhere in this function |
| 2 | `loadPGASlate` (~L16786) | 1 | `if(!r.ok) return null` collapses HTTP errors into the same null the sole caller (`if(!d) return;`) treats identically to a network exception. |
| 2 | `fetchESPNStandings` (~L17132) | 1 | Sole caller (toggleStandings ESPN fallback) does `if(espnEntries&&espnEntries.length){...}` then falls to an identical "all sources failed" stub regardless of cause. |
| 2 | `buildSafeScoreWrap` (~L22006) | 1 | Inner catch of Layer-3 fallback chain; whichever layer fails, function falls to Layer 4 raw numbers identically. |
| 2 | `renderESPNScores` (~L22570) | ~15 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): investigated directly against source — the real swallow point is NOT `renderESPNScores`' own sync-only `try{loadWCMatchWP()}catch(_){}` wrapper, it's `loadWCMatchWP()`'s own internal `.catch(() => {})` at the end of its promise chain (index.html ~L34095), which silently ate every real network/fetch failure. Added `captureFieldError('wc:match-wp-load', ...)` there instead of the redundant outer wrapper. Forced-tested (fetch rejection fires 1 entry, success fires none). Zero caller behavior change. |
| 2 | `loadBroadcastArchaeology` (~L24352) | 1 | sessionStorage cache-read catch falls through to a fresh 14-day archive fetch; single recovery path regardless of corruption vs miss. |
| 2 | `fetchMLBStandingsParsed` (~L29900) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('standings:mlb-parsed', ...)` to the catch. Forced-tested. Zero caller behavior change. |
| 2 | `fetchBDLSeasonAverages` (~L30047) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('bdl:season-averages', ...)` to both the `!r.ok` branch and the catch block (matching the established two-site convention). The localStorage-read cache-miss fallback (a separate, already-classified Bucket C entry below, ~L557) was correctly left untouched — different bucket. Forced-tested (both sites fire, real success fires none). Zero caller behavior change. |
| 2 | `fetchBDLMilestones` (~L30078) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1) — NOT migrated: zero try/catch anywhere in this function. Its only `return null;` (no players from the shared season-averages fetch) is already covered by `fetchBDLSeasonAverages`'s own telemetry, added in this same CC-CMD. The function's actual return value (`best`) being `null` — no player near a milestone tonight — is a completely normal, expected outcome, not a failure. Same pattern as `computeBroadcastNarrativeIndex`/`_resolveRealGameId`/`fetchStandingsForPrompt` from the prior Tier B CC-CMD. No code change. |
| 2 | `fetchNHLStandingsParsed` (~L30115) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('standings:nhl-parsed', ...)` to the catch. Forced-tested. Zero caller behavior change. |
| 2 | `fetchMLSStandingsParsed` (~L30140) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('standings:mls-parsed', ...)` to the catch. Forced-tested. Zero caller behavior change. |
| 2 | `fetchStandingsForPrompt` (~L30161) | 3 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierb) — NOT migrated: zero try/catch anywhere in this function; it's a pure sport-name dispatcher (`if(sport.includes('MLB')) return fetchMLBStandingsParsed(); ...`) that delegates to sport-specific fetchers or returns null for unmapped sports (NFL/soccer, deliberately documented as "acceptable"). Same finding as `_resolveRealGameId`/`computeBroadcastNarrativeIndex` above; no code change. |
| 2 | `getESPNInjuriesForGame(nameToAbbr)` (~L30466) | 2 | Used via `game._homeAbbr \|\| nameToAbbr(...)`; `\|\|` discards why the lookup failed. |
| 2 | `espnInjuriesPrefetch` (~L30495) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): `espnInjuriesPrefetch`'s own outer `try{fetchESPNInjuries(...)}catch(_){}` only catches sync throws since `fetchESPNInjuries` is async — same pattern as the Tier A `loadWCMatchWP` finding. Added `captureFieldError('espn:injuries-prefetch', ...)` at the real swallow point inside `fetchESPNInjuries`'s own catch instead. Forced-tested. Zero caller behavior change. |
| 2 | `fetchMLBGameNotes` (~L30960) | 1 | Sole caller falls through to assembleNoteFromContext on any falsy note — reason discarded. |
| 2 | `fetchWCStandings` (~L32663) | 2 | Both callers (boot Promise.all and .catch(()=>null) wrapper) store the result without distinguishing HTTP-fail from other causes. |
| 2 | `evaluateEMBER` (~L35995) | 1 | Sole caller does if(emberResult) regardless of whether it was tier-1-ineligible or gate-failed. |
| 2 | `fetchNBALiveBoxscore` (~L36147) | 2 | Both callers use liveBS?.homeOncourt?.length optional chaining, treating missing-ID and fetch-failure identically. |
| 2 | `parseESPNPlays` (~L36356) | 1 | Sole caller (Tier 2 in fetchRosterAdvantage) only checks pbpData truthiness to decide whether to fall to Tier 3. |
| 2 | `fetchNightOwlFromClaude` (~L40304) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): this 900+-line function has 7+ optional prompt-context-enrichment catches (stat context, WC context, user context, drama context, stat-of-day, ESPN-leaders cold-cache fallback) — each individually low-value, benign-failure-prone, analogous to `dramaScoreLive`'s single weather-lookup case, not to `renderFieldDesk`'s per-card catches (each of THOSE represents a whole visible UI section, not an internal prompt-enrichment sub-stage). Deliberately left those untouched. Added `captureFieldError('journalism:night-owl', ...)` to the one real, load-bearing generation catch (matching the queue's own actual description — the HTTP/generation failure, not any context-enrichment stage) via an isolated verbatim snippet (function too large for full extraction). Zero caller behavior change. |
| 1 | `fetchMLBSchedule (proof-mode override)` (~L4912) | 1 | Result immediately `.filter(Boolean)`ed by the override itself; caller of real fetchMLBSchedule never sees this test-fixture path at all. |
| 1 | `getMLBAnalyticsContext` (~L8077) | 2 | Both callers already wrap the call in their own try/catch and fall back to '' regardless of what the inner catch does — outer wrapping is fully decorative. |
| 1 | `getStandingVelocity` (~L10310) | 2 | ✅ RESOLVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 2): investigated directly against source, both real callers confirmed correct as Bucket B (cosmetic momentum note omission either way). Narrow telemetry added: `captureFieldError` on the `gbRecent === null || gbBase === null` branch only (findGB nickname/abbrev match failure — could mask a real team-name-matching bug) — the other 4 `return null;` paths (missing args, insufficient history, no baseline in window, below-threshold delta) are genuinely benign and left untouched. Proven via forced-condition test: fires only on the findGB-no-match branch. |
| 1 | `_fetchUFLGameEpa` (~L10408) | 1 | Sole caller _pollUFLEpa awaits with no return-value check; poll loop retries every 60s regardless of failure reason |
| 1 | `getVolatilityLabel` (~L10478) | 2 | Both callers (line 28057, 35021) just do `vL ? ... : ''` ternary, no distinction of reason |
| 1 | `_fieldGameRenderPayload` (~L10769) | 1 | Sole caller embeds result directly into a signature array via .map with no null check |
| 1 | `findConflicts` (~L11091) | 1 | Sole caller renderConflictChip(findConflicts(...)) never sees the swallow; a bad date just silently drops one game from bucketing, no telemetry |
| 1 | `renderConflictChip` (~L11176) | 2 | Inline `t=''` fallback used directly in template; no caller ever inspects why time formatting failed |
| 1 | `buildTodaySchedule` (~L12024) | 1 | Immediately followed by `.filter(Boolean)` — postponed-game null and any other null reason are indistinguishable to the caller |
| 1 | `buildWCMediaCards` (~L13304) | 1 | journalNote enrichment failure silently kept prior default; no logging despite codebase's established captureFieldError convention elsewhere |
| 1 | `renderJournalism (via openJournalismForGame)` (~L14196) | 1 | Silent re-render failure leaves stale journalism content on screen with no indication; codebase convention elsewhere uses captureFieldError here it's missing |
| 1 | `renderArchiveTimeline` (~L14255) | 1 | decodeURIComponent guarded only on the "expand" branch while the sibling collapse branch (same file, unguarded) shows an inconsistent, undertelemetered pattern |
| 1 | `bdlLoad` (~L14819) | 1 | Catches JSON.parse/storage errors then falls through to same `return null` as cache-miss; caller can't and needn't distinguish. |
| 1 | `injectJ1J4Badges` (~L15255) | 1 | Swallows entire background poll loop (network/timeout/parse errors alike); badge silently stays without brief either way, no retry differentiation exists. |
| 1 | `fdFetchH2H` (~L17068) | 1 | Sole caller only does `if(h2h) h2hLine=buildH2HSummary(...)`, silently omitting H2H context on any failure type. |
| 1 | `GameSocket` (~L17939) | 1 | Outer catch returns false, but the sole external caller (`if(gs&&gs.available) gs.signalCrunch(detail);`) never inspects the return value at all. |
| 1 | `ensureGameSocket` (~L17945) | 1 | null guard is redundant with the sole caller's pre-check (`if(_gSport&&_gId&&...)`), and that caller discards ensureGameSocket's return value entirely. |
| 1 | `fetchV2AllScores(WC brief IIFE)` (~L18456) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): added `captureFieldError('journalism:v2-wc-brief-consume', ...)` to the inline IIFE's catch (real location ~L18542, inside `fetchV2AllScores`). Forced-tested via verbatim extraction of the IIFE. Zero caller behavior change. |
| 1 | `fetchV2AllScores(NBA brief IIFE)` (~L18502) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): added `captureFieldError('journalism:v2-nba-brief-consume', ...)` to the analogous NBA brief IIFE (real location ~L18588). Forced-tested. Zero caller behavior change. |
| 1 | `fetchV2AllScores(NHL brief IIFE)` (~L18539) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): added `captureFieldError('journalism:v2-nhl-brief-consume', ...)` to the analogous NHL brief IIFE (real location ~L18625). Forced-tested. Zero caller behavior change. |
| 1 | `findESPNScore` (~L20770) | 25 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): added `FIELD_OPERATIONS.recordFailure(...)` (matching this function's own existing `_recordStaleFinalBlock` convention, `severity:'trace'`) to the final generic no-match `return null;`. Forced-tested including a 75-call tight-loop stress test — collapses to 1 entry with `count:75` via the Chunk 1 rate-limit, not a flood. Success path (real match found) fires zero telemetry. Zero caller behavior change. |
| 1 | `fetchMLBSchedule` (~L20974) | 1 | Catch returns null (vs success's possibly-empty array) but sole caller chain (loadMLBSlate→fetchMLBFixtures/refreshMLBStatus) collapses both to "skip update" regardless |
| 1 | `_mlbAvgPitchesPerAtBat` (~L21024) | 1 | Feeds avgPitchesPerAtBat field; sole consumer _mlbWhosUpNext only checks ==null, no differentiation possible. |
| 1 | `loadMLBSlate` (~L21133) | 2 | Both fetchMLBFixtures/refreshMLBStatus treat null as one signal (fallback/skip); no distinction between empty-slate vs fetch failure. |
| 1 | `fetchFPLLiveScores` (~L21795) | 2 | Both callers (20578 .catch, 23326 bare) never inspect internals; catch already fully swallows, next poll retries regardless. |
| 1 | `renderNewspaper` (~L23043) | 1 | Wraps applyFieldPickBadge() call defensively; badge simply doesn't apply on error, no differentiated recovery exists. |
| 1 | `fetchSchedule (CFL load callback)` (~L23417) | 1 | Same scheduleRenderAll() defensive wrapper pattern as the golf one at 23380. |
| 1 | `fetchSchedule (BDL prefetch callback)` (~L23437) | 1 | Guards a `.some()` check + fetch kickoff; on error the prefetch simply never fires, no differentiated fallback. |
| 1 | `saveMyTeams` (~L23834) | 1 | localStorage.setItem failure silently swallowed; sole caller (39199) is fire-and-forget with no return value to check. |
| 1 | `buildStreamingDiscovery` (~L24191) | 1 | Sole caller uses `buildStreamingDiscovery() \|\| STREAMING_APPS` — the textbook bare `\|\| default` decorative pattern. |
| 1 | `initPWA` (~L24527) | 0 | Top-level IIFE catch around SW registration setup; app functions fully without a SW, no caller ever inspects this. |
| 1 | `_readCachedRank` (~L24703) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('scores:fifa-rank-cache-read', ...)` to the corrupt-cache catch. Forced-tested. Zero caller behavior change. |
| 1 | `fetchTeamRank` (~L24728) | 3 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): confirmed via TASK 0 this is genuinely distinct from the earlier `94a1043` fix (that fix addressed the `fieldOperation()`-wrapped fetch/HTTP-status logic; this is the separate `localStorage.setItem` persist-failure catch that runs after the fetch already succeeded). Added `captureFieldError('scores:fifa-rank-persist', ...)`. Forced-tested (persist failure fires, in-memory `_fifaRankCache` still returns the real rank regardless; real success fires none). Zero caller behavior change. |
| 1 | `dramaScoreLive` (~L24878) | 14 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): added `captureFieldError('drama:live-weather-lookup', ...)` to the weather-lookup catch. Forced-tested (failure fires 1 entry, sitBonus simply not incremented; no weather alert present fires zero telemetry). Zero caller behavior change. |
| 1 | `_initBannedExtension` (~L26295) | 1 | JSON.parse catch on cached banned-phrase extension; sole caller hasCliche() reads whatever _bannedExtension ended up as, no differentiation. |
| 1 | `retryWithSportVocab` (~L26816) | 4 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('journalism:sport-vocab-review-log', ...)` to the localStorage review-log catch. Forced-tested. Zero caller behavior change. |
| 1 | `maybeScoreRetry` (~L27315) | 8 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('journalism:score-retry-phrase-log', ...)` to the Tier-3 low-score phrase-logging catch. Chosen as the required proportionate stress-test entry (highest real caller count, 8, among functions with a genuine failure path in this batch) — 25 tight-loop forced firings collapsed to exactly 1 entry with `count:25`, confirming the Chunk 1 rate-limit holds at this tier too. Zero caller behavior change. |
| 1 | `renderProseScore` (~L27691) | ~15 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): added `captureFieldError('journalism:prose-score-persist', ...)` to the localStorage persist catch. Forced-tested (failure fires 1 entry, real persist success fires none, non-Brief/Night-Owl early-return path unaffected). Zero caller behavior change. |
| 1 | `buildLayer3Rules` (~L27736) | 1 | Per-game try/catch around extra-period/extreme-event rule computation; forEach loop just skips that one optional rule and continues. |
| 1 | `buildCompoundPrompt (populateSeriesContext wrapper)` (~L28063) | 1 | IIFE swallow around a mutation call; buildSeriesContextTags(g) right after reads whatever fields did or didn't get populated, single path. |
| 1 | `buildFIELDBriefStatic` (~L28701) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3) — NOT migrated: zero try/catch anywhere in this function. It's a pure synchronous text-assembly function; its only `return null;` (`!ranked.length`, no games at all) is a deliberate, correct branch, not an exception. Same pattern as `computeBroadcastNarrativeIndex`/`_resolveRealGameId`/`fetchStandingsForPrompt`/`fetchBDLMilestones` from prior tiers. No code change. |
| 1 | `getFieldUserId` (~L28777) | 2 | Both callers (_userDoRelay, fetchUserState) only check `if(!userId)`, never inspect the cause. |
| 1 | `visibilitychange listener (peak_missed)` (~L29041) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): added `captureFieldError('userdo:peak-missed-visibility', ...)` to the listener's catch (real location ~L29304). Forced-tested. Zero caller behavior change. |
| 1 | `_connect` (~L29459) | 3 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('ambient:sse-connect', ...)` to the `EventSource` construction catch. Forced-tested. Zero caller behavior change. |
| 1 | `fetchNBAStandingsParsed` (~L30010) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): this function has 3 separate fallback-tier catches (ESPN, NBA CDN relay, BallDontLie), each already `console.warn`-only. Added exactly ONE aggregate `captureFieldError('standings:nba-parsed', ...)` right before the final `return null;` (after all 3 tiers exhausted) — matching the earlier `fetchESPNFixturesForDate` precedent (a single summary signal, not one per sub-failure) and the CC-CMD's own singular framing ("after all three fallback sources fail"). Forced-tested: all-3-fail fires exactly 1 entry; tier-1 success fires none and tiers 2/3 are never attempted. Zero caller behavior change. |
| 1 | `nhlPlayoffLeadersPrefetch` (~L30639) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): same sync-only-outer-catch pattern as `espnInjuriesPrefetch` above — added `captureFieldError('nhl:playoff-leaders-prefetch', ...)` at the real swallow point inside `fetchNHLPlayoffLeaders`'s own catch. **Real nuance found via forced testing:** `Promise.allSettled([...])` never rejects, and the function's own `if (!sk && !gk) return ...` already gracefully absorbs a total fetch failure one line before the catch — confirmed via a real forced test that a total-fetch-failure scenario produces ZERO telemetry (correct, not a gap). The catch is only reachable if `buildNHLPlayoffLeadersByTeam()` itself throws given a malformed-but-successful response — a genuine code-integrity signal, narrower than "network failure" but real. Forced-tested both scenarios. Zero caller behavior change. |
| 1 | `nbaPlayoffLeadersPrefetch` (~L30795) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): same pattern and nuance as `nhlPlayoffLeadersPrefetch` above — added `captureFieldError('nba:playoff-leaders-prefetch', ...)` at the real swallow point inside `fetchNBAPlayoffLeaders`'s own catch, only reachable via a `buildNBAPlayoffLeadersByTeam()` bug, not a total-fetch-failure (that's already gracefully absorbed one line earlier). Forced-tested both scenarios. Zero caller behavior change. |
| 1 | `fetchFIELDBriefFromClaude` (~L31236) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2) — STALE ENTRY, not migrated: describes a `.filter(Boolean)`-discarded inline IIFE pattern that no longer exists anywhere in the current file. The function's only real call site (`initFIELDBrief`, ~L31773) was already fully migrated to a typed `{ok, text/reason}` contract with full caller-side branching in entry #8 above (commit `adfc01e`), earlier in this same session — this entry describes the function's pre-migration shape. No separate "inline IIFE variant" exists to touch. No code change. |
| 1 | `_wcAdvancementProb` (~L34316) | 2 | Both callers just check hAdvResult&&aAdvResult truthiness to decide whether to render the bar; no reason differentiation. |
| 1 | `renderWCBracketTree` (~L34579) | 2 | Fetch failure silently produces empty slots={}; both external callers only .catch(()=>{}) ignoring any reason. |
| 1 | `buildArbitrageReport` (~L35310) | 2 | Both callers do if(!report\|\|report.totalGames===0) / if(arb&&...), treating "no data" and "no allData" identically. |
| 1 | `computeDramaRetroactive` (~L35659) | 1 | Sole caller does if(!arc) return;, uniformly discarding whether states were missing or something else. |
| 1 | `parseNBACDNActions` (~L36308) | 1 | Feeds the same NBA CDN tier in fetchRosterAdvantage; sole caller only checks truthiness before falling to Tier 2. |
| 1 | `buildWCBars` (~L38869) | 1 | Sole caller (L11467) only checks truthy string; loadWCProjectionsCache() fallback data already covers cache-miss, catch adds no caller-visible signal. |
| 1 | `isRivalGame` (~L39059) | 7 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('rivalry:is-rival-game', ...)` to the TDZ-guard catch. Forced-tested (TDZ failure fires, real rivalry match fires none). Zero caller behavior change. |
| 1 | `isObjectiveRival` (~L39083) | 1 | Catch(e){return false} caller (L39156, BLOOD GAME chip) only branches on truthy/falsy, can't tell lookup-crash from genuine non-rival. |
| 1 | `hydrateEspnScoresFromFinals` (~L39765) | 2 | Both real callers invoke it as a bare statement with zero return-value consumption; catch offers only internal safety. |
| 1 | `buildDramaLineTiers` (~L40740) | 1 | getDramaTrend() catch just leaves trend='' fallback; sole caller only checks .tight truthiness, never sees this distinction. |
| 1 | `openBottomSheet` (~L41553) | 7 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('bottomsheet:postgame-drama', ...)` to the postgame drama-string catch. Forced-tested (via isolated snippet — the full function is DOM-heavy). Zero caller behavior change. |
| 1 | `idbSet` (~L42518) | 1 | Return value is completely unconsumed at the sole call site (await idbSet(...) with no check); catch is pure decoration. |
| 1 | `saveSnapshot` (~L42535) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): confirmed both real invocation paths (`visibilitychange` listener, `beforeunload` reference). Added `captureFieldError('snapshot:save', ...)` to the catch. Forced-tested. Zero caller behavior change. |
## Bucket C — grouped by function (519 sites across 257 functions)

Legitimately correct as-is. Grouped rather than itemized per-site given
scale (519 individual justifications would mostly duplicate the same
handful of patterns — boolean predicates, lookup-miss semantics,
best-effort/fire-and-forget catches, and documented "insufficient data"
states). Full 519-line per-site detail is in this session's scratchpad
(`all_sites_classified.txt`) if a future session needs it — not committed
here, as it would roughly double this file's size for marginal durable
value over the grouped view.

| Count | Function | Call Sites | Representative Reason (why correctly excluded) |
|---|---|---|---|
| 17 | `fetchNightOwlFromClaude` (~L39791) | 1 | Budget-exhausted null is an intentional policy gate, not a failure; sole caller only checks truthiness for fallback UI. |
| 16 | `_onMessage` (~L29193) | 9 | Bus-listener "never throw" convention; bsd frame relay is fire-and-forget with no return consumer. |
| 10 | `injectJ1J4Badges` (~L15102) | 1 | Swallows optional gate-label refinement lookup; badge injection continues either way, no observable difference to the single caller. |
| 9 | `GameSocket` (~L17867) | 1 | Swallows hello-message send failure in onopen; DUAL-MODE architecture comment states polling fallback covers any WS gap regardless of cause. |
| 8 | `predictGoaliePullState` (~L19486) | 1 | "no game" guard; sole caller does `if (pullSig) lines.push(...)` |
| 8 | `fetchCompoundEditorial` (~L28228) | 1 | Catch guards a diagnostic body-text read for error logging; failure just leaves bodyTxt empty, non-critical. |
| 8 | `fetchFinalsDesk` (~L34806) | 1 | sessionStorage.getItem cache-read failure is non-critical; code simply proceeds to rebuild, which is already correct. |
| 8 | `renderNightOwlRecap` (~L41933) | 5 | seriesMap override catch just leaves stale seriesRecord in place; no external caller of renderNightOwlRecap observes internal steps. |
| 7 | `_mlbWhosUpNext` (~L21075) | 1 | Documented guard: no liveGame means no forecast; caller just skips chip render, correct as designed. |
| 7 | `fetchWCTabBrief` (~L33306) | 1 | sessionStorage.getItem read guard (Safari private-mode throw), execution continues to build fresh brief either way. |
| 7 | `saveEspnFinal` (~L39529) | 2 | Drama-persistence POST failure is fire-and-forget after the game entry is already safely persisted; no caller impact. |
| 6 | `computeCutLineProjection` (~L16455) | 3 | Comment documents null as "suppress" signal; all 3 callers only do `if(cut){...}` — no data, too-early, and thin-field states are equally "don't show badge". |
| 6 | `buildChampionshipContext` (~L32190) | 6 | Doc comment states null means "not applicable"; all 6 callers gate on `if(champCtx)` — genuine non-clinch state. |
| 5 | `shouldShowMLBNAlert` (~L10490) | 1 | Sole caller buildMLBNAlertChip does `if(!tier) return ''`; null legitimately means "no alert warranted" |
| 5 | `computeGolfPackDensity` (~L16514) | 3 | Comment explicitly documents null as "insufficient data" signal; all 3 callers just `if(pack){...}`. |
| 5 | `getStatOfDay` (~L20010) | 15 | "no game" guard; all 15+ call sites use `? getStatOfDay(...) : null` then truthy-check |
| 5 | `renderCardBadges` (~L36873) | 1 | Void DOM-mutation error boundary isolating the crunch-signal fetch from the rest of badge rendering; no return value for any caller to act on. |
| 4 | `getStandingVelocity` (~L10292) | 2 | Missing required params; both callers (away/home velocity) just do `if(!vel...)`, a genuine "can't compute" precondition. |
| 4 | `_isUpset` (~L14311) | 1 | Boolean predicate used in `games.filter(_isUpset)`; missing game/scores correctly means "not detectable as an upset" |
| 4 | `fetchWeather` (~L15724) | 1 | Swallows sessionStorage cache-read error, falls through to live network fetch — correct degrade, no caller ever sees this branch. |
| 4 | `fetchSavantGameFeed` (~L20681) | 2 | "no sourceId" guard; both callers check truthiness of the resolved promise |
| 4 | `initFIELDBrief` (~L31364) | 1 | archiveBrief is a fire-and-forget logging call; failure must not block brief rendering — correct swallow. |
| 4 | `_handleMessage (BracketDO WS IIFE)` (~L33501) | 1 | Isolates a non-critical narrative-panel render from the WS message handler so a render bug can't break bracket updates. |
| 4 | `buildComebackProbability` (~L41428) | 1 | Post-game state correctly yields "not applicable"; sole caller does \|\| '' fallback for display. |
| 3 | `buildJournalismQualitySection` (~L8823) | 1 | Corrupted field_jq_scores JSON self-heals to the already-declared empty array — correct fallback, single caller (My Services modal). |
| 3 | `isScoutsPick` (~L10028) | ~20 | Gate-0 boolean eligibility check; false correctly means "excluded by national-broadcast gate," core predicate semantics. |
| 3 | `isShowCurrentlyAiring` (~L13205) | 1 | Boolean predicate consumed by `if(isShowCurrentlyAiring(card))`; missing time field correctly means "not airing" |
| 3 | `renderFieldDesk` (~L13720) | 1 | Trivial inner title lookup over a simple forEach; falls back to bare gid, negligible failure surface |
| 3 | `loadUpsets` (~L14526) | 1 | Corrupted sessionStorage cache correctly falls through to a live relay fetch, same fallback regardless of failure reason |
| 3 | `fetchBDLPlayerContext` (~L18727) | 1 | Cache-read catch falls through to fetch, identical to fetchESPNAthleteStats pattern |
| 3 | `predictNHLGameCharacter` (~L19434) | 2 | "no game" guard; both callers do `if (gameChar)` truthy check |
| 3 | `getNHLPDOSignal` (~L19545) | 1 | "no abbrev" guard; sole caller does `if (hPDO_t) lines.push(...)` |
| 3 | `computePenaltyDriftSignal` (~L19574) | 1 | "non-numeric penalty counts" guard; sole caller does `if (driftSig)` |
| 3 | `predictNBAGameCharacter` (~L19920) | 2 | "no game" guard; both callers do `if (gameChar)` truthy check |
| 3 | `fetchSoccerFixtures (event mapper)` (~L21823) | 1 | Stale-date guard returns null; consumed via `.filter(Boolean)` at line 21873 — exactly the correct filter-skip semantic. |
| 3 | `fieldEvents 'field:all_final' listener` (~L29798) | 1 | Best-effort renderAmbientPanel call inside idle-callback wrapper. |
| 3 | `fetchBDLSeasonAverages` (~L30036) | 1 | Corrupt/missing localStorage cache is silently ignored, falling through to a live fetch. |
| 3 | `getHeadCoachForTeam` (~L30319) | 2 | Comment states missing entries "gracefully produce no [COACH] tag" — null is the correct semantic for an unmapped team. |
| 3 | `getSeriesHistoricalAnchor` (~L30334) | 1 | Caller only does `if(anchor)`; null legitimately means no anchor exists for this series/round. |
| 3 | `populateSeriesContext` (~L30862) | 2 | Best-effort mutation; on failure game.injuries stays unset, which buildSeriesContextTags already treats as "no tag". |
| 3 | `buildGameContext` (~L31115) | 2 | dramaTrend already defaults via `?? 0`; exception just keeps the same pre-initialized neutral value. |
| 3 | `renderMLBGameBriefCard` (~L31827) | 1 | Wraps archiveBrief(), a documented fire-and-forget analytics POST that already internally .catch()s. |
| 3 | `renderWNBAGameBriefCard` (~L31927) | 1 | archiveBrief() fire-and-forget catch, same documented non-blocking analytics pattern. |
| 3 | `renderStakesBriefCard` (~L32085) | 1 | archiveBrief() fire-and-forget catch. |
| 3 | `loadWCMatchWP` (~L33764) | 1 | sessionStorage.getItem read guard; falls through to live fetch either way, no behavior change. |
| 3 | `fetchESPNPlays` (~L36294) | 0 | ✅ REMOVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 1): re-confirmed zero callers fresh, made obsolete by the ESPN Pivot migration. Deleted. |
| 3 | `isGrindingGame` (~L39090) | 1 | Sole real caller (L39169) uses as pure boolean chip gate; "!eData/not live" is a correct predicate result, not an error state. |
| 3 | `assessInjuryPriceImpact` (~L40504) | 1 | Invalid/incomplete game object correctly yields "nothing to assess"; sole caller discards on null. |
| 2 | `diff` (~L4243) | 1 | Only caller does `if(result)`; null here (bad viewport) and null at 4275 (no movers) are both "no shift", indistinguishable and correctly so. |
| 2 | `loadBriefQualityRow` (~L5376) | 1 | Corrupted sessionStorage cache falls through to a fresh network fetch — the only sane behavior, not worth further differentiation. |
| 2 | `gameHasFreeStream` (~L6594) | 3 | True boolean predicate used only as `.filter()` callback at all 3 call sites — false correctly means "no free stream." |
| 2 | `getUmpireABSRating` (~L7948) | 2 | Static reference-table lookup; missing umpire name means no badge can be shown, which is correct, not an error state. |
| 2 | `getParkFactor` (~L7967) | 2 | Static lookup guard for missing team abbreviation; both callers just skip the badge via optional chaining. |
| 2 | `getPitchTempo` (~L8029) | 1 | Static reference lookup; missing pitcher name means no tempo badge, a correct no-data outcome. |
| 2 | `getPitchArsenal` (~L8037) | 1 | Static reference lookup guard on missing pitcher name, mirrors getPitchTempo's pattern exactly. |
| 2 | `getMLBProbablePitchers` (~L8302) | 1 | "Not yet loaded" (phase<2) and 8304's "no cached IDs" both mean the same thing to the sole caller: skip the pitcher signal this render. |
| 2 | `getTeamLogo` (~L9631) | 1 | Soccer-branch lookup miss; sole caller (logoImg / matchupHTML via getTeamLogo) does `if(!url) return ""`, and img has onerror fallback by design (per adjacent comment). |
| 2 | `detectArcType` (~L9929) | 1 | Null-guard on missing game object; sole caller only checks truthiness for the `[Arc: ...]` prompt line. |
| 2 | `buildSlateScoutsPick` (~L9988) | 2 | Both callers do `if(topPick)`; empty/invalid input array is a genuine "nothing to pick from" case. |
| 2 | `buildSlateScoutsPick._rankSignal` (~L10002) | 1 | Internal sort-comparator helper; a scoring exception just leaves rank un-incremented, safe default for ordering only. |
| 2 | `isDomesticLeagueInBreak` (~L10195) | 2 | Missing league label predicate; both callers use it as a `.filter()`/`if()` gate where false means "not in break." |
| 2 | `parseSeriesRecord` (~L10209) | 3 | No parseable series text; all 3 callers gate on `if(ctx)`/truthiness identically regardless of why parsing failed. |
| 2 | `recordStandingsSnapshot` (~L10284) | 1 | Corrupted localStorage history JSON self-heals to empty array — correct fallback for a snapshot-recording function, single caller. |
| 2 | `findEspnEntry` (~L10593) | 15 | All ~15 callers just do `if(!eData)` skip; null is the idiomatic "no matching game found" finder-function result |
| 2 | `buildDynamicPregames` (~L13132) | 1 | Wrapped in `!!(...)`; false from the catch is indistinguishable from and equally correct as "not scout's pick" |
| 2 | `_fetchWCTournBriefForSchedule` (~L13377) | 1 | Explicitly commented `/* non-blocking */`; documented intentional fire-and-forget design |
| 2 | `toggleJournalismView` (~L13946) | ~6 | Defensive catch around window.scrollY read; virtually unreachable, no meaningful differentiated action exists |
| 2 | `loadArchiveTimeline` (~L14281) | 1 | Corrupted sessionStorage cache correctly falls through to a live relay fetch — same fallback regardless of parse-vs-storage failure reason |
| 2 | `_upsetDogPrice` (~L14329) | 2 | Both callers explicitly check `!= null` and use `\|\| 0` fallback — null "no price data" is already correctly distinguished from a real value |
| 2 | `loadMarketConsensus` (~L14495) | 1 | Corrupted sessionStorage cache correctly falls through to a live relay fetch, same fallback regardless of failure reason |
| 2 | `renderJournalismArchive` (~L14747) | 1 | Corrupted sessionStorage cache correctly falls through to a live relay fetch, same fallback regardless of failure reason |
| 2 | `windContextNote` (~L15570) | 1 | null legitimately means "wind too light / venue unknown to apply context"; sole caller (injectWeatherBadges) ternary-defaults to unmodified wx either way. |
| 2 | `isOutdoorVenue` (~L15587) | 2 | Boolean predicate: false correctly means "not outdoor/unknown venue"; both callers just `if(!isOutdoorVenue(...)) return;` to skip weather logic. |
| 2 | `getVenueCoords` (~L15599) | 2 | null legitimately means "venue unknown or indoor"; both callers (injectWeatherBadges, weatherPrefetchAll) do `if(!coords) return;` uniformly. |
| 2 | `slashGolfFetch` (~L16026) | 1 | Swallows localStorage cache-read error, falls through to budget check + live fetch — correct degrade path already implemented. |
| 2 | `injectPGALeaderboard` (~L16600) | 1 | Safety-net catch around optional pack-density chip DOM injection; sole caller (loadPGASlate flow) has no use for the exception detail. |
| 2 | `_isGolfRoundComplete` (~L16683) | 1 | false correctly means "not complete" when pgaData missing; sole caller only branches on truthy to trigger saveGolfRoundFinal. |
| 2 | `loadPGASlate` (~L16779) | 1 | Swallows sessionStorage cache-read error, falls through to live relay fetch — correct degrade, invisible to the sole caller. |
| 2 | `buildGolfPromptContext` (~L16901) | 1 | Swallows optional pack-density prompt-line construction; failure just omits one context line for the journalism prompt. |
| 2 | `fetchV2AllScores(filter)` (~L18342) | 0 | Array.filter predicate exclusion — genuine "not a wc26 entry" boolean, not a failure |
| 2 | `fetchESPNAthleteStats` (~L18643) | 1 | Cache-read catch falls through to network fetch regardless of reason; single correct action |
| 2 | `fetchNHLLiveStats(pickSkaterLeader)` (~L18844) | 2 | "no skaters" sentinel; both home/away callers truthy-check identically |
| 2 | `fetchNHLLiveStats` (~L18885) | 1 | byPeriod-extraction catch; optional enrichment, silent-by-design matches surrounding comments |
| 2 | `fetchMLBLeader(pickPitcher)` (~L18925) | 2 | "no current pitcher id" sentinel; home/away callers truthy-check |
| 2 | `getNHLAbbrev` (~L19195) | 11 | "no team name" guard; all 11+ call sites use `\|\|` fallback or truthy check |
| 2 | `getNHLSpecialTeams` (~L19262) | 1 | "no abbrev" guard; sole caller getNHLEffectiveST propagates via truthy check |
| 2 | `fetchESPNWinProb` (~L20657) | 1 | !r.ok guard; sole caller checks `wp !== null` before using |
| 2 | `resolveGameIdByHome` (~L20718) | 3 | Empty catch preceding final `return null`; all callers use `\|\|` fallback for missing _gameId |
| 2 | `_mlbRecentPitchPaceMs` (~L21009) | 1 | "sample too thin" guard; comment explicitly states "genuinely thin — omit, don't guess" design philosophy |
| 2 | `_mlbAvgPitchesPerAtBat` (~L21019) | 1 | "sample too thin" guard; same documented design philosophy as sibling function |
| 2 | `fetchSoccerFixtures (dedup filter)` (~L21894) | 1 | Array.filter predicate: false = "already have this game by id", the exact intended boolean meaning. |
| 2 | `resolveGameBroadcast` (~L22122) | 3 | `!game.streams.length` guard; enrichGame/two callers (38271,38339) treat null as "no broadcast to show", a genuine no-data state. |
| 2 | `fetchNewspaper` (~L22786) | 1 | Header comment: "returns null and renderNewspaper exits as a no-op (zero degradation)" — documented intentional, sole caller (42636) matches exactly. |
| 2 | `_isFieldDevMode` (~L22823) | 1 | localStorage/URLSearchParams read guard for a boolean predicate; false is the correct default, sole caller just gates an `if`. |
| 2 | `getCachedTeamRank` (~L24739) | 1 | `!teamName` guard mirrors fetchTeamRank's; correct semantic, not an error. |
| 2 | `espnTeamMatch` (~L25679) | 15 | Boolean predicate guard for missing names; false is the textbook "no, they don't match" correct semantic. |
| 2 | `scoreProse` (~L27562) | ~15 | `!text` guard; every caller (e.g. maybeScoreRetry line 27259 `if(!scoreObj \|\| ...)`) already handles null as "skip scoring", correct semantic. |
| 2 | `_findGame` (~L28337) | 2 | `if(!id) return null` is a normal "no id supplied" lookup guard, same semantics as Array.find returning nothing. |
| 2 | `renderSeriesPreviewCard` (~L28667) | 1 | Best-effort archiveBrief call after text already applied to DOM and sessionStorage. |
| 2 | `getPulseChip` (~L29506) | 1 | Sole caller ternary-discards, but null genuinely means "no notable pulse pattern" — a complete, non-error state. |
| 2 | `_dispatchIfChanged` (~L29643) | 2 | Invalid-input guard; both real callers (emitScoreEvent) discard the boolean return entirely. |
| 2 | `fieldEvents 'field:final' listener` (~L29731) | 1 | Best-effort checkForNewFinals call deferred via setTimeout; same bus-listener convention. |
| 2 | `fieldEvents 'field:otw_changed' listener` (~L29831) | 1 | Best-effort chip-to-stamp DOM swap inside a setTimeout callback. |
| 2 | `fetchESPNInjuries` (~L30429) | 2 | localStorage read guard; on failure correctly falls through to a live network fetch. |
| 2 | `fetchNHLPlayoffLeaders` (~L30584) | 1 | localStorage read guard; failure correctly falls through to live fetch. |
| 2 | `fetchNBAPlayoffLeaders` (~L30729) | 1 | localStorage read guard; correctly falls through to network fetch on failure. |
| 2 | `fetchGameNotes` (~L31032) | 2 | localStorage read guard; correctly proceeds to fetch a fresh note on cache-read failure. |
| 2 | `buildMyTeamsBriefLine` (~L31293) | 1 | No MY_TEAMS set — a legitimate "nothing to personalize" state, caller only checks truthy. |
| 2 | `getLinkedWCGame` (~L33387) | 1 | Lookup-style function; sole caller passes result straight to renderWCMiniCard which treats null as "no game to pin" (legit state). |
| 2 | `_cflMatchOdds` (~L33689) | 2 | Lookup function; both callers do `if(odds){...}` — null correctly means "no matching CFL odds entry found." |
| 2 | `_wcLookupAdvance` (~L33830) | 2 | Lookup helper; null cache/byTeam genuinely means "no projections loaded yet," matching documented contract. |
| 2 | `_wcMatchTeamName` (~L33951) | 2 | Boolean name-matching predicate; false for missing input is the correct "no match" answer, not an error state. |
| 2 | `_wcMatchOdds` (~L33985) | 1 | Lookup function whose result is `.filter(Boolean)`'d by its one caller — null is a genuine "no odds entry for this fixture." |
| 2 | `_otwGetLiveTier` (~L37065) | 2 | Comment states "Returns a named condition string...or null"; both callers correctly treat null as "no tier" via if(liveTier) or \|\|'LIVE_GAME'. |
| 2 | `buildOTWStateLabel` (~L37751) | 1 | Comment explicitly documents null as "no named condition applies — banner shows no badge"; sole caller's \|\| fallback matches this design. |
| 2 | `getOTWMomentum` (~L38068) | 2 | Function is explicitly documented as a binary yes/no signal; both callers do momentum==='up', for which null is the correct "no" value. |
| 2 | `renderOneToWatch` (~L38299) | 5 | Void error boundary around a CustomEvent dispatch; renderOneToWatch has no return value for any caller to differentiate. |
| 2 | `isRivalGame` (~L39057) | 7 | Loop-internal return false means "playing your own team" — genuine boolean predicate, all 7 callers use it as pure filter/badge condition. |
| 2 | `isCrunchTimeGame` (~L39067) | 2 | "!eData or not live" correctly means not-in-crunch; sole real caller (L39150 buildVibeChips) uses it as plain boolean gate. |
| 2 | `isAloneOnScreen` (~L39101) | 1 | "!allData.sports" correctly degrades to "can't determine, treat as not alone"; sole caller (L39160) only uses it as a badge gate. |
| 2 | `buildCheapSeats` (~L40369) | 1 | No streams is a genuinely correct "nothing to show" state; sole caller (L11469) does if(!_cs) return ''. |
| 1 | `recordShift (inner try around performance.getEntriesByType)` (~L4118) | 2 | Phase-tag lookup for CLS telemetry; failure just leaves default 'skeleton' phase, non-critical instrumentation. |
| 1 | `CLS native-path init (top-level, not a function)` (~L4149) | 0 | po.observe() wrapped defensively; if it throws, CLS monitoring simply doesn't run — acceptable degrade for a diagnostics-only feature. |
| 1 | `gatherInterest` (~L4207) | 1 | querySelectorAll over static hardcoded selector list; per-selector catch is unreachable in practice, pure defensive guard. |
| 1 | `snapshot` (~L4234) | 2 | Per-element getComputedStyle/getBoundingClientRect guard; skipping one detached element is the correct behavior, not an error to surface. |
| 1 | `wpt test-mode bypass (top-level, not a function)` (~L4853) | 0 | Comment explicitly documents intended behavior: private-mode localStorage failure just leaves modal showing normally. |
| 1 | `N/A — comment text only, not executable code` (~L4945) | 0 | Regex/scanner false positive: line is `// captureFieldError — replace bare catch(e){}...`, a comment describing the pattern, not an actual catch block. |
| 1 | `buildFieldHealthPanel (inline onclick string builder)` (~L5113) | 1 | Debug-panel-only "Reset backoff" button; swallowing localStorage/DOM errors here is fine, it's dev-diagnostic UI. |
| 1 | `showFieldHealthPanel` (~L5309) | 1 | Fire-and-forget setTimeout wrapping an optional debug call; loadBriefQualityRow already has its own internal fallback path. |
| 1 | `pruneOldFieldData (top-level IIFE)` (~L6659) | 0 | Outer catch on startup housekeeping; failure just means pruning is skipped this session, correct graceful no-op. |
| 1 | `delta15 (top-level IIFE)` (~L6724) | 0 | Same pattern as pruneOldFieldData — startup cache-pruning IIFE, silent skip is the intended degrade. |
| 1 | `isGameOver` (~L6873) | 1 | Boolean predicate with single caller (getCardCircadian); false correctly means "not confirmed over," falls to documented LATE fallback. |
| 1 | `setDramaDial` (~L7139) | 1 | Optional badge re-injection after a settings change; swallowing a re-render error here is a reasonable non-critical UI safeguard. |
| 1 | `canUseAPI` (~L7158) | 3 | Genuine boolean budget-gate predicate; false legitimately means "no budget left," 3 callers each already branch on truthiness only. |
| 1 | `getCached` (~L7214) | 2 | Corrupted sessionStorage JSON is indistinguishable in effect from "no cache" — both callers correctly treat it as cache-miss and refetch. |
| 1 | `buildDateSchedule` (~L7346) | 1 | Static lookup table miss ("unknown date") intentionally triggers the ESPN/AI fallback chain — this is a legitimate "don't know" answer, not an error. |
| 1 | `_lookupEspnCableSlot` (~L7744) | 1 | Static schedule-table lookup miss; single caller does a plain truthy check and falls through to the next broadcast-tier check, correct behavior. |
| 1 | `getCalendarContext` (~L7923) | 5 | Final fallback of a pure date-window classifier; all 5 call sites treat null as "no seasonal context applies," a genuine answer not a failure. |
| 1 | `calendarContextSentence` (~L7928) | 1 | Pure pass-through null-in/null-out guard on top of getCalendarContext's own legitimate null. |
| 1 | `mlbStatsInit` (~L8339) | 1 | Per-file fetch swallow in a Promise.allSettled loop; comment documents intended fallback to hardcoded stubs, single startup call site. |
| 1 | `formatPitcher` (~L8600) | 0 | ✅ REMOVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 1): re-confirmed zero callers fresh, no rich chat/Drive history surfaced. Deleted. |
| 1 | `isBigMarketGame` (~L9922) | 1 | Simple boolean membership predicate; false genuinely means "not a big-market team," used directly in a comparison expression. |
| 1 | `isScoutsPick (wrapped in inline try/catch inside .filter)` (~L9990) | ~20 | isScoutsPick is defensively try/catch-wrapped to `false` at ~20 call sites throughout the file — this is an established, consistent codebase convention, not an anomaly. |
| 1 | `_wcGetPAdv` (~L10087) | 4 | Missing scenario/team data lookup; all 4 call sites use `?? null` or `!= null` checks and treat absence as "no advancement signal available." |
| 1 | `preGameScore` (~L10110) | 1 | Milestone-boost try/catch defaults to mb=0, one additive signal among many in a scoring function — safe no-op on failure. |
| 1 | `isToday` (~L10161) | 20+ | Invalid-date boolean predicate used purely as a `.filter()` gate at 20+ call sites — false correctly excludes the game, no differentiation possible. |
| 1 | `_srSitToYL100` (~L10348) | 1 | Malformed play-situation object (no yardline) — sole caller (_computeSRPlayEPA) treats it as "can't compute EPA for this play," a correct skip not an error. |
| 1 | `getVolatilityLabel` (~L10481) | 2 | Mid-range/low-drama is a genuine "not distinctive enough" verdict, not a failure state |
| 1 | `_fieldCurrentFilteredSports` (~L10796) | 1 | Sole caller renderRightNow gets `visible` (unfiltered) fallback on any filter error — already a sensible graceful degrade |
| 1 | `renderAll` (~L11506) | 30+ | Bare catch insulates renderAll from optional newspaper-voice feature; single caller, no differentiated action possible, correct isolation |
| 1 | `_plEuroNote` (~L12262) | 0 | ✅ REMOVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 1): re-confirmed zero callers fresh — computed European-qualification stakes prose for hardcoded EPL Final Day 2026 fixtures; callers removed during routine date-schedule rotation once that day passed, normal lifecycle. Deleted. Pattern note for a future session: computing title/European/relegation stakes generically from live table position (not hardcoded to specific teams/dates) is worth rebuilding next time a similar run-in situation approaches for any league — see outbox manifest. Also found (not removed, out of this CC-CMD's scope): sibling functions `_plTotNote`/`_plWhuNote` in the same local scope are now ALSO zero-caller by the same fresh check, but were not part of this CC-CMD's named removal list — flagged as a follow-up candidate, not deleted. |
| 1 | `elimination_boost` (~L12390) | 1 | Sole caller applyNarrativeContext does `if(ctx){...}`; null legitimately means "no narrative context applies", a real "not applicable" result |
| 1 | `_archiveBrief` (~L13933) | 3 | Docstring states "fire-and-forget... guarantee an archive failure cannot block the visible brief render" — documented correct design |
| 1 | `openJournalismForGame` (~L14190) | 1 | Defensive catch around closeBottomSheet(); best-effort cleanup, execution correctly proceeds to open journalism view regardless |
| 1 | `bdlSave` (~L14809) | 1 | Fire-and-forget localStorage persist; sole caller (bdlFetchInjuries) never checks bdlSave's outcome at all. |
| 1 | `bdlLoad` (~L14814) | 1 | null legitimately means "no cache entry"; sole caller `if(stored){...}` treats cache-miss as the correct no-op path. |
| 1 | `fetchAQI` (~L15706) | 1 | Sole caller (fetchWeather) explicitly comments "non-blocking" and does `if(aqiData) wx.aqi=...`; AQI failure is intentionally inconsequential. |
| 1 | `getUpcomingMajor` (~L15897) | 1 | null correctly means "no major within the 5-day preview window"; sole caller does `if(!major\|\|!container) return;`. |
| 1 | `slashGolfBudgetOk` (~L16006) | 1 | Boolean predicate for a 429-backoff window; used only as `!slashGolfBudgetOk()` gate inside slashGolfFetch, false is the genuine "not ok" signal. |
| 1 | `getActiveTournaments` (~L16151) | 1 | Array.filter predicate: false means "exclude tournament with no date", the complete correct semantic for a filter callback. |
| 1 | `fdFetchLive` (~L17033) | 0 | ✅ REMOVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 1): re-confirmed zero callers fresh — superseded by a batched-fetch refactor. Traced `fdPrefetchSoccerLive`'s current body directly: it calls `fdFetch()` (the shared low-level relay wrapper), not `fdFetchLive()` — confirmed no direct or indirect call before deleting. `fdLiveCache`/`fdLiveCacheTime` (still written by `fdPrefetchSoccerLive`) left untouched; `FD_LIVE_TTL` const is now orphaned as a side effect and flagged as a follow-up candidate, not removed (out of this CC-CMD's explicit scope). Deleted. |
| 1 | `_isModelRefusal` (~L17528) | 1 | Boolean guard `if(!text) return false` is a legitimate defensive default; sole call site already ensures text is non-empty before calling. |
| 1 | `findScore` (~L17730) | 1 | null legitimately means "no witness score from either source yet"; sole caller (findESPNScore) falls to the legacy espnScores lookup, a genuine complete-as-is signal not an error. |
| 1 | `ensureGameSocket` (~L17983) | 1 | Comment explicitly states "never throw from socket handler"; swallow is intentional so a downstream emitScoreEvent failure can't break the WS message pipeline. |
| 1 | `mapV2ToESPN` (~L17998) | 2 | Guard for missing fg.id; one caller uses raw result, other does `\|\|{}` — both discard the single failure reason |
| 1 | `mapV2ToESPN(clockSeconds IIFE)` (~L18018) | 1 | Local closure; "unparseable clock" sentinel consumed once via `!=null` check in same function |
| 1 | `renderWCBracketImpact` (~L18128) | 1 | Sole caller does `.catch(()=>{})`; comment states "non-blocking" by design, fully discarded |
| 1 | `fetchV2AllScores(inline)` (~L18274) | 1 | localStorage quota/private-mode write swallow; no caller, ignoring write failure is correct |
| 1 | `_parseESPNStatLine(get)` (~L18604) | 4 | "stat not found" sentinel consumed via truthy `&&` chains everywhere in caller, single meaning |
| 1 | `(midnight-crossover watcher IIFE)` (~L19113) | 0 | Comment explicitly says "swallow — must not block fetchSchedule()"; self-invoked, intentional |
| 1 | `(midnight-crossover watcher IIFE outer)` (~L19116) | 0 | Same explicit intentional swallow per adjacent comment |
| 1 | `getNHLEffectiveST` (~L19274) | 6 | "no special-teams data" — every caller (getNHLAnalyticsContext etc.) does `if(!st) return` |
| 1 | `getNHLGoalieProfile` (~L19288) | 4 | "no lastName" guard; all callers truthy-check the profile object |
| 1 | `getNBAAbbrev` (~L19821) | 5 | "no name" guard; all callers use `\|\|` fallback or direct truthy check |
| 1 | `getNBAClutchProfile` (~L19844) | 2 | "no lastName" guard; both callers check `?.tier === 'elite'` |
| 1 | `fetchESPNScores(_extractLeader)` (~L20486) | 2 | "no leader in ESPN payload" sentinel; both home/away call sites assign via truthy check |
| 1 | `findESPNScore(_staleFinalGuard)` (~L20734) | 0 | Genuine boolean predicate: false = "not blocked" — correct complete semantic, not a failure |
| 1 | `normalizeMLBPitcher` (~L20946) | 2 | "no probable pitcher" guard; both home/away callers render "TBD" via truthy checks downstream |
| 1 | `getCrewContext` (~L21613) | 4 | All 4 call sites (27872,28036,31191,39796) do `if(!cc) return ''`; null-crew is a legitimate "unknown" case per header comment. |
| 1 | `_raiRehydrateScoreWrap` (~L22211) | 2 | Comment "silent — non-critical"; both callers (22512,22523) never use the (nonexistent) return value at all. |
| 1 | `claimCardRegion` (~L22296) | 0 | STAGED per adjacent comment, zero real callers yet; false is designed win/lose predicate, not an error state. |
| 1 | `_wwFindCard` (~L22874) | 1 | Guard for empty home/away strings; sole caller's onclick handler only checks `if(c)`, null correctly means "nothing to scroll to". |
| 1 | `renderNewspaper` (~L22987) | 1 | Date-format catch leaves freshness='' (already the initialized default); single-path, self-contained, no external caller affected. |
| 1 | `fetchSchedule` (~L23080) | 4 | Comment: "fetch optional — hardcoded fallback active"; buildTodaySchedule() runs unconditionally right after regardless of this try's outcome. |
| 1 | `initStreak (IIFE in fetchSchedule)` (~L23321) | 0 | Self-invoking, no external callers; localStorage failure just means the streak badge doesn't persist — a genuinely benign, designed no-op. |
| 1 | `squiggleToFieldGame` (~L23538) | 1 | Sole caller (23599) does `.map(squiggleToFieldGame).filter(g=>g&&...)`; null is the exact intended "skip malformed AFL fixture" signal. |
| 1 | `refreshLive (startSquiggleEngine)` (~L23652) | 1 | Self-recursive poll loop; catch(e){/* silent */} then unconditionally re-schedules next tick — retry already happens automatically regardless of cause. |
| 1 | `lazyObs (IntersectionObserver callback)` (~L24388) | 1 | Comment: "Fire-and-forget archive sweep; never blocks streaming render" — explicit, correct-by-design isolation. |
| 1 | `fetchTeamRank` (~L24711) | 3 | `!teamName` guard; genuinely correct "can't look up nothing" semantic, not a failure state. |
| 1 | `getFranchiseMisery` (~L25789) | 2 | `!teamName` guard; both callers (27875-76, 35005-06) treat null as "no misery fact for this team", a genuine data-absence case. |
| 1 | `detectSportClass` (~L26772) | 2 | Unmatched sport returns null; sole real caller checkSportVocab does `if(!sportClass) return []`, the correct "no vocab rules apply" outcome. |
| 1 | `_computeSpecificity` (~L26925) | 3 | Empty-text guard; sole meaningful caller checkLeadSentence treats null as specPct=100 ("assume fine, skip retry") — designed default. |
| 1 | `buildCompoundPrompt (pick helper)` (~L28051) | 1 | Local `pick()` closure: `!pool.length` returns null, consumed via `[a,h].filter(Boolean)` two lines later — correct filter-skip semantic. |
| 1 | `_refreshOpenSheet` (~L28351) | 2 | Best-effort openBottomSheet call in a fire-and-forget retry pass; swallow just skips the UI refresh. |
| 1 | `fetchSeriesPreviewFromClaude` (~L28565) | 2 | Archive-enrichment best-effort; on failure keeps the already-built championship context unchanged. |
| 1 | `_savePickCache` (~L28816) | 1 | Best-effort localStorage write for local pick cache; quota/blocked errors silently skip persistence. |
| 1 | `_resolvePickIfExists` (~L28941) | 1 | Best-effort DOM widget refresh inside a .then() with no consumer of the outcome. |
| 1 | `hydrateMissedRecaps` (~L29109) | 1 | Comment explicitly states "hydration failure is silent — recap snippet is enhancement". |
| 1 | `_isSSECovered` (~L29472) | 0 | Exported via window._ambientES but has zero real call sites; boolean predicate is correct as designed regardless. |
| 1 | `fieldEvents 'field:lead_change' listener` (~L29713) | 1 | "Never throw from a bus listener" design convention explicitly stated in the code comment. |
| 1 | `fieldEvents 'field:crunch' listener` (~L29769) | 1 | Same bus-listener "never throw" convention for the fan-out chip injection. |
| 1 | `fieldEvents 'field:ws_fresh' listener` (~L29846) | 1 | Best-effort updateWsPulseDot call; no consumer of listener outcome. |
| 1 | `staleness sweep (setInterval)` (~L29856) | 1 | Best-effort periodic dot-update sweep; single registration, no consumer of outcome. |
| 1 | `updateWsPulseDot` (~L29886) | 2 | Best-effort self-heal reconnect; UI already shows the "stale" class regardless of reconnect outcome. |
| 1 | `nearestMilestone` (~L30023) | 1 | Null means "not near a milestone," consumed correctly via `if(m && ...)` — a complete, non-error predicate. |
| 1 | `_espnInjurySportSlug` (~L30378) | 1 | null = sport isn't NHL/NBA — a real, complete "not applicable" state, not a failure. |
| 1 | `initials(in buildNHLPlayoffLeadersByTeam)` (~L30529) | 3 | Callers do `if(!f) return;` per entry — null is a correct "skip incomplete row" filter signal. |
| 1 | `fmt(in buildNBAPlayoffLeadersByTeam)` (~L30693) | 4 | Callers do `if(!f) return;` per stat category — null correctly filters malformed rows. |
| 1 | `buildSeriesContextTags` (~L30937) | 2 | Returns whatever partial `lines` accumulated on error; callers just embed the string, degrade is already correct. |
| 1 | `_fmtCountryPop` (~L31073) | 1 | null = "no valid population number" — a correct, complete data-absence signal for the caller. |
| 1 | `fetchFIELDBriefFromClaude` (~L31183) | 1 | Swallows suppression-check errors and simply continues normal flow — correct default when uncertain. |
| 1 | `fmt(in fetchMLBGameBriefFromClaude)` (~L31614) | 2 | Callers use ternaries (`ap ? ... : null`); null correctly means "no pitcher data" to include. |
| 1 | `fetchMLBGameBriefFromClaude` (~L31651) | 2 | Guards optional momentum context; on failure momentumCtx stays '', which prompt-building already treats as absent. |
| 1 | `fetchSeriesArchive` (~L31751) | 1 | Cache-write guard; non-fatal, doesn't affect the already-fetched `data` being returned. |
| 1 | `fetchGameBriefOnDemand` (~L32344) | 1 | ⤴ RECLASSIFIED B, MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3, corrected same day): originally classified C on "null-safe, returns ctx unchanged on any failure" — true of the fallback behavior, but that's a different question from whether the failure deserves telemetry. Structurally identical to `dramaScoreLive`'s weather-lookup catch (Tier A, shipped as Bucket B): an optional-enrichment failure, not a complete/correct business-logic state the way genuine Bucket C entries are. Now has `captureFieldError('journalism:champ-archive-enrich', ...)`. See Bucket B entry above. |
| 1 | `fetchEPLMatchBriefFromClaude` (~L32453) | 1 | ⤴ RECLASSIFIED B, MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3, corrected same day): same reasoning as `fetchGameBriefOnDemand` above — "catch just leaves strings blank" describes correct fallback behavior, not absence of a real failure worth surfacing. Now has `captureFieldError('journalism:epl-brief-context', ...)`. See Bucket B entry above. |
| 1 | `_wcBracketImplication` (~L32743) | 3 | "No bracket slot for this pos/group" is a genuine lookup-miss; all 3 callers just render empty string. |
| 1 | `renderWCTournamentBracket` (~L32912) | 3 | Best-effort sync of _wcProjectionsApplyTeams (void fn) into a shared cache; failure doesn't affect the table being rendered. |
| 1 | `_bsdActivate` (~L33203) | 0 | `.catch(()=>{})` on a fire-and-forget SSE-subscribe POST; function has no return value consumed anywhere. |
| 1 | `_bsdDeactivate` (~L33214) | 0 | Fire-and-forget unsubscribe POST, same pattern as _bsdActivate; no caller inspects outcome. |
| 1 | `_bsdActivateForWC` (~L33232) | 1 | Top-level orchestration entry fired via setTimeout; catch-all guard, no return value is ever consumed. |
| 1 | `openWcGroup (scrollTo helper)` (~L33279) | 1 | Boolean predicate genuinely means "target not found yet" and is used correctly to decide the setTimeout retry. |
| 1 | `_open (ws.onmessage handler)` (~L33530) | 1 | Guards JSON.parse/_handleMessage from a malformed WS frame killing the socket; reconnect logic lives in onclose, not here. |
| 1 | `_open (BracketDO WS IIFE)` (~L33541) | 2 | Guards `new WebSocket()` construction; reconnection is already handled separately in the documented onclose/backoff logic. |
| 1 | `_lookupWCMatchWP` (~L33740) | 1 | Lookup helper; null cache means "WC WP data not loaded yet," a legitimate not-ready state, not a failure. |
| 1 | `_wcProjectionsApplyTeams` (~L33825) | 3 | sessionStorage.setItem write guard; in-memory window._wcProjectionsCache is already set before this line. |
| 1 | `loadWCProjectionsCache` (~L33851) | 1 | sessionStorage.getItem read guard; falls through to network fetch regardless of parse/storage outcome. |
| 1 | `_wcBuildGroupInput` (~L34180) | 1 | Sole caller does `.filter(Boolean)` — incomplete (non-4-team) group standings are legitimately excluded from scenario computation. |
| 1 | `_wcComputeAllScenarios` (~L34259) | 3 | Inner catch explicitly commented "best3rd is optional"; swallowing is intentional graceful degradation. |
| 1 | `initWFToggle` (~L34723) | 0 | localStorage.setItem failure (private mode/quota) is a non-critical best-effort persistence write, correctly ignored. |
| 1 | `getDeepLink` (~L34983) | 1 | null means "no deep link configured for this stream key" — a genuine data-absence, not an error; caller renders no href correctly. |
| 1 | `getMiseryChip` (~L35009) | 2 | Local closure helper; null means "no misery streak," a correct value semantic used directly in \|\| chain. |
| 1 | `renderAmbientPanel` (~L35256) | 6 | Error boundary isolating one optional editorial section so a DOM-read failure doesn't break the whole panel render. |
| 1 | `getCDWNote` (~L35524) | 1 | null means "no drama-context note applies," a legitimate value state consumed via truthy check by its sole caller. |
| 1 | `recordDramaHistory` (~L35560) | 1 | localStorage quota/unavailable failure on a best-effort history write; explicitly commented as non-critical. |
| 1 | `getSmoothedDrama` (~L35617) | 8 | Comment explicitly states null means "insufficient history — caller falls back to raw"; all 8 callers correctly use ?? fallback for this legitimate state. |
| 1 | `computeDramaRetroactive` (~L35697) | 1 | finally-block cleanup of a temp localStorage key; removeItem failure is harmless housekeeping. |
| 1 | `isLateCloseGame` (~L35956) | 2 | Boolean predicate — false correctly means "not late-and-close," not a failure state. |
| 1 | `hasEmberContextBoost` (~L35990) | 1 | Boolean predicate — false correctly means "no context boost," used directly as an OR-gate input. |
| 1 | `parseNBAScoreboardGames` (~L36104) | 1 | Per-game best-effort try/catch so one game's gameLeaders extraction failure doesn't abort the whole scoreboard parse loop. |
| 1 | `renderCardBadges (IIFE)` (~L36849) | 1 | Trivial object-literal construction that cannot realistically throw; catch is effectively dead defensive code, harmless either way. |
| 1 | `_otwIsFinalPeriod` (~L37025) | 1 | Boolean predicate — false is the correct default for unrecognized sports, not an error. |
| 1 | `_otwIsCrunchTime` (~L37046) | 1 | Boolean predicate — false is the correct default for unrecognized sports, not an error. |
| 1 | `_isCloseAndLate` (~L37224) | 1 | Boolean predicate — false correctly means "not close-and-late," a genuine game-state fact. |
| 1 | `buildOTWWhyLine` (~L37810) | 3 | Best-effort date-format try/catch; on failure the ET-time fragment is simply omitted from the why-line, a harmless degrade. |
| 1 | `recordLinescores` (~L37873) | 1 | localStorage write failure on best-effort period-score persistence; non-critical, correctly swallowed. |
| 1 | `getLinescores` (~L37880) | 1 | Parse/read failure treated the same as "nothing stored yet" by its sole caller — a legitimate absence, not a distinct error state. |
| 1 | `buildNBAPlayerContext` (~L37982) | 1 | Local fmt helper used only with .filter(Boolean); null correctly excludes players without a name. |
| 1 | `recordScoreSnapshot` (~L38057) | 1 | localStorage write failure on a best-effort score-snapshot log; sole caller never checks the return. |
| 1 | `_otwFindWCLiveGame` (~L38164) | 1 | Empty WC-live-games cache is a genuine "nothing to show" state, not an error; sole caller's truthy check is correct as-is. |
| 1 | `isVolatileMatchup` (~L39113) | 1 | No odds data legitimately means "can't assess volatility"; sole caller (L39166) uses it as a plain chip gate. |
| 1 | `buildStayUpSignal` (~L40472) | 1 | Pre-7pm gate is an intentional time-based suppression, not an error; sole caller just hides the widget on null. |
| 1 | `detectAndStoreStoryMoment` (~L41097) | 1 | Comment states intent explicitly ("never block delta detection on bus dispatch"); sole caller is fire-and-forget with no return value at all. |
| 1 | `currentBucket` (~L42479) | 2 | matchMedia() catch just skips to the next bucket test, falling through to the 'desktop' default; both real callers only consume the string key. |
| 1 | `idbGet` (~L42507) | 1 | Sole caller (if(!snap) return false) already treats "IDB failed" and "no snapshot" identically — no plausible differentiated action. |
| 1 | `recordOpenHour` (~L42595) | 1 | Void fire-and-forget function; comment documents intentional silent skip when localStorage is disabled. |
| 1 | `registerAnticipatoryPrefetch` (~L42622) | 1 | Invoked once via setTimeout(registerAnticipatoryPrefetch,4000) with no result inspected; comment states "opportunistic — never block boot". |
## TASK 4 — Verification (spot-check, performed against fresh code reads, not the classifying agents' own reasoning)

**3 Bucket A entries re-derived from scratch:**

1. `saveEspnFinal` (L39666) — read the full function, traced both real
   callers via grep, confirmed the outer catch's implicit-`undefined`
   return is genuinely indistinguishable from the success path to both
   callers. **CONFIRMED.**
2. `findESPNScore` (L20743) — read the function, confirmed
   `_staleFinalGuard` computes the exact rejection reason internally
   before discarding it, confirmed via grep that all real callers do a
   bare truthy check. **CONFIRMED.**
3. `fetchTeamRank` (L24726) — read the function and `FIFA_RANK_TTL`'s
   actual value (7 days, confirmed via grep, not assumed), traced the
   exact code path from a caught exception to a 7-day-cached `null`.
   **CONFIRMED.**

**3 Bucket C entries re-derived from scratch:**

1. `isRivalGame` (L39074, TDZ guard) — read the function, confirmed all 3
   false-return paths (self-match, no-rival-found, TDZ exception) are
   genuinely indistinguishable to all 7 real callers AND that "false" is
   the functionally correct default even for the TDZ case (no meaningful
   alternate action exists). **CONFIRMED.**
2. `getSmoothedDrama` (L35617) — read the function's own inline comment
   ("insufficient history — caller falls back to raw"), confirmed via
   grep that a real caller (L37630-equivalent area) does exactly
   `getSmoothedDrama(gid) ?? score`. **CONFIRMED.**
3. `renderEPLMatchBriefCard` (L32552, `archiveBrief` catch) — read the
   full function body, found `g` is never declared or bound anywhere in
   scope (only `game` exists). **DISAGREEMENT FOUND AND CORRECTED** — see
   the "Confirmed bug" section above. The classifying agent pattern-
   matched against sibling functions' similar `archiveBrief()` calls
   without checking this specific function's actual variable names.

**Result: 5/6 spot-checked entries confirmed correct on independent
re-derivation, 1/6 corrected.** This is within the expected error rate for
a single-pass, 10-agent parallel classification of 827 sites and is why
TASK 4's spot-check exists — flagging it explicitly rather than reporting
a clean 6/6 that isn't accurate.

**Total reconciliation:** 26 (A) + 281 (B) + 519 (C) + 1 (confirmed bug,
outside the bucket scheme) = **827**, matching TASK 0's re-confirmed count
exactly.

## What this file is for

Future single-concern migration CC-CMDs should read the ranked Bucket A
list above and pick ONE entry (starting from the top, or by whatever the
dispatching session's priorities are) — migrate that one function to
`fieldOperation()`, update its real callers to branch on the differentiated
result, verify with real tests, single commit. Do not batch multiple
Bucket A entries into one CC-CMD (Rule 5/7 — one concern per commit).

Bucket B is a candidate for a SEPARATE, lower-priority "telemetry sweep"
CC-CMD at some point — batch-migrating decorative-only sites for
observability gains, explicitly not expected to change behavior. Not
scheduled by this survey; noted as a real but lower-priority option.

Bucket C requires no action. Do not re-litigate these without new evidence
(per Rule 71 — read the function, understand why it does what it does,
before assuming a "false"/"null" is wrong).
