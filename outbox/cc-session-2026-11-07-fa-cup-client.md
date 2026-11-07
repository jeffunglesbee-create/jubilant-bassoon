# Session doc — FA Cup client half (field-relay-nba `docs/CC-CMD-2026-08-08-fa-cup-coverage.md`, Task 4)

Date: 2026-11-07. Scope: jubilant-bassoon (the served PWA). Owner order: **"Add a new key"** (2026-11-07), answering whether the FA Cup should reuse `LALIGA` or get its own `BUNDLES` key. That is an explicit owner override of the CC-CMD's "do not invent a bundle".

HEAD progression: `ba7627d` (start) → the commit named in `HANDOFF.md` (end). Smoke 1066 → 1078 (FA-1..FA-8, FS-1..FS-4). Units 70 → 76 (six `espnListsBroadcast` tests). `SW_VERSION` `2026-10-29b` → `2026-11-07a` (the FA Cup) → `2026-11-07b` (the `findScore` fix below), in `src/legacy/field.js` and `sw.js`.

## What was built

1. `BUNDLES.FA_CUP = ["espnplus"]`, a NEW key (owner's order). No existing key is ESPN+ alone: `LALIGA` lists `espnplus` beside fubo/hulu/sling/youtubetv, none probed for the FA Cup; `EFL`, the key the CC-CMD named, is Paramount+, which the probe contradicts.
2. `SOCCER_LEAGUES` entry `{ league: 'eng.fa', section: 'FA Cup', bundle: 'FA_CUP', leagueLabel: 'FA Cup', limit: 100, bundleIfListed: 'espn+' }`.
3. `espnListsBroadcast(comp, name)` in `field_utils.js` (tested by `field_unit.js`) and an identical inline copy in `src/legacy/field.js` (smoke A191 requires inlining), declared in `.eslintrc.json`.
4. Both card-creating paths use the gate: `fetchSoccerFixtures` and the `fetchESPNFixturesForDate` date sweep set `streams: (bundleIfListed && !espnListsBroadcast(comp, bundleIfListed)) ? [] : resolveBundle(bundle)`. `fetchSoccerFixtures` takes `limit` from the entry (`limit=${limit||30}`).
5. **The `'fa cup'` token at ten label-substring routers** (added after the review below found it was missing): `sportCountLabel`, `classifySport`, the voice exemplar, `getFieldVoice`, the journalism sport tags, `detectSportClass`, the "Kickoff" verb (watch window), the Night Owl prompt, `sportContext`, and the countdown label. Each sat beside `'efl'`.

## Beyond "a new key": three additions, and why

From field-relay-nba `outbox/probe-fa-cup-scoreboard-limit-2026-11-07T14-27-37-477Z.json` (a runner read of ESPN's own scoreboard):

- **`limit: 100`.** `fetchSoccerFixtures` asked ESPN for 30 events. ESPN served 33 first-round games for 2026-11-07, so 3 were dropped (ids 401931084, 401931097, 401931104).
- **`bundleIfListed: 'espn+'`.** ESPN lists ESPN+ on **2 of 33** games on 2026-11-07 and an empty broadcasts array on 31; on 2026-11-08 it lists ESPN+ on **4 of 4**. A static bundle would have put ESPN+ on 31 games ESPN lists no service for. **Correction to an earlier statement to the owner**: "every FA Cup game streams on ESPN+" was a generalisation from the 4 games of 11-08. It is wrong for 11-07. The owner's order was a new key; the gate is mine and goes beyond it. Way back to the static behaviour of every other entry: delete `bundleIfListed` from the entry.
- **The router tokens.** Without them the card renders and never scores (next section). The relay half already did the same for its own `detectSportClass`.

## Independent review (2026-11-07, 15 agents: four lenses, each finding re-checked by a skeptic told to refute it)

| finding | verdict | disposition |
|---|---|---|
| `classifySport`'s soccer regex has no `fa cup`, so `findScore`/`findESPNScore` return null for a live FA Cup game: **blocker** | reproduced | fixed. `findScore` on a live 2-1: HEAD `null`, fixed tree `2-1 state=in` (`outbox/fa-cup-findscore-2026-11-07.txt`) |
| the same missing token at nine other routers (units `pt`/`Q1`, "2 games", no vocab guard, basketball prompt for a soccer game): major | reproduced | fixed (item 5 above); smoke FA-7, FA-8 |
| FA-3/FA-4 pass when the gate or the limit survives only in a comment; nothing checks `limit`/`bundleIfListed` are bound in the two destructures (a slip silently removes every soccer league): major | reproduced, 6 mutants survived | fixed: the checks read comment-blanked source and assert the names are bound; all 6 now caught |
| the deploy gate "Every recent session doc is named in HANDOFF" fails if this doc is pushed unnamed: major | reproduced | named in `HANDOFF.md` |
| the session doc said the stream "flips between polls" | reproduced, doc only | fixed here: the stream is decided once per `fetchSchedule` run, not per poll |
| FA Cup absent from past-date navigation (`fetchRelayDateSections` iterates `FIELD_V2_SOURCES`) | real, **not from this change**: `EFL Cup` and `EFL Trophy` have the same gap | recorded as an open task of the relay CC-CMD, not built here |
| the sweep's cache freezes the gate's decision for the tab session | mechanism reproduced; consequence not shown; pre-existing cache behaviour | recorded in the same CC-CMD |
| `geoBroadcasts` could list ESPN+ where `broadcasts` does not | **refuted**: the real ESPN response for both dates lists the same 2 events either way | none |
| a linear-network listing without ESPN+ gets no chip | not reproduced (0 of 39 real events) | none |

Left alone on purpose: the match-brief card list (`isSoccerLeague`, a closed list of leagues; the EFL cups are not in it either) and the ember threshold (`return 52` for `efl`: a tuning number, not a sport router).

## The live check, against ESPN's real data (8 runs of `fa-cup-live-probe.yml`, 15:43Z to 16:07Z, while the 33 first-round games were in play)

The sandbox reaches neither ESPN nor the deployed page in a browser, so a dispatch-only runner probe (`fa_cup_live_probe.js`, CI-as-proxy, Rule 90) loads the deployed page in Chromium with `?wpt` and compares it with ESPN's own `eng.fa` scoreboard read in the same run. Each run's manifest is committed (`outbox/fa-cup-live-probe-manifest-2026-11-07T15-43-42.json` … `T16-07-24.json`). **What the first runs measured was the probe, not the page**, and each is kept as the evidence:

| runs | what they showed | what it was |
|---|---|---|
| 1 (15:43Z) | 0 FA Cup cards; the in-page ESPN fetch answered 200 with 0 events, while the relay's runner probe read 33 for the same day at 15:44Z | ESPN answers a headless Chromium on a runner empty; Node's fetch on the same runner gets the data. The probe now answers the page's ESPN requests itself, with Node's fetch, body unchanged (it exercises the deployed bundle and ESPN's live data, not the browser's own route to ESPN) |
| 2, 3 | 33 cards, but an empty time cell and an empty stream row on EVERY live soccer card, the Bundesliga's included, and ESPN+ on neither listed game | `innerText` is `''` for an element that is not rendered. The probe reads `textContent` and the chip's own selector now |
| 4 (15:55Z, again 15:58Z) | **33 cards for ESPN's 33 events; ESPN+ on exactly the 2 games ESPN lists it for (Altrincham v Notts County, Peterborough United v Reading, both past the old limit-30 cut); 31 of 31 live FA Cup cells show a score, 8 of 8 on the other leagues** | the entry works against real data: `limit`, `bundleIfListed`, the router tokens |
| 5 to 8 (16:00Z to 16:07Z) | 28 of 31 live FA Cup scores equal ESPN's. Three do not, in the same three games every run | below |

**The three.** The last run recorded each card's raw cell text.
- **Carlisle United v Salford City and Colchester United v Worcester City: `0–0 ⚠`, ESPN 1-0.** The page's own mismatch flag (`confidence: 'mismatch'`): a second score source disagrees with ESPN, the fresher one is shown and marked. Not an FA Cup defect and not a wrong card: the designed PM-20 behaviour. Which second source was not read (api-sports through the relay lagging a goal is the likely one, UNVERIFIED).
- **York City v Northampton Town: `1–0 '2`, ESPN 0-3, no flag. A defect, found by this probe and not by any review.** The card showed **Huddersfield Town v Exeter City's** score. `espnTeamMatch` matches on any shared word longer than three characters ("Town", "City"), and `findScore` took the FRESHEST ESPN witness across every key it matched. Reproduced three ways before any change: by execution of the real `findScore` on the real 33 games seeded like the poller (`outbox/fa-cup-findscore-collision-2026-11-07.txt`: York wrong when the writes tie, Huddersfield wrong when they are 1 ms apart); by replaying those games into a local build of the page (`outbox/fa-cup-replay-2026-11-07.txt`: 1 live cell differs from ESPN, York's); and on the live page, in all four runs that compared scores. Pairs that match each other that day: Carlisle/Colchester ("United", "City"), Huddersfield/York ("Town", "City"). The same loop serves every sport (see Open).

**The fix** (`src/legacy/field.js`, `findScore`; `SW_VERSION` 2026-11-07b): when an ESPN entry exists under the card's own two names, every other key's ESPN witness is another game's and is skipped. Scoped to the ESPN slot on purpose: it has ONE writer (the ESPN poller, line 19044, the same display names the card was built from), while the api-sports slot has three writers in several name forms and keeps the fuzzy aggregation PM-24 needs. With no exact ESPN entry nothing changes. The PM-24 text anchors A486 to A488 are untouched.
- Differential, old against new, on the real games in three write orders (`outbox/fa-cup-findscore-collision-2026-11-07.txt`): OLD wrong on 1 card, NEW wrong on 0; the change altered exactly that 1 card and **none that was right before**.
- Replay of the real games into a build of the fixed page: 0 live cells differ from ESPN (was 1).
- Smoke FS-1 (two colliding games each get their own score, in both timestamp orders and with a reversed key), FS-2 (the PM-24 cross-source case still returns `verified` from two sources), FS-3 (no exact entry: the fuzzy fallback still finds one), FS-4 (the change is scoped to the ESPN slot). **7 of 7 mutants caught** (`outbox/fa-cup-findscore-mutants-2026-11-07.txt`, harness `.py`; the FA set is in `outbox/fa-cup-smoke-mutants-2026-11-07.*`). One mutant survived the first test set (the reversed orientation) and drove the reversed-key case in FS-1; one of my own lines was dead code (`continue` made redundant by `if (!probe) continue`) and was removed.

## Artifacts (Rule 90: each names the thing that proves it)

| claim | artifact |
|---|---|
| smoke | `node smoke.js index.html` → `1078 passed, 0 failed` |
| units | `node field_unit.js` → 76 passed, 0 failed |
| the CC-CMD's Task 4 artifact | `isDomesticLeagueInBreak('FA Cup', d)` EXECUTED: `2026-11-07 false`, `2027-01-10 false`, `2027-03-07 false`, `2027-05-16 false`; control `isDomesticLeagueInBreak('Bundesliga','2026-07-01')` → `true` (smoke FA-6) |
| every soccer label routes as soccer | smoke FA-7, executed for `Bundesliga`, `EFL Cup`, `EFL Trophy`, `FA Cup` through `classifySport`, `findScore` (a live 2-1 comes back 2-1), `sportCountLabel`, `detectSportClass`, `sportContext`, `getFieldVoice` |
| mutants | `outbox/fa-cup-smoke-mutants-2026-11-07.txt` (harness `.py`): **25 of 25 caught**, each named and anchored uniquely. One mutant of mine (E3) was malformed (an array where the table holds `{end, resume}`) and printed SURVIVED; it was fixed and caught, not waved off. 6 unit mutants of `espnListsBroadcast` caught (earlier run) |
| render | `outbox/fa-cup-render-2026-11-07.json` (harness `outbox/fa-cup-render-harness-2026-11-07.mjs`): the esbuild bundle in Chromium, ESPN `eng.fa` stubbed with 33 SYNTHETIC events. Real build: 1 FA Cup section, 33 cards, ESPN+ on exactly games 5 and 32, last card game 33. Mutants: A (no `bundleIfListed`) 33 ESPN+ cards, B (limit unset) 30 cards, C (a bundle key that does not exist) 0 ESPN+ cards, S (the `fa cup` token out of `classifySport`) a different live card (time cell empty, circadian `late` against `preview`) |
| ratchets | absence-collapse ratchet OK (run in a copy named `jubilant-bassoon` beside `field-relay-nba`); render-reaches-dom, v2-section-labels, session-docs-indexed PASS; check-html-block ok; eslint 0 errors |

**CI caught what my local ratchet run did not.** The push `dfd5712` failed the deploy gate's absence-collapse ratchet (run `42386509431`): the render harness in `outbox/` carried `Number(u.searchParams.get('limit') || 0)`, a fourth `|| 0` site against a baseline of 3. My local runs printed `OK` while checking nothing: they omitted CI's `--baseline` and `--require` arguments, and ran in a copy whose new files were untracked. Reproduced with CI's exact arguments (`RATCHET FAILED ... 4 > baseline 3`, the same site), fixed in the next commit (an absent `limit` is now `null`, distinct from a real 0), re-run: `ratchet OK`. The edited harness was re-run against a fresh build and matches the committed manifest field for field. Nothing deployed from `dfd5712`: the gate stopped before the build.

**Coverage (Rule 91):** the render is one stubbed day (33 synthetic events), one viewport (1280 wide), the bundle served from `127.0.0.1`. The real eng.fa scoreboard was read by the relay's runner probe and, for the review, through a browser tool; the page never read it. Team names in the stub are invented. The render harness is **not a gate**: nothing runs it on a push. It is evidence; the gates are smoke FA-1..FA-8.

**The stub's `0–0`.** In the stub render the live card's time cell read `0–0` while its stage line read the live 2-1, for an EFL Cup control as well. With real data the page's cells show the real scores (31 of 31 live, 28 equal to ESPN, the other three explained above), so the stub's cell is not the page's behaviour on real data; its cause was not traced and is immaterial now (the stub dates every game at 15:00Z, so the card's time guess calls all 33 live).

