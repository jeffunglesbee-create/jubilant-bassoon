# MLB Render Pipeline Audit — 2026-06-29

**FINAL STATUS: COMPLETE**
**Confidence: 100/100**
**HEAD:** SHA 4eb5c65
**Session doc:** Drive `1ztUK7jHHmWLMH0hdmNa-RKG2ZPlnyy5DXqDR3cOZl04`

---

## Done Condition Met

All 19 card schema fields mapped to source. 5 simplification opportunities ranked.
Drive doc written to `0ABxH84VndHL7Uk9PVA`.

---

## Confidence Breakdown

| Factor | Max | Actual | Notes |
|--------|-----|--------|-------|
| Render pipeline function found + read | 20 | 20 | normalizeMLBGame L19564, parseBroadcasts L19494 |
| parseBroadcasts fully read | 20 | 20 | MLB_BROADCAST_CHIP_MAP, Peacock time logic, MLBN all mapped |
| All 19 card fields mapped (no "?") | 25 | 25 | Full table in Drive doc |
| ≥3 simplification opportunities ranked | 20 | 20 | 5 ranked: isPlayoff/gameType, standings, espnGOTD, isNational, weather |
| Drive doc written | 15 | 15 | Drive ID `1ztUK7jHHmWLMH0hdmNa-RKG2ZPlnyy5DXqDR3cOZl04` |

**CONFIDENCE: 100/100**

---

## Key Findings

### normalizeMLBGame (L19564–19636)
Full output: 30+ fields including source, homeTeam, awayTeam, _homeAbbr, _awayAbbr,
status, period, venue, innings[], homePitcher, awayPitcher, _hpUmpire, _adapterProof.
Card spread at L19782 adds `_dataSource: g.source || null`.

### parseBroadcasts (L19494–19547)
- `MLB_BROADCAST_CHIP_MAP` (L7260): maps 6 network names → MLB_* codes
- Time-based Peacock logic: `PEACOCK_LEADOFF_HOUR_ET` + `SNB_NBC_CUTOFF`
- MLB Network → mlbnShowcase=true, localBlackedOut=true
- ESPN → skipped (GOTD undetectable by type field until verified)

### espnGOTD / peacockGOTD
Both set via static schedules (`ESPN_GOTD_SCHEDULE` L7307, `PEACOCK_GOTD_SCHEDULE` L7359).
NOT from API broadcast data. Manual update burden.

### Standings (fetchMLBStandingsParsed L27616)
Reads: W/L/pct/GB only. Does NOT read: magicNumber, clinchIndicator, eliminationNumber.
All three fields are on the same endpoint already called — additive change.

---

## Top 3 Simplification Opportunities

1. **`isPlayoff` from `gameType`** (L19576 normalizeMLBGame): add `isPlayoff: !['R','S','E','A'].includes(g.gameType ?? 'R')`. 4 re-derive call sites removed. LOW RISK.

2. **Standings `magicNumber` + `clinchIndicator`** (L27630): add `magic`, `clinch`, `elim` to standings push(). Powers late-season clinch badges. LOW RISK, same API call.

3. **`espnGOTD` auto-detect** (parseBroadcasts L19537): probe `broadcasts[].type` for GOTD game (today: LAA@SEA). If `type:'I'` confirmed, add auto-detection. Eliminates quarterly updates. MEDIUM RISK, probe required first.

---

## Session Trail

| Session | File | Confidence | Finding |
|---------|------|------------|---------|
| mlb-source-probe | `outbox/mlb-source-probe-2026-06-29.md` | 100 | statsapi HTTP 200, 13 games, 19/19 fields |
| mlb-client-audit | `outbox/mlb-client-audit-2026-06-29.md` | 85 | 6/15 endpoints consumed |
| mlb-source-confirm | `outbox/mlb-source-confirm-2026-06-29.md` | 100 | DEFINITIVE SOURCE: mlb-stats |
| **mlb-render-audit (this)** | **Drive `1ztUK7jHHmWLMH0hdmNa-RKG2ZPlnyy5DXqDR3cOZl04`** | **100** | **19/19 fields mapped, 5 opportunities ranked** |
