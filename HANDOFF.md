HANDOFF
Last commit (jubilant-bassoon): bebba522  Smoke: 919/0, field_unit 66/0, field_smoke Failures:0
Last commit (field-relay-nba): 5016cc9  (deploy match:false is a known non-issue -- only
  routine crons triggered on this specific commit; the real fix commit, 8fe6875, deployed
  and is confirmed live)
Clean state: yes -- all three test suites green on both repos' most recent real code changes.

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
- otw-tier-categorical (jubilant-bassoon) -- pushed, not yet executed. Replaces
  _otwGetLiveTier's raw composite-drama-score threshold comparison (smoothed>=60/40) with
  named categorical conditions, matching the pattern already proven for the Watch Engine WC
  selector (Rules 92/93). This is higher-leverage than the journalism-prose fixes -- it
  drives the actual tier label on FIELD's flagship One To Watch feature, and is the exact
  RUWT composite-scalar-plus-threshold pattern the patent risk register exists to eliminate.
  Also flags that STANDARDS.md Rule 95's entry for _otwFindLiveGame is now stale (describes
  a refactor as "deferred" that has actually already shipped) -- needs its own small
  correction CC-CMD.
- cliche-freshness-scoring (jubilant-bassoon) -- pushed, not yet executed. Replaces
  hasCliche()'s hardcoded BANNED_PHRASES list with span-level Datamuse freshness scoring,
  same architecture problem as the lead-detector fix. Genuinely harder than that fix: the
  retry mechanism needs a specific offending phrase to name, not just a pass/fail score, so
  this needs sliding-window detection, not a direct port. Requires empirical validation that
  freshness and cliche-ness actually correlate before building on that assumption. The
  Datamuse-proxy fix shipping first removes a category of complexity this CC-CMD no longer
  needs to design around (a permanent iframe block), though real-network-failure handling is
  still required.
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

Blocked on: nothing currently blocking. All three open CC-CMDs above are real, scoped,
independently actionable work, not blocked on anything else.
Watch for: field-relay-nba's /deploy/verify showing match:false is routine and usually not a
real problem -- always cross-check what workflow actually ran against the expected SHA
(get_deploy_status) before treating it as a stuck deploy.
