// Run from the jubilant-bassoon root:  node outbox/fa-cup-findscore-collision-2026-11-07.cjs <live-probe manifest>
// findScore, OLD (git HEAD at the time) against NEW (the working tree), on the REAL ESPN eng.fa games of a live-probe manifest, seeded the way the live
// poller seeds _scoresBySource (one 'espn' witness per game, key 'home|away', ts increasing in event order). Question: which cards show a score other than
// their own, and does the change alter any card that was right? (outbox/fa-cup-live-probe-manifest-2026-11-07T16-02-39.json is the run it was built on.)
const fs = require('fs'), cp = require('child_process')
const slice = (src, head) => { const i = src.indexOf(head); if (i < 0) throw new Error('no ' + head); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1) } }
const games = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).espnSameRun.games
const fu = fs.readFileSync('field_utils.js', 'utf8')
const versions = { OLD: cp.execSync('git show HEAD:src/legacy/field.js', { maxBuffer: 1 << 28 }).toString(), NEW: fs.readFileSync('src/legacy/field.js', 'utf8') }
const finder = (field, sbs) => new Function('_scoresBySource', [slice(field, 'function _gameSport('), slice(field, 'function classifySport('), slice(fu, 'function espnTeamMatch('), slice(field, 'function findScore(')].join(';\n') + ';\nreturn findScore;')(sbs)
for (const [label, step] of [['all writes in the same millisecond', 0], ['writes 1 ms apart, event order', 1], ['writes 1 ms apart, reverse order', -1]]) {
  const sbs = {}
  games.forEach((g, i) => { sbs[`${g.home}|${g.away}`] = { espn: { state: g.state, homeScore: g.homeScore, awayScore: g.awayScore, periodPrefix: "'", period: 2, ts: 1000 + i * step } } })
  const res = {}
  for (const [v, field] of Object.entries(versions)) {
    const find = finder(field, sbs), out = {}
    for (const g of games) { const r = find({ home: g.home, away: g.away, _sport: 'FA Cup', league: 'FA Cup' }); out[`${g.home} v ${g.away}`] = r ? `${r.awayScore}-${r.homeScore}` : null }
    res[v] = out
  }
  const want = g => `${g.awayScore}-${g.homeScore}`
  const wrong = v => games.filter(g => res[v][`${g.home} v ${g.away}`] !== want(g)).map(g => `${g.home} v ${g.away} (${res[v][`${g.home} v ${g.away}`]}, ESPN ${want(g)})`)
  const changed = games.filter(g => res.OLD[`${g.home} v ${g.away}`] !== res.NEW[`${g.home} v ${g.away}`]).map(g => `${g.home} v ${g.away}: ${res.OLD[`${g.home} v ${g.away}`]} -> ${res.NEW[`${g.home} v ${g.away}`]}`)
  const brokenByChange = games.filter(g => res.OLD[`${g.home} v ${g.away}`] === want(g) && res.NEW[`${g.home} v ${g.away}`] !== want(g)).length
  console.log(`${label}: ${games.length} games. wrong OLD ${wrong('OLD').length} ${JSON.stringify(wrong('OLD'))}; wrong NEW ${wrong('NEW').length}; cards the change altered ${changed.length} ${JSON.stringify(changed)}; right-before-wrong-after ${brokenByChange}`)
}
