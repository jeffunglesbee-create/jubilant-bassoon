// past_date_cups_probe.js — the DEPLOYED page, on PAST dates, asked about the FA Cup, the EFL Cup and the EFL Trophy.
// Relay CC-CMD-2026-08-08-fa-cup-coverage Task 6 (owner: "yes all 3", 2026-11-11). Dispatch-only (workflow past-date-cups-probe.yml), CI-as-proxy (Rule 90): the
// sandbox cannot load the deployed page in a browser.
//
// What it does. For each (competition, date) it calls the page's own window.goToDate(iso) on a date before today, waits for the render to settle, and reads the DOM:
// the .sport-section[data-sport=<label>] and the .game-card[data-sport=<label>] it drew, with their data-home / data-away. In the same run it reads the relay's
// /v2/games?sport=<key>&date=<iso> with Node's fetch, which is the independent source the page's own request was answered from, and compares the two as COUNTS and as SETS
// of "home|away" names. The page is compared with the source, not with itself.
//
// CONTROLS, so the probe can report what it claims to read (Rule 90, Rule 91):
//   positive  the Premier League on 2026-11-07, which past-date navigation has always shown: the page's cards must equal the relay's. If this fails the reading is broken
//             and a zero for the cups would mean nothing.
//   negative  a date on which the relay has NO game for a cup: the page must show 0 sections and 0 cards for it (absence is readable).
//
// The EFL Trophy's dates are DISCOVERED (the relay answered 200 with no games on every date tried by hand), by scanning the relay for the dates with games; how many dates were
// scanned and found is printed, and a Trophy with no date found is reported as such, not as a pass.
//
// "PAST" IS THE PAGE'S, NOT UTC'S. The first run (2026-11-11T03:23Z, which is 22:23 on 11-10 in New York) judged the Trophy on 2026-11-10, a date the relay lists and the page calls TODAY:
// goToDate takes its today branch (fetchSchedule, the ESPN sweep), not the relay path under test, and the headless browser is answered empty by ESPN, so it drew 0 cards and the verdict
// read FAIL for a reason that was the probe's. Now every scan starts from the page's own window.TODAY_ISO minus one day, every case records pastBranch (date < TODAY_ISO), and a case
// that is not on the past branch makes the verdict BROKEN-DATE instead of a verdict about the cups.
//
// Output: outbox/past-date-cups-probe-manifest-<ts>.json (booleans and counts, not prose) and outbox/past-date-cups-probe-<ts>.png (the FA Cup section, 2026-11-07).
const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const FIELD_URL = BASE + '?wpt';                       // ?wpt skips the first-visit modal (scripts/check-probe-wpt.mjs)
const RELAY = process.env.RELAY_URL || 'https://field-relay-nba.jeffunglesbee.workers.dev';

const CUPS = [
  { key: 'facup', label: 'FA Cup', dates: ['2026-11-07', '2026-11-08'] },
  { key: 'eflcup', label: 'EFL Cup', dates: ['2026-10-28', '2026-10-27'] },
  { key: 'efltrophy', label: 'EFL Trophy', dates: null },     // discovered below
];

