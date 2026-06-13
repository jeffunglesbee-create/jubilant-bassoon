# FIELD Handoff — June 13 2026 (End of June 12 Evening Session)

**jubilant-bassoon HEAD:** 888b0c0 · **relay HEAD:** 273bfbd · **Smoke:** 612/0 · **SW_VERSION:** 2026-06-12i

## Session summary

Massive bugfix + research session. 15 commits (9 client, 6 relay). WC game cards, bracket, movers, and automated brief pipeline all fixed or built.

## Client commits (jubilant-bassoon)
- `8eb8ba5`: Compliance check 8 — checks removed functions not strings
- `76588c6`: WC group standings merge — all 4 teams per group
- `0385295`: WC cards — Invalid Date fix + ALONE ON SCREEN guard
- `04e5398`: WC cards — buildWCBars + wc-bars-wrap removal on final
- `76587e5`: UTC midnight boundary + isToday + live state refresh
- `e603efa`: Team name normalization (USA + 4 preemptive) + isUSA bracket fix
- `5d36cd2`: Post-game briefs for USA 4-1, Canada 1-1, South Korea 2-1

## Relay commits (field-relay-nba)
- `7062b65`: R32 third-place dedup (Ivory Coast 6x → 1x)
- `3346134`: Movers prev rotation fix (was never initialized)
- `496a07e`: BracketDO writes movers to KV for /wc/movers endpoint
- `11f2b3c`: /wc/bracket/refresh in probe allow-list + accepts GET
- `7c04648`: Automated per-game WC briefs via JOURNALISM_QUEUE
- `273bfbd`: Brief prompt enriched with api-sports match events (goals, cards, subs)

## New permanent rules
- **Rule F**: Push notifications + haptics must be FACT-ONLY (scores, finals, kickoffs). Never interest judgments (CRUNCH TIME alerts, drama thresholds). Joins Rules A-E (RUWT) and C1-C5 (Rovi).

## Known issue: WC live scores
Live score rendering on WC game cards needs verification with tomorrow's live games. Potential issue: WC section re-injection on every V2 poll may wipe DOM score updates, and game _id mismatch between wc26Raw and V2-sourced entries. First test opportunity: Qatar-Switzerland 12 PM ET June 13.

## Movers pipeline status
- Pipeline is OPERATIONAL (no longer null)
- First meaningful movers will compute after tomorrow's first result
- BracketDO now writes delta to KV + rotates prev
- /wc/bracket/refresh accessible via MCP probe

## Automated WC brief pipeline
- writeWCResult → fetches api-sports events → enriched prompt → JOURNALISM_QUEUE
- Queue consumer runs Claude Haiku + cliché quality chain → KV
- Missing client-side piece: read brief from KV and update card matchupNote (next session)

## Research completed
- 15 wow features (refined through 4 rounds)
- browser-use infrastructure brief (Drive 1Zq_FD72)
- FBRef legality: PROHIBITED (ToS ban + data gone Jan 2026)
- soccer_xg (Apache 2.0): clean path for own xG model
- web-push-browser (MIT): highest-leverage GitHub find (fact-only per Rule F)
- Open source license analysis for commercial use

## Priority queue
1. **WC live scores verification** — test with tomorrow's games
2. **Client brief consumption** — relay endpoint /wc/brief/game/{id} + client fetch
3. Viewport artifact v4 (~150 min TYPE D) — after Tuesday reset
4. Design system BUILD (~110 min TYPE C)
5. web-push-browser integration (Rule F compliant)
6. xG model pipeline (soccer_xg)
7. Wimbledon draw context (before July 7)

## Key Drive docs (full session)
- Evening session doc: 10wLrVnWkEgGtCeVSvTfFQBAcSAGekxumIdZ394vQQlc
- Items Catalog: 1lWX2KtRPMNN1e8YfxrCd3aBPNzxOc8k0JAHOzUxprd0
- browser-use Brief: 1Zq_FD72dD16buJVw5odZoteRLMBiN1wR7lrxZFooqns
- Rovi Patent Clearance: 1ICONs1B_WzfpW562DHEEzhjc2KC8tlnqkbajYrOvctk
- Design System v2: 1Bv2qvn_Gz0qLZatJW9jVsQfMAwE-DyflZNplQyHmCvk
- v4 Build Brief: 1OZItVH-7beD7wEpizwSie3mb80UtiepHIInGEZh3ALU
