# Claude Code Command — Correct one factual claim in Deploy Recovery Infrastructure Reference

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** The "Deploy Recovery Infrastructure Reference" section (added earlier today) contains a bracketed note claiming `get_deploy_status(repo:"field-relay-nba")` "is not a real tool call — the actual tool takes no repo parameter and is hardcoded to jubilant-bassoon only." Chat has since directly, independently confirmed this is wrong: the live call genuinely works, tested twice from chat's own FIELD Handoff MCP connector, once with a response that contained its own in-progress verification workflow (impossible to fake or cache). This is a single, targeted text correction — not a re-litigation of the whole section.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md first.

Write findings to outbox/cc-deploy-recovery-correction-2026-07-11.md.

## TASK 1 — Find and replace the exact bracketed note

In STANDARDS.md, under "## Deploy Recovery Infrastructure Reference" → "### Current state", find the bracketed paragraph beginning `[VERIFIED 2026-07-11: the` get_deploy_status` MCP tool available to a Claude Code session in *this* repo takes no `repo` parameter...]`.

Replace it with:

```
`get_deploy_status` (the MCP tool available to both chat's FIELD
Handoff connector and Claude Code sessions) DOES accept an optional
`repo` parameter and returns real field-relay-nba data when called
with `repo:"field-relay-nba"` — confirmed live from chat, twice,
including one call whose response contained its own verification
workflow mid-execution (impossible to fake or cache). This tool was
extended to support both repos on 2026-07-11
(CC-CMD-2026-07-11-mcp-remaining-tools-multi-repo.md). A Claude Code
session in this repo separately reported the tool as jubilant-bassoon-
only with no `repo` param — that read was almost certainly against a
stale cached tool schema rather than a live test call; chat confirmed
the live call works correctly after that report, closing the gap.
If this is ever seen again, test the live call directly before
concluding the parameter doesn't exist — do not rely on the visible
schema alone (the same class of miss this correction addresses).
```

## TASK 2 — Confirm nothing else in the section needs changing

Re-read the full "Deploy Recovery Infrastructure Reference" section after the edit. Confirm the rest of the section (recovery paths, trigger_workflow status) is still accurate and internally consistent with this correction — no other text should need to change, but confirm rather than assume.

## VERIFICATION

- `git diff` shows only this one paragraph replaced, nothing else in STANDARDS.md touched.
- Confirm the replaced text reads correctly in context (no broken markdown, no orphaned reference to the old claim elsewhere in the section).

## DONE CONDITION

The bracketed note about `get_deploy_status` is corrected to reflect the confirmed-working live behavior, not the earlier stale-schema-based false negative. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 replacement text exact, correctly placed (60 pts)
- TASK 2 rest of section confirmed still accurate (20 pts)
- `git diff` clean — only this one change (20 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.