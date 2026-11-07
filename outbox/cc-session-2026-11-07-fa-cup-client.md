# Session doc — FA Cup client half (field-relay-nba `docs/CC-CMD-2026-08-08-fa-cup-coverage.md`, Task 4)

Date: 2026-11-07. Scope: jubilant-bassoon (the served PWA). Owner order: **"Add a new key"** (2026-11-07), answering whether the FA Cup should reuse `LALIGA` or get its own `BUNDLES` key. That is an explicit owner override of the CC-CMD's "do not invent a bundle".

HEAD progression: `ba7627d` (start) → the commit named in `HANDOFF.md` (end). Smoke 1066 → 1074 (FA-1..FA-8). Units 70 → 76 (six `espnListsBroadcast` tests). `SW_VERSION` `2026-10-29b` → `2026-11-07a` (`src/legacy/field.js` and `sw.js`).

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

## Artifacts (Rule 90: each names the thing that proves it)

| claim | artifact |
|---|---|
| smoke | `node smoke.js index.html` → `1074 passed, 0 failed` |
| units | `node field_unit.js` → 76 passed, 0 failed |
| the CC-CMD's Task 4 artifact | `isDomesticLeagueInBreak('FA Cup', d)` EXECUTED: `2026-11-07 false`, `2027-01-10 false`, `2027-03-07 false`, `2027-05-16 false`; control `isDomesticLeagueInBreak('Bundesliga','2026-07-01')` → `true` (smoke FA-6) |
| every soccer label routes as soccer | smoke FA-7, executed for `Bundesliga`, `EFL Cup`, `EFL Trophy`, `FA Cup` through `classifySport`, `findScore` (a live 2-1 comes back 2-1), `sportCountLabel`, `detectSportClass`, `sportContext`, `getFieldVoice` |
| mutants | `outbox/fa-cup-smoke-mutants-2026-11-07.txt` (harness `.py`): **25 of 25 caught**, each named and anchored uniquely. One mutant of mine (E3) was malformed (an array where the table holds `{end, resume}`) and printed SURVIVED; it was fixed and caught, not waved off. 6 unit mutants of `espnListsBroadcast` caught (earlier run) |
| render | `outbox/fa-cup-render-2026-11-07.json` (harness `outbox/fa-cup-render-harness-2026-11-07.mjs`): the esbuild bundle in Chromium, ESPN `eng.fa` stubbed with 33 SYNTHETIC events. Real build: 1 FA Cup section, 33 cards, ESPN+ on exactly games 5 and 32, last card game 33. Mutants: A (no `bundleIfListed`) 33 ESPN+ cards, B (limit unset) 30 cards, C (a bundle key that does not exist) 0 ESPN+ cards, S (the `fa cup` token out of `classifySport`) a different live card (time cell empty, circadian `late` against `preview`) |
| ratchets | absence-collapse ratchet OK (run in a copy named `jubilant-bassoon` beside `field-relay-nba`); render-reaches-dom, v2-section-labels, session-docs-indexed PASS; check-html-block ok; eslint 0 errors |

**CI caught what my local ratchet run did not.** The push `dfd5712` failed the deploy gate's absence-collapse ratchet (run `42386509431`): the render harness in `outbox/` carried `Number(u.searchParams.get('limit') || 0)`, a fourth `|| 0` site against a baseline of 3. My local runs printed `OK` while checking nothing: they omitted CI's `--baseline` and `--require` arguments, and ran in a copy whose new files were untracked. Reproduced with CI's exact arguments (`RATCHET FAILED ... 4 > baseline 3`, the same site), fixed in the next commit (an absent `limit` is now `null`, distinct from a real 0), re-run: `ratchet OK`. The edited harness was re-run against a fresh build and matches the committed manifest field for field. Nothing deployed from `dfd5712`: the gate stopped before the build.

**Coverage (Rule 91):** the render is one stubbed day (33 synthetic events), one viewport (1280 wide), the bundle served from `127.0.0.1`. The real eng.fa scoreboard was read by the relay's runner probe and, for the review, through a browser tool; the page never read it. Team names in the stub are invented. The render harness is **not a gate**: nothing runs it on a push. It is evidence; the gates are smoke FA-1..FA-8.

**Not explained.** In the stub the live card's time cell reads `0–0` while its stage line reads the live 2-1 (`1–2 67'`, away–home). An EFL Cup control with the same live event in the same stub shows the same `0–0`, so it is not specific to the FA Cup. Not traced: the stub dates every game at 15:00Z, so the card's time guess calls all 33 live, which may be all it is. Unblock: the first live FA Cup match on the deployed page (2026-11-08). Verify: read `.game-time` and `.card-stage-content` of a live FA Cup card; they must agree on the score.

## Verified live vs STAGED

- Live (after the deploy gate): `html_probe` of the deployed client, grep for the literal `eng.fa` (the pipeline minifies, so the spaced `section: 'FA Cup'` form does not survive). Result in `HANDOFF.md` after the deploy.
- **STAGED:** the page against ESPN's real 2026-11-08 FA Cup games (4 events, all listing ESPN+). Unblocked when: the 2026-11-08 games are on the scoreboard. Verify: load the deployed page on 2026-11-08 and count `.game-card[data-sport="FA Cup"]` (expect 4, each showing ESPN+). The sandbox cannot load ESPN from a headless browser (Akamai "Access Denied"), so this needs a runner (CI-as-proxy, Rule 90).

## Open

- Past-date navigation does not include the FA Cup, the EFL Cup or the EFL Trophy (`FIELD_V2_SOURCES` has no key for them): the relay CC-CMD carries it as an open task.
- Not modelled: ESPN removing or adding a broadcast listing after the page loads (the stream list is fixed at load, and the date sweep caches its result for the tab session).
- UEFA and the other cups are outside `BSD_SOCCER_SPORTS` (relay), unchanged.
