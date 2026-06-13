# FIELD Handoff — June 13 2026 (End of Session)

**jubilant-bassoon HEAD:** a3cc0c5 · **relay HEAD:** 68b03f0 · **Smoke:** 612/0 · **SW_VERSION:** 2026-06-13g

## Session summary
Continuation of June 12 evening (same conversation, compacted). Core achievement: built a permanent WC live-score diagnostic probe, used it to PROVE live scores work and root-cause the kickoff cache lag. Shipped WC card fixes, automated per-game brief pipeline, and rate-limit resilience.

## Client commits (jubilant-bassoon)
- `e603efa`: Team name normalization (USA→United States +4) + isUSA() bracket-path fix (was silently broken since launch)
- `5d36cd2`: Post-game briefs for USA 4-1, Canada 1-1, South Korea 2-1
- `da12569`: US Open fix — Shinnecock Hills, J.J. Spaun defending (was Oakmont/Wyndham Clark)
- `6c1a20f`: WC odds bars — _wcOddsCache was never populated (fetchWCOddsProbabilities discarded data). Now Qatar 27%/Switzerland 95% etc.
- `eac54b1`: WC "Kickoff" not "Tip-off" (countdown selectors missing world cup/fifa)
- `3ef6268`→`9aa8f37`: WC live-score diagnostic probe + structured logging + try/catch isolation
- SW_VERSION: 2026-06-13a → 2026-06-13g

## Relay commits (field-relay-nba)
- `3346134`: Movers prev rotation fix (was never initialized)
- `496a07e`: BracketDO writes movers to KV (bridged two movers systems)
- `11f2b3c`: /wc/bracket/refresh in probe allow-list + GET
- `7c04648`: Automated per-game WC briefs via JOURNALISM_QUEUE
- `273bfbd`: Brief prompt enriched with api-sports events (goals/cards/subs)
- `8451899`: /apisports prefix in probe allow-list (upstream inspection)
- `76d8ae3`: Kickoff lag — 15s football cache + rate-limit 503 guard
- `68b03f0`: HTTP 429 → 503 no-store (was cacheable 502)

## Three-issue investigation (DEFINITIVE)
1. **Live scores: PROVEN WORKING** — probe captured "70' · Switzerland 1 – Qatar 0", isLive=true, espnScores state=in. Score renders in card STAGE LINE (soccer design); hasScoreWrap:false is BY DESIGN.
2. **Kickoff cache lag: ROOT-CAUSED + FIXED** — relay served stale 'pre' ~30s after api-sports flipped to 1H (30s CF cache) + rate-limit empties. Fixed by 76d8ae3 + 68b03f0. Rate limit partly self-inflicted from heavy probing.
3. **'sport is not defined': NO LONGER FIRING** — intermittent (2 of 4 runs), deployed ~15215, double-forEach. Static analysis found no bare sport ref. try/catch (9aa8f37) catches + isolates without crashing loop. Post-fix probe: 0 pageerrors.

**No error at 1578** — confirmed via search + transcript grep. Client 1578=brace, relay 1578=odds-probs catch.

## Permanent diagnostic infra
`wc_score_probe.js` + `wc-score-probe.yml`. Loads FIELD with FIELD_DEBUG=1, captures console + stack traces + card DOM + espnScores, commits to outbox. Claude reads committed report — no manual console work. Lessons: networkidle never resolves on polling page (use domcontentloaded); espnScores module-scoped (expose on window in debug); /apisports prefix lets Claude inspect raw upstream.

## Automated WC journalism (operational)
Game final → writeWCResult → D1 + BracketDO recompute → movers (KV) → JOURNALISM_QUEUE game-brief (with api-sports events) → Claude Haiku + quality chain → KV brief:game:{id} → WS. **PENDING (highest leverage): client doesn't read /wc/brief/game/{id} + update matchupNote — relay half built.**

## Priority queue
1. **Client brief consumption** (~60 min) — relay endpoint + client fetch on final. HIGHEST LEVERAGE.
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
