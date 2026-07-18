# FIELD HANDOFF
## CLIENT HEAD: f39184f · 2026-07-18 · CC session (esbuild Phase 3d)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase3d.md

**esbuild Phase 3d COMPLETE — fourth real ES module extraction.**
- `src/utils/espn-clock.js` (new): `export function fmtESPNClock(clock)` — pure ISO8601 clock → display string formatter, zero external deps
- `src/legacy/field.js`: body replaced with stub comment; file remains import-free
- `src/main.js`: imports espn-clock.js, sets `globalThis.fmtESPNClock` before field.js runs
- 6 real call sites in field.js (including typeof guard) resolve as plain global reads
- Smoke: 958/0 local + CI. Live CI run `29627125105` all steps green. Deployed. Live site smoke: 895.
- **Note:** Phase 3e CC-CMD already committed to main (5aa9fb1) — next extraction ready to execute.

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
- `src/legacy/field.js`: both bodies replaced with stub comments; file remains import-free
- `src/main.js`: imports tier.js, sets `globalThis.fieldTierRank` + `globalThis.fieldTierLabel` before field.js runs
- 22 fieldTierRank + 6 fieldTierLabel call sites in field.js resolve as plain global reads (unchanged)
- Smoke: 958/0 local + CI. Live CI run `29626362882` all steps green. Deployed. Live site smoke: 895.

---

## PREVIOUS HEAD: cc35b4b · 2026-07-18 · CC session (esbuild Phase 3)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase3.md

**esbuild Phase 3 COMPLETE — first real ES module extraction.**
- `src/utils/golf-format.js` (new): `export function fmtGolfToPar(v)` — 5-line pure utility
- `src/legacy/field.js`: fmtGolfToPar body replaced with stub comment; file remains import-free
- `src/main.js`: imports golf-format.js, sets `globalThis.fmtGolfToPar` before field.js runs
- Smoke: 958/0. Live CI run `29625736816` confirmed all steps clean. Deployed.
- **Pattern for future extractions:** new module → `src/utils/` or `src/sports/`; wire via `src/main.js` globalThis assignment; field.js stays import-free. See session doc for full rationale.

---

## PREVIOUS HEAD: b4bf1ee · 2026-07-18 · CC session (esbuild Phase 2b)
Session doc: outbox/cc-session-2026-07-18-esbuild-phase2b.md

**esbuild Phase 2b COMPLETE — src/legacy/field.js is now the sole edit target.**
- `scripts/sync-source.mjs` — new script: field.js → index.html propagation
- `scripts/pre-commit` — auto-syncs field.js → index.html before smoke on every commit
- `scripts/build-bundle.mjs` — GENERATED comment warns against editing index.html directly
- `.github/workflows/deploy-gate.yml` — SW_VERSION sync targets src/legacy/field.js
- Smoke: 958/0. Live CI verification: run `29625262959` (cleanup) confirmed all 6 steps clean.

---

## PREVIOUS HEAD: 4bb105b · 2026-07-17 (early AM) · via chat, cross-referencing multiple parallel CC sessions

**Session status: still active, not formally closed. This entry is a mid-session update, not a close-out.**

### DONE since the drama-gateway entry below — real, independently-verified work across both repos

**Amnesty Zone discovery + hold.** A relay CC session's real AST analysis (tree-sitter, zero parse errors) found the "FIELD Presentation Compiler" promise (Drive doc, June 28 2026, Items 4/5) was never built — confirmed live. Deep search + direct verification corrected an initial too-pessimistic read: of the compiler's 4 "assumed built" prerequisites, Context Assembler (`src/context-assembler.js`, relay) and Ambient Panel are genuinely built+wired; Availability Clarity Layer and Card Face Contract are not missing new invention either — both have real infrastructure already live (broadcast chip data since May, the bottom-sheet since 2026-05-21), just never formalized into the specific contract objects the doc proposed. `getDramaGateway` (see below) was dispatched and built specifically as the patent-safety foundation before proceeding. **5 Amnesty Zone CC-CMDs found via a full queue sweep** (arc-poster, bottom-sheet, card-face, leaderboard-client, leaderboard-relay) — one misfile caught+relocated (`leaderboard-relay`, same repo-scoped-docs-write issue as twice before). **All 5 remain explicitly ON HOLD** pending a real sequencing decision — the gateway foundation now exists, but "foundation exists" isn't the same claim as "the other 35 ad-hoc state-check sites all route through it."

**MLS AVV manifest gap closed** (`60171ca`, relay CC). The real MLS proof-mode code (5 Playwright tests, `tests/adapter-visible-value.spec.js`) had already landed July 13 via the Home Run Derby commit — the only genuine gap was `docs/adapter-proof.manifest.json` never being updated alongside it. Chat independently made and caught the identical mistake (checked `smoke.js` only, missed the separate Playwright spec file) before the relay CC's own fix landed — same root cause, found twice, independently.

