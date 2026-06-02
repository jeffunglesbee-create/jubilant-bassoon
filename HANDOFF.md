# FIELD Handoff — June 2 2026 PM-11 TYPE B (Tier 1 plan staged)

**jubilant-bassoon HEAD:** 61dd45c (HANDOFF only — no code changes this session) · Smoke: 367/0 baseline carried forward from PM-10 · SW_VERSION source `2026-06-02a`
**field-relay-nba HEAD:** 6144d17 (unchanged since PM-6)

**This session closed:** TYPE B research/architecture session (RESTRICTED — no code). Produced a complete, verified Tier 1 MCP-on-relay build plan. No commits to jubilant-bassoon or field-relay-nba. Tier 3 memory anchor protocol was committed earlier in the same conversation (memory edit #30).

**Session Doc (this session — Drive):** see Tier 1 build plan below
**Tier 1 MCP-on-Relay Build Plan (Drive):** `1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg` — READ BEFORE OPENING NEXT TYPE B BUILD SESSION
**Session Doc (PM-10 prior — Drive):** 1jxcLmCk4yfi22qgJWIds2F0v7j2RJdzu1CC1UxOv1Lk
**Session Doc (PM-9 prior — Drive):** 1r1Msf9g8QD7uV2wSql6qK_ydFZJTcis3x8Fp10sQ1gk
**Data Skrive Patent Analysis v3:** 1yCXY5AF5J1jvo_b5wCV7nzp_FwQ1SIWGJqusZ4AaVqU
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`

## TIER 0 DEADLINES (unchanged from PM-10)

- **NBA Finals G1: TONIGHT (June 3 8:30pm ET, ABC)** — first live test of Voice Positioning v3
- **Stanley Cup G1: TONIGHT (June 2 8pm ET, ABC)** — first live SCF test
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (June 2 PM-11 TYPE B)

Research-only session. Started as Tier 1 build session, deliberately
de-escalated to RESTRICTED after verifying that key implementation details
would have been fabricated without first reading the canonical Cloudflare
sources.

Concrete work product: complete file-by-file build plan written to Drive
(1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg). Plan covers:

  - Architectural decision (self-hosted Access, not Access for SaaS) with rationale and source citations
  - Exact MCP tools to expose (read_handoff, write_handoff, get_head_sha)
  - Jeff's Cloudflare dashboard prerequisites (Zero Trust, IdP, Access app, AUD/TEAM_DOMAIN extraction)
  - File-by-file changes to field-relay-nba: new package.json, new src/mcp-server.js (~200 lines with full JWT validation skeleton), modifications to src/index.js, wrangler.toml, and CI workflow
  - Five-phase deploy sequence (local prep → verify prereqs → auth-disabled sanity deploy → enable auth → claude.ai connector)
  - 8 known risks with mitigations
  - Rollback procedure
  - Post-build verification checklist
  - 10 source URLs verified June 2 2026

Verified facts (not assumed):

  - Cloudflare publishes two MCP-auth patterns; "Self-hosted application" is the recommended one
  - JWT validation pattern uses jose npm package: `createRemoteJWKSet` + `jwtVerify(token, JWKS, { issuer, audience })`
  - The relay's existing `global_fetch_strictly_public` flag does NOT block fetches to cloudflareaccess.com (different zone)
  - field-relay-nba currently has no package.json — adding one requires also adding `npm ci` to the CI workflow

Unverified / flagged for in-build resolution:

  - claude.ai's custom MCP connector OAuth discovery against Cloudflare Access end-to-end. If it fails, fallback is the Access for SaaS path (heavier, but explicitly supported by claude.ai per CF docs)
  - Exact MCP TypeScript SDK API surface at install time (minor naming may have shifted; verify when npm-installed)

## NEXT SESSION PRIORITIES

P0 — Live verification tonight and tomorrow (UNCHANGED from PM-10):
  - Stanley Cup G1: TONIGHT (June 2, 8pm ET, ABC). First live SCF test of Voice Positioning v3. Watch for grammar landing on J3 briefs.
  - NBA Finals G1: TOMORROW (June 3, 8:30pm ET, ABC). First Finals test.
  Both: confirm SW_VERSION 2026-06-02a propagated to returning users (cache-bust on activate). Confirm push notifications fire if WOW 2 CRUNCH triggers.

P1 — Daily MLB chip backfill: recheck ESPN MLB GOTD June schedule (ESPN Press Room + thefutoncritic.com) and Peacock GOTD week of June 1-7 (peacocktv.com blog). If found, backfill espnGOTD / peacockGOTD flags. Currently MLB games are MLB_LOCAL per "I don't know" rule from PM-10.

P1 — Tier 1 MCP-on-Relay build: dedicated TYPE B session, ideally between Stanley Cup G2 (June 4) and World Cup (June 11). Recommended day: June 5, 6, 7, 8, 9, or 10. Prerequisites: read 1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg end-to-end, then Jeff completes Cloudflare dashboard prereqs (~30 min), then code build (~2-3 hours), then test (~30 min). Total ~4 hours plus possible debug session.

P2 — USPTO provisional preparation continues toward ~June 25 deadline.

P3 — field_smoke.js carries 4 pre-existing failures (A30 odds adapter, A53 bdlInjury double-call, A67 beatTheBook missing, A69 beatTheBook not in card template). Do not block deploy — smoke.js gate is clean 367/0. Address opportunistically.

P3 — Memory edit #1 has stale path reference "/mnt/user-data/outputs/sportworld.html (~254KB)" — actual is index.html in jubilant-bassoon at ~1MB. Cleanup opportunity.

P3 — When Tier 1 build completes, update STANDARDS.md with new rule (Rule 48 or 49) codifying the T1/T2/T3 channel hierarchy and RESTRICTED session classification.

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY (CURRENT STATE)

Tier 1 (PLANNED, not built): MCP server on field-relay-nba at /mcp, behind Cloudflare Self-hosted Access. Read+write HANDOFF.md via custom connector in claude.ai.
Tier 2 (NOT PLANNED): relay HTTP write endpoint. Decide whether to build only if Tier 1 proves unreliable in practice. Wait at least one week of Tier 1 use before deciding.
Tier 3 (LIVE since June 2 PM-11): userMemories anchor edit #30 pointing to repo HANDOFF.md. Updated via REPLACE on every session end.

## SESSION END/START PROTOCOLS

Now governed by memory edits #18 (SESSION START) and #19 (SESSION END).
Both updated June 2 PM-11 to reflect the T1/T2/T3 hierarchy. Memory anchor
#30 currently reads:
  "FIELD HANDOFF anchor: HEAD 61dd45c · 2026-06-02 · via bash. Source:
   HANDOFF.md in jubilant-bassoon repo root. REPLACE this entire memory
   edit on every session end..."

After this PM-11 session-end git commit lands, anchor should be updated to
new HEAD SHA via memory_user_edits in the next session that has bash access.
