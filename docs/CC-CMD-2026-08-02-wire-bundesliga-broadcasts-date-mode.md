# CC-CMD-2026-08-02-wire-bundesliga-broadcasts-date-mode

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-wire-bundesliga-broadcasts-date-mode.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

`docs/CC-CMD-2026-08-02-wire-bundesliga-broadcasts-into-client.md`
shipped real Bundesliga game-card creation (re-enabled `SOCCER_LEAGUES`)
but explicitly deferred the resolve-dayid→broadcasts wiring because
ESPN provides no per-game matchday number. That blocker is now real
and gone: `field-relay-nba`'s `docs/CC-CMD-2026-08-02-resolve-dayid-date-mode.md`
shipped and live-verified a `date=YYYY-MM-DD` mode on `resolve-dayid`
that needs only a real date — which every ESPN-fetched game already
has (`ev.date`).

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Confirm live, fresh, that `/bundesliga-bapi/resolve-dayid` accepts
  `date` (not `matchday`) and `/bundesliga-bapi/broadcasts` are both
  still deployed and working — call both for a real, known
  (season, date) pair via CI (this sandbox cannot reach the relay
  directly).
- Re-read `fetchSoccerFixtures()` (`src/legacy/field.js`) fresh — confirm
  the exact shape of `ev.date` for a Bundesliga event and where
  `streams:resolveBundle(bundle)` is set, since that's the real
  attachment point.

## Task 2 — Wire the chain

- For Bundesliga games only (`league === 'ger.1'` inside
  `fetchSoccerFixtures`), after building the games array for the
  fetched date: derive `season` (`YYYY-YYYY` format, Jul-Dec → 
  `${year}-${year+1}`, Jan-Jun → `${year-1}-${year}` — same real
  convention the relay's own date-mode already uses) and `date`
  (`YYYY-MM-DD`) from the real fetch date (not per-game — all games in
  one `fetchSoccerFixtures` call share the same `dateStr` already).
- Call `resolve-dayid?season=X&date=Y` **once** for that date (not once
  per game — Rule 78 rate-limit guard), then `broadcasts?comId=X&dayId=Y`
  once with the result.
- If both calls succeed and `data.broadcasts` is a real non-empty
  array, merge real broadcaster names into each Bundesliga game's
  `streams` for that date (max 2 fallback levels total per Rule 76:
  real per-match broadcasters when available, the existing static
  `BUNDESLIGA` bundle otherwise — do not add a third level).
- Real failure handling: any relay call failing, timing out, or
  returning `available:false` must silently keep the existing static
  bundle — never break the rest of the game card, never throw.
- Honest empty-state handling: `data.broadcasts: []` (real, confirmed
  shape during preseason) is not a failure — treat it the same as "no
  real per-match value returned," fall back to the static bundle
  without logging it as an error.

## Task 3 — Smoke + real verification

- `node smoke.js` — 0 failures required.
- Real verification of the season/date derivation logic specifically
  (pure function, testable without any live game existing yet): for a
  representative set of real dates spanning a full season (e.g.
  2026-08-28, 2026-12-31, 2027-01-01, 2027-05-16), assert the derived
  season string matches the real convention.
- End-to-end verification against a real live Bundesliga game card
  cannot happen until `2026-08-22` (the real break-window resume date
  this session's own prior CC-CMD found and used) — state this plainly
  in the outbox with the exact command to run then.

---

## Explicitly NOT in scope

- Do not touch the relay (`resolve-dayid`, `broadcasts`) — both are
  already correct and live.
- Do not build support for any league beyond Bundesliga in this pass.
- Do not change `SOCCER_LEAGUES`'s existing Bundesliga entry beyond
  what's needed to wire this in.

---

## Outbox

`outbox/cc-session-2026-08-02-wire-bundesliga-broadcasts-date-mode.md`:
Task 1's fresh confirmation both relay routes work, the shipped
wiring, the season/date-derivation unit verification, and the exact
follow-up command for the Aug 22 live check.
