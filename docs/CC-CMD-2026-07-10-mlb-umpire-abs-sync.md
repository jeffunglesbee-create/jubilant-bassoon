# Claude Code Command — MLB Umpire ABS Ratings: Wire Weekly Data to Live Constant

**Date:** 2026-07-10 (revised 2026-07-11 — see TASK 0)
**Repo:** jeffunglesbee-create/jubilant-bassoon (client-side change; TASK 0 requires reading field-relay-nba too)
**Scope:** `UMPIRE_ABS_RATINGS` in index.html is frozen at May 27 launch data. A real weekly pipeline already refreshes fresher data into `outbox/mlb/umpire_abs.json` but nothing propagates it into the constant that actually ships.
**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-mlb-umpire-abs-sync-2026-07-10.md.

## TASK 0 — READ FIRST: a second write path to UMPIRE_ABS_RATINGS was found, must be resolved before TASK 2

The original version of this CC-CMD was scoped "client only" based on an investigation done before relay read access existed. That scoping was wrong. `mlbStatsInit()` (index.html ~line 8282) already calls `/mlb-umpire-scrape` on every page load and patches `UMPIRE_ABS_RATINGS` directly, client-side:

```js
Object.entries(ud).forEach(([k,v]) => {
  const existing = UMPIRE_ABS_RATINGS[k];
  UMPIRE_ABS_RATINGS[k] = { ...v, weakness: v.weakness ?? existing?.weakness ?? null };
});
```

`/mlb-umpire-scrape` (field-relay-nba) is a Savant HTML scraper — the code's own comments describe it as "Always fresh at page load," but this almost certainly maps to the same Savant-blocks-Cloudflare-Worker-IPs issue that motivated the original pivot to Statcast CSV parsing in the first place. The whole block is wrapped in try/catch with no logging on failure, so if it's silently 502ing (consistent with earlier DevTools evidence this session), it explains why the constant stayed frozen — not "nothing tries," but "something tries every load and fails invisibly."

**This must be resolved, not ignored, before TASK 2 builds anything:**
1. Check field-relay-nba's `/mlb-umpire-scrape` route directly (live request) — does it currently return `ok`/valid data, or fail (502, empty, error)? Get a real, current answer.
2. If it's genuinely broken: decide and document whether to (a) leave the client-side scrape-and-patch code in place as inert dead weight (low risk, but confusing to future readers), or (b) remove/disable it as part of this same CC-CMD, since a build-time-baked constant plus a silently-failing runtime patch attempt is worse than just the constant alone. Prefer (b) if the failure is confirmed stable, but state the reasoning either way — this is a real decision, not a formality.
3. If it's NOT broken (working, just using stale/different data): this is a more serious conflict — two live writers to the same constant, using different weakness taxonomies (old: `low`/`high`/`outside`/`null`; new: `down-right`/`down-left`/`left`, etc.). A working runtime patch could silently overwrite the fresher build-time data on every page load. In this case, TASK 2 must also either disable the client-side patch or make it a genuine no-op once the build-time data is fresher — do not ship TASK 2 leaving two active, conflicting writers in place.

Report the actual finding and the decision made, explicitly, in the outbox — this is not optional context, it changes what TASK 2 needs to do.

## CONTEXT — independently verified this session, re-verify from HEAD before building

