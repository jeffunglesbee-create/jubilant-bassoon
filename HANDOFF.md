# FIELD Handoff — June 2 2026 PM-13 TYPE B (Tier 1 MCP LIVE)

**jubilant-bassoon HEAD:** 94e8ab3 (PM-12 HANDOFF commit — no further code changes this session) · Smoke: 367/0 · SW_VERSION source `2026-06-02a`
**field-relay-nba HEAD:** 0a806c5 (MCP tools added — read_handoff, write_handoff, get_head_sha + hardened auth gate)

**This session closed:** TYPE B build session. Tier 1 MCP-on-relay is now LIVE and verified end-to-end. Architectural pivot mid-session: workers.dev incompatibility with Cloudflare Access self-hosted enforcement confirmed empirically, fell back to bearer-token auth (Plan B2 from PM-11 risk matrix). MCP endpoint, three new tools, and authentication all working through the `cf-api-probe.yml` + `post-probe.yml` test harness from sandbox.

**Session Doc (this session — Drive):** see TIER 1 MCP BUILD section below
**Tier 1 MCP-on-Relay Build Plan (Drive — historical reference):** `1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg`
**Session Doc (PM-12 prior — Drive):** 1CdHRgmzb8j12IudVU0470ZdZY6X4Z8LVT5YOppLv7KQ
**Session Doc (PM-11 prior — Drive):** see Tier 1 Build Plan link
**Data Skrive Patent Analysis v3:** 1yCXY5AF5J1jvo_b5wCV7nzp_FwQ1SIWGJqusZ4AaVqU
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`

## TIER 0 DEADLINES (unchanged from PM-12)

- **Stanley Cup G1: TONIGHT (June 2 8pm ET, ABC)** — first live SCF test of Voice Positioning v3
- **NBA Finals G1: TOMORROW (June 3 8:30pm ET, ABC)** — first Finals test of v3
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (June 2 PM-13 TYPE B)

### Cloudflare Access experiment + pivot

PM-11's build plan recommended Cloudflare self-hosted Access for MCP authentication. Implementation walkthrough with Jeff in CF dashboard completed: Zero Trust enabled (team `shrill-thunder-28e6`), self-hosted Access app created at `field-relay-nba.jeffunglesbee.workers.dev` with Allow Jeff policy, AUD tag captured. Live enforcement test failed — workers.dev URLs are not enforceable via self-hosted Access in this account configuration. Confirmed empirically: /health returns 200 (worker responds directly), /mcp also returned worker output, indicating Access was not intercepting at the edge.

Architectural pivot to Plan B2: bearer-token auth inside the worker code, no Cloudflare Access dependency. CF Access app deleted by Jeff via dashboard. Auth scope on CF API token does not currently include Access management; left for future automation work.

### Tier 1 MCP build (field-relay-nba commit 0a806c5)

Discovered the relay already had a partial /mcp endpoint at src/index.js:2427 implementing MCP protocol 2025-03-26 (Streamable HTTP, JSON-RPC 2.0) with 5 tools: get_ci_status, get_smoke_count, get_deploy_status, get_live_scores, get_espn_game. Auth gate existed but was permissive (skipped if FIELD_MCP_SECRET unset, leaving the endpoint wide open).

Three HANDOFF tools added to the existing handler:
- **read_handoff**: GET /repos/.../contents/HANDOFF.md → returns content + SHA
- **write_handoff**: PUT to GitHub Contents API → commit message auto-prefixed with [skip ci]
- **get_head_sha**: GET /repos/.../git/refs/heads/main → returns current HEAD SHA

Repo and path hardcoded in worker code (no path-traversal surface). Auth gate hardened to default-deny: missing FIELD_MCP_SECRET now returns 503 instead of bypass.

CI workflow (deploy.yml) updated to wire two worker secrets on every deploy:
- FIELD_MCP_SECRET (newly generated 64-char hex) sourced from GH Actions secret FIELD_MCP_SECRET
- GITHUB_PAT sourced from GH Actions secret RELAY_GH_PAT (renamed because GitHub reserves GITHUB_* prefix for its own secrets)

Both GH secrets set via PyNaCl from sandbox.

### End-to-end verification via post-probe.yml on jubilant-bassoon

Three test probes confirmed:
1. POST /mcp with no Authorization → HTTP 401 {"error":"Unauthorized"}
2. POST /mcp tools/list with bearer → HTTP 200, JSON-RPC response with all 8 tools
3. POST /mcp tools/call get_head_sha with bearer → HTTP 200, returned real jubilant-bassoon HEAD SHA

The fourth probe — write_handoff — generated this very HANDOFF.md commit. If you're reading this, the inaugural production use of Tier 1 succeeded.

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY (UPDATED STATE)

**Tier 1 (LIVE since June 2 PM-13):** MCP server on field-relay-nba at /mcp. Bearer-token auth (Authorization: Bearer <FIELD_MCP_SECRET>). Three handoff tools available to claude.ai via custom connector. The bearer token is held in worker secret FIELD_MCP_SECRET; rotation via GH Actions secret of the same name on jeffunglesbee-create/field-relay-nba repo.

**Tier 2 (NOT NEEDED):** The relay HTTP write proxy idea (Drive trigger doc + cron pickup) is unnecessary now that Tier 1 is live. Skip unless Tier 1 proves unreliable over an extended period.

**Tier 3 (LIVE since PM-11):** userMemories anchor edit #30. Format: `HEAD <hash> · <ISO> · via <mcp|bash|relay|chat>`. Updated by REPLACE on every session end. The new write channel options (mcp = Tier 1 working) make this anchor's `via` field meaningful as a freshness signal.

## CLAUDE.AI CUSTOM CONNECTOR SETUP (PENDING — JEFF ACTION)

To wire claude.ai to the new MCP endpoint:

1. claude.ai → Settings → Connectors → **Add custom connector**
2. URL: `https://field-relay-nba.jeffunglesbee.workers.dev/mcp`
3. Auth: if a "custom header" or "API key" option is available, use it with:
   - Header name: `Authorization`
   - Header value: `Bearer 388c7bdaad74cb8c1e92a8380a2c3b8efa4573f7b4ea4e4747dde7f54f108cb2`
   - (Alternative: `X-FIELD-MCP-Secret: <token>` — worker accepts either)
