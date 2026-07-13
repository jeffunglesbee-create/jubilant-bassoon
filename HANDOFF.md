HANDOFF
Last commit (jubilant-bassoon): dbd91f7  Smoke: 919/0, field_unit 66/0, field_smoke Failures:0
Last commit (field-relay-nba): 5016cc9  (deploy match:false is a known non-issue -- only
  routine crons triggered on this specific commit; the real fix commit, 8fe6875, deployed
  and is confirmed live)
Clean state: yes -- all three test suites green on both repos' most recent real code changes.

=== CONTINUATION SESSION (2026-07-12 late) — uncapped backoff audit ===

Direct user request: "Verify the backoffs aren't uncapped." Full grep sweep of
every backoff/retry-delay pattern in index.html (backoff mentions, Date.now()+var
future-timestamp patterns, exponential-growth patterns, non-literal setTimeout/
setInterval delays, attempt-multiplier patterns). Found one genuine gap:
fetchCompoundEditorial's 429 handler set _compoundRetryAfter directly from the
relay's raw Retry-After header with no client-side ceiling -- a misconfigured or
hostile upstream (or a unit-mismatch bug) could disable compound editorial calls
for the rest of the session or effectively permanently, since the value persists
to localStorage across reloads. Clamped to a 30-minute ceiling (matching
slashGolfFetch's own flat 60min 429 backoff elsewhere in this file) with a safe
60s fallback for non-numeric/non-positive header values. Five other backoff
mechanisms audited and confirmed already capped: slashGolfFetch (fixed 60min),
ESPN per-league error backoff (Math.min(...,300000)), GameSocket EventSource
reconnect (Math.min(delay,60000) + MAX_RECONN=5), BracketDO WebSocket reconnect
(MAX_RECONN=3, small linear delay), GameSocket's fixed _retryMs. Verified via
8-scenario forced-condition test plus full smoke/unit/field_smoke suite.
SW_VERSION 2026-07-12s -> t. Commit dbd91f7. Doc:
docs/outbox/cc-compound-retry-after-cap-2026-07-12.md.

=== CONTINUATION SESSION (2026-07-13) — full Bucket A sweep + EPL typo fix ===

Following the prior segment's typed-result survey (docs/TYPED-RESULT-MIGRATION-QUEUE.md,
26 Bucket A candidates), executed a full sweep of the queue plus directly-flagged
follow-ups, per an explicit "keep going, automate follow-ups, no fallbacks only fixes"
instruction. 17 real commits, each independently verified with real forced-condition
tests against functions extracted verbatim from the live file, not code review alone:

- f72a58a -- renderEPLMatchBriefCard: fixed the undefined `g` typo (should be `game`)
  the survey's own TASK 4 spot-check found -- archiveBrief() had never once run for an
  EPL brief.
- ca10d13 -- saveEspnFinal migrated to fieldOperation(): a mid-function exception was
  silently indistinguishable from success to both real callers. Required converting two
  synchronous forEach callers to for-of loops (fieldOperation() is async-only) --
  caught and fixed a real subtlety: every forEach `return;`-as-skip had to become
  `continue;`, since a bare `return` in a for-of exits the whole function instead.
  Also caught that checking only `.ok` (as literally suggested) would have introduced a
  new regression for the guard-rejection case -- fixed to check `.ok && .value`.
- 08c85e1 -- fetchNHLRelayScores migrated: its own internal catch was preventing its own
  caller's telemetry from ever firing (the promise never rejected).
- 3a9fb8d -- found and fixed the identical bug in 3 sibling relay functions
  (fetchNBARelayScores, fetchFPLLiveScores, fdPrefetchSoccerLive) -- flagged as a likely
  pattern during the NHL fix, confirmed and fixed directly.
- 94a1043 -- fetchTeamRank: the real bug wasn't just the swallowed exception, it was that
  a transient network failure OR a bare HTTP error status both got cached as a permanent
  "team not ranked" for the full 7-day TTL. Redesigned to only cache definitive outcomes.
- 76864a3 -- findESPNScore (25+ callers, highest leverage by count): read every caller
  before assuming a return-contract change was warranted -- none would behave
  differently even if they could distinguish "stale-final guard blocked it" from
  "genuinely no data." Fixed the REAL gap instead: purely additive telemetry at all 3
  sites the guard fires, since it previously had zero persistent visibility (one of its
  3 call sites had no logging at all, not even FIELD_DEBUG-gated).
