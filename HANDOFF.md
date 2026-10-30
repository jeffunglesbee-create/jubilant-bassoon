# FIELD HANDOFF

## 2026-10-30 — the forward-window probe: an empty MLB window passes as "not measured" only when ESPN agrees, and its first read survives the page's own reload

`33e6300f`, `6d0931bc`, `63604fc7`, `acd686af`, `9643d7c8`, `70085ad6`, `ed340682` (docs `a7f22f25`, `1295c637`, `f37d7679`). No client code, no SW bump. Final live run 41136703711
(head `a7f22f25`, dispatch): every step green; manifest `cacheAccepted: true`, schema 2.1, 3 of 3 days, `verdict.mlb.state: not-measured`, no problems.

**What changed.** The probe failed whenever the window carried 0 MLB entries, which has been true since the last game (Wed 2026-10-28), so it was red for no product
reason. Now, when every forward day was read and the window is empty, ESPN's MLB scoreboard is asked about the same dates from Node: games the generator carries
-> FAIL; none, all fetched -> pass with "enrichment NOT MEASURED"; a date that could not be asked -> FAIL. Spring-training, exhibition and All-Star events are set
aside (the generator's `gameType=R,F,D,L,W` never carries them; ESPN lists them) and the manifest shows what and why. A window that was never read is `unread`, not
empty. Separately, the first read of the cache metadata retries a lost execution context: the page reloads itself when its service worker first activates
(`field.js:23439`), and 4 of 15 recorded runs (10-21, 10-26, 10-28, 10-30 21:11Z) reported `cacheAccepted:false` for a working page. Verdict: `scripts/forward-window-judge.cjs`;
read: `scripts/probe-meta-read.cjs`.

**Proof.** `check-forward-window-judge.mjs` 95 cases / `mutate-forward-window-judge.mjs` 69 of 69; `check-probe-meta-read.mjs` 32 cases (a real reload forced in headless
Chromium; the old read fails on the same page) / `mutate-probe-meta-read.mjs` 28 of 28. A four-lens independent review (22 agents, a skeptic per finding) found two real
defects in my own first version (ESPN counting non-carried events; an unread window judged as empty), both fixed. The natural race was survived live (run 41130436375:
`readFailures` has one `meta` entry, `cacheAccepted: true`).

**Other sports (asked 2026-10-30, built on the owner's go: `ed340682`).** The forward window file carries MLB, MLS and WNBA only (NHL and NBA are day 0 only by
design; NFL and college football are not in it), and the probe asserts the MLB count only. It now also reports, per sport and forward day, what the relay's
`/v2/games` lists beside what the file carries (`manifest.relaySports`, `manifest.coverage`, a table in the run log). **Reported, never asserted:** what counts as a
failure for these sports is the owner's call. First live read (run 41139258140, 10-31 / 11-01 / 11-02): NFL 0 / 12 / 1, college football 47 / 0 / 0, NBA 7 / 4 / 15,
NHL 10 / 5 / 4, all 12 cells clean, against a file carrying one game (WNBA) over the same three days. An upstream failure is null, never 0: HTTP non-OK, an `error`
key, or `source: nhle-error` (the relay answers NHL's outage with a 200, no games and count 0). `scripts/forward-window-relay.cjs`, checked by
`check-forward-window-relay.mjs` (45 cases) and `mutate-forward-window-relay.mjs` (33 of 33). **Found on the way:** the generator's day-0 NBA is 0 on a ten-game night
(Fri 10-30) because `field-data.yml` calls the 403'ing `/nba/liveData/...` passthrough with `curl -sf ... || echo '{}'`; added as a data point to field-relay-nba
`docs/CC-CMD-2026-10-22-nba-cdn-403-in-season.md` (`05bad2c`), not fixed. **Open, owner's call:** whether to assert anything about these sports, and the generator's NBA source.

**Armed.** `trig_01WSBRbTaZMQCpwYR1fJ2BNx` (2026-10-31T19:30Z): read the scheduled probe run, dispatch the dead-cron watch in field-relay-nba, confirm
`forward-window-probe.yml` leaves NEW (the watch judges only the last three scheduled runs: 10-28, 10-29, 10-30 all failed).

Session doc: outbox/cc-session-2026-10-30-forward-window-probe.md

## 2026-10-30 — a live match now gets shots (relay change, no client change)

Relay `af644f66` and `0f5dcede`; no client commit. The client already reads `bsd:stats.shotmap` as an array (`94d8b56`, `18b4873`); until now nothing sent one
during a live match (0 of 170 recorded WebSocket event frames carry it). AmbientDO now polls the vendor's REST `/stats/` once a minute for each activated,
still-streaming match and hands the array to the next `bsd:stats` once. Capped at 600 calls a day (the owner's number), stopped for the UTC day by the first
429/401/402/403, `bsdPoll` on `/ambient/state`. **Verified live** on event 7314 (Brasileirao): a bsd:stats carried 26 shots in the shape `_bsdShotPoint` reads
(`pos{x,y}`, boolean `home`). Not drawn on a real page: the client probe proves the reader on recorded payloads, and no live match was on the page. CONTRACTS.md synced.

**New to know:** `side` is null on `gameon` and `temporary_interruption` ball frames; the client does not read `side`.

Session doc: field-relay-nba outbox/cc-session-2026-10-29-bsd-pitch-renderer.md (Part 4)

## 2026-10-29 — the debrief's odds layers skip an opening captured after kickoff

`26ee3239`, SW 2026-10-29b; deploy gate run 40932255038 (success). Relay half: field-relay-nba `66a61d2` (run 40930832200).

**What changed.** The relay's CI backfill writes one snapshot into both odds columns, so a game that kicked off before the 23:59Z
snapshot has an "opening" captured during it (priced openings carrying the late mark, 2026-09-16 to 2026-10-29: CFB 116 of 183, NHL 97 of
202, NBA 15 of 69, NFL 4 of 33). `buildOddsStory` turned it into CHALK / UPSET / SWEAT and `buildOddsMovement` printed "Home line
opened ...". Both now return nothing when `opening._kickoff.late_minutes` is finite (`_openingCapturedLate`, `src/debrief/index.ts`).
The test is `late_minutes`, not `verified: false`, which the relay also writes for a kickoff it could not read.

**Relay contract (Rule 65).** Unchanged: `/context/game/{id}` serves `game.opening_odds_parsed._kickoff = {at, verified, late_minutes}`
(read live on `NHL_2026-09-29_e401891827`: `verified:false, late_minutes:55`). CONTRACTS.md carries the consumer rule; the relay copy matches.

**Proof:** `scripts/check-opening-odds-late.mjs` runs the real exported layers on the three real `_kickoff` shapes plus the unmarked case
(5 openings x 2 layers + 2 through `buildDebrief`): 5 FAIL on the pre-change source, 0 after; `scripts/mutate-opening-odds-late.mjs`
9 of 9 caught. Wired into `deploy-gate.yml`. **Live:** the deployed page reports `window.SW_VERSION` 2026-10-29b and its served HTML carries `_openingCapturedLate` three times (definition and both calls) and the `late_minutes` read (browser session, 2026-10-29 18:41Z).

**Not touched, and why.** `_isUpset`, the market-consensus functions and the Upset Archaeology panel read `/archive/query`, which serves
the `briefs` table (no odds, no scores), and the relay has no `/archive/upsets` route, so they never receive an `opening_odds` and
stay hidden (already in field-relay-nba `outbox/odds-american-readers-2026-10-20.md`). `_consensusOverRate` takes `Number()` of an
object (NaN); with no feed it never runs. Recorded in field-relay-nba `outbox/cfb-saturday-a0-20261029.md`.

Session doc: field-relay-nba outbox/cc-session-2026-10-29-opening-odds-late.md

## 2026-10-29 — the BSD pitch plots inside its own lines

`8d0496e` (renderer) and `70a5228` (probe), SW 2026-10-29a; deploy gate run 40906714683.

**What changed.** The pitch lines were drawn in a rectangle 5% inside the canvas, and the ball and shots were plotted to the
whole canvas, so pitch x = 0 (the goal line) sat 5% outside the drawn goal line and a recorded goal at x = 2.7 was drawn outside it
and clipped. `_bsdToCanvas` maps pitch coordinates INTO the rectangle for the ball and the shots, and the rectangle is drawn from the
same `BSD_PITCH_INSET` constant. The margin stays (it is what stops a large circle at the goal line being clipped).

**Proof:** `outbox/bsd-pitch-probe-manifest-2026-10-29T16-03-02.json` (run 40907485456, green twice). The probe reads the drawn
`<rect>` out of the SVG and judges position against it: the away goal at `cx 26.7` (was 9.7), a ball at pitch x = 5 at `34.2`
(was ON the line), both shots equal to the served `sharedPitch` formulas to 0.01 px. A local mutation run found that a margin on
x only slipped past the shot booleans; two exact booleans were added. Smoke 1066 / 0 failed. Reader on recorded payloads, not a live match.

**Open, filed:** `CC-CMD-2026-10-29-bsd-live-shot-source.md` (field-relay-nba `docs/`): no shot reaches a live match.
CONTRACTS.md synced ("Where the client draws it").

Session doc: field-relay-nba outbox/cc-session-2026-10-29-bsd-pitch-renderer.md (Part 2)

## 2026-10-29 — the BSD pitch draws a ball and shots

`94d8b56` (ball) and `18b4873` (shots), SW 2026-10-28b; deploy gate runs 40809785846 (re-run green) and 40812818686.

**What changed.** The live pitch (`#bsd-pitch`) read fields the feed does not carry, so it had never drawn a ball or
placed a shot. `_bsdOnSSEFrame` now reads `data.coords`, keeps the last point on a frame without one, drops a point
older than 30 s (273 measured gaps: median 5 s, p90 17 s, p95 26 s) and ignores a frame for another match (the relay fans
every subscribed match out to every client). Shots are placed from `pos` + `home` with the relay's
`transformReference.sharedPitch`: home `(100 - x, 100 - y)`, away `(x, y)`. That is NOT `mirrorAway`, which leaves home
raw; measured by an exact join of goal incidents to shotmap records, 121 of 126 goals, home 69/69, away 51/52 exact.

**Proof:** `bsd-pitch-probe.yml` (new) loads the deployed page, feeds its own EventSource recorded `bsd:ball` and
`bsd:stats` frames, and commits a screenshot and a manifest. Green at `outbox/bsd-pitch-probe-manifest-2026-10-29T03-53-57.json`
(run 40814597354, also 03:51:47): ball at the expected pixel, the shots at the vendor's own placement of the same goals,
`nanAttributes` 0, the dot gone after 30 s with the shots staying, and a screenshot whose grass pixels read `#2d5a27`.
It proves the READER on recorded payloads, not a live match. Smoke 1065 / 0 failed; source mutations 5/5 and 5/5,
probe breaks 8/8 (run locally against a build and a stand-in relay).

**Open, filed:** `CC-CMD-2026-10-29-bsd-pitch-inset.md` (lines drawn 5% inside, plotting to the edge) and
`CC-CMD-2026-10-29-bsd-live-shot-source.md` (no shot reaches a live match: `bsd:stats.shotmap` is null on 170 of 170
recorded frames), both in field-relay-nba `docs/`. CONTRACTS.md synced.

Session doc: field-relay-nba outbox/cc-session-2026-10-29-bsd-pitch-renderer.md

## 2026-10-24 — today's NHL and NBA games get cards

`eb8e74c4` (SW 2026-10-24d, deploy gate run 40113474301, live by 16:53Z).

**What changed.** The live page held 12 NHL and 8 NBA games and rendered no
card for either: the only creators of those sections were the June finals
lists. `injectV2SportSection` now builds both, labelled 'NHL' and 'NBA' like
past dates. The shared injector also stops feeding today's games into a
past-date slate, the NBA brief goes to the NBA card instead of WNBA, and the
June lists are retired.

**Proof:** a live Playwright probe, red at 16:12Z (NHL 0 of 12, NBA 0 of 8) and
green at 16:55Z (12 and 8). Smoke 1061, mutations 6/6, 5/5, 7/7. An independent
review removed a day filter that would have blanked 20 sports from 00:00 to
04:00 ET.

**Open, filed:** `CC-CMD-2026-10-24-slate-day-has-three-owners.md` (tomorrow's
games in today's sections, from 16:00 ET) and TASK 2 of
`CC-CMD-2026-10-24-nhl-nba-today-sections.md`.

Session doc: outbox/cc-session-2026-10-24-nhl-nba-sections.md

## 2026-10-22 — TODAY_ISO steps back a calendar day before 4am ET

`3e489fd5` (SW 2026-10-22a, deploy gate run 39838828451, live 19:19:56Z).

**What changed.** `window.TODAY_ISO` held the ET date until 4am ET by moving
the instant back 24 hours, which named the Saturday from 00:00 to 00:59 EDT on
the Monday after spring-forward (next: 2027-03-15). It is now
`fieldTodayIso(now)`, one calendar day back, the same rule as the relay's
`getFieldDateKey()` (field-relay-nba `86363b7`, deployed first). Every other
instant is unchanged.

**Proof:** `field_unit.js` (9 instants; the old body fails at 2027-03-15T04:30Z
only) and smoke A-SLATE-1 (pins the body; a changed body fails it). Smoke 1056,
units 70.

Session doc: outbox/cc-session-2026-10-22-slate-date.md

## 2026-10-20 — a cached debrief now revalidates against the relay

`1f3d2d04` (SW 2026-10-20a, deploy gate run 39468343572).

**What changed.** Gap 12's field-debriefs Cache API used to serve a game's
context with no request. A browser that cached one of the 211 games repaired
that day kept the old odds for about 7 days. The live probe showed it before
the fix (run 39456471138).

**Now:**
- a hit renders, then the relay is asked;
- a changed body re-renders that game;
- a partial answer (200 + `_errors`) or a failure keeps the cached copy.

**Proof:**
- `scripts/check-debrief-cache-revalidates.mjs` in deploy-gate: 24 cases,
  33 mutations; the base passes 6 of 24.
- Live after deploy: run 39468966102 (SW 2026-10-20a, served page carries `_revalidateDebriefContext`): PASS. The planted copy of espn:401874762 rendered at 2.8 s while its relay request was held; the relay was asked at 2.7 s and answered 200 at 6.8 s; afterwards 0 debriefs show the MARKER and the Cache API no longer holds it. The second visit asked the relay once per cached final (11 requests for 11 cached entries).

**Also:**
- `3de79e6e` fixed the absence-collapse ratchet, red since 10-18. It would
  have refused this deploy.
- CONTRACTS.md is identical in both repos again.

**Filed:**
- two relay CC-CMDs: partial answers cached, with `findBracketDelta` hiding
  its failure; and 17,468 D1 rows read per answer;
- two client CC-CMDs: `hydrateMissedRecaps` reads a shape the relay never
  sends; and a same-tab reload, then a step back to yesterday, rendered 0
  debriefs (seen once, not yet reproduced).

Session doc: outbox/cc-session-2026-10-20-debrief-cache.md

## 2026-10-18 — BDB and NGS envelopes carry sourceDataset (laboratory mirror)

`39305c07`: both builders write `sourceDataset`. The laboratory's
`Vintage.decodeEnvelope` refused every BDB and NGS file without it. Both
builders were rebuilt the same day; the served files are verified (capture run
39143837171). The client is unaffected.

Session doc: outbox/cc-session-2026-10-18-lab-bdb-mirror-producer.md

## 2026-10-18 — NFL rows missing on a live game: two fixes, both verified live

- `cc66dcec`: the tennis/rugby merge no longer drops the NFL, MLS and EPL
  sections for about 35 s after every load.
- `fa24e59c`: the speed floor survives `nflTeamTablesInit` running twice. It
  had gone to 0/12 games.
- The scout probe now fails when the page shows fewer NFL games than the relay,
  or no game shows the speed row.
- Live run 39139761152: 12/12 games, speed on 12/12.
- Open, owner decision: `fetchSchedule` runs twice on boot, so every R2 init
  double-fetches.

Session doc: outbox/cc-session-2026-10-18-nfl-live-missing-rows.md

## 2026-10-18 — BDB speed returns as a per-player floor (owner: "add speed line")

NFL scout panel gains `Speed floor mph (2022)`. It lists the current depth
chart's QB/RB/WR/TE starters who were tracked in 2022, each as "≥ mph" beside
his own name, in position order, unranked. A name two 2022 players share
(Josh Allen, Lamar Jackson, and 9 more) shows nothing. The team-ranked
"Top speed" stays gone, and so do separation, route tree and pass rush.

Smoke 1054/1054, 7/7 mutations caught. SW_VERSION shipped as 2026-10-17a: I
dated it by UTC and the deploy gate re-dated it to ET. **Live, DONE:** probe run
39127795082 found 12/12 NFL games holding the contract, with the speed floor on
12/12 and 11–13 rows per panel. The CC-CMD is DONE.

Session doc: outbox/cc-session-2026-10-17-bdb-vintage-task0.md

## 2026-10-17 — BDB vintage: owner ruling applied, live NFL check STAGED

`4172d95f`: the NFL scout panel no longer shows the four player-keyed BDB rows
(2022 players under their 2022 teams); Tendencies and Time to throw stay,
labelled "(2022)" from the envelope's own `season`, and render nothing without
one. Files, R2 and relay route unchanged by ruling. SW_VERSION 2026-10-17a,
deploy landed (probe run 39075358271). Live NFL verification: the scheduled
scout probe on 2026-10-18 21:00 UTC; a session check-in reads it at 21:45.

Session doc: outbox/cc-session-2026-10-17-bdb-vintage-task0.md

## 2026-10-17 — BDB vintage retrofit: Task 0 done, BLOCKED on the owner

`docs/CC-CMD-2026-10-16-bdb-vintage-retrofit.md` Task 0 only; nothing served
changed. All SIX BDB files have a live client consumer (scout rows in
`src/legacy/field.js`, keyed by each player's 2022 team, no season shown), not
two. Nothing reads `targetYear`. No computation joins BDB with NGS; the two
vintages share the scout panel unlabelled. A 2023-2025 tracking set now exists
on Kaggle (third-party re-uploads, `nfl-big-data-bowl-2027/`) but has no
`plays.csv`, so separation, tendency and time-to-throw have no newer source;
terms unassessed. Proxy vs staleness is the owner's call; Task 1 waits on it.

Session doc: outbox/cc-session-2026-10-17-bdb-vintage-task0.md

## 2026-10-16 — absence-collapse census is now a ratchet over both repos

`scripts/check-absence-collapse.mjs` fails when any op's flagged OR suppressed
count rises above `docs/absence-collapse-baseline.json`, per repo
(jubilant-bassoon 98/0, field-relay-nba 332/18 at `0dcd504`). The relay is
cloned and passed as a second root; the script is not copied. Each root's
`--require` gates the ratchet, so a matcher that stops matching reads
`RATCHET NOT EVALUATED`, not a pass. The CC-CMD's `src/index.js:6503` require
could not pass (that collapse was fixed into `readQuotaHeader`), so the relay
require is path-level. Runs on every push in smoke-static (run 38993272783,
7/7 mutations caught); the deploy-gate copy is STAGED until the next deploy.
Each repo now holds its own baseline (`e544e1e9`): this file is
jubilant-bassoon only, and the relay's is read from the clone. A relay rise is
red at the relay commit (its deploy.yml/guards.yml, field-relay-nba `fea794c`)
and bumped there, never here.

Session doc: outbox/cc-session-2026-10-16-absence-collapse-ratchet.md

## 2026-10-16 — BDB event frames builder, for the relay's CC-CMD

`scripts/build-bdb-frames.py` and the dispatch-only `build-bdb-frames.yml`
build `bdb_event_frames.json`: one row per player per `ball_snap` /
`pass_forward` frame, 7 whole games of 2022 week 2, 1,816,808 bytes, uploaded
to R2 (`nfl/2026/`), read back by sha256, and committed to `outbox/nfl/` as the
raw fallback. It refuses to upload if the declared coordinate convention fails
on the week's own plays; three runs did, before the check measured which ball
position `passLocationType` describes. The six existing BDB builders are
untouched. Run it again only if the archive or the week changes.

Session doc: field-relay-nba outbox/cc-session-2026-10-15-build-bdb-frames.md

## 2026-10-16 — BDB frames Task 0 measured here, for the relay's CC-CMD

`696a2b15` adds `scripts/bdb-frames-task0-probe.py` and the dispatch-only
`bdb-frames-task0-probe.yml`. They run field-relay-nba
`docs/CC-CMD-2026-10-15-build-bdb-frames.md` Task 0 here, because the Kaggle
credentials are this repo's secrets. Run 38926713081 wrote
`outbox/bdb-frames-task0-latest.json`: weeks 1-9 of 2022, bytes per week,
and the literal event vocabulary over every row of week 2. `pass_forward`
is present, so the stop condition is NOT MET. The six existing BDB builders
and their outputs are untouched.

Session doc: field-relay-nba outbox/cc-session-2026-10-16-build-bdb-frames-task0.md

## 2026-10-14 — check-exposed-secrets decodes base64

`d991edb9`. field-relay-nba found five shared-secret literals hidden in
base64-encoded workflow scripts, which its copy of this scanner could not see.
This copy now decodes base64 the same way. A sweep of every base64 blob in
all four repos found none here, so no count changed (RELAY_SHARED_SECRET
stays at 5). Rotation step 3 is still the owner's dispatch in field-relay-nba;
steps 4-5 then bring this repo's count to 0.

Session doc: field-relay-nba outbox/cc-session-2026-10-14-espn-host-flip.md

## 2026-10-13 — the relay's shared secret left this repo's live code

`retry_telemetry_probe.js`, `scripts/seed-mls-return-2026.py` and
`scripts/seed-mls-tournaments-2026.py` read `RELAY_SHARED_SECRET` from the
environment with no default (`0dc9a6fd`). Their three workflows pass it from
this repo's Actions secret, which the relay's `distribute-relay-secret.yml`
wrote on 2026-10-13. The 4 literals left are in docs/ and CONTRACTS.md, which
are redacted after the rotation. The ratchet came down from 9 to 5. The
rotation itself is one dispatch in field-relay-nba. Session doc:
field-relay-nba `outbox/cc-session-2026-10-13-rotate-relay-secret.md`.

## 2026-10-12c — the password nothing could read, and four relay commits chat was allowed to write

The FIELD Handoff connector's OAuth refresh token lapsed. Re-authorizing presents
the shared-password page, which compares against `env.FIELD_MCP_SECRET` — a value
living in a GitHub Actions secret and a Cloudflare Worker secret, **neither of
which can display it back**. That is the Deploy Courier working as designed: it
exists so no human ever handles the value, and it succeeded. The owner was locked
out of his own single-user server with no recovery path.

**The property that makes the provisioning secure is the property that makes
recovery impossible.** Those are the same fact seen from two sides, not a tension.
Rotation is not a fix and must not be proposed as one — a rotated value is equally
unreadable, and `bootstrap-relay-secret.yml` extracts from source besides, so
rotating before the 13 literals come out of `src/index.js` reinstalls the old
value. Codex: `incident-2026-10-12-mcp-reauth-lockout`.

**Four relay commits on 2026-10-12 were authored and pushed by chat, not by a CC
session** — `1be6737`, `14503e7`, `947dbcf`, `168786f`, all `src/mcp-oauth.js` and
one new workflow. One-time, explicitly asked for and explicitly granted, because
the connector was down so the normal dispatch path was unavailable and the broken
thing was the authorization code itself. **The exception is spent and sets no
precedent.** Read `governance-2026-10-12-chat-relay-code-exception` before reading
the commit log, which on its own would teach the wrong lesson.

### The enrollment window

`MCP_ENROLL_UNTIL` holds an ISO-8601 instant. While it is in the future,
`POST /oauth/authorize` accepts the authorization without the password and warns
with the `client_id` and the expiry. `enrollmentState()` returns four values —
`unset`, `unparseable`, `expired`, `open` — and only `open` opens anything
(Rule 99); an unparseable value must not read as open or a typo holds the door
permanently. It closes by the clock, so there is no revoke step to forget.

Verified live, same throwaway DCR client, same deliberately wrong password, one
variable changed: unset → 401 · open → 302 with a code · expired on its own → 401
· closed by `minutes: 0` → 401. `/mcp` answers 401 to both no-header and a garbage
bearer, which is what makes the 302 mean something.

`.github/workflows/open-enrollment-window.yml`, dispatch only, capped at 60
minutes. **Never add `set -x`** — that leaked `FIELD_MCP_SECRET` on 2026-07-13.

### Three defects chat shipped inside its own exception

Cloudflare answers **201** on creating the var; the check accepted only 200.
Cloudflare **pretty-prints**, so the flag arrives as `"success": true` with a
space; the check grepped for none. Both marked a run red **after the write had
already succeeded** — the dangerous direction, since the next person would read
the red X and conclude the window had not opened while the relay was accepting
unauthenticated authorizations. Same mistake twice: asserting against a response's
shape rather than its content.

The third reached the owner. `GET /oauth/authorize` drew an identical password
form in both states, so nothing on screen distinguished "needs a password you
cannot read" from "will accept anything you type." He reported the reconnect as
failed while the relay was ready to authorize him. Fixed in `168786f`: the page
now shows a banner naming the closing instant and omits the password field
entirely while the window is open. **A correct mechanism that cannot be observed
is indistinguishable from a broken one** — Rule 99 reproduced in the UI of the
thing built to repair a Rule 99 problem.

### Not established

During the first revoke test a revoked token answered 200 once; a clean retest
answered 401 immediately and still 401 after 75s. **Cause unknown.** KV
read-after-delete consistency is the candidate — that sequence fired two deletes
against the namespace back to back — but it is not proven and is recorded rather
than filed as a defect.

`unparseable` is proven by `Date.parse` semantics, not by a live probe.

### Carry-forwards

`docs/CC-CMD-2026-10-12-oauth-reauth-without-shared-secret.md` (`d878b1c`) is
filed and **not dispatched**. It removes the shared secret's monopoly on
re-authorization so this cannot recur on the 90-day refresh clock. It leads with
the trap: per-client trust keyed on `client_id` authorizes anyone, because
`client_id` is not a secret — it rides in the authorize URL, `/oauth/register`
hands one to any caller, and the repo is public. Task 1 is a blocking probe of
whether the Claude iOS in-app browser persists cookies across an app restart;
that answer decides whether the cookie design exists at all or WebAuthn is the
only path.

The throwaway probe client sits in `MCP_OAUTH` KV until its 90-day TTL. No DCR
delete endpoint exists and the available KV tools are namespace-level, not
key-level. A `client_id` alone authorizes nothing, so it adds no surface.

`/deploy/verify` reported `match: false` at session end. **Benign** — every commit
after `168786f` carries `[skip ci]` and none touch `src/`. That route compares
HEAD to deployed without regard for `[skip ci]`, so it reads red whenever a doc
commit lands after a deploy.

Still owner-only, unchanged from before this session: the two plaintext PATs in
Drive docs, the `RELAY_SHARED_SECRET` rotation in the stated order (literals out
first, then rotate), and the stray `claude/zealous-brahmagupta-tm92w3` branch.

## 2026-10-12b — the forward window probe died four days without a manifest

`forward-window-probe.yml` failed its scheduled runs 10-08 to 10-11 on
`Cannot read properties of undefined (reading 'scheduleForDate')` at
`forward_window_probe.js:66`, two seconds in, and left no manifest. `e1681b21`
makes it leave one when it dies: the swallowed first-wait error, every
main-frame navigation, each failed read, the stage, the Playwright version.
Dispatch run 38293199977 then **passed** on Playwright 1.64.0 with no retry
used, so **why it died is not established**. Playwright 1.64.0 was published
inside the failure window and is installed unpinned; three local
reproductions on 1.61 and 1.64 did not crash. Session doc:
field-relay-nba `outbox/odds-watches-daily-read-2026-10-12.md`.

## 2026-10-12 — five copies of a third odds key were here

`.coderabbit.yaml` x1, `docs/CC-CMD-2026-06-16-odds-quota-audit.md` x1,
`outbox/cc-odds-audit-results.md` x3 — all now
`<redacted 2026-10-12 — see docs/exposed-secrets.sha256>`.

**There are three odds keys and every document calls all three "the Odds API
key".** The exhausted free-tier one was removed 2026-08-25 and is pinned at 0.
The live 20K-plan key was rotated by the owner 2026-09-15. This was the third:
the Starter-tier value held by field-relay-nba's `env.ODDS_API_KEY_FALLBACK`,
never rotated.

`docs/exposed-secrets.sha256` now declares it at max 0. **A ratchet only knows
the hashes it is given** — this repo's scanner printed PASS on every run while
five copies of an undeclared odds key sat in tracked files.

The gate was proven able to fail first, with a THROWAWAY token rather than by
rewriting a credential: a `deadbeef` string planted in a temp file, hash declared
at 0, gate red with exit 1, then both removed. The relay's own mutation does not
transfer — the two checkers are different programs.

`.coderabbit.yaml:26` was a review instruction saying "never hardcode the Starter
key (&lt;the key&gt;)". The instruction survives; the value is gone.

Redaction is not rotation — and the rotation happened: the owner rotated the
key at the provider on 2026-10-12, the same day. This repo's git history still
holds the old literals, but they no longer read out a credential. The ratchet
stays at 0 anyway, because a dead key in a document is how the free-tier entry
above it began.

Closed 2026-10-12T18:12Z, in the relay: the owner set
`ODDS_API_KEY_FALLBACK`, and field-relay-nba run 38289284222 read it VALID
(500 remaining) and a Secret, so a deploy will not erase it. See
field-relay-nba/docs/CC-CMD-2026-10-12-starter-key-exposure.md.

---


## Session doc index — 2026-09-07 onward

Rule 67 requires the HANDOFF write to name the session doc. Thirteen were
written in the last fourteen days and only three were named here; the rest were
findable only by listing `outbox/` — which is the failure Rule 67 exists to
prevent, since it was written because chat sessions were reverse-engineering
changes from `git log`. A doc that exists and is unreferenced looks identical,
from HANDOFF, to a session that never wrote one.

`scripts/check-session-docs-indexed.mjs` now fails when a session doc from the
last 14 days is not named here. It found the last two rows below, from sessions
before this one, on its first run.

All of them, newest first:

| arc | session doc |
|---|---|
| the vendor states the European season; `_euSeasonActive()` demoted to fallback, not deleted | `cc-session-2026-10-10-coverage-replaces-season-date-math.md` |
| the sections gap gets a verdict per section, and the gap turned out to be a two-date subtraction | `cc-session-2026-09-22-per-section-render-trace.md` |
| tennis rendered 0 cards above the overflow threshold — root cause found, fixed, verified live at 42 cards | `cc-session-2026-09-21-tennis-zero-cards.md` |
| render-target completeness — STOPPED: no honest enumeration exists | `cc-session-2026-09-19-render-target-completeness.md` |
| the odds probe reads a complete slate, not whatever hour it woke at | `cc-session-2026-09-15-probe-window-reality.md` |
| odds-line render path closed; the no-odds count hid two causes | `cc-session-2026-09-13-odds-line-render-path-closeout.md` |
| odds scenario chip — Task 0, two decisions left to a human | `cc-session-2026-09-12-odds-scenario-chip-task0.md` |
| Bundesliga had no injector; the poll never rendered what it injected | `cc-session-2026-09-12-bundesliga-no-injector.md` |
| the V2 section chain, render ledger | `cc-session-2026-09-12-v2-sections-render-ledger.md` |
| slate size variance, 129 vs 45 | `cc-session-2026-09-12-slate-size-variance.md` |
| past-date slates from the relay | `cc-session-2026-09-12-past-date-slate-from-relay.md` |
| the zero-change fast path discarded card-less renders | `cc-session-2026-09-12-card-less-render-discarded.md` |
| `MY_TEAMS` ReferenceError, 16 -> 129 cards | `cc-session-2026-09-12-my-teams-reference-error.md` |
| `/context/game` durable slate id | `cc-session-2026-09-12-context-game-slate-id.md` |
| odds movement sequence discipline | `cc-session-2026-09-12-odds-movement-sequence.md` |
| absence-collapse triage, 263 flagged sites | `cc-session-2026-09-12-absence-collapse-triage.md` |
| Rule 99 (DISTINGUISHABILITY-A) | `cc-session-2026-09-11-rule99-distinguishability.md` |
| client odds story | `cc-session-2026-09-11-client-odds-story.md` |
| EU sections — the gate was necessary, not sufficient (Tasks 0-4, done condition met live; `bundesliga` was nonetheless left without a call site — see the 2026-09-12 entry) | `cc-session-2026-09-10-eu-sections.md` |
| soccer season gates, auto-rolling helper (Tasks 0-4; Task 3.3 found a second defect and a second CC-CMD was written per Rule 87.4) | `cc-session-2026-09-07-soccer-season-gates-autoroll.md` |


## Session 2026-09-12 — Bundesliga, and the render that never ran

HEAD `c0a54d0a` -> `b09a03ee`. Smoke **1049 passed, 0 failed**. Units 69/0.
SW_VERSION `2026-09-12p` -> **`2026-09-12r`**. Deploys 963, 964 both success.

Session doc: `outbox/cc-session-2026-09-12-bundesliga-no-injector.md`

**Both defects were found by auditing what was still open, not by anything
surfacing.** Neither produced an error, an empty section, or a red check.

1. **Bundesliga had no `injectV2SportSection` call** — the one key of eight that
   `CC-CMD-2026-09-10-eu-sections-not-injected` never wired. Eight games a poll
   reaching `espnScores`, no section, for two days.
   **The check that existed to prevent this passed:** it printed `6 key(s) have
   no injector: their sections are built elsewhere` and exited 0. The number was
   right and asserted nothing. `SECTION_BUILT_ELSEWHERE` now names each
   uninjected key with the path that builds it; an unlisted one fails.
2. **The V2 poll never rendered what it injected.** The armed follow-up fired on
   the first red run after the ledger shipped:
   `render_after_last_push_ms -31708`, `pushesSinceLastRender 11` — eleven
   sections pushed, the last 31.7s after the last render, none since. Whether
   the ESPN poll's `renderAll` landed after the inject block was a race, and
   that race is the whole 129/128/45/129/45/134/140/21 oscillation.
   Fix: `if (_renderLedger.pushesSinceLastRender > 0) scheduleRenderAll();` —
   debounced so eleven injections coalesce into one render, guarded because this
   fires on the poll cycle (Rule 24). Steady-state cost zero.

Verified live, SW `2026-09-12r`: **144 cards** (highest of the day),
`sections_model_not_in_dom []`, `render_after_last_push_ms +6036`,
**Bundesliga 8 cards — first time it has ever rendered.**

**One green run, not proof.** The done condition is five consecutive: the gap
field read `[]` at 20:43 with no fix in place at all, which was the race landing
well. The 03:45 and 16:10 UTC runs accumulate the count without a session.


## Session 2026-09-12 — the V2 section chain: three CC-CMDs, two wrong diagnoses

HEAD `ccec80a4` -> `59ade8c7`. Smoke **1049 passed, 0 failed**. Units 69/0.
SW_VERSION `2026-09-12l` -> **`2026-09-12p`**. Deploys 959-962, all success.

Session doc: `outbox/cc-session-2026-09-12-v2-sections-render-ledger.md`

"The same page rendered 129 cards and then 45." Each CC-CMD narrowed the
boundary by one link and **the first two were wrong about which link** — both
corrections are recorded in place rather than edited away.

| CC-CMD | claimed | measurement |
|---|---|---|
| `slate-size-variance` | the probe read mid-poll-cycle | flat at 45 across 12 samples / 60s — DISPROVED, CLOSED |
| `v2-sections-never-injected` | the injector's missing `else` | 15 sections in `allData.sports`, memo all true, no capture — DISPROVED, CLOSED |
| `v2-sections-in-model-not-in-dom` | the loss is in the render | Task 0 done; bad side armed, OPEN |
| `v2-sections-in-model-not-in-dom` | benignly empty sections inflate the gap | `gap_split` dropped 7 · empty 0 · unknown 0 — REFUTED 2026-09-22 |
| `v2-sections-in-model-not-in-dom` | the `data-sport` key mismatch inflates the gap | `section_key_mismatches: []`, gap 3 either way — REFUTED 2026-09-22 |
| `v2-sections-in-model-not-in-dom` | nothing rendered since the push | `render_after_last_push_ms` positive on every run since 09-21 — no longer in play |

**Streak reset, and why it is honest.** `cc-session-2026-09-15-probe-window-reality.md`
established that every earlier scheduled green had been taken on an EMPTY probe
window — a gap of `[]` over a slate with nothing in it. The streak was reset to
`0/5` there and has not moved. `outbox/2026-09-21-the-gap-zero-was-a-different-day.md`
records a later "gap 8 → 0" claim, published and then refuted by a control run:
the zeros were dispatch runs reading **Today**, the eights were scheduled runs
reading **Yesterday** (`scripts/probe-window.cjs`, `step_back_days = scheduled ? 1 : 0`).

**Resolved 2026-09-22 (`5115a3e`): the gap was the measurement.** The probe read
the DOM section census in the settle loop, BEFORE the step-back loop, and the
model after it — so on every scheduled run `sections_model_not_in_dom` was
yesterday's model minus today's DOM sections. Manifest `20260922T195845Z` shows
Baseball (MLB) at 16 cards in one side and 3 games in the other. The gap is now
computed from a census taken at the model read; the first same-day comparison
(`20260922T200611Z`) reads `[]` over four sections and fourteen games.

`computeStreak` excludes any run without `gap_compared_on` — 59 of 60 manifests
on disk. The done condition is unchanged and honest at **0 of 5 scheduled
greens**; one dispatched green is not evidence.


**The finding is that it is intermittent.** Same build, identical inputs, one
afternoon: **129, 128, 45, 129, 45, 134, 140.** Twelve minutes separated a
five-section run from a fourteen-section one. A race or state-dependent skip,
not a dead path — which retired both earlier diagnoses at once.

Consequence: the done condition is **five consecutive green runs, not one**.
`sections_model_not_in_dom` read `[]` on its first live run while the same build
had shown a ten-section gap twelve minutes earlier.

**Five blind spots closed**, each a place a failure left no trace:
`window._fieldErrors` never read; the per-sport V2 poll catch swallowing to a
`console.warn` behind `FIELD_DEBUG`; `injectV2SportSection`'s missing `else`;
`espnScores` not on `window` (the first census honestly reported `null` and
measured nothing); and no render/push ORDERING — no count separates "pushed
after the last render" from "rendered after the push and dropped".

**Three instrumentation defects of my own, caught before being trusted:**
`sections_model_not_in_dom` computed after `fs.writeFileSync` (every manifest
would have carried `null` forever, on a field added to be read later); a
mutation matcher requiring an exact join against prefixed labels, reporting
WRONG REASON on all four while every check was red on the right assertion; and
a hardcoded "18 assertions" against 21, now counted.

**Three placement decisions, each because the alternative was wrong:** the
ledger declared at line 1909 above `renderAll` (TDZ — that exact bug truncated
the live slate to 16 cards earlier this session); the stamp after
`_cardStringCache.clear()` (above it broke `A-PHASE2-5`, which pins that clear
as an exact shape); the stamp before `if(!allData) return;` (a bailed render
still happened).

**Armed, not carried forward.** Both scheduled probe runs record `renderLedger`
and `render_after_last_push_ms`; positive means a render ran after the push and
dropped them, negative means nothing rendered since. The next bad run produces
the diagnostic by itself.

New gates, all mutation-proven and CI-wired: `check-slate-settle.mjs` (12
series, 4 mutations), `check-v2-section-inject.mjs` (24 assertions, 4 branches,
4 mutations), plus `check-relay-date-sections.mjs` from the arc below.


## Session 2026-09-12 — past-date slates come from the relay

HEAD `c43dba2c` -> `08f73b48`. Smoke **1049 passed, 0 failed** (1037 -> 1049).
Units 69/0. SW_VERSION `2026-09-12i` -> **`2026-09-12l`**.

Session doc: `outbox/cc-session-2026-09-12-past-date-slate-from-relay.md`

Navigating to a past date said "No major events on Yesterday" for a day the
archive holds 24 rows for. ESPN's scoreboard genuinely answers
`{status: 200, events: 0}` for past dates — measured from the live page in CI,
because sandbox egress to `site.api.espn.com` is blocked. The relay serves the
same day (`/v2/games?sport=mlb&date=2026-09-11` -> 15 games, `source:
"espn-wc"`), so `goToDate` now sources `iso < TODAY_ISO` from the relay via the
existing `fetchV2Games`. Today and future dates keep the ESPN sweep.

**Relay half: no change required** (Rule 70 still applies — the route was
re-probed before any client code was written). No new endpoint, no new field,
no client-side mapping, so nothing to sync in CONTRACTS.md. This is why Option
B beat `/context/date`, which would have needed a `streams` mapping invented
client-side — the Rule 64 band-aid.

Verified live, probe run 34713228042 / SW `2026-09-12l`:
`slate_by_step [Today 45, Yesterday 26]`, `date_nav_check` on Thu Sep 10
`cards 14, failure_kind null`, `page_errors []`. The old red
(`failure_kind "no-events"`, `archive_rows_for_claimed_empty_date 24`) is the
assertion that flipped, and it runs on every probe invocation — the regression
check is automated, not a carry-forward.

**Two defects found in this change's own first implementation, neither shipped:**

1. `V2_SECTION_LABEL` was built from the `injectV2SportSection` call sites — a
   SUBSET of `FIELD_V2_SOURCES`, which is what the new function iterates. `afl`,
   `bundesliga` and `wc26` are all enabled today and all three had no entry, so
   all three would have vanished from every past-date slate. The check written
   to prevent exactly this printed PASS against the wrong denominator, which is
   the Rule 91 failure committed inside the Rule 91 guard. It now checks both
   directions and prints both counts.
2. `Promise.all` made one sport's rejection blank the slate for every sport.
   `fetchV2Games` catches everything today, so nothing could reach it — but that
   is a load-bearing property of a function this one does not own. `allSettled`,
   measured not reasoned: assertion 2b read `got undefined` before the change.

Three gates, all mutation-proven and wired to deploy-gate:
`check-v2-section-labels.mjs` (both directions, both denominators printed),
`check-relay-date-sections.mjs` (4 return-value properties, 11 assertions,
extracted source not a copy), `mutate-relay-date-sections.mjs` (4 mutations,
4 caught, each on its named assertion; its own anchor/applied guards
self-tested at 0 hits and 7251 hits).

**Known inconsistency, filed not picked:** `FETCH_LEAGUES` labels CFB `'CFB'` /
`'NCAA Football'`; the V2 injector uses `'College Football'`. The map follows
the V2 injector because it IS the V2 path. Resolving it means touching the ESPN
sweep's labels — out of scope, Rule 69.


## Session 2026-09-11 — Rule 99 (DISTINGUISHABILITY-A)

HEAD `3bfa1a21` -> `3da97fb9`. Smoke **1037 passed, 0 failed** (unchanged; no
`index.html` edit, so no SW_VERSION bump).

Session doc: `outbox/cc-session-2026-09-11-rule99-distinguishability.md`

STANDARDS.md Rule 99 at `:4906` — absence must be a sibling of the value, never
a member of it. Paired fix in field-relay-nba `dc7df57`: a Cloudflare cache hit
strips `x-requests-remaining`, `|| 0` read that as zero credits, and the odds
snapshot terminated every remaining sport while the account sat at 44,235 of
100,000 used.

Two gates added, both mutation-proven and both wired to CI:
`scripts/check-absence-collapse.mjs` here (census: **263 flagged / 0
suppressed / 138,430 clean lines** across both repos — three counts, never a
verdict), and `check-quota-gate-ordering.mjs` in the relay.

**Task 0 correction worth carrying:** three rule registries diverge above 88.
`STANDARDS.md` Rule 91 is SCOPE-LEGIBLE-A; SAMPLE-COVERAGE-A is Rule 91 in
`field-relay-nba/CLAUDE.md` only; `jubilant-bassoon/CLAUDE.md` has no Rule 91.
Cite cross-repo rules by tag and file, never by bare number.


## Session 2026-09-06/07 — the tennis draw: the WC bracket tree, generalised

HEAD `af176071` → `8213c02b`. Smoke **1037 passed, 0 failed** — up from 1013.
SW_VERSION `2026-09-06c` → **`2026-09-07a`**.

> **This paragraph has been wrong twice; here is what the history actually
> shows.** A190 rewrites the DATE to today in **ET** and *preserves the suffix*
> it finds in `sw.js`. So the suffix IS a commit's to bump — Rule 4 and the
> Session Protocol are correct and were not the problem.
>
> The problem was mine: I bumped `2026-09-06f` → `2026-09-07a` **using the UTC
> date** while ET was still 2026-09-06. A190 corrected it back to `2026-09-06a`
> (`d79dcd7d`), then stamped `2026-09-07a` (`2d1b40ed`) once ET rolled over.
> My later `b` and `c` bumps then failed to match, because the constant was no
> longer the value I expected.
>
> A first version of this note claimed "there is nothing for a commit to bump."
> That was a tidy story fitted to a `sed` that silently matched nothing, and it
> would have taught the next session to stop bumping the suffix. Rule 4 already
> says ET; the fix is to read it.
Session doc: `outbox/cc-session-2026-09-06-tennis-bracket.md`

### What shipped

A `#tennis-section` Draw tab rendering a live knockout bracket, built from
`renderWCBracketTree`'s markup and CSS with the parts that assume 32 teams
removed.

Kept unchanged: `.wct-match` / `.wct-team` / `.wct-col-head` /
`.wct-champion-label`, the two-halves layout, the 1180px breakpoint.

Changed, and why:

1. **Columns come from the response.** The WC tree hardcodes four columns a side
   and a slot id per match (`R32_73_A`, `SF_1_B`). A slam is seven rounds, a
   Masters six or seven, a first-week draw four. No CSS rule assumes a count.
2. **Below 1180px the tree is REPLACED, not hidden.** The WC tree hides itself
   and leans on a probability table beside it. There is no table here, so hiding
   alone left a heading over nothing.
3. **A fifth full-viewport mode**, so all four existing toggles dismiss
   `tennis-mode`. Written out in each rather than folded into a helper — that
   would be a rewrite of four working functions in a commit about tennis.
4. **Anomalies on the page.** The WC bracket has nothing to declare; a draw does.

### Live, verified

```
verdict PASS   136 US Open, Women 2026
121 matches drawn in 5 rounds, 114 edges joined
tree 121 / list 121 / relay 121
```

### Relay contract (Rule 65)

```
GET /bsd/tennis/draw?tournament=<id>&season=<YYYY>      max-age=300
GET /bsd/tennis/tournaments[?category=<slug>]           max-age=3600

200 { tournament, season, seasonsAvailable, rowsRead, declaredCount, truncated,
      pages, editionMatches, mainDrawMatches, complete, roundsOutsideMainDraw,
      rounds[ {round,index,matches,canonical,atCanonicalSize,entryRound,
               openInnermostRound} ],
      nodes [ {id,round,roundIndex,date,status,isDoubles,
               p1{id,name,shortName,countryCode,rank}, p2{...},
               winnerId, sets[]} ],
      edges [ {from,to,playerId} ], anomalies[ {kind,...} ] }

400 bad params · 404 no such edition · 409 player twice in a round, or
ambiguous · 502 upstream ignored the tournament filter
```

**INTEGRATION STATUS: VERIFIED.** Consumer `renderTennisBracket()` → `#tennis-draw`.

`rank` is a **world ranking, not a seed** — there is no seed field anywhere on a
BSD row or player. Rendered with a `#` and `.wct-rank` for that reason.

`canonical` is **null** on the entry round and on the innermost round of an
unfinished draw. Both are edges of what is known — byes at one end, the calendar
at the other — and neither has a size to be short of.

### Team events: a null-rank accident, now a decision

All seven sit in category `other`, which had no rank, so `_tennisDrawPick`
skipped every one. Right for three, a silent loss for four, and nothing said
which.

| | |
|---|---|
| **Admitted** | ATP Finals · Next Gen Finals · WTA Finals (`SF=2 F=1`) · United Cup (`QF=4 SF=2 F=1`) |
| **Excluded** | Davis Cup (194 matches, 0 in a knockout) · BJK Cup (77) · BJK Cup Group I (130) |

Excluded **by name** via `_TENNIS_DRAW_NO_BRACKET`, not by omission — forgetting
something is indistinguishable from deciding against it. The relay's weekly
`tennis-tier-ladders` **fails** if an excluded event gains a draw or an admitted
one loses it; those literals live here and the truth lives there.

### Two bugs the browser found that 15 smoke rows could not

Both times the file was internally consistent and every A-TDRAW row passed.

1. **`the relay shipped 120; the page drew 113 tree cards and 120 list rows`** —
   the centre column took `rounds[length-1]` as the final. In a draw still being
   played that is Round of 16: eight matches rendered as one. `120 − 8 + 1 = 113`.
   The tree looked complete, and the list that had all 120 is only visible below
   1180px where the tree is not.
2. **`cancelledRowsExcluded: 2`** — a variable name printed to a reader. Four
   anomaly kinds, two cases, and the fall-through rendered the key.

### Verification

- **smoke** `A-TDRAW-1..18`, 18 rows. Nine mutation-proved, including restoring
  the real centre-column bug.
- **`tennis-draw-probe`** (Playwright, live URL, 1440×900) — 15:20 and 00:20 UTC,
  path-triggered, dispatchable. Compares relay against page: card counts, list
  rows, round columns, champion. `FAIL` is red; `NO DRAW` and `UNKNOWN` exit 0.

### Two harness defects, mine

`A-TDRAW-17` reported `NOT CAUGHT` twice and **neither mutation had run** — a
shell loop split its spec on the `|` inside `t.name || ''`, then a Python rewrite
read `stdout` while `smoke.js` writes failures to `stderr`. The check had caught
it both times. **A mutation that cannot prove it was applied, and cannot see the
failure it causes, is worse than no test.**

### Carry-forwards

**None.** Both were closed the same session.

`nodes[].sets` is now rendered, winner-first — a 3-6 2-6 win for player 2 prints
`6-3 6-2`, because the relay's sets are p1/p2 in row order and carry no
orientation. The tiebreak prints the **loser** of the breaker in brackets, as a
draw sheet does: `7-6(4)`. Both the tree and the sub-1180px list carry it; the
list is the only tennis draw view down there and a list of names is not a draw.

The **Italian Open window is deleted**. It gated on two literal dates and emitted
one card reading "WTA/ATP Field" with its round from a table keyed on the day of
the month — no players, no scores, no opponent, and dead since 17 May. It was the
second stale window this file carried; Roland Garros was the other, and between
them tennis rendered nothing through an entire US Open while four smoke
assertions passed. `A-TENNIS-13` now keeps it out.

Standing, and **the user's alone** — not carry-forwards for a session to pick up:
revoke the `GITHUB_PAT`, rotate the Odds API key at the provider, and remove the
13 `RELAY_SHARED_SECRET` literals **before** rotating (reversed,
`bootstrap-relay-secret.yml` reinstalls the old value).

### Top-aligned rounds, and the artifact that had never shown the draw

`.wct-round` is `height:100%` + `space-around`, which put the Final — one card —
in the vertical middle of a 2099px tree. Now `.tennis-draw-tree .wct-round` is
`height:auto` + `flex-start` and the tennis grid is `align-items:start`.
**Cards in the first screen: 32 → 62.** Scoped, because `renderWCBracketTree`
emits `.wct-round` too and an unscoped rule would have restyled the World Cup
bracket from a commit about tennis.

Nothing structural was lost: this tree draws no connector lines, so a card's
vertical position never encoded which two matches feed it.

**Three artifact defects in `tennis_draw_probe.js`, all mine.** Every screenshot
it had ever committed was of the `#setup-overlay` setup modal, not the draw —
`page.evaluate` reads through an overlay, so the DOM counts were right and the
one artifact showing what a reader sees never once showed it. Fixed with the
page's own `?wpt` bypass (`index.html` ~5068), which names Playwright among its
intended callers. Then the frame cropped 2099px to 900, so `fullPage` now. Then
two readings I took off a downscaled image — a doubled bracket and a covered card
— were both **refuted by the browser**: `listDisplay: none`, `cardsCovered: 0`.

The probe now asserts what the counts cannot: the first card is on screen and
painted on top (`elementFromPoint`), every in-viewport card is unobstructed, and
the overlay state is named either way.

Smoke **1037**, 0 failed. SW_VERSION: the date is A190's, the suffix is the
commit's, and both are ET — see the correction at the top.

---


## Session 2026-09-06 — A515 asserted a deploy rule from a file that cannot know a deploy is happening

HEAD `126d0289` → `fcd965fa`. Smoke **1001 passed, 0 failed** — up from 1000/1,
and the count is unchanged because A515 is still one assertion, now asserting
something smoke can decide. SW_VERSION `2026-09-04f`, deliberately untouched.

**This corrects the entry below it.** That entry says "Smoke 1000/1, and the one
failure is A515 by design". The failure was real and the design was wrong.

### What A515 was doing

It asserted "SW_VERSION starts with today's ET date" inside `smoke.js`, which
runs on every commit and cannot know whether a deploy is happening. Two
consequences, both bad:

**Off the deploy path it failed for the passage of time.** Rule 3 here is "smoke
must pass before push", so every non-deploy commit had to bypass the hook. One
in the previous session already did, with the reason written into its own commit
message: bumping SW_VERSION on a docs commit would be a **false deploy signal**,
since the constant exists to bust the shell cache.

**On the deploy path it asserted something already guaranteed.**
`deploy-gate.yml`'s A190 step seds SW_VERSION to today's ET date across `sw.js`,
`src/legacy/field.js` and `index.html`, commits it back, and only *then* runs
smoke. A515 could only ever agree with a value written moments earlier by the
same job.

### Where the date rule lives now

`deploy-gate.yml`, which only runs when a deploy path changed — so the deploy is
by definition today, and the question is answerable. Matcher proven against real
values before shipping:

```
accept  2026-09-05      accept  2026-09-05f
REJECT  2026-09-04f     REJECT  2026-9-05     REJECT  (empty)
```

**It also closes a gap the sync step had.** That step seds three files and echoes
a tick mark. `sed` exits 0 when its pattern matches nothing, so a renamed
constant or changed quoting would have printed "✅ SW_VERSION synced" while
changing nothing — and once A515 stopped being the thing that noticed, nothing
else would have. The new step reads `index.html`, which is what actually ships,
and names the likely cause on failure.

### What stays in smoke

The half it can decide: the FORM. `YYYY-MM-DD` plus an optional lowercase
revision letter, with a real-date check so `2026-13-45` does not pass a pattern
it fits. A190 separately asserts `sw.js` and `index.html` agree, so this is not
that check either.

### Deploy-path state

No client deploy this session. Last deploy-path commit remains `e698fdd0`
(2026-09-04), which is why `2026-09-04f` is correct rather than stale — and is
exactly what the moved assertion now compares against.

---

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

## Session 2026-10-06 — chrome-inventory, red for 32 runs

Session doc (Rule 67): `outbox/cc-session-2026-10-06-chrome-inventory-green.md` — DONE, confidence 96

SW version: 2026-10-06a → 2026-10-06b

`chrome-inventory.yml` run 68 (`f79b560`) is **green**. Its previous green was
run 35 on 2026-09-12 — 32 consecutive failures between them, all reporting the
same thing: `unreferenced-css-check.mjs` found `card-odds`, 1 of a declared 0.

- **`f79b5608`** — `.card-odds` deleted. One occurrence in the whole repo, the
  rule itself; nothing emits it, `oddsLine()` does not exist, and the odds line
  that renders comes from `src/debrief/index.ts` as `debrief-odds*`. Its
  governance paragraph moved onto `.debrief-odds__scenario` /
  `.debrief-odds__line`, where odds are actually displayed and where the
  constraint it states is what the rules do.
- **`fcea0e30`** — 7 eslint `no-restricted-syntax` errors fixed, present at
  every commit since 2026-09-21 and blocking any `index.html` change. They were
  invisible because `scripts/pre-commit` lints `index.html` with `--cache`, so
  commits that do not touch it reuse the cached pass.

Corrected after the fact: `f79b5608`'s message says when `.card-odds` arrived is
not stated, because `git log -S` over this shallow clone marks only the shallow
boundary. True about the clone, wrong as a conclusion — `gh api
repos/.../commits/d207c19` answers it in one call. `.card-odds` was live and
emitted at `d207c19`, 2026-09-12, *"fix: the odds line was wired into a function
nothing calls"*, which is also chrome-inventory's last green run; the wiring was
removed before `68b1484` the next day and the rule outlived it by 24 days.
`smoke.js` A-ODDS-7 now asserts that wiring stays gone.

Open: the hook's `--cache` on `index.html` hides a repo-wide lint failure from
every commit that does not touch that file. Left as a decision, not a silent fix.

## Session 2026-10-06 — the BJK Cup draw nobody could reach

Session doc (Rule 67): `outbox/cc-session-2026-10-06-bjk-cup-draw-unreachable.md` — DONE, confidence 96

SW version: 2026-09-22b → 2026-10-06a (set by deploy-gate.yml's A190 auto-fix,
which re-dated a UTC value to ET; the bundle that shipped carries the corrected
one, asserted live by the gate's Confirm step)

`tennis-tier-ladders.yml` was not a dead cron. It is an undeclared detector that
had reported the same real cross-repo finding once a week for three weeks: 509
Billie Jean King Cup began serving a QF=4 SF=2 F=1 nation knockout and the
client hid it by name. 391 United Cup, already admitted, is indistinguishable
from it in structure — category `other`, nations as p1/p2, rank and sets null
throughout, 6 edges, no anomalies.

- **client `6af0ffbb`** — the senior Cup leaves `_TENNIS_DRAW_NO_BRACKET` and
  gains `'Billie Jean King Cup': 2` in `_TENNIS_DRAW_NAMED_RANK`. Both edits
  load-bearing, each caught by mutation when reverted alone. Group I and the
  Davis Cup stay excluded on a measurement: both still serve zero main-draw
  rounds. smoke A-TDRAW-16/17 rewritten; 1055 passed, 0 failed.
- **relay `e351a92`** — the probe's copies of the client's lists follow, with
  the comment now stating that they ARE copies.
- **client `8213bc50`** — `codemap.yml`'s bare `git push` joins the repo's
  rebase-and-retry convention. It lost a race to the A190 auto-fix on
  `6af0ffbb` and discarded a generated code map while going red.

Done condition met on a real run: tier-ladders run 9 green, `clientSplitDrift: []`,
artifact `399cd5a`, coverage `perTier: 1` (14 editions of 42 — the split check
reads all 7 named events regardless).

Open: the probe's client lists are still literals (reading the client's source is
the fix, not in these commits); `chrome-inventory.yml` red on every run since
2026-09-13, undeclared, same check green inside the deploy gate.

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