4. If only OAuth is available, screenshot the UI and we adjust in the next session.

Once added, the next chat session can use tool_search to find `read_handoff`, `write_handoff`, `get_head_sha` and call them directly. SESSION END protocol should preferentially use write_handoff (via=mcp) over bash git push (via=bash).

## NEXT SESSION PRIORITIES

P0 — Live verification of Voice Positioning v3 tonight (Stanley Cup G1) and tomorrow (NBA Finals G1). Unchanged from PM-12.

P1 — Add claude.ai custom MCP connector (above). Test write_handoff from a fresh chat to confirm round-trip integration.

P1 — Daily MLB chip backfill: recheck ESPN MLB GOTD June + Peacock GOTD week of June 1-7.

P2 — USPTO provisional toward ~June 25 deadline. Tier 1's bearer-token MCP design is a defensible architecture pattern — single-purpose tools with hardcoded repo/path constants, audit-friendly. Include in patent narrative if relevant.

P2 — STANDARDS.md amendment (Rule 48 or 49): codify the T1/T2/T3 channel hierarchy and the RESTRICTED session classification. Now that T1 is live, the rule's reference architecture exists.

P3 — Add `Access: Apps and Policies: Edit` scope to the CF API token if future Access automation is desired. Not blocking; not needed unless we change architecture again.

P3 — field_smoke.js carries 4 pre-existing failures (A30 odds adapter, A53 bdlInjury double-call, A67 beatTheBook missing, A69 beatTheBook not in card template). Smoke.js (deploy gate) is clean 367/0.

P3 — Memory edit #1 stale path reference cleanup (still references /mnt/user-data/outputs/sportworld.html ~254KB; actual is index.html ~1MB in jubilant-bassoon).

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: this commit (the one write_handoff just made)
- field-relay-nba HEAD: 0a806c5
- jubilant-bassoon smoke: 367/0
- field-relay-nba /mcp endpoint: LIVE, 8 tools, bearer-gated
- FIELD_MCP_SECRET: stored in worker secret + GH Actions secret on field-relay-nba
- Cloudflare Access app: DELETED
- T1 channel: LIVE via=mcp
- T3 anchor: pending update post-write_handoff to reflect new HEAD + via=mcp
