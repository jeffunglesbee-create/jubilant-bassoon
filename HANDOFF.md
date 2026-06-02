# FIELD Handoff — June 2 2026 PM-13 close (Tier 1 MCP LIVE + claude.ai connector created)

**jubilant-bassoon HEAD:** 64a0692 (last meaningful commit — HANDOFF write via MCP; subsequent commits are probe outbox traffic with [skip ci]) · Smoke: 367/0 · SW_VERSION source `2026-06-02a`
**field-relay-nba HEAD:** 02c60eb (URL-query-param auth fallback added after claude.ai connector UI was found to be OAuth-only)

**This session closed:** TYPE B build. Tier 1 MCP-on-relay is LIVE end-to-end and the claude.ai custom connector has been created on Jeff's side. Live round-trip verification is the next-session P1.

**Session Doc (this session — Drive):** 1vEVY8JSUQTM4GQtTfYPklQjl99tTgo67cYzLyBYoQYM (main PM-13 doc)
**Session Doc (PM-13 close addendum — Drive):** see Drive listing (~brief amendment doc for the URL-query-auth + connector creation)
**Tier 1 MCP-on-Relay Build Plan (Drive — historical):** `1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg`
**Session Doc (PM-12 prior — Drive):** 1CdHRgmzb8j12IudVU0470ZdZY6X4Z8LVT5YOppLv7KQ
**Data Skrive Patent Analysis v3:** 1yCXY5AF5J1jvo_b5wCV7nzp_FwQ1SIWGJqusZ4AaVqU
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`

## TIER 0 DEADLINES (unchanged)

- **Stanley Cup G1: TONIGHT (June 2 8pm ET, ABC)** — first live SCF test of Voice Positioning v3
- **NBA Finals G1: TOMORROW (June 3 8:30pm ET, ABC)** — first Finals test of v3
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (June 2 PM-13)

Tier 1 MCP build completed and went LIVE. Key steps:

1. **Cloudflare Access experiment + pivot** — Self-hosted Access app created on workers.dev hostname; enforcement test failed (Cloudflare Access does not cleanly enforce on shared workers.dev in this account configuration). Pivoted to bearer-token auth inside the worker code. Access app subsequently deleted.

2. **field-relay-nba commit 0a806c5** — Three HANDOFF tools added to existing /mcp handler (read_handoff, write_handoff, get_head_sha). Repo + path hardcoded in worker; no path-traversal surface. Existing auth gate hardened to default-deny if FIELD_MCP_SECRET unset. CI deploy.yml wires FIELD_MCP_SECRET + GITHUB_PAT (via RELAY_GH_PAT GH Action secret due to GitHub's GITHUB_* reserved prefix) as worker secrets on every deploy.

3. **End-to-end verification via post-probe.yml** — Four round-trips through the jubilant-bassoon CI probe pattern: no-bearer → 401 ✓, tools/list with bearer → 8 tools ✓, get_head_sha → live SHA ✓, write_handoff → real commit on main ✓. The inaugural production use of write_handoff generated this commit's parent (64a0692). 

4. **claude.ai custom MCP connector UI is OAuth-only** — discovered when Jeff opened the Add custom connector dialog. No custom-header field, only OAuth Client ID/Secret. Added URL-query-param auth fallback on the worker (field-relay-nba commit 02c60eb) so the bearer can travel inside the URL: `?token=<FIELD_MCP_SECRET>`. Verified working via post-probe with no Authorization header sent. Token still also accepted via header for non-claude.ai clients.

5. **claude.ai connector created** — Jeff added the custom connector with URL containing `?token=`, OAuth fields blank. Live round-trip verification pending in a fresh chat (tool_search for "handoff" did not surface the tools in the current chat — expected behavior, MCP connectors register at chat start).

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY (CURRENT STATE)

**Tier 1 (LIVE since PM-13):** MCP server on field-relay-nba at /mcp. Three auth paths on the worker:
  - `Authorization: Bearer <FIELD_MCP_SECRET>` header
  - `X-FIELD-MCP-Secret: <FIELD_MCP_SECRET>` header
  - `?token=<FIELD_MCP_SECRET>` URL query string (added for claude.ai's OAuth-only connector UI)
Three handoff tools available to claude.ai once the custom connector is wired and verified: read_handoff, write_handoff, get_head_sha. Five pre-existing diagnostic tools also available.

**Tier 2 (NOT NEEDED):** The relay HTTP write proxy idea (Drive trigger doc + cron pickup) is unnecessary while Tier 1 is operational. Skip unless Tier 1 proves unreliable.

**Tier 3 (LIVE since PM-11):** userMemories anchor edit #30. Format: `HEAD <hash> · <ISO> · via <mcp|bash|relay|chat>`. REPLACE on every session end. The `via` field is now meaningful — `via=mcp` since PM-13 first use.

## NEXT SESSION P1 IMMEDIATE

**Verify the claude.ai custom MCP connector live round-trip.** From a fresh chat with the FIELD Handoff connector enabled:

1. Run `tool_search` for "handoff" — confirm read_handoff, write_handoff, get_head_sha surface
2. Call `get_head_sha` — confirm returns this commit's SHA or a later one
3. Try a `read_handoff` — confirm returns this HANDOFF.md content + sha

If all three succeed, future SESSION END protocols can use write_handoff directly (via=mcp) instead of bash probes. If anything 401s, the URL-query token isn't passing through and we have one more debug pass to do.

## OTHER NEXT-SESSION PRIORITIES

P0 — Tonight Stanley Cup G1 (8pm ET ABC). Tomorrow NBA Finals G1 (8:30pm ET ABC). First live tests of Voice Positioning v3 on real high-stakes content. Watch J3 brief grammar landing per the criteria documented in PM-10 / PM-11 carry-forward lists.

P1 — Daily MLB chip backfill: recheck ESPN MLB GOTD June + Peacock GOTD week of June 1-7 once those sources publish.

P2 — USPTO provisional toward ~June 25. Tier 1's bearer-token MCP design (single-purpose tools, hardcoded repo/path constants, three-source auth fallback) is a defensible architecture worth including in patent narrative.

P2 — STANDARDS.md Rule 48 or 49: codify the T1/T2/T3 channel hierarchy and the RESTRICTED session classification now that the reference implementation is live.

P2 — Cleanup of probe outbox files in jubilant-bassoon (accumulated this session). Not urgent; not deployed (assetsignore excludes outbox/).

P3 — Add `Access: Apps and Policies: Edit` scope to the CF API token if future Access automation is desired. Not blocking.

P3 — field_smoke.js carries 4 pre-existing failures (A30 odds adapter, A53 bdlInjury double-call, A67 beatTheBook missing, A69 beatTheBook not in card template). Deploy gate smoke.js remains 367/0.

P3 — Memory edit #1 stale path reference cleanup.

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: 64a0692 last meaningful, 65cd3ba probe-trailing (smoke 367/0)
- field-relay-nba HEAD: 02c60eb (URL-query auth + 3 handoff tools + hardened auth gate)
- jubilant-bassoon smoke: 367/0
- field-relay-nba /mcp: LIVE, 8 tools, bearer-gated (3 auth source paths), default-deny on missing secret
- Cloudflare Access app: DELETED
- claude.ai custom connector "FIELD Handoff": CREATED (live round-trip verification pending)
- T1 channel: LIVE via=mcp (continues this session)
- T3 memory anchor: will be updated to this commit's SHA on SESSION END close