- 328fce7 -- generateJournalismViaRelay: the queue's own "unwanted live call during
  proof-mode" premise was investigated and found FALSE -- proof mode globally
  monkey-patches window.fetch, so the claimed fallback live-call can't actually happen.
  Documented this correction directly in the function's own header comment. Fixed a
  real, different gap instead: model refusal was the only one of 3 failure causes with
  no captureFieldError telemetry, despite being flagged "CRITICAL" in an adjacent comment.
- 0e6cbaa -- journalismCallsToday: added blockedReason() (additive). Found a confirmed
  bug while reading all 9 real callers: fetchCompoundEditorial already had a SEPARATE,
  more informative 429-backoff diagnostic message that could never actually fire --
  canCall() itself already exited the function first under the identical condition. The
  countdown message had been dead code since it was written.
- 3a9a52a -- fetchCompoundEditorial: extended the same diagnostic to the
  budget-exhausted case, which previously showed the Health Panel a STALE error message
  from hours earlier and a completely different cause.
- 448aa59 -- fetchFIELDBriefFromClaude (FIELD's flagship brief): the sole caller showed
  the same alarming "verification chain failed" message for 6 completely different
  causes, 4 of which are not failures at all (proof-mode, budget, no-games, deliberate
  suppression). Found the caller already renders a sensible static fallback BEFORE this
  function runs -- for the 4 benign causes, the fix is simply to leave that alone
  instead of overwriting it, no new copy needed.
- 376895e -- fetchMLBGameBriefFromClaude: investigated whether the same caller-side fix
  applied here too -- it didn't. Neither real caller has a "leave it alone" option (both
  must resolve to real text or card removal, and the codebase's own established rule is
  "never leave 'Loading brief...' stuck"). Fixed the real, different gap: zero telemetry
  on either failure path.
