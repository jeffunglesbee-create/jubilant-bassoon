# CC-CMD-2026-08-02-URGENT-trigger-deploy-gate

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Priority: URGENT — real, verified, user-facing features are sitting on main, fully correct, and have never deployed.**

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-URGENT-trigger-deploy-gate.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What happened — confirmed, not guessed

`deploy-gate.yml` (the only workflow that actually deploys to
Cloudflare) triggers exclusively on a direct push to `main` touching
`index.html`/`sw.js`/`field_utils.js`/`wrangler.jsonc` — and by its own
documented design, `[skip ci]` in a commit message skips it entirely.
Every commit that landed today touching those paths carried
`[skip ci]` (the NFL drama profiles data commit explicitly, by the
`update-drama-profiles.yml` workflow's own design; apparently the
byte-headroom fix commit too, though not documented as such).

Confirmed directly: `deploy-gate.yml` does not appear anywhere in
real, recent CI history (`get_ci_status`/`get_deploy_status`), despite
multiple commits to `index.html` having landed. Confirmed directly on
the live site itself: `NFL_DRAMA_PROFILES` and the escalating-milestone
`period>=5` code are both present on `main`, both correct, and both
**completely absent from the deployed site** — two separate curl
checks, minutes apart, identical stale byte count.

**This CC-CMD exists only because chat's own write access is
correctly restricted to `docs/` — it cannot touch `index.html`
directly, by design. This is that restriction working as intended,
not a workaround for it.**

## Task 1 — the fix (single line, already fully specified)

Bump `SW_VERSION` by one suffix letter in **both** `sw.js` and
`src/legacy/field.js` (matching this repo's own existing convention —
same pattern `deploy-gate.yml`'s own "Sync SW_VERSION" step performs
automatically on every real deploy). Confirm the exact current value
fresh from HEAD before editing (do not assume it is still
`'2026-08-01f'` — re-verify, since this doc's own writing and this
CC-CMD's execution are not simultaneous).

- **Do NOT use `[skip ci]` in the commit message.** This commit's
  entire purpose is to trigger `deploy-gate.yml`'s push-path trigger.
- No other change. This is a pure trigger commit — the real content
  (NFL data, milestone modifiers, BracketDO guard) is already on
  `main` and will deploy automatically once this commit lands.

## Task 2 — confirm the real deploy actually happened

- After pushing, poll `get_deploy_status`/`get_ci_status` for a real
  `deploy-gate.yml` run against this commit, and wait for it to
  complete (~24s per the workflow's own header comment).
- Real, live verification — do not just trust a green CI checkmark:
  ```
  curl -s https://jubilant-bassoon.jeffunglesbee.workers.dev/ | grep -o "NFL_DRAMA_PROFILES = {[^}]\{0,80\}"
  ```
  Must show real per-team data (e.g. `"KC":56.2`), not empty or absent.
  Also confirm `period>=5` is present (the milestone-modifiers change).

---

## Explicitly NOT in scope

- Do not touch any feature logic — this is a version-bump-only commit.
- Do not investigate why past commits carried `[skip ci]` as a
  separate task here — that's worth a follow-up, not blocking this fix.

---

## Outbox

`outbox/cc-session-2026-08-02-trigger-deploy-gate.md`: the real
deploy-gate run confirmed, and the real curl output proving the live
site now reflects what's been sitting correct-but-undeployed on main.
