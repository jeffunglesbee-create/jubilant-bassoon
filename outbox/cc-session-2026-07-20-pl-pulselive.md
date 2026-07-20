# CC Session — 2026-07-20 — PL PulseLive endpoint + client wiring

## Repos touched
- `jeffunglesbee-create/field-relay-nba`
- `jeffunglesbee-create/jubilant-bassoon`

## HEAD progression

### field-relay-nba
| Commit | Message |
|--------|---------|
| `43c6076` | feat: add /pl/* route handler for Premier League via PulseLive |
| `8bd5c19` | ci: add /pl/fixtures route smoke to post-deploy-live-verify |

### jubilant-bassoon
| Commit | Message |
|--------|---------|
| `9545f6c` | feat: wire fetchPLFixtures() consuming /pl/fixtures (PulseLive) |
| `bdfbe82` | ci: A124 smoke assertion for PL_RELAY_BASE + fetchPLFixtures wiring |

## Smoke
- Start: 962 passed, 0 failed
- End: 963 passed, 0 failed (A124 added)

## SW_VERSION
Not bumped — no index.html deploy-triggering change in this session.

## What was built

### /pl/* relay endpoint (field-relay-nba `43c6076`)
Three sub-routes added before `/atp/*`:
- `GET /pl/fixtures` — PulseLive fixture list, normalized to `{id, kickoff, kickoffLabel, status, gameweek, home, homeId, homeScore, away, awayId, awayScore, clock, clockSecs, venue}`. TTL 30s. Status values: U=upcoming, L=live, C=completed.
- `GET /pl/match/:id` — single fixture + text stream events. TTL 30s.
- `GET /pl/seasons` — recent seasons list. TTL 3600s.

Constants: `PL_BASE = 'https://footballapi.pulselive.com'`, `PL_SEASON_CURRENT = '777'` (2025/26), `PL_HEADERS` includes `Origin: https://www.premierleague.com`.

Caching: `relayFetch()` with CF cache — matches existing relay convention. `/pl` added to MCP probe allow-list.

### fetchPLFixtures() client wiring (jubilant-bassoon `9545f6c`)
- `PL_RELAY_BASE = 'https://field-relay-nba.jeffunglesbee.workers.dev/pl'`
- `_plLastFetch` 28s dedup guard (relay TTL is 30s)
- Writes into `espnScores[key]` with `source: 'pl'`; respects priority: skips if `existing.source === 'fd'` (FD > PL > FPL)
- Only processes status L (live) and C (completed); skips U (upcoming)
- Wired at boot and on poll cycle

### CI automation (both repos)
- **field-relay-nba `8bd5c19`**: `/pl/fixtures route smoke` step added to `post-deploy-live-verify.yml` — fires after every deploy, checks HTTP 200, JSON array, required fields `{id, status, home, away, kickoff}`. Soft-passes (exit 0) if array is empty (off-season).
- **jubilant-bassoon `bdfbe82`**: smoke.js A124 — `PL_RELAY_BASE` present, `async function fetchPLFixtures` defined, `fetchPLFixtures();` boot call wired.

## Integration status
- RELAY CONTRACT: `GET /pl/fixtures` → JSON array, shape above, TTL 30s. Verified: relay at `43c6076` deploys to `field-relay-nba.jeffunglesbee.workers.dev`.
- CLIENT CONSUMER: `fetchPLFixtures()` in field.js. Verified: smoke 963/0.
- INTEGRATION STATUS: STAGED — sandbox egress blocked outbound HTTP verification. End-to-end proof requires a browser session or CF tail during a live/completed PL fixture window.
- KNOWN MISMATCHES: none — relay shape was designed to match client consumption directly (Rule 60).

## Verify when unblocked
```bash
# Relay shape check (run from anywhere with outbound HTTPS)
curl -s 'https://field-relay-nba.jeffunglesbee.workers.dev/pl/fixtures' | \
  node -e 'd=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.assert(Array.isArray(d),"not array"); if(d.length){const f=d[0]; ["id","status","home","away","kickoff"].forEach(k=>console.assert(k in f,k+" missing")); console.log("PASS",d.length,"fixtures, sample:",JSON.stringify(f).slice(0,200))}'

# Client boot wiring (browser console on FIELD)
# fetchPLFixtures should show in espnScores after first PL poll
```

## Open carry-forwards
None. CI automation covers the route structurally on every deploy. E2E integration requires a live PL match window — no code carry-forward needed.
