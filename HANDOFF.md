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
- BUG 1 — relay KV placeholder IDs (Jeff: ~10-min CF dashboard task; create FIELD_JOURNALISM
  + PUSH_SUBS namespaces, update field-relay-nba wrangler.toml, push).
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
