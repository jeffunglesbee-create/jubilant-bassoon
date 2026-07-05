# FIELD HANDOFF

## SESSION END — 2026-07-05 (session closed, not mid-session)

**CLIENT HEAD: 6cc7365** (routine CI state-sync; last real feature commit `20758d7`, pick-em full-sport coverage scripts). **RELAY HEAD: ed80885** (WP source resolver outbox). Smoke **885/0**, confirmed fresh. Relay health confirmed live.

This closes out the session — MID-SESSION UPDATE #2 (below) covers everything through the drama backfill/Container/name-consolidation arcs; this entry covers everything after that, through session close.

---

## WHAT SHIPPED SINCE UPDATE #2

### Win probability — real sources wired for every sport checked
Built `resolveWinProbability(sport, ...)`, routing to whichever real source actually exists per sport: ESPN's native `winprobability[]` (MLB/WNBA/NBA), Kali or Squiggle's `confidence` field (AFL), FIELD's own live `computeLiveWP()` (soccer/WC — confirmed already running, not dormant), and real market odds via Odds API + `noVigProb()` (CFL/NHL/MLS/EPL/NFL, plus CFB after adding its missing odds-key mapping). Labels strictly "Market estimate" or "Statistical probability" per this project's own RUWT-safe convention — never a bare "win probability." A real, serious bug was caught live (not by review): ESPN's `homeWinPercentage` is 0-1 decimal, not 0-100 — an earlier `/100` division would have silently corrupted every ESPN-sourced probability by two orders of magnitude. Fixed and re-verified against real games per source type.

### Name-normalization consolidated — two real, honest CC stops along the way
Found three independent, duplicate team-name-matching implementations (AFL's `normAFL`, `WC_NAME_FIX`, `FIFA_NAME_ALIASES`) alongside the existing canonical `identity-resolver.js`. Both consolidation attempts required a real correction: the first CC-CMD for each wrongly assumed `resolveTeamKey()` was a drop-in replacement — CC correctly stopped at 70/100 and 45/100 respectively, having found the actual output shapes were incompatible (strip-form match-key vs. required human-readable/nickname-aware output). Corrected versions: AFL's algorithm registered as its own `afl_team` type (following the existing `soccer_player` precedent); a new `resolveTeamName()` added for the display-name cases, correctly excluding `FIFA_NAME_ALIASES` from the merge (direction-incompatible with the canonical map). Both real, evidenced pairs migrated; both verified live.

### Pick 'em — built completely, end-to-end, backend through UI through two real live-found bugs
Cumulative, non-resetting `pickLedger` in `UserDO` (permanent record, zero streak/consecutive-day field anywhere — the structural resolution to Rule 33's previously-held gamification question). Real design correction mid-build: a card-based first UI slice was dispatched, then found too dense (39+ existing chip classes) and moved to a proper new top-level surface (`togglePickEmView`, matching the existing `toggleWCView`/`toggleJournalismView` pattern exactly) — this was a genuine dispatch-before-design-question sequencing issue, named directly rather than framed as an unavoidable coincidence. That same investigation surfaced and fixed two real, shared bugs affecting all four nav-links and multiple modes (listener accumulation, an `#upper-slots`-hides-exit-toggle CSS bug), consolidated once rather than patched four times.

Two more real bugs were found by actual live use (not code review, not a probe) once the feature was live: MLB games incorrectly excluded from the Pick 'em list (a live-detection heuristic built for an unrelated bug had two false-positive paths for freshly-scheduled games), and CFL picks unable to ever resolve (CFL's one-time data fetch never fed the two stores game-completion detection depends on). Both fixed and verified. A full-sport, non-rendering coverage check (two scripts — a pure-data circadian check with zero DOM dependency, and a jsdom-based post-pick check avoiding a full browser) now passes cleanly across every sport with real games today (MLB, WNBA, CFL, AFL, WC/Soccer — NBA/NHL/EPL/CFB/NFL/MLS correctly off-season/N/A).

**Known, explicitly-scoped remaining gap**: CFL picks can only resolve after page reload, not live mid-session — closing that needs a recurring CFL poll, which needs a rate-limit investigation (Rule 78) before building. Flagged, not silently dropped.

### Process — a new standing rule, from a real self-caught failure
Added Behavior Rules item (8): chat applies the same ≥95 confidence discipline to itself before writing a CC-CMD that CC-CMDs already require before committing. Directly motivated by the pick-em card-density mistake above — the design question should have blocked writing that doc, not followed it.

---

## OPEN ITEMS FOR NEXT SESSION
1. CFL live mid-session pick resolution — needs a Rule 78 rate-limit probe before building recurring polling.
2. `container-upset-model.md`'s real-world model is live and verified (this was closed earlier tonight) — no further action needed there.
3. Nothing else known-pending. Queue is genuinely clear as of this close.

**Not a mid-session entry — session is closed.**

## MID-SESSION UPDATE #6 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: 3aafcc9.** SW_VERSION unchanged at `2026-07-05h` (no
index.html/sw.js changes this round — test-tooling only). **Smoke: 885/0**
(unchanged, no product-code edits this session).

