#!/usr/bin/env node
// Decides the one thing the DOM probe cannot: when no odds layer renders, is
// that the dominant no-odds state behaving correctly, or is opening_odds_parsed
// simply absent from /context/game?
//
// The DOM cannot answer it. buildOddsMovement returns null for no-odds and
// buildDebrief appends nothing, so "correctly rendering nothing" and "data never
// arrived" produce an identical DOM — the same collapse this whole thread is
// about, one layer further out.
//
// So: take finished games off /context/date, ask /context/game for each, and
// report whether the parsed odds field is there. Read-only, no key, no quota.

import { writeFileSync } from 'node:fs';

const RELAY = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DATE = (process.env.PROBE_DATE || new Date().toISOString().slice(0, 10)).trim();
const LIMIT = 8;

const m = { probed_at: new Date().toISOString(), date: DATE,
            finals_with_opening_odds_on_date: 0, checked: 0, games: [], error: null };

const get = async (p) => {
  const r = await fetch(`${RELAY}${p}`, { headers: { 'User-Agent': UA } });
  const t = await r.text();
  try { return { http: r.status, json: JSON.parse(t) }; }
  catch { return { http: r.status, json: null, raw: t.slice(0, 150) }; }
};

try {
  const day = await get(`/context/date/${DATE}`);
  const rows = day.json?.games?.regular;
  if (!Array.isArray(rows)) throw new Error(`games.regular not an array (http ${day.http})`);

  // Finished, and carrying odds in the archive — the population that SHOULD
  // produce a layer if the data reaches the client path.
  const finals = rows.filter(g => g.home_score != null && g.opening_odds);
  m.finals_with_opening_odds_on_date = finals.length;

  // The DOM join showed the client fetches /context/game/g18, not
  // /context/game/espn:401816164 — field.js:15709 documents that exact failure.
  // So ask BOTH forms and report the difference, rather than only the form the
  // client is supposed to use.
  for (const g of finals.slice(0, LIMIT)) {
    const id = g.espn_event_id ? `espn:${g.espn_event_id}` : g.id;
    const ctx = await get(`/context/game/${encodeURIComponent(id)}`);
    const gameObj = ctx.json?.game ?? null;
    m.games.push({
      archive_id: g.id, context_id: id, http: ctx.http,
      context_has_game_object: !!gameObj,
      opening_odds_parsed_present: !!(gameObj && gameObj.opening_odds_parsed),
      closing_odds_parsed_present: !!(gameObj && gameObj.closing_odds_parsed),
      keys_sample: gameObj ? Object.keys(gameObj).filter(k => /odds/i.test(k)).sort() : [],
    });

    m.checked++;
  }
} catch (e) { m.error = String(e.message || e); }

// The DOM probe reported the client's cards carry data-gameid="g16".."g25" and
// injectDebriefCards does `contextId = rawGame._gameId || gameId`, so when
// _gameId is unset it asks the relay for the SLATE id. field.js:15709 documents
// that exact failure. Ask for those ids and show what comes back.
const SLATE_IDS = (process.env.SLATE_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
m.slate_id_probe = [];
for (const sid of SLATE_IDS) {
    try {
        const r = await get(`/context/game/${encodeURIComponent(sid)}`);
        const g = r.json?.game ?? null;
        m.slate_id_probe.push({
            id: sid, http: r.http,
            has_game_object: !!g,
            opening_odds_parsed_present: !!(g && g.opening_odds_parsed),
            has_briefs: !!(r.json?.archive?.gameBriefs?.length),
            top_keys: r.json ? Object.keys(r.json).sort() : null,
        });
    } catch (e) { m.slate_id_probe.push({ id: sid, error: String(e.message || e) }); }
}
if (SLATE_IDS.length) {
    const withGame = m.slate_id_probe.filter(x => x.has_game_object).length;
    console.log(`\nslate-id form: game object present on ${withGame} of ${SLATE_IDS.length}`);
}

const stamp = m.probed_at.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const out = `outbox/context-game-odds-${stamp}.json`;
writeFileSync(out, JSON.stringify(m, null, 2) + '\n');
console.log(JSON.stringify(m, null, 2));
console.log(`\nwrote ${out}`);
const withParsed = m.games.filter(g => g.opening_odds_parsed_present).length;
console.log(`\nchecked ${m.checked} of ${m.finals_with_opening_odds_on_date} finals carrying opening_odds on ${DATE} (Rule 91)`);
console.log(`opening_odds_parsed present on ${withParsed} of ${m.checked}`);
if (m.error) { console.error(`PROBE ERROR: ${m.error}`); process.exit(1); }
if (!m.checked) { console.log('\nNo finished game with archive odds on this date — nothing to decide from.'); process.exit(0); }
console.log(withParsed
  ? '\nData REACHES the client path — a missing layer is the render, not the data.'
  : '\nData does NOT reach the client path — /context/game omits opening_odds_parsed, so both odds layers are correctly null.');
