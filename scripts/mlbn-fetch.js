#!/usr/bin/env node
/**
 * mlbn-fetch.js — Fetch MLB Network Regular Season Games schedule
 *
 * The mlb.com/network/shows/regular-season-games page is JS-rendered.
 * web_fetch returns empty. statsapi broadcasts(all) does NOT include MLBN
 * for regular carry games (confirmed May 28 2026 cors-probe).
 * This Puppeteer script runs in GitHub Actions (via mlbn-schedule.yml),
 * executes the page's JavaScript, extracts the game table, and writes
 * structured JSON to outbox/mlbn-schedule.json.
 *
 * FIELD reads that JSON from raw.githubusercontent.com at runtime to
 * auto-tag MLBN games with mlbnShowcase:true (no manual updates needed).
 *
 * Run: node scripts/mlbn-fetch.js
 * Deps: puppeteer (npm install puppeteer --prefix /tmp/puppeteer)
 */

const fs   = require('fs');
const path = require('path');

// Support both local install and CI prefix install
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (_) {
  puppeteer = require('/tmp/puppeteer/node_modules/puppeteer');
}

const OUT = path.join(__dirname, '..', 'outbox', 'mlbn-schedule.json');
const URL = 'https://www.mlb.com/network/shows/regular-season-games';

// Team name → FIELD abbreviation mapping
// Mirrors _teamAbbr in index.html — keep in sync
const TEAM_ABBR = {
  'Los Angeles Angels':   'LAA', 'Angels':             'LAA',
  'Detroit Tigers':       'DET', 'Tigers':             'DET',
  'Atlanta Braves':       'ATL', 'Braves':             'ATL',
  'Boston Red Sox':       'BOS', 'Red Sox':            'BOS',
  'Toronto Blue Jays':    'TOR', 'Blue Jays':          'TOR',
  'Baltimore Orioles':    'BAL', 'Orioles':            'BAL',
  'New York Yankees':     'NYY', 'Yankees':            'NYY',
  'Cincinnati Reds':      'CIN', 'Reds':               'CIN',
  'San Diego Padres':     'SDP', 'Padres':             'SDP',
  'Washington Nationals': 'WSN', 'Nationals':          'WSN',
  'Athletics':            'OAK', 'Oakland Athletics':  'OAK',
  'Arizona Diamondbacks': 'ARI', 'Diamondbacks':       'ARI',
  'Seattle Mariners':     'SEA', 'Mariners':           'SEA',
  'Philadelphia Phillies':'PHI', 'Phillies':           'PHI',
  'Los Angeles Dodgers':  'LAD', 'Dodgers':            'LAD',
  'Colorado Rockies':     'COL', 'Rockies':            'COL',
  'New York Mets':        'NYM', 'Mets':               'NYM',
  'San Francisco Giants': 'SFG', 'Giants':             'SFG',
  'Houston Astros':       'HOU', 'Astros':             'HOU',
  'Texas Rangers':        'TEX', 'Rangers':            'TEX',
  'Minnesota Twins':      'MIN', 'Twins':              'MIN',
  'Chicago White Sox':    'CHW', 'White Sox':          'CHW',
  'Chicago Cubs':         'CHC', 'Cubs':               'CHC',
  'Milwaukee Brewers':    'MIL', 'Brewers':            'MIL',
  'St. Louis Cardinals':  'STL', 'Cardinals':          'STL',
  'Pittsburgh Pirates':   'PIT', 'Pirates':            'PIT',
  'Kansas City Royals':   'KCR', 'Royals':             'KCR',
  'Cleveland Guardians':  'CLE', 'Guardians':          'CLE',
  'Tampa Bay Rays':       'TBR', 'Rays':               'TBR',
  'Miami Marlins':        'MIA', 'Marlins':            'MIA',
};

function toAbbr(name) {
  const n = name.trim();
  return TEAM_ABBR[n] || n.substring(0, 3).toUpperCase();
}

/**
 * Parse description like:
 *  "Los Angeles Angels at Detroit Tigers from Comerica Park..."
 *  "Atlanta Braves @ Cincinnati Reds or San Diego Padres @ Washington Nationals"
 * Returns array of {away, home, awayAbbr, homeAbbr, key} objects.
 * Multi-game "or" descriptions return multiple entries — MLBN picks one night-of.
 */
