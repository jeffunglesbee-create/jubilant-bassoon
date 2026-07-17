# Note for Claude Code — MLS API status correction + one remaining broadcast label fix

**Date:** 2026-07-17
**Source:** chat session, cross-referencing Drive docs (May 24 + June 30 2026 sessions)

## Why this note exists

A chat session tonight initially answered "does an official MLS API exist" using only the May 24 2026 Drive doc, which concluded no — `stats-api.mlssoccer.com` was confirmed production but undocumented, no developer access. That answer was stale. A June 30 2026 session (Drive doc `1Dg_QfPKh6DXgU-vjLWMke6q_5y0_nlPzPzGeYkBPcnM`) already resolved this — the user manually added `stats-api.mlssoccer.com` to the network allowlist between those two sessions, and FIELD has been running against it directly since. Writing this down so it doesn't get re-litigated a third time.

## Current, correct MLS data-source status (confirmed as of 2026-06-30, should still hold)

- `stats-api.mlssoccer.com` is the real, official, "league one" MLS API — genuinely accessible, no auth required.
- Real relay bug fixed that session: `MLS_STATS_BASE` was referenced but never defined at the `/mls/stats/*` route handler (~line 9574 at the time), throwing a silent 1101 error on every request since it shipped, never caught because the route wasn't tested end-to-end.
- Real endpoints confirmed working: `/mls/stats/competitions`, `/mls/stats/matches/seasons/{id}`, `/mls/stats/competitions/{id}/seasons/{id}/standings`.
- Schedule seed script (`scripts/seed-mls-return-2026.py`) was fully rewritten to pull from this source directly instead of the old, dead `api-sports.io` path. Canonical team names now match MLS's own naming (D.C. United, Red Bull New York, Los Angeles Football Club — not the old api-sports names).
- Weekly Monday cron added to catch reschedules going forward.

**If a future session needs MLS data and starts from an assumption that "no official MLS API exists," that assumption is wrong — check `stats-api.mlssoccer.com` access and the June 30 doc first.**

## Real, small, still-open item found tonight while verifying broadcast bundles

`SR.apple`'s label (index.html, ~line 6214) still reads `"Apple TV+"` — the retired name. MLS Season Pass was discontinued December 2025; the service is now branded plain "Apple TV." This is a live-displaying issue, not dead code — `apple` is actively referenced in both `MLS_FOX` and `MLS_FS1` bundle arrays (confirmed real, already correctly built), so every MLS card currently showing an Apple TV chip displays the wrong, retired name.

Also found, lower priority: `SR.mlspass` (~line 6266, `"MLS Season Pass via Apple TV+ required"`) is a fully stale entry — confirmed zero real references anywhere beyond its own definition, genuinely orphaned, not actively misleading anyone since nothing points to it. Safe to remove whenever convenient, not urgent.

**Suggested fix, small and self-contained:**
1. `SR.apple[0]`: `"Apple TV+"` → `"Apple TV"`
2. Remove the orphaned `SR.mlspass` entry (confirm zero references first, don't assume — re-check, this note could be stale by the time it's read)
3. Real forced test: confirm an MLS card using `MLS_APPLE`/`MLS_FOX`/`MLS_FS1` renders "Apple TV" not "Apple TV+"
4. `node smoke.js index.html` — 0 failed

No relay dependency. Client-only change.
