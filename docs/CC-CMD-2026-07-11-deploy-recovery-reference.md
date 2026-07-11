# Claude Code Command — Document deploy recovery infrastructure in STANDARDS.md

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** "Re-trigger an already-existing CI workflow via workflow_dispatch as permitted operational recovery" has existed as a working exception since 2026-07-06, but only ever lived in chat's own memory — never in STANDARDS.md, the actual canonical source of truth. Tonight also produced a specific, real upgrade path for this (a `trigger_workflow` MCP tool, spec'd and pushed but not yet executed) that's currently undocumented anywhere durable. This CC-CMD moves both pieces of knowledge into the one place that survives compaction, memory pruning, and session boundaries.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md first.

Write findings to outbox/cc-deploy-recovery-reference-2026-07-11.md.

## TASK 1 — Add a new reference section to STANDARDS.md

Following the existing pattern used for "MLS 2026 Data Architecture Reference" and "Push Notification Architecture Reference" (non-numbered `##` sections, not a numbered Rule — this is operational/infrastructure knowledge, not a MUST/MUST NOT behavioral rule), add:

```
## Deploy Recovery Infrastructure Reference

### Current state (confirmed 2026-07-11)

A commit that touches `src/**`, `wrangler.toml`, or `workers/**` on
field-relay-nba's main branch should trigger `deploy.yml`'s push-based
`Deploy RELAY Worker` job automatically. This can fail to fire if the
commit message carries `[skip ci]` (which suppresses ALL workflows on
that push, not just the intended one) or if GitHub's own webhook
delivery is delayed/dropped.

**Diagnosis:** `GET /deploy/verify` on the relay returns `{expected,
deployed, match}` — `expected` is current git HEAD, `deployed` is what
the Worker last actually deployed as. `match: false` does NOT
necessarily mean a stuck deploy — some commits (docs-only, outbox
housekeeping, scheduled-cron result commits) correctly never trigger a
deploy at all. Before treating a mismatch as a real problem, check
`get_deploy_status(repo:"field-relay-nba")` for what actually ran
against the `expected` commit's SHA — if only non-deploy workflows
(cron jobs, outbox uploads) fired, the mismatch is expected, not stuck.

**Current recovery paths, if a deploy is confirmed genuinely stuck**
(real src/wrangler/workers commit, zero matching `Deploy RELAY Worker`
run for that SHA):
1. A human manually clicking "Run workflow" on `deploy.yml` in
   GitHub's Actions tab (works from any browser, including mobile).
2. A Claude Code session, which holds its own separate GitHub PAT
   access independent of chat's MCP tools, calling the same
   `workflow_dispatch` endpoint directly.

**What does NOT currently exist:** a way for chat itself (the claude.ai
conversation, via the FIELD Handoff MCP connector) to trigger this
recovery without going through Claude Code or a human. Chat holds no
GitHub credential of its own (Rule 80) and had no scoped tool for this
specific action (Rule 89) until the spec below was written.

### Planned upgrade — `trigger_workflow` MCP tool

Spec'd 2026-07-11: `docs/CC-CMD-2026-07-11-mcp-trigger-workflow.md`
(field-relay-nba). Adds a `trigger_workflow(workflow_file, ref?, repo?)`
MCP tool reusing the exact same `GITHUB_PAT` + `ghHeaders()` pattern
`commit_file` already uses — no new credential, matching Rule 89's
scoped-tool-default. Includes a TASK 0 that checks the stored PAT
actually has `workflow` OAuth scope before attempting anything, since
`commit_file` working only proves `repo` scope, not `workflow` scope.

**Status as of 2026-07-11: spec pushed, not yet executed.** Not
currently blocking anything — as of this writing, `field-relay-nba`'s
actual deploys are firing correctly via the normal push trigger for
every real code change made tonight. This is durable infrastructure
for the *next* genuine stuck-deploy incident, not an active fix for a
current outage. Treat it as standing recovery capability to build when
convenient, not an urgent gap.
```

## VERIFICATION

- Confirm the new section renders correctly, matches the formatting style of the existing Architecture Reference sections it's modeled on.
- Confirm this doesn't duplicate or contradict Rule 80/81/89's existing content — this section should reference those rules by number where relevant, not restate their full text.
- `git diff` shows only this insertion.

## DONE CONDITION

STANDARDS.md contains a durable, accurate record of the current deploy-recovery path and the planned chat-accessible upgrade, independent of chat's own memory. Confidence ≥ 95.

**Confidence scoring:**
- Section added in the correct location/style, consistent with existing reference sections (30 pts)
- Content accurately reflects the real current state (manual/CC-only recovery today, spec'd-not-executed upgrade) without overstating urgency (40 pts)
- No duplication of Rule 80/81/89's own content — cross-referenced, not restated (15 pts)
- `git diff` clean (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.