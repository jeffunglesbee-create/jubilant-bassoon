// A ROUTED RENDER of the real, built client with a stubbed ESPN eng.fa scoreboard. CC-CMD-2026-08-08-fa-cup-coverage, Task 4, the client half.
//
// WHY: smoke.js asserts the entry exists and isDomesticLeagueInBreak is false; neither says a card renders, that all 33 games of a round-one
// Saturday render, or that ESPN+ lands only on the games ESPN lists it for. This loads the page the way a visitor's browser does (the esbuild
// bundle, not the source index.html, which cannot boot) and reads the DOM.
//
// THE STUB. Network is stubbed, not the code: every request outside localhost is answered with an empty JSON body, except the eng.fa scoreboard,
// which answers 33 SYNTHETIC events dated today, honouring ?limit= the way ESPN does (the first N). Two of them list ESPN+ in
// competitions[0].broadcasts ([{market:'national', names:['ESPN+']}], the shape field-relay-nba's probe read from ESPN on 2026-11-07);
// the other 31 carry an empty broadcasts array, as 31 of 33 real games did that day. Game 32 is past a limit of 30 on purpose. Team names are
// invented ("Home Town 5"), so nothing here is a claim about a real fixture.
//
// USAGE: build a copy of the tree (cp index.html sw.js field_utils.js package.json src scripts to a directory, symlink node_modules, run
// `node scripts/build-bundle.mjs` in it), serve that directory, and run:  BASE=http://127.0.0.1:PORT node fa-render-final.mjs
// Needs playwright resolvable and LANG=en_US.UTF-8 (a posix locale makes Intl throw at boot).
import { createRequire } from 'node:module'
const require = createRequire(process.env.PW_FROM || '/opt/node-tools/package.json')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://127.0.0.1:8766'

const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
// Game 7 is LIVE at 2-1, 67', the way ESPN serves an in-progress match (status.type.state 'in'). The live poller reads it from the same scoreboard.
// It is the case the independent review of 2026-11-07 found broken: 'FA Cup' matched none of classifySport's soccer tokens, so findScore and
// findESPNScore dropped the score. The function-level proof is smoke FA-7; here the page is asked. Every other game is scheduled, 0-0.
const LIVE = 7
const mk = (i, plus) => ({
  id: String(900000 + i), date: `${day}T15:00Z`, name: `Home Town ${i} at Away United ${i}`,
  status: i === LIVE ? { type: { name: 'STATUS_IN_PROGRESS', state: 'in', shortDetail: "67'" }, displayClock: "67'", period: 2 }
                     : { type: { name: 'STATUS_SCHEDULED' }, displayClock: "0'", period: 0 },
  competitions: [{ id: String(900000 + i), venue: { fullName: `Ground ${i}` }, broadcasts: plus ? [{ market: 'national', names: ['ESPN+'] }] : [],
    competitors: [{ homeAway: 'home', score: i === LIVE ? '2' : '0', team: { displayName: `Home Town ${i}` } }, { homeAway: 'away', score: i === LIVE ? '1' : '0', team: { displayName: `Away United ${i}` } }] }],
})
const ALL = Array.from({ length: 33 }, (_, i) => mk(i + 1, i + 1 === 5 || i + 1 === 32))

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 }, timezoneId: 'America/New_York', locale: 'en-US', serviceWorkers: 'block' })
const page = await ctx.newPage()
const asked = []
await page.route('**/*', route => {
  const u = new URL(route.request().url())
  if (u.hostname === '127.0.0.1') return route.continue()
  const cors = { 'access-control-allow-origin': '*' }
  if (u.hostname === 'site.api.espn.com' && u.pathname.endsWith('/soccer/eng.fa/scoreboard')) {
    const rawLimit = u.searchParams.get('limit')          // null when the page sent none: ESPN then serves its default, here the whole list
    asked.push(rawLimit)
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ events: rawLimit === null ? ALL : ALL.slice(0, Number(rawLimit)) }) })
  }
  return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"events":[],"games":[],"results":[]}' })
})
await page.goto(`${BASE}/index.html`, { waitUntil: 'load' })
await page.waitForTimeout(6000)
const out = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.game-card[data-sport="FA Cup"]')]
  const plus = cards.filter(c => /ESPN\+/.test(c.innerText))
  const nameOf = c => (c.innerText.match(/Home Town \d+/) || ['?'])[0]
  const live = cards.find(c => nameOf(c) === 'Home Town 7')
  const cell = sel => live ? (live.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').trim() : null
  return {
    // Game 7 is live at 2-1. Two cells read it: the stage line (seeded by fetchSoccerFixtures) and the time cell (findESPNScore through classifySport).
    // Without the 'fa cup' token the time cell is EMPTY and the circadian phase differs (the mutant S). With it, the cell is not empty. What the cell
    // SAYS here ('0–0' in this stub, for an EFL Cup control as well) was not traced and is not claimed: see the session doc, "Not explained".
    liveCardStageLine: cell('.card-stage-content'),
    liveCardTimeCell: cell('.game-time'),
    liveCardCircadian: live ? ((live.className.match(/circadian-(\w+)/) || [])[1] || null) : null,
    swVersion: window.SW_VERSION || null,
    faSections: document.querySelectorAll('.sport-section[data-sport="FA Cup"]').length,
    faCards: cards.length, cardsShowingESPNplus: plus.length, plusGames: plus.map(nameOf), lastCard: cards.length ? nameOf(cards[cards.length - 1]) : null,
  }
})
console.log(JSON.stringify({ at: new Date().toISOString(), etDay: day, base: BASE, limitsAsked: asked, ...out }))
await browser.close()
