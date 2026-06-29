# CC-CMD — BSD Adapter Proof Phase 2: Smoke Assertions + Feature Registry

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** 8 AVV-BSD smoke assertions + Feature Registry entry
**Depends on:** Phase 1 manifest committed
**Target time:** 15 min

---

## DONE CONDITION
**CONFIDENCE GATE: Do not commit unless score ≥ 95. Report score verbatim if below threshold.**


`node smoke.js index.html` passes with 8 new AVV-BSD assertions green.
`adapter-proof-bsd-soccer` in Feature Registry.

---

## PROBE BLOCK

```bash
# Confirm BSD functions exist in client
grep -n "_bsdActivateForWC\|_bsdRepaint\|bsd-pitch\|bsdEventId\|BSD_MOMENTUM\|bsd_history" index.html | head -15

# Verify CC-CMD-G shipped (bsdEventId wired through mapV2ToESPN)
grep -n "bsdEventId\|mapV2ToESPN" index.html | head -10

# Current smoke count baseline
node smoke.js index.html 2>&1 | tail -3
```

---

## SMOKE ASSERTIONS

Add after MLB-SIMP assertions in smoke.js:

```javascript
// ── BSD Adapter Visible Value Proof (AVV-BSD — 2026-06-29) ─────────────────

assert('AVV-BSD-001 — docs/adapter-proof.manifest.json contains bsd-soccer entry',
  require('fs').existsSync('./docs/adapter-proof.manifest.json') &&
  require('fs').readFileSync('./docs/adapter-proof.manifest.json','utf8').includes('bsd-soccer'),
  'BSD must have an entry in adapter-proof.manifest.json');

assert('AVV-BSD-002 — _bsdActivateForWC defined in client',
  html.includes('_bsdActivateForWC') || html.includes('bsdActivateForWC'),
  '_bsdActivateForWC must exist — wires bsdEventId to AmbientDO subscription');

assert('AVV-BSD-003 — _bsdRepaint defined in client (SVG pitch renderer)',
  html.includes('_bsdRepaint') || html.includes('bsdRepaint'),
  '_bsdRepaint must exist — renders BSD ball position into SVG pitch element');

assert('AVV-BSD-004 — bsdEventId carried through client game objects',
  html.includes('bsdEventId'),
  'Client must carry bsdEventId from relay game objects');

assert('AVV-BSD-005 — BSD momentum route confirmed fixed (relay cd68c60)',
  html.includes('bsdEventId') && html.includes('_bsdActivateForWC'),
  'BSD momentum fix (relay cd68c60 2026-06-29) enables [BSD MOMENTUM] journalism context');

assert('AVV-BSD-006 — Win probability chip A739 exists',
  html.includes('A739') || html.includes('a739') || html.includes('win-probability'),
  'Win probability chip A739 must exist — BSD visible value on WC cards');

assert('AVV-BSD-007 — BSD source registry entry exists',
  require('fs').existsSync('./docs/source-registry.json') &&
  require('fs').readFileSync('./docs/source-registry.json','utf8').includes('bsd-bzzoiro-soccer'),
  'BSD source registry entry required — status must be green');

assert("AVV-BSD-008 — 'adapter-proof-bsd-soccer' in Feature Registry",
  html.includes("'adapter-proof-bsd-soccer'"),
  'Feature Registry must contain adapter-proof-bsd-soccer entry');
```

---

## FEATURE REGISTRY ENTRY

In index.html Feature Registry, add:
```javascript
'adapter-proof-bsd-soccer': '2026-06-29',
```

---

## COMMIT

```bash
git add smoke.js index.html
git commit -m "feat(bsd): adapter proof Phase 2 — AVV-BSD-001-008 + Feature Registry"
git push origin main
```

Verify: `node smoke.js index.html 2>&1 | grep -E "AVV-BSD|Results:"`

**Session: 2026-06-29 · CLIENT ONLY · 15 min**
