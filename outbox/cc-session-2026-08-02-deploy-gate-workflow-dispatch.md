# CC-CMD-2026-08-02-deploy-gate-workflow-dispatch — Result

## Task 1 — DONE
`.github/workflows/deploy-gate.yml`: added `workflow_dispatch: {}`
alongside the existing `push:` trigger, plus a header comment block
documenting why. Additive only — confirmed before editing that the
job body has zero `github.event_name` references, so behavior is
identical regardless of trigger type. Diff: 10 lines added, 0 removed.
Commit `811eeb12`. `node smoke.js index.html` 965/0 (this file isn't
in the smoke-relevant path set, but ran anyway per Rule 66).

## Task 2 — DONE, real artifact obtained

Dispatched `deploy-gate.yml` via `actions_run_trigger` /
`run_workflow` immediately after push. **This alone is proof the fix
works**: the identical dispatch call against the pre-fix workflow
returned a real `422 Workflow does not have 'workflow_dispatch'
trigger` (documented in the prior CC-CMD's outbox doc); this time it
returned `204` and queued a real run.

Run `30731222519`, `event: workflow_dispatch`, `head_sha: 811eeb12`,
**conclusion: success**. Job `91451895965` step-by-step, all green,
including the deploy step itself. Real log output from
"Deploy to Cloudflare Workers" (not just the checkmark):

```
🌀 Found 6 new or modified static assets to upload. Proceeding with upload...
+ /team_drama_profiles_nfl.json
+ /.wrangler/tmp/deploy-MPtlBY/worker.js.map
+ /bracketdo_visibilitychange_probe.js
+ /CODE_MAP.json
+ /sw.js
+ /index.html
✨ Success! Uploaded 6 files (40 already uploaded) (1.76 sec)
Deployed jubilant-bassoon triggers (0.18 sec)
  https://jubilant-bassoon.jeffunglesbee.workers.dev
Current Version ID: 07c3f8e6-b1ef-4a9a-bcea-f976918dd8aa
```

`/index.html` and `/sw.js` are explicitly in the uploaded-asset list —
this is the same `index.html` that has carried
`NFL_DRAMA_PROFILES` (32 real teams) and the escalating-milestone
`period>=5` MLB no-hitter tiering since earlier today's commits. This
deploy is the first time either has left `main` and reached Cloudflare.

## Known gap, disclosed honestly (not worked around)

The CC-CMD's own Task 2 verification command
(`curl -s https://jubilant-bassoon.jeffunglesbee.workers.dev/ | grep ...`)
**could not be run from this session** — both `curl` and `WebFetch`
against this exact domain returned a real `403 Forbidden` from this
sandbox's own network proxy (confirmed via `curl -v`: the proxy's
`CONNECT` tunnel to `jubilant-bassoon.jeffunglesbee.workers.dev:443`
itself was rejected, before any request ever reached Cloudflare). This
is a sandbox egress restriction on this specific domain, not a site or
deploy failure — the Cloudflare deploy log above is real, independent
proof the deploy happened, obtained through a different channel (the
GitHub Actions job log, not the live site itself).

**Unblock criteria for the literal curl check**, per Rule 74: run it
from anywhere with unrestricted egress to
`jubilant-bassoon.jeffunglesbee.workers.dev` — a real browser, a
different sandbox, or Jeff's own machine:
```
curl -s https://jubilant-bassoon.jeffunglesbee.workers.dev/ | grep -o "NFL_DRAMA_PROFILES = {[^}]\{0,80\}"
```
Expected: a real per-team entry (e.g. a `"KC":` numeric value), not
empty. Given the Cloudflare deploy log's explicit asset list, this is
expected to pass — but is disclosed as unverified-by-this-exact-command
rather than assumed.

smoke.js: 965 passed, 0 failed (Task 1's commit). No SW_VERSION bump
needed for Task 1 itself (workflow YAML isn't a deploy-gate trigger
path and doesn't touch app code); the deploy's own "Sync SW_VERSION to
deploy date" step ran automatically as part of this dispatch (see job
steps — "Sync SW_VERSION to deploy date": success, "Commit SW_VERSION
sync back to repo": success), which is the workflow's own existing,
untouched behavior.

## Status: DONE. Deploy gap from CC-CMD-2026-08-02-URGENT-trigger-
deploy-gate is closed with a real, working fallback, proven by a real
dispatch + real deploy log. One sub-verification (direct curl to the
live site) is blocked by sandbox egress and disclosed with exact
unblock steps, not silently skipped or assumed.
