// Replay ESPN's REAL eng.fa games (names and scores from a live-probe manifest) into the locally built page and read every live card's time cell.
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('/opt/node-tools/package.json')
const { chromium } = require('playwright')
const BASE = process.env.BASE
const games = JSON.parse(fs.readFileSync(process.env.MANIFEST, 'utf8')).espnSameRun.games
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const ev = (g, i) => ({
  id: String(700000 + i), date: `${day}T15:00Z`, name: `${g.home} v ${g.away}`,
  status: g.state === 'in' ? { type: { name: 'STATUS_FIRST_HALF', state: 'in', shortDetail: "20'" }, displayClock: "20'", period: 1 } : { type: { name: 'STATUS_SCHEDULED', state: 'pre' }, displayClock: "0'", period: 0 },
  competitions: [{ id: String(700000 + i), venue: { fullName: 'G' }, broadcasts: [],
    competitors: [{ homeAway: 'home', score: String(g.homeScore), team: { displayName: g.home } }, { homeAway: 'away', score: String(g.awayScore), team: { displayName: g.away } }] }],
})
const EV = games.map(ev)
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 }, timezoneId: 'America/New_York', locale: 'en-US', serviceWorkers: 'block' })
const page = await ctx.newPage()
await page.route('**/*', route => {
  const u = new URL(route.request().url()); const cors = { 'access-control-allow-origin': '*' }
  if (u.hostname === '127.0.0.1') return route.continue()
  if (u.hostname === 'site.api.espn.com' && u.pathname.endsWith('/soccer/eng.fa/scoreboard')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ events: EV }) })
  return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"events":[],"games":[],"results":[]}' })
})
await page.goto(`${BASE}/index.html?wpt`, { waitUntil: 'load' })
await page.waitForTimeout(15000)
const rows = await page.evaluate(() => [...document.querySelectorAll('.game-card[data-sport="FA Cup"]')].map(c => ({ h: c.getAttribute('data-home'), a: c.getAttribute('data-away'), live: c.classList.contains('live'), cell: (c.querySelector('.game-time') || {}).textContent }))) 
const bad = []
for (const g of games) {
  const r = rows.find(x => x.h === g.home && x.a === g.away)
  const m = r && r.cell ? /(\d+)\s*[–-]\s*(\d+)/.exec(r.cell) : null
  const ok = g.state !== 'in' ? true : !!m && Number(m[1]) === g.awayScore && Number(m[2]) === g.homeScore
  if (!ok) bad.push(`${g.home} v ${g.away}: cell ${JSON.stringify(r ? r.cell : null)} live=${r ? r.live : null} / ESPN away-home ${g.awayScore}-${g.homeScore} state ${g.state}`)
}
console.log(`cards ${rows.length}, live ${rows.filter(r => r.live).length}; live games whose cell differs from ESPN: ${bad.length}`)
bad.forEach(b => console.log('  ' + b))
await browser.close()
