# CC-CMD-2026-08-02-add-football-to-date-fixtures-sweep

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-add-football-to-date-fixtures-sweep.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## The real gap, confirmed directly

`goToDate(iso)` navigates to any date via real UI arrows. For dates
outside today and the hardcoded Thu–Sun set, it calls
`fetchESPNFixturesForDate(iso)` — a free, fast ESPN sweep — before
falling back to a slower, token-costing AI schedule generator.

`fetchESPNFixturesForDate`'s `FETCH_LEAGUES` array explicitly lists
NBA, WNBA, golf, NHL, MLB, and every `SOCCER_LEAGUES` entry. **NFL and
CFB are both absent.** Navigating forward to any future NFL or CFB
date currently skips the free path entirely and falls through to AI
generation — slower, real cost, and real fabrication risk for a
CFB Saturday's game-count volume specifically.

## Task 1 — Re-verify from HEAD, and confirm the real risk before assuming a fix (Rule 87)

**Do not assume `FETCH_LEAGUES`'s existing per-entry mapping logic
works correctly for football just because it works for the other five
sports.** The July 3 2026 CC-CMD that first wired NFL/CFB into
`/v2/games` (`adaptESPNFootball`) exists specifically because American
football's scoring shape didn't fit the existing baseball/basketball/
soccer mapper — the same real risk applies here. Read
`fetchESPNFixturesForDate`'s current per-event `games = events.map(...)`
logic in full before adding football entries, and confirm concretely
whether it needs its own branch (matching how golf already gets one
for its individual-sport shape) or whether the existing non-golf path
genuinely already produces correct home/away/score data for football
events. Do not assume either way — check the real ESPN response shape
for a real NFL or CFB event directly.

Also re-confirm CFB's `groups=80` FBS-filter requirement (established
July 3/28) and how to correctly append it to this function's URL
construction — as a real query param, not embedded inside the league
path segment, matching a real, previously-caught bug of exactly that
shape.

## Task 2 — Add the two entries, correctly

Add NFL and CFB to `FETCH_LEAGUES`, using the confirmed real
`espnSport`/`espnLeague` values from the existing, working
`adaptESPNFootball` adapter (`'football'`/`'nfl'` and
`'football'`/`'college-football'` — re-verify these exact values fresh
rather than trust this doc's memory of them). If Task 1 found the
generic event-mapping needs a football-specific branch, add it,
matching the pattern golf already establishes for its own special
case. If it doesn't, state that plainly rather than adding
unnecessary special-casing.

## Task 3 — Smoke + real verification

- `node smoke.js` — 0 failures required.
- Real verification: call `fetchESPNFixturesForDate` (or trigger
  `goToDate`) for a real, current NFL preseason date if one exists, or
  the real Sept 10 2026 NFL date already confirmed working elsewhere
  in this codebase (49ers @ Rams) — confirm real games come back with
  correct home/away/score fields, not just a non-empty response.
- Separately confirm a real CFB date (Aug 29 2026, the confirmed
  season opener) returns real games with `groups=80` correctly applied
  as a query param.
- Confirm this doesn't regress the existing five sports already in
  `FETCH_LEAGUES` — spot-check one non-football date still works
  identically to before.

---

## Explicitly NOT in scope

- Do not touch the hardcoded Thu–Sun `buildDateSchedule` path.
- Do not touch `adaptESPNFootball` or `/v2/games` — this is specifically
  the forward-navigation fixtures sweep, a separate code path.
- Do not add tennis/rugby/cricket or any other currently-AI-only sport
  — scope is football only, matching the real gap found.

---

## Outbox

`outbox/cc-session-2026-08-02-add-football-to-date-fixtures-sweep.md`:
whether football needed its own mapping branch or reused the existing
one (with the real evidence either way), and real verification against
both a real NFL date and the real Aug 29 CFB opener.
