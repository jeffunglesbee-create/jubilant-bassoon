# CC-CMD-2026-08-02-URGENT-trigger-deploy-gate

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**PRIORITY: execute immediately, this is the only open item.**

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-URGENT-trigger-deploy-gate.md. Execute the single task.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What's wrong

`docs/CC-CMD-2026-07-30-escalating-milestone-modifiers.md` and
`docs/CC-CMD-2026-07-30-revive-nfl-drama-profiles.md` both shipped real,
correct code to `main` earlier today — confirmed independently by chat,
directly reading the committed source (`period>=5` escalating tiers;
`NFL_DRAMA_PROFILES` with real per-team values, e.g. `"ARI":42.7`).

**Neither has ever deployed.** Confirmed by chat via two direct curl
checks against the live site, several minutes apart, identical stale
byte count both times, zero references to either feature.

**Root cause, confirmed by reading `.github/workflows/deploy-gate.yml`
directly:** this is the only workflow that actually deploys (via
`wrangler`). It triggers ONLY on a push to `main` touching `index.html`/
`sw.js`/`field_utils.js`/`wrangler.jsonc`, and `[skip ci]` in a commit
message skips it entirely, by explicit design (its own header comment
says so). Every relevant commit today apparently carried `[skip ci]`.
**This workflow has no `workflow_dispatch` trigger — it cannot be
manually re-fired.** The only way to unblock it is a genuine, ordinary,
non-`[skip ci]` push touching one of those four paths.

## The single task

Make any trivial, harmless, non-`[skip ci]` commit touching `index.html`
— a comment addition is sufficient, no logic change needed or wanted.
Since deploy-gate.yml's own first step (`Sync SW_VERSION to deploy
date`) already handles version bumping automatically once triggered, no
other file needs to change.

Suggested exact change (or equivalent — the content doesn't matter, only
that it's a real, non-skip-ci push to `index.html`):

```html
<!-- deploy-gate trigger 2026-08-02: unblocks NFL drama profiles +
     escalating milestone modifiers, both already correct on main,
     blocked only by prior [skip ci] commits never reaching this
     workflow's push-path trigger -->
```

Placed anywhere safe (e.g. immediately after `<title>`).

**Commit message must NOT contain `[skip ci]`** — that's the entire
point of this commit.

## Verification

- `node smoke.js` — 0 failures required (should pass trivially, no
  logic touched).
- After push, confirm `deploy-gate.yml` actually fires and succeeds
  (`get_ci_status` / GitHub Actions tab).
- Real, live confirmation once deployed:
```
curl -s https://jubilant-bassoon.jeffunglesbee.workers.dev/ | grep -c "NFL_DRAMA_PROFILES\|period>=5"
```
Should return a nonzero count. Currently returns 0.

---

## Explicitly NOT in scope

- No logic changes of any kind.
- Do not touch anything related to the BracketDO guard — separate,
  already resolved (confirmed working, see chat history same session).
- Do not re-litigate whether the NFL data or milestone code themselves
  are correct — both already independently verified by chat directly
  against committed source.

---

## Outbox

`outbox/cc-session-2026-08-02-urgent-deploy-gate-trigger.md`: confirm
deploy-gate.yml fired and succeeded, and confirm via the live curl check
above that both features are now genuinely live, not just deployed.
