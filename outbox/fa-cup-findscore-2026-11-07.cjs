// One-off, executed: findScore for a live FA Cup game, on the fixed tree and on HEAD (which lacks the 'fa cup' token).
const fs = require('fs'), cp = require('child_process')
const slice = (src, head) => { const i = src.indexOf(head); if (i < 0) throw new Error('no ' + head); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1) } }
const fu = fs.readFileSync('field_utils.js', 'utf8')
const run = (label, src) => {
  const parts = [slice(src, 'function _gameSport('), slice(src, 'function classifySport('), slice(fu, 'function espnTeamMatch('), slice(src, 'function findScore(')].join(';\n')
  const f = new Function('_scoresBySource', `${parts};\nreturn findScore;`)
  const live = { espn: { state: 'in', homeScore: 2, awayScore: 1, periodPrefix: "'", period: 2, ts: 1 } }
  const out = {}
  for (const lab of ['FA Cup', 'EFL Cup']) {
    const r = f({ 'Home Town 7|Away United 7': live })({ home: 'Home Town 7', away: 'Away United 7', _sport: lab, league: lab })
    out[lab] = r ? `${r.homeScore}-${r.awayScore} state=${r.state}` : null
  }
  console.log(label, JSON.stringify(out))
}
run('fixed working tree:', fs.readFileSync('src/legacy/field.js', 'utf8'))
run('HEAD (no fa cup):  ', cp.execSync('git show HEAD:src/legacy/field.js', { maxBuffer: 1 << 28 }).toString())
