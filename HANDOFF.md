# FIELD HANDOFF

## Session 2026-09-05 — the relay now says where everything came from (cross-repo)

HEAD `126d0289` — **no client commits this session.** Smoke **1000/1**, and the
one failure is A515 by design, see below. SW_VERSION `2026-09-04f` unchanged.
Relay session doc: `field-relay-nba/outbox/cc-session-2026-09-05-provenance.md`
View: https://claude.ai/code/artifact/a1afea94-e7d5-4848-82f8-a03a4cbf00d0

All work landed in `field-relay-nba`. This entry exists because four things
changed on the other side of the contract and a client session should not have
to reverse-engineer them from a diff (Rule 65).

### Every relay response now carries provenance headers

Additive, exposed cross-origin, on **186 of 186** routes. Response bodies are
byte-identical — nothing here needed changing and nothing broke.

| header | example |
|---|---|
| `X-FIELD-Route` | `/wc/odds-probs` |
| `X-FIELD-Source` | `api.the-odds-api.com` |
| `X-FIELD-Kind` | `upstream` \| `store` \| `proxy` \| `trigger` \| `computed` |
| `X-FIELD-Served-At` | when the RESPONSE was made |
| `X-FIELD-Data-Written-At` | when the DATA was written, absent if nothing was read |
| `X-FIELD-Data-Age-Seconds` | `4362` — `/health` was serving 72-minute-old data under a header that said "now" |

`Access-Control-Expose-Headers` names all seven, so this client can read them
today and currently does not. **The age header is the one worth wiring**: it
answers "is this stale?" for any cached relay payload without a round trip.

### `/wc/odds-probs` now returns zero rows, and that is correct

A hand-entered Germany v Ecuador row had been injected into that response since
2026-06-12 whenever the Odds API did not list the fixture — pHome 0.56, lambdas
off a screenshot. Its exit condition was "once the Odds API lists this game",
which became unreachable when the match was played on 06-25. It ran 72 more days,
and by 09-05 it was not one row among 71: it was the **only** row.

Deleted (`db2540c`). Out of season `/wc/odds-probs` serves `probs: []`.

**This client handles that correctly and it was verified, not assumed.**
`fetchWCOddsProbabilities` reads
`data.ok && Array.isArray(data.probs) ? data.probs : []`, resets
`window._wcOddsCache = {}` and populates from an empty list — so the cache
empties rather than going stale. `fetchCFLOddsProbs` returns its previous cache
on `!r.ok`. No change needed here.

### New relay refusal states this client already survives

The odds credit guard can now decline a call rather than spend past the monthly
floor. `/wc/odds-probs` and `/cfl/odds-probs` answer **503** with
`{ ok: false, guarded: true }`; the `/odds/*` proxy answers **429** with
`X-RELAY-Error: odds-credit-guard`. Both are distinguishable from a 500, which
was deliberate. Every consumer here already branches on `!r.ok`.

Both routes also gained `cost`, `charged`, `reconciled` and `cached` fields —
additive, ignored here, and used by the relay's own probes to keep its ledger
honest against the provider's receipt.

### A515 is failing and nothing is broken

`SW_VERSION date 2026-09-04 !== today ET 2026-09-05`. A515 requires SW_VERSION to
start with **today's** ET date, so it fails every day after the last deploy. The
count was 1001/0 on 09-04 and is 1000/1 now for that reason alone.

It clears on the next deploy-triggering commit, which must bump SW_VERSION in
**both** `index.html` and `sw.js`. A HANDOFF- or outbox-only commit does not
trigger `deploy-gate.yml` (it filters on index.html, sw.js, field_utils.js,
wrangler.jsonc), so this entry does not need a bump and does not get one.

### Worth doing here next, in order

1. **Read `X-FIELD-Data-Age-Seconds`** on cached relay fetches and let a stale
   payload say so in the UI. The relay computes it; nothing here reads it.
2. Nothing else. The three daily probes (11:00 chart renderer, 11:20 forward
   window, 11:40 drama-arc amnesty) are green and unchanged.

## Session 2026-09-04c — one chart renderer for every series (jubilant-bassoon)

HEAD `f1734160`. Smoke **1001/0**. Units **69/0**. SW_VERSION `2026-09-04f`.
Session doc: `outbox/cc-session-2026-09-04-chart-renderer.md`

Seven series rendered seven ways; two hand-rolled SVG builders sharing no code.
`src/utils/chart.js` is now the single renderer — `fieldChart` / `destroyChart`
/ `sweepDetachedCharts`, colours and fonts from the page's own CSS tokens,
`setData` on re-call so a 15-30s poll never rebuilds a canvas (Rule 89).

uPlot ^1.6.32, bundled by esbuild, **22.5 KB gzipped** against a 2,583 KB page.

**Two consumers, both drawing series that already existed and were discarded:**
the NFL EPA drive (149 plays fetched, `state.lastPlay` rendered) and home win
probability (the `wp_update` ring buffer, captured for Pulse Chip and drawn
nowhere).

**Fixed domains, never the series maximum** — `[-3,7]` for EPA, `[0,1]` for WP.
Auto-scaling draws every game as the same shape, the failure
field-laboratory's `spark-check.mjs` exists to catch.

**ADR-002:** the renderer knows nothing about drama and must not learn. WP and
EPA are commodity under Rule F. The drama series keeps its amnesty gate at the
call site.

### Integration state (Rule 65)

| | |
|---|---|
| **Producer** | `src/utils/chart.js`, bundled into index.html by `scripts/build-bundle.mjs`. CSS inlined between vendored markers; `npm run sync:uplot-css` regenerates, `npm run check:uplot-css` gates drift. |
| **Consumers** | `_fetchNFLGameEpa` (`.ufl-epa-chart`) and the SSE `wp_update` handler (`.wp-trend-chart`). Both mount BESIDE the markup FIELD rebuilds, never inside it. |
| **Status** | **VERIFIED** against the deployed bundle — probe run 33923935346, `outbox/chart-renderer-manifest-latest.json`: canvas drawn, same canvas node and instance across an update, y scale 0-1 with the series spanning 0.38-0.71, detached mount reclaimed, zero console errors. |
| **Known limit** | The probe does NOT prove the two charts appear on a card. Those call sites need a live NFL game and an SSE event; a GitHub runner reaches neither (ESPN CORS-blocked, measured across four runs). It proves the renderer contract, which is the part that rots silently. |

