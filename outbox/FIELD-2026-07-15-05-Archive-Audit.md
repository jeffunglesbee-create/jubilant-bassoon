# FIELD — Archive-Path Audit & Data-Loss Recovery, 2026-07-15

**Status: Complete. Real data-loss incident found and repaired. Preventive fix shipped at an honest 89/100 with an explicit user override for the one piece that couldn't be live-verified in-session.**

## Background

A real, external audit finding (via chat, verified directly against the repo before acting): `archiveBrief()`/`_archiveBrief()` sit behind empty catches, so archive-write failures are invisible. A new AST-based tool (`scripts/audit-silent-catches.js`) was built to find the full cluster rather than eyeballing more grep hits — scoped precisely to the `/archive/` URL-path pattern (a bare "archive" search had pulled in unrelated functions and overstated the finding on a first pass).

**Preliminary scope, confirmed:** 16 real archive-touching functions, 45 catch sites, 40 silent — an 89% silent-catch rate on the system every archive write goes through.

## 1. The real structural audit (field-relay-nba, no code changed this session)

A Python `tree_sitter` script structurally audited every `ARCHIVE_DB` write path: every `/archive/*` route guard, every `ARCHIVE_DB.prepare()` call with its SQL verb/table/enclosing function, every internal fetch touching `/archive/`. Two bugs in the tool itself found and fixed by re-reading its own "unresolved" output and noticing it looked wrong.

**Output:** 19 distinct `/archive/*` routes, 206 `ARCHIVE_DB.prepare()` calls, categorized.

**The finding that mattered:** the same-day WC26 label-fragmentation fix normalized `briefs.sport` but never backfilled `regular_season_games.sport`/`postseason_games.sport`. Backfilled live on explicit approval: 101 rows in `regular_season_games`, 0 in `postseason_games`. Verified: the live, in-progress England vs Argentina row was confirmed untouched.

## 2. Brief-coverage investigation — the real incident

A real join between finalized WC26 games and `briefs` (not an assumption of completeness) found **8 finalized WC26 games with no corresponding brief row at all** — real data loss, clustered in the tournament's opening week (June 11-19).

**Root cause, traced structurally, not guessed:** `writeWCResult` (the function that enqueues a WC26 brief job) is called from exactly 2 sites, both inside the `/v2/games?sport=wc26` ESPN-adapter route, gated on finding final games in that response. **Brief generation is request-triggered, not cron-scheduled** — it only fires when a client actually requests that specific date after the games went final. For the 8 missing games, nothing had. Also confirmed: `JOURNALISM_QUEUE` has no dead-letter queue — after 3 failed attempts a message is acked and silently dropped, zero forensic trail.

## 3. Fix — live regeneration through the real, unmodified pipeline

Re-triggered the real `/v2/games?sport=wc26&date=X` route for the 5 dates spanning the 8 games. Round 1: 7 of 8 succeeded. 

**A genuine, self-caught verification bug:** the first coverage-check used an exact `game_id` match and found 3 "still missing" — wrong. WC26 games carry a prefixed id (`espn:760424`) from the `cron`-sourced write, but a separate KV-sweep process later copies the same brief into `briefs` a second time with the *bare* id (`760424`, `kv_sweep` source) — so one success produces two rows with different `game_id` shapes. The exact-match query only ever caught one shape. Caught by inspecting a real raw ESPN-adapted game object directly, not by trusting the negative query result — re-queried with `LIKE` instead.

Round 2/3: only one genuine repeat failure (760429, Saudi Arabia vs Uruguay) — investigated structurally against its successful same-date sibling before retrying blindly, found no structural difference (consistent with a transient failure in an individually-try/caught external call, not a deterministic bug). Succeeded on the third retry.

**Final, independently-verified state: all 8 games now have both a `cron`-sourced and `kv_sweep`-sourced row — 16 rows total, 8/8 covered.** This chat independently re-confirmed 3 of the 8 (including the genuine repeat-failure case) directly against D1 — every game ID and timestamp matched exactly.

**Disclosed cost tradeoff:** because KV caches for the affected dates had expired, every retriggered date redundantly regenerated briefs for already-covered sibling games too — an accepted, explicit tradeoff of using the real pipeline rather than a targeted single-game trigger (which doesn't exist as a route).

## 4. Preventive fix — closing both structural gaps (89/100, shipped on explicit override)

Two gaps disclosed but not fixed in the investigation above became their own CC-CMD:

**Gap 1 — no failure visibility.** The `game-brief` queue route silently drops messages after 3 failed retries; the sibling `jobId` route already writes a KV failure marker. Fixed: a new, *separate* KV key (`brief:game:{eventId}:failed`) — deliberately not overwriting the existing `brief:game:{eventId}` key, since a later failed retry could otherwise destroy a previously-successful brief from an earlier valid game state. 17 forced-condition tests including retry counts past `max_retries` (Cloudflare Queues can occasionally redeliver). Fully verified, 25/25.

**Gap 2 — no fallback for games nobody re-requests.** Added `pickWC26BriefGaps`, wired into `handleJournalismCycle`'s existing dead-hours cron block (no new cron entry, `wrangler.toml` confirmed untouched via empty diff). Capped at 3 gaps/tick. A group cross-check (comparing derived group vs. known `group_id` before filing) tested against all 81 real group-stage games played so far — 0 mismatches, with a real, honestly-disclosed edge case in the underlying team-name map (a hyphenated name that isn't a direct key, but always resolves correctly via the opponent's name in every real case checked).

**The honest 89/100:** TASK 1a fully verified. TASK 1b's logic thoroughly verified (104 total forced/cross-check assertions) but its actual live cron-firing could not be observed in-session — the sweep only runs during UTC 02:00-10:00 dead hours, and the dispatch happened at ~21:40 live hours. Two ways to force a live test were considered and correctly rejected as out of scope (adding an unrequested bypass mechanism; writing a synthetic row into a table not on the query allowlist). The gap was disclosed *before* the commit decision, not after — the user was given real options via `AskUserQuestion` (commit now, wait ~4 hours, discard, split the diff) and chose to commit now, an informed, traceable override, not a silent one.

**Independently verified by this chat:** `wrangler.toml` diff genuinely empty; the new failure-marker key exists exactly as described, with the code's own comment matching the outbox's stated reasoning; `pickWC26BriefGaps` exists and is genuinely called with `limit=3`; syntax clean.

## Bonus finding along the way

`wc_results` (a separate D1 binding, `WC2026_DB`) carries two parallel row sets per match — legacy `football:{id}` rows from an earlier API-Sports-based writer, and current `espn:{id}` rows from the ESPN pipeline. Correctly identified as relevant only via the `espn:` filter, not a bug, but worth knowing for anyone querying that table directly in the future.
