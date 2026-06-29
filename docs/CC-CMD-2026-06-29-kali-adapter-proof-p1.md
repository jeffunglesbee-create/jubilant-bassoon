# CC-CMD — Kali AFL Adapter Proof Phase 1: Manifest + Registry + Fixtures

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Adapter-to-Visible-Value manifest + source registry + real fixtures
**Target time:** 15 min

---

## CONTEXT: KALI ARCHITECTURE

Kali is NOT a standalone normalizer adapter. It feeds through the relay:

1. `handleV2Games` → `buildAFLJournalismContext(games, round, year, env)`
2. Fetches `kaliaflstats.com/api/afl/v1/predictions?year=&round=` via relay `/kali/predictions`
3. Injects `game.journalism.kali = { homeWinPct, awayWinPct, squiggleConsensus, factors[], homeBreakdown, awayBreakdown }` on each AFL game object
4. Client receives this via `/v2/games?sport=afl`

**Visible surface:** `game.journalism.kali.factors[]` — named factors with impact scores feed AFL journalism briefs. This is what `[KALI]` journalism context produces.

**Confirmed working:** `/v2/games?sport=afl&date=2026-06-28` returns games with full journalism objects. Real data from Round 16 verified.

---

## CONFIDENCE GATE

Do not commit unless confidence ≥ 95.

---

## DONE CONDITION

Files committed to jubilant-bassoon:
- `docs/adapter-proof.manifest.json` — Kali entry added
- `docs/source-registry.json` — Kali source entry added
- `docs/adapter-fixtures-kali-ok.json` — real Round 16 data
- `docs/adapter-fixtures-kali-empty.json`
- `docs/adapter-fixtures-kali-malformed.json`

---

## STEP 1: Read current manifest and source registry

```bash
cat docs/adapter-proof.manifest.json
cat docs/source-registry.json
```

---

## STEP 2: Add Kali entry to docs/adapter-proof.manifest.json

```json
"kali-afl": {
  "status": "active",
  "sourceId": "kali-aflstats",
  "sport": "AFL",
  "architecture": "relay-injected",
  "note": "Kali is not a standalone normalizer. Data is injected into game.journalism.kali by buildAFLJournalismContext() in handleV2Games.",
  "relayFunction": "buildAFLJournalismContext",
  "requiredRelayFields": [
    "homeWinPct",
    "awayWinPct",
    "squiggleConsensus",
    "factors",
    "homeBreakdown",
    "awayBreakdown"
  ],
  "visibleSurfaces": [
    {
      "surface": "journalism-brief",
      "proof": "game.journalism.kali.factors[] with named labels and impact scores appear in AFL briefs"
    },
    {
      "surface": "card",
      "proof": "game.journalism.kali.homeWinPct / awayWinPct available for AFL card WP display"
    }
  ],
  "fallbackSurfaces": [
    {
      "surface": "journalism-brief",
      "proof": "AFL brief renders without Kali data when KALI_AFL_TOKEN absent or API error"
    }
  ],
  "fixtures": {
    "ok": "docs/adapter-fixtures-kali-ok.json",
    "empty": "docs/adapter-fixtures-kali-empty.json",
    "malformed": "docs/adapter-fixtures-kali-malformed.json"
  },
  "knownGaps": [
    "No client-side normalizer — data is relay-injected",
    "No dedicated CONTEXT_SOURCE in context-assembler.js — inline in handleV2Games"
  ],
  "lastVerifiedAt": null
}
```

---

## STEP 3: Add Kali to docs/source-registry.json

```json
"kali-aflstats": {
  "status": "green",
  "sourceUrl": "https://kaliaflstats.com/api/afl/v1",
  "allowedUses": [
    "analytics_display",
    "journalism_context",
    "win_probability",
    "factor_breakdown"
  ],
  "rawRedistributionAllowed": false,
  "commercialUseClass": "licensed_analytics",
  "authRequired": true,
  "authMethod": "KALI_AFL_TOKEN Bearer",
  "cost": "free, 5000 req/day",
  "coverage": "AFL — predictions, tips, player-stats, standings, head-to-head, matches, fixture",
  "lastTermsCheckedAt": "2026-06-26",
  "notes": "CORS not available — relay proxies all requests. Token injected server-side."
}
```

