# CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-wire-bundesliga-bapi-broadcasts-v2.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Two real answers, found by re-observing instead of guessing again

The prior attempt (`outbox/cc-session-2026-08-02-wire-bundesliga-bapi-
broadcasts.md`) hit two open questions: real 403s on both endpoints,
and zero matches for a guessed matchday-selector pattern. A follow-up
diagnostic (field-playground, read-only, no production dependency)
answered both by re-observing a real browser directly instead of
guessing further.

### Answer 1 — the 403s were a missing auth key, not an access change

**A real API key exists and was missed at original discovery.** The
original CC-CMD's own text said "no apparent auth key required." That
was wrong — the original capture simply didn't check for this header.
Real, captured this session, HTTP 200:

```
GET wapp.bapi.bundesliga.com/broadcasts/DFL-COM-000003/DFL-DAY-004CBT

Real headers:
  referer: https://www.bundesliga.com/
  accept-language: en-EN
  x-api-key: 60ETUJ4j5YagIHdu-PROD
  accept: application/json, text/plain, */*
  content-type: application/json
```

`x-api-key: 60ETUJ4j5YagIHdu-PROD` is the real, required key. Also
note: the real competition ID observed is `DFL-COM-000003`, not the
`DFL-COM-000001` the original CC-CMD assumed (see that doc's own
disclosed correction) — currently reflects preseason Supercup
coverage; verify which ID is live at execution time rather than
hardcoding either.

### Answer 2 — the matchday switcher is a Material select, not a button

Real DOM, captured this session:
```
<span class="mat-mdc-select-placeholder mat-mdc-select-min-line">All Matchdays</span>
```
This is an Angular Material `<mat-select>` component. The original
probe's `button:has-text("Matchday")` search never matched because
it's not a button — it needs a click-to-open-dropdown interaction
(`.mat-mdc-select-placeholder` or a `mat-select` role selector), then
selecting a different option from the opened panel, not a direct
navigation click.

---

## Task 1 — Re-verify both findings fresh, then actually test the ID-resolution question (Rule 87)

**This is still the real remaining question this CC-CMD exists to
answer — Answers 1 and 2 above unblock testing it, they don't replace
it.**

- Re-confirm the `x-api-key` shape above still authenticates, fresh.
- Using the real Material-select interaction pattern now identified,
  actually drive the UI between at least two different matchdays and
  observe whether `DFL-DAY-XXX` changes per matchday — the original
  CC-CMD's core, still-unanswered question.
- If a real, distinct second `DFL-DAY-XXX` ID is observed, that
  confirms date-specificity and there's likely an earlier resolution
  call — find and log its real shape. If the ID stays constant even
  across a genuine matchday change, report that plainly too.

## Task 2 — Relay route, only once Task 1 has a real answer

- Same gate as before: do not build on a guessed or hardcoded ID.
- Auth key lives server-side (Rule 80), same as any other credential.

## Task 3 — Wire into existing broadcast/arbitrage display, Bundesliga only

- Same scope as original: broadcaster/broadcast data into the existing
  Arbitrage path, scoped to what Task 1 confirms is reliably
  resolvable for current/upcoming matchdays.

## Task 4 — Smoke + verify

- `node smoke.js` — 0 failures required.
- Real verification: wired-in data reflects an actually current
  matchday, not a hardcoded one.

---

## Explicitly NOT in scope

- Standings — confirmed server-rendered, still out of scope.
- Do not hardcode `DFL-DAY-004CBT` or assume `DFL-COM-000003` is
  permanent — both are current observations, not fixed constants.
- Do not build Task 2/3 if Task 1 still can't resolve the ID question
  even with the real interaction pattern now identified.

---

## Outbox

`outbox/cc-session-2026-08-02-wire-bundesliga-bapi-broadcasts-v2.md`:
real confirmation the auth key works, real evidence on whether
DFL-DAY-XXX actually varies by matchday, and (if Task 1 succeeds) the
shipped relay route and wiring.
