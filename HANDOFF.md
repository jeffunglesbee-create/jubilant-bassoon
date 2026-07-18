# FIELD HANDOFF
## CLIENT HEAD: 3d1c4b0 · 2026-07-18 · CC session (esbuild Phase 5)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase5.md

**esbuild Phase 5 COMPLETE — first constant+function pair extraction.**
- `src/utils/wind.js` (new): `export const WX_DIR` + `export function cardinalDir`
- `src/legacy/field.js`: both stubs in place; file remains import-free
- `src/main.js`: imports wind.js, sets `globalThis.WX_DIR` + `globalThis.cardinalDir`
- 1 real call site: `cardinalDir` at L11108 in `wxBadge`, resolves via globalThis bridge
- Smoke: 958/0 local + CI all steps green. Live site: 895.
- **Pattern extension confirmed:** constant+function co-extraction works identically to pure-function pattern. Remaining pairs (`VENUE_COORDS`+`isOutdoorVenue`+`getVenueCoords`, `MY_TEAMS`+`isFeaturedTierGame`) can use the exact same CC-CMD template.

---

## PREVIOUS HEAD: da429d49 · 2026-07-18 · CC session (esbuild Phase 3-final)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase3-final.md

**esbuild Phase 3-final COMPLETE — 11 functions extracted in batch, Phase 3 series finished.**
- `src/utils/weather.js` (new): wxDescription, wxIcon, wxAlert, weatherDramaModifier
- `src/utils/odds.js` (new): isVolatileMatchup, _upsetDogPrice
- `src/utils/chips.js` (new): _chipsHTML
- `src/utils/push.js` (new): urlBase64ToUint8Array
- `src/utils/rai.js` (new): _raiQualityBar
- `src/utils/nfl.js` (new): _srSitToYL100
- `src/utils/otw.js` (new): _otwSigTierRank
- Total Phase 3 extractions: **19 functions across 13 modules**
- Smoke: 958/0 local + CI Deploy gate success. Live site smoke: 895.
- **"Easy category" exhausted.** All remaining functions in field.js are either smoke-asserted, constant-dependent, or state-dependent. Phase 4 (co-extracting constants + their dependent functions, or tree-shaking) is the next natural step if further modularization is wanted.

---

## PREVIOUS HEAD: 91b3d6d · 2026-07-18 · CC session (esbuild Phase 3e)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase3e.md

**esbuild Phase 3e COMPLETE — fifth real ES module extraction.**
- `src/utils/wc-name.js` (new): `export function _normWCName(s)` — pure WC team name slug normalizer, zero external deps
- `src/legacy/field.js`: body replaced with stub comment; file remains import-free
- `src/main.js`: imports wc-name.js, sets `globalThis._normWCName` before field.js runs
- 4 real call sites in field.js (L30064, L30107, L30144, L30154) resolve as plain global reads
- Smoke: 958/0 local + CI. Live CI run `29627340319` all steps green. Deployed. Live site smoke: 895.

---

## PREVIOUS HEAD: f39184f · 2026-07-18 · CC session (esbuild Phase 3d)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase3d.md

**esbuild Phase 3d COMPLETE — fourth real ES module extraction.**
- `src/utils/espn-clock.js` (new): `export function fmtESPNClock(clock)` — pure ISO8601 clock → display string formatter, zero external deps
- `src/legacy/field.js`: body replaced with stub comment; file remains import-free
- `src/main.js`: imports espn-clock.js, sets `globalThis.fmtESPNClock` before field.js runs
- 6 real call sites in field.js (including typeof guard) resolve as plain global reads
- Smoke: 958/0 local + CI. Live CI run `29627125105` all steps green. Deployed. Live site smoke: 895.

---

## PREVIOUS HEAD: 856d348 · 2026-07-18 · CC session (esbuild Phase 3c)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase3c.md

**esbuild Phase 3c COMPLETE — third real ES module extraction.**
- `src/utils/sport-format.js` (new): `export function inferSport(league)` + `export function golfRoundLabel(tourn)` — pure formatters, zero external deps
- `src/legacy/field.js`: both bodies replaced with stub comments; file remains import-free
- `src/main.js`: imports sport-format.js, sets `globalThis.inferSport` + `globalThis.golfRoundLabel` before field.js runs
- 1 call site each (L2620 inferSport, L11711 golfRoundLabel) resolve as plain global reads
- Smoke: 958/0 local + CI. Live CI run `29626880274` all steps green. Deployed. Live site smoke: 895.

---

## PREVIOUS HEAD: 45ffa95 · 2026-07-18 · CC session (esbuild Phase 3b)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase3b.md

**esbuild Phase 3b COMPLETE — second real ES module extraction.**
- `src/utils/tier.js` (new): `export function fieldTierRank(tier)` + `export function fieldTierLabel(tier)` — pure switch statements, zero external deps
- 22 fieldTierRank + 6 fieldTierLabel call sites in field.js resolve as plain global reads
- Smoke: 958/0 local + CI. Live CI run `29626362882` all steps green. Deployed. Live site smoke: 895.

---

## PREVIOUS HEAD: cc35b4b · 2026-07-18 · CC session (esbuild Phase 3)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase3.md

**esbuild Phase 3 COMPLETE — first real ES module extraction.**
- `src/utils/golf-format.js` (new): `export function fmtGolfToPar(v)` — 5-line pure utility
- Smoke: 958/0. Live CI run `29625736816` confirmed all steps clean. Deployed.
- **Pattern for future extractions:** new module → `src/utils/` or `src/sports/`; wire via `src/main.js` globalThis assignment; field.js stays import-free.

---

## PREVIOUS HEAD: b4bf1ee · 2026-07-18 · CC session (esbuild Phase 2b)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase2b.md

**esbuild Phase 2b COMPLETE — src/legacy/field.js is now the sole edit target.**
- `scripts/sync-source.mjs`, `scripts/pre-commit`, `scripts/build-bundle.mjs`, deploy-gate.yml updated
- Smoke: 958/0. Live CI verification: run `29625262959` all steps clean.

---

## PREVIOUS HEAD: 4bb105b · 2026-07-17 (early AM) · via chat

### Still open, unchanged
- 5 Amnesty Zone CC-CMDs, held (arc-poster, bottom-sheet, card-face, leaderboard-client, leaderboard-relay)
- Gap 5/Gap 6 (context/game field name, enrichment brief types) — blocked, no authoritative definition
- 35 ad-hoc drama state-check sites not yet migrated to `getDramaGateway`
- Haiku 4.5 "clinical/surgical efficiency" phrasing pattern — worth a `BANNED_PHRASES` addition, not yet done
- Game-brief exemplar injection — real, scoped, not yet done

### DONE — July 17 session highlights
- `getDramaGateway(game, sport)` — structural drama data access point, Smoke 954→958
- Broadcast chip durable fix (relay + client)
- Gemini 3.1 Flash-Lite vs 3.5 Flash head-to-head — clean negative result, production stays on Flash-Lite
- `wc_third_place_standings` verified + handleWCThirdPlace guarded
- MLB series tracking root cause fixed (ensureImportanceColumn)
- Gap 7 newspaper Monday-only fields added
- Journalism quality post-match exemplars added
- MLS AVV manifest gap closed (relay CC)
- 5 Amnesty Zone CC-CMDs found, all ON HOLD pending sequencing decision
