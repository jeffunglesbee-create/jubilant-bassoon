// today_sections_probe.js — does today's slate give every sport whose scores
// arrive a section of cards? Runs against the LIVE deploy; commits a manifest
// and a screenshot to outbox/.
// CC-CMD-2026-10-24-nhl-nba-today-sections, done condition 3: on 2026-10-24 the
// live page held 12 NHL and 8 NBA games in espnScores and rendered 0 cards for
// either, because nothing created their sections.
//
// The verdict is per sport, from the page itself: a V2 sport with games for
// TODAY in espnScores must have cards. A sport with no games today is not a
// failure. The coverage line says which sports were judged (Rule 91).

const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const OUT = 'outbox';
const WATCH = (process.env.WATCH || 'nhl,nba').split(',').map(s => s.trim()).filter(Boolean);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // The V2 poll injects sections after its first round trip. Sample until the
  // per-sport card counts are equal three times in a row (or 90 s pass).
  const read = () => page.evaluate(() => {
    const cards = {};
    document.querySelectorAll('.game-card[data-sport]').forEach(e => {
      const s = e.getAttribute('data-sport'); cards[s] = (cards[s] || 0) + 1;
    });
    // The ET day is computed here, not with the page's isToday: the probe must
    // not trust the code it is judging, and a missing helper must not turn
    // every sport into "no games today", which would pass vacuously.
    const todayIso = (typeof TODAY_ISO !== 'undefined' && TODAY_ISO) || window.TODAY_ISO || null;
    const etDay = (iso) => {
      const t = Date.parse(iso || '');
      return Number.isFinite(t) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(t)) : null;
    };
    const scores = {};
    for (const v of Object.values(window.espnScores || {})) {
      const k = (v && v._sport) || '?';
      const day = v && etDay(v.start_time);
      const today = day && todayIso ? day === todayIso : null;
      scores[k] = scores[k] || { all: 0, today: 0, unknownDay: 0 };
      scores[k].all++;
      if (today === true) scores[k].today++;
      else if (today === null) scores[k].unknownDay++;
    }
    const chips = [...document.querySelectorAll('.chip, .filter-chip, [data-filter]')]
      .map(c => c.textContent.trim()).filter(Boolean).slice(0, 60);
    return { cards, scores, chips, sw: window.SW_VERSION || null, today: todayIso,
             viewing: typeof viewingISO !== 'undefined' ? viewingISO : null };
  });
  const samples = [];
  let last = '', same = 0, state = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    await page.waitForTimeout(5000);
    state = await read();
    const key = JSON.stringify(state.cards);
    samples.push({ t: Math.round((Date.now() - t0) / 1000), cards: state.cards });
    same = key === last ? same + 1 : 0;
    last = key;
    if (same >= 2) break;
  }

  // Label each watched V2 key the way the page labels it.
  const LABEL = { nhl: 'NHL', nba: 'NBA', wnba: 'WNBA', cfb: 'College Football', nfl: 'NFL', mls: 'MLS Soccer' };
  const judged = WATCH.map(k => {
    const s = state.scores[k] || { all: 0, today: 0, unknownDay: 0 };
    const cards = state.cards[LABEL[k] || k] || 0;
    const expected = s.today > 0;
    // Games whose day could not be read are not "no games today".
    const verdict = expected ? (cards > 0 ? 'PASS' : 'FAIL')
      : s.unknownDay > 0 ? 'UNJUDGEABLE' : 'NO GAMES TODAY';
    return { key: k, label: LABEL[k] || k, scoresToday: s.today, scoresAll: s.all, unknownDay: s.unknownDay, cards, verdict };
  });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const shot = `${OUT}/today-sections-probe-${ts}.png`;
  try { await page.screenshot({ path: shot, fullPage: false, timeout: 10000 }); } catch (_) { /* recorded below */ }
  const manifest = {
    probed_at: new Date().toISOString(), url: FIELD_URL, sw_version: state.sw, today_iso: state.today,
    viewing_iso: state.viewing, judged, cards_by_sport: state.cards, espn_scores_by_sport: state.scores,
    chips: state.chips, settle_samples: samples, console_errors: errors.slice(0, 20),
    screenshot: fs.existsSync(shot) ? shot : null,
    coverage: `judged ${judged.filter(j => j.verdict === 'PASS' || j.verdict === 'FAIL').length} of ${judged.length} watched sports (${WATCH.join(', ')}); a sport with no games today in espnScores is not judged, and one whose games' days cannot be read fails`,
  };
  fs.writeFileSync(`${OUT}/today-sections-probe-manifest-${ts}.json`, JSON.stringify(manifest, null, 2));
  for (const j of judged) console.log(`${j.verdict.padEnd(15)} ${j.label}: ${j.cards} cards, ${j.scoresToday} games today in espnScores`);
  console.log(manifest.coverage);
  await browser.close();
  process.exit(judged.some(j => j.verdict === 'FAIL' || j.verdict === 'UNJUDGEABLE') || !state.today ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
