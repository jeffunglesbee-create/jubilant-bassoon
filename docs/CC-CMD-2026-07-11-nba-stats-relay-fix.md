# Claude Code Command — Fix undefined NBA_STATS_RELAY constant surfaced by relay-init-staleness-visibility

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — TASK 2 below targets
field-relay-nba and is explicitly out of scope for this session/repo)
**Scope:** one function, one missing constant declaration.

**Branch:** main — commit directly, do not create a feature branch or PR.

## PROBE BLOCK (read this before writing any code)

The prior CC-CMD (relay-init-staleness-visibility, commit `3296970`)
added `_recordRelayInit()` instrumentation to 9 relay-overlay functions.
Live post-deploy verification (docs/outbox/cc-relay-init-staleness-visibility-2026-07-11.md,
"POST-DEPLOY LIVE VERIFICATION" section) caught a real bug on the very
first production page load:

```
window._relayInitStatus.nbaPlayerCluichInit = {
  ok: false, error: "NBA_STATS_RELAY is not defined"
}
```

That's a `ReferenceError`, not a network failure — `nbaPlayerCluichInit()`
has been silently no-op-ing in production for as long as this line has
existed, masked by its own try/catch (correct graceful-degradation
behavior; the *visibility* was the gap, and it just did its job).

Re-probed from current HEAD (do not trust these numbers without
re-verifying — grep them yourself before writing code):

```bash
grep -n "NBA_STATS_RELAY" index.html
#   8417:      `${NBA_STATS_RELAY}/leaguedashplayerclutch?${params}`,
# — the ONLY occurrence in the entire file. Never declared.

grep -n "Source: /nba-stats/leaguedashplayerclutch" index.html
#   8394: // Source: /nba-stats/leaguedashplayerclutch (whitelisted, relay-proxied, June 10 2026).
# — the function's own comment names the intended relay path.

grep -n "https://field-relay-nba.jeffunglesbee.workers.dev/nba-stats" index.html
#   30548:      const base = 'https://field-relay-nba.jeffunglesbee.workers.dev/nba-stats/leagueLeaders';
# — the only other /nba-stats/* consumer in the file, confirming the
#   relay base is https://field-relay-nba.jeffunglesbee.workers.dev/nba-stats

grep -n "^const MLB_STATS_RELAY" index.html
#   18517: const MLB_STATS_RELAY = 'https://field-relay-nba.jeffunglesbee.workers.dev/mlb-stats';
# — sibling constant, same naming/declaration convention to follow.
```

Conclusion from the probe: `NBA_STATS_RELAY` should be declared as
`'https://field-relay-nba.jeffunglesbee.workers.dev/nba-stats'`, matching
both the function's own documented source path and the literal base
already used at line 30548. This is not a guess — it's the only value
consistent with both existing references in the file.

## TASK 1 — Declare NBA_STATS_RELAY (jubilant-bassoon, in scope)

Add `const NBA_STATS_RELAY = 'https://field-relay-nba.jeffunglesbee.workers.dev/nba-stats';`
near `nbaPlayerCluichInit`'s existing declarations (alongside
`let _nbaPlayerCluichLoaded = false;`, ~line 8399), matching the
declaration style of `MLB_STATS_RELAY` and `_NBA_CLUTCH_RELAY`. Do not
touch any other line in `nbaPlayerCluichInit` or any other function —
this is a one-line addition, not a rewrite.

## TASK 2 — field-relay-nba HTTP 403s (OUT OF SCOPE for this session)

`nhlSeriesInit` and `nhlGSAXInit` both got a real `HTTP 403` from
`field-relay-nba.jeffunglesbee.workers.dev` on the same live
verification pass (`/nhl-series/scf-2026/stats` and
`/nhl-gsax/playoffs.json` respectively). This session's GitHub tools
are scoped to `jeffunglesbee-create/jubilant-bassoon` only —
field-relay-nba is a separate repo this session cannot read or write.
**Do not attempt to fix or investigate this here.** Report status only
(see DONE CONDITION). A companion CC-CMD targeting field-relay-nba,
run from a session with access to that repo, is required — probe its
router/allowlist config for why `/nhl-series/*` and `/nhl-gsax/*`
return 403 (auth check added since these routes were whitelisted?
route removed from an allowlist? rate limit misconfigured as a hard
block?).

## VERIFICATION

- `grep -n "NBA_STATS_RELAY" index.html` shows the constant declared
  exactly once, before its first use.
- Real forced-success test: extract `nbaPlayerCluichInit` verbatim
  (brace-matched, same discipline as the prior CC-CMD), run in a Node
  `vm` context with a mocked `fetch` returning a real
  `leaguedashplayerclutch`-shaped 200 response, confirm
  `_relayInitStatus.nbaPlayerCluichInit.ok === true` and no
  `ReferenceError`.
- `node smoke.js index.html` clean.
- Push, poll deploy-gate, then live-verify via a real browser fetch of
  the deployed site: `window._relayInitStatus.nbaPlayerCluichInit`
  should show `ok:true` (or a real HTTP/timeout error from the relay —
  never `"NBA_STATS_RELAY is not defined"` again) after the page's own
  boot sequence runs `nbaPlayerCluichInit` at T+4750ms.

## DONE CONDITION

`NBA_STATS_RELAY` is declared and `nbaPlayerCluichInit` either
succeeds live or fails with a real network/HTTP error — never a
`ReferenceError` — confirmed via live post-deploy browser check, not
asserted. TASK 2's field-relay-nba 403s are reported as out of scope
for this repo/session with a clear recommendation for a companion
CC-CMD, not silently dropped and not incorrectly attempted here.

**Confidence scoring:**
- TASK 1 constant declared with the correct, probe-derived value, no
  other line touched (40 pts)
- Real forced-success vm test constructed and passing (25 pts)
- Live post-deploy verification confirms the fix in production, not
  just in source (25 pts)
- TASK 2 correctly reported as out of scope, not attempted, with a
  clear recommendation (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
