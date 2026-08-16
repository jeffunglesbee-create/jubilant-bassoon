# CC Session — 2026-08-16 — NFL standings dropdown + data-gated playoff tracker

## Scope
(1) Verify the NFL ▼ Standings dropdown works. (2) Build a data-gated NFL playoff
seeding tracker. Probe-first throughout; both adversarially reviewed before coding.

## HEAD progression
`03dd725` (smoke 977/0, SW 2026-08-15f) → `9795c08` (smoke 981/0, SW 2026-08-15j).

## Headline: the dropdown was broken, and it was FOUR stacked defects
An in-session claim that "NFL standings already work ✅" was WRONG — it read
ESPN_STANDINGS_MAP instead of the runtime path (Rule 48 Class A). A Playwright
probe disproved it, then each fix revealed the next defect underneath:

| # | Defect | Symptom | Commit | Status |
|---|--------|---------|--------|--------|
| 1 | `'NFL'` key mismatch — gate reads `sec.sport` (`'NFL'`), map keyed `'Football (NFL)'` | zero standings buttons on NFL cards | `3fb4b31` | FIXED, proven |
| 2 | `toggleStandings` never bridged to `window` | `ReferenceError` on click — **all 7 unbridged controls, app-wide** | `1fecea4` | FIXED, proven |
| 3 | `entries.slice(0,12)` on AFC+NFC concatenated (32 rows) | NFC card opened a table with NEITHER team | `6b0264f` | FIXED offline |
| 4 | ESPN v2 standings URL returns **HTTP 200 with an error body** | fetch "succeeds", 0 entries, silent restore, no panel | `f05da5d` | **NOT FIXED — see below** |

Each of 1–3 is independently correct and verified. **The dropdown still does not
open a panel.** Do not report this feature as working.

### Defect 4 — current state, honestly
In-page fetch of the bare URL (proven, `nfl-standings-manifest-2026-08-16T03-19-43-999Z.json`):
```
espnDirect: { ok:true, status:200, entries:0, topKeys:["error","cached"] }
```
So `fetchESPNStandings` parsed zero entries → returned null → `toggleStandings`
took its silent-restore path. That also explains `mlbDropdownWorks:false` recorded
by the window-bridge probe — this was never NFL-specific; MLB/NBA/NHL share the
builder.

I inferred the cause was missing query params (every working standings call in the
same page carries them) and shipped `?limit=100&season=<y>&seasontype=2` in
`f05da5d`, SW 2026-08-15j. **That fix did NOT work.** The next manifest, on the
deployed 2026-08-15j build, still shows `{error, cached}` with `entries:0`.

Corrected reading of the evidence: the SAME url returns real standings from a CI
node runner but an error body from the browser, so the discriminator is the request
ORIGIN, not the params. Supporting signal: MLS standings DO work in this same page
and use a different base path — `/apis/site/v2/` rather than `/apis/v2/`.

NEXT DIAGNOSTIC (in flight): the probe now fetches five URL variants in-page
(v2 bare, v2 params, site/v2 bare, site/v2 params, v2 level=1) and records
`workingVariant`. If NO browser variant returns entries, the correct fix is to
proxy standings through the relay — which is what the relay exists for (Rule 60),
and is a client+relay change, not a URL tweak.

## Playoff tracker — shipped, gated, correct (`288f2f7`)
`nflPlayoffSeedsInit()` → `/football/nfl/standings?seasontype=2` into a synchronous
store; `renderStatsSection` pushes nothing when ungated (no empty block, no orphan
header). Seeds 1-7 per conference + records + seat + ESPN clinch markers.

THE GATE, verified across every payload state:

| payload | gp | result |
|---|---|---|
| `?seasontype=2` today | 0 | SILENT |
| default endpoint today | 30 | RENDERS ← would publish **preseason** seeds as real |
| 2025 regular season | 544 | RENDERS (2 confs, seeds 1-7 correct) |

The default endpoint returns playoffSeed derived from EXHIBITION games, so every
data-presence gate fails OPEN on it. Pinned by smoke A-NFLSEED-2.

