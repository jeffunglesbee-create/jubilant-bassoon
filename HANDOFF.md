# FIELD HANDOFF — June 20 2026 (Session 2)

## State
- Client: `eb33d5a` (2026-06-20h) — unchanged
- Relay: `a0a31e6` (L4+L5 session memory tools)
- Client HEAD: `20fb15c` (Rules 80-85 + Code Map CI)
- Smoke: 718/0 — unchanged
- Rules: 1-85 (Rule 77 = PRIME DIRECTIVE)
- Codex: 9 entries (5 CC-seeded + 4 session-close)
- MCP Tools: 20 total (11 existing + 9 new L4/L5)

## Shipped This Session

### Session Memory Architecture (L-Cache Hierarchy)
- **L3 Code Map**: generate-codemap.js + codemap.yml CI (commit 9dd1dd9)
  - 887 functions, 699 sections, 132 constants, 170 boot calls
  - Auto-regenerates on push to index.html/smoke.js/STANDARDS.md
- **L4 Codex**: D1 table on ARCHIVE_DB, 4 MCP tools, 9 entries
  - Zero-deletion policy, drive_refs, wip category
- **L5 Repo Source**: 5 MCP tools + /repo/archive HTTP endpoint
  - read_source is file-level (not grep), use read_lines for line inspection
  - commit_file has parent_sha guard + WRITE_ALLOWLIST
  - /repo/archive uses `exp` and `sig` params

### Governance: Rules 80-85 (commit 20fb15c)
- 80 CREDENTIAL-BOUNDARY-A
- 81 WRITE-GATE-A
- 82 ARCHIVE-FRESHNESS-A
- 83 NO-EXFIL-A
- 84 CODEX-DISCIPLINE-A
- 85 SESSION-MEMORY-PROTOCOL-A

### Key Discoveries
- D1 binding is ARCHIVE_DB not FIELD_DB
- MCP connector caches tools/list at connector level — reconnection required for new tools
- /repo/archive uses `exp` param not `expires`

## Session Startup Protocol (Rule 85)
```
1. tool_search("FIELD Handoff")      → load MCP tools
2. read_handoff                      → L2: current state
3. codex_search("{work area}")       → L4: relevant learnings
4. get_head_sha                      → verify HEAD
```

## Next Session Priority
1. Analytics Cron CC Prompt 1 — 65 min
2. O(1) Newspaper full KV coverage — 30 min
3. Analytics Cron CC Prompt 2 — 55 min
4. The Debrief — 4 hrs
5. Soccer Intelligence commentary endpoint — 65 min

## Pending
- API-Sports Football Pro renewal (June 29 deadline)
- NFL SPORT_TO_V2 (Sept 9 deadline)
- Privacy Policy + GDPR (commercial gate)
- read_codemap relay tool (CODE_MAP.json exists, tool not yet on relay)
- Dispatcher refactor: 9 tools → 2 (repo + codex) to avoid future connector refreshes
