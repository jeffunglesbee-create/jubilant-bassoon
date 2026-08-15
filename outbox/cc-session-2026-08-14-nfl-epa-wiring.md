# CC session — NFL EPA live wiring (P1-1 / P1-2)

**Date:** 2026-08-14 (ET) / 2026-08-15 UTC
**Repo:** jubilant-bassoon (client) — probes ran in field-relay-nba (CI-as-proxy)
**Branch:** main throughout — confirmed `git branch --show-current` = `main`
**Commit:** `6e8b86c` (client wiring + SW bump)
**Relay probe commits:** `f1204a3` (shape probe), `118045f` (game-id probe) — scripts only
**SW_VERSION:** `2026-08-12f` → `2026-08-14a`

## What shipped

NFL is now wired into the existing live-EPA feature. Live NFL games get the same
per-play EPA chip UFL already had, reusing the nflfastR-calibrated `_epLookup`
table (the one this session's earlier fix made real) and the sport-agnostic
`_buildUFLEpaHTML` display. New inline functions in `field.js`:

- `_computeESPNPlayEPA(play)` — ESPN play schema. `start.yardsToEndzone` IS
  yardline_100 directly (no `_srSitToYL100` conversion). Scoring / turnover /
  normal-play branches mirror `_computeSRPlayEPA`.
- `_fetchNFLGameEpa` / `_pollNFLEpa` / `nflEpaInit` — poll live NFL games via the
  pre-existing relay `/espn-summary/sports/football/nfl/summary?event=` route,
  60s interval, self-gating on the -10min..+5hr window, silent on failure.
- Card gate extended `g._sport!=='UFL'` → `!['UFL','NFL'].includes(g._sport)`.
- `setTimeout(nflEpaInit, 4000)` startup call beside `uflEpaInit`.
- smoke `A-NFLEPA-1` asserts the full wiring (functions + route + gate + startup).

## Three inherited-claim corrections (Rule 72) — caught by probe-first, pre-code

The May 27 Adaptation Guide specified this work, but three of its assumptions were
stale. Each was caught by reading current HEAD / probing live data BEFORE writing,
not after a broken deploy:

1. **The live app doesn't use `epa.js`.** The module + `test-epa.js` are tested
   standalone; the running code is inline `field.js` (`_computeSRPlayEPA` etc). The
   doc said "add to epa.js AND index.html"; only the inline path is load-bearing.
2. **`findESPNScore(g).id` is undefined for NFL.** The `_scoresBySource.espn`
   witness carries no event id, and the V2 game mapper hard-codes
   `espnEventId: null` for football (only MLB/NBA/NHL fill it). The doc's entire
   id-resolution was wrong.
3. **NFL `_gameId` is prefixed `"espn:401873282"`, not a bare id.** `/espn-summary`
   needs the bare numeric id (a prefixed value returns HTTP 400). Resolution:
   `raw.startsWith('espn:') ? raw.slice(5) : raw`, guarded by `/^\d+$/`.

## Verification artifacts (Rule 90)

Both probes ran on GH Actions runners (unrestricted egress; sandbox returns HTTP
000 to ESPN and 403 to *.workers.dev). Logs committed to relay `outbox/`:

- **`nfl-epa-shape-probe-20260815T013003Z.log` — 14/14 PASS** vs a real in-progress
  game (Broncos @ Falcons, id 401873278, 147 plays / 19 drives). Confirmed
  `drives.previous[].plays[].start.{down,distance,yardsToEndzone}`,
  `type.text`, `scoringPlay`, `end.yardsToEndzone`, per-play `homeScore/awayScore`,
  `isTurnover` — every field the code reads.
- **`nfl-v2-gameid-probe-20260815T013315Z.log`** — established the `espn:` prefix on
  `/v2/games?sport=nfl` ids and that the bare id round-trips through `/espn-summary`.

- **smoke: 966 passed, 0 failed** (source `index.html`), incl. `A-NFLEPA-1` and
  `A515` SW_VERSION.

## Integration status (Rule 65)

- **RELAY CONTRACT:** `GET /espn-summary/sports/football/nfl/summary?event=<bareId>`
  → ESPN summary JSON, `drives.{previous[],current}.plays[]`, 25s edge cache.
  Pre-existing route, no relay change this session.
- **CLIENT CONSUMER:** `_pollNFLEpa` → `_fetchNFLGameEpa` → `_computeESPNPlayEPA` →
  `_buildUFLEpaHTML` → `.ufl-epa-live` injected before `.card-tap-hint`.
- **INTEGRATION STATUS:** data path VERIFIED live (relay serves real plays; EPA math
  is the proven UFL math). Final DOM render on a live NFL card is **STAGED** — see below.

## STAGED: live-card DOM render (Rule 74)

- **Staged:** visual confirmation that a live NFL game card shows the `.ufl-epa-live`
  EPA chip in the deployed app.
- **Blocked by:** requires a live NFL game inside the -10min..+5hr window AND a
  browser against the deployed `*.workers.dev` (sandbox 403s it).
- **Unblocked when:** any NFL game is live (preseason週 through Sept regular season).
- **Verify:** load the deployed app during a live NFL game; a card in the NFL
  section shows `<div class="ufl-epa-live">…EPA</div>`. Or CI-as-proxy Playwright
  against the live URL asserting `panel .ufl-epa-live` present on an NFL card
  (per Rule 90 visual corollary).

## Rule 47 / ADR-002

EPA is a commodity metric (nflfastR / ESPN publish it) and is computed CLIENT-side,
served pull-only. No relay compute, no binding write. The relay only proxies ESPN's
own play-by-play. Clear on both the commodity and pull tests.

## Scope / touch-only (Rule 69)

Only the NFL-EPA additions + the one-line card-gate change + the required SW bump.
`_buildUFLEpaHTML` reused as-is (not renamed — that would touch the UFL call site for
no functional gain). Relay untouched (probe scripts only). Noted for a future tidy:
the relay already forwards an `espnEventId` field the client discards at ingest;
preserving it (Rule 60) would let the prefix-strip be dropped — separate concern.

## Confidence gate

**Score: 96 / 100.** Above 95; shipped.
- Every field the code reads was verified against LIVE data before a line was written.
- Three stale doc assumptions caught pre-code, not via a broken deploy.
- smoke 966/0; SW bumped; on main.

4 withheld: the final live-card DOM render is STAGED (no deterministic live-game
browser path from here), and the `espnEventId`-preserve tidy is deferred, not done.

---

## UPDATE — E2E PASS (live visual verification closed the STAGED item)

The STAGED live-card render is now **VERIFIED**, not staged. Getting there via
the CI-as-proxy Playwright probe (`nfl-epa-probe.yml` / `nfl_epa_probe.js`,
Rule 90) surfaced four more real defects beyond the initial wiring — none of
which smoke could catch, all found by exercising the live deployed path:

1. `61ffa1e` — NFL was date-gated to the 2026-09-10 regular-season opener,
   excluding preseason. Moved to the verified preseason opener 2026-08-06.
2. `61ffa1e` — no `injectV2SportSection('nfl','NFL')` existed (CFB had one),
   so NFL games sat in espnScores and never became cards. Added.
3. `479dfd9` — `nflEpaInit` bailed at 4s if the (async-injected) NFL section
   wasn't built yet, so the poll interval never armed. Gated on the season
   flag instead; 30s interval (matches the relay's 25s summary cache).
4. field-relay-nba `f949456` — **production bug**: the WC26 soccer live-WP loop
   in `/v2/games` ran for every live game; football's numeric `g.round` made
   `extractWCGroup((2).match(...))` throw → CF 1101 → `/v2/games?sport=nfl`
   returned HTTP 500 the instant any NFL game went live, breaking all NFL card
   loading (and EPA) client-side. Gated the loop to the soccer adapter.

**Done-condition artifact (Rule 90):** `outbox/nfl-epa-probe-manifest-2026-08-15T02-11-46.json`
verdict **PASS**, `epaChipsOnNFLCards: 4`, sample chip
`"-1.37 EPA · 3rd & 10 @ OWN 44 · -2.62 drive · 3 pl"`, `/espn-summary/.../nfl/summary?event=401873278`
(+276,+277) all 200, screenshot `outbox/nfl-epa-probe-2026-08-15T02-11-46.png`.
Client SW_VERSION now 2026-08-14c. Both repos on main, deploys green.
