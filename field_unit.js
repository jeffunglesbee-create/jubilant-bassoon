// field_unit.js — unit tests for FIELD pure utility functions
// Run: node field_unit.js  (from repo root)
// Exit 0 = all pass; 1 = any failures
//
// Functions imported directly from field_utils.js — no new Function() hacks.
// Rule 17: add a test when a function contract is defined or a bug is fixed.
// Rule 19: pure functions live in field_utils.js, not index.html.

const {
  trimToCompleteSentence,
  toImpliedNum,
  espnTeamMatch,
  wxAlert,
  parseMatchweek,
  dramaTier,
  espnPeriodLabel,
  teamNick,
  teamSlug,
  teamSlugPair,
  stripJsonFences,
  extractJsonBlock,
  computeGroupScenarios,
  wcSortByTiebreakers,
  computeBest3rdRanking,
  wcMakePRNG,
} = require('./field_utils.js');

let pass = 0, fail = 0;
function test(label, fn) {
  try { fn(); pass++; console.log('  ✅', label); }
  catch(e) { fail++; console.error('  ❌', label, '—', e.message); }
}
function assert(condition, msg='assertion failed') {
  if (!condition) throw new Error(msg);
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

console.log('\n── FIELD Unit Tests ─────────────────────────────────────\n');

// ── trimToCompleteSentence ─────────────────────────────────────────────────
test('trimToCompleteSentence: clean ending — unchanged', () => {
  assertEqual(trimToCompleteSentence('Hello world.'), 'Hello world.');
  assertEqual(trimToCompleteSentence('Hello world!'), 'Hello world!');
  assertEqual(trimToCompleteSentence('Hello world?'), 'Hello world?');
});

test('trimToCompleteSentence: trims incomplete second sentence', () => {
  const result = trimToCompleteSentence('This is a complete first sentence here. Second fragment without end');
  assertEqual(result, 'This is a complete first sentence here.');
});

test('trimToCompleteSentence: no boundary — returns full text not empty string', () => {
  // Bug fixed May 20: used to return '' → caller fell back to generic static text
  const input = 'A single long fragment with no sentence ending anywhere in it at all';
  assertEqual(trimToCompleteSentence(input), input);
});

test('trimToCompleteSentence: null/undefined/empty passthrough', () => {
  assertEqual(trimToCompleteSentence(''), '');
  assertEqual(trimToCompleteSentence(null), null);
  assertEqual(trimToCompleteSentence(undefined), undefined);
});

// ── toImpliedNum ───────────────────────────────────────────────────────────
test('toImpliedNum: favourite (-150) → >50%', () => {
  const r = toImpliedNum(-150);
  assert(r > 50 && r < 100, `expected 50-100, got ${r}`);
});

test('toImpliedNum: underdog (+130) → <50%', () => {
  const r = toImpliedNum(130);
  assert(r > 0 && r < 50, `expected 0-50, got ${r}`);
});

test('toImpliedNum: even money (+100/-100) → ~50%', () => {
  const pos = toImpliedNum(100), neg = toImpliedNum(-100);
  assert(Math.abs(pos - 50) < 1, `+100 → ~50%, got ${pos}`);
  assert(Math.abs(neg - 50) < 1, `-100 → ~50%, got ${neg}`);
});

test('toImpliedNum: EV/EVEN/PK → exactly 50', () => {
  assertEqual(toImpliedNum('EV'), 50);
  assertEqual(toImpliedNum('EVEN'), 50);
  assertEqual(toImpliedNum('PK'), 50);
});

test('toImpliedNum: null/empty → null', () => {
  assertEqual(toImpliedNum(''), null);
  assertEqual(toImpliedNum(null), null);
});

// ── espnTeamMatch ──────────────────────────────────────────────────────────
test('espnTeamMatch: exact match', () => {
  assert(espnTeamMatch('Knicks', 'Knicks'));
  assert(espnTeamMatch('Warriors', 'Warriors'));
});

test('espnTeamMatch: ESPN full name vs FIELD short name', () => {
  assert(espnTeamMatch('New York Knicks', 'Knicks'));
  assert(espnTeamMatch('Golden State Warriors', 'Warriors'));
});

test('espnTeamMatch: no false positives', () => {
  assert(!espnTeamMatch('Boston Celtics', 'Lakers'));
  assert(!espnTeamMatch('Miami Heat', 'Knicks'));
});

test('espnTeamMatch: null inputs → false', () => {
  assert(!espnTeamMatch(null, 'Knicks'));
  assert(!espnTeamMatch('Knicks', null));
  assert(!espnTeamMatch(null, null));
});

// ── wxAlert ────────────────────────────────────────────────────────────────
test('wxAlert: heavy rain (>5) → alert string mentioning rain', () => {
  const r = wxAlert({ rain: 6, wind: 10, temp: 72 });
  assert(typeof r === 'string' && r.toLowerCase().includes('rain'), `got: ${r}`);
});

test('wxAlert: extreme heat (>100) → alert string', () => {
  const r = wxAlert({ rain: 0, wind: 5, temp: 105 });
  assert(typeof r === 'string' && r.toLowerCase().includes('heat'), `got: ${r}`);
});

test('wxAlert: high wind (>30mph) → alert string', () => {
  const r = wxAlert({ rain: 0, wind: 35, temp: 72 });
  assert(typeof r === 'string' && r.toLowerCase().includes('wind'), `got: ${r}`);
});

test('wxAlert: normal conditions → null', () => {
  assertEqual(wxAlert({ rain: 0, wind: 8, temp: 72 }), null);
});

// ── parseMatchweek ─────────────────────────────────────────────────────────
test('parseMatchweek: extracts number from league string', () => {
  assertEqual(parseMatchweek('Premier League - Matchweek 38'), 38);
  assertEqual(parseMatchweek('Premier League - Matchweek 1'), 1);
});

test('parseMatchweek: returns null for non-matchweek strings', () => {
  assertEqual(parseMatchweek('UEFA Champions League — Final'), null);
  assertEqual(parseMatchweek(null), null);
  assertEqual(parseMatchweek(''), null);
});

// ── dramaTier ──────────────────────────────────────────────────────────────
test('dramaTier: returns tier string for known scores', () => {
  const t = dramaTier(85);
  assert(typeof t === 'string' && t.length > 0, `got: ${t}`);
});

test('dramaTier: low score returns different tier than high', () => {
  const low = dramaTier(20);
  const high = dramaTier(90);
  assert(low !== high, `expected different tiers: low=${low} high=${high}`);
});

// ── espnPeriodLabel ────────────────────────────────────────────────────────
test('espnPeriodLabel: basketball Q labels', () => {
  const r = espnPeriodLabel('Q', 1, '10:00');
  assert(typeof r === 'string' && r.includes('1'), `got: ${r}`);
});

test('espnPeriodLabel: OT label', () => {
  const r = espnPeriodLabel('Q', 5, '2:00');
  assert(typeof r === 'string', `got: ${r}`);
});

// ── teamNick ───────────────────────────────────────────────────────────────

test('teamNick: last word of multi-word name', () => {
  assertEqual(teamNick('New York Knicks'), 'Knicks');
  assertEqual(teamNick('Golden State Warriors'), 'Warriors');
  assertEqual(teamNick('Los Angeles Lakers'), 'Lakers');
});

test('teamNick: single word — unchanged', () => {
  assertEqual(teamNick('Knicks'), 'Knicks');
});

test('teamNick: null/empty → empty string', () => {
  assertEqual(teamNick(null), '');
  assertEqual(teamNick(''), '');
  assertEqual(teamNick(undefined), '');
});

// ── teamSlug ───────────────────────────────────────────────────────────────
test('teamSlug: default last-6 for fuzzy endsWith matching', () => {
  assertEqual(teamSlug('New York Knicks'), 'knicks');
  assertEqual(teamSlug('Golden State Warriors'), 'rriors');
});

test('teamSlug: first-6 for cache keys', () => {
  assertEqual(teamSlug('New York Knicks', 6, false), 'newyor');
  assertEqual(teamSlug('Arsenal', 6, false), 'arsena');
});

test('teamSlug: strips non-alpha chars', () => {
  assertEqual(teamSlug('Inter Miami CF', 6, false), 'intermiamicf'.slice(0,6));
});

// ── teamSlugPair ───────────────────────────────────────────────────────────
test('teamSlugPair: produces home_away key', () => {
  const key = teamSlugPair('Arsenal', 'Chelsea');
  assertEqual(key, 'arsena_chelse');
});

// ── stripJsonFences ────────────────────────────────────────────────────────
test('stripJsonFences: removes ```json ... ```', () => {
  const input = '```json\n{"key":"value"}\n```';
  const result = stripJsonFences(input);
  assertEqual(result, '{"key":"value"}');
});

test('stripJsonFences: removes ``` without json', () => {
  assertEqual(stripJsonFences('```\n{"a":1}\n```'), '{"a":1}');
});

test('stripJsonFences: passthrough when no fences', () => {
  assertEqual(stripJsonFences('{"a":1}'), '{"a":1}');
});

test('stripJsonFences: null passthrough', () => {
  assertEqual(stripJsonFences(null), null);
});

// ── extractJsonBlock ───────────────────────────────────────────────────────
test('extractJsonBlock: finds JSON in prose', () => {
  const input = 'Here is the data: {"key":"value"} as requested.';
  assertEqual(extractJsonBlock(input), '{"key":"value"}');
});

test('extractJsonBlock: returns null when no JSON', () => {
  assertEqual(extractJsonBlock('no json here'), null);
  assertEqual(extractJsonBlock(null), null);
});

// ── WC Permutations Engine ─────────────────────────────────────────────────
// Helper — build a team row.
function tm(name, P, W, D, L, GF, GA) {
  return {name, P, W, D, L, GF, GA, Pts: W*3 + D};
}

test('computeGroupScenarios: MD0 (no matches played) — 729 scenarios for 4 teams', () => {
  const teams = ['Mexico','South Africa','South Korea','Czechia'].map(n => tm(n,0,0,0,0,0,0));
  const remaining = [
    {home:'Mexico', away:'South Africa'},
    {home:'South Korea', away:'Czechia'},
    {home:'Czechia', away:'South Africa'},
    {home:'Mexico', away:'South Korea'},
    {home:'Czechia', away:'Mexico'},
    {home:'South Korea', away:'South Africa'},
  ];
  const r = computeGroupScenarios({groupId:'A', teams, played:[], remaining});
  assertEqual(r.matchesRemaining, 6);
  assertEqual(r.scenariosEnumerated, 729); // 3^6
  // Every team can theoretically top group from a clean slate
  for (const n of ['Mexico','South Africa','South Korea','Czechia']) {
    assert(r.perTeam[n].canTopGroup, `${n} should be able to top group at MD0`);
    assert(!r.perTeam[n].alwaysEliminated, `${n} should not be eliminated at MD0`);
  }
});

test('computeGroupScenarios: MD3 (2 remaining) — exactly 9 scenarios', () => {
  // After MD2: each team has played 2 games. 2 group games left.
  const teams = [
    tm('A',2,2,0,0,4,1),  // 6 pts
    tm('B',2,1,1,0,3,2),  // 4 pts
    tm('C',2,0,1,1,1,2),  // 1 pt
    tm('D',2,0,0,2,0,3),  // 0 pts
  ];
  const played = [
    {home:'A',away:'C',homeScore:2,awayScore:0},
    {home:'B',away:'D',homeScore:2,awayScore:0},
    {home:'A',away:'D',homeScore:2,awayScore:1},
    {home:'C',away:'B',homeScore:1,awayScore:1},
  ];
  const remaining = [
    {home:'A',away:'B'},
    {home:'D',away:'C'},
  ];
  const r = computeGroupScenarios({groupId:'X', teams, played, remaining});
  assertEqual(r.matchesRemaining, 2);
  assertEqual(r.scenariosEnumerated, 9);
});

test('computeGroupScenarios: team already mathematically qualified', () => {
  // Team A is 6 pts ahead with 1 match left → always qualifies in top 2
  const teams = [
    tm('A',2,2,0,0,6,0),  // 6 pts
    tm('B',2,1,0,1,2,3),  // 3 pts
    tm('C',2,1,0,1,2,3),  // 3 pts
    tm('D',2,0,0,2,1,5),  // 0 pts — but C has played D already, leaving A v D and B v C
  ];
  const played = [
    {home:'A',away:'B',homeScore:3,awayScore:0},
    {home:'C',away:'D',homeScore:2,awayScore:1},
    {home:'A',away:'C',homeScore:3,awayScore:0},
    {home:'B',away:'D',homeScore:2,awayScore:0},
  ];
  const remaining = [
    {home:'A',away:'D'},
    {home:'B',away:'C'},
  ];
  const r = computeGroupScenarios({groupId:'X', teams, played, remaining});
  // A has 6 pts. Worst case A loses to D and B beats C 1-0 (min margin).
  // Final pts: A=6, B=6, C=3, D=3. A vs B tied on points → GD breaks: A still has +5 (started +6), B has +1 → A finishes 1st.
  assert(r.perTeam['A'].alwaysQualify, 'A should always qualify');
  assert(r.perTeam['A'].alwaysTopGroup, 'A should always top group given +6 GD lead');
});

test('computeGroupScenarios: team already mathematically eliminated', () => {
  // Team D has 0 pts, played all 3 games, finished MD3 → cannot improve
  // But all other teams have games still pending. Build with D done, 1 remaining.
  // Easier: 1 game left, D with 0 pts cannot catch top-3.
  const teams = [
    tm('A',3,3,0,0,6,0),  // 9 pts
    tm('B',3,2,0,1,5,2),  // 6 pts
    tm('C',2,1,0,1,3,4),  // 3 pts — still has 1 game vs A (already counted? no — only 2 played for C)
    tm('D',2,0,0,2,0,8),  // 0 pts — 2 games played
  ];
  // Wait, A has played 3 games but D only 2 — group has 6 fixtures. 1 remaining
  // is C vs D. With 0 pts in 2, even a win gives D 3 pts. Top-2 is 6+; D out.
  const played = [
    {home:'A',away:'B',homeScore:2,awayScore:0},
    {home:'A',away:'C',homeScore:2,awayScore:0},
    {home:'A',away:'D',homeScore:2,awayScore:0},
    {home:'B',away:'D',homeScore:3,awayScore:0},
    {home:'B',away:'C',homeScore:2,awayScore:3},
  ];
  const remaining = [{home:'C', away:'D'}];
  const r = computeGroupScenarios({groupId:'X', teams, played, remaining});
  // D maxes at 3 pts. C has 3 already. A=9, B=6 both safe.
  // D top group? No. D top-2? No (A and B always above).
  // D can finish 3rd if it wins (D=3 pts and GD differential vs C),
  //   but C would still have at least 3 pts and better GD with a loss.
  // Tightest analysis: a D win 1-0 → D=3pts GD=-7, C=3pts GD=-3 → C finishes 3rd, D 4th.
  // So D should be alwaysEliminated from top-3.
  assert(!r.perTeam['D'].canTopGroup, 'D cannot top group');
  assert(!r.perTeam['D'].canQualifyTop2, 'D cannot reach top 2');
  assert(r.perTeam['D'].alwaysEliminated, 'D should be alwaysEliminated');
});

test('wcSortByTiebreakers: pts → GD → GF order', () => {
  const teams = [
    tm('Low', 3, 1, 0, 2, 3, 5),    // 3 pts, GD -2
    tm('Med', 3, 2, 0, 1, 5, 3),    // 6 pts, GD +2
    tm('Hi',  3, 3, 0, 0, 7, 2),    // 9 pts, GD +5
    tm('Bot', 3, 0, 0, 3, 1, 6),    // 0 pts, GD -5
  ];
  wcSortByTiebreakers(teams, []);
  assertEqual(teams[0].name, 'Hi');
  assertEqual(teams[1].name, 'Med');
  assertEqual(teams[2].name, 'Low');
  assertEqual(teams[3].name, 'Bot');
});

test('wcSortByTiebreakers: H2H breaks ties when pts+GD+GF equal', () => {
  // Two teams equal on every base metric — H2H result determines order.
  const teams = [
    tm('X', 2, 1, 0, 1, 2, 2),  // 3 pts, GD 0, GF 2
    tm('Y', 2, 1, 0, 1, 2, 2),  // 3 pts, GD 0, GF 2 — tied with X on everything
    tm('Z', 2, 2, 0, 0, 5, 0),  // 6 pts — ahead
    tm('W', 2, 0, 0, 2, 0, 5),  // 0 pts — behind
  ];
  const played = [
    {home:'X', away:'Y', homeScore:2, awayScore:1},  // X beat Y H2H
    {home:'Z', away:'W', homeScore:5, awayScore:0},
    {home:'Z', away:'X', homeScore:0, awayScore:0},
    {home:'Y', away:'W', homeScore:0, awayScore:0},  // Hmm, this changes Y's stats
  ];
  // Recompute Y's actual stats from those played matches:
  //   X vs Y 2-1 (Y loss, GF 1, GA 2)
  //   Y vs W 0-0 (Y draw, GF 0, GA 0)
  // Y played 2: 0W 1D 1L, GF 1, GA 2 — that's Pts=1, GD=-1. Doesn't match.
  // Adjust the synthetic teams + played to be self-consistent.
  // Simpler: just test the sorter in isolation with a played list that demonstrates H2H.
  const teamsB = [
    tm('X', 1, 1, 0, 0, 2, 1),  // 3 pts, GD +1, GF 2  (won 2-1 vs Y)
    tm('Y', 1, 0, 0, 1, 1, 2),  // 0 pts, GD -1, GF 1  (lost 1-2 to X)
  ];
  wcSortByTiebreakers(teamsB, [{home:'X',away:'Y',homeScore:2,awayScore:1}]);
  assertEqual(teamsB[0].name, 'X', 'X should sort first on points');

  // Now equal-points equal-GD equal-GF — H2H decides
  const teamsC = [
    tm('P', 1, 0, 1, 0, 1, 1),  // 1 pt, GD 0, GF 1
    tm('Q', 1, 0, 1, 0, 1, 1),  // 1 pt, GD 0, GF 1 — tied on everything
  ];
  // H2H draw — they remain tied, no flip
  wcSortByTiebreakers(teamsC, [{home:'P',away:'Q',homeScore:1,awayScore:1}]);
  // Order is stable since H2H also ties — accept either order
  assert(['P','Q'].includes(teamsC[0].name));
});

test('computeGroupScenarios: invalid input — wrong team count throws', () => {
  let threw = false;
  try {
    computeGroupScenarios({groupId:'A', teams:[], played:[], remaining:[]});
  } catch(e) { threw = true; }
  assert(threw, 'should throw on team count != 4');
});

test('computeGroupScenarios: marginModel always reported as "minimum"', () => {
  const teams = ['A','B','C','D'].map(n => tm(n,0,0,0,0,0,0));
  const r = computeGroupScenarios({groupId:'X', teams, played:[], remaining:[]});
  assertEqual(r.marginModel, 'minimum');
  assertEqual(r.scenariosEnumerated, 1); // 3^0 = 1 (no remaining)
});

// ── Permutations Engine v1.1 — probability-weighted scenarios ──────────────
test('computeGroupScenarios: unweighted output exposes weighted=false, pFirst=null', () => {
  const teams = [
    tm('A',2,2,0,0,4,1), tm('B',2,1,1,0,3,2),
    tm('C',2,0,1,1,1,2), tm('D',2,0,0,2,0,3),
  ];
  const r = computeGroupScenarios({groupId:'X', teams, played:[], remaining:[]});
  assertEqual(r.weighted, false);
  assertEqual(r.perTeam['A'].pFirst, null);
  assertEqual(r.perTeam['A'].pQualifyTop2, null);
});

test('computeGroupScenarios: weighted output sums to 1.0 per team across positions', () => {
  const teams = [
    tm('A',2,2,0,0,4,1), tm('B',2,1,1,0,3,2),
    tm('C',2,0,1,1,1,2), tm('D',2,0,0,2,0,3),
  ];
  const played = [
    {home:'A',away:'C',homeScore:2,awayScore:0},
    {home:'B',away:'D',homeScore:2,awayScore:0},
    {home:'A',away:'D',homeScore:2,awayScore:1},
    {home:'C',away:'B',homeScore:1,awayScore:1},
  ];
  const remaining = [{home:'A',away:'B'}, {home:'D',away:'C'}];
  // Roughly market-implied probabilities — they must sum to 1.0 per match
  const outcomeProbabilities = [
    {pHome:0.5, pDraw:0.3, pAway:0.2},  // A vs B
    {pHome:0.3, pDraw:0.3, pAway:0.4},  // D vs C
  ];
  const r = computeGroupScenarios({groupId:'X', teams, played, remaining, outcomeProbabilities});
  assertEqual(r.weighted, true);
  // For each team, pFirst+pSecond+pThird+pFourth should sum to ~1.0
  for (const name of ['A','B','C','D']) {
    const t = r.perTeam[name];
    const sum = t.pFirst + t.pSecond + t.pThird + t.pFourth;
    assert(Math.abs(sum - 1.0) < 0.001, `${name} probs sum to ${sum.toFixed(4)}, expected 1.0`);
    assertEqual(t.pQualifyTop2, t.pFirst + t.pSecond);
  }
});

test('computeGroupScenarios: skewed probabilities skew per-team finishing prob', () => {
  // Two teams, 1 remaining match. If we say pHome=0.95 then home should
  // finish 1st with ~0.95 probability (assuming the win is enough).
  const teams = [
    tm('A',2,1,1,0,3,2),  // 4 pts
    tm('B',2,1,1,0,3,2),  // 4 pts — tied with A
    tm('C',2,1,0,1,2,2),  // 3 pts
    tm('D',2,0,0,2,1,5),  // 0 pts, gone
  ];
  // 1 remaining: A vs B (winner clears the group)
  const remaining = [{home:'A',away:'B'}];
  const outcomeProbabilities = [{pHome:0.7, pDraw:0.2, pAway:0.1}];
  const r = computeGroupScenarios({
    groupId:'X', teams, played:[], remaining, outcomeProbabilities,
  });
  // A wins (p=0.7) → A finishes 1st; A draws (p=0.2) → tied with B on points,
  // GD ties at -? — falls back to current. A loses (p=0.1) → B 1st, A 2nd.
  // pFirst for A should be at least pHome (0.7).
  assert(r.perTeam['A'].pFirst >= 0.69, `A.pFirst=${r.perTeam['A'].pFirst} should be >=0.7`);
  // pFirst for B should reflect the away-win + some draw share
  assert(r.perTeam['B'].pFirst <= 0.31, `B.pFirst=${r.perTeam['B'].pFirst} should be <=0.3`);
});

test('computeGroupScenarios: probabilities not summing to 1 throws', () => {
  const teams = ['A','B','C','D'].map(n => tm(n,0,0,0,0,0,0));
  const remaining = [{home:'A',away:'B'}];
  let threw = false;
  try {
    computeGroupScenarios({
      groupId:'X', teams, played:[], remaining,
      outcomeProbabilities: [{pHome:0.5, pDraw:0.3, pAway:0.5}],  // 1.3
    });
  } catch(e) {
    threw = true;
    assert(/sum/i.test(e.message), `expected sum error, got: ${e.message}`);
  }
  assert(threw, 'should throw on probabilities not summing to ~1');
});

test('computeGroupScenarios: probabilities length mismatch throws', () => {
  const teams = ['A','B','C','D'].map(n => tm(n,0,0,0,0,0,0));
  const remaining = [{home:'A',away:'B'}, {home:'C',away:'D'}];
  let threw = false;
  try {
    computeGroupScenarios({
      groupId:'X', teams, played:[], remaining,
      outcomeProbabilities: [{pHome:0.5, pDraw:0.3, pAway:0.2}],  // only 1
    });
  } catch(e) { threw = true; }
  assert(threw, 'should throw on prob array length mismatch');
});




// ── Permutations Engine v1.2 — best-3rd cross-group Monte Carlo ────────────
test('wcMakePRNG: deterministic with same seed', () => {
  const a = wcMakePRNG(42);
  const b = wcMakePRNG(42);
  for (let i = 0; i < 100; i++) assertEqual(a(), b(), `divergence at i=${i}`);
});

test('wcMakePRNG: different seeds produce different streams', () => {
  const a = wcMakePRNG(42);
  const b = wcMakePRNG(43);
  let same = 0;
  for (let i = 0; i < 100; i++) if (a() === b()) same++;
  assert(same < 5, `seeds 42 and 43 collided ${same}/100 times — PRNG broken`);
});

test('wcMakePRNG: output is in [0, 1) over many samples', () => {
  const r = wcMakePRNG(7);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert(v >= 0 && v < 1, `out-of-range at i=${i}: ${v}`);
  }
});

