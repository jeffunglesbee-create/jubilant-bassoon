# FIELD Handoff — May 29 2026 (Session End — TYPE C: Data-Sourcing Legitimacy Matrix verification)

## SESSION TYPE
TYPE C — Research spike (web-enabled). No code changes. Completed the Data-Sourcing
Legitimacy Matrix [VERIFY] cells from live ToS/API terms.

## Code HEAD
`b1d709d` — Dropbox refresh-token flow · Smoke 243/0 (unchanged — no code touched this session)
(Note: previous handoff body referenced `9305375`/`2e170d8`; real HEAD has been `b1d709d`
since the Dropbox fix. Reconciled here.)

## SESSION DETERMINATION
Prior session (TYPE B — journalism bug fix) confirmed CLOSED: smoke 243/0, tree clean,
all journalism + Dropbox commits pushed, root-cause chain documented in
docs/journalism-root-cause-2026-05-29.md. This session opened clean as TYPE C per the
prior (Drive-only) chat's deferred instruction.

## COMPLETED THIS SESSION
- All 15 [VERIFY] cells in the Data-Sourcing Legitimacy Matrix resolved against LIVE terms
  (checked 2026-05-29). Failure modes for FRAGILE rows + one-line recommendation per sport
  + transformation-moat framing produced (matrix worklist items 1-5).
- Output persisted to: **docs/data-sourcing-legitimacy-2026-05-29.md** (in-repo, because
  Drive writes are unavailable from the sandbox — reads work, create_file errors).

### Posture summary (full detail in the docs file)
- GREEN: nflverse (CC-BY, attribution), Squiggle (w/ etiquette), The Odds API, Football-Data.org,
  Open-Meteo, Wikimedia Pageviews.
- YELLOW (derived-only/low-rate, commercial unverified): MLB StatsAPI, Baseball Savant,
  NHL api-web, FPL, BallDontLie, Big Data Bowl.
- RED (ToS prohibits productionized use, or commercial needs licence/contract): ESPN (FIELD's
  PRIMARY — highest exposure), PGA Tour GraphQL, Pro Football Reference, ATP, Betfair, Reddit.

## ACTION REQUIRED (Jeff — Drive write needed)
- Merge the resolved [VERIFY] cells into the MASTER Drive scaffold
  `1LUuR0CLWUvIc94Vou46VmeTLz1n-Y6YAz0F0MX6GR-M` from a machine with Drive edit access
  (source of truth = docs/data-sourcing-legitimacy-2026-05-29.md).

## NET PRIORITY ACTIONS (from the verification)
1. NFL: migrate historical/advanced fully onto nflverse (GREEN); retire PFR + direct NGS scrape.
2. Odds: standardize on The Odds API; Betfair licence-only.
3. Tennis + Golf: secure a licensed feed before commercial launch (both RED in production).
4. Social signal: swap Reddit -> Wikimedia Pageviews.
5. ESPN/MLB/NHL/FPL: keep derived-only, low-rate, cached; line up licensed fallbacks.

## STILL OPEN (carried from prior handoff)
- BUG 1 — RESOLVED (May 29 2026, verified via cf-api-probe of the deployed relay settings).
  No CF dashboard task needed: the field-relay-nba deploy.yml bootstrap step auto-creates the KV
  namespaces. Both are live and bound: PUSH_SUBS (id 46b6d8db59ea49eca8b1d89c576a6158),
  FIELD_JOURNALISM (id 83edf19398da4ed184a42746cb85c9d7). The cron's `if(!env.PUSH_SUBS) return`
  guard does NOT trip. Real remaining push gate is NOT the KV — it is VAPID secrets (NOT set on
  the relay) + the client subscribe flow (unbuilt). See ADDENDUM (TYPE B: relay push cron).
- Verify journalism recovery once Gemini quota resets: POST /journalism/run -> {ok:true,
  reason:"written"}; then GET /journalism/tonight -> real brief.
- Dropbox refresh-token: add the 3 secrets, then re-dispatch the workflow.

## TIER 0 DEADLINES
- NHL SCF shell (CAR closing ECF); NBA Finals G1 shell (June 3, vs NYK);
  World Cup 2026 Phase 1 (June 11 HARD); USPTO provisional (~June 25).

## CANONICAL IDs
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Repo: jeffunglesbee-create/jubilant-bassoon
Relay repo: jeffunglesbee-create/field-relay-nba
Journalism Quality Spec: 1oSj9Wl9lZl_RGGElZdn_dhI4s3vzvnkv5HazELKSw-0
Data-Sourcing Legitimacy Matrix (MASTER scaffold): 1LUuR0CLWUvIc94Vou46VmeTLz1n-Y6YAz0F0MX6GR-M
Verification output (in-repo): docs/data-sourcing-legitimacy-2026-05-29.md

