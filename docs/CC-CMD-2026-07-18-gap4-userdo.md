# Claude Code Command — Gap 4: UserDO Integration (My Teams sort boost)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`, never `index.html` directly.

---

## CONTEXT

Source: Gap Closers doc, Gap 4. UserDO (`field-relay-nba/src/user-do.js`, confirmed real via `class UserDO` in source) tracks `watchHistory`, `seriesLedger`, `dramaticMomentsMissed` — none of it currently feeds into schedule sort order. This gap adds a within-tier boost: after the real circadian sort (Gap 5, confirmed live), user's tracked teams sort to the top of each tier without breaking the circadian ordering itself.

**Real, confirmed patent framing from the spec, worth restating:** no learned day-part profiles, no Rovi risk — My Teams is explicit user selection (an existing feature), not inferred from interaction monitoring, and the boost is identical at every time of day, not personalized by time.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "/user/state" src/legacy/field.js
grep -n "MY_TEAMS" src/legacy/field.js | head -5
grep -n "function.*[Ss]ort.*[Gg]ame\|circadianSort" src/legacy/field.js | head -5
node smoke.js index.html 2>&1 | tail -3
```

Confirm whether `/user/state` is already fetched client-side anywhere (some memory context suggests a "UserDO read loop" may already exist from a prior session — check don't assume either way) before building a new fetch.

---

## TASK 1 — Real confirmation: does a user-state fetch already exist?

If `window._userState` (or equivalent) is already populated by an existing fetch, use it — don't duplicate. If not, add the real fetch (`GET /user/state` from the relay, matching the spec's own pattern) once at load, storing to a real, clearly-named global.

## TASK 2 — Real sort boost, layered onto the existing circadian sort

After the confirmed, real circadian tier sort (from Gap 5), add a secondary pass: within each tier, games where `MY_TEAMS.has(home)` or `MY_TEAMS.has(away)` sort first, preserving relative order otherwise. This uses the already-existing `MY_TEAMS` set (confirmed present, used elsewhere in the codebase) — don't require `_userState.watchHistory` if `MY_TEAMS` already serves the same real purpose; check which one is the actual, current source of truth for "my teams" before building against a possibly-unused `_userState.watchHistory` field.

**Mandatory literal verification:**
```bash
grep -n "function.*[Mm]yTeams.*[Bb]oost\|myTeamsBoost" src/legacy/field.js
```
Paste real output.

## TASK 3 — Real diff and live verification

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

Real commit, real live CI confirmation, real content check confirming the sort order genuinely reflects the boost for a real My-Teams-tagged game.

---

## DONE CONDITION

Games matching the user's real, existing My Teams selection sort to the top within each circadian tier, using whichever real data source (`MY_TEAMS` or `_userState`) is confirmed to be the actual current source of truth — not a newly-invented parallel one — verified via real job logs and a real content/order check.

**Confidence scoring:**
- TASK 1 (20 pts): real confirmation of existing vs. new user-state source
- TASK 2 (40 pts): real sort boost, correctly layered on circadian tiers, uses the real current data source
- TASK 3 (40 pts): real diff, real live CI, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