- 81aa333 -- fdFetchStandings + fetchDateSchedule. Investigated the "add a
  slashGolfFetch-style 429 backoff" suggestion for fdFetchStandings and found it didn't
  fit (user-click-triggered, already session-cached, not a poll loop) -- added telemetry
  instead. fetchDateSchedule got the full caller-side fix: budget-exhausted vs. genuine
  failure now show different, accurate messages (new copy written in the app's existing
  calm tone, no Retry button when retrying can't help).
- 1f97d31 -- fetchESPNFixturesForDate: confirmed no caller-visible behavior would change
  from differentiating "ESPN empty" vs "ESPN fetches failed" (same fallback either way).
  Fixed the real gap: 15+ parallel per-league fetches each silently swallowed errors --
  an ESPN-wide outage would have been completely invisible. Added a failure-count
  summary telemetry call.
- 5478adf -- shareGame, the last Bucket A entry. Fixed the queue's original finding
  (dead silence on total failure) plus a second, more interesting bug found while
  reading closely: navigator.share() throws AbortError on a deliberate user cancel, and
  the old code treated that identically to a real failure -- silently copying to
  clipboard and showing a "Copied!" toast for an action the user never took.

**This closes all 13 ranked Bucket A entries from docs/TYPED-RESULT-MIGRATION-QUEUE.md.**
Bucket B (281 sites, telemetry-only, lower priority) was not attempted -- a real
candidate for a future, separate sweep. A recurring pattern across this whole session:
several entries the original survey flagged for caller-side differentiation turned out,
on actually reading every real caller, not to need it -- the caller's existing behavior
was already correct regardless of failure cause. In every one of those cases a
different, real, smaller-scope fix (almost always a telemetry gap) was found and
closed instead of building unneeded complexity. Full detail and real-test verification
for every fix is in docs/outbox/cc-*-typed-migration-2026-07-13.md (13 files).

=== CONTINUATION SESSION (2026-07-12 evening) — 3 approved CC-CMD items ===

User approved three specific items from a pending-CC-CMD survey: Chunk 1
(field-operation-primitive), Chunk 2 (typed-result-survey), and OTW tier
categorical (merging two overlapping CC-CMD docs). All three shipped and
pushed this session, each as its own single-concern commit:

- c6f632c — fieldOperation()/FIELD_OPERATIONS/classifyFieldError() added
  as an extension of captureFieldError() (not a replacement). Zero call
  sites migrated -- Chunk 2 exists to rank which sites are actually worth
  migrating first.
- f2c7413 + e56fc55 — _otwGetLiveTier's CLOSE_FINISH/LIVE_GAME branches
  rewritten from a composite-drama-score threshold comparison to named
  conditions (_otwMarginTier/_otwIsFinalPeriod/_otwIsCrunchTime), the same
  RUWT pattern already proven for the WC selector. Calibrated against a
  749-sample real-behavior sweep (98.5% agreement) plus real live ESPN
  data. A follow-up self-audit of an earlier rejected design iteration
  (v3) found a genuine bug ALSO present in the shipped v2 design (soccer
  margin=1 games between minute 70-79 fell through to no tier at all) --
  fixed in e56fc55, improving agreement to 99.07%. Corrected STANDARDS.md
  Rule 95's stale _otwFindLiveGame entry along the way. One genuinely open
  design question (whether "final period" should mean literal-last-period
  or first-real-urgency-period, a 12-case boundary disagreement, NOT a bug)
  written up as its own follow-up CC-CMD rather than decided unilaterally:
  docs/CC-CMD-2026-07-12-otw-finalperiod-semantics.md.
- 4519884 — all 827 return-null/return-false/silent-catch sites in
  index.html classified (10 parallel agents, read-every-caller discipline)
  into docs/TYPED-RESULT-MIGRATION-QUEUE.md: 26 Bucket A (real migration
  candidates, ranked, itemized -- top 2 are CONFIRMED bugs, not just
  theoretical: saveEspnFinal's outer catch masks a genuine save failure as
  success, fetchNHLRelayScores' catch prevents its own telemetry from
  firing), 281 Bucket B (decorative-only), 519 Bucket C (correctly as-is).
  TASK 4 spot-check (independently re-derived, not trusting the
  classifying agents) found and corrected ONE real misclassification:
  renderEPLMatchBriefCard's archiveBrief() call references `g`, which
  doesn't exist in that function's scope (only `game` does) -- every
  invocation throws, silently swallowed, archiveBrief() has never once
  actually run for an EPL brief. One-line fix (g -> game), flagged
  prominently at the top of the queue doc, NOT fixed in this commit
  (survey scope only). Ready for a trivial follow-up.

Also resolved (not committed -- CC-CMD's own confidence gate): investigated
cliche-freshness-scoring (replace hasCliche()'s hardcoded phrase list with
Datamuse word-frequency scoring). Directly tested the premise
"word-frequency measures cliche-ness" against real Datamuse data, caught
and corrected a proper-noun confound in the first test pass, and found the
premise does not hold well enough to build a retry mechanism on. Declined
to implement rather than force a technically-compliant-but-wrong
deliverable -- reported honestly below the 95-confidence gate, zero commit,
per the CC-CMD's own explicit instruction. If revisited, needs a different
signal than raw word frequency.

=== SESSION SUMMARY (2026-07-11 evening through 2026-07-12 early morning, extended) ===

This was a very long, multi-arc session. High-level shape: infrastructure/governance work
in the first half (MCP multi-repo access, credential-boundary enforcement, STANDARDS.md
rule collisions), pivoting into real product bug-hunting in the second half (silent-failure
sweeps across client and relay, then journalism-quality architecture). Everything below is
independently verified, not taken on any commit message's word -- see the transcript for the
specific verification method used per item if detail is needed.

REAL PRODUCT FIXES SHIPPED (user-visible or user-consequential), confirmed live:
- MLB game cards no longer stick permanently on "Inn 9" after the game ends (two independent
  MLB state systems now reconciled every poll, not just on transition).
- Journalism brief/preview cards no longer risk silent, permanent loss from a DOM
  reconciliation selector collision (bare [data-gameid] matched brief cards before game cards).
- "Yesterday's FIELD" archive link now falls back to the server archive instead of only
  reading local sessionStorage; a pre-existing uncaught ReferenceError in the same code path
  fixed alongside it.
- NHL series/GSAX routing bug fixed (a /nhl vs /nhl/ prefix collision); both NHL and NBA
  seasonal pipelines now continue into the October regular season, not just playoffs --
  this also caught and fixed a live, time-sensitive risk in nba-clutch (no month gate at all,
  would have silently blanked good playoff data starting in August).
- Pick resolution can no longer get permanently stuck unretryable after one transient
  failure (saveEspnFinal's own dedup guard was firing regardless of pick-resolution success).
- Night Owl context race fixed -- a slower-resolving final's AI text could previously land
  under a different game's card.
- Dead duplicate fallback clause removed from MLB park-factor lookup (x||y||x pattern).
- Generic-lead detector rebuilt: regex-based sentence-shape matching replaced with reused
  specificity math (proper-noun/number density), applied per-sentence instead of per-brief --
  catches genericness as a property, not an enumerated list of known bad shapes. The old
  regex only caught "The [Team] are..." openers; a live example ("[Team] secured a
  victory...") slipped through it entirely, which is what prompted the redesign.
- Datamuse (journalism freshness scoring) proxied through field-relay-nba instead of called
  directly from the client -- the direct call was blocked inside claude.ai's iframe sandbox
  (CSP), silently falling back to a hardcoded fresh=83. Now genuinely unblocked (relay has no
  iframe restriction) with real KV caching (30-day TTL), verified live: fresh word MISS then
  HIT on repeat, correct inverted-frequency scoring confirmed (common words ~84, rare ~99).

GOVERNANCE / INFRASTRUCTURE SHIPPED:
- STANDARDS.md Rule 97 (CI-AS-INVARIANT-A) added: a test suite that enumerates
  individually-authored point-checks only catches bugs someone already thought to write a
  check for -- quantified directly against smoke.js (856 assertions at the time, only 1
  checked a genuine cross-value invariant). Any new assertion protecting a relationship
  between fields/systems/write-paths must be written as an invariant, not a one-off fact.
- STANDARDS.md Rule 95 corrected this session: the stale _otwFindLiveGame MODERATE entry
  (claimed it still used a composite-score threshold for game selection; it doesn't -- that
  refactor already shipped, undetermined exact date, governance doc just never updated) --
  replaced with a dated correction note, plus the real remaining risk's fix entry
  (_otwGetLiveTier's T3/T4, see above).
- STANDARDS.md Rules 89-96 added. 89: scoped-MCP-tool-over-credential-handoff default.
  90: mechanical D1-backed rule-registry tracking + CI staleness check (field-relay-nba).
  91: legible-across-scope (durability/holism at 4 radii). 92-96: canonicalized a real
  5-rule numbering collision (originals 48-52 untouched; the June-1-2026-batch collision
  side, added June 4 without checking for conflicts, is now properly numbered here).
- Three new STANDARDS.md reference sections: Deploy Recovery Infrastructure, Claude Code
  UI-Displayed Hash Reliability (confirmed twice tonight: Claude Code's own "Done (HASH)"
  status header does not reliably match the real git commit hash -- never trust it, always
  verify via git log/show), MCP Tool Mid-Session Visibility Gap (a brand-new MCP tool name
  needs a fresh connection to become callable; an undeclared parameter on an existing tool
  does not -- confirmed as two genuinely different cases).
- STANDARDS-INDEX.md build is PENDING (spec pushed, not yet executed) -- a compact,
  additive index meant to be the fast session-start read once built, since STANDARDS.md is
  now 4700+ lines. A follow-up CC-CMD to actually wire it into Rule 40/Rule 8/GOVERNANCE.json
  is also pending -- the index alone doesn't change session behavior without that.
- field-relay-nba MCP tools (get_ci_status/get_deploy_status/get_smoke_count) extended to
  accept an optional repo param, audited as a full class rather than one at a time.
  trigger_workflow (new tool, chat-accessible stuck-deploy recovery) is live and verified
  server-side but may need a fresh session connection to become callable.

STILL GENUINELY OPEN, tracked in codex (category cc-cmd-queue) -- check codex_list there
for current state rather than trusting this list to stay accurate indefinitely:
- otw-finalperiod-semantics (jubilant-bassoon) -- NEW this session, pushed, not yet
  executed. docs/CC-CMD-2026-07-12-otw-finalperiod-semantics.md. A genuine open product
  question surfaced while fixing a real bug in the OTW tier work above: should
  _otwIsFinalPeriod mean the literal last period/inning/quarter (current, conservative,
  matches historical behavior), or the first period where dramaScoreLive's own timeBonus
  table turns nonzero (more permissive -- e.g. a tied NBA game with 1:30 left in Q3, raw
  drama score 70, comfortably past the composite threshold, currently still shows LIVE_GAME
  not CLOSE_FINISH purely on a quarter-number technicality)? Deliberately NOT decided
  unilaterally -- needs an explicit product call, not an agreement-with-old-behavior
  heuristic (the old thresholds were never validated as correct in the first place).
- ~~renderEPLMatchBriefCard g->game typo~~ -- FIXED 2026-07-13, commit f72a58a.
- ~~TYPED-RESULT-MIGRATION-QUEUE.md Bucket A items~~ -- ALL 13 FIXED 2026-07-13, see
  the CONTINUATION SESSION section above for the full list and commit hashes. Bucket B
  (281 sites, telemetry-only) remains open as a lower-priority future sweep, not
  attempted.
- standards-index-wiring (jubilant-bassoon) -- pushed, not yet executed, depends on
  standards-index landing first (explicit prerequisite check included in the doc).
- otw-finalperiod-semantics remains the only genuinely open item carried over from the
  prior session (see above) -- still correctly deferred, needs an explicit product
  decision, not something to resolve unilaterally.

Full list of everything pushed, executed, and independently verified tonight (with the
specific verification method for each) is in the conversation transcript and in codex
(codex_search/codex_list, category cc-cmd-queue) -- this handoff summarizes, it does not
replace either.

KEY LEARNINGS FROM THIS SESSION (also saved to Drive as a standalone doc):
- Verify behavior, not description -- a tool schema not showing a parameter doesn't mean it
  doesn't work; a UI status header showing a hash doesn't mean it's the real one.
- A wrong claim is worth tracing, not just accepting or dismissing -- the trace is where the
  value is, in either direction.
- "Silent failure" almost always means an unexamined trace exists already, not that no trace
  exists at all.
- Verifying something is done and updating the tracker are two separate actions -- do both
  in the same breath or the tracker drifts from reality (this happened repeatedly tonight,
  caught each time on a later cross-check).
- Some bugs are pure logic/structural problems (dead duplicate fallback clauses, DOM selector
  collisions) that no amount of additional error-handling instrumentation would ever catch --
  worth asking which kind of bug it is before defaulting to the pattern that worked last time.
- A regex is the right tool for a genuinely syntactic target (a grammatical construction);
  it's the wrong tool for approximating a continuous quality dimension that has a real,
  measurable proxy available -- measure the property directly instead of enumerating shapes.

Blocked on: nothing currently blocking. otw-finalperiod-semantics and
standards-index-wiring are the only two genuinely open items, both real, scoped,
independently actionable, not blocked on anything else.
Watch for: field-relay-nba's /deploy/verify showing match:false is routine and usually not a
real problem -- always cross-check what workflow actually ran against the expected SHA
(get_deploy_status) before treating it as a stuck deploy.

Session docs (2026-07-12 evening continuation): docs/outbox/cc-field-operation-primitive-2026-07-12.md,
docs/outbox/cc-otw-tier-categorical-2026-07-12.md, docs/outbox/cc-typed-result-survey-2026-07-12.md.

Session docs (2026-07-13 Bucket A sweep): docs/outbox/cc-epl-brief-archive-typo-fix-2026-07-13.md,
cc-saveespnfinal-typed-migration-2026-07-13.md, cc-fetchnhlrelayscores-typed-migration-2026-07-13.md,
cc-relay-sibling-catch-sweep-2026-07-13.md, cc-fetchteamrank-typed-migration-2026-07-13.md,
cc-findespnscore-typed-migration-2026-07-13.md, cc-generatejournalismviarelay-typed-migration-2026-07-13.md,
cc-journalismcallstoday-typed-migration-2026-07-13.md, cc-fetchcompoundeditorial-typed-migration-2026-07-13.md,
cc-fetchfieldbrieffromclaude-typed-migration-2026-07-13.md, cc-fetchmlbgamebrieffromclaude-typed-migration-2026-07-13.md,
cc-fdstandings-datescedule-typed-migration-2026-07-13.md, cc-fetchespnfixturesfordate-typed-migration-2026-07-13.md,
cc-sharegame-typed-migration-2026-07-13.md (all in docs/outbox/).
