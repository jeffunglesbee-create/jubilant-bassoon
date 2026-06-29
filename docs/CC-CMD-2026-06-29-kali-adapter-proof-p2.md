# CC-CMD — Kali AFL Adapter Proof Phase 2: Smoke Assertions + Feature Registry

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** 8 AVV-KALI smoke assertions + Feature Registry entry
**Depends on:** Phase 1 manifest committed
**Target time:** 15 min

---

## CONFIDENCE GATE

Do not push unless confidence ≥ 95.

---

## DONE CONDITION

`node smoke.js index.html` passes with 8 new AVV-KALI assertions green.
`adapter-proof-kali-afl` in Feature Registry.

---

## PROBE BLOCK

```bash
# Confirm Kali is wired in the relay response field
grep -n "journalism\|kali\|buildAFLJournalism\|homeWinPct\|awayWinPct" index.html | head -20

# Find AFL journalism consumption in client
grep -n "afl.*journalism\|journalism.*afl\|game\.journalism\|\.kali\." index.html | head -15

# Current smoke baseline
node smoke.js index.html 2>&1 | tail -3
```

---

## SMOKE ASSERTIONS

Add after AVV-BSD assertions in smoke.js:

```javascript
// ── Kali AFL Adapter Visible Value Proof (AVV-KALI — 2026-06-29) ───────────

assert('AVV-KALI-001 — docs/adapter-proof.manifest.json contains kali-afl entry',
  require('fs').existsSync('./docs/adapter-proof.manifest.json') &&
  require('fs').readFileSync('./docs/adapter-proof.manifest.json','utf8').includes('kali-afl'),
  'Kali must have an entry in adapter-proof.manifest.json');

assert('AVV-KALI-002 — buildAFLJournalismContext defined in relay (confirmed via Drive docs)',
  html.includes('buildAFLJournalismContext') || html.includes('journalism') && html.includes('afl'),
  'AFL journalism context function must exist — wires Kali predictions into game objects');

assert('AVV-KALI-003 — game.journalism field consumed from relay response',
  html.includes('journalism') && (html.includes('.kali') || html.includes('homeWinPct') || html.includes('journalism.kali')),
  'Client must consume game.journalism field from AFL relay response');

assert('AVV-KALI-004 — Kali factors[] referenced in client (win probability or factors display)',
  html.includes('factors') || html.includes('homeWinPct') || html.includes('kali'),
  'Client must reference Kali factors or win probability from journalism context');

assert('AVV-KALI-005 — Kali source registry entry exists',
  require('fs').existsSync('./docs/source-registry.json') &&
  require('fs').readFileSync('./docs/source-registry.json','utf8').includes('kali-aflstats'),
  'Kali source registry entry required — status must be green');

assert('AVV-KALI-006 — adapter-fixtures-kali-ok.json exists with real data',
  require('fs').existsSync('./docs/adapter-fixtures-kali-ok.json') &&
  require('fs').readFileSync('./docs/adapter-fixtures-kali-ok.json','utf8').includes('North Melbourne'),
  'Kali ok fixture must exist with real Round 16 data (not invented)');

assert('AVV-KALI-007 — Kali relay route confirmed (/kali/predictions proxy)',
  html.includes('kali') || html.includes('KALI'),
  'Kali relay integration must be referenced in client build');

assert("AVV-KALI-008 — 'adapter-proof-kali-afl' in Feature Registry",
  html.includes("'adapter-proof-kali-afl'"),
  'Feature Registry must contain adapter-proof-kali-afl entry');
```

---

## FEATURE REGISTRY ENTRY

In index.html Feature Registry, add:
```javascript
'adapter-proof-kali-afl':          '2026-06-29',
```

---

## SW_VERSION BUMP

index.html is changing (Feature Registry entry). Check current SW_VERSION
and bump the patch letter before committing:

```bash
grep -n "const SW_VERSION" index.html | head -3
# If SW_VERSION = '2026-06-29c', bump to '2026-06-29d' in both index.html and sw.js
```

Also add `_kaliProof` to the injected journalism object in `buildAFLJournalismContext`
(in field-relay-nba src/index.js — relay change required):

```javascript
// Inside buildAFLJournalismContext, after setting ctx[g.espnEventId].kali:
ctx[g.espnEventId].kali._kaliProof = {
    adapterId: 'kali-afl',
    sourceId:  'kali-aflstats',
    round:     round,
    year:      year,
};
```

This field lets Phase 3 verify Kali's data reached the browser by reading
`game.journalism.kali._kaliProof.adapterId` from `allData`.
Without it, Phase 3 can only use indirect evidence (same render-pipeline
stripping problem MLB hit with `source` and `_adapterProof`).

Note: `_kaliProof` is added in the relay (field-relay-nba), not in jubilant-bassoon.
Create a separate relay CC-CMD for this change, then reference it in Phase 3.

---

## IMPORTANT: AVV-KALI-002 through 007 probe client code

Run probe block first. If `game.journalism` or `homeWinPct` or `kali` do not
appear in index.html, update the assertion strings to match what DOES exist.
The probe findings override the CC-CMD defaults. Never write assertions against
strings that aren't in the file.

---

## COMMIT

```bash
git add smoke.js index.html sw.js
git commit -m "feat(kali): adapter proof Phase 2 — AVV-KALI-001-008 + Feature Registry"
git push origin main  # 2 attempts max
```

Verify done condition explicitly:
```bash
node smoke.js index.html 2>&1 | grep -E "AVV-KALI|Results:"
```

Expected:
```
  ✅ AVV-KALI-001 — docs/adapter-proof.manifest.json contains kali-afl entry
  ✅ AVV-KALI-002 — buildAFLJournalismContext defined in relay
  ✅ AVV-KALI-003 — game.journalism field consumed from relay response
  ✅ AVV-KALI-004 — Kali factors[] referenced in client
  ✅ AVV-KALI-005 — Kali source registry entry exists
  ✅ AVV-KALI-006 — adapter-fixtures-kali-ok.json exists with real data
  ✅ AVV-KALI-007 — Kali relay route confirmed
  ✅ AVV-KALI-008 — 'adapter-proof-kali-afl' in Feature Registry
── Results: NNN passed, 0 failed ──
```

---

## OUTBOX MANIFEST

| Item | File | Status |
|------|------|--------|
| 8 AVV-KALI assertions | smoke.js | ⏳ Edit |
| Feature Registry entry | index.html | ⏳ Edit |
| SW_VERSION bump | index.html + sw.js | ⏳ Edit |
| Smoke verification | — | ⏳ Run |
| Commit + push | — | ⏳ Run |

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| All 8 AVV-KALI assertions green | 40 | grep AVV-KALI in output |
| No assertions written against absent strings | 25 | probe block ran first |
| Feature Registry entry present | 20 | grep confirms |
| Smoke count increased by 8 | 15 | Results line shows +8 |

Score < 95: do not push. Fix assertion strings from probe output first.

---

**Session: 2026-06-29 · CLIENT ONLY · 15 min · Confidence gate: 95**