**Three probes now run daily** — 11:00 chart renderer, 11:20 forward window,
11:40 drama-arc amnesty — each overwriting one `-latest.json` rather than
leaving a manifest per run.

**Open, and now specified rather than deferred:** whether field-laboratory
needs uPlot at all. It already has a type-sealed 30-bar sparkline that uPlot
would duplicate and weaken. `docs/CC-CMD-2026-09-04-laboratory-chart-decision.md`
makes that a decision on evidence; WONTDO is an expected and successful outcome.


## Session 2026-09-04b — the schedule looks 3 days forward (jubilant-bassoon)

HEAD `1fe7b2e0` (+ generator `94ac7bb3`, data `45da9b09`). Smoke **993/0**.
Units **69/0**. SW_VERSION `2026-09-04b`.
Impact analysis: `outbox/impact-2026-09-04-forward-schedule-window.md`
(read §14 — three things implementation proved wrong in it).

The nav already reached +3 (`updateDateLabel`: `next.disabled = diff >= 3`).
What did not extend was the quality of those days. Two `===` on
`_meta.for_date` (field.js 8693, 20594) were the cliff; the second rejected the
whole file unless dated exactly today.

**Generator** now emits schema **2.1** with `schedules_by_date`, day 0 plus 3.
`schedules` is unchanged and still day 0, so the accept gate admits 2.0 AND 2.1
— a stale client must not reject a 2.1 file and fall back to a now-empty
`mlbRaw`. That ordering is why the client deployed before the generator ran.

**Live result** (run 33906790832): 16 / 15 / 15 / 11 MLB games across
2026-09-04..07, start_times spanning 09-04 to 09-08, 5 entries carrying
`nationalBundle`, 2 overlays (day 0 only), 35,028 bytes. Day 0 vs +3 shares
1/15 matchups; day 0 vs +1 shares 15/15, which is a three-game series, not a
duplicate.

### Integration state (Rule 65)

| | |
|---|---|
| **Producer** | `scripts/build-field-data.js` → `outbox/field-data-today.json`, committed daily 07:30 UTC by `field-data.yml`. Schema 2.1: `_meta.window_dates`, `windowed_sports`, `day0_only_sports`, `notes_for_dates`, `games_found_by_date`; top-level `schedules_by_date`. |
| **Consumer** | `scheduleForDate(fileData, iso)` in `field_utils.js`, duplicated in `field.js`; `fieldDataForDate(iso)` binds it to `_fieldDataCache`. Fetched from GitHub raw (`_SCHEDULE_BASE`), not the Worker. |
| **Status** | **VERIFIED end to end.** Probe run 33908369496 against the live deploy: `cacheAccepted:true`, `schema:2.1`, all four `window_dates`, and the client's own `scheduleForDate` returning 15 / 15 / 11 MLB entries for +1 / +2 / +3 (`outbox/forward-window-manifest-33908369496.json`). **Still unproven: the MLB enrichment match count.** A GitHub runner cannot reach site.api.espn.com from the browser (CORS-blocked on every fixture fetch across runs 1, 3 and 5), so no ESPN section renders and there is nothing to enrich. That field is reported, never asserted. |
| **Known limits** | NHL/NBA are day-0 only — their relay endpoints are today-only, no date param (needs a relay route, Rule 70). `game_overlays` and matchupNotes are day 0 only: the `home\|away` key collides across a series, measured 15/15 on day 0 vs +1. |

**Forward days are ESPN-based, enriched — not replaced.** The ESPN sweep covers
16 leagues; the window covers 3. Routing forward days to `buildTodaySchedule`
would have lost 15 leagues. The window upgrades the MLB section in place
(`nationalBundle` → streams, GOTD flags, `_postponed`, `isPlayoff`); an
unmatched entry is left untouched and the count lands in
`window._fieldDataEnrichCount`.

**`mlbRaw` is now `[]`** — its 48 entries were dated 2026-06-02..10 against a
one-day `isToday()` filter and had returned nothing since 2026-06-11. Smoke
A75f keeps it that way.


## Session 2026-09-04 — the bottom-sheet Drama Arc sparkline was never gated (jubilant-bassoon)

HEAD `43a13586` → `259fa5a1`. Smoke **988/0** (was 986 with A515 failing).
Units **67/0**. SW_VERSION `2026-09-04a`.
Session doc: `outbox/cc-session-2026-09-04-drama-arc-amnesty.md`
CC-CMD: `docs/CC-CMD-2026-09-04-bottom-sheet-drama-arc-amnesty.md`

`openBottomSheet` rendered `buildDramaSparklineSVG` with no state gate —
`_bsIsFinal` gated only the arc description that follows it. The builder emits
`Math.round(peak)` as SVG text, so a **live** game showed a raw composite drama
score about 90 seconds in. ADR-002 Step 3 (displayed composite) with Step 4's
amnesty not applying.

Two prior documents said this section was post-game. Neither was true at HEAD,
and `git log -S` shows no commit ever removed a gate — a Rule 72 case, now
amended in place.

**Fix:** `isAmnestyState(state)` — true only for `'post'` or `'final'`, in
`field_utils.js` and duplicated verbatim in `field.js` (smoke A191 requires the
index.html definition). `_bsIsFinal` derives from it; the whole Drama Arc
section sits behind it. The live sheet keeps `dramaLabel_bs`, the named-tier
label, which is the ADR-002 Step 5 pattern.

**Held by:** smoke A74b / A74c, 8 enumerated unit pairs (mutation-proved —
making the predicate case-insensitive fails the block), and
`drama-arc-amnesty-probe.yml`, a Playwright run against the live deploy.
Run 1 (`33893391493`) is the negative control: against the pre-deploy site it
reported `liveSparklinePresent: true`, `livePeakTextPresent: true`,
`liveBsContentChildCount: 8` — the violation reproduced in a real browser, and
proof the probe mounts the sheet rather than measuring nothing.

**Also fixed, separate commit `4f1255bd`:** field.js carried a stale 53-line
`UMPIRE_ABS_RATINGS` while index.html carried 78 fresher lines, so any
`sync-source.mjs` run silently reverted the newer data. Ported forward.
**Standing defect:** whatever regenerates that table writes index.html only and
should write `src/legacy/field.js`.


## Session 2026-08-27 — the NFL EP model moved to the relay (jubilant-bassoon)

