#!/usr/bin/env node
// TASK 0 of CC-CMD-2026-09-11-client-odds-story: what does the relay ACTUALLY
// emit, as opposed to what the CC-CMD says it emits.
//
// The CC-CMD states that field-relay-nba context-assembler.js:462 "assembles an
// odds story onto the context payload", and asks for the real wire field name.
// Reading the relay at HEAD says otherwise, and this probe is here to settle it
// against the live service rather than against my reading:
//
//   - computeOddsStory returns a STRING and is consumed in two places, both
//     journalism-side: a prompt directive in context-assembler.js, and the
//     /odds-story/preview diagnostic. `odds_story` appears once in the relay,
//     as a context-BLOCK id (context-assembler.js:1701), not a wire key.
//   - /context/date/{date} is `SELECT * FROM regular_season_games`, so the wire
//     carries the raw opening_odds / closing_odds columns.
//
// That difference decides the whole task. computeOddsStory returns '' for BOTH
// "no odds" and "both prices, moved less than the threshold" (|ML diff| < 10),
// so the producer collapses exactly the two states the CC-CMD requires the
// client to tell apart. The raw columns carry captured_at and do not.
//
// Read-only. No key, no quota, no writes.

import { writeFileSync } from 'node:fs';

const RELAY = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DATES = (process.env.PROBE_DATES || '2026-09-10,2026-09-08,2026-09-06')
    .split(',').map(s => s.trim()).filter(Boolean);

const m = { probed_at: new Date().toISOString(), dates: DATES,
            wire: {}, coverage: [], sample_odds_value: null,
            odds_story_key_present_anywhere: false, error: null };

function parseOdds(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return 'UNPARSEABLE'; }
}

for (const date of DATES) {
    try {
        const r = await fetch(`${RELAY}/context/date/${date}`, { headers: { 'User-Agent': UA } });
        const t = await r.text();
        let j = null;
        try { j = JSON.parse(t); } catch { m.error = `non-JSON for ${date}: ${t.slice(0, 160)}`; continue; }

        // Rule: a proxy page that happens to parse is not a relay answer.
        const rows = j?.games?.regular;
        if (!Array.isArray(rows)) {
            m.error = `${date}: games.regular is ${typeof rows} — shape not as expected. top keys: ${JSON.stringify(Object.keys(j || {}))}`;
            continue;
        }

        if (!m.wire.game_keys && rows.length) {
            m.wire.game_keys = Object.keys(rows[0]).sort();
            m.wire.odds_story_on_game = m.wire.game_keys.filter(k => /odds.?story/i.test(k));
            m.wire.top_level_keys = Object.keys(j).sort();
        }
        if (JSON.stringify(j).match(/odds_?[Ss]tory/)) m.odds_story_key_present_anywhere = true;

        let both = 0, identicalML = 0, differentML = 0, openingOnly = 0, none = 0, sameCapture = 0;
        const perSport = {};
        for (const g of rows) {
            const o = parseOdds(g.opening_odds), c = parseOdds(g.closing_odds);
            const sp = g.sport || '?';
            perSport[sp] = perSport[sp] || { rows: 0, both: 0 };
            perSport[sp].rows++;
            if (!o) { none++; continue; }
            if (!c) { openingOnly++; continue; }
            both++; perSport[sp].both++;
            if (!m.sample_odds_value && o !== 'UNPARSEABLE') {
                m.sample_odds_value = { id: g.id, opening_keys: Object.keys(o).sort(),
                                        opening: o, closing: c === 'UNPARSEABLE' ? c : c };
            }
            const oh = o?.moneyline?.home, ch = c?.moneyline?.home;
            if (oh != null && ch != null) (oh === ch ? identicalML++ : differentML++);
            // The trap from ODDS-PROOF.md: same captured_at means one observation
            // recorded twice, which must NOT render as "unchanged".
            if (o?.captured_at && c?.captured_at && o.captured_at === c.captured_at) sameCapture++;
        }
        m.coverage.push({ date, rows: rows.length, both, identicalML, differentML,
                          openingOnly, none, same_captured_at: sameCapture,
                          per_sport: perSport });
    } catch (e) { m.error = `${date}: ${String(e.message || e)}`; }
}

const stamp = m.probed_at.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const out = `outbox/odds-story-wire-${stamp}.json`;
writeFileSync(out, JSON.stringify(m, null, 2) + '\n');
console.log(JSON.stringify(m, null, 2));
console.log(`\nwrote ${out}`);
console.log(`\nprobed ${m.coverage.length} of ${DATES.length} requested dates (Rule 91)`);
if (m.error) { console.error(`PROBE ERROR: ${m.error}`); process.exit(1); }
if (!m.coverage.length) { console.error('no dates returned data — nothing was measured'); process.exit(1); }
