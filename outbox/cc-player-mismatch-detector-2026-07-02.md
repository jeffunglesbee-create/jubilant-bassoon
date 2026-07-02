# CC Outbox — Player Name Mismatch Detector

**Date:** 2026-07-02
**CC-CMD:** docs/CC-CMD-2026-07-02-player-mismatch-detector.md
**Commits:** 37101ea, e18961a, f84805d (probe extensions), 1a36d86/ef5cca9 (detector script + workflow)
**Real run:** `28599226655`
**Smoke:** 823/0 throughout (Python/Node-only change, no `index.html` touched)

---

## Pre-build probe — two things independently verified, not assumed

### 1. `_stripPlayer` ported from the real relay source, pinned to the exact commit

Fetched `field-relay-nba/src/identity-resolver.js` at commit `8bc84fc`
directly (`raw.githubusercontent.com`, reachable from this sandbox even
though `api.github.com` and the relay's own deployed endpoint are not —
confirmed both restrictions independently this session). Cross-checked
the pinned-commit content against `main`'s current content: byte-identical,
no drift. Ran all 3 required test cases directly against the real function
before porting anything:

```
Player III -> playeri (expect playeri)     ✓
Bobby Witt Jr. -> witt (expect witt)       ✓
Randy Lynch IV -> lynch_iv (expect lynch_iv) ✓
```

Also confirmed `_strip` (the team-style NFD-normalize + strip-diacritics
function used for the loose roster-candidate match, per Task 1 step 3) —
ported verbatim from the same file/commit.

### 2. ESPN roster JSON shape AND team abbreviation scheme — real gap found before it shipped

This repo had no prior confirmed probe of `site.api.espn.com`'s roster
endpoint. Extended `scripts/savant-csv-probe.py` (3 iterations):

- **First probe (TOR only):** confirmed the shape —
  `roster.athletes[].items[]` array of athlete objects with `lastName`/
  `fullName`/`displayName` fields, plus `roster.team.{displayName,
  abbreviation}`.
- **Second probe (TOR, ATH, AZ, CWS):** found a real, would-have-been-silent
  bug before it shipped — `AZ` and `CWS` both returned `HTTP 400 Bad
  Request` from ESPN. Savant's team codes do **not** map 1:1 to ESPN's
  roster URL abbreviations for every team.
- **Third probe (all 30 real team codes from `sprint_speed.json`):**
  rather than patch just the 2 known-divergent codes and assume the
  other 26 were fine, tested every real code with the Savant form first
  and a small set of common ESPN alternates as fallback. Result: **28/30
  codes match their own lowercase form; only `AZ→ari` and `CWS→chw`
  diverge.** Built `SAVANT_TO_ESPN_TEAM` from this complete, verified
  result — not a partial guess.

Without this second/third probe round, the detector would have silently
produced zero matches (all logged as "roster fetch failed") for every
Arizona and Chicago White Sox player — a real, meaningful blind spot in
exactly the kind of tool meant to catch silent mismatches.

## Task 1 — `scripts/mlb-player-mismatch-detector.js`

