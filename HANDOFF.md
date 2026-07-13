HANDOFF
Last commit (jubilant-bassoon): 4519884  Smoke: 919/0, field_unit 66/0, field_smoke Failures:0
Last commit (field-relay-nba): 5016cc9  (deploy match:false is a known non-issue -- only
  routine crons triggered on this specific commit; the real fix commit, 8fe6875, deployed
  and is confirmed live)
Clean state: yes -- all three test suites green on both repos' most recent real code changes.

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
- renderEPLMatchBriefCard g->game typo (jubilant-bassoon) -- NEW this session, found during
  the typed-result survey's TASK 4 spot-check, not yet fixed. Trivial one-line fix
  (index.html ~L32552): archiveBrief() call references undefined `g` instead of `game`,
  throws every time, silently swallowed -- archiveBrief has never once run for an EPL match
  brief. Documented in docs/TYPED-RESULT-MIGRATION-QUEUE.md's header.
- TYPED-RESULT-MIGRATION-QUEUE.md Bucket A items (jubilant-bassoon) -- 26 ranked,
  itemized real migration candidates now exist (docs/TYPED-RESULT-MIGRATION-QUEUE.md).
  Top-ranked: saveEspnFinal (confirmed bug -- exception silently reported as success to
  both real callers) and fetchNHLRelayScores (confirmed bug -- catch prevents its own
  telemetry from firing) should be the next single-concern migration CC-CMDs, not the
  highest-call-site-count entry (findESPNScore, 25+ callers) by default -- confirmed
  incidents outrank raw leverage per the survey's own stated ranking criteria.
- standards-index-wiring (jubilant-bassoon) -- pushed, not yet executed, depends on
  standards-index landing first (explicit prerequisite check included in the doc).

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

Blocked on: nothing currently blocking. All four open items above are real, scoped,
independently actionable work, not blocked on anything else.
Watch for: field-relay-nba's /deploy/verify showing match:false is routine and usually not a
real problem -- always cross-check what workflow actually ran against the expected SHA
(get_deploy_status) before treating it as a stuck deploy.

Session docs (2026-07-12 evening continuation): docs/outbox/cc-field-operation-primitive-2026-07-12.md,
docs/outbox/cc-otw-tier-categorical-2026-07-12.md, docs/outbox/cc-typed-result-survey-2026-07-12.md.
