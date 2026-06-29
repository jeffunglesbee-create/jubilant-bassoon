# CC-CMD — Odds API Adapter Proof Phase 1: Manifest + Registry + Fixtures

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Adapter-to-Visible-Value manifest + source registry + real fixtures
**Target time:** 15 min

---

## CONTEXT: ODDS API ARCHITECTURE

Type 2 multi-component. Four distinct surfaces:

1. LIVE PASSTHROUGH (relay)
   /odds/v4/sports/{sport_key}/odds → raw bookmaker odds for pre-game display
   Confirmed: MLB 27 games (BAL -1.38/CWS +2.96), WC 14 games (NED 2.4/MAR 3.3/Draw 3.05)

2. D1 ARCHIVE (relay cron)
   snapshotCronOdds() → ARCHIVE_DB.regular_season_games.opening_odds (JSON)
   Cron captures closing_odds post-game
   Schema: { source, captured_at, moneyline:{home,away}, spread?:{home,away}, total:{over,under} }
   NOTE: spread is present on DraftKings rows, absent on FanDuel rows — null-guard always

3. [ODDS STORY] JOURNALISM BLOCK (context assembler)
   buildOddsStoryContext(env, game) — CONTEXT_SOURCE priority 5, budget 100
   Requires BOTH opening_odds AND closing_odds in D1
   computeOddsStory() emits: "[ODDS STORY] ML moved X pts direction (opened Y, closed Z). Total moved X.X..."
   Movement thresholds: ML ≥10 pts, Spread ≥0.5, Total ≥0.5

4. WC PREGAME LAMBDAS (relay direct fetch)
   Direct odds fetch for WC win probability (L960, L2501 in index.js)

**extractOddsForGame() output shape:**
  { source, captured_at, moneyline:{home,away}, spread?:{home,away}, total:{over,under} }

---

## CONFIDENCE GATE

Do not commit unless confidence ≥ 95.

---

## DONE CONDITION

