# CC-CMD — Kali AFL Adapter Proof Phase 3: Live Journalism Context

**Date:** 2026-06-29
**Repo:** field-relay-nba (READ ONLY probe) + jubilant-bassoon (outbox commit)
**Scope:** Prove game.journalism.kali populates on real AFL games — past round OK
**Why:** Kali is round-based (not live-window-dependent). Past rounds work.
         Use Round 16 (2026-06-28) which is confirmed working from prior probes.
**Target time:** 20 min
**Confidence gate: 95**

---

## ENVIRONMENT CONSTRAINT

*.workers.dev blocked from CC egress. Verify via GitHub Actions CI OR report
findings from relay probe routes that are accessible from CC environment.

If CI is needed: trigger workflow_dispatch on an existing workflow that
can reach the relay, or use the same pattern as BSD Phase 3 (chat session verifies).

---

## DONE CONDITION

`outbox/kali-journalism-proof-2026-06-29.md` committed with:
- `/v2/games?sport=afl&date=2026-06-28` response showing `journalism.kali` populated
- At least one game with `homeWinPct`, `awayWinPct`, `factors[]` set
- `factors[0].label` is a human-readable string (not null or undefined)
- Confidence ≥ 95

---

## PHASE A: Verify relay state

```bash
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/deploy/verify
```

Expected: `deployed: 01b4056` (or later), `match: true`

---

## PHASE B: Probe past round journalism

```bash
# Round 16 is confirmed — probe via relay
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=afl&date=2026-06-28" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
games = d.get('games', [])
print(f'Games: {len(games)}')
for g in games:
    j = g.get('journalism', {})
    kali = j.get('kali', {})
    print(f'{g[\"home\"][\"name\"]} vs {g[\"away\"][\"name\"]}')
    print(f'  homeWinPct: {kali.get(\"homeWinPct\")} awayWinPct: {kali.get(\"awayWinPct\")}')
    print(f'  squiggleConsensus: {kali.get(\"squiggleConsensus\")}')
    print(f'  factors: {kali.get(\"factors\", [])}')
    print()
"
```

**Expected output:**
```
Games: 2
North Melbourne vs Essendon
  homeWinPct: 80.2 awayWinPct: 19.8
  squiggleConsensus: 67
  factors: [{'team': 'home', 'label': 'Strong form (3W-2L)', 'impact': 12}, ...]
```

---

## PHASE C: Also probe /kali/predictions directly

```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/kali/predictions?year=2026&round=16" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
preds = d.get('data', [])
print(f'Predictions: {len(preds)}')
if preds:
    p = preds[0]
    print(f'{p.get(\"homeTeam\")} vs {p.get(\"awayTeam\")}')
    print(f'  homeProbability: {p.get(\"homeProbability\")}')
    print(f'  factors: {p.get(\"factors\", [])}')
"
```

---

## CONFIDENCE SCORING

```python
score = 0
factors = []

# Factor 1: Relay deployed 01b4056+ (30 pts)
relay_ok = True  # from /deploy/verify
score += 30 if relay_ok else 0
factors.append(f'Relay deployed: {relay_ok}')

# Factor 2: /v2/games?sport=afl returns games with journalism (35 pts)
has_journalism = True  # from Phase B — set True if journalism.kali present
score += 35 if has_journalism else 0
factors.append(f'journalism.kali populated: {has_journalism}')

# Factor 3: factors[] has real labels (20 pts)
has_factors = True  # set True if factors[0].label is a non-empty string
score += 20 if has_factors else 0
factors.append(f'factors[] populated with labels: {has_factors}')

# Factor 4: /kali/predictions direct probe returns data (15 pts)
kali_direct = True  # from Phase C
score += 15 if kali_direct else 0
factors.append(f'/kali/predictions direct: {kali_direct}')

print(f'Score: {score}/100')
if score < 95:
    print('BELOW THRESHOLD — do not commit outbox')
```

---

## PHASE D: Write outbox and commit (only if ≥ 95)

```bash
git add outbox/kali-journalism-proof-2026-06-29.md
git commit -m "docs(outbox): Kali AFL journalism proof 2026-06-29 — confidence {score}/100 [skip ci]"
git push origin main  # 2 attempts max
```

---

**Session: 2026-06-29 · CLIENT + RELAY READ · 20 min · Confidence gate: 95**