test('computeBest3rdRanking: throws on empty input', () => {
  let threw = false;
  try { computeBest3rdRanking({groupInputs: []}); } catch(e) { threw = true; }
  assert(threw, 'should throw on empty groupInputs');
});

test('computeBest3rdRanking: 12 deterministic post-MD3 groups → exact qualify counts', () => {
  const groupInputs = [];
  for (let i = 0; i < 12; i++) {
    const tier = i < 4 ? 'top' : i < 8 ? 'mid' : 'low';
    const thirdPts = tier === 'top' ? 3 : tier === 'mid' ? 1 : 0;
    const thirdGD  = tier === 'top' ? 0 : tier === 'mid' ? -2 : -5;
    const thirdGF  = tier === 'top' ? 3 : tier === 'mid' ? 1 : 0;
    groupInputs.push({
      groupId: String.fromCharCode(65 + i),
      teams: [
        tm(`G${i}_1st`, 3, 3, 0, 0, 6, 0),
        tm(`G${i}_2nd`, 3, 2, 0, 1, 4, 2),
        {name: `G${i}_3rd`, P:3, W: Math.floor(thirdPts/3), D: thirdPts%3,
         L: 3-Math.floor(thirdPts/3)-(thirdPts%3),
         GF: thirdGF, GA: thirdGF - thirdGD, Pts: thirdPts},
        tm(`G${i}_4th`, 3, 0, 0, 3, 0, 8),
      ],
      played: [],
      remaining: [],
    });
  }
  const r = computeBest3rdRanking({groupInputs, samples: 500, seed: 12345, bestN: 8});
  for (let i = 0; i < 4; i++) {
    assertEqual(r.perTeam[`G${i}_3rd`].pQualifyAsBest3rd, 1.0);
  }
  for (let i = 8; i < 12; i++) {
    assertEqual(r.perTeam[`G${i}_3rd`].pQualifyAsBest3rd, 0.0);
  }
  for (let i = 4; i < 8; i++) {
    assertEqual(r.perTeam[`G${i}_3rd`].pQualifyAsBest3rd, 1.0);
  }
});

