# CC-CMD — BSD Adapter Proof Phase 1: Manifest + Registry

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Adapter-to-Visible-Value manifest + source registry for BSD
**Why:** BSD is a multi-component system (relay + client + D1 + R2). The proof
         system must capture all components, not just a normalizer.
**Target time:** 15 min

---

## CONTEXT: BSD IS NOT A SIMPLE NORMALIZER

BSD has two "visible value" paths:

1. **Journalism path (relay):** `bsdEventId` injection → `buildBSDMomentumContext`
   fires → `[BSD MOMENTUM]` block in journalism prompt
2. **Card path (client):** Win probability chip A739 on WC cards + SVG pitch
   (pitch div not yet in card DOM — known gap from CC-CMD-G June 25)

The proof manifest must reflect both paths. "Visible surfaces" for BSD are
journalism briefs + the WP chip, not a score line.

---

## DONE CONDITION

Files committed to jubilant-bassoon:
- `docs/adapter-proof.manifest.json` — BSD entry added alongside MLB
- `docs/source-registry.json` — BSD source entry added
- `docs/adapter-fixtures-bsd-ok.json` — real stats from Brazil vs Japan (8360)
- `docs/adapter-fixtures-bsd-empty.json`
- `docs/adapter-fixtures-bsd-malformed.json`

---

## STEP 1: Read current docs/adapter-proof.manifest.json

```bash
cat docs/adapter-proof.manifest.json
# Add BSD alongside existing MLB entry
```

## STEP 2: Add BSD entry to manifest

```json
"bsd-soccer": {
  "status": "active",
  "sourceId": "bsd-bzzoiro-soccer",
  "sport": "Soccer",
  "components": {
    "relay": {
      "routes": [
        "/bsd/events/live",
        "/bsd/events/:id/shotmap",
        "/bsd/events/:id/momentum",
        "/bsd/events/:id/incidents"
      ],
      "contextSources": ["bsd_momentum", "bsd_history"],
      "d1Write": "wc_results.bsd_event_id via writeWCResult",
      "r2Write": "bsd/wc26/{id}/stats.json + incidents.json"
    },
    "client": {
      "functions": ["_bsdActivateForWC", "_bsdRepaint"],
      "cards": ["WC26 win probability chip A739"]
    }
  },
  "normalizer": "bsdEventId injection via handleV2Games teamNameMatch",
  "requiredNormalizedFields": [
    "bsdEventId",
    "momentum",
    "xg_home",
    "xg_away",
    "home_possession",
    "shots_on_target_home",
    "shots_on_target_away"
  ],
  "visibleSurfaces": [
    {
      "surface": "journalism-brief",
      "proof": "[BSD MOMENTUM] block appears in WC journalism context when game is live"
    },
    {
      "surface": "card",
      "proof": "Win probability chip A739 visible on WC game cards"
    }
  ],
  "fallbackSurfaces": [
    {
      "surface": "journalism-brief",
      "proof": "Brief renders without [BSD MOMENTUM] when bsdEventId absent"
    }
  ],
  "fixtures": {
    "ok": "docs/adapter-fixtures-bsd-ok.json",
    "empty": "docs/adapter-fixtures-bsd-empty.json",
    "malformed": "docs/adapter-fixtures-bsd-malformed.json"
  },
  "knownGaps": [
    "SVG pitch div not yet in WC card DOM (CC-CMD-G June 25 incomplete)",
    "bsdEventId only populated during BSD live window — captured to D1 at game-final",
    "momentum route was 404 until 2026-06-29 cd68c60 fix"
  ],
  "proofMode": "required",
  "lastVerifiedAt": null
}
```

## STEP 3: Add BSD to source registry

```json
"bsd-bzzoiro-soccer": {
  "status": "green",
  "sourceUrl": "https://sports.bzzoiro.com",
  "allowedUses": [
    "analytics_display",
    "journalism_context",
    "live_tracking",
    "post_match_stats"
  ],
  "rawRedistributionAllowed": false,
  "commercialUseClass": "licensed_analytics",
  "authRequired": true,
  "authMethod": "BSD_API_TOKEN header",
  "cost": "$0 REST + $3/mo WebSocket",
  "leagueCoverage": {
    "wc26": "lid=27",
    "epl": "lid=1",
    "mls": "lid=18",
    "ucl": "lid=7",
    "laliga": "lid=3",
    "seriea": "lid=4",
    "bundesliga": "lid=5",
    "ligue1": "lid=6"
  },
  "lastTermsCheckedAt": "2026-06-25",
  "notes": "Free REST tier. BSD_API_TOKEN in relay secrets. CORS not available — relay proxies all requests."
}
```

## STEP 4: Create fixtures from real data

`docs/adapter-fixtures-bsd-ok.json` — real Brazil vs Japan data (event 8360):
```json
{
  "sourceId": "bsd-bzzoiro-soccer",
  "note": "Real data from BSD event 8360 — Brazil 2-1 Japan, R32, 2026-06-29",
  "event_id": "8360",
  "bsd_event_id": "8360",
  "home": "Brazil",
  "away": "Japan",
  "home_score": 2,
  "away_score": 1,
  "status": "finished",
  "stats": {
    "home": { "xg": {"actual": 1.74}, "ball_possession": 62, "shots_on_target": 6, "total_shots": 14 },
    "away": { "xg": {"actual": 0.23}, "ball_possession": 38, "shots_on_target": 2, "total_shots": 7 }
  },
  "momentum": [{"m": 1, "v": 8}, {"m": 30, "v": 45}, {"m": 60, "v": 72}, {"m": 90, "v": 100}],
  "xg_per_minute": [
    {"m": 2, "xg_home": 0.032, "xg_away": 0.0, "cum_home": 0.032, "cum_away": 0.0},
    {"m": 90, "xg_home": 0.211, "xg_away": 0.0, "cum_home": 1.74, "cum_away": 0.23}
  ],
  "shotmap": [{"min": 90, "home": true, "type": "goal", "xg": 0.21, "xgot": 0.30}],
  "average_positions": {
    "home": [{"x": 65, "y": 50}],
    "away": [{"x": 35, "y": 50}]
  }
}
```

`docs/adapter-fixtures-bsd-empty.json`:
```json
{ "sourceId": "bsd-bzzoiro-soccer", "event_id": null, "momentum": [], "stats": {}, "shotmap": [], "average_positions": {} }
```

`docs/adapter-fixtures-bsd-malformed.json`:
```json
{ "sourceId": "bsd-bzzoiro-soccer", "event_id": "bad", "stats": null, "momentum": "invalid", "shotmap": 42 }
```

---

## COMMIT

```bash
git add docs/adapter-proof.manifest.json docs/source-registry.json \
        docs/adapter-fixtures-bsd-ok.json docs/adapter-fixtures-bsd-empty.json \
        docs/adapter-fixtures-bsd-malformed.json
git commit -m "feat(bsd): adapter proof Phase 1 — manifest + registry + fixtures [skip ci]"
git push origin main
```

**Session: 2026-06-29 · CLIENT ONLY · 15 min**