---
## ADDENDUM — May 29 2026 (TYPE B: PGA Tour GraphQL DECOMMISSION — ToS compliance)
Removed direct PGA Tour GraphQL access after verification found pgatour.com ToU prohibits
automated copying/downloading and the data is licensed/proprietary (matrix RED row; the ToU
was never consulted when the relay was originally wired — accessibility/community-precedent
was used instead).

Removed:
- jubilant-bassoon index.html: PGATOUR_RELAY const + fetchPGATourStat()/fetchPGATourPlayerDir()
  (no call sites existed — consumers were never built). Added one-time localStorage purge of
  `field_pgt_*` cached data on load. smoke.js A240 flipped to an absence/regression guard
  (A241 retired). Smoke 242/0.
- field-relay-nba src/index.js: /pgatour route handler, PGATOUR_GRAPHQL_URL, PGATOUR_API_KEY
  (da2-gsrx5… — PGA's embedded key), PGATOUR_HEADERS, PGATOUR_ALLOWED_OPS, pgatourCacheTtl,
  method-guard exception, health-string entry. Redeploy drops the route + edge cache.
- outbox/: 28 cf-probe result files containing harvested PGA GraphQL data dumps.

NOT removed (flagged for Jeff's decision — distinct posture):
- Slash Golf (RapidAPI, index.html ~line 10170) — a PAID third-party reseller; RapidAPI ToS
  puts underlying-rights responsibility on the provider. Different risk profile; decide separately.
- Golf Doc 1 (Drive 1Ak_GPXkiKUvUr6dUpcto0BUbhKTibIwgR-o8SYUeBfM) still contains extracted PGA
  data + the embedded key — scrub the key + mark DECOMMISSIONED (Drive writes unavailable from
  sandbox this session). Matrix PGA row already RED.
- `pgatour.com/live` watch-link entry (editorial streaming descriptor) — kept; not harvested data.

---
## ADDENDUM — May 29 2026 (TYPE B: relay push cron -> ADR-002 Rule D conformance)
Deployed field-relay-nba `c8d2db7` ("Deploy RELAY Worker" run 26656411272 — success; post-deploy
structural probes green). Refactored handleCron, the `*/5` push-heartbeat cron.

WHAT CHANGED (relay src/index.js, handleCron):
- Removed the server-side composite drama score (dramaBase + periodBonus + closenessBonus) and
  BOTH thresholds (drama < 85; per-user drama_min). That composite-value-thresholded-to-notify
  chain is the exact artifact the Numerical Usage Policy v2 names as "the patent."
- Component 3 now fires on a STANDALONE BOOLEAN over raw game state: latePhase (period >=
  minPeriod) AND closeGame (margin <= maxMargin) — two dimensional gates ANDed, never summed
  (ADR-002 Rule D; the policy's permitted per-dimension boolean form).
- Payload is now type:'SCORE_CHANGE' with FACTS only (scores, period, clock, broadcast); no drama
  field. This matches the contract sw.js was already built against — the client's
  computePushDrama() + Drama Dial evaluates excitement on-device ("server pushes facts, client
  evaluates excitement"). Dedup re-keyed on score state so a genuine score change re-notifies.

WHY NOW: the OLD cron was LIVE and firing every 5 min (wrangler.toml [triggers] crons = */5, */15),
computing server-side interest values on a schedule — precisely the artifact ADR-002 exists to
prevent. The refactor removes that live violation. Delivery was and remains OFF (no VAPID secrets,
no client subscribe flow), so there is ZERO user-facing change — this only removed the server-side
computation.

POSTURE / RULE 45: this conforms code to the documented architecture (ADR-002 Rules A/B/D +
Numerical Usage Policy v2 + the SW's SCORE_CHANGE contract). It is NOT a claim that the design
"defeats" RUWT. ADR-002 stays PROPOSED pending counsel + Jeff approval.

STILL UNBUILT (separate workstream — the push FEATURE end to end):
- Generate a VAPID keypair (once); set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY as field-relay-nba
  Worker secrets (dashboard / `wrangler secret put` — the CF API cannot set secrets from a probe).
- Add the client subscribe flow (pushManager.subscribe with the VAPID public key) to index.html;
  none exists today. sw.js already has the SCORE_CHANGE push handler.
- Legacy DRAMA_THRESHOLD handler in sw.js (~lines 164-183) is now dormant (server no longer sends
  that type); safe to delete in a later client pass.

NOTE ON THIS FILE: the top-of-file TYPE C header predates several later May 29 sessions (PGA
TYPE B addendum, the TYPE D ESPN/data-sourcing audits, STANDARDS Rules 45-46, and now this relay
change). Code HEAD line refers to jubilant-bassoon and is stale; this addendum's HEAD (c8d2db7)
is the field-relay-nba repo. jubilant-bassoon was not touched by this change (index.html smoke
unaffected).