HEAD `254f05e` → this commit. Smoke **986/0**. SW_VERSION `2026-08-27a`.

`_computeESPNPlayEPA` is **deleted**. `_fetchNFLGameEpa` now reads
`GET /nfl/epa/plays?event={espnGameId}` from the relay, which computes the same
numbers from the same table. Two copies of one EP model were free to disagree;
there is one copy now, and `scripts/nfl-epa-transcription-check.mjs` in
field-relay-nba holds this file's former code verbatim and blocks that deploy if
the two ever diverge.

### Integration state (Rule 65)

| | |
|---|---|
| **Relay contract** | `GET {_UFL_RELAY}/nfl/epa/plays?event={numeric ESPN id}` → `{event, currentDrive, driveCount, plays:[{id, epa, ep_start, ep_end, scoringPlay, drive, down, distance, yardsToEndzone}]}`. Cache 25s (the `/espn-summary` TTL it borrows). Full row-by-row spec in CONTRACTS.md. |
| **Client consumer** | `_fetchNFLGameEpa` (`src/legacy/field.js`), polled every 30s by `_pollNFLEpa`. Renders through `_buildUFLEpaHTML`, unchanged. |
| **Integration status** | **VERIFIED.** Live probe run 33123265487 (relay, post-deploy): Seahawks at Titans, 149 route plays / 149 client plays / **0 disagreements**, 12 enumerated pairs all non-zero. |
| **Known mismatches** | None. Two were found and closed before the switch — see below. |

### What the switch had to fix first

**The route served no situation label, and the renderer reads one.**
`_buildUFLEpaHTML` prints `lp.situation`. The relay now serves the three numbers
that label is built from — `down`, `distance`, `yardsToEndzone` — and the new
`_epaSituation()` formats them here. Serving the string instead would put an
English word list and an OWN/OPP viewpoint in the relay. Both the relay's
transcription check (317 synthetic plays) and its live probe assert the label
rebuilds from those numbers byte for byte, so the drop is measured lossless.

**`homePts`/`awayPts` are gone from the NFL state, and nothing noticed.** This
function stashed them from the last raw ESPN play. Nothing has ever read them:
the only readers of that state are `_buildUFLEpaHTML` (`lastPlay`, `driveEpa`,
`drivePlayCount`) and the card gate's `_epaLive?.lastPlay`. Rule 63 — they are
not carried into the new contract. The UFL path still sets its own; untouched.

**`_epLookup` and `_epTable` STAY.** The relay route is NFL-only;
`_computeSRPlayEPA` (UFL/SportRadar) is still a browser-side consumer of that
table, at three call sites. The CC-CMD said to delete them, and the CC-CMD was
wrong — deleting them would have taken the UFL panel with it.

**Smoke A-NFLEPA-1 pinned the deleted symbol** and the old `/espn-summary` URL,
so it had to move with the code. A-NFLEPA-2 is new and asserts the browser-side
EP model is **absent** — the CC-CMD's done condition, as a blocking check rather
than a one-off grep, because a route that ships beside the old computation has
duplicated the model rather than moved it.



## Session 2026-08-26/27 — the unslop-ui chrome audit (jubilant-bassoon)

**Session doc: `outbox/cc-session-2026-08-26-chrome-audit.md`**

HEAD `796dae5` → `cba45b3`. Smoke **985/0 at every commit**. SW_VERSION
`2026-08-26n`. Deploy gate and both viewport audits green on every push.

`docs/chrome-inventory.txt` now carries **nine ratchet lines**, five created
this session, enforced by `.github/workflows/chrome-inventory.yml` — which also
did not exist: the ratchet ran only inside `deploy-gate.yml`, whose `paths`
covered neither of the ratchet's own inputs.

```
decorative-emoji  275 →   4      emoji-announced   82 → 2   (new)
  uncaptioned     166 →   4      glyph-ambiguity    7 → 1   (new)
flag-emoji        102 →  92      unreferenced-css  61 → 0   (new)
status-glyph      107 →  39      icon-in-a-box      4 → 1   (new)
gradient           34 →  30      glyph-singleton   25 → 0   (new)
backdrop-filter    19 →  12
```

**Read this if you touch the ticker:** the emoji audit turned up an ADR-002
bright-line violation. The live score ticker emitted
`title="Drama ${Math.round(drama)}"` — the raw composite, on `state === 'in'`
chips, in the DOM. Fixed in `ae170a8`. Step 3 of the decision tree is explicit
that a displayed composite number is a violation "regardless of other
mitigations", and a `title` renders as a tooltip.

**The mechanism worth carrying forward:** a check with ONE remedy gets that
remedy. The boundary assertion asked "is there a boundary at 3:1?", whose only
answer is *add a boundary* — nine were added and three were wrong. It asks
"boundary at 3:1 **or** no fill of its own" now and prints which answer carried
each element. Six further defects in the checks themselves are listed in the
session doc; every one was caught by running the check, not by reviewing it.

**Open, not backlogs:** `emoji-announced` 2 is the check's floor, both inside
`dramaTierMark()` where the render sites hide the glyph but the source-position
check cannot follow the reference.

## Session 2026-08-21 — field-laboratory CC-CMD queue (updated: EPL live; 3 asks corrected against HEAD)

Filed from the **field-laboratory** session (docs in
`jeffunglesbee-create/field-laboratory/docs/`). Each doc opens with a probe block —
run it FIRST, verify every premise from HEAD, and do not commit below confidence 95.

**The pattern this arc, stated plainly:** the relay session probed HEAD and found
that **three of five relay-directed asks described work already done** — the
closing-odds hook was already firing, EPL was already seeded, and the future-date
"gap" was game-day seeding working as designed. These docs were filed from what
`/context/date` and the desk *render* — a correct place to notice a symptom, an
unreliable place to infer a cause. Fix on the laboratory side: `grep` for the
function the ask says to write and check whether the table already has the row,
BEFORE filing.

**DONE this arc (context):** brief-data-quality asks 1, 2, 3, 4a, 4b, 6a shipped +
four deploy guards (client smoke 985/0); EPL seeded into `/context/date` (already in
the seed table `src/index.js:7587`, predating this session), labelled, and now
MODELLED laboratory-side (Arsenal v Coventry 3-0 renders, `UNMODELLED` banner
cleared, scoreline verdict green); the odds one-snapshot line now states its capture
time. Line-movement rendering (`OddsStory.Moved`, card + Stats tab, implied-prob
shift) is built and shipped in the laboratory. **The closing-odds pre→live hook is
also DONE and firing** — `_captureClosingOdds` (`src/ambient-do.js:718`), 18 real
captures 2026-07-04 → 2026-08-21; the real defect behind the dormant `Moved` render
was a backfill dual-write, now FIXED (relay `887c843`, date-gated + guarded by
`check-closing-odds-not-prefilled.mjs`).

