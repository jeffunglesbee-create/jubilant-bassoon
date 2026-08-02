# FIELD HANDOFF

**Anchor:** CLIENT HEAD 353b1f9 · 2026-08-02T18:00Z · via chat (mid-session, not a close)
RELAY HEAD f711797 · 2026-08-02T18:00Z · via chat
Smoke: 965/0 (client, verified fresh this update, not reused from an earlier check)
SW version: 2026-08-02f (index.html/sw.js in sync as of this update)

**Note: this is a mid-session handoff write, not a session close.** Jeff
explicitly asked for the handoff written without ending the session —
work is continuing in the same conversation. This exists so a crash or
a different model picking up this thread has accurate current state.

---

## What's live and verified as of this handoff

- **LaLiga standings**: `/laliga-apim/clasificacion` relay route live,
  wired into production (FD primary, apim as non-blocking dev
  cross-check). Confirmed `available:true` directly.
- **Bundesliga broadcasts, full chain**: `resolve-dayid` (matchday or
  date mode, D1-cached) → `broadcasts` proxy, both live on relay.
  Wired into jubilant-bassoon's client via a real historical-fixture
  proof. `SOCCER_LEAGUES` restored for Bundesliga specifically (was
  empty — see open items below for the other 3 leagues).
- **BracketDO visibilitychange guard**: confirmed correct and live,
  independently verified twice (chat's own CI diagnostic + production's
  manifest evidence).
- **NFL drama profiles**: real nflverse data live, Sept 1 refresh
  workflow scheduled.
- **Escalating milestone modifiers**: MLB no-hitter tiering live.
  Win/hitting-streak bonuses also now live (closed this session — see
  below).
- **ESPN standings bug fixed, all 4 sports** (MLB/NBA/NHL/NFL) — the
  "▼ Table" feature was silently broken product-wide
  (apis/site/v2/.../standings returning zero entries); fixed via
  ESPN_STANDINGS_BASE pointing at apis/v2. Confirmed live for all four.
- **Cloudflare Browser Rendering**: new relay capability
  (env.BROWSER — was already present from an earlier addition, not
  actually new infra as originally assumed), backing `resolve-dayid`
  only. D1-cached, proven (8347ms cold / 162ms cached).
- **deploy-gate.yml now has a workflow_dispatch fallback** in addition
  to its original push-only trigger — added after a real, unexplained
  incident where a well-formed push didn't fire the workflow (root
  cause not found — likely needs GitHub's own webhook delivery log,
  human-only access).

## Open items — real, not placeholder

1. **La Liga / Serie A / Ligue 1 still missing card-creation.**
   `SOCCER_LEAGUES` was found empty (stale comment claiming "all on
   api-sports.io V2") — fixed for Bundesliga only, in scope. The other
   three almost certainly have the same gap, invisible only because
   all four leagues are currently in their off-season. Needs a CC-CMD
   before any of them come back into season.

2. **Bundesliga broadcast field-name shape is genuinely unconfirmed.**
   Not a bug — the real endpoint only serves current/near-term data,
   never historical (8 matchdays checked across the entire completed
   2025-26 season, all empty). Can't be resolved until real
   current-season data exists — Aug 28+ (confirmed real season start
   date).

3. **index.html byte ceiling hit twice this session** on ordinary
   feature work (NFL drama profiles' data injection needed a
   same-session byte-reclaim fix to land). Needs Jeff's decision:
   raise the ceiling, or treat byte-reclaim as standing overhead going
   forward.

4. **deploy-gate.yml's original push-trigger silent-failure incident**
   was never root-caused. Not currently blocking (workflow_dispatch
   fallback proven working), but the underlying mystery — a real,
   well-formed commit that didn't fire an unconditional push trigger —
   is unresolved. GitHub's own webhook delivery log would show why;
   only visible to a human with repo admin access.

5. **field-playground's BundesligaBroadcasters** was fully rebuilt
   this session against the real, live routes (was pointed at a route
   that was never built). Confirmed correct and deployed.

6. **field-playground's GameSymphonyArchive** had a real crash bug
   (dramaLeaderboard passed directly as a resource source, re-throwing
   on a genuine underlying error) — same bug class as BsdXgPanel/
   WcBracketTree/Newspaper earlier. Fixed with the same established
   guard pattern, confirmed clean, deployed.

## Documentation

Full session documentation for July 28 – August 2 written to Drive as
4 parts (each under the 220KB limit), parent folder 0ABxH84VndHL7Uk9PVA:
- Part 1: Jul 28–30 (playground foundations, drama-scoring validation)
- Part 2: Jul 30–Aug 1 (Savant fix, soccer 4-layer investigation, WP
  trilogy, DramaSoundscape iteration, BracketDO audit part 1)
- Part 3: Aug 1–2 (LaLiga/Bundesliga discovery + v1→v2 wiring,
  BracketDO guard closed)
- Part 4: Aug 2 (deploy-gate incident, ESPN standings bug, Browser
  Rendering, Bundesliga loop closed, playground creative batch)

## Codex tracking state

cc-cmd-queue is current as of this handoff — stale PENDING entries
from earlier in this arc were corrected to DONE/SUPERSEDED with
pointers to where verification evidence lives, rather than left
inaccurate. Two product-continuity entries exist for the two
Jeff-decision items above (byte ceiling, webhook mystery).

## Session type note

This has been a mixed A/C/D session (daily updates, feature builds,
investigation) spanning multiple real work threads without a clean
type boundary — documented as such rather than forced into one
category.
