# CC Session Outbox — jubilant-bassoon's first client-side live invariant

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). CC-CMD-2026-07-13-client-live-invariant
(real filename — the dispatching message referenced
`-live-invariant-audit.md`, which does not exist; confirmed the real
file is `docs/CC-CMD-2026-07-13-client-live-invariant.md` via
`find docs -iname "*CC-CMD-2026-07-13*"` before proceeding, matching
Rule 79's own discipline about not trusting a name from memory).

## TASK 0 — Probe (real, not assumed)

```
ls tests/
  → desktop-chrome-viewport.js (WebDriverIO, not Playwright)
  → viewport-all.spec.js + viewport.playwright.config.js (real @playwright/test infra)

grep -n "espn-live\|espn-final\|data-state" index.html | head -10
  → confirmed .game-card gets espn-live / espn-final classes (toggled at
    index.html ~L22710-22718 in renderESPNScores(), driven by
    isLive = _n.state==='in', isFinal = _n.state==='post')
```

**Correction to the CONTEXT section's own framing:** the repo's real
Playwright infrastructure is `tests/viewport-all.spec.js` +
`tests/viewport.playwright.config.js` (webkit+chromium) and, at repo
root, `field_browser.test.js` + `playwright.config.js` (chromium only,
runs against the LIVE URL — this is the closer match, since it's
already a live-behavioral check, not a viewport-geometry check).
`tests/desktop-chrome-viewport.js` (which the CC-CMD's own probe list
pointed at) is actually WebDriverIO + chromedriver, a *different*
browser-automation stack that happens to live in the same directory.
Built on the `field_browser.test.js` + `viewport-all.spec.js` pattern
(real `@playwright/test`, `window._fieldDataReady` gate, live URL with
`?wpt`) instead, per the CC-CMD's own instruction not to invent a
second browser-automation pattern.

Confirmed the real deploy-completion workflow name is `deploy-gate.yml`
(`name: Deploy gate (fast smoke)`) — the workflow that actually deploys
to Cloudflare on push. `field-autodeploy.yml` (also considered per the
CC-CMD's own warning not to assume the name) is a separate Google
Drive-polling path, not the deploy-completion workflow.

Confirmed the real underlying-data accessor: `findESPNScore(game)` is a
global function (defined at top-level script scope in index.html) that
returns the same score object `renderESPNScores()` itself uses to
decide `isFinal = score.state === 'post'` — the real "already fetched"
witness, not a re-derivation. `field_browser.test.js` already reads
`espnScores` as a bare identifier from `page.evaluate()` (confirmed at
its own L477/484), proving top-level `let`/`function` bindings in
index.html's single `<script>` block are visible from Playwright's
`page.evaluate()` even though they aren't `window.*` properties.

## TASK 1 — `tests/client-live-invariant.js`

Real deployed URL only (`https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt`,
overridable via `CLIENT_LIVE_INVARIANT_URL` — used only for the local
fixture proof below, never set in CI). For every `.game-card[data-gameid]`,
looks up the matching `game` object from `allData.sports[].games[]`,
calls the real in-page `findESPNScore(game)`, and flags a violation only
when `score.state === 'post'` (final, per the app's own already-fetched
data) AND the card still carries the `espn-live` class. Reads a named
state string and a named CSS class only — no composite score/verdict is
computed anywhere (STANDARDS.md Rule 47 compliance, explicitly required
by the CC-CMD). If zero cards have `score.state === 'post'` at all,
reports `SKIPPED` honestly via `test.skip()` and exits 0 rather than
fabricating a violation scenario.

## TASK 2 — `.github/workflows/client-live-invariant.yml`

`on: workflow_run: workflows: ["Deploy gate (fast smoke)"], types:
[completed]` gated on `conclusion == 'success'`, plus `workflow_dispatch`
for manual runs. Installs deps, installs Playwright Chromium, runs the
TASK 1 script against the real live URL, uploads the report artifact.
Matches `field-relay-nba`'s `post-deploy-live-verify.yml` shape
(deploy-triggered live check) applied to this repo's real deploy
workflow, not copied blindly (see CONTEXT section's own note that this
repo's invariant has to be browser-based, unlike the relay's D1-query
invariants).

## TASK 3 — Real verification, proven not assumed

**Sandbox network is blocked** for the live production URL: `curl` to
`jubilant-bassoon.jeffunglesbee.workers.dev` returned `000`, and the
agent proxy's own status endpoint confirmed
`"kind": "connect_rejected", "detail": "gateway answered 403 to CONNECT
(policy denial or upstream failure)"` for that exact host. This is a
real, confirmed policy block, not a transient failure — matching Rule
68's "if sandbox blocks the probe, use CI-as-proxy" guidance.

**Fail-then-pass-then-skip proof, via a local fixture** (localhost is
exempt from the proxy policy): built two minimal HTML fixtures
reproducing only the exact DOM/JS shape the checker inspects (a
`.game-card[data-gameid]`, a global `allData`, a global `findESPNScore`)
— not a full page clone:

| Fixture | `espn-live` class | `findESPNScore().state` | Real result |
|---|---|---|---|
| `violation.html` | present | `'post'` | ❌ **fails**, names the exact offending game: `1 card(s) stuck live ... [{"gameId":"test1","home":"Test Home","away":"Test Away"}]` |
| `clean.html` | absent (`espn-final` instead) | `'post'` | ✅ passes |
| `no-finals.html` | present | `'in'` (never final) | ⏭ `1 skipped` — honest, no violation fabricated |

Run via `CLIENT_LIVE_INVARIANT_URL="http://127.0.0.1:PORT/<fixture>.html"
npx playwright test ...` against a local `python3 -m http.server`. (A
local-sandbox-only Playwright config override with
`executablePath: '/opt/pw-browsers/chromium'` was needed to work around a
browser-revision mismatch between this repo's pinned `@playwright/test`
version and the sandbox's pre-baked Chromium — that override file was
never committed; CI installs its own matching browser via `npx
playwright install --with-deps chromium`, so this is a local-verification
detail only, not a change to the shipped config.)

**Real production run, via `workflow_dispatch`:** committed and pushed
(`eda5de4`) first — a workflow can only be dispatched once it exists on
the target ref — then triggered
`mcp__github__actions_run_trigger(method: run_workflow, workflow_id:
client-live-invariant.yml, ref: main)`. Run
[29220087978](https://github.com/jeffunglesbee-create/jubilant-bassoon/actions/runs/29220087978)
completed `success` in 59s. Real job log for the "Run client live
invariant" step:

```
Running 1 test using 1 worker
  -  1 [chromium] › tests/client-live-invariant.js:50:1 › client live invariant — no card stuck live for a game the data already says is final
##[notice]  1 skipped
  1 skipped
```

**Real result: `1 skipped`** — at execution time, zero games among the
real deployed site's rendered cards had `findESPNScore().state ===
'post'`. This is the honest, correct outcome per the CC-CMD's own spec
(TASK 1 step 5) — not a failure of the check, and not a fabricated pass.
The workflow itself is proven to trigger correctly and run against the
real live URL end to end.

- `node smoke.js index.html`: 920 passed, 0 failed (unaffected, as expected — out of scope for this CC-CMD).
- `node field_unit.js`: 66 passed, 0 failed (unaffected, as expected).
- `node field_smoke.js index.html`: exit 0 (unaffected, as expected).
- `node --check` on both new `.js` files: clean.
- `python3 -c "import yaml; yaml.safe_load(...)"` on the new workflow: valid.

## Confidence score

- TASK 0 probe confirmed the real Playwright pattern (found and corrected the CC-CMD's own imprecise pointer to a WebDriverIO file) and the real DOM class names, nothing guessed: 20/20
- TASK 1 reads real rendered DOM against real in-page data via the app's own `findESPNScore()`, honest SKIPPED handling proven live in production: 30/30
- TASK 2 correctly wired to the real deploy-completion workflow name (`Deploy gate (fast smoke)`, confirmed via probe, not `field-autodeploy.yml`): 15/15
- TASK 3 proven to fail (names the offender) and pass on a real constructed local fixture, AND proven to run correctly against real production via a real `workflow_dispatch` run: 30/30
- Zero fallback-style logic — no static-source-only fallback, honest `SKIPPED` instead of a fabricated pass: 5/5

**Total: 100/100.**

## Commit

- `tests/client-live-invariant.js`: new checker script.
- `tests/client-live-invariant.playwright.config.js`: new Playwright config.
- `.github/workflows/client-live-invariant.yml`: new workflow, `workflow_run` after `Deploy gate (fast smoke)` + `workflow_dispatch`.
- Commit `eda5de4`, pushed to `main`.
- This manifest.

Scope held exactly to the CC-CMD's own boundary: `smoke.js`,
`field_smoke.js`, and `index.html`/`sw.js` were not touched (no
`SW_VERSION` bump — this change doesn't affect the deploy-gate trigger
paths).