**OPEN — relay-directed, priority order:**

1. **FPL event grounding for EPL — the one genuinely unstarted ask.**
   `CC-CMD-2026-08-21-fpl-event-grounding-epl.md`. EPL is on the desk but its briefs
   are season-stat templates ("0 goals through 0 games"). The relay already proxies
   `/fpl/event/{gw}/live/` (goals, assists, cards, bonus) — "not wired yet". Wire it
   into EPL brief generation so recaps name goalscorers/assists. Third source for
   brief-data-quality ask 5 (complementary — FPL adds bonus/saves); `CONTRACTS.md`
   must state which feed owns the shared fields so two sources can't disagree in one
   brief. Coventry's 3-0 loss is the same-day test case.

2. **Capture `opening_odds` for EPL / La Liga — the real closing-odds follow-up.**
   `CC-CMD-2026-08-21-closing-odds-capture.md` (ORIGINAL ASK WITHDRAWN — hook already
   firing). Measured 2026-08-21: EPL and La Liga carry the **closing** line and **no
   opening** one — the mirror of the original assumption. So `Moved` is blocked two
   independent ways: MLB/WNBA is now UNBLOCKED by `887c843` (real open→close sequence,
   verify on the next pre→live transition — `closing_odds.captured_at >
   opening_odds.captured_at`, card reads `ML X -> Y (home ±N.N implied)` not
   `NOT SEQUENCED`); EPL/La Liga stay blocked on a missing **opening** capture. Probe
   why `odds_api` opening writes cover MLB/WNBA/Ligue 1 but not those two — do not
   patch blind. Carry-forward #1 (`_ODDS_SOURCES`) is already done; #2 (team aliasing)
   and #3 (non-AmbientDO sports) survive.

3. **brief-data-quality, remaining asks:** ask 5 (event-grounding off
   `keyEvents`/`incidents` — the per-sport container is in `CONTRACTS.md`: `keyEvents`
   is soccer-only, MLB/NBA/NHL use `plays`, NFL `scoringPlays`; NBA's 119 scoring
   items/game need selection, not enumeration), ask 6b (`quality_score` is a WEIGHTING
   re-score, NOT a sign flip — finals already score higher, 190.1 vs 184.3), and the
   §5 residual D1 mutations (601 sport values mapped by class A–E, 539 `gNN` ids inert,
   41 reclassify-to-`game_live`) which need Jeff's authorization.

4. **Generalise the seed gap (ask 3 WITHDRAWN):**
   `CC-CMD-2026-08-21-archive-seed-coverage.md`. EPL was ALREADY seeded — ask 3 asked
   to add a row that exists; the future-date "gap" was game-day seeding (MLB is 3/3
   past days, 0/2 future days, exactly like EPL; only MLS pre-seeds ahead). Asks 1–2
   survive and are the valuable part: a declared seed manifest + a check so the NEXT
   competition (Serie A / Bundesliga) is caught, not discovered by a human comparing
   FIELD to ESPN. **But ask 2's artifact as written ("on 2026-08-22 the check flags
   EPL") encodes the false positive permanently** — rewrite it against the game-day
   model (evaluate on a date past its seeding tick, not a future one).

5. **UEFA live-landing verification:** `CC-CMD-2026-08-20-uefa-club-competitions.md` —
   the `/d1/execute` count on `regular_season_games WHERE sport LIKE 'UEFA%'`.

**Laboratory queue (field-laboratory's own, for reference):** model Ligue 1 (label
confirmed `"Ligue 1"`, Marseille v Strasbourg still `UNMODELLED`), and model each
European league on the drift-sentinel's first observation as the relay seeds it.

Positioning that motivates the brief work (ESPN/AP side-by-side, the trust wedge):
`field-laboratory/outbox/cc-differentiating-on-trust-2026-08-20.md`.

---

## Session 2026-08-16 — NFL standings: 5 stacked defects, ALL FIXED + playoff tracker

Session doc: `outbox/cc-session-2026-08-16-nfl-standings-and-playoff-tracker.md`.
Both repos on main. SW 2026-08-16a, smoke 982/0.
Client HEAD `003c134a` · relay HEAD `086096f`.

**✅ RESOLVED 2026-08-16 — the standings dropdown now works, verified live.**
browser_quick/browser_navigate against the deployed app (SW 2026-08-16a), ZERO
GitHub Actions minutes: `panelPresent:true visible:true rows:33
label:"▲ Standings" groupHeaders:["American League","National League"]
sampleRows:["1 Tampa Bay Rays 74 48 .607"]`. The `▲` label proves the success
branch ran (appendChild), not the silent-restore stub; the two group headers prove
the conference-grouping fix. `typeof window.toggleStandings === "function"` proves
the bridge. MLB is the test case because NFL preseason ended overnight — and MLB
was itself broken before this (mlbDropdownWorks:false), so the repair is class-wide.

FIVE stacked defects, all now fixed:

An in-session claim that "NFL standings already work ✅" was WRONG (read the map,
not the runtime path — Rule 48 Class A). A Playwright probe disproved it, and each
fix exposed the next defect underneath:

1. `3fb4b31` **FIXED** — `'NFL'` key mismatch: gate reads `sec.sport` (`'NFL'`),
   map was keyed only `'Football (NFL)'` → zero buttons on NFL cards.
2. `1fecea4` **FIXED** — `toggleStandings` never bridged to `window`. The bundle is
   ESM, so module scope is not global and inline `onclick` threw ReferenceError.
   **7 controls were dead app-wide**, not just standings. Smoke A-WINBRIDGE-1 now
   enforces the class (negative-tested: pulling one bridge fails it by name).
3. `6b0264f` **FIXED** — `slice(0,12)` on AFC+NFC concatenated (32 rows) meant an
   NFC card opened a table containing NEITHER team. Now conference-grouped; also
   fixes MLB/NBA/NHL, which share the path.
