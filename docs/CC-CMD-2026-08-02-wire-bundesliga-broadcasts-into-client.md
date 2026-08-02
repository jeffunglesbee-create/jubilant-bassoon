# CC-CMD-2026-08-02-wire-bundesliga-broadcasts-into-client

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-wire-bundesliga-broadcasts-into-client.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Depends on a relay CC-CMD — confirm it landed before starting

`docs/CC-CMD-2026-08-02-proxy-bundesliga-broadcasts.md` (field-relay-nba)
must have shipped a real, live `/bundesliga-bapi/broadcasts` route
before this can proceed. **Task 1's first job is confirming that's
actually true, not assuming it from this doc's existence** — the relay
CC-CMD could still be pending.

## Real, current timeline — relevant to how this gets verified

Bundesliga's 2026-27 season starts **Friday, August 28, 2026**
(confirmed today via multiple sources: Bundesliga's own site,
Wikipedia, FC Bayern's own announcement — 26 days from today). The
site's current default view is the Franz Beckenbauer Supercup
(Bayern @ Dortmund, August 22 — a real, scheduled preseason fixture,
not a bug). **Full end-to-end verification against a genuine
regular-season matchday cannot happen until August 28.** This CC-CMD
should still ship — code-complete and logic-verified — with this
limit stated honestly, same pattern as the BSD-EPL work earlier this
session.

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Confirm both relay routes are live: `resolve-dayid` (already proven)
  and `broadcasts` (from the dependency CC-CMD above) — call both for
  real, fresh, right now.
- Confirm how Bundesliga games currently reach the client (likely
  ESPN's schedule feed, matching this project's existing pattern for
  other leagues) and whether season/matchday number is already
  available on each game object, or needs deriving.

## Task 2 — Wire the data flow

For a Bundesliga game: resolve season/matchday → call `resolve-dayid`
→ call `broadcasts` with the resolved IDs → surface the result in the
existing Arbitrage/broadcast display, matching how other leagues'
broadcast data already renders there. Do not build a new, parallel
display mechanism.

- Honest empty/not-yet-available state required — the Supercup and any
  other preseason fixture will likely return `{"broadcasts":[]}` (a
  real, confirmed response shape from earlier diagnostics), which is
  correct, not an error. Don't treat empty broadcasts as a failure.
- Real failure handling if either relay call fails: fall back to
  whatever this league currently shows without this data (nothing, if
  Bundesliga broadcast data has never been wired before) — don't let a
  relay hiccup break the rest of the game card.

## Task 3 — Smoke + real verification

- `node smoke.js` — 0 failures required.
- Real verification against whatever's currently live (the Supercup or
  any other scheduled preseason match) — confirm the full chain
  (resolve → broadcasts → display) works end-to-end for *something*
  real today, even though it won't be a real regular-season matchday
  until Aug 28.
- State plainly in the outbox that full regular-season verification is
  deferred to Aug 28, with the exact command/check needed then.

---

## Explicitly NOT in scope

- Do not touch `resolve-dayid` or the relay's broadcasts route.
- Do not build support for any league beyond Bundesliga in this pass.

---

## Outbox

`outbox/cc-session-2026-08-02-wire-bundesliga-broadcasts-into-client.md`:
confirmation both relay routes were live before starting, the real
data flow shipped, verification against today's real available data,
and the exact follow-up check for Aug 28.
