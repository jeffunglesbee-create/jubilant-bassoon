# FIELD Handoff — June 13 2026 (End of Session)

**jubilant-bassoon HEAD:** 428b0fb · **relay HEAD:** 68b03f0 · **Smoke:** 613/0 · **SW_VERSION:** 2026-06-13h

## Session summary
Client-side WC game brief consumption shipped (HANDOFF P1 PIECE 2). When a WC game goes final, client now async-fetches the post-match brief from relay KV via `/journalism/game/{eventId}` and injects it as `matchupNote` on the game object, flowing into card rendering and CDW notes.

## Client commits (jubilant-bassoon)
- `428b0fb`: WC game brief consumption — `_wcBriefsFetched` dedup Set, async fetch on final state, matchupNote injection, fire-and-forget (1500ms timeout), uses existing journalism relay route (same KV namespace `brief:game:*`). SW 2026-06-13h. Smoke 613/613.
- Prior [skip ci] commits (1016f86 etc): WC probe + odds + kickoff fixes from earlier sessions.

## Relay commits (field-relay-nba) — unchanged this session
- `68b03f0`: HTTP 429 → 503 no-store (was cacheable 502)
- Full relay commit history in prior HANDOFF versions.

## Architecture note: WC brief pipeline (now complete end-to-end)
1. Game final → `writeWCResult()` → D1 insert → `recomputeGroupStandings()` → BracketDO recompute
2. `JOURNALISM_QUEUE.send({type:"game-brief"})` with api-sports events context
3. Queue consumer → Haiku brief gen → quality chain → KV `brief:game:{eventId}` (3600s TTL)
4. **[NEW] Client V2 poll** → detects `state==='final'` → `fetch /journalism/game/{eventId}` → injects `matchupNote` → `scheduleRenderAll()`
5. Dedup: `_wcBriefsFetched` Set prevents re-fetching each poll cycle

## Known gap
- Relay route `/wc/brief/game/{id}` does NOT exist as a separate endpoint. Client uses the existing `/journalism/game/{id}` route which reads from the same FIELD_JOURNALISM KV namespace. The `encodeURIComponent` handles the colon in `football:12345` eventId format. If this causes issues, a dedicated WC route would need to be added to the relay source.

## Priority queue
1. ~~Client brief consumption~~ ✅ DONE (428b0fb)
2. **Temporal polyfill** (~90 min) — ends date bug class
3. **web-push-browser** (~120 min) — fact-only push (Rule F)
4. **winkNLP JQ Gate pre-filter** (~60 min) — pairs with brief pipeline
5. Viewport artifact v4 (~150 min TYPE D) — after Tuesday reset
6. Design system BUILD (~110 min TYPE C) — typography/transitions/density/touch all specced not built
7. xG model pipeline (soccer_xg + api-sports shots)
8. Wikidata integration (CC0 team context)
9. WC knockout prep — group ends June 27, R32 ~June 28
10. Wimbledon draw — before July 7

## Key Drive docs
- June 13 session doc: 1HRvTKbR_WNqYXGEhSfYI2ZnLTWzCFXp33UFl9tThIAM
- June 12 evening doc: 10wLrVnWkEgGtCeVSvTfFQBAcSAGekxumIdZ394vQQlc
- browser-use Brief: 1Zq_FD72dD16buJVw5odZoteRLMBiN1wR7lrxZFooqns
- v4 Build Brief: 1OZItVH-7beD7wEpizwSie3mb80UtiepHIInGEZh3ALU
- Rovi Clearance: 1ICONs1B_WzfpW562DHEEzhjc2KC8tlnqkbajYrOvctk
- Design System v2: 1Bv2qvn_Gz0qLZatJW9jVsQfMAwE-DyflZNplQyHmCvk

## Permanent rules active
- Rule F: push notifications + haptics FACT-ONLY (scores/finals/kickoffs), never interest judgments. Drama Dial defense breaks for push (server decides when to send).
- Rules A-E (ADR-002/RUWT), C1-C5 (Rovi/circadian), F (push) — three rule sets, three patent domains.