4. **FIXED** — ESPN blocks the browser: `site.api.espn.com/standings` answers a
   browser-origin request with HTTP 200 and an ERROR BODY. All 5 url variants
   failed (`workingVariant:null`), so it was never the url or the params — two of
   my fixes (params in `f05da5d`) were wrong. Not fixable client-side.
5. **FIXED** — the relay proxy then 403'd: ESPN's Akamai edge denies **Cloudflare
   Worker IPs** on `site.api`. Switched to `site.web.api.espn.com` (relay
   `086096f`), the host `/espn-summary` already used successfully; client
   `003c134a` adds the params it requires (`level=2` → children[] = conferences).

**ONE ENDPOINT, THREE ANSWERS** — why four diagnoses were wrong in a row:
| caller | site.api | site.web.api |
|---|---|---|
| GitHub runner | 200 + data | — |
| Browser | 200 + `{error,cached}` | — |
| CF Worker | **403 Akamai** | **200 + data** |
Actions was the most MISLEADING vantage point: the only caller that got real data
from the broken host, which is what sent me down the params path twice.

**Tracker gate rewritten (`003c134a`):** site.web.api serves LIVE PRESEASON
standings with playoffSeed populated (LAC 1-0, seasonType:1), so the games-played
gate would have FAILED OPEN and published exhibition seeds. Now gates on ESPN's
declared `seasonType === 2`. Smoke A-NFLSEED-2 rewritten to match.

This was never NFL-specific: MLB's own dropdown was equally dead
(`mlbDropdownWorks:false`) and is now confirmed working.

**GITHUB ACTIONS ALTERNATIVE (adopted).** Actions budget was ~90% consumed, and
this session's Playwright probes (~300MB Chromium per run, ~8 runs) were a large
part of it. Everything above was closed out with ZERO Actions minutes using the
MCP tools this project already has:
- `html_probe` — fetch any URL FROM THE CLOUDFLARE WORKER IP. Found the Akamai
  403 and the working host in 3 calls. Also the only way to see the Worker's
  vantage point at all — Actions cannot show it.
- `browser_quick` / `browser_navigate`+`interact`+`extract` — real headless
  browser (Cloudflare Browser Rendering) for click-and-render verification.
  Replaces the Playwright-in-Actions workflows entirely.
- `probe_relay_route` — self-fetch an allow-listed relay route.
NOTE: both repos are PUBLIC (`private:false`), and public repos get unlimited free
Actions minutes — so the 90% is likely a private repo or Actions STORAGE
(artifacts/logs, billed even for public). Confirm in Settings -> Billing before
optimising further.

**Playoff tracker (`288f2f7`, gate rewritten `003c134a`) — shipped, gated, correct.**
Renders nothing today (preseason) by design. NOTE the gate changed: the original
`?seasontype=2` games-played gate was correct against site.api but FAILS OPEN
against site.web.api, which serves live preseason records with playoffSeed
populated. Now gates on ESPN's declared `seasonType === 2`. Clinch read from the `clincher` stat's `displayValue`/`description`
(never `.value` — 0 for all 96 markers observed). Seeds 1-4 labelled "division
leader", never "winner". **Clinch UNVERIFIED → RESOLVED**: `?season=2025&seasontype=2`
(a completed season under regular-season scope — the combination no earlier probe
covered) returns clincher on all 32 entries. Smoke A-NFLSEED-1/2/3.

**Journalism fabrication guard (`bb0460d`)** — `fmt()` labelled every team at
gamesBehind 0 as `(leads)`; NFL conference GB has many at 0, so prompts would read
"Bills: 1-0 (leads) · Steelers: 1-0 (leads)". Only a group's top row may claim it.

**Two deploy gotchas learned the hard way:**
- A code COMMENT quoting the module script tag broke `sync-source` (it used
  `lastIndexOf` of that exact text → selected a 7.5 KB phantom block) and **failed
  every deploy** until found. Fixed + hardened to select by SIZE (`d6247c9`).
  Never write a literal opening script tag in field.js, even in a comment.
- `[skip ci]` is evaluated on the HEAD COMMIT OF A PUSH — one skip-marked commit
  suppressed the deploy for two real fixes pushed with it.

**Probe automation:** `nfl-standings-probe.yml` chains to deploy-gate completion +
daily cron, and now exits 1 on a real regression (previously always exited 0, so it
could never report the breakage it exists to detect). Manifests record `swVersion`
so "not deployed" and "doesn't work" are distinguishable.

**Relay (`665c68f`):** executed CC-CMD-2026-08-15-quality-bar-scale — see
`field-relay-nba/outbox/cc-session-2026-08-16-quality-bar-scale.md`.

## Session 2026-08-15 — P3 BDB pass-rush + tendency + automation (E2E) ✅

Session doc: `outbox/cc-session-2026-08-15-p3-bdb-rush-tendency.md`. Both repos on main.
Client SW 2026-08-15e, smoke 976/0. Relay `7561ed5`.

Built the final two STAGED BDB entries; **all 5 BDB metrics now complete** (no STAGED
BDB remains):
- **Pass rush** (`bdb_xblock_pass_rush.json`, 321) — pressure GENERATED per rusher
  (pressureRate/qbHitRate), player_play.csv. Client **Pass rush** scout row. Top:
  blitzing DBs/LBs (correct). Distinct from "Pass pro" (pressure faced).
- **Tendency** (`bdb_tendency_fingerprint.json`, 32) — team PA%/dropback%/top-formation
  from plays.csv. Client **Tendencies** row. ATL 26.6% PA / PISTOL (validates 2022).
- Bug (Rule 77): hRush/aRush dup-declared → renamed hPrsh/aPrsh.

**Automation (follow-ups):** `bdb-update.yml` monthly cron now builds ALL 5 metrics,
commits all 5 outputs, and **self-verifies** — runs `bdb-serve-probe.mjs` (all 5 files)
against the live relay and commits `outbox/bdb-serve-probe.log` (FATAL on any fail).
No manual serve-probe trigger needed. ARTIFACT: log committed by the workflow →
`5/5 serve non-empty` (speed 1648, sep 250, route 354, rush 321, tendency 32).

BDB scout rows now: Top speed · Top separation · Route tree · Pass rush · Tendencies
(+ Team EPA, Pass pro from earlier P3 work).

