// Timeline probe: do V2-injected sport sections (NFL, MLS…) survive the
// supplemental/tennis merge in fetchSchedule, and if they vanish, do they come
// back? Samples the filter chips and the Stats tab's NFL scout rows every 10s
// for SAMPLE_S seconds after boot, and timestamps every /v2/games?sport=nfl and
// tennis response, so "when did NFL disappear, and what had just arrived" is
// read from the record rather than inferred.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1';
const SAMPLE_S = Number(process.env.SAMPLE_S || 60);
const TS = new Date().toISOString().replace(/[:.]/g, '-');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  const t0 = Date.now();
  const at = () => +((Date.now() - t0) / 1000).toFixed(1);
  const net = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (!/\/v2\/games\?sport=(nfl|mls)|tennis|\/nflverse\//i.test(u)) return;
    let n = null;
    try { const j = await r.json(); n = Array.isArray(j?.games) ? j.games.length : (Array.isArray(j) ? j.length : (j?.data ? `data:${Object.keys(j.data).length} season:${j.season}` : null)); } catch (e) { n = `unparsed: ${e.message}`; }
    net.push({ t: at(), status: r.status(), url: u.replace(/^https?:\/\/[^/]+/, ''), games: n });
  });
  const failed = [];
  page.on('requestfailed', (r) => { if (/nflverse|v2\/games/.test(r.url())) failed.push({ t: at(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), why: r.failure()?.errorText }); });
  const out = { url: URL, ts: TS, sampleSeconds: SAMPLE_S, samples: [], net, failed };
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (let s = 0; s <= SAMPLE_S; s += 10) {
      const wait = t0 + s * 1000 - Date.now();
      if (wait > 0) await page.waitForTimeout(wait);
      const chips = await page.evaluate(() =>
        [...document.querySelectorAll('button, .filter-btn, [data-filter]')]
          .map((b) => (b.textContent || '').trim()).filter((x) => /^[A-Z][A-Z .()]*\(\d+\)$/.test(x)));
      const nflCards = await page.evaluate(() =>
        [...document.querySelectorAll('.game-card')].filter((c) => /Jaguars|Texans|Falcons|Eagles|Chiefs/.test(c.textContent || '')).length);
      out.samples.push({ t: at(), chips, nflCards, errors: await page.evaluate(() =>
        (window._fieldErrors || []).filter((e) => /v2|tennis|inject|supplement/i.test(e.fn || '')).map((e) => `${e.fn}: ${e.err}`).slice(-5)) });
    }
    await page.click('#stats-nav-link', { timeout: 15000 });
    await page.waitForTimeout(6000);
    out.statsNFLScoutGames = await page.evaluate(() => {
      const sec = document.getElementById('stats-section');
      return [...(sec?.querySelectorAll('.stats-subsection') || [])]
        .map((s) => ({ h: s.querySelector('.stats-subsection-label')?.textContent?.trim() || '',
                       labels: [...s.querySelectorAll('.bs-scout-lbl')].map((x) => x.textContent.trim()) }))
        .filter((g) => g.labels.includes('Team EPA')).map((g) => `${g.h} (${g.labels.length} rows)`);
    });
    out.swVersion = await page.evaluate(() => window.SW_VERSION || null);
  } catch (e) { out.error = String(e?.message || e); }
  await browser.close();
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/sport-section-timeline-${TS}.json`, JSON.stringify(out, null, 2));
  fs.writeFileSync('outbox/sport-section-timeline-latest.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();
