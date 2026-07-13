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
| B — decorative only (telemetry gap) | 287 | 34.7% |
| C — legitimately fine as-is | 513 | 62.0% |
| (confirmed bug, not a bucket) | 1 | 0.1% |

**BUCKET B TIER C: COMPLETE as of 2026-07-13 (CC-CMD-bucketb-tierc-cluster10).** All 287 Bucket B sites across the full original 281-site survey (the number grew to 287 via 6 C→B reclassifications documented below, net of the survey's own internal drift) have now been individually investigated across 10 clusters (Tier A, Tier B, Tier C Clusters 1-10). Every site is either ✅ MIGRATED (real telemetry added, forced-tested), ⏭ INVESTIGATED-and-correctly-excluded (zero exception surface, or already covered by a prior fix — documented with real reasoning, never defaulted), or ⤴ RECLASSIFIED (moved buckets on reconsideration, with reasoning). Bucket B as a whole — moderate/high-frequency (Tier A/B) and low-frequency 1-2-caller (Tier C) — is now fully resolved. No further Bucket B clusters are needed.

2026-07-13 correction (CC-CMD-bucketb-tierc-cluster3): 2 sites reclassified C→B on reconsideration (`fetchGameBriefOnDemand`'s champ-archive-enrichment catch, `fetchEPLMatchBriefFromClaude`'s H2H/form-context catch) — both are optional-enrichment failures structurally identical to the already-shipped `dramaScoreLive` weather-lookup case, not complete/correct business-logic states. Counts above updated; totals below unchanged (827).

2026-07-13 correction (CC-CMD-bucketb-tierc-cluster5): 1 site reclassified C→B (`bdlLoad`'s corrupt-cache catch) — the original Bucket C entry conflated a deliberate cache-miss branch (correctly C) with a genuinely distinct corrupt-cache/storage-error catch (real telemetry gap, same reasoning class as the Cluster 3 correction above). Counts above updated; totals below unchanged (827).

2026-07-13 correction (CC-CMD-bucketb-tierc-cluster9): 2 sites reclassified C→B — `fetchSeriesPreviewFromClaude`'s champ-archive-enrichment catch (same shared `enrichChampionshipFromArchive` call already reclassified for two sibling functions in Cluster 3; applying the same standing precedent), and `fetchSeriesArchive`'s cache-write catch (same failure mechanism and reasoning class as the already-migrated `fetchTeamRank`/`loadBroadcastArchaeology` persist catches — "doesn't affect the returned value" is true but describes Bucket B, not C). The `fetchSeriesArchive` conflict was found via a post-code cross-check, not before writing code — a genuine process gap this cluster, corrected before commit. Counts above updated; totals below unchanged (827).

2026-07-13 correction (CC-CMD-bucketb-tierc-cluster10, FINAL): 1 site reclassified C→B (`loadPGASlate`'s cache-read catch) — same reasoning class as the Cluster 5/9 cache-read/cache-write reclassifications ("correct degrade, invisible to the caller" describes Bucket B, not C). This one was caught during the pre-code Lesson 2 cross-check, unlike Cluster 9's `fetchSeriesArchive` miss. Counts above updated; totals below unchanged (827). **This closes Bucket B Tier C — see the closing statement above.**

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
## Bucket B — grouped by function, not itemized (287 sites across 132 functions — reconciled 2026-07-13, CC-CMD-bucketb-tierc-cluster10, FINAL: was 281/129 at initial survey; +6 sites via C→B reclassifications across Clusters 3/5/9/10, of which 3 (`bdlLoad`, `fetchGameBriefOnDemand`, `fetchEPLMatchBriefFromClaude`) were previously Bucket-C-only functions now also counted here; the other 3 reclassified sites — `fetchSeriesPreviewFromClaude`, `fetchSeriesArchive`, `loadPGASlate` — already had a separate confirmed Bucket B entry each, so they don't add new functions to this count, only new sites. TIER C COMPLETE — see the closing statement in Bucket totals above.)

Batch cleanup candidate for a future, separate, lower-priority telemetry
CC-CMD — not individually prioritized. Grouped per TASK 3's own
instruction. "Call Sites" = number of real callers found for that function.

| Count | Function | Call Sites | Representative Reason |
|---|---|---|---|
| 8 | `fetchBDLRecentForm` (~L18765) | 0 | ✅ INVESTIGATED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 1b): NOT dead code — deliberate staged/gated work, own comment documents "Layer 2" of a planned 3-layer BDL momentum integration; no shipped Momentum feature found to wire it into. Left exactly as-is, untouched — not deleted, not force-wired. |
| 8 | `fetchFinalsDesk` (~L34794) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): this function has 3 distinct real catches (enqueue, poll, direct-proxy fallback), each hitting genuinely different infrastructure — unlike the NBA-standings tier pattern, granular instrumentation is more useful here, not less. Added `captureFieldError` to all 3: `journalism:finals-desk-enqueue`, `journalism:finals-desk-poll`, `journalism:finals-desk-fallback`. Step 1's sessionStorage cache-read catch is a separate, already-classified Bucket C entry (~L520) — correctly left untouched. Forced-tested all 3 (isolated snippets — function too complex/large for full extraction). Zero caller behavior change. |
| 7 | `renderFieldDesk` (~L13706) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): the queue's own reasoning ("sibling Card-1 catch DOES log, showing this is a gap not a design choice") applies verbatim to every other silent card catch in this function, not just Card 2 — found 6 more identical-shape silent catches (Cards 3, 4, 5, 6×2 [a duplicate "Card 6" label exists in the source itself], plus the P5 static-fallback), all within this same named function. Added `captureFieldError` to all 7: `render:field-desk-card{2,3,4,5}`, `render:field-desk-card6-{antihype,epl}`, `render:field-desk-static-fallback`. The trivial nested per-entry title lookup inside Card 3's forEach is a separate, already-classified Bucket C entry (~L548) — correctly left untouched. Forced-tested all 7 (isolated snippets — function is DOM-heavy). Zero caller behavior change. |
| 7 | `fetchCompoundEditorial` (~L28152) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): checked especially closely per the CC-CMD's own warning (touched twice already this session, `3a9a52a`/`dbd91f7`). The main outer catch already had direct `window._fieldErrors.push({fn:'fetchCompoundEditorial',...})` telemetry (pre-existing, unrelated to this session's work) — the Chunk 1 cap/dedup protects it automatically since it's a real `.push()` call. The genuinely still-uninstrumented gap was the cached-JSON parse-failure catch at the top of the function. Added `captureFieldError('journalism:compound-cache-parse', ...)`. Forced-tested. Zero caller behavior change. |
| 6 | `_bundleFinalizedAt` (~L7019) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('newspaper:bundle-finalized-at', ...)` to the sole catch — the one genuine unexpected-failure path among the function's several deliberate early-return guards (bundle missing, sport mismatch, doubleheader ambiguity, etc.), which stay correctly untouched. Forced-tested (teamNick throw fires 1 entry, real success returns a real timestamp with 0 entries). Zero caller behavior change. |
| 6 | `fetchStakesBriefFromClaude` (~L31946) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): added `captureFieldError('journalism:stakes-brief', ...)` to the generation catch. Forced-tested. Zero caller behavior change. |
| 5 | `_computeSRPlayEPA` (~L10454) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10) — NOT migrated: zero try/catch anywhere in this function. Pure deterministic EPA computation — every `return null;` is a deliberate, correct branch (skip play type, missing situation data). Called from `_fetchUFLGameEpa`'s own try block (see below), where an exception here would already be caught by that outer catch — but no such exception is possible given the function's shape. No code change. |
| 5 | `_resolveRealGameId` (~L10646) | 5 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierb) — NOT migrated: this function has zero try/catch anywhere in its body. Every `return null;` is a deliberate decision boundary (no `_gameId` field yet, `espnScores` TDZ guard, 0-or-2+ ambiguous fuzzy-match candidates, stale-final guard) — not an exception. Adding `captureFieldError()` here would fabricate a failure signal for normal, correct branching. No code change. |
| 5 | `generateJournalismViaRelay` (~L17545) | 5 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): its 3 real failure causes (HTTP error, missing data.text, model refusal) already had telemetry from an earlier session (Bucket A #4). This CC-CMD's actual target was the earlier "bad prompt" guard (`!prompt \|\| prompt.length < 10`) — added `captureFieldError('journalism:generate:'+briefType, ...)` there. The `_proofMode` bypass one line above was deliberately left untouched — already confirmed a real, deliberate skip, not a failure (see entry #4 above). Forced-tested (bad-prompt fires, proof-mode does not). Zero caller behavior change. |
| 5 | `fetchWNBAGameBriefFromClaude` (~L31847) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): added `captureFieldError('journalism:wnba-brief', ...)` to the generation catch. Forced-tested. Zero caller behavior change. |
| 5 | `computeBroadcastNarrativeIndex` (~L35883) | 7 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierb) — NOT migrated: zero try/catch anywhere in this function. Every `return null;` is a deliberate business-logic branch (not national, genuinely-exciting-live-situation exclusion, not elimination-inflation, not home-market) — not an exception. Same finding as `_resolveRealGameId` above; no code change. |
| 4 | `renderJournalism` (~L14029) | ~7 | Date-label formatting failure silently skipped; sibling code later in same function (14162-14167) DOES use captureFieldError, showing the gap |
| 4 | `fetchLeagueRSS` (~L31004) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): added `captureFieldError('journalism:league-rss', ...)` to the fetch/parse catch. Forced-tested. Zero caller behavior change. |
| 4 | `fetchCountryContext` (~L31366) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9): added `captureFieldError('wc:country-context', ...)` to the catch. Forced-tested (fetch-reject fires 1 entry returns null, real success fires none). Zero caller behavior change. |
| 4 | `fetchSeriesArchive` (~L32070) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9): **Lesson 3 applied — 3 real catches found, not 1.** Added `captureFieldError()` to: `journalism:series-archive-cache-read` (sessionStorage cache-parse catch), `journalism:series-archive-cache-write` (sessionStorage.setItem persist catch — see the Bucket C reclassification below), `journalism:series-archive-fetch` (cited main-fetch catch — relay-not-ready and missing-key never reach this catch at all, those are the function's own early `return null;` guards one line up; this catch is specifically the network/parse failure path). Forced-tested 4 ways: cache-read failure (falls through to real fetch success), cache-write failure (still returns real data), main-fetch failure (returns null), full success (0 entries, real data). Zero caller behavior change. |
| 4 | `fetchGameBriefOnDemand` (~L32289) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3, corrected 2026-07-13 same day): this function has 2 real catches, both now instrumented. Added `captureFieldError('journalism:game-brief-on-demand', ...)` to the generic NBA/NHL/other branch's generation catch. **The championship-archive enrichment catch was initially instrumented, briefly reverted on discovering the pre-existing Bucket C entry (~L735) for this exact site, then RECLASSIFIED B AND REINSTATED** on reconsideration: "null-safe, returns ctx unchanged on any failure" describes the fallback's correctness, not whether the failure deserves telemetry — structurally identical to `dramaScoreLive`'s weather-lookup catch (Tier A, already shipped as Bucket B), an optional-enrichment failure that leaves a variable at its prior value either way. Added `captureFieldError('journalism:champ-archive-enrich', ...)`. See the corresponding Bucket C entry below, marked reclassified. **Real bug found and fixed via this same investigation:** `budget` was declared `const` inside `if (!usesOwnBudget) {...}`, but referenced via `budget.inc()` in the generic branch well outside that block — a genuine `ReferenceError` on every successful generic-branch generation, previously invisible because it landed in the (until-now-silent) catch. Hoisted the declaration to function scope; `journalismCallsToday()` itself is a pure factory (safe to call unconditionally). Forced-tested including a direct proof that a genuine success now reaches `budget.inc()` without throwing. Zero *intended* caller behavior change (the bug fix is a correctness restoration, not a new behavior). |
| 4 | `fetchEPLMatchBriefFromClaude` (~L32421) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3, corrected 2026-07-13 same day): this function has 2 real catches, both now instrumented. Added `captureFieldError('journalism:epl-brief', ...)` to the main generation catch. **The H2H/form-context builder catch was initially instrumented, briefly reverted on discovering the pre-existing Bucket C entry (~L736) for this exact site, then RECLASSIFIED B AND REINSTATED** on reconsideration — same reasoning as `fetchGameBriefOnDemand`'s champ-archive site above: an optional-enrichment failure leaving strings blank is structurally identical to `dramaScoreLive`'s weather catch, not a complete/correct business-logic state in the way true Bucket C entries are. Added `captureFieldError('journalism:epl-brief-context', ...)`. See the corresponding Bucket C entry below, marked reclassified. Forced-tested both sites. Zero caller behavior change. |
| 4 | `fetchMLBPlatoon` (~L36960) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6): added `captureFieldError('mlb:platoon', ...)` to the catch. Forced-tested (fetch-reject fires 1 entry, real success fires none). Zero caller behavior change. |
| 4 | `restoreSnapshot` (~L42927) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('snapshot:restore', ...)` to the catch. Forced-tested (currentBucket throw fires 1 entry returns false, real no-snapshot path fires none). Zero caller behavior change. |
| 4 | `predictNextOpenHour` (~L42600) | 0 | ✅ QUEUE CORRECTION 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous): flagged for removal by this queue's caller-census, but smoke.js A405 requires its existence as part of the documented P5 anticipatory-prefetch startup-polish bundle (patent-relevant, USPTO-filing-adjacent). Not dead code by the codebase's own definition — NOT removed. |
| 3 | `fetchMLBTeamMomentum` (~L8653) | 2 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6) — STALE ENTRY, not migrated: the catch already calls `captureFieldError('mlb-momentum', e, true)` (pre-existing, from an earlier undated session). This entry describes the function's pre-migration shape. No code change. |
| 3 | `loadCFLScoreboard` (~L12736) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9): added `captureFieldError('cfl:scoreboard-load', ...)` to the catch. Forced-tested (fetch-reject fires 1 entry returns null, real success fires none). Zero caller behavior change. |
| 3 | `bdlFetch` (~L14870) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): added `captureFieldError('bdl:fetch', ...)` to the catch. Forced-tested (fetch-reject fires 1 entry returns null, real success fires none). Zero caller behavior change. |
| 3 | `fetchPrerenderedJournalism` (~L17622) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3) — STALE ENTRY, not migrated: already fully migrated. All 3 real branches (`!r.ok`, missing `data.brief`, and the catch) already call `captureFieldError('journalism:prerendered-fetch', ...)`. This entry describes pre-migration state from an earlier, undated session. No code change. |
| 3 | `fplLoadBootstrap` (~L21818) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): **Lesson 3 applied — 2 real catches found, not 1.** Added `captureFieldError('fpl:bootstrap-cache-parse', ...)` to the cited sessionStorage cache-parse catch, and `captureFieldError('fpl:bootstrap-fetch', ...)` to the separate live-fetch catch (genuinely distinct failure mode: network/relay failure vs. corrupt cache — not redundant with the first). Forced-tested 4 ways: cache-parse failure falls through to a real successful fetch (1 entry, returns true); fresh valid cache short-circuits (0 entries, returns true early); live-fetch failure with no cache (1 entry, returns false); full success with no cache (0 entries, returns true). Zero caller behavior change. |
| 3 | `fetchSchedule` (~L23093) | 4 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('schedule:perf-mark', ...)` to the `performance.mark('field:cards')` wrapper. Genuinely near-impossible to trigger in a real browser, but a real catch nonetheless. Updated smoke.js A503 (exact-string structural assertion) to match. Forced-tested. Zero caller behavior change. |
| 3 | `fetchSchedule (golf load callback)` (~L23543) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): **Lesson 3 applied — 4 real catches found in this closure, not 1.** Added `captureFieldError()` to: `schedule:golf-derived-metrics` (cited computeGolfDerivedMetrics wrap), `schedule:golf-render` (scheduleRenderAll wrap — direct sibling of the CFL entry below, same closure), `schedule:golf-pga-inject` (injectPGALeaderboard wrap — already had a console.warn under FIELD_DEBUG but zero captureFieldError; whole visible UI section, same tier as renderFieldDesk's card catches from Cluster 3), `schedule:golf-round-archive` (`_isGolfRoundComplete`/`saveGolfRoundFinal` wrap — a completed round's archival data silently never persists on failure). All 4 forced-tested independently (isolated snippet mirroring the real closure shape) plus a combined all-success test. Zero caller behavior change. |
| 3 | `fetchSeriesPreviewFromClaude` (~L28801) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9): added `captureFieldError('journalism:series-preview', ...)` to the cited main-generation catch. **Lesson 2 also applied — see the Bucket C reclassification below** for a second real catch found in this function (`enrichChampionshipFromArchive` archive-enrichment). Forced-tested (relay-reject fires 1 entry returns null, real generated text fires none). Zero caller behavior change. |
| 3 | `fetchUserState` (~L29063) | 3 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('user:fetch-state', ...)` to both the `!r.ok` branch and the catch block. Forced-tested (both failure sites fire, real success fires none). Zero caller behavior change. |
| 3 | `getESPNInjuriesForGame` (~L30456) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4) — NOT migrated: zero try/catch anywhere in this function, including its nested `nameToAbbr` closure. Every `return null;` is a deliberate branch (no game, unmapped sport slug, no cached data, or genuinely no lines built). Same pattern as `computeBroadcastNarrativeIndex`/`_resolveRealGameId`/etc. from prior tiers. No code change. |
| 3 | `getNHLPlayoffLeadersForGame` (~L30619) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4) — NOT migrated: zero try/catch anywhere in this function. Every `return null;` is a deliberate branch (no game, wrong sport, no cached leaders data yet, or no matching lines built). No code change. |
| 3 | `getNBAPlayoffLeadersForGame` (~L30777) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4) — NOT migrated: same shape and finding as `getNHLPlayoffLeadersForGame` above. No code change. |
| 3 | `fetchNHLGameNotes` (~L30986) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4): added `captureFieldError('gamenotes:nhl', ...)` to the fetch/parse catch. Cross-checked against Bucket C (Lesson 2 from Cluster 3) — no conflict. Forced-tested. Zero caller behavior change. |
| 3 | `fetchLastMeeting` (~L31757) | 0 | ✅ QUEUE CORRECTION 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous): flagged for removal by this queue's caller-census, but smoke.js A610 documents it as deliberately staged/gated Archive D1 work (behind `ARCHIVE_RELAY_READY`, same pattern as `fetchBDLRecentForm`) — a zero-caller count alone doesn't mean dead when the codebase's own structural checks protect it as staged. NOT removed. |
| 3 | `fetchArchiveDate` (~L32101) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9): added `captureFieldError('broadcast-archaeology:date-fetch', ...)` to the catch. This function's own internal catch fires (and is now telemetered) regardless of the caller (`loadBroadcastArchaeology`)'s own additional `.catch(() => null)` wrapper — that wrapper is confirmed-unreachable per Cluster 5's finding, but this function's own catch is real and reachable. Forced-tested (fetch-reject fires 1 entry returns null, real success fires none). Zero caller behavior change. |
| 3 | `fetchPrerenderedGameBrief` (~L31779) | 4 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('journalism:prerendered-game-brief', ...)` to the fetch/parse catch. Forced-tested (fetch rejection fires, real success fires none). Zero caller behavior change. |
| 3 | `fetchWCTabBrief` (~L33298) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): same enqueue/poll shape as `fetchFinalsDesk` (no direct-fallback tier here). Added `captureFieldError` to both: `journalism:wc-tab-brief-enqueue`, `journalism:wc-tab-brief-poll`. Step 1's sessionStorage cache-read catch is a separate, already-classified Bucket C entry (~L523) — correctly left untouched. Forced-tested both. Zero caller behavior change. |
| 3 | `_wcComputeAllScenarios` (~L34239) | 3 | ✅ RESOLVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 2): investigated directly against source, all 3 real callers confirmed correct as Bucket B (none need differentiation). Narrow telemetry added: `captureFieldError` on the `typeof computeGroupScenarios !== 'function'` branch only (real code-integrity failure) — the other 2 `return null;` paths (empty standings, caught exception) are genuinely benign and left untouched. Proven via forced-condition test: fires only on the missing-function branch. |
| 3 | `fetchNBAPBP` (~L36278) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4): added `captureFieldError('roster:nba-pbp', ...)` to the fetch/parse catch. Cross-checked against Bucket C — no conflict. Forced-tested. Zero caller behavior change. |
| 3 | `fetchRosterAdvantage` (~L36387) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4): this orchestrating function has 2 real catches, not 1 — a nested ESPN-summary-fetch catch (feeds both Tier 2 and Tier 3) and the outer tiered-logic catch. Added `captureFieldError` to both: `roster:espn-summary-fetch`, `roster:advantage`. Cross-checked against Bucket C — no conflict. Forced-tested both (isolated to confirm each fires independently of the other). Zero caller behavior change. |
| 3 | `_eDataMatchesGame` (~L39757) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6) — NOT migrated: zero try/catch anywhere in this function. A pure deterministic validation/matching function (null-input guard, name-suffix match, stale-final guard) — every `return false;`/`return true;` is a deliberate, correct branch. No catch exists to instrument. Same pattern as `_wcAdvancementProb`/`parseNBACDNActions`. No code change. |
| 2 | `fetchESPNFixturesForDate (events.map callback)` (~L7418) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9) — STALE ENTRY, not migrated: this whole function was already fully migrated to real telemetry earlier the same day (see `### 12. fetchESPNFixturesForDate` above, ✅ MIGRATED — `captureFieldError('espn-fixtures:date-sweep', ...)` fires on any per-league fetch failure). The specific per-event `if(!comp) return null;` / `if(!home||!away) return null;` cited here are deliberate, correct validation branches within the already-telemetered per-league try block — no catch of their own to instrument. No code change. |
| 2 | `soccerFBrefInit` (~L8535) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): this function already had telemetry via `_recordRelayInit()` — a separate, pre-existing system (`window._relayInitStatus`, latest-status-only, from `CC-CMD-2026-07-11-relay-init-staleness-visibility`) that does NOT feed the Health Panel's "Runtime Errors" count. Added `captureFieldError('soccer:fbref-init', ...)` alongside the existing calls at both the `!r.ok` and catch sites — genuinely additive, not redundant, since it makes this failure visible in the same Health Panel surface as every other Bucket B/C addition. Forced-tested (both existing `_recordRelayInit` and new `captureFieldError` fire together). Zero caller behavior change. |
| 2 | `getSoccerFBrefStats` (~L8637) | 2 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9) — NOT migrated: zero try/catch anywhere in this function. Pure deterministic lookup (exact match, then fuzzy last-word match, else null) — every `return null;` is a deliberate, correct branch. No catch exists to instrument. Same pattern as `_eDataMatchesGame`/`evaluateEMBER`. No code change. |
| 2 | `subscribeToPush` (~L9252) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9): added `captureFieldError('push:subscribe', ...)` to the catch. Forced-tested (SW-ready rejection fires 1 entry returns false, real subscribe success fires none, returns true). Zero caller behavior change. |
| 2 | `getVolatilityIndex` (~L10564) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10) — NOT migrated: zero try/catch anywhere in this function, and zero in its sole caller `getVolatilityLabel` (see that entry below) — investigated together as the CC-CMD's flagged caller/callee pair, same shape as Cluster 8's `findConflicts`/`renderConflictChip`. Every `return null;` in both functions is a deliberate, correct statistical/business-logic branch (thin history, mid-range/low-drama verdict — the latter already documented as correctly Bucket C elsewhere in this file, ~L10481: "not distinctive enough to label, not a failure state"). No catch exists in either function to instrument. No code change to either. |
| 2 | `renderAll` (~L11503) | 30+ | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): added `captureFieldError('render:all-signature-stamp', ...)` to the signature-stamp write's bare catch. Forced-tested (failure fires 1 entry, success fires none). Zero caller behavior change. |
| 2 | `buildPlayoffSpecials` (~L13533) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): **Lesson 3 applied — 2 real catches found, not 1.** The function has two structurally-identical journalNote stat-edge blocks (NBA Finals, Stanley Cup Final), each its own catch. Added `captureFieldError('journalism:playoff-specials-nba-statedge', ...)` and `captureFieldError('journalism:playoff-specials-nhl-statedge', ...)` respectively. Forced-tested independently (each throws → 1 entry) plus a real-success test (real stat text flows into journalNote, 0 entries). Zero caller behavior change. |
| 2 | `renderJournalismCompanion` (~L14640) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): **Lesson 3 applied — 2 real catches found, not 1.** Added `captureFieldError('journalism:companion-later-tonight', ...)` to the cited "Later Tonight" block catch, and `captureFieldError('journalism:companion-quality-scores', ...)` to the sibling "Quality Scores" block catch (corrupt `field_jq_scores` localStorage JSON silently drops the whole panel — same tier of gap, previously untelemetered). Forced-tested independently (each fires 1 entry without cross-contaminating the other) plus a full-success test. Zero caller behavior change. |
| 2 | `loadPGASlate` (~L16861) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): **Lesson 3 applied — 3 real catches found, not 1.** Added `captureFieldError()` to: `golf:pga-slate-cache-read` (see the Bucket C reclassification below), `golf:pga-slate-cache-write` (sessionStorage.setItem persist catch), `golf:pga-slate-fetch` (cited main-fetch catch). Forced-tested 4 ways: cache-read failure (falls through to real success), cache-write failure (still returns real data), main-fetch failure (returns null), full success (0 entries). Zero caller behavior change. |
| 2 | `fetchESPNStandings` (~L17202) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): added `captureFieldError('standings:espn-fetch', ...)` to the catch. Forced-tested (fetch-reject fires 1 entry returns null, real entries fires none). Zero caller behavior change. |
| 2 | `buildSafeScoreWrap` (~L22162) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): **Lesson 3 applied — the cited "Layer 3" is actually 2 nested catches, not 1.** Added `captureFieldError('scores:safe-wrap-layer3-finals-lookup', ...)` to the outer Layer-3 catch (wraps `loadTonightFinals()` + matching) and `captureFieldError('scores:safe-wrap-layer3-narrative', ...)` to the inner catch (wraps the synthetic-score `computeGameNarrative` retry) — genuinely distinct failure surfaces. Layers 1 and 2 (structurally identical `try{computeGameNarrative(...)}catch(e){_n=null;}` retry attempts, same low-value-internal-retry class as `fetchNightOwlFromClaude`'s context catches) deliberately left untouched, matching the doc's own precise "Layer 3" scoping. Forced-tested 3 ways: finals-lookup failure, narrative-retry failure, real Layer-1 success (0 entries). Zero caller behavior change. |
| 2 | `renderESPNScores` (~L22570) | ~15 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): investigated directly against source — the real swallow point is NOT `renderESPNScores`' own sync-only `try{loadWCMatchWP()}catch(_){}` wrapper, it's `loadWCMatchWP()`'s own internal `.catch(() => {})` at the end of its promise chain (index.html ~L34095), which silently ate every real network/fetch failure. Added `captureFieldError('wc:match-wp-load', ...)` there instead of the redundant outer wrapper. Forced-tested (fetch rejection fires 1 entry, success fires none). Zero caller behavior change. |
| 2 | `loadBroadcastArchaeology` (~L24540) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): **Lesson 3 applied — 3 real catches found, not 1.** Added `captureFieldError()` to: `broadcast-archaeology:cache-read` (cited sessionStorage cache-parse catch), `broadcast-archaeology:cache-write` (sessionStorage.setItem persist catch — same tier as the already-migrated `fetchTeamRank` persist pattern from Tier B), `broadcast-archaeology:build-render` (outer `.catch(() => {})` on the `Promise.all(...).then(...)` chain — confirmed reachable only via a synchronous throw in the results-processing/render step, since each per-date `fetchArchiveDate(...).catch(() => null)` already absorbs individual date-fetch failures and never rejects; the per-date catch itself is correctly untouched — same absorption pattern as the CFL entry above). Forced-tested 5 ways: cache-read failure, cache-read success (early return), cache-write failure (still renders), build-render failure (renderBroadcastArchaeology throws), and full success. Zero caller behavior change. |
| 2 | `fetchMLBStandingsParsed` (~L29900) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('standings:mlb-parsed', ...)` to the catch. Forced-tested. Zero caller behavior change. |
| 2 | `fetchBDLSeasonAverages` (~L30047) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('bdl:season-averages', ...)` to both the `!r.ok` branch and the catch block (matching the established two-site convention). The localStorage-read cache-miss fallback (a separate, already-classified Bucket C entry below, ~L557) was correctly left untouched — different bucket. Forced-tested (both sites fire, real success fires none). Zero caller behavior change. |
| 2 | `fetchBDLMilestones` (~L30078) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1) — NOT migrated: zero try/catch anywhere in this function. Its only `return null;` (no players from the shared season-averages fetch) is already covered by `fetchBDLSeasonAverages`'s own telemetry, added in this same CC-CMD. The function's actual return value (`best`) being `null` — no player near a milestone tonight — is a completely normal, expected outcome, not a failure. Same pattern as `computeBroadcastNarrativeIndex`/`_resolveRealGameId`/`fetchStandingsForPrompt` from the prior Tier B CC-CMD. No code change. |
| 2 | `fetchNHLStandingsParsed` (~L30115) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('standings:nhl-parsed', ...)` to the catch. Forced-tested. Zero caller behavior change. |
| 2 | `fetchMLSStandingsParsed` (~L30140) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('standings:mls-parsed', ...)` to the catch. Forced-tested. Zero caller behavior change. |
| 2 | `fetchStandingsForPrompt` (~L30161) | 3 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierb) — NOT migrated: zero try/catch anywhere in this function; it's a pure sport-name dispatcher (`if(sport.includes('MLB')) return fetchMLBStandingsParsed(); ...`) that delegates to sport-specific fetchers or returns null for unmapped sports (NFL/soccer, deliberately documented as "acceptable"). Same finding as `_resolveRealGameId`/`computeBroadcastNarrativeIndex` above; no code change. |
| 2 | `getESPNInjuriesForGame(nameToAbbr)` (~L30466) | 2 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4) — NOT migrated: same function as the `getESPNInjuriesForGame` entry above (its nested `nameToAbbr` closure) — zero try/catch, deliberate `return null;` branches only. No code change. |
| 2 | `espnInjuriesPrefetch` (~L30495) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): `espnInjuriesPrefetch`'s own outer `try{fetchESPNInjuries(...)}catch(_){}` only catches sync throws since `fetchESPNInjuries` is async — same pattern as the Tier A `loadWCMatchWP` finding. Added `captureFieldError('espn:injuries-prefetch', ...)` at the real swallow point inside `fetchESPNInjuries`'s own catch instead. Forced-tested. Zero caller behavior change. |
| 2 | `fetchMLBGameNotes` (~L30960) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4): added `captureFieldError('gamenotes:mlb', ...)` to the catch. **Real nuance found via forced testing:** uses `Promise.allSettled`, same shape as Cluster 3's NHL/NBA playoff-leaders finding — a total fetch failure is gracefully absorbed via `.status==='fulfilled'` checks and never reaches this catch. The catch is only reachable via a malformed-but-successful JSON response (`.json()` itself throwing) — a real, narrower signal. Confirmed via a dedicated forced test that total fetch failure produces zero telemetry (correct, not a gap). Cross-checked against Bucket C — no conflict. Zero caller behavior change. |
| 2 | `fetchWCStandings` (~L32990) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): added `captureFieldError('wc:standings', ...)` to the sole catch. Forced-tested (fetch-reject fires 1 entry, real success fires none). Zero caller behavior change. |
| 2 | `evaluateEMBER` (~L36334) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7) — NOT migrated: zero try/catch anywhere in this function. Pure deterministic gate logic (tier check, `hasEmberContextBoost`, `isLateCloseGame`) — every `return null;` is a deliberate, correct branch (tier-1-ineligible or both gates failed), exactly matching this entry's own gap description. No catch exists to instrument. Same pattern as `_wcAdvancementProb`/`_eDataMatchesGame`. No code change. |
| 2 | `fetchNBALiveBoxscore` (~L36493) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): added `captureFieldError('nba:live-boxscore', ...)` to the catch. Forced-tested (fetch-reject fires 1 entry returns cached-or-null, real result fires none). Zero caller behavior change. |
| 2 | `parseESPNPlays` (~L36356) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4) — NOT migrated: zero try/catch anywhere in this pure synchronous parsing function. Its `return null;` paths (`!plays?.length`, or no lineup lines built) are deliberate, correct branches. No code change. |
| 2 | `fetchNightOwlFromClaude` (~L40304) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3): this 900+-line function has 7+ optional prompt-context-enrichment catches (stat context, WC context, user context, drama context, stat-of-day, ESPN-leaders cold-cache fallback) — each individually low-value, benign-failure-prone, analogous to `dramaScoreLive`'s single weather-lookup case, not to `renderFieldDesk`'s per-card catches (each of THOSE represents a whole visible UI section, not an internal prompt-enrichment sub-stage). Deliberately left those untouched. Added `captureFieldError('journalism:night-owl', ...)` to the one real, load-bearing generation catch (matching the queue's own actual description — the HTTP/generation failure, not any context-enrichment stage) via an isolated verbatim snippet (function too large for full extraction). Zero caller behavior change. |
| 1 | `fetchMLBSchedule (proof-mode override)` (~L4912) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6) — STALE ENTRY, not migrated: the catch already calls `captureFieldError('proof:normalizeMLBGame', e)` (pre-existing, from an earlier undated session). No code change. |
| 1 | `getMLBAnalyticsContext` (~L8137) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): added `captureFieldError('mlb:analytics-context', ...)` to the catch. Forced-tested (getParkFactor throw fires 1 entry returns [], real success fires none). Zero caller behavior change. |
| 1 | `getStandingVelocity` (~L10310) | 2 | ✅ RESOLVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 2): investigated directly against source, both real callers confirmed correct as Bucket B (cosmetic momentum note omission either way). Narrow telemetry added: `captureFieldError` on the `gbRecent === null || gbBase === null` branch only (findGB nickname/abbrev match failure — could mask a real team-name-matching bug) — the other 4 `return null;` paths (missing args, insufficient history, no baseline in window, below-threshold delta) are genuinely benign and left untouched. Proven via forced-condition test: fires only on the findGB-no-match branch. |
| 1 | `_fetchUFLGameEpa` (~L10481) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): added `captureFieldError('ufl:game-epa', ...)` to the catch. Forced-tested (fetch-reject fires 1 entry, real success fires none). Zero caller behavior change. |
| 1 | `getVolatilityLabel` (~L10576) | 2 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10) — NOT migrated: investigated together with `getVolatilityIndex`, its sole callee (see that entry above — the CC-CMD's flagged caller/callee pair, same shape as Cluster 8's `findConflicts`/`renderConflictChip`). Zero try/catch in either function; every `return null;` is a deliberate business-logic branch, already documented as correctly Bucket C elsewhere in this file (~L10481: "not distinctive enough to label, not a failure state"). No code change. |
| 1 | `_fieldGameRenderPayload` (~L10869) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10) — NOT migrated: zero try/catch anywhere in this function. Pure object-construction with `??`/`\|\|` defaults on every field; the sole `if(!g) return null;` guard is deliberate. No catch exists to instrument. No code change. |
| 1 | `findConflicts` (~L11177) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('schedule:find-conflicts', ...)` to the catch. Investigated together with `renderConflictChip` per the CC-CMD's explicit caller/callee flag — see that entry below for the finding. Forced-tested (Date-construction throw fires 1 entry, real conflict detection fires none). Zero caller behavior change. |
| 1 | `renderConflictChip` (~L11208) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('schedule:conflict-chip-time-format', ...)` to the `_fmtLocalTime` catch. **Caller/callee investigation finding:** because `findConflicts` (above) already filters out any game whose `start_time` fails to parse before a game ever reaches a conflict bucket, this catch is currently near-unreachable via the live `renderConflictChip(findConflicts(...))` path — every game `renderConflictChip` sees already parsed successfully once. It remains a genuine, real, independent defensive guard (reachable if `renderConflictChip` were ever called with unfiltered data), same class as the already-migrated `A503` near-impossible-but-real catch from Tier B — migrated per that established precedent, not excluded for rarity. Forced-tested (isolated snippet — throw fires 1 entry, real formatting fires none). Zero caller behavior change. |
| 1 | `buildTodaySchedule` (~L11939) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8) — NOT migrated, entry inaccurate against current source: full-body grep of this ~750-line function found **zero** `catch(` anywhere. The cited "postponed-game null" (`if (ov?._postponed) return null;`) is a single, deliberate, explicitly-commented business branch ("Phase 2: apply overlay... skip postponed games") — not an ambiguous multi-cause collapse, since there is no other code path that returns null there. No catch exists to instrument. No code change. |
| 1 | `buildWCMediaCards` (~L13347) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): added `captureFieldError('wc:media-card-journal-note', ...)` to the journalNote enrichment catch. Forced-tested (isolated snippet — getStatOfDay throw fires 1 entry, real success fires none). Zero caller behavior change. |
| 1 | `renderJournalism (via openJournalismForGame)` (~L14278) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): added `captureFieldError('journalism:reopen-rerender', ...)` to the `try { renderJournalism(); } catch(_)` re-render call inside `openJournalismForGame`. The sibling `try { closeBottomSheet(); } catch(_)` a few lines above (~L14272, the Bucket C `openJournalismForGame` entry below) was confirmed correct and left untouched — genuinely different in kind (best-effort cleanup vs. a real content re-render failure). Forced-tested (throw fires 1 entry, real render fires none). Zero caller behavior change. |
| 1 | `renderArchiveTimeline` (~L14298) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('journalism:archive-timeline-decode', ...)` to the existing "expand" branch catch, and — since this entry's own gap description IS the asymmetry itself, not just missing telemetry on an existing catch — added a matching `try/catch` with the same telemetry to the previously-unguarded "collapse" branch, closing the real gap (an uncaught `decodeURIComponent` exception on malformed `%`-encoding would previously break the row's click handler silently on collapse only). Forced-tested 3 ways: expand-decode failure (1 entry), collapse-decode failure (2nd entry, confirming the fix), full real expand+collapse success (0 entries, real snippet text). Zero caller behavior change on the success path; the failure path now degrades gracefully instead of throwing uncaught, matching the graceful-degradation standard used elsewhere in this codebase. |
| 1 | `bdlLoad` (~L14897) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10) — STALE ENTRY, not migrated: per the CC-CMD's own explicit warning to confirm distinctness, read the full function fresh — there is only ONE catch in `bdlLoad`, and it is the exact same site Cluster 5 already migrated and reclassified C→B (`captureFieldError('bdl:cache-read', ...)`, confirmed present in current source at L14904). No second, separate site exists at ~L14819 to migrate. No code change. |
| 1 | `injectJ1J4Badges` (~L15269) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9): added `captureFieldError('journalism:scouts-pick-poll', ...)` to the async enqueue+poll IIFE's catch. A sibling outer `catch(e_) {}` (wrapping the whole "Queue-backed Scout's Pick brief" setup block) was investigated and left untouched — it only catches synchronous setup errors, is broader/lower-value, and isn't the specific gap this entry cites. A separate, already-classified Bucket C entry (~L15102, the optional gate-label refinement lookup) is a different catch entirely — confirmed no overlap. Forced-tested (isolated snippet — throw fires 1 entry). Zero caller behavior change. |
| 1 | `fdFetchH2H` (~L17112) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): added `captureFieldError('soccer:fd-h2h', ...)` to the catch. Forced-tested (fdFetch-reject fires 1 entry, real success returns real H2H data with 0 entries). Zero caller behavior change. |
| 1 | `GameSocket` (~L18020) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6): the cited gap is `signalCrunch()`'s outer `catch(_) { return false; }` (a synchronous throw constructing/posting the HTTP fallback signal) — added `captureFieldError('ws:signal-crunch-fallback', ...)`. **Lesson 3 applied — found a second, more valuable real catch in the same method:** the async `fetch(...).catch(()=>{})` on the fire-and-forget HTTP POST silently swallows the *actual delivery failure* (the function already returns `true` optimistically before the fetch settles) — added `captureFieldError('ws:signal-crunch-fetch', ...)` there too. The class's OTHER catches (connect() construction failure, onmessage JSON.parse, onFacts callback wrapper, ws_fresh dispatch, pin/unpin sends, and the hello-message send — the specific Bucket C sibling below) were investigated and correctly left untouched: the class-level doc comment (L17915-17933) explicitly states this is a DUAL-MODE design where "polling fallback... continues to drive updates" regardless of any WS-layer failure — that architectural statement covers the whole class except `signalCrunch`, which is a distinct outbound push-signal path, not part of the inbound facts-polling loop the comment describes. Forced-tested 4 ways: WS-not-open + fetch rejects (1 entry, still returns true); WS-not-open + fetch succeeds (0 entries); synchronous throw (1 entry, returns false); WS open + send succeeds (0 entries, real send). Zero caller behavior change. |
| 1 | `ensureGameSocket` (~L18038) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6) — NOT migrated: this entry's own "gap" (a null guard for missing `sport`/`gameId`) is a deliberate validation branch, not an exception surface — no catch exists in `ensureGameSocket`'s own body. Its only catch lives in the nested default `handler` closure, which is the specific Bucket C sibling below (verified correct against real source). No code change. |
| 1 | `fetchV2AllScores(WC brief IIFE)` (~L18456) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): added `captureFieldError('journalism:v2-wc-brief-consume', ...)` to the inline IIFE's catch (real location ~L18542, inside `fetchV2AllScores`). Forced-tested via verbatim extraction of the IIFE. Zero caller behavior change. |
| 1 | `fetchV2AllScores(NBA brief IIFE)` (~L18502) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): added `captureFieldError('journalism:v2-nba-brief-consume', ...)` to the analogous NBA brief IIFE (real location ~L18588). Forced-tested. Zero caller behavior change. |
| 1 | `fetchV2AllScores(NHL brief IIFE)` (~L18539) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): added `captureFieldError('journalism:v2-nhl-brief-consume', ...)` to the analogous NHL brief IIFE (real location ~L18625). Forced-tested. Zero caller behavior change. |
| 1 | `findESPNScore` (~L20770) | 25 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): added `FIELD_OPERATIONS.recordFailure(...)` (matching this function's own existing `_recordStaleFinalBlock` convention, `severity:'trace'`) to the final generic no-match `return null;`. Forced-tested including a 75-call tight-loop stress test — collapses to 1 entry with `count:75` via the Chunk 1 rate-limit, not a flood. Success path (real match found) fires zero telemetry. Zero caller behavior change. |
| 1 | `fetchMLBSchedule` (~L21139) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6): added `captureFieldError('mlb:schedule-fetch', ...)` to the catch. Forced-tested (fetch-reject fires 1 entry, real success returns real games array with 0 entries). Zero caller behavior change. |
| 1 | `_mlbAvgPitchesPerAtBat` (~L21192) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6): added `captureFieldError('mlb:avg-pitches-per-atbat', ...)` to the catch only. **Lesson 2 resolution (see Bucket C sibling below):** confirmed this is neither double-counted nor misclassified — the function has two genuinely distinct null-return regions: the deliberate `completedPlays.length < 3`/`totalPitches === 0` "sample too thin" guards (correctly Bucket C, matches the function-level doc comment's documented silence-over-guessing design), and the actual `catch` block (a genuine unexpected exception, correctly Bucket B). Forced-tested 3 ways: corrupt feedData throws → 1 entry; thin sample → 0 entries (confirms the two paths are distinct, deliberate branch untouched); real success → 0 entries, real average returned. Zero caller behavior change. |
| 1 | `loadMLBSlate` (~L21282) | 2 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6) — NOT migrated: zero try/catch in `loadMLBSlate`'s own body; it delegates entirely to `fetchMLBSchedule` (now telemetered above) and its own `return null;` (when `fetchMLBSchedule` already returned null) is a deliberate fallthrough. The actual caller-side gap this entry describes lives in `fetchMLBFixtures`'s own try/catch around `loadMLBSlate(today)` (~L21453-21519, a genuinely reachable safety net for malformed-game-shape map failures) — but `fetchMLBFixtures` is not one of this cluster's 10 named functions, out of scope (Rule 69). Its sibling caller `refreshMLBStatus` already has its own telemetered catch (`captureFieldError('mlb-status-refresh', ...)`, pre-existing). No code change to `loadMLBSlate` itself. |
| 1 | `fetchFPLLiveScores` (~L21935) | 2 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9) — STALE ENTRY, not migrated: this function is no longer a plain `try/catch` — it was already migrated to the `fieldOperation()` primitive (`fieldOperation({subsystem:'scores', operation:'fetch-fpl-live', ...}, async () => {...})`), whose `FIELD_OPERATIONS.recordFailure()` already calls `captureFieldError('scores:fetch-fpl-live', ...)` on any exception (confirmed via reading `fieldOperation()`'s own definition). This entry describes the function's pre-`fieldOperation()`-migration shape. No code change. |
| 1 | `renderNewspaper` (~L23070) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('newspaper:apply-pick-badge', ...)` to the `applyFieldPickBadge()` wrap. A different call site to the same function (~L11803) is already telemetered as `surface:field-pick-badge` — used a distinct `fn` label here since it's a genuinely separate call site with its own context, matching this campaign's established per-call-site-label convention. Forced-tested (throw fires 1 entry, real success fires none). Zero caller behavior change. |
| 1 | `fetchSchedule (CFL load callback)` (~L23611) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): added `captureFieldError('schedule:cfl-render', ...)` to the scheduleRenderAll wrap inside `pushCFLSection`. **Lesson 1 nuance (absorption, not a gap):** the closure's outer `.catch(() => {...})` on `loadCFLScoreboard().then(...)` was investigated and confirmed unreachable — `loadCFLScoreboard()` has its own internal try/catch that always resolves (never rejects), matching its own in-code comment ("last-resort safety net, not the primary fallback path"). Correctly left untouched, matching the `Promise.allSettled`-absorption precedent from Clusters 3/4. Forced-tested (scheduleRenderAll throw fires 1 entry, real success fires none). Zero caller behavior change. |
| 1 | `fetchSchedule (BDL prefetch callback)` (~L23633) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): added `captureFieldError('schedule:bdl-prefetch-kickoff', ...)` to the outer try/catch guarding the `.some()` check + fetch kickoff. The inline `.catch(()=>{})` on `fetchBDLSeasonAverages()` itself was investigated and correctly left untouched — that promise's real rejection is already telemetered inside `fetchBDLSeasonAverages` itself (`bdl:season-averages`, Cluster 1); adding telemetry here would be redundant. Forced-tested (synchronous throw in the guard fires 1 entry, real success fires none). Zero caller behavior change. |
| 1 | `saveMyTeams` (~L24036) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('userdo:save-my-teams', ...)` to the `localStorage.setItem` catch. Forced-tested (setItem throw fires 1 entry, real persist fires none). Zero caller behavior change. |
| 1 | `buildStreamingDiscovery` (~L24393) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8) — NOT migrated: zero try/catch anywhere in this function. Its only `return null;` (`!allData`, "called before data ready") is a deliberate, correct early guard. No catch exists to instrument. Same pattern as `evaluateEMBER`/`_eDataMatchesGame`. No code change. |
| 1 | `initPWA` (~L24527) | 0 | Top-level IIFE catch around SW registration setup; app functions fully without a SW, no caller ever inspects this. |
| 1 | `_readCachedRank` (~L24703) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): added `captureFieldError('scores:fifa-rank-cache-read', ...)` to the corrupt-cache catch. Forced-tested. Zero caller behavior change. |
| 1 | `fetchTeamRank` (~L24728) | 3 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): confirmed via TASK 0 this is genuinely distinct from the earlier `94a1043` fix (that fix addressed the `fieldOperation()`-wrapped fetch/HTTP-status logic; this is the separate `localStorage.setItem` persist-failure catch that runs after the fetch already succeeded). Added `captureFieldError('scores:fifa-rank-persist', ...)`. Forced-tested (persist failure fires, in-memory `_fifaRankCache` still returns the real rank regardless; real success fires none). Zero caller behavior change. |
| 1 | `dramaScoreLive` (~L24878) | 14 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): added `captureFieldError('drama:live-weather-lookup', ...)` to the weather-lookup catch. Forced-tested (failure fires 1 entry, sitBonus simply not incremented; no weather alert present fires zero telemetry). Zero caller behavior change. |
| 1 | `_initBannedExtension` (~L26508) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('journalism:banned-extension-init', ...)` to the catch. Forced-tested (corrupt sessionStorage JSON fires 1 entry, real empty-scores path fires none). Zero caller behavior change. |
| 1 | `retryWithSportVocab` (~L26816) | 4 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('journalism:sport-vocab-review-log', ...)` to the localStorage review-log catch. Forced-tested. Zero caller behavior change. |
| 1 | `maybeScoreRetry` (~L27315) | 8 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('journalism:score-retry-phrase-log', ...)` to the Tier-3 low-score phrase-logging catch. Chosen as the required proportionate stress-test entry (highest real caller count, 8, among functions with a genuine failure path in this batch) — 25 tight-loop forced firings collapsed to exactly 1 entry with `count:25`, confirming the Chunk 1 rate-limit holds at this tier too. Zero caller behavior change. |
| 1 | `renderProseScore` (~L27691) | ~15 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tiera): added `captureFieldError('journalism:prose-score-persist', ...)` to the localStorage persist catch. Forced-tested (failure fires 1 entry, real persist success fires none, non-Brief/Night-Owl early-return path unaffected). Zero caller behavior change. |
| 1 | `buildLayer3Rules` (~L27943) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): added `captureFieldError('journalism:layer3-rules', ...)` to the catch. Forced-tested (espnScores value-access throw fires 1 entry, real success fires none). Zero caller behavior change. |
| 1 | `buildCompoundPrompt (populateSeriesContext wrapper)` (~L28304) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): added `captureFieldError('journalism:compound-prompt-populate-series-context', ...)` to this IIFE's catch. **Lesson 2 resolution (see Bucket C `pick helper` entry below):** confirmed the two entries are genuinely distinct sites, not a duplicate citation — the `pick()` closure (~L28291) is a plain null-returning lookup with no catch of its own, several lines away from this IIFE, inside a *different* sibling context-enrichment item in the same array. An identical `(()=>{try{populateSeriesContext(g)}catch(e_){}})()` line also exists inside `fetchFIELDBriefFromClaude` (~L31533) — that site is out of scope (not one of this cluster's 9 named functions, Rule 69) and was left untouched. Forced-tested (throw fires 1 entry, real mutation fires none). Zero caller behavior change. |
| 1 | `buildFIELDBriefStatic` (~L28701) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster3) — NOT migrated: zero try/catch anywhere in this function. It's a pure synchronous text-assembly function; its only `return null;` (`!ranked.length`, no games at all) is a deliberate, correct branch, not an exception. Same pattern as `computeBroadcastNarrativeIndex`/`_resolveRealGameId`/`fetchStandingsForPrompt`/`fetchBDLMilestones` from prior tiers. No code change. |
| 1 | `getFieldUserId` (~L29045) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10): added `captureFieldError('userdo:get-field-user-id', ...)` to the catch. Forced-tested (localStorage throw fires 1 entry returns null, real id generation fires none). Zero caller behavior change. |
| 1 | `visibilitychange listener (peak_missed)` (~L29041) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): added `captureFieldError('userdo:peak-missed-visibility', ...)` to the listener's catch (real location ~L29304). Forced-tested. Zero caller behavior change. |
| 1 | `_connect` (~L29459) | 3 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('ambient:sse-connect', ...)` to the `EventSource` construction catch. Forced-tested. Zero caller behavior change. |
| 1 | `fetchNBAStandingsParsed` (~L30010) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster1): this function has 3 separate fallback-tier catches (ESPN, NBA CDN relay, BallDontLie), each already `console.warn`-only. Added exactly ONE aggregate `captureFieldError('standings:nba-parsed', ...)` right before the final `return null;` (after all 3 tiers exhausted) — matching the earlier `fetchESPNFixturesForDate` precedent (a single summary signal, not one per sub-failure) and the CC-CMD's own singular framing ("after all three fallback sources fail"). Forced-tested: all-3-fail fires exactly 1 entry; tier-1 success fires none and tiers 2/3 are never attempted. Zero caller behavior change. |
| 1 | `nhlPlayoffLeadersPrefetch` (~L30639) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): same sync-only-outer-catch pattern as `espnInjuriesPrefetch` above — added `captureFieldError('nhl:playoff-leaders-prefetch', ...)` at the real swallow point inside `fetchNHLPlayoffLeaders`'s own catch. **Real nuance found via forced testing:** `Promise.allSettled([...])` never rejects, and the function's own `if (!sk && !gk) return ...` already gracefully absorbs a total fetch failure one line before the catch — confirmed via a real forced test that a total-fetch-failure scenario produces ZERO telemetry (correct, not a gap). The catch is only reachable if `buildNHLPlayoffLeadersByTeam()` itself throws given a malformed-but-successful response — a genuine code-integrity signal, narrower than "network failure" but real. Forced-tested both scenarios. Zero caller behavior change. |
| 1 | `nbaPlayoffLeadersPrefetch` (~L30795) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): same pattern and nuance as `nhlPlayoffLeadersPrefetch` above — added `captureFieldError('nba:playoff-leaders-prefetch', ...)` at the real swallow point inside `fetchNBAPlayoffLeaders`'s own catch, only reachable via a `buildNBAPlayoffLeadersByTeam()` bug, not a total-fetch-failure (that's already gracefully absorbed one line earlier). Forced-tested both scenarios. Zero caller behavior change. |
| 1 | `fetchFIELDBriefFromClaude` (~L31236) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2) — STALE ENTRY, not migrated: describes a `.filter(Boolean)`-discarded inline IIFE pattern that no longer exists anywhere in the current file. The function's only real call site (`initFIELDBrief`, ~L31773) was already fully migrated to a typed `{ok, text/reason}` contract with full caller-side branching in entry #8 above (commit `adfc01e`), earlier in this same session — this entry describes the function's pre-migration shape. No separate "inline IIFE variant" exists to touch. No code change. |
| 1 | `_wcAdvancementProb` (~L34627) | 2 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5) — NOT migrated: zero try/catch anywhere in this function. Pure deterministic lookup chain (permutations engine → fuzzy name match → relay single-game fallback → null), entirely guarded by optional chaining (`?.`) and `??` defaults. Every `return null;`/fallthrough is a deliberate, correct branch (no scenario data yet, no fuzzy match, no relay estimate) — no catch exists to instrument. Same pattern as `_resolveRealGameId`/`parseNBACDNActions`. No code change. |
| 1 | `renderWCBracketTree` (~L34893) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): added `captureFieldError('wc:bracket-tree-fetch', ...)` to the sole catch (fetch failure → empty slots={}). Forced-tested (fetch-reject fires 1 entry, real success with bracketSlots fires none). Zero caller behavior change. |
| 1 | `buildArbitrageReport` (~L35656) | 2 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10) — NOT migrated: zero try/catch anywhere in this function. Pure deterministic data-processing over `allData.sports`; the sole `if(!allData?.sports) return null;` guard is deliberate. No catch exists to instrument. No code change. |
| 1 | `computeDramaRetroactive` (~L35999) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7) — NOT migrated, entry inaccurate against current source (Rule 48 DO NOT ASSUME): this entry's own gap description doesn't hold up. The function's ONLY `return null;` is the deliberate `!historicalStates || !historicalStates.length` guard at the top (a genuinely correct, empty-input branch) — the main computation is wrapped in `try { ... return {...}; } finally { ... }`, NOT `try/catch`, so a real exception in the main body would propagate uncaught to the sole caller (`_backfillOneDramaGame`, which also has no try/catch around this call), not collapse to `null`. There is no existing catch here to add telemetry to without inventing new error-handling structure the CC-CMD didn't ask for (Rule 69 scope boundary). No code change. See the Bucket C entry below for the one real catch that does exist in this function (the `finally`-block cleanup). |
| 1 | `parseNBACDNActions` (~L36308) | 1 | ⏭ INVESTIGATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster4) — NOT migrated: zero try/catch anywhere in this pure synchronous parsing function. Its only `return null;` (`!actions?.length`) is a deliberate, correct branch. No code change. |
| 1 | `buildWCBars` (~L39183) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5): added `captureFieldError('wc:projections-cache-load', ...)` to the `loadWCProjectionsCache()` fire-and-forget catch. Forced-tested (isolated snippet — throw fires 1 entry, real success fires none). Zero caller behavior change. |
| 1 | `isRivalGame` (~L39059) | 7 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('rivalry:is-rival-game', ...)` to the TDZ-guard catch. Forced-tested (TDZ failure fires, real rivalry match fires none). Zero caller behavior change. |
| 1 | `isObjectiveRival` (~L39440) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): added `captureFieldError('rivalry:is-objective-rival', ...)` to the catch. Forced-tested (RIVAL_MAP throw fires 1 entry returns false, real rivalry lookup fires none). Zero caller behavior change. |
| 1 | `hydrateEspnScoresFromFinals` (~L40075) | 2 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster6): added `captureFieldError('scores:hydrate-espn-from-finals', ...)` to the sole catch. Forced-tested (loadTonightFinals throw fires 1 entry, real finals data hydrates espnScores with 0 entries). Zero caller behavior change. |
| 1 | `buildDramaLineTiers` (~L41102) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): added `captureFieldError('drama:line-tiers-trend', ...)` to the `getDramaTrend()` catch. Forced-tested (isolated snippet — throw fires 1 entry; real success with rising trend fires none). Zero caller behavior change. |
| 1 | `openBottomSheet` (~L41553) | 7 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierb): added `captureFieldError('bottomsheet:postgame-drama', ...)` to the postgame drama-string catch. Forced-tested (via isolated snippet — the full function is DOM-heavy). Zero caller behavior change. |
| 1 | `idbSet` (~L42899) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster8): added `captureFieldError('snapshot:idb-set', ...)` to the catch. Forced-tested (_snapshotOpen rejection fires 1 entry returns false, real IDB write fires none, returns true). Zero caller behavior change. |
| 1 | `saveSnapshot` (~L42535) | 1 | ✅ MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster2): confirmed both real invocation paths (`visibilitychange` listener, `beforeunload` reference). Added `captureFieldError('snapshot:save', ...)` to the catch. Forced-tested. Zero caller behavior change. |
## Bucket C — grouped by function (513 sites across 254 functions — reconciled 2026-07-13, CC-CMD-bucketb-tierc-cluster10, FINAL: was 519/257 at initial survey; -6 sites via C→B reclassifications across Clusters 3/5/9/10 — see the Bucket B header above for the function-count breakdown.)

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
| 9 | `GameSocket` (~L17961) | 1 | ✅ CONFIRMED CORRECT 2026-07-13 (CC-CMD-bucketb-tierc-cluster6): verified directly against source — `onopen`'s `try { this.ws.send(JSON.stringify({type:'hello',...})); } catch(_){}` at L17961, and the class-level architecture comment at L17915-17933 does state exactly this ("On error/close, auto-disconnects and surfaces `.available = false` so the polling fallback... continues to drive updates. DUAL-MODE design — polling is the safety net."). Genuinely correct C, not a paraphrase-only classification. See the Bucket B `GameSocket` entry above for the one real gap this cluster found in the class (`signalCrunch`, a distinct outbound push-signal path not covered by this comment's inbound-facts framing). No code change. |
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
| 2 | `loadPGASlate` (~L16864) | 1 | ⤴ RECLASSIFIED B, MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster10, Lesson 2 applied — caught before writing code this time): "correct degrade, invisible to the sole caller" is true but is exactly what Bucket B is — same reasoning already applied to the structurally identical `bdlLoad`/`loadBroadcastArchaeology`/`fetchSeriesArchive` cache-read/cache-write catches across Clusters 5 and 9. Reclassified for consistency. Added `captureFieldError('golf:pga-slate-cache-read', ...)`. See the Bucket B entry above for the other 2 real catches found in this same function. |
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
| 2 | `_mlbAvgPitchesPerAtBat` (~L21196) | 1 | ✅ CONFIRMED CORRECT 2026-07-13 (CC-CMD-bucketb-tierc-cluster6): verified directly against source — `if (completedPlays.length < 3) return null;` (L21196) and `if (totalPitches === 0) return null;` (L21199) are the deliberate "sample too thin" guards, matching the function-level comment (L21155-21161) explicitly documenting "thin/missing data returns null... matching this codebase's established silence-over-guessing discipline," the same philosophy as sibling `_mlbRecentPitchPaceMs`. Confirmed this is a genuinely distinct code region from the Bucket B entry above (the function's actual `catch` block) — not double-counted, not misclassified. No code change. |
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
| 1 | `bdlLoad` (~L14893) | 1 | ⤴ RECLASSIFIED B, MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster5, Lesson 2 applied): this entry's own text conflates two distinct code paths that both `return null;` — the deliberate `!raw` early-return (true cache-miss, correctly C) and the `catch(e)` block (corrupt-cache JSON.parse/storage failure, structurally identical to the `fetchGameBriefOnDemand`/`fetchEPLMatchBriefFromClaude` reclassification precedent from Cluster 3: an unexpected failure mode silently indistinguishable from the benign case at the call site). Added `captureFieldError('bdl:cache-read', ...)` to the catch only — the `!raw` early return remains untouched and correctly Bucket C. Forced-tested 3 ways: corrupt cache → 1 entry; true cache-miss → 0 entries (confirms the two paths are genuinely distinct); fresh valid hit → 0 entries, real data returned. Zero caller behavior change. |
| 1 | `fetchAQI` (~L15706) | 1 | Sole caller (fetchWeather) explicitly comments "non-blocking" and does `if(aqiData) wx.aqi=...`; AQI failure is intentionally inconsequential. |
| 1 | `getUpcomingMajor` (~L15897) | 1 | null correctly means "no major within the 5-day preview window"; sole caller does `if(!major\|\|!container) return;`. |
| 1 | `slashGolfBudgetOk` (~L16006) | 1 | Boolean predicate for a 429-backoff window; used only as `!slashGolfBudgetOk()` gate inside slashGolfFetch, false is the genuine "not ok" signal. |
| 1 | `getActiveTournaments` (~L16151) | 1 | Array.filter predicate: false means "exclude tournament with no date", the complete correct semantic for a filter callback. |
| 1 | `fdFetchLive` (~L17033) | 0 | ✅ REMOVED 2026-07-13 (CC-CMD-queue-deadcode-and-ambiguous, TASK 1): re-confirmed zero callers fresh — superseded by a batched-fetch refactor. Traced `fdPrefetchSoccerLive`'s current body directly: it calls `fdFetch()` (the shared low-level relay wrapper), not `fdFetchLive()` — confirmed no direct or indirect call before deleting. `fdLiveCache`/`fdLiveCacheTime` (still written by `fdPrefetchSoccerLive`) left untouched; `FD_LIVE_TTL` const is now orphaned as a side effect and flagged as a follow-up candidate, not removed (out of this CC-CMD's explicit scope). Deleted. |
| 1 | `_isModelRefusal` (~L17528) | 1 | Boolean guard `if(!text) return false` is a legitimate defensive default; sole call site already ensures text is non-empty before calling. |
| 1 | `findScore` (~L17730) | 1 | null legitimately means "no witness score from either source yet"; sole caller (findESPNScore) falls to the legacy espnScores lookup, a genuine complete-as-is signal not an error. |
| 1 | `ensureGameSocket` (~L18077) | 1 | ✅ CONFIRMED CORRECT 2026-07-13 (CC-CMD-bucketb-tierc-cluster6): verified directly against source — the exact comment `/* never throw from socket handler */` exists at L18077, on the `catch(_)` wrapping the default `handler`'s `emitScoreEvent(...)` call. Genuinely correct C, not a paraphrase-only classification. See the Bucket B `ensureGameSocket` entry above — `ensureGameSocket`'s own body has zero exception surface beyond this nested closure. No code change. |
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
| 1 | `buildCompoundPrompt (pick helper)` (~L28291) | 1 | ✅ CONFIRMED CORRECT 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): verified directly against source — `const pick=(nick)=>{const pool=(window._bdlSeasonAvgByTeam[nick]||[]);if(!pool.length) return null;...}` at L28291, consumed via `const h=pick(hNick), a=pick(aNick);const parts=[a,h].filter(Boolean);` two lines later — exact match. Genuinely correct C, and genuinely a DIFFERENT site from the Bucket B `populateSeriesContext wrapper` entry above (not a duplicate citation) — different line, no catch of its own (the whole enclosing IIFE has its own separate try/catch), a plain deliberate-null lookup helper. No code change. |
| 1 | `_refreshOpenSheet` (~L28351) | 2 | Best-effort openBottomSheet call in a fire-and-forget retry pass; swallow just skips the UI refresh. |
| 1 | `fetchSeriesPreviewFromClaude` (~L28841) | 2 | ⤴ RECLASSIFIED B, MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9, Lesson 2 applied): this catch wraps the exact same shared `enrichChampionshipFromArchive(g, champCtx)` call that Cluster 3 already reclassified C→B for `fetchGameBriefOnDemand` and `fetchEPLMatchBriefFromClaude`, per the user's explicit authorization that this pattern is structurally identical to the shipped `dramaScoreLive` optional-enrichment case, not a genuine "null IS the complete correct semantic" Bucket C site. Applying that same standing precedent here for consistency. Added `captureFieldError('journalism:series-preview-champ-archive-enrich', ...)`. Forced-tested (isolated snippet — throw fires 1 entry, `_j2ChampCtx` stays unchanged). Zero caller behavior change. |
| 1 | `_savePickCache` (~L28816) | 1 | Best-effort localStorage write for local pick cache; quota/blocked errors silently skip persistence. |
| 1 | `_resolvePickIfExists` (~L28941) | 1 | Best-effort DOM widget refresh inside a .then() with no consumer of the outcome. |
| 1 | `hydrateMissedRecaps` (~L29109) | 1 | Comment explicitly states "hydration failure is silent — recap snippet is enhancement". |
| 1 | `_isSSECovered` (~L29472) | 0 | Exported via window._ambientES but has zero real call sites; boolean predicate is correct as designed regardless. |
| 1 | `fieldEvents 'field:lead_change' listener` (~L29991) | 1 | "Never throw from a bus listener" design convention explicitly stated in the code comment. Line citation corrected 2026-07-13 (CC-CMD-bucketc-cleanup): was `~L29713`, now `~L29991` (278 lines of drift from new code inserted above it) — content and classification unchanged, re-verified against the exact comment text still present at the real current line. |
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
| 1 | `fetchSeriesArchive` (~L32084) | 1 | ⤴ RECLASSIFIED B, MIGRATED 2026-07-13 (CC-CMD-bucketb-tierc-cluster9, Lesson 2 applied — found post-code, not pre-code, see Bucket B entry above for the honest process note): "doesn't affect the already-fetched `data` being returned" is true but doesn't make this C — that's exactly the Bucket B definition (caller unaffected, but the failure itself is a real, previously-invisible signal worth ops visibility). Same reasoning class and same failure mechanism (sessionStorage/localStorage.setItem throwing) as the already-migrated `fetchTeamRank` persist catch (Tier B) and `loadBroadcastArchaeology`'s cache-write catch (Cluster 5) — both already correctly classified B in this same queue. Reclassified for consistency. |
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
| 1 | `computeDramaRetroactive` (~L36038) | 1 | ✅ CONFIRMED CORRECT 2026-07-13 (CC-CMD-bucketb-tierc-cluster7): verified directly against source — `finally { try { localStorage.removeItem(tempKey); } catch(e) {} }` at L36038, cleaning up a temp scratch key. Genuinely correct C, and genuinely distinct in kind from the Bucket B entry above — see that entry for the finding that the Bucket B "gap" doesn't actually correspond to any real catch in this function (the main computation uses `finally`, not `catch`). No code change. |
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