CLINCH — read from the `clincher` stat's `displayValue`/`description`, never
`.value` (0 for all 96 markers observed across 2024+2025 finals; a truthiness test
would render nothing forever, silently). No `note` field exists on these entries.
Pinned by A-NFLSEED-3. **Previously UNVERIFIED, now RESOLVED**: probing a COMPLETED
season under regular-season scope (`?season=2025&seasontype=2`) — the one
combination no earlier probe covered — returns clincher on all 32 entries with the
same distribution as the control (z:6, y:6, e:18, *:2).
Artifact: `outbox/clincher-seasontype2-probe.txt`.

LABELS: seeds 1-4 say "division leader", never "winner" — leading is what standings
show; winning is a clinch, and only ESPN's marker may assert it (Rule 1).

Note: the tracker's own fetch is confirmed working in production
(`200 .../football/nfl/standings?seasontype=2` in the network log), so defect 4
does not block it.

## Journalism fabrication guard (`bb0460d`) — prerequisite, not scope creep
`fmt()` returned `(leads)` for ANY team at gamesBehind 0 or NaN. NFL conference GB
takes values {0, 0.5, 1} across 16 AFC teams, so once defect 1 warmed
`espnStandingsCache`, prompts would read "Bills: 1-0 (leads) · Steelers: 1-0
(leads)". Now only a group's top row may claim the position. Rule 1.

## Self-inflicted incident — a comment broke every deploy
`1fecea4`'s bridge comment QUOTED the module script tag it was describing.
`sync-source.mjs` located the app block via `lastIndexOf` of that exact text, so the
comment's copy became the last match; sync selected a 7.5 KB phantom block, tripped
its own "expected 2MB+" guard, and **deploy-gate failed for every commit after it**
— including the fix that comment documented. Fixed in `d6247c9`: reworded (no
literal tag) and hardened sync-source to select the app block BY SIZE on both sides
of the divergence guard.

Second deploy gotcha, worth remembering: `[skip ci]` is evaluated on the HEAD COMMIT
OF A PUSH. A `[skip ci]` probe commit pushed alongside two real fixes suppressed the
deploy for all three.

## Verification integrity — three probe defects fixed
The probe would have reported a working fix as broken, twice over:
1. selected the button via `onclick.includes('Football (NFL)')` — post-fix the
   onclick is `toggleStandings(this,'NFL',…)`, so it could never match.
2. required `rowCount >= 16`; the panel renders 13 single-group / 35 grouped.
3. always exited 0, so an automated run could never report the breakage it exists
   to detect.
Also added: `swVersion` capture (a manifest can now prove WHICH build it tested —
without it, "not deployed" and "doesn't work" are indistinguishable), console/page
error capture, ESPN network status, and a time-series panel sample.

The time series REFUTED my "panel opens then the 15-30s re-render destroys it"
hypothesis — `panelEverAppeared:false` at every sample from 1.5s to 24s. Recording
the refutation because it is what redirected the investigation to the fetch itself.

## Automation
`nfl-standings-probe.yml` now chains to `Deploy gate (fast smoke)` completion plus a
daily cron, and exits 1 on a real regression (button present, panel absent) while
staying green when no NFL game is on the slate. Verification is hands-off.

## Integration status
- Defects 1-3: **VERIFIED** (`nfl-standings-manifest-2026-08-16T00-30-11-714Z.json`:
  `standingsBtnSports` includes NFL, count 30→37, `buttonLabel:"▼ Standings"`;
  later manifests show `pageErrors: []`).
- Defect 4: **OPEN**. `standingsWorks:false` on SW 2026-08-15j.
- Playoff tracker: **VERIFIED** offline against real payloads; correctly SILENT live
  (preseason). Clinch RESOLVED.
- Smoke 981/0, including A-WINBRIDGE-1 (negative-tested: removing a bridge fails it
  by name, 980/1; restoring passes, 981/0).

## Carry-forwards
1. **Defect 4** — read `workingVariant` from the next manifest. If null, proxy
   standings through the relay (client+relay, Rule 60/70). Needs its own CC-CMD.
2. `buildGameStandingsContext` NFL prompt line has never been reviewed for quality
   now that the map alias makes it reachable.