- `UMPIRE_ABS_RATINGS` (index.html, currently ~line 7394) has been touched in exactly 3 commits, all 2026-05-27 (`b22f4102`, `493b8d48`, `bef6b282`) — confirmed via `git log -G"UMPIRE_ABS_RATINGS" -- index.html`. Zero updates in 44+ days via *commits* — TASK 0 covers the separate runtime-patch path.
- `.github/workflows/mlb-weekly-update.yml` already runs `scripts/mlb-weekly-update.py` every Monday 6am ET (cron `0 11 * * 1`) + on `workflow_dispatch`, and commits real output to `outbox/mlb/`. Last real run: 2026-07-06, commit `f037ad1d`. This part works correctly today — do not rebuild it.
- The script writes `outbox/mlb/umpire_abs.json`, shape: `{updated, source, processed_game_pks, data: {lastname: {challenged, overturned, rate, fullName, weakness, zones: {zoneId: {challenged, overturned}}}}}`. 48 umpires present as of the 2026-07-06 run — more than the hardcoded table's 22.
- `getUmpireABSRating()` has 5 real callers (index.html ~8043, ~8073, ~19492, ~19924, ~31207) plus `getRegressionAlert()` at ~7996 — this is live, wired, user-facing. This is not dead code; it's stale-data code.
- `.weakness` is used in exactly 4 places, all as a truthy-check + free-text interpolation (`` `weak: ${d.weakness} zone` ``) — never an exact-value comparison. The new JSON's weakness taxonomy differs from the old hardcoded table's — confirmed safe to adopt directly, no consumer breaks, independent of the TASK 0 question.
- **Known, real gap — do not silently drop:** the old table has a `pitchesCalled` field (referenced at index.html ~7902) that has no equivalent anywhere in the new JSON (Statcast ABS tracking counts challenges, not total pitches called). Confirm the one read site's actual behavior with `pitchesCalled: undefined` before deciding whether to drop the field, backfill it from a different source, or flag as a separate follow-up — do not guess.
- **Genuinely separate, do not touch:** `mlb-umpire-zone-backfill.yml` is a one-time, `workflow_dispatch`-only job for backfilling `zones`/`weakness` on games before the July 1 zone-tracking feature. Out of scope here.

## TASK 1 — Probe current deploy-gate behavior for index.html data-only changes

Before writing the generator, confirm whether a commit that only changes `UMPIRE_ABS_RATINGS`'s literal values needs a SW_VERSION bump to actually deploy, or whether existing deploy-gate trigger paths pick up any index.html change regardless. Check `.github/workflows/deploy-gate.yml`'s trigger paths directly — report the real answer, don't assume.

## TASK 2 — Wire the sync into the existing weekly workflow (informed by TASK 0's decision)

Add a new step to `.github/workflows/mlb-weekly-update.yml`, after the existing `Download Savant CSVs and process into JSON` step and before `Commit updated tables`, that:

1. Reads `outbox/mlb/umpire_abs.json`.
2. Regenerates the `UMPIRE_ABS_RATINGS` object literal in index.html from it — keyed by the same lowercase-lastname convention, fields `{challenged, overturned, rate, weakness}` at minimum (resolve `pitchesCalled` per its own investigation above).
3. Writes the updated index.html back in place, preserving everything outside the `UMPIRE_ABS_RATINGS` block byte-identical.
4. If TASK 1 found a version bump is required: bump SW_VERSION as part of this same step.
5. Apply TASK 0's decision: if the client-side scrape-patch is being disabled, do that in this same commit, not a follow-up.

Extend the existing commit step to include `index.html`/`sw.js` alongside `outbox/mlb/` in the same commit — keep this atomic.

## VERIFICATION

- Run the new step locally against the real `outbox/mlb/umpire_abs.json` already in the repo and confirm the regenerated block parses as valid JS, entry count matches.
- Confirm `getUmpireABSRating()`'s 5 real call sites still resolve correctly against at least 3 real umpire names present in the new data.
- Confirm the rest of index.html is untouched outside the `UMPIRE_ABS_RATINGS` block, SW_VERSION/sw.js, and (if applicable) the TASK 0 client-patch change.
- If TASK 0 disabled the client-side scrape-patch: confirm `mlbStatsInit()` no longer silently attempts it, and that this doesn't break the other 5 tables the same function loads.
- `node smoke.js` clean.

## DONE CONDITION

`UMPIRE_ABS_RATINGS` is generated from `outbox/mlb/umpire_abs.json` as part of the existing weekly job, verified against real current data, smoke clean, deployable. TASK 0's conflict is explicitly resolved, not left as two active writers. Confidence ≥ 95.

**Confidence scoring:**
- TASK 0 conflict genuinely investigated (live check on /mlb-umpire-scrape) and explicitly resolved, not skipped (20 pts)
- TASK 1 deploy-gate question genuinely answered from source (15 pts)
- Generator produces valid, verified output against real current JSON (25 pts)
- Byte-identical diff outside the regenerated block (and TASK 0's change if applicable) (20 pts)
- `pitchesCalled` gap explicitly resolved (10 pts)
- smoke.js clean (10 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.