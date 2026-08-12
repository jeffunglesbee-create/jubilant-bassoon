// Serves BOTH:
//   CC-CMD-2026-08-12-mlb-pitcher-payload-audit      Task 1 (render side)
//   CC-CMD-2026-08-12-scouting-coverage-gaps          Task 1
//
// One browser run rather than two near-identical ones: both specs need the
// same per-game row inventory out of the Stats tab's Today's Games, and each
// outbox doc cites the fields it needs. The manifest is a concrete artifact
// for both claims (Rule 90); what it must not do is collapse them into a
// single verdict, so it reports per-concern counters separately and takes no
// overall pass/fail position.
//
// Mechanism from comeback_liveness_probe.js, including ?wpt -- this repo's own
// first-visit-modal bypass (index.html ~L5097). Without it the click on
// #stats-nav-link is intercepted by #setup-overlay and the run measures
// nothing while still returning a plausible-looking result.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1';
const TS = new Date().toISOString().replace(/[:.]/g, '-');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  const manifest = { url: URL, ts: TS };

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.game-card', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(8000);

    manifest.moduleBooted = await page.evaluate(() => document.querySelectorAll('.game-card').length > 0);
    manifest.swVersion = await page.evaluate(() => window.SW_VERSION || null);
    manifest.setupOverlayVisible = await page.evaluate(() => {
      const ov = document.getElementById('setup-overlay');
      return !!ov && getComputedStyle(ov).display !== 'none';
    });

    await page.click('#stats-nav-link', { timeout: 15000 });
    await page.waitForTimeout(6000);

    const data = await page.evaluate(() => {
      const sec = document.getElementById('stats-section');
      if (!sec) return { statsSectionPresent: false };
      const blocks = [...sec.querySelectorAll('.stats-sport-block')];
      const tg = blocks.find((b) =>
        (b.querySelector('.stats-sport-label')?.textContent || '').includes("Today's Games"));
      if (!tg) return { statsSectionPresent: true, todayGamesBlockPresent: false };

      const games = [...tg.querySelectorAll('.stats-subsection')].map((sub) => {
        const header = sub.querySelector('.stats-subsection-label')?.textContent?.trim() || '';
        // The scouting table's label/value pairs. Labels are the row keys
        // ('Park', 'Umpire', and a team nickname per pitcher row).
        const rows = [...sub.querySelectorAll('.bs-scout-table .rai-row, .bs-scout-table > div')]
          .map((r) => r.textContent.trim()).filter(Boolean);
        const text = sub.textContent || '';
        // Records line shape: "Nick: W–L · Nick: W–L" (en dash U+2013,
        // middot separator) as built at src/legacy/field.js:31036.
        const recordsRe = /:\s*\d+[–-]\d+\s*·/;
        return {
          header,
          rowTexts: rows,
          parkRowPresent: /(^|\b)Park\b/i.test(rows.join('\n')) || /Park\s/i.test(text),
          umpireRowPresent: /Umpire/i.test(rows.join('\n')) || /Umpire/i.test(text),
          recordsRowPresent: recordsRe.test(text),
          // Pitcher enrichment: these only appear when the value string
          // carries them. ERA and W-L are literal shapes from fmtP:
          //   `${name} · ${era} ERA · ${wins}-${losses} · <em>X</em> tempo ...`
          hasEra: /\d+\.\d+\s*ERA/.test(text),
          hasRecord: /·\s*\d+-\d+(\s|·|$)/.test(text),
          hasTempo: /tempo/i.test(text),
          hasArsenal: /%\s*whiff/i.test(text),
        };
      });

      return {
        statsSectionPresent: true,
        todayGamesBlockPresent: true,
        todayGameCount: games.length,
        games,
      };
    });
    Object.assign(manifest, data);

    if (manifest.games) {
      const g = manifest.games;
      manifest.counters = {
        todayGameCount: g.length,
        parkRowPresent: g.filter((x) => x.parkRowPresent).length,
        parkRowMissing: g.filter((x) => !x.parkRowPresent).length,
        recordsRowPresent: g.filter((x) => x.recordsRowPresent).length,
        recordsRowMissing: g.filter((x) => !x.recordsRowPresent).length,
        gamesWithEra: g.filter((x) => x.hasEra).length,
        gamesWithRecord: g.filter((x) => x.hasRecord).length,
        gamesWithTempo: g.filter((x) => x.hasTempo).length,
        gamesWithArsenal: g.filter((x) => x.hasArsenal).length,
      };
      manifest.gamesMissingPark = g.filter((x) => !x.parkRowPresent).map((x) => x.header);
      manifest.gamesMissingRecords = g.filter((x) => !x.recordsRowPresent).map((x) => x.header);
    }

    await page.screenshot({ path: `outbox/stats-tab-scouting-${TS}.png`, fullPage: false });
  } catch (e) {
    manifest.error = String(e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }

  // Deliberately NO overall `pass`. This manifest answers two different
  // questions for two different CC-CMDs; a single verdict would let one
  // concern's green wave the other one through.
  manifest.measured =
    manifest.moduleBooted === true &&
    manifest.todayGamesBlockPresent === true &&
    (manifest.todayGameCount || 0) > 0;

  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/stats-tab-scouting-manifest-${TS}.json`, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ...manifest, games: (manifest.games || []).slice(0, 3) }, null, 2));
  process.exit(0);
})();