## Verified live vs STAGED

- **Live, `SW_VERSION 2026-11-07a`** (deploy gate run `42386741813` after the first push failed the ratchet): the Live Deploy Verify Probe (run `42387005410`) read HTTP 200, `SW_VERSION = "2026-11-07a"`, slugs `eng.fa`, `eng.league_cup`, `eng.trophy`, labels `"EFL Cup"`, `"EFL Trophy"`, `"FA Cup"`; the live probe above read the cards, ESPN+ and scores against ESPN's data.
- **Live, `SW_VERSION 2026-11-07b`** (the `findScore` fix, `ad5d4b9`): deploy gate run `42390293724` `success`, its confirm step reading the live site serving `2026-11-07b`. The live probe (run `42390487517`, `outbox/fa-cup-live-probe-manifest-2026-11-07T16-18-21.json`, 33 events, 31 in play): 33 cards, ESPN+ on exactly the 2, 31 of 31 cells show a score, **29 of 31 scores were served by ESPN for that game, and York City v Northampton Town is no longer among the two that were not** (before the fix: 28 of 31, York silent). The remaining two, Carlisle and Colchester, read `0–0 ⚠`, the page's own mismatch flag.
- **STAGED:** 2026-11-08's four games (all listing ESPN+). Unblocked when: they are on the scoreboard. Verify: dispatch `fa-cup-live-probe.yml` on 2026-11-08 and read `cardsMatchEspn`, `espnPlusMatchesEspn` (expect 4 of 4). The probe is read-only and needs no secret.

## Open

- **The fuzzy match is wider than the FA Cup.** `espnTeamMatch` and `findScore` serve every sport; on 2026-11-07 the real FA Cup list alone had two colliding pairs among 33 games. Not measured: the same differential on a college football Saturday (generic words "State", "Southern", "University"), the NBA/NHL/MLB lists, and the api-sports slot, which this fix leaves fuzzy. The relay has a sibling of this defect in odds pairing: `docs/CC-CMD-2026-10-19-cfb-stage2-wrong-pair.md` ("a CFB game priced from another game", `odds-name-match.js`). Re-run `outbox/fa-cup-findscore-collision-2026-11-07.cjs` on a CFB scoreboard manifest to measure it.

- Past-date navigation does not include the FA Cup, the EFL Cup or the EFL Trophy (`FIELD_V2_SOURCES` has no key for them): the relay CC-CMD carries it as an open task.
- Not modelled: ESPN removing or adding a broadcast listing after the page loads (the stream list is fixed at load, and the date sweep caches its result for the tab session).
- UEFA and the other cups are outside `BSD_SOCCER_SPORTS` (relay), unchanged.
