# CC-CMD-2026-08-06-wire-efl-cup — Result

## Status: SATISFIED. Every task was completed on 2026-08-08, before this doc existed.

This CC-CMD was carried out under a differently-named CC-CMD
(`CC-CMD-2026-08-08-efl-carabao-cup-coverage`, which covered both the
relay and the client halves), so it produced no outbox file matching
its own name and read as un-executed when the open CC-CMDs were swept
on 2026-08-08. It is closed here against its own tasks rather than
re-run — re-executing it would re-add an entry that already exists.

## Task-by-task, against what actually shipped

**Task 1 — re-verify from HEAD.** Done, and it changed the plan in two
ways this doc could not have anticipated:

- The host in this doc, `site.api.espn.com`, **403s Cloudflare Worker
  egress**. That was found the same day as a P0
  (`CC-CMD-2026-08-08-espn-site-api-403-p0`) and fixed by re-pointing
  the relay at `site.web.api.espn.com`. Had this CC-CMD been executed
  literally against the host it names, the wiring would have returned
  502 for every request. Rule 72 earned its keep here.
- `SOCCER_LEAGUES` **is** separately required — the doc's open question.
  Its own comment records that V2/FD only overlay scores onto cards that
  already exist, so `LEAGUES` alone creates zero cards.

Slug re-probed rather than trusted: `eng.league_cup`, ESPN id `3920`,
`English Carabao Cup`.

**Task 2 — add the league entry.** Shipped in both repos:
- relay `0b779d7`: `V2_LEAGUES.eflcup` → `espnLeague: 'eng.league_cup'`,
  `SOCCER_LEAGUE_LABELS.eflcup = 'EFL Cup'`, and the journalism-cron
  `LEAGUES` row.
- client `228284e1`: `{ league: 'eng.league_cup', section: 'EFL Cup',
  bundle: 'EFL', leagueLabel: 'EFL Cup' }` in `SOCCER_LEAGUES`.

On the doc's "EFL Cup or Carabao Cup" question: **`EFL Cup`**, chosen
deliberately. The label persists into the archive `sport` column and
leads the archive id, and this competition has been the Milk /
Rumbelows / Coca-Cola / Worthington / Carling / Capital One / Carabao
Cup. A sponsor rename under the sponsored label would fragment archive
ids exactly as `CC-CMD-2026-07-15-wc-label-fragmentation` had to clean
up for WC26. It also matches the existing EFL family labels.

No `groups=` or extra query parameter was added, per the doc's
instruction.

**Task 3 — real verification.**
- smoke: 965 passed, 0 failed.
- Relay live: `/v2/games?sport=eflcup&date=2026-08-08` → HTTP 200,
  `"league":"EFL Cup"`, Cambridge United 2-1 Barnet (final) with full
  `matchEvents` and `"streams":[{"label":"Paramount+"}]`.
- Client live: `eng.league_cup` and `"EFL Cup"` both present in the
  deployed bundle, via `live-deploy-verify-probe.yml`. That string
  exists nowhere but the new entry.

## One behaviour worth recording for the next cup

ESPN does not publish round N+1 ties until round N resolves — the
Aug 26–Sep 2 window returned `events: []` while Round 1 was still being
played. An empty result for a future round is **correct** for this
competition, not a fault. Anything that treats empty as an error will
misfire here.

## Follow-on, already handled

`eng.trophy` (EFL Trophy, id 18481) shipped 2026-08-08 on this same
pattern. `eng.fa` (FA Cup, id 3918) is blocked on ESPN not having rolled
that competition over to 2026-27 at all — its league season object still
reports `year: 2025, type: "Final"` — and has its own CC-CMD with an
explicit unblock probe: `docs/CC-CMD-2026-08-08-fa-cup-coverage.md` in
field-relay-nba.

## Confidence gate

**97.** Closed against its own tasks rather than re-run, with live artifacts from both halves already in hand. Not higher because two of its premises were false when written -- the host it names 403s Worker egress, and it left open whether SOCCER_LEAGUES was separately required -- so this doc records a task satisfied by different work than it specified, not a clean execution of it.

*(Backfilled 2026-08-09. Stated in session at execution time but never written into this doc. Chat is ephemeral; this file is the record, and a gate that exists only in scrollback is not a gate.)*
