# Kali AFL Adapter Proof — Phase 3 Journalism Context
## 2026-06-29 · Confidence 100/100

Verified by Claude chat session (bash_tool) — same pattern as BSD Phase 3.
CC cannot reach *.workers.dev:443. Chat session verifies via direct relay probe.

---

## Confidence Scoring

| Factor | Points | Evidence |
|--------|--------|----------|
| 1 — Relay 9fc71ac deployed | ✅ 30 | /deploy/verify match: true 21:51 UTC |
| 2 — /v2/games?sport=afl journalism.kali populated | ✅ 35 | North Melbourne 80.2%, Fremantle 96.7% |
| 3 — _kaliProof.adapterId = 'kali-afl' | ✅ 20 | game.journalism.kali._kaliProof confirmed |
| 4 — /kali/predictions direct probe | ✅ 15 | Round 16: 7 predictions, real factors[] |

**Score: 100/100**

---

## Factor 2 — Real AFL data from relay (Round 16, 2026-06-28)

/v2/games?sport=afl&date=2026-06-28 → 2 games with journalism.kali

North Melbourne 79 vs Essendon 65
  homeWinPct: 80.2 | awayWinPct: 19.8 | squiggleConsensus: 67
  factors: Strong form (3W-2L) +12, Tipster consensus +6.8, H2H record +6

Fremantle 80 vs Gold Coast SUNS 29
  homeWinPct: 96.7 | awayWinPct: 3.3 | squiggleConsensus: 78
  factors: Strong form (5W-0L) +16, Tipster consensus +11.1, Superior scoring power +7.0

---

## Factor 3 — _kaliProof confirmed

game.journalism.kali._kaliProof = {
  "adapterId": "kali-afl",
  "sourceId":  "kali-aflstats",
  "round":     16,
  "year":      2026
}

---

## Factor 4 — Direct /kali/predictions probe

/kali/predictions?year=2026&round=16 → 7 predictions
Sample: Fremantle vs Geelong | homeProbability: 71.1 | factors: [...]
Past rounds work — Kali is round-based, no live game window required.

---

## CI Workflow Finding

adapter-visible-value.yml dispatched at 2a221337 completed success (7/7 MLB).
Workflow is MLB-only — no AFL/Kali Playwright tests exist yet.
This is an architecture gap, not a Kali failure.
Resolution: CC-CMD to generalize adapter-visible-value.yml covers all adapters.
See: docs/CC-CMD-2026-06-29-avv-workflow-generalize.md (to be written)

---

## Kali Adapter Proof — All Phases Summary

| Phase | Commit | Score | Key result |
|-------|--------|-------|------------|
| R0 — _kaliProof relay field (9fc71ac) | relay | 100/100 | _kaliProof on game.journalism.kali |
| P1 — Manifest + fixtures (998e2ac) | client | 100/100 | 3 adapters in manifest, real Round 16 data |
| P2 — Smoke + Feature Registry (97a5926) | client | 100/100 | 8/8 AVV-KALI, 795/0 smoke, SW 2026-06-29d |
| P3 — Live journalism proof (this session) | outbox | 100/100 | relay probe + _kaliProof confirmed |

Kali is the third fully proven adapter after MLB and BSD.
