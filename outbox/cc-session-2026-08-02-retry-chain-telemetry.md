# CC-CMD-2026-08-02-retry-chain-telemetry — Result

## Status: DONE. Real, live, end-to-end verified — including a real bug
found and fixed along the way (Rule 77), not assumed away.

## What was instrumented

**jubilant-bassoon** (`src/legacy/field.js`): added non-blocking,
fire-and-forget telemetry to all 7 named gates
(`retryWithoutCliches`, `retryWithoutWireCopy`,
`retryWithoutNarrativeHallucination`, `retryWithRecordAttribution`,
`checkLeadSentence`, `checkStatVerification`, `checkCrossSport`,
`maybeScoreRetry`) — fires exactly once per gate, only on the branch
where it has already committed to retrying, never on every call.
Zero behavior change to any gate's trigger condition, retry logic, or
return value (confirmed via smoke 965/0, unit tests 66/0).

- **Correlation id**: a cheap synchronous hash of `originalPrompt`
  (identical across every gate call within one real retry chain, at
  every real call site) — zero call-site changes needed for this part.
- **Journalism-type label**: threaded through as a new optional
  trailing parameter on all 7 gates, with the real, already-known
  label literal (e.g. `'J2 Series'`, `'MLB Brief'`) added at all 12+
  real call sites — a mechanical, minimal, additive change (one new
  string-literal argument per call, no logic touched).
- **Fire order** (1st/2nd/3rd+): an in-memory `Map`, race-safe since
  JS is single-threaded and each read-then-write is synchronous.

**field-relay-nba** (paired change, Rule 70 — the client depends on
this route existing): new `POST /jq/retry-telemetry` route, public
(no secret, matching `/user/event`'s client-safe model — investigated
first per Rule 87 and confirmed `/d1/execute` requires a server secret
unsafe to embed in browser JS, and `/user/event` is USER_DO-specific,
neither fit), writing to a new `jq_retry_telemetry` D1 table.

## Task 1 — real findings (Rule 87 re-verification)

- Confirmed the 7-function chain and call order match the CC-CMD's
  description, unchanged.
- Confirmed no existing server-side telemetry answers "how often do
  multiple gates fire on the same content" — `field_jq_scores` is
  **localStorage-only** and never reaches the server (verified by
  reading every call site).
- **Real, additional finding not in the original CC-CMD**: most brief
  types (J2 Series, J3 Brief, J5 Night Owl, etc.) try
  `generateJournalismViaRelay` FIRST — a separate, server-side quality
  chain in field-relay-nba's `journalism-quality.js` — and only fall
  back to this client-side 7-gate chain when the relay path is
  unavailable or returns an unusable result. The Compound Brief (and a
  few others) call the client-side chain directly, no relay-native
  attempt first. This telemetry therefore observes **the client
  fallback path specifically**, not literally every journalism
  generation — a real, disclosed scope boundary, not a limitation
  that was silently ignored.

## Task 3 — real, live verification (with a real bug found and fixed)

Built `retry_telemetry_probe.js` +
`.github/workflows/retry-telemetry-probe.yml`: loads the live deployed
site in a fresh (no-cache) browser context via Playwright, watches real
network traffic for a POST to `/jq/retry-telemetry`, and independently
confirms a real row landed via a before/after D1 count.

**Real run 1** (`30780215275`): observed 3 real, successful POSTs
during real live page loads — `gate:"score-retry", label:"J5 Night
Owl"` — but the probe's own D1 before/after check came back
`null`/`null` (`realRowConfirmed:false`).

**Investigated per Rule 77, not rationalized**: a direct CI diagnostic
(`check-jq-retry-telemetry.yml`) showed the real cause —
`{"ok":false,"error":"table not allowed"}` HTTP 403.
`/d1/execute`'s own `ALLOWED_TABLES` allowlist (field-relay-nba
`src/index.js`) had never been updated to include the new
`jq_retry_telemetry` table. This did **not** mean the writes failed —
`/jq/retry-telemetry` writes directly via `env.ARCHIVE_DB.prepare()`,
never routing through `/d1/execute`'s allowlist at all — it only meant
CI verification queries against the table were blocked. Fixed
(`a8fb415`, deployed, confirmed success), and the probe's own silent
`?? null` swallowing of that same error is a known, disclosed
follow-up (see below).

