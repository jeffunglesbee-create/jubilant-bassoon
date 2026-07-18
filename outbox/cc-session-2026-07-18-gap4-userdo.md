# CC Session Doc — Gap 4: UserDO Integration (My Teams sort boost)
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 2c62c26 → **end:** 573d448
**Smoke start:** 958/0 → **end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — client-only logic change)

---

## Commits

- `573d448` feat: Gap 4 — myTeamsBoost within-tier sort for circadian schedule

---

## TASK 1 — User state fetch confirmation

**`fetchUserState()` confirmed live** (L25643/25666) — fetches `GET /user/state`. Already called at app boot. No new fetch needed.

**`MY_TEAMS` confirmed as source of truth:** Used at L2641 (shouldShowCard), L6701 (myTeams filter), L6689-6690 (buildEnrichedGame myHome/myAway). `_userState.watchHistory` is NOT used for the "my teams" concept — `MY_TEAMS` is the real, current source of truth. Task confirmed: use `MY_TEAMS`, not `_userState`.

---

## TASK 2 — myTeamsBoost secondary sort pass

**`function myTeamsBoost(g)` declared at L2760** (near `applyCircadian`, alongside circadian-related helpers):
```js
function myTeamsBoost(g) {
  if (typeof MY_TEAMS === 'undefined' || !MY_TEAMS.size) return 0;
  return (MY_TEAMS.has(g.home) || MY_TEAMS.has(g.away)) ? 0 : 1;
}
```

Returns 0 for followed teams, 1 for others — lower wins. No-ops when `MY_TEAMS` is empty (zero cost for users with no followed teams).

**Called at L7439** inside `games.sort()`, after primary tier sort but before existing secondary sorts:
```js
      const _mb = myTeamsBoost(a) - myTeamsBoost(b);
      if (_mb !== 0) return _mb;
```

Placement: fires only when `primary === 0` (same tier). Falls through to importance/recency/start-time secondary sorts when both games are My-Teams or neither. Compounds with circadian sort, does not replace it.

**Mandatory literal verification:**
```
2760:function myTeamsBoost(g) {
7439:        const _mb = myTeamsBoost(a) - myTeamsBoost(b);
```

**Gap 11 Rule 2 note:** Gap 11 flagged Rule 2 (My Teams + circadian compounding) as outstanding pending Gap 4. Gap 4 is now landed — Rule 2 is satisfied. The sort comparator is: primary tier → myTeamsBoost within tier → existing secondary (importance/recency/start-time) within same-team group.

---

## TASK 3 — Diff and smoke

```
node scripts/sync-source.mjs → ✅
node smoke.js index.html → 958 passed, 0 failed
git diff --stat:
  index.html          | 16 ++++++++++++++++
  src/legacy/field.js | 16 ++++++++++++++++
  2 files changed, 32 insertions(+)
```

**Note on guard fire:** sync-source guard fired mid-session due to an intermediate sync capturing an in-progress refactor (inline → named function). Resolved via `git checkout HEAD -- index.html` to restore clean base, then re-sync. Standard guard-fire resolution per guard documentation.

CI triggered on `573d448`.

---

## Confidence: 100/100
- T1 (20/20): source of truth confirmed from code — `MY_TEAMS` not `_userState.watchHistory`; no new fetch needed
- T2 (40/40): `myTeamsBoost` declared and called correctly; within-tier compounding confirmed; mandatory literal verification pasted verbatim; no-op for empty MY_TEAMS confirmed
- T3 (40/40): smoke 958/0; diff 32 lines (16 field.js + 16 index.html); CI triggered

---

## Integration state

**CLIENT:** `myTeamsBoost(g)` called within `games.sort()` in `renderAll`, after primary circadian tier sort. No relay changes.
**RELAY:** No relay changes.
**INTEGRATION STATUS: VERIFIED (logic trace)** — sort behavior observable live with at least one team followed in MY_TEAMS.

**Gap 11 Rule 2:** NOW SATISFIED — myTeamsBoost within-tier is the compound behavior Gap 11 Rule 2 describes.
