# CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What's real, confirmed twice, independently

Real browser network capture (`field-playground/scripts/probe-
bundesliga-network-capture.mjs`, run twice via CI) found
`wapp.bapi.bundesliga.com` — real, working, no apparent auth key
required (unlike LaLiga's apim, which shipped a visible subscription
key; this endpoint returned 200 with none observed — confirm this
holds on re-check, don't assume). Two real endpoints, both
`application/json`, both 200:
- `/broadcasters?promoteInHeader=true`
- `/broadcasts/DFL-COM-000001/DFL-DAY-004CBT`

`DFL-COM-000001` is almost certainly a stable Bundesliga competition ID
(DFL = Deutsche Fußball Liga, the real governing body). **`DFL-DAY-
004CBT` is the real problem — it does not look like a constructible
sequence (not "matchday 4", an opaque alphanumeric suffix). It was
captured for whatever matchday the site happened to be showing during
the capture. This CC-CMD is not usable for anything beyond that one
match until this is resolved.**

Separately, definitively confirmed the same session: Bundesliga's
standings table is server-rendered (real team names present in the DOM
immediately on load, before any client fetch could run) — there is no
client-side standings API to find, structurally, not a "search harder"
situation. Do not attempt to find one.

---

## Task 1 — Resolve the real ID pattern before building anything (Rule 87)

**This is the actual hard part of this CC-CMD — do not skip to Task 2
with a guessed or hardcoded ID.**

**Any capture/probe scripts this task needs must live in THIS repo**
(e.g. `jubilant-bassoon/scripts/probe-bundesliga-bapi.mjs`), matching
this repo's own existing probe-workflow convention — not a call out
to `field-playground`'s script, which is cited above only as
provenance for where the original discovery came from. Production's
own CI must not depend on a separate, explicitly non-production
repo's scripts continuing to exist. Write an independent script here.

- Re-verify both captured endpoints still return real 200 data fresh,
  via CI (this sandbox cannot reach `bundesliga.com` directly — same
  pattern as the LaLiga investigation, use GitHub Actions).
- Run a new, targeted real network capture: navigate the real site
  between at least two genuinely different matchdays/dates (e.g., use
  any real date-switcher or fixture-list UI on bundesliga.com) and
  observe whether a DIFFERENT `DFL-DAY-XXX` ID gets requested for each.
  If so, that confirms the ID is date-specific and there is likely an
  earlier, schedule-listing call that resolves date → ID — find that
  call and log its real shape.
- If no such resolution call can be found after a genuine attempt,
  report that honestly rather than hardcoding the one captured ID as if
  it were general-purpose — a broadcast lookup that silently always
  returns one specific historical matchday's data regardless of what's
  actually happening today would be worse than not building this at
  all (fabricated-looking correctness).

## Task 2 — Relay route, only once Task 1 has a real answer

- Add a relay route proxying whichever endpoint(s) Task 1 confirms are
  genuinely usable for arbitrary/current matchdays — matching FD/FPL/
  BSD/apim's established routing conventions.
- If no auth key is genuinely required (confirm fresh, don't assume
  from the original capture), document that plainly — don't invent a
  server-side credential-handling step for something that doesn't need
  one, but do re-verify this is still true before concluding it.

## Task 3 — Wire into existing broadcast/arbitrage display, Bundesliga only

- This data is broadcaster/broadcast-availability information — the
  same category FIELD's existing Arbitrage feature already handles for
  other leagues. Wire it into that existing path for Bundesliga
  specifically, rather than building a new, parallel display mechanism.
- Scope to whatever Task 1 confirms is reliably resolvable (current/
  upcoming matchdays) — do not wire in the one historical matchday ID
  as a permanent fixture.

## Task 4 — Smoke + verify

- `node smoke.js` — 0 failures required.
- Real verification: confirm the wired-in data reflects an actually
  current matchday, not the one originally captured, proving Task 1's
  resolution mechanism genuinely works rather than just having been
  described.

---

## Explicitly NOT in scope

- Standings — confirmed server-rendered, no API exists, do not attempt.
- Do not hardcode `DFL-DAY-004CBT` anywhere as a fallback or default.
- Do not build anything in Task 2/3 if Task 1 cannot find a real
  resolution mechanism — report the honest limit instead and stop.

---

## Outbox

`outbox/cc-session-2026-08-02-wire-bundesliga-bapi-broadcasts.md`: the
real ID-resolution mechanism found (or the honest statement that none
could be found), whether an auth key is genuinely required, and
confirmation the wired-in data reflects a current matchday, not the
originally-captured one.
