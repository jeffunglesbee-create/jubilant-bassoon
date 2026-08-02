# CC Session Doc — 2026-08-02

Covers three CC-CMDs executed this session (jubilant-bassoon), per Rule 67.

## 1. CC-CMD-2026-08-02-bracketdo-visibilitychange-guard.md

**Status: SHIPPED, partially verified.**

Added a `visibilitychange` listener next to the existing `window._bracketWS`
singleton (BracketDO WebSocket client IIFE): closes the socket when the tab
backgrounds, reopens it when the tab becomes visible again and `wc-mode` is
still active.

**Verification (Rule 90 artifact):** `bracketdo_visibilitychange_probe.js`,
a real Playwright script run via a dedicated CI workflow
(`.github/workflows/bracketdo-visibilitychange-probe.yml`) against the live
deployed site. 4 real runs, each root-caused from actual manifest evidence
(`outbox/bracketdo-visibilitychange-probe-manifest-*.json`), not guessed:

1. `afterOpen.wcMode:false` — blind `toggleWCView()` closed an already-open
   WC mode (WC26 is live). Fixed with an explicit before/after state check.
2. With that fix: **Scenario 1 (open → hidden → socket closes) genuinely
   PASSED** with real evidence (`afterHidden.liveIndicator:false`). Scenario
   2 failed on a flat 1.5s wait — reopen took longer than a cold connect.
3. Fixed with polling instead of a flat sleep: `wcMode:false` recurred —
   root cause was a boot race (script acting before the app's own first
   render settled). Fixed by waiting on `window._fieldDataReady`.
4. With the boot-sentinel fix: the run crashed outright —
   `Execution context was destroyed, most likely because of a navigation`
   — a real page navigation (almost certainly the service worker)
   destroyed Playwright's execution context, unrelated to the guard logic.

**Per Rule 42 (stop after 3-5 attempts), stopped here.** The
compliance-critical behavior (socket closes when backgrounded) has real,
passing evidence. Scenarios 2 (reopen) and 3 (navigate-away-while-hidden)
remain formally unproven due to harness fragility — disclosed honestly,
not forced to a false green.

**Unblock criteria if this is revisited:** re-run
`.github/workflows/bracketdo-visibilitychange-probe.yml` — the harness
issue is almost certainly the Playwright context surviving a SW-triggered
navigation, not the guard code itself.

## 2. CC-CMD-2026-07-30-escalating-milestone-modifiers.md

**Status: SHIPPED.** MLB no-hitter drama bonus changed from a flat +20
(gated `period>=6`) to an escalating tier (`period>=5`: 12/20/30/40 at
5/7/8/9+ innings). Win-streak and hitting-streak bonuses from the source
spec explicitly NOT implemented — `fetchESPNStandings('mlb')` (confirmed
to exist, returns `entries[].streak`) is never called anywhere in the
codebase, so `espnStandingsCache` for MLB is never warm. Genuine
data-availability gap, not invented around.

## 3. CC-CMD-2026-07-30-revive-nfl-drama-profiles.md

**Status: SHIPPED — real data committed, deploy pending next normal push.**

### RELAY CONTRACT
N/A — client-only feature, no relay involvement. Data source: nflverse
play-by-play WPA via `nfl_data_py`, fetched by a scheduled/manual GH Action
(`update-drama-profiles.yml`), not the relay.

### CLIENT CONSUMER
`getMatchupDramaBaseline(home, away, sport)` in `src/legacy/field.js`
(inside the `//DRAMA_PROFILES_START` / `//DRAMA_PROFILES_END` marker
block), called from `ViewingConditions.evaluate()`'s fallback chain:
`storedPeak || matchupBaseline || preGameScore || 50`.