Implemented per spec: loads and dedupes `{lastNameKey, team}` from the 3
source files (`pitch_tempo.json` cross-references `pitch_arsenals.json`
for team, per the CC-CMD's instruction — never guessed), groups by team,
fetches each team's roster once (cached, not per-player), loose-matches
via `_strip` to find a roster candidate, computes the real key via the
ported `_stripPlayer`, and logs `candidates`/`unresolved`/`unmatched`
with full detail on every entry (never summary-only).

Inline test assertions (the 3 cases above) run first, before any real
file I/O — `process.exit(1)` on any failure, per Task 4's explicit
requirement that this be a real gate, not a one-off manual check.

## Task 2 — `.github/workflows/mlb-player-mismatch-detector.yml`

`workflow_dispatch` only, no schedule, matching the CC-CMD's explicit
instruction ("periodically-useful audit tool, not a continuous
pipeline"). Commits `outbox/mlb-player-mismatches.json` with `[skip ci]`,
matching the existing convention (e.g. `mlb-umpire-zone-backfill.yml`).

## Task 3 — Duplication hazard documented in-code

Top-of-file comment in the detector script states: this is a hand-ported
copy with no automated cross-repo import, the exact commit ported from
(`8bc84fc`), the specific non-obvious quirk that must be preserved (the
`" ii"`-before-`" iii"` substring-prefix behavior), and how to detect
drift (diff against the relay's current `main`).

## Task 4 — Verification

- `node -c scripts/mlb-player-mismatch-detector.js`: syntax OK.
- `python3 -c "import yaml; yaml.safe_load(...)"`: YAML valid.
- Ran the script locally (network blocked as expected — same sandbox
  constraint as every other ESPN/Savant probe this project uses):
  inline test assertions passed (3/3), file-loading and grouping logic
  ran correctly (715 unique keys, 30 teams, 186 unresolved), and the
  network-failure path was exercised and handled gracefully (every key
  logged to `unmatched` with a clear "roster fetch failed" reason, no
  crash). Deleted the resulting local test-artifact JSON before
  committing — it was built from blocked network calls, not real data,
  and shouldn't be mistaken for a real run's output.

**Chat-side follow-up — done in this same session, not deferred:**
triggered the real workflow (`28599226655`). Completed successfully in
~5 seconds total (test assertions + all 30 team roster fetches + file
write).

## Task 5 — Outbox manifest: real first-run numbers

- **30/30 teams** had at least one key to resolve (every real Savant
  team code from the 3 source files).
- **715** unique `lastNameKey`s loaded across the 3 source files.
- **186 unresolved** — `pitch_tempo.json`-only keys with no cross-reference
  team available in `pitch_arsenals.json` (real gap, not guessed).
- **134 unmatched** — team known, no ESPN roster athlete found with a
  matching (accent-stripped) `lastName`. All share one consistent reason
  ("no roster athlete with matching lastName — roster may be stale, or
  player is not yet on it"); spot-checked several (`woods_richardson`,
  `sosa`, `jiménez`, `schneider`, `springer` — all TOR) and found no
  anomalous reason strings or crashes.
- **22 candidates** — real, evidence-based mismatches, every one carrying
  `{espnFullName, realKey, lastNameKey, team, sourceFiles}`:
  - **20 of 22** are the exact diacritic-stripping pattern the CC-CMD
    predicted (ESPN strips accents, Savant preserves them) — e.g.
    `giménez`→`gimenez`, `suárez`→`suarez`, `hernández`→`hernandez`.
  - Notably, one of these 20 is `Cristopher Sanchez → sánchez` (team
    PHI) — the **exact same pair already hand-coded in
    `CANONICAL_PLAYER`**, confirming the detector correctly reproduces
    a known-good result, not just generating new noise.
  - **2 of 22** are a genuinely different pattern the CC-CMD explicitly
    said to watch for beyond the one already noticed: multi-word
    surnames. `Adrian Del Castillo` (AZ) → real key `castillo`, but the
    Savant-sourced key is `del_castillo`. `Elly De La Cruz` (CIN) → real
    key `cruz`, but the Savant-sourced key is `de_la_cruz`. These would
    NOT have been found by hand-checking only the one known diacritic
    case — direct evidence the systematic tool finds a broader class of
    mismatch than the manual discovery did.

**Inline `_stripPlayer` test assertions confirmed passing before any real
roster data was touched** — both in the local dry-run and in the real
workflow run's log (`✅ _stripPlayer(...)` × 3, printed before "Loaded
715 unique lastNameKeys").

**Not decided here, per the script's own design intent:** this tool
proposes; it does not add anything to `CANONICAL_PLAYER`. All 22
candidates need manual review in the relay repo before being accepted,
same pattern as the existing `sánchez` entry.

---

## Done Conditions

- [x] `_stripPlayer`/`_strip` ported and verified byte-identical against
      the real relay source at the pinned commit, not reconstructed from
      the CC-CMD's test cases alone
- [x] ESPN roster JSON shape verified live via CI probe (this repo had
      no prior confirmed probe of this endpoint)
- [x] Team abbreviation mapping built from a complete, verified 30-team
      probe — not a partial guess after finding 2 divergent codes
- [x] Detector script implemented per spec; inline test assertions run
      first and gate real-data processing
- [x] Duplication hazard documented in-code with the exact commit and
      drift-detection method
- [x] Syntax/YAML verified; live-triggered in this session (not deferred)
- [x] Real numbers reported: 30 teams, 715 keys, 186 unresolved, 134
      unmatched, 22 candidates — including the notable finding that the
      tool independently rediscovered the known `sánchez` pair AND found
      2 new candidates of a different mismatch class (multi-word surname)
- [x] 823/0 smoke throughout
- [x] Outbox written
