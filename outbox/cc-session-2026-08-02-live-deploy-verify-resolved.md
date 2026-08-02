# Live Deploy Verify — resolved finding

Follow-up to `cc-session-2026-08-02-deploy-gate-workflow-dispatch.md`,
using the new `live-deploy-verify-probe.yml` (CI-as-proxy, unrestricted
egress) per Jeff's instruction to use a GitHub Actions runner instead
of the sandbox (blocked, 403, on this domain).

## Run 1 (`outbox/live-deploy-verify-20260802T035131Z.txt`)
`NFL_DRAMA_PROFILES` — NOT FOUND with a strict pattern
(`NFL_DRAMA_PROFILES=\{0,1\}{`, expecting `const NFL_DRAMA_PROFILES={`
verbatim). `period >= 5` and `visibilitychange` both found. This was
flagged as a real, unexplained gap worth investigating (Rule 77) rather
than dismissed — esbuild's `build-bundle.mjs` bundle step output
2,014,549 bytes vs the ~2.6MB `field.js` source, a size drop too large
to attribute to comment-stripping alone (a separate, later pipeline
step), so tree-shaking/dead-code-elimination dropping the feature was
a live, real hypothesis, not assumed to be fine.

## Run 2 (`outbox/live-deploy-verify-20260802T035447Z.txt`) — resolved
Extended probe, loose search resolved it with direct evidence from the
live site itself:
```
var NFL_DRAMA_PROFILES = { "ARI": 42.7, "ATL": 78, "BAL": 41.7, "BUF": 52...
...merican Football" ? NFL_DRAMA_PROFILES : null;
```
Both the data (`NFL_DRAMA_PROFILES`, all real values) and the function
call site (`getMatchupDramaBaseline`, matched separately too) are
genuinely present and correct live. The strict-pattern "NOT FOUND" in
Run 1 was a false negative caused by three benign esbuild bundler
output differences from the git source, none of which are bugs:
1. `const` → `var` (standard esbuild scope-hoisting when bundling
   multiple modules into one file, avoids cross-module redeclaration
   collisions — well-known esbuild behavior, not specific to this repo)
2. Added whitespace around `=` and after `:` (esbuild's printer, even
   unminified, doesn't byte-for-byte preserve source formatting)
3. `78.0` → `78` (esbuild's number printer drops the redundant
   trailing `.0` since both are the same IEEE-754 value — semantically
   identical, not data loss)

The earlier ~700KB size drop (field.js source → bundled output,
pre-comment-stripping) is not evidence of missing content either — the
same class of formatting/printer differences apply file-wide, plus
whatever comments esbuild's own AST-based output naturally drops
during bundling (distinct from the separate `strip-comments.js` step
that runs after). Not chased further since direct content presence is
now proven, not inferred from size math.

## Net result
**NFL drama profiles, the escalating-milestone MLB fix, and the
BracketDO visibilitychange guard are all confirmed live and correct**
on `https://jubilant-bassoon.jeffunglesbee.workers.dev/` as of Version
ID `07c3f8e6-b1ef-4a9a-bcea-f976918dd8aa`. The CC-CMD-2026-08-02-URGENT
deploy gap and its follow-up (`deploy-gate-workflow-dispatch`) are both
fully closed with direct, real evidence — not just a green checkmark,
not just an upload-log inference, but the actual live page content.