### INTEGRATION STATUS: STAGED (Rule 74 unblock criteria below)
`NFL_DRAMA_PROFILES` (32 real teams, scale 32-78) and the real
`getMatchupDramaBaseline` implementation are committed to
`src/legacy/field.js` / `index.html` as of commit `b764215f`
("chore: update NFL drama profiles 2026 [skip ci]"). **This commit used
`[skip ci]` by the workflow's own design** (documented in
`update-drama-profiles.yml`, adapted from the source spec) — it does NOT
trigger `deploy-gate.yml` (push-path-triggered only, no
`workflow_dispatch`). The data is correct and live in the `main` branch's
`index.html`, but will not reach production until the next normal
(non-`[skip ci]`) code push touching `index.html`/`sw.js`/
`field_utils.js`/`wrangler.jsonc`.

**Blocked by:** no next normal deploy has happened yet this session after
`b764215f`.
**Unblocked by:** the next ordinary code commit to this repo (any of the
already-scheduled/likely CC-CMD work will do it) — no special action
required, verify via:
```
curl -s https://jubilant-bassoon.jeffunglesbee.workers.dev/ | grep -o "NFL_DRAMA_PROFILES = {[^}]*KC[^}]*}" | head -c 200
```
Should show real per-team numbers (e.g. `"KC":56.2`), not `{}`.

### KNOWN MISMATCHES
None — field.js and index.html are in sync (verified via `sync-source.mjs`
+ `node smoke.js index.html`, 965/0, after this commit).

### Calibration gate — explicit human decision recorded
The CC-CMD's own spec required KC to rank top-5 before any real commit.
First attempt (original 40/25/25/10 metric weights): KC 53.6, not top-10.
Diagnosed via a real per-metric z-score printout (not blind tuning): KC's
`late_wpa_movement_z` was negative (-0.93) despite the largest sample (61
games) of any contender — efficient, controlled clutch execution produces
less raw WPA volatility than chaotic finishes, even when outcomes are
genuinely dramatic. Reweighted `close_game_rate` 25%→40%,
`late_wpa_movement` 40%→25% (the more stakes-honest metric, less
style-sensitive). Re-run: KC 58.0 (dry-run), still not top-10.

**Reported verbatim to Jeff. Jeff's decision (verbatim: "1 please", i.e.
accept the genuine data-driven result and drop the top-5 gate as a flawed
premise)** — recorded here since the CC-CMD's spec explicitly deferred
this exact judgment call to a human, not to further blind reweighting.
Real committed data: KC final = 56.2 (see `team_drama_profiles_nfl.json`;
committed run's numbers differ slightly from the dry-run's due to
real-world nflverse data revisions between fetches — not a code change).

### File-size ceiling — hit again, fixed in-scope
The first real (non-dry-run) dispatch failed smoke's 2,600,000-byte
ceiling by 746 bytes (injecting the real 32-team dict pushed past what
the placeholder stub never approached). Fixed via commit `b33cd061`:
compact (non-pretty-printed) JSON + a minified function body in
`inject_drama_profiles.py` (the actual code this feature adds — the most
in-scope place to cut bytes), plus two disclosed comment-block
compactions and one genuine bug fix (an orphaned, garbled comment line)
in the immediate neighborhood of the injection site. Net: 6 bytes
headroom → 697 bytes headroom pre-injection; real committed
`index.html` landed at 2,599,925 bytes (75 bytes under ceiling).
**Repeat disclosure:** this is now a recurring structural blocker on
ordinary feature work, not just verbose sessions — flagged again, no
decision received yet on raising the ceiling.

smoke.js: 965 passed, 0 failed (both the byte-fix commit and the real
data commit). field_smoke.js: 0 failures. SW_VERSION: 2026-08-01e → f
(byte-fix commit; the data commit itself is code-inert markup only,
no SW_VERSION bump needed — it doesn't touch cacheable app shell logic
beyond the marker block, and ships via [skip ci] regardless).

## Commits this session (jubilant-bassoon), chronological
- `b33cd061` — fix: reclaim byte headroom for real NFL drama profile injection
- `b764215f` — chore: update NFL drama profiles 2026 [skip ci] (automated, by the workflow)

(Escalating-milestone and bracketdo-guard commits landed earlier in this
same session, prior to this doc; see git log for exact SHAs — both already
disclosed to Jeff in an earlier status report this session.)
