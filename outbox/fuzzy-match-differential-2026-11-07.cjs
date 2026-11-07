// Run from the jubilant-bassoon root:
//   node outbox/fuzzy-match-differential-2026-11-07.cjs <scoreboard manifest> <league key> <card label> <period prefix> [old ref]
// findScore, OLD (default: the parent of ad5d4b9, before the exact-pair preference) against NEW (the working tree), on the REAL games of one league from
// outbox/espn-scoreboard-games-<ts>.json (written by scoreboard_games_probe.js on a runner). The page keeps two score slots per game; a CFB card has an
// exact entry in BOTH (the live poller's 'espn' slot and the V2 writer's 'apisports' slot use the same ESPN display names, which the relay's /v2/games?sport=cfb
// confirmed on 2026-11-07), so each scenario seeds the slots the way the writers do and asks what a card would show. The exact-pair preference covers the 'espn' slot only.
//   wrong       = the card's score is not its own game's
//   flagged     = confidence 'mismatch' (the page shows a warning glyph)
//   silent      = wrong AND not flagged (nothing tells the viewer)
// CARDS_FROM=<outbox/cfb-live-probe-manifest-*.json> restricts the cards judged to the ones the live page actually lists (cardList); the slots are still seeded from every game.
// 'api-sports slot only' scenarios model the sports the poller no longer reads from ESPN (soccer leagues, NBA, NHL, MLB): V2 is their only source.
const fs = require('fs'), cp = require('child_process')
const [manifestPath, leagueKey, label, prefix, oldRef = 'ad5d4b9^'] = process.argv.slice(2)
if (!manifestPath || !leagueKey || !label || !prefix) { console.error('usage: <manifest> <league key> <label> <prefix> [old ref]'); process.exit(2) }
const slice = (src, head) => { const i = src.indexOf(head); if (i < 0) throw new Error('no ' + head); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1) } }
const games = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).leagues[leagueKey].games
const shown = process.env.CARDS_FROM ? new Set(JSON.parse(fs.readFileSync(process.env.CARDS_FROM, 'utf8')).cardList.map(c => `${c.home}|${c.away}`)) : null
const judged = shown ? games.filter(g => shown.has(`${g.home}|${g.away}`)) : games
const fu = fs.readFileSync('field_utils.js', 'utf8')
const versions = { OLD: cp.execSync(`git show ${oldRef}:src/legacy/field.js`, { maxBuffer: 1 << 28 }).toString(), NEW: fs.readFileSync(process.env.NEW_FILE || 'src/legacy/field.js', 'utf8') }
const finder = (field, sbs) => new Function('_scoresBySource', [slice(field, 'function _gameSport('), slice(field, 'function classifySport('), slice(fu, 'function espnTeamMatch('), slice(field, 'function findScore(')].join(';\n') + ';\nreturn findScore;')(sbs)
const witness = (g, ts) => ({ state: g.state, homeScore: g.homeScore, awayScore: g.awayScore, periodPrefix: prefix, period: 2, ts })
// [name, which slots, espn ts(i), apisports ts(i)]
const N = games.length
const scenarios = [
  ['api-sports slot only, writes tie',                   { espn: null,             api: i => 1000 }],
  ['api-sports slot only, ts rises in event order',      { espn: null,             api: i => 1000 + i }],
  ['api-sports slot only, ts falls in event order',      { espn: null,             api: i => 1000 + (N - i) }],
  ['ESPN slot only, writes tie',                         { espn: i => 1000,        api: null }],
  ['ESPN slot only, ts rises in event order',            { espn: i => 1000 + i,    api: null }],
  ['both slots, api-sports newer, same order',           { espn: i => 1000 + i,    api: i => 5000 + i }],
  ['both slots, api-sports newer, reverse order',        { espn: i => 1000 + i,    api: i => 5000 + (N - i) }],
  ['both slots, ESPN newer, api-sports in reverse order',{ espn: i => 5000 + i,    api: i => 1000 + (N - i) }],
]
console.log(`${leagueKey} (${label}, prefix ${prefix}): ${games.length} games seeded, ${judged.length} cards judged, old ref ${oldRef}`)
for (const [name, ts] of scenarios) {
  const sbs = {}
  games.forEach((g, i) => { const e = {}; if (ts.espn) e.espn = witness(g, ts.espn(i)); if (ts.api) e.apisports = witness(g, ts.api(i)); sbs[`${g.home}|${g.away}`] = e })
  const out = {}, bad = { OLD: new Set(), NEW: new Set() }
  for (const [v, field] of Object.entries(versions)) {
    const find = finder(field, sbs); let wrong = 0, flagged = 0, silent = 0
    for (const g of judged) {
      const r = find({ home: g.home, away: g.away, _sport: label, league: label })
      const isBad = !r || r.homeScore !== g.homeScore || r.awayScore !== g.awayScore
      const flag = !!r && r.confidence === 'mismatch'
      if (isBad) { wrong++; bad[v].add(`${g.home}|${g.away}`); if (flag) flagged++; else silent++ }
    }
    out[v] = { wrong, flagged, silent }
  }
  const regressed = [...bad.NEW].filter(k => !bad.OLD.has(k)).length       // right before, wrong after
  console.log(`  ${name.padEnd(54)} OLD wrong ${out.OLD.wrong} (flagged ${out.OLD.flagged}, silent ${out.OLD.silent}) | NEW wrong ${out.NEW.wrong} (flagged ${out.NEW.flagged}, silent ${out.NEW.silent}) | right-before-wrong-after ${regressed}`)
}
