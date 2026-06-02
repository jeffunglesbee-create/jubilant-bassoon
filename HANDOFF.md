# FIELD Handoff — June 2 2026 PM-15 close (Cloudflare connector verification — fails open)

**jubilant-bassoon HEAD:** 3145f2c last meaningful (STANDARDS Rule 48 Class E from PM-14) · f8ec567 probe-trailing · Smoke: 367/0 · SW_VERSION source `2026-06-02a`
**field-relay-nba HEAD:** 880e3ae last meaningful · dd525e7 probe-trailing · OAuth feature commit: 8e7257d (unchanged from PM-14)

**This session closed:** TYPE Verify (no code shipped). Executed P1 next-session test from PM-14 — exercise Cloudflare Developer Platform connector against `MCP_OAUTH` KV `log:` keys. Connector tools failed to surface via `tool_search`; `cf-api-probe.yml` fallback used successfully end-to-end. Two test queries answered. Audit pass on full June 2 ET session log requested by Jeff.

**Session Doc (this session — Drive):** _written at SESSION END; ID populated below_
**Previous session doc (PM-14 — Drive):** 1xGtkBfgttVwwzp1OCpoytZhhbM3ZQpUh
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`

## TIER 0 DEADLINES (unchanged from PM-14)

- **Stanley Cup G1: TONIGHT (June 2 8pm ET, ABC)** — first live SCF test of Voice Positioning v3
- **NBA Finals G1: TOMORROW (June 3 8:30pm ET, ABC)** — first Finals test of v3
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (June 2 PM-15)

Scope was the PM-14 next-session P1: test the Cloudflare Developer Platform connector that Jeff added to claude.ai at PM-14 close. Three findings, in order of importance.

### Finding 1 — Cloudflare connector tools do not surface

`search_mcp_registry` returns the Cloudflare Developer Platform connector as `installState: "connected"`, `connected: true`, with a tool list including `accounts_list`, `kv_namespaces_list`, `kv_namespace_get`, `workers_list`, +16 more.

`tool_search` was called with 7 distinct queries — `"Cloudflare KV namespace list keys"`, `"Cloudflare Workers bindings"`, `"cloudflare"`, `"KV storage"`, `"developer platform bindings worker"`, `"kv_namespaces_list"`, `"accounts_list Cloudflare account"`. Every call returned only Google Drive tools. Per Rule 48 Class E, all reasonable verification queries were exhausted before declaring the constraint.

`suggest_connectors` was called with the Cloudflare UUID `2d60210c-dd92-4be0-b09c-3662f10445c9` to nudge the UI; no follow-up message from Jeff selecting it, so unclear whether the picker re-prompt resolved anything visually.

**Practical implication:** `cf-api-probe.yml` remains the primary path for Cloudflare ops from sandbox until the connector's tool surface is reachable. The HANDOFF claim "If the Cloudflare connector works as advertised, cf-api-probe.yml becomes the fallback rather than the primary path" did not pan out this session.

### Finding 2 — Both test queries answered via cf-api-probe.yml

Round-trip ~50s each, both succeeded first try:

- **Query 1** — list keys with prefix `log:` in `MCP_OAUTH`. Found namespace `field-mcp-oauth`, ID `f61e51036f9d4969b873cdc7602aad27`. First listing: 9 entries. Re-listing 8 min later: 17 entries. PM-14 probe entries (15:53Z) had already TTL-expired between PM-14 close and PM-15 start, which is expected behavior with 1h TTL — not data loss.
- **Query 2** — get value of most recent log key. Latest at probe time: `log:2026-06-02T17:30:56.239Z-05b28b54`. Value contained ts + label `"route"` + method `POST` + path `/mcp` + headers. **Body NOT captured** (`logRequest` records headers + route metadata only; `content-length: 95` indicated a body was present but not logged).

### Finding 3 — `/mcp` traffic in KV is NOT from claude.ai (assumption flipped)

Initial read on the 8 new log entries that appeared between listings: claude.ai's FIELD Handoff connector finally pinging. **Wrong.** Headers showed:
- `origin: https://jubilant-bassoon.jeffunglesbee.workers.dev`
- `user-agent: ... HeadlessChrome/148.0.7778.96 ...`
- `sec-fetch-site: same-site`

This is L3 browser tests (`field_browser.test.js` test F10 at line 215 — loads `LIVE_URL + '?debug=1'`), triggered by smoke-and-verify.yml running on my cf-api-probe push events.

Traced the FIELD-side caller: `fetchMCPStatus()` at `index.html:3133`, called from `showFieldHealthPanel()` (line 2901). Auto-fires 800ms after page load IF `?debug=1` in URL (gate at line 3242). Does `Promise.all([get_ci_status, get_smoke_count])` JSON-RPC calls → 2 parallel POSTs to `/mcp` ~2-3ms apart. **That explains the pairing pattern in every log entry pair in KV (16:47, 16:56, 17:20, 17:29, 17:30 — all paired).** This is the May 30 2026 health panel feature, intentional, not a bug.

**Net of all this:** zero claude.ai-originated `/mcp` traffic captured in `MCP_OAUTH` KV in any of the 17 entries. The claude.ai connector either uses a path that bypasses `logRequest`, or its probing cadence is wider than the 1h TTL window. PM-14 note "no claude.ai traffic visible" still holds; PM-15 confirms it with broader data.

### Bonus — June 2 ET audit (Jeff asked)

Jeff asked: "Was the answer to most if not all of the discussion on June 2 ET, get the Cloudflare connector?" Pulled all six June 2 sessions via `recent_chats`. **Answer: no.**