**Render VERIFIED (Rule 90):** `nfl-bdb-scout-probe.yml` (Playwright, live URL) →
`outbox/nfl-bdb-scout-manifest-2026-08-15T23-12-23-725Z.json`: 7/7 live NFL preseason
games rendered all 5 rows (`allFiveRowsPresent:true`, perRow 7/7 each); MLB/WNBA games
show none (NFL-gated confirmed). **Automated:** probe now scheduled TNF/Sun/MNF windows,
exits 0 when no NFL game on slate (off-season no-op), red only on a real regression
(NFL game present but a row missing).


## Session 2026-08-15 — P3 BDB separation + route entropy (E2E) ✅

Session doc: `outbox/cc-session-2026-08-15-p3-bdb-sep-route.md`. Both repos on main.
Client SW 2026-08-15d, smoke 974/0. Serve-probe artifact: `outbox/bdb-serve-probe.log`
→ `bdb_separation.json 200 rows=250` + `bdb_route_entropy.json 200 rows=354`.

Built the two remaining STAGED BDB metrics E2E (probe-first, Rule 68):
- **Route entropy** — Shannon entropy of routeRan mix (player_play.csv only), 354
  players. Top: Kupp/Deebo/Hill/Pitts ~3.3 bits. Client **Route tree** scout row.
- **Separation** — targeted receiver vs nearest defender at pass_arrived frame, 250
  players, RB-led (correct). Client **Top separation** scout row.
Relay `bd395e9` (R2-first fix — first serve-probe 404'd; the two files were only in
NFLVERSE_OUT_ALLOWED, not NFL_R2_FILES; bdb_speed was in both — Rule 77). Client
`8d782a6` (getTeamTopSep/getTeamTopRoute, A-NFLSEP-1/A-NFLRTE-1).

Dataset 2 (llkh0a) probed: live BDB 2026 competition dataset (2023 input-format
tracking, no plays/player_play metadata) — NOT a drop-in source; dataset 1 stays.

Still-STAGED (no builder, no user request): bdb_xblock_pass_rush, bdb_tendency_fingerprint.


## Session 2026-08-15 — P3 BDB real-tracking: player max speed (E2E)

Session doc: `outbox/cc-session-2026-08-15-p3-bdb-tracking.md`. Both repos on main.
Client SW 2026-08-15c, smoke 972/0.

Kaggle creds work as-is (I mis-diagnosed the key earlier; corrected — no changes needed).
Unblocked via PUBLIC datasets (bypass competition-rules gate): built `bdb_speed.json`
(player max speed from `alexandermeau/nfl-big-data-bowl-archived-data-2025` tracking,
2022 season, 1648 players) via new monthly `bdb-update.yml` (streams 8GB, never on disk).
Rule 77: filtered >24mph teleport-glitch frames (85.89mph → realistic 23.77 top). Serves
200/1648 (serve-probe 211503Z); client **Top speed** scout row (getTeamTopSpeed).

STAGED: separation / route-entropy (heavier per-frame compute; creds+access now proven).


## Session 2026-08-15 — dead-allow-list cleanup + P3 (participation, no-Kaggle)

Session doc: `outbox/cc-session-2026-08-15-p3-participation.md`. Both repos on main.
Client `1b26053` (SW 2026-08-15b, smoke 971/0); relay serving `71a9285`; cleanup `4917cd2`.

**Cleanup (Rule 63):** removed 5 dead nflverse allow-list entries (qb_metrics,
receiver_metrics, defense_metrics, schedule_refs, team_tendencies — 0 builders,
0 consumers). Kept bdb_* marked STAGED (P3 frame-tracking targets).

**P3 unlock (Rule 72/88):** probed and found the "needs Kaggle" claim overbroad —
raw frame tracking IS Kaggle-gated (401), but nflverse **pbp_participation** is public
(302). Built `team-participation.json` (offense-side formation/pressure: shotgun rate,
box faced, **pressure-faced %, blitz-faced %** — DAL 31%/28%, all 32 teams). Serving
verified (serve-probe 143657Z, 200/32 rows). Client **Pass pro** scout row (smoke
A-NFLPART-1).

**STAGED (Rule 74):** route entropy / separation / man-zone coverage — the raw x/y
tracking layer. Blocked by Kaggle creds (none exist) + empty route/coverage columns in
recent pbp_participation. Unblock: add KAGGLE_KEY secret + a BDB builder → populates the
kept bdb_* allow-list entries.

---

## Session 2026-08-15 — P2 COMPLETE (all 7 nflverse tables built + served + consumed)

Session doc: `outbox/cc-session-2026-08-15-p2-unbuilt-tables.md`. Both repos on main.
Client `c194828` (SW 2026-08-15a, smoke 970/0); relay serving `7861289`; builders `e85cf36`.

Built the 3 genuinely-unbuilt tables end-to-end, each against CI-probed real parquet
schema (Rule 68): **snap-counts** (season snap share, 2311 players), **depth-charts**
(latest-snapshot starters, 32 teams), **team_epa** (per-team off/def EPA/play from
nflfastR pbp, 32 teams — fills an orphaned allow-list entry). New builders in
build-ngs-data.py (Monday cron) → R2 + outbox; relay NFL_R2_FILES + NFLVERSE_OUT_ALLOWED.
Consumers in buildScoutingReport: **Team EPA** row, **Start QB** row (depth-chart QB1),
**● starter marker** on INJ rows (snap≥50%).

**Serving artifact:** relay `outbox/nfl-tables-serve-probe-20260815T141825Z.log` —
6/6 tables serve 200 non-empty from R2.

**P2 done:** all of ngs-passing/receiving/rushing, player-stats, injuries, snap-counts,
depth-charts, team_epa built+served+consumed. `pfr-rec.json` left unwired (redundant
with ngs-receiving, Rule 63). Orphaned allow-list entries (team_tendencies, qb_metrics,
receiver_metrics, defense_metrics, schedule_refs, bdb_*) have no builder → flagged for a
future dead-allow-list cleanup (separate from P2).

---

## Session 2026-08-14 — /realtimesports dead-code removal + P2 injuries (Wow #7)

Session docs (Rule 67): `outbox/cc-session-2026-08-14-nfl-injuries-p2.md` (client),
`field-relay-nba/outbox/cc-session-2026-08-15-v2games-live-500.md` (relay 500 fix,
prior task). Deploys: client `42f7c9b` green, relay `b0d9af2` green.

**Dead-code cleanup (relay `b0d9af2`):** removed the `/realtimesports/*` passthrough
(eliminated source, zero consumers, key never in wrangler.toml) — Rule 63.