async function relayGames(key, iso) {
  try {
    const r = await fetch(`${RELAY}/v2/games?sport=${key}&date=${iso}`, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return { ok: false, status: r.status, games: [] };
    const j = await r.json();
    const games = (Array.isArray(j.games) ? j.games : []).filter(g => g && g.home && g.home.name && g.away && g.away.name);
    return { ok: true, status: r.status, games: games.map(g => `${g.home.name}|${g.away.name}`) };
  } catch (e) { return { ok: false, status: String(e && e.message || e), games: [] }; }
}
const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

(async () => {
  const out = { at: new Date().toISOString(), url: FIELD_URL, relay: RELAY, cases: [], controls: {}, errors: [], coverage: '' };

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') out.errors.push(m.text().slice(0, 200)); });
  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.goToDate === 'function', null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  out.swVersion = await page.evaluate(() => window.SW_VERSION || null);
  const todayIso = await page.evaluate(() => window.TODAY_ISO || null);   // the page's own today (ET, rolls over at 04:00): what goToDate compares with
  out.todayIso = todayIso;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayIso || '')) { out.verdict = 'BROKEN-READING'; out.coverage = 'window.TODAY_ISO was not readable, so no date can be called past'; fs.mkdirSync('outbox', { recursive: true }); fs.writeFileSync(`outbox/past-date-cups-probe-manifest-${out.at.replace(/[:.]/g, '-')}.json`, JSON.stringify(out, null, 2)); console.log(JSON.stringify({ verdict: out.verdict, todayIso })); await browser.close(); process.exit(1); }

  // discover the EFL Trophy's dates: the 90 days BEFORE the page's today, 6 requests at a time, and keep the two most recent with games
  const scanDays = Array.from({ length: 90 }, (_, i) => addDays(todayIso, -(i + 1)));
  const found = [];
  for (let i = 0; i < scanDays.length; i += 6) {
    const batch = await Promise.all(scanDays.slice(i, i + 6).map(async d => ({ d, r: await relayGames('efltrophy', d) })));
    for (const b of batch) if (b.r.ok && b.r.games.length) found.push({ date: b.d, games: b.r.games.length });
  }
  found.sort((a, b) => (a.date < b.date ? 1 : -1));
  out.trophyScan = { scanned: scanDays.length, from: scanDays[scanDays.length - 1], to: scanDays[0], datesWithGames: found };
  CUPS[2].dates = found.slice(0, 2).map(f => f.date);

  // goToDate(iso), then wait for the slate to settle: the card count is non-zero and unchanged for two reads 1.5 s apart, or the page shows its empty note
  const settle = async () => {
    let last = -1, same = 0;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1500);
      const s = await page.evaluate(() => ({ cards: document.querySelectorAll('.game-card').length, empty: !!document.querySelector('.empty-note') }));
      if (s.empty && s.cards === 0) return { settled: true, cards: 0, empty: true };
      if (s.cards > 0 && s.cards === last) { if (++same >= 1) return { settled: true, cards: s.cards, empty: false }; } else same = 0;
      last = s.cards;
    }
    return { settled: false, cards: last, empty: false };
  };
  const read = async (label) => page.evaluate(l => {
    const cards = [...document.querySelectorAll(`.game-card[data-sport="${l}"]`)].map(c => `${c.getAttribute('data-home')}|${c.getAttribute('data-away')}`);
    return { sections: document.querySelectorAll(`.sport-section[data-sport="${l}"]`).length, cards };
  }, label);
  const judge = async (label, key, iso) => {
    await page.evaluate(d => window.goToDate(d), iso);
    const s = await settle();
    const [pg, rl] = await Promise.all([read(label), relayGames(key, iso)]);
    const pgSet = new Set(pg.cards), rlSet = new Set(rl.games);
    const missing = [...rlSet].filter(x => !pgSet.has(x)), extra = [...pgSet].filter(x => !rlSet.has(x));
    return { label, key, date: iso, pastBranch: iso < todayIso, settled: s.settled, pageCardsTotal: s.cards, relayOk: rl.ok, relayGames: rl.games.length, sections: pg.sections, cards: pg.cards.length,
             countEqual: pg.cards.length === rl.games.length, namesEqual: missing.length === 0 && extra.length === 0, missingOnPage: missing.slice(0, 5), extraOnPage: extra.slice(0, 5) };
  };

  // controls first
  out.controls.positive = await judge('Premier League', 'epl', '2026-11-07');
  out.controls.negative = await judge('FA Cup', 'facup', '2026-10-20');
  const posOk = out.controls.positive.settled && out.controls.positive.relayOk && out.controls.positive.relayGames > 0 && out.controls.positive.countEqual && out.controls.positive.namesEqual;
  const negOk = out.controls.negative.settled && out.controls.negative.relayOk && out.controls.negative.relayGames === 0 && out.controls.negative.cards === 0 && out.controls.negative.sections === 0;
  out.controls.ok = !!(posOk && negOk);

  for (const cup of CUPS) for (const d of (cup.dates || [])) {
    out.cases.push(await judge(cup.label, cup.key, d));
    if (cup.key === 'facup' && d === '2026-11-07') {
      const sec = await page.$('.sport-section[data-sport="FA Cup"]');
      if (sec) { await sec.scrollIntoViewIfNeeded(); await sec.screenshot({ path: `outbox/past-date-cups-probe-${out.at.replace(/[:.]/g, '-')}.png` }).catch(e => out.errors.push('screenshot: ' + e.message)); }
    }
  }
  const cupsWithDates = CUPS.filter(c => (c.dates || []).length).map(c => c.key);
  const perCup = Object.fromEntries(CUPS.map(c => [c.key, out.cases.filter(x => x.key === c.key)]));
  out.summary = {
    controlsOk: out.controls.ok,
    allDatesOnThePastBranch: allPast,
    casesRun: out.cases.length,
    cupsWithNoDateToJudge: CUPS.filter(c => !(c.dates || []).length).map(c => c.key),
    perCup: Object.fromEntries(Object.entries(perCup).map(([k, v]) => [k, { dates: v.map(x => x.date), allSettled: v.every(x => x.settled), allSectionsPresent: v.length > 0 && v.every(x => x.sections === 1), allCountsEqual: v.length > 0 && v.every(x => x.relayGames > 0 && x.countEqual), allNamesEqual: v.length > 0 && v.every(x => x.namesEqual) }])),
  };
  const allPast = [out.controls.positive, out.controls.negative, ...out.cases].every(c => c.pastBranch === true);
  const cupsPass = cupsWithDates.length === 3 && Object.values(out.summary.perCup).every(c => c.allSettled && c.allSectionsPresent && c.allCountsEqual && c.allNamesEqual);
  out.verdict = !allPast ? 'BROKEN-DATE' : !out.controls.ok ? 'BROKEN-READING' : cupsPass ? 'PASS' : (out.summary.cupsWithNoDateToJudge.length ? 'PARTIAL-NO-DATE-FOR-' + out.summary.cupsWithNoDateToJudge.join(',').toUpperCase() : 'FAIL');
  out.coverage = `one viewport (1440x900, America/New_York), one load of ${BASE}; window.goToDate called for ${out.cases.length + 2} dates (2 controls); cards compared with the relay's /v2/games read in the same run (counts and home|away sets); the page's own today was ${todayIso} and every judged date is before it; the EFL Trophy's dates were found by scanning the ${scanDays.length} days ${scanDays[scanDays.length - 1]}..${scanDays[0]} (${found.length} with games); scores, streams and live behaviour are NOT judged here, only which games a past day lists`;
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/past-date-cups-probe-manifest-${out.at.replace(/[:.]/g, '-')}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ verdict: out.verdict, todayIso, controls: out.controls.ok, summary: out.summary, trophyScan: out.trophyScan, swVersion: out.swVersion }, null, 2));
  await browser.close();
  process.exit(out.verdict === 'PASS' ? 0 : 1);
})().catch(e => { console.error('probe crashed:', e); process.exit(2); });
