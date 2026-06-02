# FIELD Handoff — June 2 2026 PM-14 close (P1 OAuth surface LIVE + verified + Rule 48 Class E)

**jubilant-bassoon HEAD:** bcaa803 last meaningful (STANDARDS Rule 48 Class E amendment) · 955ece8 probe-trailing · Smoke: 367/0 · SW_VERSION source `2026-06-02a`
**field-relay-nba HEAD:** 880e3ae last meaningful (debug-log-probe.yml) · dd525e7 probe-trailing · OAuth feature commit: 8e7257d (still the canonical OAuth deployment)

**This session closed:** TYPE B build. P1 OAuth surface built, deployed, verified end-to-end via CI probe (10/10 steps), and verified in fresh claude.ai chat (other-Claude session, all three PM-13 verification criteria pass). STANDARDS Rule 48 amended with Class E. Cloudflare Developer Platform connector added to Jeff's claude.ai connectors at session close.

**Session Doc (this session — Drive):** _written at SESSION END; ID populated below_
**Previous session doc (PM-13 — Drive):** 1vEVY8JSUQTM4GQtTfYPklQjl99tTgo67cYzLyBYoQYM
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`

## TIER 0 DEADLINES

- **Stanley Cup G1: TONIGHT (June 2 8pm ET, ABC)** — first live SCF test of Voice Positioning v3
- **NBA Finals G1: TOMORROW (June 3 8:30pm ET, ABC)** — first Finals test of v3
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (June 2 PM-14)

P1 OAuth was the scope. Session opened with "lock the session as P1 OAuth" + "IT IS POSSIBLE" emphasis on sandbox-access patterns. Key steps:

1. **Sandbox-access verification** — Live-tested bash egress to `*.workers.dev` and `api.cloudflare.com`. Both return `HTTP 403 x-deny-reason: host_not_allowed`. The June 1 PM-7 chat that claimed "workers.dev reachable (403)" misread the proxy-deny as a worker response. Confirmed: sandbox cannot directly reach workers.dev or api.cloudflare.com; documented escape patterns (cf-api-probe.yml, cors-probe.yml, post-probe.yml in jubilant-bassoon) are the only path. All probe workflows already live and tested.

2. **OAuth 2.1 + PKCE + DCR surface built** on field-relay-nba commit `8e7257d`:
   - `src/mcp-oauth.js` (~420 lines) — full OAuth server module
   - `/.well-known/oauth-authorization-server` (RFC 8414)
   - `/.well-known/oauth-protected-resource` (RFC 9728)
   - `/oauth/register` (RFC 7591 Dynamic Client Registration)
   - `/oauth/authorize` GET (password page) + POST (verify password, mint code → 302)
   - `/oauth/token` (authorization_code + refresh_token grants, PKCE S256-verified)
   - `/oauth/revoke` (RFC 7009)
   - `validateBearer()` — used by /mcp auth gate
   - `debugRecentRequests()` — FIELD_MCP_SECRET-gated diagnostic, reads `log:` KV keys
   - `logRequest()` — ctx.waitUntil hook writes every /.well-known, /oauth, /mcp, /debug request to KV with 1h TTL
   - New KV namespace: `field-mcp-oauth` (binding `MCP_OAUTH`), bootstrapped via deploy.yml step
   - User auth backend: shared password = `env.FIELD_MCP_SECRET` (no new GH secrets needed)
   - Token format: opaque tokens in KV (revocable, no JWKS)
   - GET /mcp returns 401 + WWW-Authenticate per RFC 6750 + MCP spec
   - POST /mcp auth gate extended to accept OAuth bearer OR legacy FIELD_MCP_SECRET

3. **E2E OAuth probe workflow** added (`.github/workflows/mcp-oauth-probe.yml`, 10 steps): discovery → DCR → PKCE → authorize → token → /mcp tools/list → refresh grant → legacy path. **ALL 10 STEPS PASSED** after two iterations (CF BIC fired on Python-urllib UA → fixed with realistic Chrome UA; http.client import shadowed local `http()` helper → renamed to `req()`). Probe result: `outbox/mcp-oauth-probe-20260602T155306Z.txt`.

4. **Debug log probe** added (`.github/workflows/debug-log-probe.yml`). Reads `/debug/recent-requests` (FIELD_MCP_SECRET bearer). 14 entries captured from this session's probes; no claude.ai traffic visible (the existing PM-13 `?token=` connector kept using legacy bearer path).

5. **P1 VERIFIED in fresh chat** — other-Claude's session opened with scope "claude.ai MCP connector P1 verification + open backlog." All three PM-13 verification criteria pass: `tool_search "handoff"` surfaces tools, `get_head_sha` returns real SHA (493dc63), `read_handoff` returns content + sha (2fbb934). T1 channel LIVE via=mcp end-to-end. OAuth metadata being present was the actual unblock — claude.ai uses legacy `?token=` for /mcp auth but needed `/.well-known/oauth-authorization-server` to satisfy discovery.

6. **STANDARDS.md Rule 48 amendment** committed as `bcaa803` (jubilant-bassoon). Added CLASS E (Capability availability / impossibility claims), enforcement clause, June 2 PM-14 case study, and explicit clarification that the trigger fires at decision-points — NOT pre-emptively at session start. Stable infra facts already covered by userMemories + SESSION START Drive reads.

7. **Cloudflare Developer Platform connector** added to claude.ai by Jeff at session close. Not yet exercised; next session should test it against a known-good query (e.g. read `log:` keys from MCP_OAUTH KV) to confirm tool surface activates correctly and check for tool-selection ambiguity between Cloudflare connector and FIELD Handoff custom MCP.

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `bcaa803` last meaningful (STANDARDS Rule 48 Class E), `955ece8` probe-trailing
- jubilant-bassoon smoke: **367/0**
- field-relay-nba HEAD: `dd525e7` probe-trailing, `880e3ae` last meaningful, OAuth deployment from `8e7257d` (still canonical)
- field-relay-nba /mcp: LIVE with TWO auth paths now (OAuth Bearer from /oauth/token OR legacy FIELD_MCP_SECRET via header/X-FIELD-MCP-Secret/`?token=`)
- field-relay-nba KV bindings: PUSH_SUBS, FIELD_JOURNALISM, **MCP_OAUTH (new)**
- claude.ai connector "FIELD Handoff": LIVE with legacy `?token=` URL, tools surface in fresh chats
- Cloudflare Developer Platform connector: ADDED at session close, not yet exercised
- STANDARDS.md Rule 48: amended with CLASS E (capability/impossibility)
- T1 channel: LIVE via=mcp (continues this session, ran end-to-end in other-Claude's verification chat)
- T3 memory anchor: will be updated to `bcaa803` on SESSION END

## NEXT SESSION P1 IMMEDIATE

**Test the Cloudflare Developer Platform connector** in a fresh chat. Clean test queries:

1. "List entries in the MCP_OAUTH KV namespace with prefix 'log:'" — known data from this session (14 entries minimum).
2. "Show the most recent /mcp request from MCP_OAUTH log: keys" — exercises both list + get patterns.
3. "Run a SQL query against the field_jq_analytics Analytics Engine dataset" — if it has data yet.
4. Check for tool-selection ambiguity: ask something Cloudflare connector AND FIELD Handoff could both answer (e.g. "what's the current FIELD HEAD SHA") — see which tool the model reaches for.

If the Cloudflare connector works as advertised, `cf-api-probe.yml` becomes the fallback rather than the primary path for Cloudflare ops.

## OTHER NEXT-SESSION PRIORITIES

P0 — Tonight Stanley Cup G1 (8pm ET ABC), tomorrow NBA Finals G1 (8:30pm ET ABC). First live tests of Voice Positioning v3 on highest-stakes content.

P1 — `get_smoke_count` MCP tool reports 268; deploy-gate `node smoke.js` reports 367 (canonical). The tool is regex-counting instead of executing smoke.js. Bug to fix — flagged by other-Claude in P1 verification chat.

P1 — R2 Finals Narrative Context (before NBA Finals G1 June 3) — open from prior backlog.

P1 — Queues/WOW 8 (hard deadline June 11 World Cup) — open from prior backlog.

P1 — R2 World Cup Team Context (before June 11) — open from prior backlog.

P2 — USPTO provisional toward ~June 25. OAuth surface (DCR + PKCE + opaque token rotation + per-client revocable tokens, single-user shared-password backend, defense-in-depth with legacy bearer for CI continuity) is a defensible architectural piece for patent narrative.

P2 — `tool_search "handoff"` ranking: `write_handoff` is in registry but didn't surface in top 5 for that query. Tool name + description tuning candidate.

P2 — Probe-outbox cleanup in jubilant-bassoon. Not urgent.

P3 — `field_smoke.js` carries 4 pre-existing failures (A30, A53, A67, A69). Deploy gate smoke.js remains 367/0.

P3 — Memory edit #1 stale path reference cleanup (`/tmp/jubilant-bassoon` mentioned, but actual clone is `/home/claude/jubilant-bassoon`).

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY (CURRENT STATE)

**Tier 1 (LIVE, verified end-to-end PM-14):** MCP server on field-relay-nba at /mcp. Four auth paths on the worker:
  - `Authorization: Bearer <OAuth_access_token>` — minted via /oauth/token (NEW PM-14)
  - `Authorization: Bearer <FIELD_MCP_SECRET>` header — legacy
  - `X-FIELD-MCP-Secret: <FIELD_MCP_SECRET>` header — legacy
  - `?token=<FIELD_MCP_SECRET>` URL query — legacy (still used by claude.ai connector)
8 tools available: get_ci_status, get_smoke_count, get_deploy_status, get_live_scores, get_espn_game, read_handoff, write_handoff, get_head_sha.

**Tier 2 (NOT NEEDED):** Drive HTTP write proxy idea remains unnecessary while T1 is operational.

**Tier 3 (LIVE):** userMemories anchor edit. Format: `HEAD <hash> · <ISO> · via <mcp|bash|relay|chat>`. REPLACE on every session end.