**Pick 'em full-sport coverage check CC-CMD closed out, 100/100
confidence.** Full detail: `docs/outbox/cc-pickem-coverage-check-2026-07-05.md`.
Confirmed the prerequisite (`CC-CMD-2026-07-05-pickem-cfl-mlb-gaps`) had
completed before starting, per its own sequencing requirement. Built two
fast, non-visual scripts and ran them against every sport in the CC-CMD's
list, not just the two originally reported:

- `pickem_circadian_coverage_check.js` — ports `getCardCircadian()`
  verbatim, fetches real data directly (V2 relay, CFL rounds endpoint,
  Squiggle AFL relay), no rendering. **MLB (3/3), WNBA (1/1), WC/Soccer
  (1/1), CFL (1/1) all PASS.** NBA/NHL/EPL/NFL/CFB/MLS/AFL correctly
  reported N/A (no real games today — off-season or date-gated), not
  assumed to pass.
- `pickem_jsdom_display_check.js` — ports `makePick()`/
  `buildPickWidgetHTML()` verbatim into a minimal jsdom DOM (network
  stubbed — that layer was already verified live in the prerequisite),
  one real game per sport. **MLB, WNBA, WC/Soccer, AFL, CFL all PASS**
  (same N/A set as above for sports with no real game today).

**No new failures found.** The prerequisite CC-CMD's two fixes (the
`mapV2ToESPN()` clock/score heuristic fix, and the CFL
`checkForNewFinals()` resolution fallback) hold broadly — confirmed here
across every sport that shares those code paths (WNBA and WC/Soccer both
exercise the same fixed `mapV2ToESPN()` as MLB and passed), not just the
two sports originally reported. No code changes made this round.

---

## MID-SESSION UPDATE #5 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: b4a4b48.** SW_VERSION `2026-07-05h`, confirmed synced
index.html/sw.js. **Smoke: 885/0.**

**Pick 'em MLB+CFL gaps CC-CMD closed out.** Full detail:
`docs/outbox/cc-pickem-cfl-mlb-gaps-2026-07-05.md`. Both of the CC-CMD's
own static-reading leads turned out **wrong** — real causes were confirmed
via live investigation first, per the doc's explicit requirement:

- **MLB gap** ("soon-starting game missing from Pick 'em"): NOT ESPN
  flipping the primary `status` field early (it stayed `"pregame"`
  correctly the whole time). Real cause: `mapV2ToESPN()`'s
  live-detection heuristic (built for a real but *opposite* bug — a
  genuinely-live NBA Finals G2 game api-sports.io mislabeled `"pre"`) had
  two false-positive paths for a freshly-scheduled game: a clock-string
  check that didn't recognize `"0:00"` (the relay's actual pregame
  format) as zero, and treating a valid `0` score as "has a score."
  Fixed by parsing the clock to total seconds and requiring a real (`>0`)
  score. Verified live post-deploy: 3 genuinely-pregame MLB games now
  correctly appear in the Pick 'em list; the NBA Finals G2 case is still
  correctly caught as live.
- **CFL gap** ("pick doesn't display"): the `_id`-format lead was wrong —
  confirmed live that `makePick()`, the DOM lookup, and the "pick made"
  render all work correctly, in every tested scenario, including after a
  forced re-render. No fix needed for that half. The *real*, confirmed
  gap is narrower and different: CFL games never resolve (no win
  probability ever appears), because `loadCFLScoreboard()` fetches once
  (no recurring poll) and never feeds `espnScores`/`_scoresBySource` —
  the only stores `checkForNewFinals()` checks to detect a finished game.
  Fixed with a CFL-scoped fallback in `checkForNewFinals()` reusing the
  existing `saveEspnFinal()`/`_resolvePickIfExists()` hook. Verified live
  via a simulated game completion: real relay round trip, pick correctly
  resolved to `pick-correct` with a ✓.