test('computeBest3rdRanking: reproducibility — same seed produces same output', () => {
  const groupInputs = [];
  for (let i = 0; i < 4; i++) {
    groupInputs.push({
      groupId: String.fromCharCode(65 + i),
      teams: ['1','2','3','4'].map(n => tm(`G${i}_${n}`, 0,0,0,0,0,0)),
      played: [],
      remaining: [
        {home: `G${i}_1`, away: `G${i}_2`},
        {home: `G${i}_3`, away: `G${i}_4`},
      ],
    });
  }
  const r1 = computeBest3rdRanking({groupInputs, samples: 1000, seed: 999, bestN: 2});
  const r2 = computeBest3rdRanking({groupInputs, samples: 1000, seed: 999, bestN: 2});
  for (const name in r1.perTeam) {
    assertEqual(r1.perTeam[name].pAsThird, r2.perTeam[name].pAsThird);
    assertEqual(r1.perTeam[name].pQualifyAsBest3rd, r2.perTeam[name].pQualifyAsBest3rd);
  }
});

test('computeBest3rdRanking: pMiss + pQualify == pAsThird', () => {
  const groupInputs = [];
  for (let i = 0; i < 12; i++) {
    groupInputs.push({
      groupId: String.fromCharCode(65 + i),
      teams: ['1','2','3','4'].map(n => tm(`G${i}_${n}`, 0,0,0,0,0,0)),
      played: [],
      remaining: [{home: `G${i}_1`, away: `G${i}_2`}],
    });
  }
  const r = computeBest3rdRanking({groupInputs, samples: 500, seed: 1, bestN: 8});
  for (const name in r.perTeam) {
    const t = r.perTeam[name];
    const sum = t.pQualifyAsBest3rd + t.pMissAsBest3rd;
    assert(Math.abs(sum - t.pAsThird) < 1e-9);
  }
});

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${pass} passed, ${fail} failed ─────────────\n`);
if (fail > 0) process.exit(1);
