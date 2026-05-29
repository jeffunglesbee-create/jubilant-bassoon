FIELD Session Record — 2026-05-29 (TYPE B: relay push cron, ADR-002 Rule D)

Type: TYPE B (code change, deployed)
Repos at close: jubilant-bassoon 27054d4 ; field-relay-nba c8d2db7
(In-repo because Drive writes are unavailable from the sandbox — reads work, create_file errors.
 ACTION: merge this to the Drive session log from a machine with Drive edit access.)

SUMMARY
Refactored the field-relay-nba push-heartbeat cron (handleCron, the */5 trigger) to conform to
ADR-002 Rule D. Removed the server-side composite drama score (dramaBase + periodBonus +
closenessBonus) and both thresholds (drama < 85 and per-user drama_min). Component 3 now fires on
a standalone boolean over raw game state (latePhase AND closeGame) and sends type:SCORE_CHANGE
facts only (scores, period, clock, broadcast); no drama field. The client (sw.js computePushDrama
+ Drama Dial) evaluates excitement on-device. Dedup re-keyed on score state.

WHY: the old cron was live and firing every 5 min (wrangler.toml [triggers] crons */5, */15),
computing server-side interest values on a schedule — the precise artifact ADR-002 exists to
prevent. The refactor removes that live violation. Delivery was and remains off (no VAPID secrets,
no client subscribe flow), so there was zero user-facing change.

DEPLOY: pushed to field-relay-nba main; deploy.yml run 26656411272 (Deploy RELAY Worker) completed
success, post-deploy structural probes green. Confirmed via Actions run, not a live URL
(workers.dev blocked from sandbox).

VERIFIED STATE (cf-api-probe of relay settings): KV PUSH_SUBS (46b6d8db59ea49eca8b1d89c576a6158)
and FIELD_JOURNALISM (83edf19398da4ed184a42746cb85c9d7) live and bound. Relay secrets present:
APISPORTS_KEY, BDL_API_KEY, DROPBOX_TOKEN, NFL_API_KEY, ODDS_API_KEY, REALTIMESPORTS_KEY,
SPORTRADAR_UFL_KEY. VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY NOT set.

CORRECTION: HANDOFF BUG 1 ("create KV namespaces, ~10-min CF dashboard task") was stale —
deploy.yml bootstraps the namespaces automatically; they are live. The real push gate is VAPID
secrets + the unbuilt client subscribe flow, not the KV.

RULE 45 POSTURE: conforms code to the documented architecture (ADR-002 Rules A/B/D + Numerical
Usage Policy v2 + the SW SCORE_CHANGE contract). Not a claim that the design defeats RUWT.
ADR-002 stays PROPOSED pending counsel and Jeff approval.

STILL UNBUILT (separate workstream — push feature end to end): generate a VAPID keypair once;
set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY as relay Worker secrets (dashboard or wrangler secret
put — CF API cannot set secrets from a probe); add the client subscribe flow (pushManager.subscribe
with the VAPID public key) to index.html (none exists today). Legacy DRAMA_THRESHOLD handler in
sw.js is now dormant; safe to delete later.

SMOKE: jubilant-bassoon smoke.js 242 passed / 0 failed (index.html untouched this session).

CARRIED OPEN (from prior handoff, unchanged): journalism recovery verification after Gemini quota
reset; Dropbox refresh-token 3 secrets + re-dispatch. TIER 0: NHL SCF / NBA Finals G1 (June 3 vs
NYK) shells; World Cup Phase 1 (June 11 hard); USPTO provisional (~June 25).