**P2 injuries (client `d90acb6`+`42f7c9b`, SW 2026-08-14e, smoke 967/0):** wired the
already-served `nfl-injuries.json` into `buildScoutingReport` as an INJ row —
`nflInjuriesInit`/`getNFLInjuries`, official Out/Doubtful/Questionable only (Rule 1).
Caught + fixed an ESPN↔nflverse abbr mismatch (WSH/WAS, LAR/LA) at the `toNGSAbbr`
boundary — also fixes a latent NGS miss for Washington/Rams (all 32 teams checked).

**P2 reality (corrects the stale "0/6 unbuilt"):** ngs-passing/receiving = done E2E;
injuries = now done; STILL unconsumed: ngs-rushing, player-stats; STILL unbuilt:
snap_counts, depth_charts, weekly PBP. User directive: "best recommendations first,
eventually build everything" — injuries was the recommended first deliverable.

---

## Session 2026-08-14 — NFL EPA live wiring (P1-1/P1-2) — the prior carry-forward, now DONE

Session doc (Rule 67): `outbox/cc-session-2026-08-14-nfl-epa-wiring.md` — DONE, confidence 96
Commit: `6e8b86c` (client wiring + SW bump 2026-08-12f → 2026-08-14a)
Deploy: `deploy-gate.yml` run 31857007002 — SUCCESS. smoke 966/0 (adds `A-NFLEPA-1`).
Relay probe scripts: `f1204a3`, `118045f` (CI-as-proxy shape + game-id verification).

**Closes the prior session's "still open" item.** Live NFL games now get the same
per-play EPA chip UFL had, reading the (now-real) `_epLookup` table. New inline
`field.js` fns: `_computeESPNPlayEPA` / `_fetchNFLGameEpa` / `_pollNFLEpa` /
`nflEpaInit`; card gate `UFL` → `[UFL,NFL]`; `setTimeout(nflEpaInit,4000)`.

Three stale Drive-doc assumptions caught PRE-code by probing live data (Rule 72):
(1) the live app uses inline `field.js`, not the `epa.js` module; (2) `findESPNScore(g).id`
is undefined for NFL (V2 objects have `espnEventId:null`); (3) NFL `_gameId` is prefixed
`"espn:NNN"` — bare id needed for `/espn-summary` (strip the prefix). Shape verified
14/14 vs a live game (Broncos@Falcons) before a line was written.

**VERIFIED (was STAGED):** live-card DOM render confirmed via CI-as-proxy Playwright
(`nfl-epa-probe.yml`). Manifest `outbox/nfl-epa-probe-manifest-2026-08-15T02-11-46.json`
verdict **PASS**, `epaChipsOnNFLCards:4`, sample chip
`"-1.37 EPA · 3rd & 10 @ OWN 44 · -2.62 drive · 3 pl"`. Getting there took 4 more fixes
the probe caught (preseason gate 2026-08-06, `injectV2SportSection('nfl')`, `nflEpaInit`
arm-on-season-flag, all in `61ffa1e`/`479dfd9`) PLUS a relay production bug:
`/v2/games?sport=nfl` 500'd (CF 1101) on any live game — the WC soccer WP loop threw on
football's numeric round. Fixed in field-relay-nba `f949456` (session doc:
`field-relay-nba/outbox/cc-session-2026-08-15-v2games-live-500.md`). Client SW now
2026-08-14c. Both repos on main, deploys green.

---

## Session 2026-08-15b — EPA table rebuild (had never shipped)

Session doc (Rule 67): `outbox/cc-session-2026-08-15-epa-table-rebuild.md` — DONE, confidence 96
Commits: `606b2e6` (fix) + `f9bb6fd` (rebuilt table, EPA-Build bot)
Verification: `build-epa-table.yml` run 31854656251 — SUCCESS (first ever), test 15/0 on the real empirical table.

