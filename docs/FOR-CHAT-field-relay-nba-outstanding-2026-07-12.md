# For chat — 3 outstanding items that need field-relay-nba access this Claude Code session doesn't have

**Date:** 2026-07-12
**Why this doc exists:** this Claude Code session is scoped to
`jeffunglesbee-create/jubilant-bassoon` only — no `field-relay-nba`
connector is available here (confirmed via `ToolSearch`, no match).
Chat's own FIELD Handoff connector has already been confirmed, live
tonight, to reach `field-relay-nba` directly (a real
`get_deploy_status(repo:"field-relay-nba")` call succeeded, screenshot
shared and cross-verified against an independent `probe_relay_route`
call from this session — see `STANDARDS.md` → "Deploy Recovery
Infrastructure Reference"). This doc collects everything discovered
tonight that needs that access, with real evidence for each, not
vague pointers — so it can be acted on directly from chat, or turned
into a CC-CMD pushed to `field-relay-nba/docs/` for a Claude Code
session with that repo's access (matching the established dual-repo
CC-CMD pattern used earlier tonight for Rule 90's TASK 3).

---

## ITEM 1 — `nhlSeriesInit`/`nhlGSAXInit` HTTP 403 — RESOLVED, confirmed by chat after this doc was written

**Update from chat, 2026-07-11, later the same night:** this item was real and correctly reported — confirmed live twice, hours apart, exactly as documented below. It is now resolved. Root cause found and fixed by chat directly: the top-level `/nhl` proxy route used `pathname.startsWith('/nhl')` (no trailing slash), incorrectly intercepting `/nhl-series/*` and `/nhl-gsax/*` before they ever reached their real handlers — a simple prefix collision, not an auth/allowlist issue. Fixed with a one-character change (added the trailing slash), field-relay-nba commit `1d0934f`.

**Re-verified by chat just now, live, both endpoints:**
```
nhl-series/scf-2026/stats  → HTTP 200
nhl-gsax/playoffs.json     → HTTP 200 (was 404 "no GSAX data yet" right after the routing fix,
                               now 200 with real data -- the regular-season cron wiring from
                               ITEM 2's neighboring nhl-nba-regular-season-continuation work
                               populated it since)
```

No action needed. Left in this doc (rather than deleted) so the original evidence and diagnosis trail stays visible — the original report below was accurate for its time, not a false alarm.

**Original entry, preserved for the record:**

Real evidence, not assumed: confirmed live in production **twice**
tonight, hours apart (relay-init-staleness-visibility's initial deploy,
and again during pick-resolution-retry-decouple's live verification) —
both times `window._relayInitStatus` showed:

```json
"nhlSeriesInit": { "ok": false, "error": "HTTP 403" }
"nhlGSAXInit":   { "ok": false, "error": "HTTP 403" }
```

Exact endpoints (from `jubilant-bassoon/index.html`, current HEAD):
- `https://field-relay-nba.jeffunglesbee.workers.dev/nhl-series/scf-2026/stats`
- `https://field-relay-nba.jeffunglesbee.workers.dev/nhl-gsax/playoffs.json`

Not a network blip — the same two routes failed identically across
two independent checks separated by hours.

## ITEM 2 — `trigger_workflow` MCP tool: spec'd, not yet built

**Spec doc**: `docs/CC-CMD-2026-07-11-mcp-trigger-workflow.md` in
`field-relay-nba` (this session cannot read that repo to re-confirm
the doc still says what it said when originally referenced — flagging
that as itself worth a quick re-check before starting).

Per what was captured in `jubilant-bassoon/STANDARDS.md`'s Deploy
Recovery Infrastructure Reference section tonight: adds
`trigger_workflow(workflow_file, ref?, repo?)`, reusing the same
`GITHUB_PAT` + `ghHeaders()` pattern `commit_file` already uses — no
new credential, matching Rule 89's scoped-tool-default. Includes a
TASK 0 that checks the stored PAT actually has `workflow` OAuth scope
before attempting anything (since `commit_file` working only proves
`repo` scope, not `workflow` scope).

**Status as of tonight: not blocking anything currently** — every real
code change made tonight deployed correctly via the normal push
trigger. This is standing recovery capability for the *next* genuine
stuck-deploy incident, not an active fix for a live outage. Build when
convenient, not urgently.

**Update from chat, 2026-07-11:** still confirmed not yet executed as
of the last check (no matching outbox file in field-relay-nba). Also
now tracked in `field-relay-nba/docs/FOR-CHAT-outstanding.md` and
codex (`cc-cmd-queue`, key `mcp-trigger-workflow`).

## ITEM 3 — field-relay-nba's live deploy state: `match: false` (as of last check — re-verify, don't assume still true)

**Real evidence, timestamped, from earlier tonight** — via
`probe_relay_route("/deploy/verify")` from this session:

```json
{"ok":true,"expected":"a20fced","deployed":"76f4e71","match":false,
 "deployedAt":"2026-07-11T20:16:31Z","runId":29166698206,
 "checkedAt":"2026-07-11T21:09:43.445Z"}
```

**This is hours old by now — do not treat these specific SHAs as
current.** Re-check with a fresh `probe_relay_route("/deploy/verify")`
or chat's own confirmed-working `get_deploy_status(repo:"field-relay-nba")`
call before diagnosing anything. Per the Deploy Recovery Infrastructure
Reference's own diagnosis note: `match: false` does NOT automatically
mean a stuck deploy — some commits (docs-only, outbox housekeeping,
scheduled-cron result commits) correctly never trigger a deploy at
all. Check what workflow actually ran against the current `expected`
commit's SHA before concluding anything is actually stuck.

**Update from chat, 2026-07-11:** this exact pattern recurred multiple
times later the same night with different SHAs each time, always
traced to scheduled crons (Drama Peak Backfill, Score Fill, Auto-Merge
Stray Branches) correctly not touching `src/**` — never a genuine
stuck deploy on any check performed tonight. This item's own hedging
was correct and remains the right approach going forward.

---

## Suggested handling

Item 1 is resolved — no action needed, kept for the record. Item 2 remains genuinely open, not urgent. Item 3's guidance (re-check before diagnosing, don't assume a mismatch means stuck) remains correct and durable advice, not a one-time finding.
