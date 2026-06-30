# FIELD HANDOFF

## Session: 2026-06-30 · MLS Full Stack (Part 9: Round-Label Relay Shipped)

**CLIENT HEAD: dd419c87** (jubilant-bassoon)
**RELAY HEAD: f4c5fba9** (field-relay-nba, CONTRACTS.md sync — code at 5911f0b5)
**SW_VERSION: 2026-06-30a**
**SMOKE: 807/0**

---

## THIS SESSION — SHIPPED + VERIFIED

### round-label-relay.md: executed by CC, independently re-verified, real data

CC found the doc correctly this time (file-placement fix from the prior
session worked — relay-scoped CC-CMD was actually in field-relay-nba where
CC opens its sessions). Shipped relay commit `5911f0b5`, deployed
successfully (confirmed via Deploy RELAY Worker run, not just CC's
self-report). CC correctly followed the new network-constraint instruction
— didn't try to route around the sandbox block, marked Task 4 STAGED and
explicitly handed live verification to chat.

Verified all three tasks by reading the actual deployed source and
querying live data, not trusting the summary:
- Task 1: `adaptESPNWCSoccer` round field confirmed at the exact line
  CC claimed (1328), WC26 BSD block at line 3040 confirmed untouched.
- Task 2a: `/soccer/xg` series extraction confirmed at line 10449,
  exact shape match.
- Task 2b: conditional second-leg pre-filter confirmed at line 3078,
  exact regex match.
- Task 4 (live verification, run by chat): no live games today across
  any club league (genuinely off-season June 30) — used a past UCL
  Round-of-16 date instead, same approach as the AVV-MLS verification.
  Real result: `round: "2nd Leg - Arsenal advance 3-1 on aggregate"`,
  `series: {leg:2, totalLegs:2, completed:true, homeAggregate:3,
  awayAggregate:1, otherLegEventId:"401862578"}` — confirmed across 7
  real ties (Arsenal, Sporting CP, PSG, Real Madrid, Barcelona, Bayern,
  Liverpool, Atlético). N+1 avoidance confirmed empirically: a same-day
  EPL slate with no leg notes triggered zero extra fetches.

### CONTRACTS.md updated: queued → SHIPPED, both repos

`game.round` and `_series`/`game.series` entries updated with the real
verified example data above, in place of the "queued, not yet shipped"
placeholder language from when these were first registered.

---

## CC-CMDS QUEUED — NEXT SESSION

**#1 (jubilant-bassoon — client-side round badge, now unblocked):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-client.md. Confirm the
Part B dependency check before starting Part B (relay has shipped —
check should now pass). Nothing commits without confidence ≥ 95."

**#2 (separate scope, not urgent):**
identity-resolver MLS club-ID mapping (name → MLS-CLU-xxxxxx) to unblock
buildSoccerSeasonFormContext.

---

## CONSISTENCY ITEMS OUTSTANDING (standing approval)

- postseason_games round vocabulary normalization
- European club coverage in identity-resolver before August
- Two-legged tie game_number=2 — stats-api-sourced ties (TELUS) have no
  aggregate field; ESPN-sourced ties (just shipped) do, via `_series`

---

## PRIORITY LIST

### 🔧 CC-CMDs
1. CC-CMD-2026-06-30-round-label-client.md (jubilant-bassoon)
2. identity-resolver MLS club-ID mapping (new spec needed)

### 🔨 INFRASTRUCTURE
3. Bosnia DB fix + identity-resolver CANONICAL map
4. team_form CONTEXT_SOURCE v3
5. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
6. wentToOT hardcoded false
7. KV editorial keys not consulted
8. NFL SPORT_TO_V2 — September 9
9. Odds Daily Counter stale
10. night_stars phase degraded

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon
- Round-label verified reference tie: Arsenal v Bayer Leverkusen, UCL R16,
  events 401862578 (1st leg)/401862581 (2nd leg)

SESSION END: RELAY f4c5fba9 (code 5911f0b5) · CLIENT dd419c87 · 2026-06-30 · round-label-relay shipped + verified with real UCL data, CONTRACTS.md updated · via chat