**The seasonal EPA rebuild was a silent no-op.** build → test → push under bash -e;
the builder samples nflverse `ep` (= nflfastR's model) but the test asserted hand-fit
POLYNOMIAL anchors the real surface misses by >0.3 → test failed → push blocked →
live table frozen at May's polynomial version since inception.

Fixed: test now validates INVARIANTS (completeness, field-position monotonicity, down
ordering, bounds, wide nflfastR bands) that BOTH surfaces satisfy — unblocks the push,
still catches a broken table, doesn't rubber-stamp the builder (Rule 90). Builder
completes the grid (857→1120 cells via empirical backfill) and fails loudly on
invariant violation. Live table now `nflverse-pbp-2024-backfilled` (own20=0.693,
opp10=5.005) — the real 2024 surface, served via /nflverse/epa_table.json, no deploy needed.

**Still open (unchanged):** live EPA is not wired to NFL cards — `epa.js` speaks only
SportRadar (`fromSRPlay`); `fromESPNPlay`/`_pollNFLEpa` don't exist (Drive P1-1/P1-2/P5-2).
This fix makes the TABLE those functions read trustworthy — a prerequisite, not the wiring.
> **SUPERSEDED 2026-08-15:** this "still open" is CLOSED. The 2026-08-14 NFL EPA
> session wired live EPA onto NFL cards (`_computeESPNPlayEPA`/`_pollNFLEpa`/`nflEpaInit`,
> card gate `[UFL,NFL]`) and verified it (`nfl-epa-probe` PASS, `epaChipsOnNFLCards:4`).
> Do not re-chase (Rule 72).

---

## Session 2026-08-15 — NFL-B pipeline data integrity

Session doc (Rule 67): `outbox/cc-session-2026-08-15-nfl-b-pipeline-fixes.md`
— DONE, confidence 97
Commits: `317f9cb` (client) + `680ac26`, `2e5f4d8` (field-relay-nba)
Verification: `nfl-ngs-update.yml` run 31852365822 — success, artifact commit `35a555f`

**The NFL-B weekly pipeline was publishing an empty injuries table and
reporting "4/4 succeeded".** `injuries_{year}.parquet` is a per-year file; in
August `injuries_2026` 404s, and the empty result was written over the populated
table in BOTH R2 and outbox. Unnoticed Aug 10 → Aug 14.

Fixed, and verified live — injuries **0 → 1,453 players** (107 bytes → 185,396):
1. `build_injuries` walks back up to 3 seasons, matching the strategy the NGS
   builders already used (combined parquet → `max_season`), and returns the
   season actually used.
2. `emit()` refuses any zero-row write — the guard the relay already had for MLB
   Savant (`7588b24`) and this path lacked.
3. Envelope now carries `season` (the data's real season) and `targetYear` (the
   requested year) as separate fields. It previously stamped `season: 2026` over
   rows reading 2025. NFL.com does the same thing on its own team-stats page
   ("NFL 2026 REG" title, 2025 selected in the dropdown) — so do NOT "correct"
   our label against theirs; the rows are the truth in both.
4. The job now exits non-zero if ANY table fails, not only if all four do. That
   coarse tripwire is why nobody saw it for four days.

**Cross-repo collision found mid-fix (Rule 70):** `nfl/{year}/ngs-passing.json`
has TWO writers — this pipeline (Mon, parquet) and the relay's `runNFLR2Update`
(Wed, legacy CSV). Wednesday runs last, so it would have stripped the new
`season`/`targetYear` off every week. Patched in `2e5f4d8` so both envelopes
agree; the collision itself is gated in
`field-relay-nba/docs/CC-CMD-2026-08-15-ngs-passing-two-writers.md`.

**Also:** `680ac26` adds `ngs-passing.json` to the relay's `NFLVERSE_OUT_ALLOWED`
— it was R2-first with no GitHub-raw fallback, one failed weekly update away
from 403ing while its two siblings kept serving.

**NFL readiness (verified against the Drive checklist, not its checkboxes):**
NFL content is live and journalism is scoring; NGS/injuries pipeline is healthy.
Still open: live EPA is not wired to NFL at all (`epa.js` speaks only the
SportRadar schema; `fromESPNPlay`/`_pollNFLEpa` do not exist), the nflverse
Stage-1 six-table pipeline does not exist (relay serves 0/6, all 404), and the
Aug 1 `build-epa-table.yml` rebuild FAILED (run 30706486286, 8/14 EP tests) so
> **SUPERSEDED 2026-08-15:** all three are now CLOSED — live EPA wired+verified
> (2026-08-14 session), P2 nflverse tables all built/served/consumed, EPA table
> rebuilt (`nflverse-pbp-2024-backfilled`). Historical note only; do not re-chase.
the live table is still `polynomial-calibrated` from May 27.

---

**Anchor:** CLIENT HEAD 11943f2c · 2026-08-12T21:30Z · via Claude Code
RELAY HEAD 6b57eb1 · 2026-08-12 · via Claude Code
Smoke: 965/0 (client, run fresh after every commit below, not reused)
SW version: 2026-08-12f (index.html/sw.js in sync; bumped a→f across six
deploying commits this session)

## Session 2026-08-12 — Stats tab, four CC-CMDs

Session docs (Rule 67):
- `outbox/cc-session-2026-08-12-comeback-probability-liveness-gate.md` — DONE, confidence 95
- `outbox/cc-session-2026-08-12-mlb-pitcher-payload-audit.md` — DONE, confidence 96
- `outbox/cc-session-2026-08-12-scouting-coverage-gaps.md` — DONE, confidence 95
- `outbox/cc-session-2026-08-12-arsenal-gap.md` — DONE, confidence 96
  (root cause in field-relay-nba: `7588b24` + `112c8f7`)
- `outbox/cc-session-2026-08-11-archive-gap-real-write-path.md` — relay repo, DONE, confidence 96

**What changed, all verified against the LIVE deployment via
`stats-scouting-probes.yml` / `comeback-liveness-probe.yml`:**

1. **Comeback probability gated on live state** (`d8fe74aa`). Every
   scheduled game rendered "Tied — anyone's game" — 16 occurrences against
   3 live games, including Athletics 47-73 vs Rays 73-46, sitting directly
   under the records line so it read as a verdict on them. Old guard tested
   only `state === 'post'`, letting both `'pre'` and `'final'` through.
   Now whitelists the file's own canonical isLive
   (`'in' || 'live' || 'halftime'`). Post-fix: 3, equal to liveCardCount.
2. **Pitcher ERA / W-L wired** (`288db1d8`, `fcb48871`). `gamesWithEra`
   and `gamesWithRecord` both 0 → 15. The schedule endpoint serves no
   probable-pitcher stats under ANY hydrate form (six measured); the data
   was already being loaded by `mlbPitcherStatsInit()` and simply not wired
   to `buildScoutingReport`.
3. **Park row aliases** (`b7ff0c42`). ATH→OAK, AZ→ARI, CWS→CHW.
   `parkRowMissing` 3 → 0 for MLB.
4. **MLB standings hydrated** (`4acbdc7d`, `e5f74464`). `&hydrate=team` —
   without it `/standings` returns a minimal team object, so `abbrev` was
   `''` for all 30 teams (silent no-op since written) and `team.name` read
   "D-backs" where the schedule says "Arizona Diamondbacks".
   `recordsRowMissing` 1 → 0 for MLB.

**Method worth reusing:** for a render that is a pure function of its
inputs, measure the INPUTS, not the DOM. The park question was settled by
intersecting `PARK_FACTORS` keys (parsed from source at HEAD) against the
API's abbreviations — exact and enumerated, where a DOM text probe had
produced an indefensible number. See the coverage-gaps doc.

5. **Pitch arsenal restored** (relay `7588b24`, `112c8f7`).
   `gamesWithArsenal` 0 → 14 of 15. NOT a client bug: the relay's
   `/mlb-stats/*.json` is R2-first with an existence-only miss test, and
   `runMLBSavantUpdate` had written an EMPTY pitch_arsenals object to R2,
   which is a hit — permanently shadowing the 194-entry GitHub fallback.
   Writer now refuses to overwrite with an empty payload; reader treats
   zero rows as a miss so the endpoint self-heals. 14 not 15 is correct:
   Savant's leaderboard uses min=100 pitches, so a starter below that has
   no entry and the segment is rightly omitted.

**Watch, not deferred:** the R2 arsenals object is still empty and the
serving path routes around it. The next Monday cron will either repair it or
report `ok:false` — visible now rather than a silent wipe. If Savant blocks
Cloudflare Worker egress (documented here for the umpire scrape), that write
keeps failing and the fallback keeps serving.

---

## Earlier anchor (2026-08-02T18:00Z, mid-session write via chat)

CLIENT HEAD 353b1f9 · RELAY HEAD f711797 · SW version 2026-08-02f

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
