# CC Session — esbuild Phase 7
**Date:** 2026-07-18
**Scope:** MY_TEAMS + isFeaturedTierGame → src/utils/preferences.js (investigation only — extraction blocked)
**HEAD:** 4d8dcd6 (unchanged — no commit)

## Smoke
- Start: 958/0
- End: 958/0 (no changes)

## SW_VERSION
Not bumped.

## Commits
None. Extraction not performed.

## TASK 1 — Mutability investigation (35 pts — sole scored task)

**Verdict: MY_TEAMS is genuinely mutable runtime state. Phase 5/6 pattern does NOT apply.**

Evidence:
- **L19786:** `let MY_TEAMS = new Set(JSON.parse(localStorage.getItem('field_my_teams')||'[]'));`
  - Declared `let`, not `const`. Populated from localStorage at boot.
- **L35351:** `MY_TEAMS.has(name) ? MY_TEAMS.delete(name) : MY_TEAMS.add(name);`
  - Mutated at runtime via user toggle (add/remove favorite team).
- **L19788:** `localStorage.setItem('field_my_teams', ...)` — persisted on mutation.
- **L20453:** `navigator.serviceWorker.controller.postMessage({type:'PREF_UPDATE',key:'my_teams',...})` — broadcast to SW on mutation.
- **40 total references** in field.js — rendering, filtering, diff detection, journalism prompts.

This is categorically different from `WX_DIR` (static 16-element array) and `VENUE_COORDS` (static lookup table). `MY_TEAMS` is live user preference state owned by field.js.

**isFeaturedTierGame (L6690):**
```js
function isFeaturedTierGame(g) {
  const rank = Math.min(g.homeCuratedRank ?? 99, g.awayCuratedRank ?? 99);
  if (rank <= 25) return true;
  if (MY_TEAMS.has(g.home) || MY_TEAMS.has(g.away)) return true;
  if (typeof isScoutsPick === 'function') {
    try { if (isScoutsPick(g)) return true; } catch(_e) {}
  }
  return false;
}
```
Reads `MY_TEAMS` directly. Could technically be extracted standalone (reads MY_TEAMS as a global, would resolve via globalThis.MY_TEAMS if bridged) — but the CC-CMD pairs them as a unit, so a separate authorization is needed.

**Why the bridge pattern breaks for MY_TEAMS:**
The globalThis bridge exports a reference at import time (`globalThis.MY_TEAMS = MY_TEAMS`). For a `Set`, in-place mutations (`.add`/`.delete`) would be visible through the bridge — the reference is shared. However:
1. The `let` binding means the variable could be reassigned (future risk)
2. Moving ownership out of field.js while the mutation code stays in field.js creates a split-ownership model not needed by the current architecture
3. The CC-CMD explicitly requires checking mutability before assuming the pattern applies — and it is mutable

**Score: 35/100. Below 95 threshold. No extraction performed.**

## Done condition met

Per CC-CMD: *"TASK 1 honestly reports real mutability found, with a clear explanation of why this specific pair needs different handling than Phase 5/6 — a valid, complete, high-confidence outcome, not a failure."*

## What a correct Phase 7 would look like (carry-forward, needs new CC-CMD)

Two valid options if extraction is desired:

**Option A — Extract isFeaturedTierGame alone (MY_TEAMS stays in field.js):**
- `src/utils/tier-game.js`: `export function isFeaturedTierGame(g){...}` — reads MY_TEAMS as a bare global (resolves via globalThis.MY_TEAMS bridge at runtime)
- `src/main.js`: `import { isFeaturedTierGame }` + `globalThis.isFeaturedTierGame = isFeaturedTierGame`
- MY_TEAMS stays exactly where it is — no extraction, no bridge needed for the state itself
- Risk: `isFeaturedTierGame` calls `isScoutsPick` as a bare global too — that already has a globalThis bridge (Phase 3 series), so it resolves correctly

**Option B — Leave both in field.js permanently:**
- MY_TEAMS is application state, not a utility. The esbuild extraction thread targets stateless utility functions and static data constants. MY_TEAMS doesn't fit that scope cleanly.
- Lowest risk option — note it as explicitly out of scope for the extraction thread.

Both options require a new CC-CMD with explicit authorization. This session's scope was investigation only.