The day's spine was building and verifying the **FIELD Handoff** custom MCP server on field-relay-nba — a different MCP server from the prebuilt Cloudflare Developer Platform one. The PM-5b addendum was blocked by tool-surface availability (no bash, no web), the 10:50Z daily update fail was the same, PM-10/12/13/14 were all about building/verifying the FIELD Handoff connector and its OAuth surface. The Cloudflare connector was added at PM-14 close as a separate convenience, not as the answer to the day's main problem.

The Cloudflare-related thread that DID run through the day was "Cloudflare-as-platform" — Workers, OAuth patterns, MCP-server-on-Workers — culminating in building OAuth 2.1+PKCE+DCR on field-relay-nba. That was a build, not an install.

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `3145f2c` last meaningful (unchanged from PM-14), `f8ec567` probe-trailing
- jubilant-bassoon smoke: **367/0**
- field-relay-nba HEAD: `880e3ae` last meaningful, `dd525e7` probe-trailing (unchanged from PM-14)
- field-relay-nba /mcp: LIVE with four auth paths (OAuth bearer + legacy bearer header + X-FIELD-MCP-Secret + `?token=` URL query)
- KV bindings on relay: PUSH_SUBS, FIELD_JOURNALISM, MCP_OAUTH
- MCP_OAUTH namespace ID: `f61e51036f9d4969b873cdc7602aad27` (durable, useful to know)
- claude.ai connector "FIELD Handoff": LIVE, `?token=` URL auth path
- claude.ai connector "Cloudflare Developer Platform": registered + connected per registry, tools not surfacing via tool_search from this session's seat
- STANDARDS.md Rule 48 Class E: in effect (committed PM-14 as bcaa803)
- T3 memory anchor: will be updated to `f8ec567` on SESSION END (probe-trailing — meaningful is still 3145f2c)

## NEXT SESSION P1 IMMEDIATE

**Decide what to do about the Cloudflare connector mismatch.** Three branches:

1. **Try from a fresh chat.** This session may have a stale tool index. A fresh chat may load the Cloudflare connector's tools properly. Cheapest test.
2. **Re-authorize the Cloudflare connector** in claude.ai settings (disconnect/reconnect). If the OAuth handshake left tools un-registered with the model, this resets it.
3. **File a question with Anthropic support** if 1+2 fail. Connector is `connected:true` per MCP registry but its tools are unreachable to the model — that's a connector-platform issue, not a FIELD issue.

Until one of those resolves, `cf-api-probe.yml` is the operational path. Don't deprecate it.

## OTHER NEXT-SESSION PRIORITIES

P0 — **Stanley Cup G1 tonight (8pm ET ABC)** and **NBA Finals G1 tomorrow (8:30pm ET ABC).** First live tests of Voice Positioning v3 on highest-stakes content. Watch the J3 brief output.

P2 — Extend `logRequest()` to capture body. Use `req.clone().text()` before processing to avoid consuming the stream the JSON-RPC handler needs. Truncate to N KB (suggest 8KB) to avoid bloating KV. Without this, "show last /mcp body" can't be answered.

P2 — **Verify claude.ai connector traffic logging.** Once body capture is in, deliberately trigger a fresh `read_handoff` from claude.ai and check KV for a new entry. If nothing shows up, `logRequest` isn't running on the auth-success path claude.ai uses — that's a real bug.

P1 — R2 Finals Narrative Context (before NBA Finals G1 June 3) — open from PM-14.

P1 — Queues/WOW 8 (hard deadline June 11 World Cup) — open from PM-14.

P1 — R2 World Cup Team Context (before June 11) — open from PM-14.

P1 — `get_smoke_count` MCP tool reports 268 vs deploy-gate's canonical 367. Tool is regex-counting instead of executing `smoke.js`. Bug to fix — flagged by other-Claude in PM-13.

P2 — USPTO provisional toward ~June 25.

P2 — `tool_search "handoff"` ranking: `write_handoff` is in registry but didn't surface in top 5. Tool name + description tuning candidate.

P2 — Probe-outbox cleanup in jubilant-bassoon.

P3 — `index.html:3137` has dead `MCP` variable (computed but unused; `RELAY_MCP` on next line is hardcoded URL actually called). Tiny cleanup.

P3 — `field_smoke.js` carries 4 pre-existing failures (A30, A53, A67, A69). Deploy gate `smoke.js` remains 367/0.

P3 — Memory edit #1 stale path reference cleanup (`/tmp/jubilant-bassoon` mentioned, but actual clone is `/home/claude/jubilant-bassoon`).

## CLOSED THIS SESSION

- **PM-14 P1 next-session test** — executed. Outcome documented above. Cloudflare connector verification = inconclusive at the model-tool layer (tools don't surface); cf-api-probe.yml verified as working alternative.
- **"Trace FIELD POST /mcp callers" backlog candidate** — closed before it was even added. Caller is `fetchMCPStatus()` health panel, intentional and shipped May 30. Not a bug.

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY (CURRENT STATE)

**Tier 1 (LIVE):** MCP server on field-relay-nba at /mcp. Four auth paths (OAuth bearer + 3 legacy). 8 tools: get_ci_status, get_smoke_count, get_deploy_status, get_live_scores, get_espn_game, read_handoff, write_handoff, get_head_sha.

**Tier 2 (NOT NEEDED).**

**Tier 3 (LIVE):** userMemories anchor edit. Updated to `f8ec567` at PM-15 SESSION END (probe-trailing; last meaningful is still `3145f2c` from PM-14's Rule 48 amend).
