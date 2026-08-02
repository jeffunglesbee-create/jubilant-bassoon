# CC-CMD-2026-08-02-deploy-gate-workflow-dispatch

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Priority: follow-up to CC-CMD-2026-08-02-URGENT-trigger-deploy-gate — not urgent itself, but closes a real gap that turned that CC-CMD into a stuck state.**

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-deploy-gate-workflow-dispatch.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What happened — confirmed, not guessed

`CC-CMD-2026-08-02-URGENT-trigger-deploy-gate` pushed a real,
well-formed, path-matching, non-`[skip ci]` commit (`c6f3ac90`) meant
to trigger `deploy-gate.yml`'s push trigger. The workflow never fired
— confirmed by polling `list_workflow_runs` scoped to the workflow's
own numeric ID directly, ~7 minutes, zero runs (not even queued).
Ruled out with real evidence (see
`outbox/cc-session-2026-08-02-trigger-deploy-gate.md`): not
`[skip ci]`, not a stale HEAD, not a path-filter mismatch, not the
workflow being disabled, not a general webhook outage (three sibling
push-triggered workflows fired normally seconds earlier for the
immediately preceding push). Root cause of the non-firing itself is
**still unknown** — GitHub's own webhook delivery log (Settings →
Webhooks → Recent Deliveries) is the only place that would show it
directly, and that page is not reachable from any tool available to
chat or CC in this project.

**Confirmed separately, directly against GitHub's API:**
`deploy-gate.yml` has no `workflow_dispatch` trigger — a manual
dispatch attempt returned `422 Workflow does not have
'workflow_dispatch' trigger`. When the push trigger doesn't fire for
whatever reason, there is currently **no way to force a deploy**
short of another push and hoping.

This CC-CMD does not attempt to diagnose or fix the underlying
non-firing issue — that may not even be fixable from inside this repo
(it could be a GitHub-side delivery problem). It closes the actual gap
that turned one flaky trigger into a genuinely stuck state: no manual
escape hatch.

## Task 1 — Add `workflow_dispatch:` to `deploy-gate.yml`

Add a `workflow_dispatch:` entry alongside the existing `push:`
trigger in `.github/workflows/deploy-gate.yml`'s `on:` block:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'index.html'
      - 'sw.js'
      - 'field_utils.js'
      - 'wrangler.jsonc'
  workflow_dispatch: {}
```

- No other change to the workflow file. The job itself (`smoke-and-
  deploy`) already does the right thing regardless of trigger type —
  it doesn't reference `github.event_name` or any push-specific
  context that would behave differently under `workflow_dispatch`.
  Confirm this directly by reading the current file before editing
  (do not assume — re-verify the job body hasn't changed since this
  doc was written).
- Update the file's own header comment (lines 1-25) to document the
  new manual trigger path, matching the existing comment style (see
  the `[skip ci] BEHAVIOUR:` and `DATA-ONLY PUSHES:` blocks already
  there as the pattern to follow) — e.g. a `MANUAL TRIGGER:` block
  noting `workflow_dispatch` exists specifically for the case where a
  real push-path-matching commit doesn't fire the push trigger for
  reasons outside this repo's control.

## Task 2 — Prove it actually works, real dispatch, real deploy

- After pushing, dispatch the workflow manually:
  `actions_run_trigger` / `method: run_workflow`, `workflow_id:
  deploy-gate.yml`, `ref: main`. (No `inputs` needed —
  `workflow_dispatch: {}` takes none.)
- Poll `list_workflow_runs` scoped to the workflow's own ID
  (or `get_workflow_run`) until it completes. Confirm `conclusion:
  success` and that the run's `event` field reads `workflow_dispatch`
  (proves the new trigger path specifically, not a coincidental push
  run).
- Real, live verification — do not just trust a green CI checkmark:
  ```
  curl -s https://jubilant-bassoon.jeffunglesbee.workers.dev/ | grep -o "NFL_DRAMA_PROFILES = {[^}]\{0,80\}"
  ```
  Must show real per-team data (e.g. a `"KC":` entry with a numeric
  value), not empty or absent — this is also the first real
  confirmation that the NFL drama profiles / escalating-milestone /
  BracketDO-guard work from earlier today has actually reached
  production, which this CC-CMD's dispatch will cause as a side
  effect once it runs.

---

## Explicitly NOT in scope

- Do not investigate *why* the push trigger failed to fire for
  `c6f3ac90` — that's a GitHub-infrastructure-level question this repo
  can't diagnose further from inside a CC-CMD session. If it recurs,
  that's a separate, narrower follow-up (with a specific new failure
  to investigate), not open-ended speculation here.
- Do not remove or modify the existing `push:` trigger — this is
  additive only, a fallback alongside the normal path, not a
  replacement for it.
- Do not touch `concurrency:`, `permissions:`, or any step in the
  `smoke-and-deploy` job body.
- Do not touch any other workflow file.

---

## Outbox

`outbox/cc-session-2026-08-02-deploy-gate-workflow-dispatch.md`: the
real dispatched run's ID/conclusion, and the real curl output proving
the live site now reflects what was sitting correct-but-undeployed on
main since earlier today.