5 files committed with real data from probes:
- docs/adapter-proof.manifest.json — Odds API entry added
- docs/source-registry.json — odds-api-the-odds-api entry added
- docs/adapter-fixtures-odds-live-mlb.json — BAL vs CWS live (from today's probe)
- docs/adapter-fixtures-odds-live-wc.json — NED vs MAR live (from today's probe)
- docs/adapter-fixtures-odds-story-wnba.json — GSV vs NYL with opening + closing (real D1 data)

---

## STEP 1: Read current manifest + registry

```bash
cat docs/adapter-proof.manifest.json
cat docs/source-registry.json
```

---

## STEP 2: Add Odds API entry to manifest

```json
"odds-api": {
  "status": "active",
  "sourceId": "odds-api-the-odds-api",
  "sport": "Multi-sport (MLB, WNBA, WC26, NBA, NHL, EPL, CFL, AFL)",
  "architecture": "multi-component",
  "components": {
    "relay": {
      "passthrough": "/odds/v4/sports/{sport_key}/odds",
      "cronWriter": "snapshotCronOdds() → ARCHIVE_DB opening_odds + closing_odds",
      "contextSource": "buildOddsStoryContext (priority 5, budget 100)"
    },
    "oddsStory": {
      "file": "src/odds-story.js",
      "function": "computeOddsStory(openingOdds, closingOdds)",
      "output": "[ODDS STORY] ML moved X pts direction. Total moved X.X.",
      "requires": "both opening_odds AND closing_odds non-null in D1"
    },
    "wcPregame": {
      "description": "Direct odds fetch for WC win probability lambdas",
      "sportKey": "soccer_fifa_world_cup"
    }
  },
  "requiredFields": {
    "live": ["id", "sport_key", "commence_time", "home_team", "away_team",
             "bookmakers[].key", "bookmakers[].markets[].key",
             "bookmakers[].markets[].outcomes[].name",
             "bookmakers[].markets[].outcomes[].price",
             "bookmakers[].markets[].outcomes[].point"],
    "extracted": ["source", "captured_at", "moneyline.home", "moneyline.away",
                  "spread.home", "spread.away", "total.over", "total.under"],
    "note": "spread absent from FanDuel rows — always null-guard"
  },
  "visibleSurfaces": [
    {
      "surface": "journalism-brief",
      "proof": "[ODDS STORY] block in journalism context when opening + closing odds exist"
    },
    {
      "surface": "live-passthrough",
      "proof": "MLB and WC26 odds return from /odds/v4/sports/{key}/odds"
    },
    {
      "surface": "wc-card",
      "proof": "WC game cards carry win probability derived from soccer_fifa_world_cup odds"
    }
  ],
  "fixtures": {
    "live-mlb": "docs/adapter-fixtures-odds-live-mlb.json",
    "live-wc": "docs/adapter-fixtures-odds-live-wc.json",
    "odds-story-wnba": "docs/adapter-fixtures-odds-story-wnba.json"
  },
  "knownGaps": [
    "computeOddsStory requires BOTH opening_odds AND closing_odds — fires only for completed games",
    "MLB today has no opening_odds in D1 yet (cron runs at game start)",
    "WP source='default-lambda' on MLB objects — odds feed D1 not live WP"
  ],
  "lastVerifiedAt": null
}
```

---

## STEP 3: Add source registry entry

```json
"odds-api-the-odds-api": {
  "status": "green",
  "sourceUrl": "https://api.the-odds-api.com",
  "allowedUses": ["pre_game_odds", "line_movement", "journalism_context", "win_probability"],
  "rawRedistributionAllowed": false,
  "commercialUseClass": "licensed_data",
  "authRequired": true,
  "authMethod": "apiKey query param (ODDS_API_KEY env, fallback hardcoded)",
  "cost": "20K credits/month primary, 500/month fallback",
  "sportKeys": {
    "mlb": "baseball_mlb",
    "nba": "basketball_nba",
    "wnba": "basketball_wnba",
    "nhl": "icehockey_nhl",
    "epl": "soccer_epl",
    "wc26": "soccer_fifa_world_cup",
    "cfl": "americanfootball_cfl",
    "nfl": "americanfootball_nfl",
    "afl": "aussierules_afl"
  },
  "creditCost": {
    "live": "1 credit per request",
    "historical": "10 credits per request",
    "hardLimit": 85000,
    "quotaFloor": 50
  },
  "lastTermsCheckedAt": "2026-06-29",
  "notes": "CORS available — client can call directly. Relay proxies for key hiding. Fallback key de44fdf870b3a4b5ee9d46993b2e1038 is starter tier (500/mo)."
}
```

---

## STEP 4: Create fixtures from real probe data

**docs/adapter-fixtures-odds-live-mlb.json** — real BAL vs CWS from today:
```json
{
  "sourceId": "odds-api-the-odds-api",
  "note": "Real data from /v4/sports/baseball_mlb/odds — DraftKings — 2026-06-29",
  "sport_key": "baseball_mlb",
  "game": {
    "id": "da58edb8a6932f91a04f398f83ed0658",
    "sport_key": "baseball_mlb",
    "sport_title": "MLB",
    "commence_time": "2026-06-29T22:36:00Z",
    "home_team": "Baltimore Orioles",
    "away_team": "Chicago White Sox",
    "bookmakers": [{
      "key": "draftkings",
      "title": "DraftKings",
      "last_update": "2026-06-29T23:03:25Z",
      "markets": [
        { "key": "h2h", "outcomes": [
          { "name": "Baltimore Orioles", "price": 1.38 },
          { "name": "Chicago White Sox", "price": 2.96 }
        ]},
        { "key": "spreads", "outcomes": [
          { "name": "Baltimore Orioles", "price": 1.9, "point": -1.5 },
          { "name": "Chicago White Sox", "price": 1.85, "point": 1.5 }
        ]},
        { "key": "totals", "outcomes": [
          { "name": "Over", "price": 1.92, "point": 8.5 },
          { "name": "Under", "price": 1.84, "point": 8.5 }
        ]}
      ]
    }]
  },
  "extractedOdds": {
    "source": "draftkings",
    "captured_at": "2026-06-29T23:03:25Z",
    "moneyline": { "home": 1.38, "away": 2.96 },
    "spread": { "home": -1.5, "away": 1.5 },
    "total": { "over": 8.5, "under": 8.5 }
  }
}
```

**docs/adapter-fixtures-odds-live-wc.json** — real NED vs MAR from today:
```json
{
  "sourceId": "odds-api-the-odds-api",
  "note": "Real data from /v4/sports/soccer_fifa_world_cup/odds — DraftKings — 2026-06-29",
  "sport_key": "soccer_fifa_world_cup",
  "game": {
    "id": "5a34afe2de99513ba48360b983cfe80c",
    "sport_key": "soccer_fifa_world_cup",
    "sport_title": "FIFA World Cup",
    "commence_time": "2026-06-30T01:00:00Z",
    "home_team": "Netherlands",
    "away_team": "Morocco",
    "bookmakers": [{
      "key": "draftkings",
      "title": "DraftKings",
      "last_update": "2026-06-29T23:04:10Z",
      "markets": [
        { "key": "h2h", "outcomes": [
          { "name": "Netherlands", "price": 2.4 },
          { "name": "Morocco", "price": 3.3 },
          { "name": "Draw", "price": 3.05 }
        ]}
      ]
    }]
  },
  "note_draw": "Soccer h2h has 3 outcomes including Draw — extractOddsForGame handles this correctly"
}
```

**docs/adapter-fixtures-odds-story-wnba.json** — real GSV vs NYL with opening + closing:
```json
{
  "sourceId": "odds-api-the-odds-api",
  "note": "Real D1 data — Golden State Valkyries vs New York Liberty, WNBA 2026-06-28. Only confirmed game with BOTH opening_odds AND closing_odds in ARCHIVE_DB as of 2026-06-29.",
  "home": "Golden State Valkyries",
  "away": "New York Liberty",
  "date": "2026-06-28",
  "sport": "WNBA",
  "opening_odds": {
    "source": "draftkings",
    "captured_at": "2026-06-28T00:00:22.692Z",
    "moneyline": { "home": -112, "away": -108 },
    "spread": { "home": -1.5, "away": 1.5 },
    "total": { "over": 163.5, "under": 163.5 }
  },
  "closing_odds": {
    "source": "fanduel",
    "captured_at": "2026-06-28T23:55:27Z",
    "moneyline": { "home": 100, "away": -128 },
    "total": { "over": 151.5, "under": 151.5 }
  },
  "note_spread": "closing_odds has no spread — FanDuel rows omit spread field. null-guard required.",
  "expectedOddsStory": "[ODDS STORY] ML moved 212 pts underdog-ward (opened -112, closed 100). Total moved 12.0 (opened 163.5, closed 151.5) — under pressure."
}
```

---

## COMMIT

```bash
git add docs/adapter-proof.manifest.json docs/source-registry.json \
        docs/adapter-fixtures-odds-live-mlb.json \
        docs/adapter-fixtures-odds-live-wc.json \
        docs/adapter-fixtures-odds-story-wnba.json
git commit -m "feat(odds): adapter proof Phase 1 — manifest + registry + 3 real fixtures [skip ci]"
git push origin main  # 2 attempts max
```

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| Manifest has odds-api entry with all 4 components | 25 | grep confirms |
| Source registry has odds-api-the-odds-api + sportKeys | 20 | grep confirms |
| MLB fixture: real game ID + DraftKings h2h/spreads/totals | 20 | Not invented |
| WC fixture: real NED vs MAR + 3-way h2h (home/away/draw) | 20 | Not invented |
| WNBA odds-story fixture: opening + closing + expectedOddsStory | 15 | Matches computeOddsStory() simulation |

Score < 95: do not commit. Report gap.

---

**Session: 2026-06-29 · CLIENT ONLY · 15 min · Confidence gate: 95**
