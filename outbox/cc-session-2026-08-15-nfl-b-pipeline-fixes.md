# CC session — NFL-B pipeline published an empty table and mislabelled the season

**Date:** 2026-08-15
**Repo:** jubilant-bassoon (paired with field-relay-nba — see below)
**Branch:** main throughout — confirmed `git branch --show-current` = `main`
**Commits:** `317f9cb` (this repo), `680ac26` + `2e5f4d8` (field-relay-nba)
**Verification run:** `nfl-ngs-update.yml` run 31852365822 — **success**, commit `35a555f`

## What was wrong

Found while reading the NFL Drive docs against the actual repos. All three defects
were visible in run 31369508254 (2026-08-10), which reported **"4/4 succeeded"**.

1. **The injuries table was published empty.** `injuries_{year}.parquet` is a
   PER-YEAR file; in August the new season has not been played, so
   `injuries_2026.parquet` 404s. The builder caught the error, returned `{}`, and
   `main()` wrote it to R2 *and* the repo — over a populated table:

   ```
   → Fetching injuries_2026.parquet ...
     ⚠️  Could not fetch injuries_2026: HTTP Error 404: Not Found
     ✅ R2 OK → nfl/2026/nfl-injuries.json
   nfl-injuries: ✅ 0 players
   ```

   The three NGS builders never hit this because they read a **combined** parquet
   (all seasons in one file) and select `max_season` — they degrade to the newest
   season that exists. Same script, two strategies, only one of them safe.

2. **Nothing refused a zero-row write.** The relay had already learned this lesson
   for MLB Savant (`field-relay-nba 7588b24`, "never overwrite an R2 analytics
   table with an empty payload"); the NFL path never got the guard.

3. **The envelope said 2026 while the rows said 2025.** `"season": year` stamped
   the *requested* year over data selected independently by `max_season`:

   ```
   envelope season : 2026
   row season      : 2025   (Caleb Williams, CHI, cpoe -6.875)
   ```

Worth recording: **NFL.com does exactly the same thing** — its team-stats page is
titled "NFL 2026 REG" while its season dropdown has 2025 selected and the table
shows completed-season totals (measured from a saved copy of the page). So the
league-year/season-played ambiguity is industry-wide. That is a reason to be
explicit here, not a reason to copy it — and it is a trap for anyone "validating"
our label against theirs.

## The fixes (`317f9cb`)

- `build_injuries(year, max_lookback=3)` walks back to the most recent season that
  actually publishes, and **returns the season it used** rather than letting the
  caller assume.
- `emit()` refuses to write a zero-row table, in both R2 and outbox, and records
  the refusal as a failure.
- The envelope now carries `season` (the data's real season, derived from the rows
  via `data_season()`) and `targetYear` (what the run asked for) as **separate,
  explicitly named fields**, so they cannot be conflated again.
- **The job now exits non-zero if ANY table fails**, not only if all four do.
  `succeeded == 0` was too coarse a tripwire — it fires only when the pipeline is
  completely dead, which is the one case somebody would notice anyway. That is why
  an empty injuries table sat unnoticed from Aug 10 to Aug 14.

## Verification

**Unit tests, local, before push** — 10 assertions, all passing: season derivation
(rows carrying 2025 under a 2026 target, mixed rows, missing `season` key, empty
dict), the guard refusing an empty payload and writing no file, and the envelope
separating `season` from `targetYear`.

**Live run 31852365822** — the done condition:

```
ngs-passing:   ✅ 65 players
ngs-receiving: ✅ 212 players
ngs-rushing:   ✅ 81 players
nfl-injuries:  ✅ 1453 players     ← was 0
```

Committed artifacts:

```
nfl-injuries: season=2025 targetYear=2026 rows=1453 bytes=185,396   (was 107 bytes, {})
ngs-passing:  season=2025 targetYear=2026 rows=65   bytes=15,686
```

Injuries went from an empty object to a full season of weekly reports; both
envelopes now name the data's season and the requested year separately.

## Cross-repo (Rule 70) — a collision found mid-fix

`nfl/{year}/ngs-passing.json` has **two independent writers**: this pipeline
(Mondays, from the parquet) and the relay's `runNFLR2Update` (Wednesdays, from the
legacy CSV, `field-relay-nba/src/nfl-r2.js`). Neither knows about the other and
**Wednesday runs last**, so the relay would have stripped the `season`/`targetYear`
fields off this fix every week.

Patched same-session in `2e5f4d8` so both envelopes agree, plus the same empty-write
guard on the relay side. That is a stopgap — two writers racing for one key is the
real defect, gated in
`field-relay-nba/docs/CC-CMD-2026-08-15-ngs-passing-two-writers.md` along with the
relay's hardcoded `nfl/2026/` prefix, which will diverge from the dynamically
computed read year in August 2027.

Also shipped: `680ac26` adds `ngs-passing.json` to `NFLVERSE_OUT_ALLOWED` — it was
in the R2-first list but not the fallback list, so unlike its two siblings it had
no GitHub-raw path and was one failed weekly update away from 403ing alone.

## Confidence gate

**Score: 97 / 100.** Above the 95 threshold; committed.

- Every defect was measured from a real run log before it was touched, not inferred.
- The fix was unit-tested locally, then proven end-to-end on a live run with a
  before/after artifact (0 → 1,453 rows; 107 → 185,396 bytes).
- The cross-repo collision was found by reading the other repo's writer rather than
  assuming this pipeline owned its key — and would have silently undone fix #3.

3 points withheld: the empty-write guard has not been *observed* firing in
production (nothing is empty now — it is unit-tested only), and the two-writer
collision is patched rather than resolved.

## Rule compliance

- **Rule 62** — the injuries fallback copies the NGS builders' existing
  max-available-season strategy rather than inventing a new one.
- **Rule 69** — the relay-side edit is not scope creep: fix #3 does not survive the
  next Wednesday without it (a direct dependency).
- **Rule 5** — three commits, one concern each.
- **Rule 66** — `py_compile` clean, `node --check` clean on both relay files.
