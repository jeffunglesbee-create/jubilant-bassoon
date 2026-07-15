# Claude Code Command — Verify the 5 named string-referenced functions and enumerate the full 29

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin || { echo "run from a jubilant-bassoon checkout"; exit 1; }
git pull.

Write findings to docs/outbox/cc-string-referenced-verify-2026-07-15.md. Commit with `[skip ci]`. Read-only investigation — no functional code change expected unless TASK 0 finds a real problem.

## CONTEXT

A tree-sitter sweep two sessions ago found 25 genuine orphans (fully investigated, all 9 resulting CC-CMDs now done) and separately, 29 "string-only referenced" functions — flagged as "referenced from `onclick="..."` or similar generated-HTML strings — legitimate, not dead" but never individually verified the way the 25 were. Only 5 were ever named in the original report: `pinGame`, `unpinGame`, `toggleStandings`, `openWcGroup`, `makePick`. The other 24 were never enumerated. This chat session attempted to re-run the sweep independently to get the full list, but hit a real sandbox constraint — `tree-sitter` requires native compilation via `node-gyp`, which needs `nodejs.org` (not on this chat's network allowlist). This environment can build it; that's the actual reason this is a CC-CMD rather than something resolved directly.

## TASK 0 — Get the real, complete list

Re-run (or rebuild, if the prior session's script wasn't checked in — confirm which before assuming) the orphan sweep, specifically capturing the full "string-only referenced" bucket (raw-text-matched but zero real AST call sites) — all ~29 names, not just the 5 already known.

## TASK 1 — Verify the 5 named ones directly

For each of `pinGame`, `unpinGame`, `toggleStandings`, `openWcGroup`, `makePick`: confirm the real, exact string reference (the literal `onclick="..."` or equivalent) exists in the current code, confirm it's genuinely reachable (the element it's attached to actually renders under real, plausible conditions — not itself inside dead/unreachable code), and confirm the function body itself does what its name implies (a quick sanity read, not a full audit).

## TASK 2 — Spot-check a real sample of the remaining ~24

Don't do a full 25-style deep-dive on all 24 — that's disproportionate for a category where a wrong call just leaves something unnoticed rather than something useful deleted. Pick a real, representative sample (5-8 names) and verify them the same way as TASK 1. Flag anything that looks genuinely suspicious (a name suggesting it should be reachable but isn't, based on your reading) for the outbox even if not fully investigated.

## DONE CONDITION

The complete ~29-name list exists and is recorded. All 5 originally-named functions individually confirmed genuinely live via real string reference. A real, honest sample of the remaining ~24 checked, with anything suspicious flagged rather than silently passed through.

**Confidence scoring:**
- TASK 0 (30 pts): real, complete list obtained, method disclosed (rebuilt tool vs. found existing one)
- TASK 1 (40 pts): all 5 named functions verified with real evidence, not just re-asserted from the original report
- TASK 2 (30 pts): real sample checked, anything suspicious honestly flagged

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
