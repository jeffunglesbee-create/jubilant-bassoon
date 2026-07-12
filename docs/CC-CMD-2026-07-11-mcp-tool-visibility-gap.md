# Claude Code Command — Document mid-session MCP tool visibility gap

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** Confirmed tonight: `trigger_workflow` was added to field-relay-nba's MCP server, verified working via source read and a real live-triggered deploy (CC-CMD-2026-07-11-mcp-trigger-workflow.md's own outbox). But chat's already-open FIELD Handoff connector could not see or call it — `tool_search` didn't surface it, and a direct call returned "tool not found." Both tests exhausted what's checkable from inside a tool call; this is a session-level connection state gap, not a retryable condition. Documenting the pattern so a future occurrence is recognized immediately rather than re-diagnosed.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md first.

Write findings to outbox/cc-mcp-tool-visibility-gap-2026-07-11.md.

## TASK 1 — Add a short reference note to STANDARDS.md

Following the same pattern as the existing "Deploy Recovery Infrastructure Reference" and "Claude Code UI-Displayed Hash Reliability" sections, add:

```
## MCP Tool Mid-Session Visibility Gap

Confirmed 2026-07-11: a new MCP tool added to field-relay-nba's server
(`trigger_workflow`) was verified working server-side — real source,
real live-triggered deploy — but an already-open chat session's FIELD
Handoff connector could not see or call it. `tool_search` didn't
surface it; a direct call returned "tool not found." Both are the
tests available from inside a tool call, and both came back negative
— this is a session-level connection state gap (the tool list was
fetched before the new tool existed), not something retryable from
within the conversation.

**The fix is a fresh connection, not a retry.** A new conversation (or
re-toggling the connector) causes a fresh `tools/list` fetch from the
relay, which picks up anything added since the stale session started.
Retrying `tool_search` or the tool call again in the same session will
not help — the gap is in what that session's connection already has
cached, not in anything a repeated call can refresh.

**Practical implication:** after any CC-CMD that adds a new MCP tool
(not a new parameter on an existing tool — those work immediately,
same session, confirmed multiple times tonight), don't expect the
*current* chat session to be able to call it right away. Verify the
tool server-side (source read, or have Claude Code test it directly,
as this one already was) and treat chat-side confirmation as needing
a fresh session, not as a sign something's broken.
```

## TASK 2 — Confirm no contradicting claim exists elsewhere in STANDARDS.md

Grep for any other place that might imply new MCP tools are immediately available mid-session without qualification — report what's found.

## VERIFICATION

- `git diff` shows only this insertion.
- Confirm formatting matches the existing reference-section style.

## DONE CONDITION

STANDARDS.md documents the confirmed mid-session tool-visibility gap and the actual fix (fresh connection, not retry), distinguished clearly from the separate, already-documented, already-working "new parameter on an existing tool" case. Confidence ≥ 95.

**Confidence scoring:**
- Section added correctly, consistent style, accurately distinguishes this from the parameter-visibility case (60 pts)
- Does not overstate the mechanism beyond what's actually confirmed (25 pts)
- TASK 2 sweep performed (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.