**`wc_third_place_standings` verified + fixed** (relay, `d3b8d7d`). A carry-forward item propagating across multiple session outboxes ("2 live call sites will throw if hit") was checked directly against real D1 — the view genuinely works, returns real 12-row data. One of two call sites was already safely guarded (`Promise.allSettled`); the other (`handleWCThirdPlace`) was genuinely unguarded — now wrapped in try/catch. The "will throw" framing itself was stale, copy-forwarded without re-verification across at least 2 other session outboxes (MLB series tracking, Gap 7) — worth knowing this specific line item is resolved wherever else it appears.

**MLB series tracking** (relay, `cd7024e`+). Real root cause found: `regular_season_games` had no `importance` column (hardcoded NULL), unlike `postseason_games` — explains why series-clinch detection silently never fired for regular-season MLB. Fixed (`ensureImportanceColumn`, `detectMLBSeriesOutcome`). Honestly staged — cannot live-verify without a real MLB series actually clinching.

**Gap 7 — newspaper Monday-only fields** (relay, `0c1fd44`). 4 real fields added to the Monday analytics bundle; 3 rendered client-side (`THE WEEK IN SPORTS`, `WHAT WE GOT WRONG`, + 1 more), 1 (`broken_record`) correctly left unrendered — it's a structured object needing its own chip/table design, not force-fit into existing prose sections.

**Gemini 3.1 Flash-Lite vs 3.5 Flash — real head-to-head, clean negative result** (relay CC, `CC-CMD-2026-07-16-gemini-model-comparison.md`, 100/100). 5 real games × 2 models, byte-identical real production prompts, scored via FIELD's own `scoreProse` + voice judge (not published benchmarks). **3.5 Flash scored lower (162.4 vs 177.0 avg), failed the voice judge every time (0/5 vs 1/5), ran 5.4x slower, cost 6.05x more.** Clean, unanimous "no" — production stays on 3.1 Flash-Lite. Reusable test infra (`/debug/gemini-model-test`, `X-FIELD-Test-Model` header) left in place, not dead code. Separately checked GPT-4o mini as a possible alternative: cheaper than current ($0.15/$0.60 vs $0.25/$1.50) but legacy/deprecated status and notably lower benchmark quality (19th percentile) — GPT-4.1 nano is the more honest current-model comparison if cost reduction from baseline is the real goal.

**Journalism quality — post-match exemplars added** (relay, `7fd4e34`). Real gap: all 4 prior `FIELD_VOICE_REGISTER` exemplars were pre-match preview prose; the pipeline also generates post-match briefs on the same register with no matching examples. Added 3 real post-match exemplars (soccer, NBA, NHL) labeled distinctly. `voiceExemplarBlock` (curated top-quality-score examples) audited and confirmed already live for slate briefs; game-brief paths still don't get this treatment — real, disclosed, separate-session scope.

**Dropbox save**: `/index-2026-07-16-drama-gateway-complete.html`, 2.41MB, verified byte-exact, HEAD `4bb105b`.

### Still open, unchanged
- 5 Amnesty Zone CC-CMDs, held (see above)
- Gap 5/Gap 6 (context/game field name, enrichment brief types) — blocked, no authoritative definition, per prior entry below
- 35 ad-hoc drama state-check sites not yet migrated to `getDramaGateway`
- Haiku 4.5 "clinical/surgical efficiency" phrasing pattern — worth a `BANNED_PHRASES` addition, not yet done
- Game-brief exemplar injection — real, scoped, not yet done

---

## PRIOR ENTRY (2026-07-16, preserved — drama gateway + broadcast chip)

## CLIENT HEAD: 71e5b09 · SW_VERSION: 2026-07-16f · 2026-07-16 · via Claude Code
## Smoke: 958/958
## Session doc: outbox/cc-session-2026-07-16-broadcast-chip-verify.md

### DONE — getDramaGateway (drama-gateway CC-CMD)
- `getDramaGateway(game, sport)`: structural access point for drama data keyed on state
  - post → {mode:'score', value, arc, peak} (numeric only exits here)
  - live → {mode:'observation', value: CRUNCH_TIME|CLOSE_FINISH|BLOWOUT|IN_PROGRESS}
  - pre  → {mode:'observation', value: MARQUEE|SCOUTS_PICK|STANDARD}
- Wired: `injectDramaBadges` + `renderOneToWatch` (guard returns on mode!=='observation')
- Smoke: 954 → 958 (4 new A-DRAMA-GATEWAY-* assertions)
- SW_VERSION: 2026-07-16e → 2026-07-16f
- Commit: c9505a9

### Open
- 35 remaining ad-hoc state-check sites (future migration to gateway, separate prompts)
- 5 Amnesty Zone CC-CMDs (Arc Poster, Bottom Sheet, Card Face, Leaderboard) — now have gateway foundation
- Gap 5 (/context/game/:id field name) — blocked, no authoritative definition
- Gap 6 (enrichment brief types) — blocked, no authoritative definition
