# Claude Code Command — GumTree feasibility probe via temporary GitHub Actions workflow

**STATUS: Deferred, not superseded — real tool for a future larger/cross-language audit. Do not dispatch as-is; re-scope to the actual future need first.**

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** one temporary workflow, one real diff test, self-deleting after use. Not a permanent addition.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/gumtree-probe-2026-07-13.md.

## CONTEXT — why this needs CI, not chat's sandbox

GumTree (github.com/GumTreeDiff/gumtree) is a real, actively-maintained, syntax-aware AST diff tool — JavaScript officially supported, independently validated as state-of-the-art by a 2025 benchmark paper. Its dependencies resolve from Maven Central, which chat's sandbox cannot reach (not in its network allowlist) and which chat's `commit_file` tool cannot provision a workflow for (`.github/workflows/` is outside its write scope). GitHub Actions runners have unrestricted egress and can reach Maven Central directly — the same "CI-as-proxy" pattern already used tonight for wrangler-tail tests and Cloudflare API probes.

## TASK 0 — Probe

Confirm current GumTree release version and Maven coordinates fresh:
```bash
curl -s https://repo1.maven.org/maven2/com/github/gumtreediff/core/maven-metadata.xml | grep -A2 "<release>"
curl -s https://repo1.maven.org/maven2/com/github/gumtreediff/gen.treesitter-ng/maven-metadata.xml | grep -A2 "<release>"
```
Do not assume the pre-built JAR classpath (`core`, `client`, `gen.treesitter-ng`) is correct or complete without checking GumTree's own current CLI docs for the JS tree-generator's actual required artifact name — the beta6 release notes describe a new tree-sitter-based generator; confirm its real Maven artifact ID before building the workflow.

## TASK 1 — Create a temporary, self-contained workflow

Add `.github/workflows/temp-gumtree-probe.yml`, `workflow_dispatch`-only (matching the established `TEMP *` naming convention used for other one-off verification workflows tonight). It should: fetch pre-built GumTree JARs from Maven Central directly (skip the full Gradle source build — unnecessary for this test and slower), extract two real versions of one Bucket C candidate function (e.g., diff `index.html` at commit `451988412b45d7acb83a5b99cfa8a0146bce9ea8` — the Bucket C classification commit — against current HEAD, for one specific flagged function's line range), run GumTree's diff client against both versions, and commit the raw output to `docs/outbox/gumtree-probe-result-2026-07-13.txt`.

## TASK 2 — Run it for real, read the real output

Dispatch via `workflow_dispatch`, wait for completion, read the actual committed result — not just the job's green/red status. Confirm whether GumTree ran cleanly (no `cgum`-style external-binary failure) and whether its output is genuinely more precise/useful than the git-diff line-range method already used tonight for the same function.

## TASK 3 — Clean up

Delete the temporary workflow file after the result is captured, matching the established pattern for other `TEMP *` workflows tonight (built, used once, removed). This is a feasibility probe, not permanent infrastructure — a decision on whether to keep it belongs to Jeff, not this CC-CMD.

## DONE CONDITION

Real GumTree output captured from a real diff, run via CI (not chat's sandbox, not a Gradle source build). Honest verdict on whether it ran cleanly. Temporary workflow removed. No permanent infrastructure added without explicit approval.

**Confidence scoring:**
- TASK 0 confirms real, current Maven coordinates, doesn't assume stale artifact names (20 pts)
- TASK 1 correctly scoped, self-contained, follows established TEMP-workflow convention (30 pts)
- TASK 2 real dispatch, real output read and reported honestly either way (35 pts)
- TASK 3 cleanup confirmed, no permanent addition without approval (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