function parseDescription(desc) {
  if (!desc) return [];

  // Strip suffix like "(subject to blackout...)" and "[LIVE]"
  const clean = desc.replace(/\s*\(subject to blackout[^)]*\)/gi, '')
                    .replace(/\[LIVE\]/gi, '')
                    .replace(/\s*from\s+.+?(?=\s+on\s+\d|$)/i, '')
                    .trim();

  // Split on " or " (MLBN shows alternative games)
  const parts = clean.split(/\s+or\s+/i).map(p => p.trim()).filter(Boolean);

  const results = [];
  for (const part of parts) {
    // Match "AWAY at HOME" or "AWAY @ HOME"
    const m = part.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (!m) continue;
    const away = m[1].trim();
    const home = m[2].trim();
    const awayAbbr = toAbbr(away);
    const homeAbbr = toAbbr(home);
    results.push({
      away, home,
      awayAbbr, homeAbbr,
      key: `${awayAbbr}@${homeAbbr}`  // matches _gotdKey() format in FIELD
    });
  }
  return results;
}

/**
 * Convert "MM/DD/YYYY" → "YYYY-MM-DD"
 */
function isoDate(d) {
  if (!d) return null;
  const m = d.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1]}-${m[2]}`;
}

(async () => {
  console.log(`[mlbn-fetch] Launching browser → ${URL}`);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36'
    );

    // Load page and wait for network to settle
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the table rows to populate (JS renders async)
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('table tr').length > 3,
        { timeout: 25000 }
      );
      console.log('[mlbn-fetch] Table found ✓');
    } catch {
      console.warn('[mlbn-fetch] Table wait timed out — extracting anyway');
    }

    // Extract raw table rows from the page
    const rawRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr, table tbody tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        return cells.map(c => c.innerText?.trim() || '');
      }).filter(cells => cells.length >= 3 && cells[0]);
    });

    console.log(`[mlbn-fetch] Raw rows extracted: ${rawRows.length}`);

    // Parse rows into structured game objects
    const games = [];
    for (const cells of rawRows) {
      const dateRaw   = cells[0] || '';
      const timeRaw   = cells[1] || '';
      const descRaw   = cells[2] || '';

      // Skip header rows
      if (dateRaw.toLowerCase().includes('date')) continue;

      const isoD = isoDate(dateRaw);
      if (!isoD) continue;

      const parsed = parseDescription(descRaw);
      for (const p of parsed) {
        games.push({
          date:      isoD,          // "2026-05-28"
          dateRaw,                  // "05/28/2026"
          time:      timeRaw,       // "1:00 PM"
          away:      p.away,
          home:      p.home,
          awayAbbr:  p.awayAbbr,
          homeAbbr:  p.homeAbbr,
          key:       p.key,         // "LAA@DET" — matches _gotdKey() in FIELD
          description: descRaw,
        });
      }
    }

    // Build MLBN_SCHEDULE-compatible lookup: date → [key, key, ...]
    const byDate = {};
    for (const g of games) {
      if (!byDate[g.date]) byDate[g.date] = [];
      if (!byDate[g.date].includes(g.key)) byDate[g.date].push(g.key);
    }

    const result = {
      fetched:  new Date().toISOString(),
      source:   URL,
      gameCount: games.length,
      games,
      // Lookup format matching MLBN_SCHEDULE — FIELD can use this directly
      // byDate: { 'YYYY-MM-DD': ['AWAY@HOME', ...], ... }
      byDate,
    };

    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log(`\n[mlbn-fetch] ✅ ${games.length} games written to ${path.relative(process.cwd(), OUT)}`);

    // Print upcoming 14 days
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 14);

    const upcoming = games.filter(g => {
      const d = new Date(g.date + 'T12:00:00Z');
      return d >= today && d <= cutoff;
    });

    if (upcoming.length) {
      console.log(`\nUpcoming MLBN games (next 14 days):`);
      upcoming.forEach(g => console.log(`  ${g.date} ${g.time.padEnd(8)} ${g.key.padEnd(10)} ${g.description.substring(0, 55)}`));
    } else {
      console.log('\nNo upcoming games in next 14 days found in schedule.');
    }

  } catch (err) {
    console.error('[mlbn-fetch] ❌ Fatal error:', err.message);
    // Write error state so FIELD knows fetch failed without throwing
    fs.writeFileSync(OUT, JSON.stringify({
      fetched:  new Date().toISOString(),
      source:   URL,
      error:    err.message,
      gameCount: 0,
      games:    [],
      byDate:   {},
    }, null, 2));
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