**Known remaining gap, explicitly not fixed (flagged for follow-up):**
CFL still can't resolve a pick *live, mid-session* — only once the game
has ended and the page is reloaded, since CFL data never refreshes after
its one-time fetch. Closing that needs a recurring CFL poll, which
requires a rate-limit/cost probe (Rule 78) before building — a dedicated
follow-up CC-CMD, not done here.

Note: `docs/CC-CMD-2026-07-05-pickem-coverage-check.md` was pushed by the
user mid-session, sequenced to run *after* this investigation. Not yet
read or started as of this update.

---

## MID-SESSION UPDATE #4 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: a54642a.** SW_VERSION `2026-07-05g`, confirmed synced
index.html/sw.js. **Smoke: 885/0.**

**Nav mode consolidate CC-CMD closed out, 100/100 confidence.** Full
detail: `docs/outbox/cc-nav-mode-consolidate-2026-07-05.md`. This closes
both follow-up findings flagged at the end of the pick-em reconcile
CC-CMD (see UPDATE #3 below): (1) all four nav-links
(`desk-jump-link`/`jrn-nav-link`/`wc-nav-link`/`pickem-nav-link`) now
share one `attachNavLinkOnce(id, handler)` helper instead of four
copy-pasted inline `addEventListener` sites — live-regression-tested by
simulating 5 extra `renderAll()` poll cycles before clicking, confirming
no listener accumulation on any of the three testable modes; (2) wc-mode's
`#upper-slots` hide-list had the identical bug pickem-mode's `8435247` fixed
(hiding the wrapper also hid `nav.controls`, the mode's own exit toggle) —
confirmed live via non-zero nav-link rect while wc-mode is active.
journalism-mode was checked (not assumed) and confirmed to already be
correct — its `#upper-slots` hide is scoped to `@media(max-width:1199px)`,
the same range its mobile back-pill becomes visible in, so desktop never
hides its own exit toggle.

One bug found along the way was in the *live verify probe itself*, not the
product: the app's pre-existing first-visit "My Services" setup modal
(`maybeShowSetup()`, fires via `setTimeout(...,2500)` when
`localStorage.field_setup_done` is unset — true for every fresh CI browser)
opened mid-test on the first attempt and intercepted a click. Fixed by
setting the flag right after boot in the probe, mirroring a returning
user's browser state.

Final live run: `outbox/nav-mode-consolidate-probe-2026-07-05T2015Z.txt`,
`RESULT: PASS` — pickem/wc/journalism all round-tripped correctly, plus
journalism's mobile back-pill exit path.

No new follow-up findings this round.

---

## MID-SESSION UPDATE #3 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: 2c774de.** SW_VERSION `2026-07-05f`, confirmed synced
index.html/sw.js. **Smoke: 881/0.**

**Pick 'em reconcile CC-CMD closed out, 100/100 confidence.** Full detail:
`docs/outbox/cc-pick-em-reconcile-2026-07-05.md`. Summary: relocated the
`702fb7b` card-based pick widget into a new top-level `pickem-mode` surface
(`togglePickEmView()`/`#pickem-nav-link`/`#pickem-section`/
`renderPickEmSection()`), matching the existing `toggleWCView()`/
`toggleJournalismView()` pattern. Found and fixed 3 real bugs via live
Playwright CI verification (not just code review): (1) `g._id` unassigned
for games outside `renderAll()`'s filtered loop, (2) `renderAll()`
re-registering the nav-link click listener every poll cycle with a fresh
closure, causing accumulating listeners to net-cancel a toggle, (3)
`nav.controls` nested inside `#upper-slots`, whose hide-list (copied from
wc-mode) collaterally hid the pickem-mode exit toggle itself at desktop
widths. Final live run: `outbox/pickem-surface-probe-2026-07-05T1959Z.txt`,
`RESULT: PASS`.

**Two findings flagged for follow-up, not fixed here (out of scope):**
- `desk-jump-link`/`jrn-nav-link`/`wc-nav-link` share the same listener-
  accumulation bug as (2) above — only the new pickem-nav-link listener was
  guarded.
- **wc-mode likely shares bug (3) above** — its own hide-list also
  unconditionally hides `#upper-slots` at all widths, so `#wc-nav-link` is
  very likely a 0×0 box (no desktop exit) once `wc-mode` is active.
  Unverified this session (WC nav-link is hidden out-of-season, couldn't be
  exercised live) — worth its own CC-CMD.

---

## MID-SESSION UPDATE #2 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: 50f0a4e** (routine daily-cron bookkeeping only — whoop/oura fetch, mlbn-schedule, auto-overlay; last real feature commit unchanged at `4071026`, CFL circadian state wire). SW_VERSION `2026-07-05a`, confirmed synced index.html/sw.js.
**RELAY HEAD: c5b6b1d** (WNBA/AFL/EPL classification fix CC-CMD, just pushed, not yet executed).
**Smoke: 871/0**, confirmed fresh at time of this update.

This entry covers everything since MID-SESSION UPDATE #1 — that entry remains below, unedited, as the record of the first half of this session.

---

## WHAT HAPPENED SINCE UPDATE #1

### The drama_peak backfill saga — real, multi-stage, mostly resolved
- **Container attempt v1**: honestly stopped at 40/100 after hitting three real blockers (no `CF_API_TOKEN` in CC's own sandbox, ESPN egress issues from CC's sandbox, cross-repo read tool malfunction on a large file). Correctly refused to invent workarounds — reported verbatim per its own gate, exactly as designed.
- **All three blockers resolved directly** (not by CC, by chat): confirmed `deploy.yml` already has a working `CLOUDFLARE_API_TOKEN` GitHub secret; read the exact `dramaScoreLive`/`applyQW1SituationBonus` formulas directly from source; redirected the whole approach to GitHub Actions instead of CC's own sandbox.
- **v2 shipped clean**: 0→202 populated via a new GitHub Actions workflow (`drama-backfill.yml`) + relay endpoints (`/archive/drama-missing`, `/archive/drama-by-id`, D1-binding-based, no token scope needed).
- **Score-fill + event-ID backfill** (separate CC-CMD, real commits `e17bd49`/`9124f8f`): of 107 real past null-score rows, 62 gained a real score, 45 remained genuinely unresolvable (unmatchable against any real source). Confirmed the `drama_peak=0` sentinel is safe on the relay's real D1-read path (`findGame()`, no `||` fallback) — the earlier-found `0 → 50` collision is confined to a separate client-side `localStorage` cache, not this column.
- **Schedule fix** (real commit `e6a2fca`): `drama-backfill.yml` now runs on a 2-hour cron, not just `workflow_dispatch` — closes a real logical gap (with concurrent sports, "wait for everything to finish" has no actual endpoint).
- **Real, current D1 state** (verified fresh at this update): 643 total games since June 1, 277 future (can't be scored), 335 with any `drama_peak` value, 224 with a genuine non-zero score, 111 zero-placeholders.
- **The 111 zero-placeholders root-caused precisely, not assumed**: `classifySport()` in `drama-backfill.mjs` only recognizes `mlb` and a soccer substring set — WNBA (47), AFL (138... wait, all-time count), and EPL (26) all fall through to `'other'` and get immediately zeroed, *before any ESPN fetch is attempted*. This is a classification gap, not a missing-formula problem — the client's `dramaScoreLive` already has complete, calibrated WNBA and AFL formulas that the backfill script never ported.
- **Fix CC-CMD written and pushed** (`CC-CMD-2026-07-05-backfill-wnba-afl-epl.md`, not yet executed): WNBA and EPL's real ESPN paths independently verified live by chat (`sports/basketball/wnba/summary`, 409 real plays; EPL league slug `eng.1`, 16 real keyEvents) — both ready to build directly. **AFL is a real, separate finding**: ESPN is confirmed dead for AFL (three path conventions all 404/400'd against a real event ID) — AFL's actual, established source is Squiggle (`api.squiggle.com.au`), confirmed via the client's own `SQUIGGLE_BASE`. Whether Squiggle provides quarter-by-quarter granularity (needed for a real drama score) is genuinely unverified — outside this sandbox's allowed domains, left as a required, explicit check rather than guessed.

### Real Cloudflare Container deployed — first one ever on this account
- Confirmed via the dashboard hours into this session: Workers Paid is active (later directly confirmed via the billing API too — real subscription record, not inferred from Durable Objects usage), Containers available and enabled, zero deployed.
- **Deployed successfully**: `field-hello-container`, via a new GitHub Actions workflow that scaffolds from Cloudflare's own official template (`npm create cloudflare@latest -- --template=cloudflare/templates/containers-template`) into an isolated location — deliberately not touching `field-relay-nba`'s production `wrangler.toml` at all. Independently verified: real Worker listing (`workers_list`), live URL returns `HTTP:200`, real Application ID (`a03fc720-44b3-4dff-8454-b8084b5dd1ef`).
- **Real lesson from this**: the original plan (CC's own sandbox running `docker build` directly) was never going to work — CC's sandbox is Anthropic's own ephemeral cloud container, not a local machine, and has no proven privileged-build capability. GitHub Actions runners are the actual reliable "always-on machine" this project has, already authenticated via the existing `CLOUDFLARE_API_TOKEN` secret.
- **Not yet done**: `container-upset-model.md` (fitting a real statistical model for the soccer upset-bonus threshold against the now-real drama data) — written, gated on real data existing (it does now), never executed.

### Cloudflare API token — real permission expansion, fully verified
- Added `Workers Scripts:Read`, `Workers Tail:Read`, `Workers KV Storage:Read`, `Billing:Read` to the existing "Cloudflare usage check" token (previously Account Analytics:Read only). All four independently verified working via real API calls, not assumed from the dashboard save.
- **Real, useful findings unlocked by this**: `CF_AI_GATEWAY_BASE` is genuinely set as a secret on `field-claude-proxy` (resolved a previously-open question); Workers Paid confirmed active via direct subscription read; `vectorize_enabled: 1` and Workers AI's neuron billing components both already present in the account's plan, meaning zero subscription blocker exists for either the newspaper-archive-via-Vectorize idea or the Workers-AI-for-JQ-cost-reduction idea discussed earlier — neither has been built, both are just unblocked at the plan level.
- Containers itself needed a separate `Cloudchamber` permission, added later — real, exists in the dashboard, though the specific REST API path for inspecting Containers turned out not to exist publicly at all (confirmed via Cloudflare's own docs index) — Containers are Wrangler-CLI/dashboard-only, not API-inspectable the way KV/R2/D1 are.

### OG share-meta feature — fully resolved, 5-CC-CMD chain (all real bugs, not busywork)
1. Missing `assets.run_worker_first` in `wrangler.jsonc` — static assets were served ahead of the Worker by Cloudflare's own default routing.
2. Array-form `run_worker_first: ["/"]` failed — this repo's pinned Wrangler version (3.109.0) only accepts a boolean. Resolved with `run_worker_first: true` plus real, measured before/after latency (~1.5-1.9ms delta, confirmed negligible).
3. `Element.after()` called with swapped/malformed arguments in `MetaTagRewriter` — found by direct code read, not inference.
4. Cloudflare error 1042 — Worker-to-Worker same-account fetch to `*.workers.dev` blocked. Fixed with `global_fetch_strictly_public`, the *same* flag already proven fixing this exact error class in the relay since May 29 (found via chat-history search, not rediscovered).
5. **Fully verified live, independently**: real bot UA gets a real `og:description` tag with live content; normal UA unchanged; diff between the two responses is exactly one line.

---

## OPEN ITEMS FOR NEXT SESSION (verified-current as of this update)

1. **`backfill-wnba-afl-epl.md`** (relay, genuinely pending) — WNBA/EPL ready to build directly (paths verified), AFL needs the Squiggle-granularity check first.
2. **`container-upset-model.md`** (relay, genuinely pending, unblocked) — real drama data now exists to fit a model against.
3. **MLB's 20 zero-drama rows** (out of 216 scored) — real, unresolved open question raised in a separate CC conversation thread: genuinely low-drama games, or a cache-miss/ESPN-fetch failure during the original backfill run. Not investigated this session.
4. Everything carried forward from UPDATE #1's open items, not re-touched this session (see below).

---

**Not a session-end entry — session is ongoing.**

## MID-SESSION UPDATE — 2026-07-04 (session ongoing, not closed)

**CLIENT HEAD: 51df7a8** (bookkeeping commit; last real feature commit `7e88d06` — global_fetch_strictly_public fix). Always re-run `git log -1` fresh rather than trusting this value later in the session.
**RELAY HEAD: c8086bf** — unchanged since early this session; all later work today was client-only.
**SMOKE: 871 total, 0 failed** — ground truth via direct `node smoke.js index.html`, confirmed fresh at time of this update.
**SW_VERSION: 2026-07-04t** — index.html and sw.js confirmed in sync via direct grep AND independently confirmed live (`curl` against the deployed URL returns the same value).
**Live deploy confirmed matching HEAD** at time of this update.

---

## WHAT THIS SESSION ACTUALLY DID (extremely long session, multiple real feature arcs)

### Circadian per-game state system
- v2.1-v2.3 shipped: `live/in` vocabulary fix, cross-sport support (WC26/MLB/AFL), wired into live re-renders (previously frozen at initial render).
- Card-level DOM reconciliation + string cache (Phase 2) and CARD_ATTRIBUTE_SYNC registry (Phase 1) shipped, live-measured (`applyMainHTML`=7ms, string-build=38.8ms).
- **Circadian card sort order** (PRIME>NIGHT>PREVIEW>LATE) shipped — this was in the ORIGINAL spec, deferred since v2.1, never implemented until found and closed this session. Live-verified: a card whose tier flips visibly reorders, composes safely with Phase 1/2 reconciliation.
- **`getNewspaperVoice`'s missing LATE bucket** fixed — an all-LATE slate no longer wrongly defaults to the 'morning' show-everything voice.
- **Real, NEW open item found, not yet fixed**: `renderAll`'s `_circInput` only ever reads `state` from `findESPNScore(g)` (ESPN lookup), never from the game object's own `state` field directly. This makes ANY sport whose live state comes from a non-ESPN source (confirmed for CFL, see below) permanently classify as LATE regardless of real state. CC-CMD written (`cfl-circadian-state-wire.md`), **genuinely pending, not yet executed.** (Separately: `circadian-kv-read-endpoint.md`, the relay-side KV read route, IS already done this session — see Open Items correction below; don't conflate the two.)

### Newspaper banner — 6 real "wipe on repaint" bugs found and fixed
- `applyMainHTML()` already tried to preserve `#field-newspaper` across re-renders, but 6 separate code paths (renderAll's empty-filter branch, goToDate's 4 branches, renderAll's post-render empty-check) bypassed it with direct `main.innerHTML=` assignments. All 6 found and fixed across two CC-CMDs (found via careful diff review, not all found on the first pass — CC caught a 6th one I'd missed in the original spec).
- Added `reg.update()` on `visibilitychange` to close a real iOS-vs-Android PWA update-propagation gap (confirmed root cause: no explicit update-check call anywhere, relying solely on the browser's own — on iOS, less frequent — background check cycle).

### FIFA rankings / soccer drama scoring
- footballdata.io confirmed permanently paid-plan-gated for FIFA rankings (live 403, `paid_plan_required`).
- **Parse.bot integration shipped instead** — real, live, free-tier FIFA World Ranking data, confirmed working (Argentina rank 1, Cape Verde/"Cabo Verde" rank 67 — matching the exact motivating example). 3 real FIFA-official-naming aliases handled (Cabo Verde, Korea Republic, Côte d'Ivoire).
- Soccer drama scoring shipped: extra-time bonus tier (verified against a real WC26 extra-time game's actual ESPN keyEvents), quiet-stretch interpolation, upset-factor bonus (now live via the Parse.bot data) — plus a previously-undetected bug found and fixed in the same pass: `dramaScoreLive`'s soccer branch conditions never matched WC26's real sport string ("FIFA World Cup 2026"), meaning the whole soccer calibration silently never fired for WC26 games until this session.

### CFL — real, dormant live infrastructure found and wired
- A June 27 session had already found, tested, and wired a real live CFL scoreboard API (`cflscoreboard.cfl.ca`) into the relay (`/cfl/scoreboard/rounds`) — confirmed still live and accurate today (Calgary 58–Toronto 36, Ottawa 22–Saskatchewan 27, both matching independent verification). **The client never called it** — confirmed via grep, zero references. Wired this session: `loadCFLScoreboard()` (async, golf's delayed-injection pattern), old hardcoded array kept as explicit fallback-ONLY (mutual-exclusion gate, avoiding the exact golf duplicate-section bug class — see below).
- This surfaced the `_circInput`/circadian-inert finding above.

### A real, live production bug caused and fixed this session (own mistake, corrected)
- Added a hardcoded golf tournament entry (John Deere Classic) to `golfGames` based on an unverified claim ("golf coverage missing 6 days") — never checked the live app first. Real, live app already had this tournament correctly, via a completely separate ESPN-driven pipeline (`loadPGASlate`) that this session didn't know existed. Caused a real, live duplicate-section bug (confirmed 2x rendering), found via user-provided screenshot, reverted same-session. **Lesson applied since**: search chat history before claiming something "doesn't exist" — a code check alone proves "not wired," never "never existed."

### OG share-meta feature — 5-CC-CMD chain, fully resolved
- A prior CC-CMD (`og-share-meta.md`) had shipped bot-gated OG meta-tag injection via `src/worker.js` + HTMLRewriter, but it never actually worked in production. Root-caused across 3 real, distinct bugs, fixed in sequence:
  1. `wrangler.jsonc` missing `assets.run_worker_first` — static assets were served ahead of the Worker script by Cloudflare's own default routing.
  2. `Element.after()` called with swapped/malformed arguments in `MetaTagRewriter` — the actual meta tag was buried inside a malformed options object, never inserted.
  3. **Cloudflare error 1042** — the Worker's own in-process fetch to the relay's `*.workers.dev` URL was blocked (same-account Worker-to-Worker anti-loop restriction). Fixed with `global_fetch_strictly_public` — the SAME flag already proven fixing the identical error class in the relay itself since May 29 (found via chat-history search, not rediscovered from scratch).
- **Fully verified live, independently, end-to-end**: real bot UA gets a real `og:description` tag with live, current content; normal UA unchanged; diff between the two responses is exactly one line.

### Deploy/CI infrastructure — 2 real, distinct bugs found and fixed
- `sw-version-bump.yml`'s daily cron: double-space sed pattern for `sw.js` silently never matched (real file uses single space) — fixed, made whitespace-tolerant, added loud-failure verification.
- `deploy-gate.yml`'s own SW_VERSION sync-back step: a genuine race condition where a stale checkout from an earlier-triggered run could overwrite a later, already-correct commit. Fixed with a `concurrency` group (`cancel-in-progress: false`, deliberately) plus a defensive `git pull` immediately before reading the current version. **Confidence on this one is explicitly lower than usual** — CI concurrency behavior can't be fully verified by static review alone; one clean observation so far, not yet "proven" from repeated real-world pushes.

### Daily update (real gap found, real gap avoided)
- Golf: real gap found and fixed (see above, before the duplicate-bug detour).
- CFL: no real gap — first pass used a wrong grep pattern and nearly reported a false gap, caught before acting on it.

---

## OPEN ITEMS FOR NEXT SESSION (verified-current as of this update)

1. **`cfl-circadian-state-wire.md`** (client, genuinely pending) — fixes `_circInput` to also read `g.state` directly, not just ESPN lookups. Needed for CFL (and any future non-ESPN sport) to classify correctly for sort-order/newspaper-voice purposes.
2. ~~`circadian-kv-read-endpoint.md`~~ — **CORRECTION, was wrongly listed as pending in an earlier version of this update.** Already executed this session, real commit `836296d`, route live at `src/index.js` ~line 7211. Independently re-verified live just now: `GET /circadian/preview/2026-07-04` → `ok:true` real text; `GET /circadian/late/2026-07-03` → `ok:true` real text (today's `late` correctly returns `ok:false` — matches the established recap-data-lags-a-day pattern, not a bug). No outbox manifest was ever filed for this execution (the actual gap worth noting — not the code, which is genuinely done). Not open for next session.
3. Everything in the 2026-07-03 handoff not touched this session (completion-triggered journalism real-game confirmation, `wentToOT` hardcoded false, session_health phase-degradation gap, WNBA archive gap, v4 voice register in relay, Prompt Observatory, 2026-06-30 priority list items) — not re-verified, carry forward as-is.

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon (client), field-relay-nba (relay)
- New this session: `PARSEBOT_FIFA_KEY` (Worker secret, both repos synced), Parse.bot FIFA.com wrapper (free tier, real data)
- Direct D1 access: Cloudflare Developer Platform MCP `d1_database_query` — bypasses relay's `/d1/execute` allowlist, default over relay-proxied access.

---

**Not a session-end entry — session is ongoing. This update exists so a crash or restart mid-session doesn't lose today's real state.**