---

## STEP 4: Create fixtures from real Round 16 data

**docs/adapter-fixtures-kali-ok.json** — real data from 2026-06-28:
```json
{
  "sourceId": "kali-aflstats",
  "note": "Real data from /v2/games?sport=afl&date=2026-06-28 — Round 16",
  "round": 16,
  "year": 2026,
  "games": [
    {
      "home": "North Melbourne",
      "away": "Essendon",
      "homeScore": 79,
      "awayScore": 65,
      "state": "post",
      "espnEventId": "afl_r16_nm_ess",
      "journalism": {
        "kali": {
          "homeWinPct": 80.2,
          "awayWinPct": 19.8,
          "squiggleConsensus": 67,
          "factors": [
            { "team": "home", "label": "Strong form (3W-2L)", "impact": 12 },
            { "team": "home", "label": "Tipster consensus", "impact": 6.76 },
            { "team": "away", "label": "Dominant H2H record", "impact": 6 }
          ],
          "homeBreakdown": { "h2h": 20, "form": 60, "stats": 36, "venue": 55, "scoring": 31, "squiggle": 66 },
          "awayBreakdown": { "h2h": 80, "form": 40, "stats": 64, "venue": 45, "scoring": 69, "squiggle": 34 }
        },
        "squiggle": { "homeConfidence": 67, "awayConfidence": 33 }
      }
    },
    {
      "home": "Fremantle",
      "away": "Gold Coast SUNS",
      "homeScore": 80,
      "awayScore": 29,
      "state": "post",
      "espnEventId": "afl_r16_fre_gcs",
      "journalism": {
        "kali": {
          "homeWinPct": 96.7,
          "awayWinPct": 3.3,
          "squiggleConsensus": 78,
          "factors": [
            { "team": "home", "label": "Strong form (5W-0L)", "impact": 16 },
            { "team": "home", "label": "Tipster consensus", "impact": 11.1 },
            { "team": "home", "label": "Superior scoring power", "impact": 7.0 }
          ],
          "homeBreakdown": { "h2h": 75, "form": 100, "stats": 59, "venue": 55, "scoring": 78 },
          "awayBreakdown": { "h2h": 25, "form": 0, "stats": 41, "venue": 45, "scoring": 22 }
        },
        "squiggle": { "homeConfidence": 78, "awayConfidence": 22 }
      }
    }
  ]
}
```

**docs/adapter-fixtures-kali-empty.json:**
```json
{
  "sourceId": "kali-aflstats",
  "round": 16,
  "year": 2026,
  "games": []
}
```

**docs/adapter-fixtures-kali-malformed.json:**
```json
{
  "sourceId": "kali-aflstats",
  "round": "bad",
  "games": [{ "journalism": null, "kali": "invalid" }]
}
```

---

## COMMIT

```bash
git add docs/adapter-proof.manifest.json docs/source-registry.json \
        docs/adapter-fixtures-kali-ok.json docs/adapter-fixtures-kali-empty.json \
        docs/adapter-fixtures-kali-malformed.json
git commit -m "feat(kali): adapter proof Phase 1 — manifest + registry + fixtures [skip ci]"
git push origin main  # 2 attempts max
```

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| Manifest has kali-afl entry | 25 | grep confirms |
| Source registry has kali-aflstats | 25 | grep confirms |
| ok fixture uses real Round 16 data | 25 | Not invented — from probe |
| empty + malformed fixtures exist | 15 | Files exist |
| node smoke.js passes | 10 | No regressions |

Score < 95: do not commit. Report gap.

---

**Session: 2026-06-29 · CLIENT ONLY · 15 min · Confidence gate: 95**