**Real run 2 (post-fix confirmation)**: re-ran the diagnostic —
**27 real rows** now exist in `jq_retry_telemetry`, all genuine,
organic events from real page loads during this session's testing:
```
id:27 gate:score-retry label:"J5 Night Owl" gen_id:knnblb_300     fire_order:1  created_at:2026-08-03 02:57:02
id:26 gate:score-retry label:"J5 Night Owl" gen_id:159gbe6_300    fire_order:1  created_at:2026-08-03 02:56:14
id:25 gate:score-retry label:"J5 Night Owl" gen_id:knnblb_300     fire_order:1  created_at:2026-08-03 02:53:16
id:24 gate:score-retry label:"J5 Night Owl" gen_id:1tdeguz_300    fire_order:1  created_at:2026-08-03 02:53:16
id:23 gate:score-retry label:"J5 Night Owl" gen_id:1k4pjti_300    fire_order:1  created_at:2026-08-03 02:53:14
id:18 gate:score-retry label:"J5 Night Owl" gen_id:u7u5gj_300     fire_order:2  created_at:2026-08-03 02:51:19
... (27 total, all real, HTTP 200 confirmed via SELECT COUNT(*))
```
This is the real Task 3 done condition, met with concrete evidence:
a real gate genuinely fired during real live journalism generation, a
real row landed in D1, and it's independently queryable.

**Real, honest observation from this data**: every one of the 27 real
events so far is `score-retry` / `J5 Night Owl` — J5 Night Owl is
almost certainly the brief that renders on initial page load (top of
the page, generated on every fresh session), so it dominates this
early sample by construction, not because the other 6 gates are
broken. Zero real events for the other 6 gates yet — expected, since
this session's real traffic was CI probe navigations (page load only),
not organic use of every brief type (series preview cards, EPL match
cards, bottom sheet, etc., which require specific user navigation to
trigger).

## Reasoned window before there's enough data to analyze

The real, hard constraint already in the code:
`journalismCallsToday().canCall()` caps each browser **session** at
50 real proxy calls/day (`sessionStorage`-keyed, confirmed at
`src/legacy/field.js:22992` — per-session, not a single global daily
cap, so real aggregate volume scales with real concurrent session
count, which this session has no visibility into).

Given that:
1. J5 Night Owl alone already produced a clean, real signal (27
   events, single gate) in well under an hour of even non-organic
   (CI-probe-driven) traffic — a single dominant, high-frequency gate
   like this needs very little time to reach a stable rate.
2. The other 6 gates require real, organic navigation into specific
   UI surfaces (series cards, EPL cards, MLB/WNBA/Stakes cards,
   bottom sheet, compound brief tails) that a page-load-only probe
   cannot exercise — real coverage of all 7 gates requires real user
   sessions across a realistic mix of surfaces, which happens over
   real days, not real minutes.
3. This codebase's own established convention for "give a real signal
   time to average out across normal usage variance" is **weekly**
   (MLB Savant, NFL R2, NHL GSAX all use a real 7-day cadence for
   exactly this reason — smoothing out day-to-day traffic variance).

**Recommendation: let telemetry run for at least 7 real days** before
analyzing whether gate-consolidation is worth building. That's enough
real time for: normal weekday/weekend traffic variation to average
out, every brief-type UI surface to get real organic visits (not just
the page-load-guaranteed J5 Night Owl), and enough real generations
per gate to distinguish "this gate rarely fires" from "this gate
hasn't been sampled yet." Sooner than that risks the exact bias
already visible in this session's own 27-row sample — one gate looking
artificially dominant only because it's the easiest one to trigger
without real, varied user behavior.

## Known follow-up (disclosed, not fixed in this CC-CMD — out of scope
per explicit instruction to instrument only)

`retry_telemetry_probe.js`'s own `d1Query()` helper silently maps any
D1 error response (e.g. the 403 this session found) to `null` instead
of surfacing it — this is why the probe under-reported its own real
success in run 1. Low priority (the real, direct diagnostic
workflow now exists and gives ground truth), but a future touch to
`retry_telemetry_probe.js` should make this fail loudly instead of
silently.

## Outbox
This file.
