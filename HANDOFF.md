# FIELD HANDOFF

## Session: 2026-06-30 · MLS Full Stack (Part 8: AVV-MLS Verified in Real CI)

**CLIENT HEAD: 418e1d4f** (+ auto codemap refresh on top)
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: 1a2d7696** (unchanged — all work this part was client-side)
**SMOKE: 807/0** (confirmed via full clone + local run, then live CI)

---

## THIS SESSION — VERIFIED END TO END

### AVV-MLS: CC executed it, I independently verified all of it

CC ran the consolidated avv-mls.md CC-CMD (commit 3ae21de), correctly
deviating from my draft fixture shape after tracing the real
`allData.sports`/`fetchSupplemental` merge pipeline — used a flat game
shape instead of ESPN-nested, kept fixture injection and test assertions
internally consistent (substring match on 'MLS Soccer', not strict
equality on 'mls'). Good engineering. CC reported all 5 tests "STAGED for
CI" because its sandbox blocks `*.workers.dev` from both bash and
Chromium — genuinely couldn't verify locally.

Verification chain, not trusted on report alone:
1. Replicated AVV-MLS-002/003/004/005's exact assertion logic directly
   against the live relay (I have `*.workers.dev` access) — all 4 passed
   with real data before any CI ran.
2. Found a real regression: `git log` showed "Smoke Test + Live Verify"
   failing on my own subsequent commit. Root cause traced via full git
   clone + local smoke.js run: my own HANDOFF.md write (011dc283)
   reintroduced A704's case bug (`SMOKE` vs `Smoke`) that CC had already
   fixed in 3ae21de — I overwrote CC's fix without knowing it was there.
   Confirmed via genuine full clone: 806 passed, 1 failed (A704 only —
   every other apparent failure from my earlier partial-file local test
   was an artifact of incomplete copying, not real).
3. Fixed (commit 418e1d4f), confirmed 807/0 locally before pushing,
   confirmed again via live "Smoke Test + Live Verify" CI run (all jobs
   green: static smoke, live smoke, viewport Layer 1, Playwright Layer 3).
4. Found `adapter-visible-value.yml` (the dedicated AVV CI workflow) hadn't
   run since June 29 — neither CC nor the general smoke pipeline had
   triggered it. Dispatched it directly. Downloaded the actual log text
   (not just conclusion status): all 5 AVV-MLS tests produced their
   DEFINITIVE lines with real data, 14/14 passed in 48.4s, real Chromium,
   real network, real relay responses.

### Cleanup

`claude/elegant-shannon-t2dvt0` branch reappeared (same name as the one
deleted earlier this session, zero unique commits this time too) —
deleted again. `cloudflare/workers-autoconfig` noted but left alone
(3693 commits behind, unrelated to anything this session touched).

---

## CC-CMDS QUEUED — NEXT SESSION

**#1 (field-relay-nba):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-relay.md. Execute all
tasks. Nothing commits without confidence ≥ 95. Do not include [skip ci]."

**#2 (jubilant-bassoon, after #1 ships and deploys):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-client.md. Confirm the
Part B dependency check before starting Part B."

**#3 (separate scope, not urgent):**
identity-resolver MLS club-ID mapping (name → MLS-CLU-xxxxxx) to unblock
buildSoccerSeasonFormContext.

AVV-MLS is genuinely DONE — verified in real CI, not staged, not
self-reported. Remove from queue.

---

## CONSISTENCY ITEMS OUTSTANDING (standing approval)

- postseason_games round vocabulary normalization
- European club coverage in identity-resolver before August
- Two-legged tie game_number=2 — stats-api-sourced ties have no aggregate
  field, flagged in round-label split docs
- **Process note:** when chat writes HANDOFF.md or other shared docs in a
  window where a CC session may also be writing to the same repo, check
  `git log` for what CC actually changed before overwriting — don't
  assume chat's last-known content is still current.

---

## PRIORITY LIST

### 🔧 CC-CMDs (in order)
1. CC-CMD-2026-06-30-round-label-relay.md (field-relay-nba)
2. CC-CMD-2026-06-30-round-label-client.md (jubilant-bassoon, after #1)
3. identity-resolver MLS club-ID mapping (new spec needed)

### 🔨 INFRASTRUCTURE
4. Bosnia DB fix + identity-resolver CANONICAL map
5. team_form CONTEXT_SOURCE v3
6. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
7. wentToOT hardcoded false
8. KV editorial keys not consulted
9. NFL SPORT_TO_V2 — September 9
10. Odds Daily Counter stale
11. night_stars phase degraded

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon
- AVV-MLS proof fixture: STL 3-0 ATX, event 761644, 2026-05-23

SESSION END: RELAY 1a2d7696 · CLIENT 418e1d4f · 2026-06-30 · AVV-MLS verified 14/14 in real CI, A704 regression found+fixed · via chat
