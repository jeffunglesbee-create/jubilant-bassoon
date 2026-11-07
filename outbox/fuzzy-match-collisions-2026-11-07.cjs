// Run from the jubilant-bassoon root:  node outbox/fuzzy-match-collisions-2026-11-07.cjs <scoreboard manifest>
// For each league in outbox/espn-scoreboard-games-<ts>.json: how many pairs of DIFFERENT games does the page's espnTeamMatch confuse (both sides match, in either
// order), and how many games are in at least one such pair. This is the exposure; whether a card shows the wrong score also depends on which slot holds what
// (outbox/fuzzy-match-differential-2026-11-07.cjs).
const fs = require('fs')
const { espnTeamMatch } = require('../field_utils.js')
const m = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
for (const [k, v] of Object.entries(m.leagues)) {
  const games = v.games, pairs = [], hit = new Set()
  for (let i = 0; i < games.length; i++) for (let j = i + 1; j < games.length; j++) {
    const g = games[i], h = games[j]
    const gh = g.home.toLowerCase(), ga = g.away.toLowerCase(), hh = h.home.toLowerCase(), ha = h.away.toLowerCase()
    const fwd = espnTeamMatch(hh, gh) && espnTeamMatch(ha, ga), rev = espnTeamMatch(hh, ga) && espnTeamMatch(ha, gh)
    if (fwd || rev) { pairs.push(`${g.away} @ ${g.home}  ~  ${h.away} @ ${h.home} (${fwd ? 'fwd' : 'rev'})`); hit.add(i); hit.add(j) }
  }
  console.log(`${k}: ${games.length} games, ${pairs.length} colliding pair(s), ${hit.size} game(s) involved`)
  pairs.forEach(p => console.log('   ' + p))
}
