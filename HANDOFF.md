# FIELD HANDOFF — June 20 2026

## State
- Client: `eb33d5a` (2026-06-20h)
- Relay: `73f707a` (odds backfill) + `a99ad2f` (voice v4 prompts)
- Relay CC: `202a087` (odds backfill budget-aware rewrite)
- Smoke: 718/0
- Rules: 1-79 (Rule 77 = PRIME DIRECTIVE)

## Shipped This Session

### Governance (Rules 69-79)
- Rules 69-71: anti-rewrite (TOUCH-ONLY-A, ATOMIC-A, CONTEXT-A)
- Rules 72-79: CHALLENGE-A, CLAIM-CONTEXT-A, STAGED-GATE-A, PROMPT-SPEC-A, FALLBACK-CAP-A, NO-RATIONALIZE-A, API-COST-A, PROMPT-HEAD-A
- Rule 77 elevated to PRIME DIRECTIVE (above Rules 1 and 2)
- Client commits: d28fde6 → e545cfa → c410ce3
- Relay commits: 412964f → cfd2914 → 202e9ad

### Rule 76 Full Enforcement
- `_gameSport(g)` centralizer: 64 raw sport fallback chains replaced
- 10 dead golf `pgaData.event`/`pgaData.tournament` paths collapsed
- Assertions rewritten: A662, A263, A266, A290, A372, new A715
- P0 bug found + fixed: `_gameSport` infinite recursion from bulk regex replacing function body

### Linescore Fix
- Raw `[LINE SCORE]` removed from all 3 journalism prompt surfaces
- `buildScoreNarrativeContext` (analytical) remains as sole score source

### Voice Positioning v4
- Register: WARM / WISE / UPLIFTING / CHEEKY / WRY
- Core synthesis: institutional duty and joyful storytelling are intertwined
- "The truth is the fun part. Let it be fun."
- Client FIELD_VOICE_EXEMPLARS updated (eb33d5a)
- 4 relay cron prompts updated (a99ad2f)
- A370 smoke assertion updated for v4 verification

### Golf Per-Round Briefs
- Relay cron enqueues recap when round status = complete/official/final
- Top 15 leaderboard, venue, cut line in prompt
- Dedup via KV key `brief:golf:round:{eventId}:R{round}` (24h TTL)
- Current: US Open R3 in progress, Clark -7 at Shinnecock Hills

### Null-Sport Brief Fix
- KV sweep checks D1 for existing sport-tagged brief before inserting null-sport row
- Cleanup query deletes null-sport rows where sport-tagged sibling exists

### Odds History Backfill
- GitHub Actions workflow + Node.js script (CC-parsed, 202a087)
- Budget-aware: checks x-requests-remaining FIRST, stops at 2,700 TOTAL daily ceiling
- Fully automated — no manual inputs, self-managing
- Relay endpoint: GET /odds/history/:game_id
- D1 tables: odds_history, odds_backfill_progress

### WC Journalism Verification
- 69 WC briefs across 5 types verified healthy
- 4 WARNs investigated — all transient or working-as-designed

## Documents Created

| Document | Drive ID |
|----------|----------|
| The 33: Definitive Feature List | `1XDR6lzgP3vBH4Yg9Byb9C4GGAjKxuJRcV7bkF8pf4wk` |
| Product Feature Inventory v2 | `1BbOqlV9JhFlCvwgfizNQW9LMG6lnNrNTp4yUgi7ZC2o` |
| Analytics Cron Engine Spec | `11ZEVhxGoFxapYGkigjapmM6-ruaYVTKBu1G0NQF5jfw` |
| Unified Health Layer v2 | `1SeBzCABXWjaMhiL021vffYjfVIYcI5YOVBKk5XD5BkU` |

## Key Decisions

- **Voice v4**: Register shifted from wise/intelligent/cheeky/wry/lightly cynical → warm/wise/uplifting/cheeky/wry. Institutional duty and joy are intertwined, not in tension.
- **The 33**: 42 specced features consolidated to 33 via v4 voice combines. 5 merges: Morning Report (from #89/#100/#94/#104/#109), FIELD's Pick (from #92/#98), Reality Check (from #95/#99), The Flip Side (Rewrite + Flip Side), The Truth Is (v4-native).
- **Zero deletion policy**: Context Graph data is never pruned. Briefs are an appreciating asset (~24MB/year, D1 5GB = 200+ years).
- **Circadian is cornerstone**: Should not have been excluded from v4 analysis. v4 register per mode: PREVIEW→wise, PRIME→uplifting, NIGHT→cheeky, LATE→warm.
- **Cost analysis updated**: At 100 users with full O(1) Newspaper: $6/mo total. Break-even: 33 subscribers at $5/mo.

## Compliance Verified
- RUWT: zero interestLevel/compositeScore refs, drama classification client-side only
- ADR-002: relay stores but never computes drama
- Rule 47: dramaScore/watchVerdict/preGameScore all client-side only
- BNI/EMBER patent fixes: COMPLETE (verified May 28)
- All data sources legitimate (paid subscriptions or public APIs)
- Zero article prose scraping

## Today's Slate (June 20)
- 14 MLB (auto V2)
- 3 WNBA (auto V2)
- 4 WC: BRA 3-0 HAI ✓, TUR 0-1 PAR ✓, NED 5-1 SWE ✓, GER vs CIV 20:00Z
- US Open R3: Clark -7, in progress
- 0 NHL, 0 NBA
- No manual schedule changes needed

## Next Session Priority
1. Analytics Cron CC Prompt 1 (foundation + Night Stars + health module) — 65 min
2. O(1) Newspaper full KV coverage — 30 min
3. Analytics Cron CC Prompt 2 (Morning Report + Truth Is + Pick) — 55 min
4. The Debrief — 4 hrs
5. Soccer Intelligence commentary endpoint — 65 min (WC live)

## Pending
- API-Sports Football Pro renewal decision (June 29 deadline)
- NFL SPORT_TO_V2 (Sept 9 deadline)
- Privacy Policy + GDPR (commercial deployment gate)
- P16 retroactive drama estimation (prompt written, not executed)
- Odds backfill workflow running daily (deployed, self-managing)
