# CC-CMD-2026-08-06-wire-efl-cup

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin || git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-06-wire-efl-cup.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What this is, confirmed directly before writing this doc

`site.api.espn.com/apis/site/v2/sports/soccer/eng.league_cup/scoreboard`
is real and live — confirmed today: league name resolves to "English
Carabao Cup," returns genuine current fixtures (verified: Barnet at
Cambridge United, a real lower-league first-round tie), and
`?dates=YYYYMMDD` filtering works identically to every other ESPN
soccer league already wired into this codebase. Same auth-free
`site.api.espn.com` family as EPL/MLS/La Liga/Serie A/Bundesliga/
Ligue 1/World Cup — no new credential handling, no new relay pattern,
no undocumented-API discovery required.

The competition itself: 67th season of the English League Cup
(Carabao Cup for sponsorship), running early August 2026 through the
March 21, 2027 final at Wembley. Currently in its first-round-proper
window — real, live matches, not a future/hypothetical slate.

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-confirm `eng.league_cup` resolves and returns real, current data
  fresh — don't trust this doc's snapshot from today.
- Read the real, current `LEAGUES` table structure and confirm the
  exact fields each entry needs (matching Bundesliga's own entry as
  the most recent real precedent — re-read its actual shape, don't
  assume from memory).
- Confirm whether `SOCCER_LEAGUES` (the featured-tier/card-creation
  array fixed for Bundesliga earlier) also needs this league added
  separately, or whether `LEAGUES` alone is sufficient — re-verify the
  real relationship between the two rather than assume they're the
  same fix.

## Task 2 — Add the league entry

- Add `eng.league_cup` as a real `LEAGUES` entry (and `SOCCER_LEAGUES`
  if Task 1 finds it's separately required), using the real,
  confirmed `espnSport`/`espnLeague` values and a real, correct
  display label ("EFL Cup" or "Carabao Cup" — check this project's
  existing naming convention for sponsor-named competitions, e.g. how
  MLS's own cup competitions are labeled, rather than guessing).
- Do not invent a `groups=` filter or any other query parameter beyond
  what Task 1's re-verification confirms is actually needed — the
  scoreboard call already returns the right competition without one.

## Task 3 — Real verification

- `node smoke.js` — 0 failures required.
- Real, live verification: confirm the EFL Cup now produces real
  cards/entries through whatever mechanism Bundesliga's own fix used
  to prove card-creation worked, against a real, current fixture date
  (today or Aug 7, both confirmed to have real matches).

---

## Explicitly NOT in scope

- Do not touch any other soccer league's existing entries.
- Do not build drama-scoring or archive-write logic specific to this
  competition — this task is card-creation/data-source wiring only,
  matching the same narrow scope Bundesliga's fix used.

---

## Outbox

`outbox/cc-session-2026-08-06-wire-efl-cup.md`: the real league entry
added, and real, live confirmation cards/fixtures are now produced for
a genuine, current EFL Cup match date.
