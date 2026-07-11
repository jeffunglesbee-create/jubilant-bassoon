# Claude Code Command — Add Rule 89 (SCOPED-TOOL-DEFAULT-A) to STANDARDS.md

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — STANDARDS.md lives here)
**Scope:** Tonight's session repeatedly hit a pattern: chat needs a new GitHub/Cloudflare capability, has no credential, and the question of "how should this get solved" had to be re-derived from first principles each time (commit_file's multi-repo fix, then the workflow_dispatch trigger tool). The underlying principle each time converged on the same answer. This CC-CMD makes that answer a standing rule instead of something re-argued per incident.
**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md first.

Write findings to outbox/cc-standards-rule89-2026-07-11.md.

## TASK 1 — Confirm insertion point

Confirm Rule 88 is still the highest-numbered rule in STANDARDS.md and that Rule 82 (Archive freshness) still immediately follows Rule 81 (Write gate) in the credential/write-boundary cluster. Report any drift before inserting.

## TASK 2 — Insert Rule 89 immediately after Rule 88 (or after Rule 82, whichever placement keeps the credential-boundary rules — 80, 81, 82, 89 — contiguous; use judgment on exact position, but keep this rule adjacent to 80/81/82, not appended at the document's end regardless of where 88 currently sits)

Insert this exact rule, formatted to match the existing Rule N — Title (CODE-NAME) / body / "### Why this matters" / "### Operational rules" structure used by every other rule in the file:

```
## Rule 89 — Scoped-tool default over credential handoff (SCOPED-TOOL-DEFAULT-A)

When a session needs a new capability that requires a credential
(GitHub, Cloudflare, or any other service the relay already holds a
credential for), the default is a new, narrowly-scoped MCP tool on the
relay that performs the specific action server-side and returns the
result — never a credential, short-lived or otherwise, handed to the
session itself.

This generalizes the pattern already used for `commit_file`,
`read_file`, `get_archive_url`, and `trigger_workflow`: each is a
specific, auditable action reusing the relay's already-stored
`GITHUB_PAT`, not a raw credential exposed to a session.

### Why this matters

A short-lived, narrowly-scoped credential (e.g. a GitHub App
installation token, ~1hr TTL) is a smaller exposure than a long-lived
PAT, but it is not zero exposure — it is still a credential that would
sit in conversation context if handed to a session, subject to the
same persistence-through-compaction risk Rule 80 exists to prevent. A
server-side tool that performs the action and returns only the result
has no credential in conversation context at all, at any TTL. Given
the choice, no-exposure beats reduced-exposure.

### Operational rules

1. Before treating "hand the session a scoped/short-lived credential"
   as the fix for a capability gap, first ask whether a new,
   narrowly-scoped MCP tool on the relay — reusing the credential the
   relay already holds — solves the same need with zero credential
   exposure. This is the default path, not one option among several.
2. Short-lived/scoped credential handoff (e.g. GitHub App installation
   tokens) is a legitimate exception, not a rejected idea — but it
   requires a stated reason the scoped-tool default doesn't work for
   the specific case (e.g. the action space is too broad/dynamic for a
   fixed set of tools to cover), not just convenience or speed of
   implementation.
3. This does not mandate a fully generic "call any API endpoint"
   proxy tool as the way to satisfy this rule. A generic proxy
   reintroduces a large, hard-to-audit blast radius — closer in spirit
   to a raw credential handoff than to the specific, allow-listed
   action pattern this rule is describing. Prefer adding specific,
   named tools (one per real, distinct need) over one broad tool that
   can do many things.
```

## VERIFICATION

- Confirm the inserted text renders correctly (no broken markdown, code fences match surrounding rules' style).
- Confirm rule numbering stays consistent — no duplicate "Rule 89" elsewhere, no gap where an existing rule number got accidentally renumbered.
- `git diff` should show only an insertion in STANDARDS.md — nothing else in the file touched.

## DONE CONDITION

Rule 89 exists in STANDARDS.md, positioned adjacent to the credential/write-boundary rule cluster (80/81/82), formatted consistently with every other rule in the file, verified via a clean `git diff`. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 insertion-point confirmation genuinely checked, not assumed (20 pts)
- Rule 89 text inserted verbatim, correctly formatted (40 pts)
- `git diff` confirmed clean — only this insertion, nothing else touched (30 pts)
- No rule-numbering collision introduced (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.