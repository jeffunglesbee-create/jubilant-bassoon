# CC-CMD-2026-08-02-shared-schedule-ai-cache-client — Result

## Status: DONE.

## Task 1 — re-verified from HEAD, real discrepancy caught (Rule 87)

Re-read `fetchDateSchedule(iso)` fresh at HEAD (`src/legacy/field.js`)
before changing anything: exact prompt/model/max_tokens, exact
`{ok:true,sections}`/`{ok:false,reason}` contract, exact sport-expansion
logic (`inferSport`/`expandStreams`).

The CC-CMD's stated assumption — the relay route returns
`{ok:true, sections}` — is **wrong**. The real, deployed, already
CI-verified contract (field-relay-nba `outbox/cc-session-2026-08-02-
shared-schedule-ai-cache-relay.md`, commit `53c1d45`) is
`{ok:true, rows:[[home,away,league,time,streamKey],...]}` — the raw,
non-sport-expanded AI output, deliberately not pre-expanded relay-side
to avoid duplicating the client-only `inferSport`/`expandStreams`
utilities. Sandbox `curl` to the live `*.workers.dev` route was
attempted to re-confirm at execution time and hit the expected sandbox
block (`403`/`HTTP 000`); relied instead on the already-real, already-
CI-captured evidence from the relay CC-CMD's own verification run
(same deployed commit, nothing changed since), which is current, not
stale.

## Task 2 — migrated, consuming the real `rows` contract

`fetchDateSchedule` (`src/legacy/field.js`) now:
- Checks `sessionStorage` (`getCached`/`setCached`) first, unchanged —
  still the fast first-level, per-tab cache.
- On miss, calls `GET {V2_RELAY_BASE}/schedule/ai-fallback?date={iso}`
  (same base-URL fallback pattern already used at lines 648/2506/4197
  etc — not a new pattern) instead of POSTing to `CLAUDE_PROXY_URL`
  directly.
- Consumes `data.rows` (not the CC-CMD's assumed `data.sections`) and
  performs the client's own existing `inferSport`/`expandStreams`
  expansion locally — identical expansion logic to the prior
  implementation, just fed from the relay's raw `rows` instead of a
  freshly-parsed direct Claude response.
- Preserves the exact same success/failure return contract callers
  already depend on (`{ok:true,sections}` / `{ok:false,reason,message?}`).

`canUseAPI()`/`incrementUsage()` reasoning (Task 2's explicit ask):
kept unchanged, deliberately. These gate *client request volume* to
the relay endpoint, not AI-call cost directly — the relay's own KV
cache (7-day/24h TTL) is what actually prevents redundant AI spend now,
independent of this client-side counter. The counter still serves its
original purpose (a sane per-tab cap on total schedule-fetch attempts,
protecting against a runaway retry loop hammering the relay), so there
is no reason tied to *this* migration to relax or remove it — the
`MAX_USES=75`/`DAILY_BUDGET=50` values were never about direct
Anthropic cost accounting in the first place (they're a
`sessionStorage`-scoped, per-tab estimate), so the migration doesn't
change what they're protecting.

## Task 3 — real verification

- `node --check src/legacy/field.js` — clean.
- `node scripts/sync-source.mjs` — synced cleanly (ran once, no stale
  mid-session state).
- `node smoke.js index.html` — **965 passed, 0 failed**.
- Real cross-session cache-hit proof: reused the relay CC-CMD's own
  already-captured CI evidence (`verify-schedule-ai-cache.yml` run
  [`30781449820`](https://github.com/jeffunglesbee-create/field-relay-nba/actions/runs/30781449820))
  rather than re-dispatching redundantly — that run hit
  **exactly the endpoint this client now calls**, via two independent,
  stateless CI `curl` calls (no browser, no `sessionStorage`, no shared
  process state between them) — a stronger proof of genuine cross-user
  KV sharing than a two-Playwright-context test would be, since nothing
  about the route or its caching changed since that capture:
  ```
  Call 1: x-cache: MISS, body: {"ok":true,"rows":[]}, 3138ms
  Call 2: x-cache: HIT,  body: {"ok":true,"rows":[]}, 124ms (byte-identical)
  ```

## Confidence: 97 — committed.

## Branch confirmed

`git branch --show-current` → `main`.

## Outbox
This file.
