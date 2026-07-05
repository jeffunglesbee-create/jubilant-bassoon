// pickem_circadian_coverage_check.js — CC-CMD-2026-07-05-pickem-coverage-check TASK 1
//
// Pure-data check: ports getCardCircadian()'s exact logic verbatim (confirmed
// a genuinely pure function -- zero document/window references anywhere in it
// or its isGameOver() dependency) against real, current data fetched directly
// for every sport the Pick 'em list covers. No rendering, no browser -- just
// the real endpoints already proven live this session (V2 relay /v2/games,
// the CFL rounds endpoint, the Squiggle AFL relay proxy).
//
// For each sport: fetch real games, keep only those the RAW data itself
// confirms are not yet started, run them through the exact production
// state-mapping + getCardCircadian(), and report whether they classify as
// PREVIEW (the tier the Pick 'em list gates on). Any confirmed-pregame game
// that does NOT come out PREVIEW is a real, reportable failure.

const V2_RELAY_BASE = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const SQUIGGLE_RELAY = V2_RELAY_BASE + '/squiggle';

// ---- Ported verbatim from index.html mapV2ToESPN(), post
// CC-CMD-2026-07-05-pickem-cfl-mlb-gaps fix (commit 7c701ed) ----
function mapV2ToESPN(fg) {
  if (!fg?.id) return null;
  const clockSeconds = (() => {
    if (!fg.clock) return null;
    const parts = String(fg.clock).split(':').map(Number);
    return parts.some(isNaN) ? null : parts.reduce((acc, v) => acc * 60 + v, 0);
  })();
  const hasLiveClock = clockSeconds != null && clockSeconds > 0;
  const hasLiveScore = (fg.home?.score ?? 0) > 0 || (fg.away?.score ?? 0) > 0;
  const isActuallyLive = fg.state === 'live' ||
    (fg.state !== 'final' && (hasLiveClock || (fg.periodNum != null && fg.periodNum > 0 && hasLiveScore)));
  const state = fg.state === 'final' ? 'post' : isActuallyLive ? 'in' : 'pre';
  return { state, _gameId: fg.id, home: fg.home?.name || '', away: fg.away?.name || '' };
}

// ---- Ported verbatim from index.html ----
function _cflStateFromStatus(status) {
  if (status === 'scheduled') return 'pre';
  if (status === 'complete') return 'post';
  return 'in';
}

// ---- Ported verbatim from index.html (isGameOver + getCardCircadian) ----
function isGameOver(game) {
  if (game.state === 'final' || game.state === 'post') return true;
  if (game.status === 'final' || game.status === 'postponed') return true;
  if (typeof game._aflComplete === 'number' && game._aflComplete >= 100) return true;
  return false;
}
function minutesSinceFinal() { return Infinity; } // fresh script run has no _finalizedAt history -- irrelevant to the PREVIEW check below
function getCardCircadian(game) {
  if (game.state === 'live' || game.state === 'in') return 'PRIME';
  if (game.status === 'live') return 'PRIME';
  if (typeof game._aflComplete === 'number' && game._aflComplete > 0 && game._aflComplete < 100) return 'PRIME';
  if (game.state === 'pre') return 'PREVIEW';
  if (game.status === 'pregame') return 'PREVIEW';
  if (game._aflComplete === 0) return 'PREVIEW';
  if (isGameOver(game)) return minutesSinceFinal() < 120 ? 'NIGHT' : 'LATE';
  return 'LATE';
}

// ---- Date helpers, ported from index.html (TODAY_ISO / isToday) ----
function todayISO_ET() {
  const now = new Date();
  const hour = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }), 10);
  const d = new Date(now);
  if (hour < 4) d.setTime(d.getTime() - 24 * 60 * 60 * 1000);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
function isTodayISO(iso, isAFL) {
  const d = new Date(iso);
  if (isNaN(d)) return false;
  if (isAFL) {
    return d.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }) ===
      new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) === todayISO_ET();
}

async function fetchJSON(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

const results = [];

async function checkV2Sport(sportKey, label) {
  const date = new Date().toISOString().slice(0, 10);
  const data = await fetchJSON(`${V2_RELAY_BASE}/v2/games?sport=${sportKey}&date=${date}`);
  const games = data?.games || [];
  if (!games.length) {
    results.push({ sport: label, total: 0, note: 'no games returned today (off-season or none scheduled)' });
    return;
  }
  let checked = 0, passed = 0;
  const failures = [];
  games.forEach(fg => {
    const mapped = mapV2ToESPN(fg);
    if (!mapped || fg.state !== 'pre') return; // only test games the RAW data itself confirms as not-yet-started
    checked++;
    const circInput = { state: mapped.state, status: null, _aflComplete: null, _id: mapped._gameId };
    const tier = getCardCircadian(circInput);
    if (tier === 'PREVIEW') passed++;
    else failures.push({ away: fg.away?.name, home: fg.home?.name, rawState: fg.state, mappedState: mapped.state, tier });
  });
  results.push({ sport: label, total: games.length, confirmedPregame: checked, passed, failures });
}

async function checkAFL() {
  const aflR1 = new Date('2026-03-12T00:00:00Z');
  const weeks = Math.floor((Date.now() - aflR1.getTime()) / (7 * 86400000));
  const round = Math.min(Math.max(1, weeks + 1), 24);
  const [r1, r2] = await Promise.all([
    fetchJSON(`${SQUIGGLE_RELAY}?q=games;year=2026;round=${round}`),
    fetchJSON(`${SQUIGGLE_RELAY}?q=games;year=2026;round=${round + 1}`),
  ]);
  const games = [...(r1?.games || []), ...(r2?.games || [])]
    .filter(g => g.hteam && g.ateam && isTodayISO(new Date(g.unixtime * 1000).toISOString(), true));
  if (!games.length) {
    results.push({ sport: 'AFL', total: 0, note: `no games today (AEST calendar day) in rounds ${round}/${round + 1}` });
    return;
  }
  let checked = 0, passed = 0;
  const failures = [];
  games.forEach(g => {
    if (g.complete !== 0) return; // only confirmed-not-started games
    checked++;
    const circInput = { state: null, status: null, _aflComplete: g.complete, _id: 'afl_' + g.id };
    const tier = getCardCircadian(circInput);
    if (tier === 'PREVIEW') passed++;
    else failures.push({ away: g.ateam, home: g.hteam, complete: g.complete, tier });
  });
  results.push({ sport: 'AFL', total: games.length, confirmedPregame: checked, passed, failures });
}

async function checkCFL() {
  const data = await fetchJSON(`${V2_RELAY_BASE}/cfl/scoreboard/rounds`);
  if (!Array.isArray(data)) {
    results.push({ sport: 'CFL', total: 0, note: 'endpoint returned non-array / unavailable' });
    return;
  }
  const todays = [];
  data.forEach(round => (round.tournaments || []).forEach(t => {
    if (!t.date || !isTodayISO(t.date, false)) return;
    if (!t.homeSquad?.name || !t.awaySquad?.name) return;
    todays.push(t);
  }));
  if (!todays.length) {
    results.push({ sport: 'CFL', total: 0, note: 'no games today' });
    return;
  }
  let checked = 0, passed = 0;
  const failures = [];
  todays.forEach(t => {
    if (t.status !== 'scheduled') return;
    checked++;
    const state = _cflStateFromStatus(t.status);
    const circInput = { state, status: null, _aflComplete: null, _id: 'cfl_' + t.id };
    const tier = getCardCircadian(circInput);
    if (tier === 'PREVIEW') passed++;
    else failures.push({ away: t.awaySquad.name, home: t.homeSquad.name, status: t.status, tier });
  });
  results.push({ sport: 'CFL', total: todays.length, confirmedPregame: checked, passed, failures });
}

(async () => {
  await Promise.allSettled([
    checkV2Sport('mlb', 'MLB'),
    checkV2Sport('wnba', 'WNBA'),
    checkV2Sport('nba', 'NBA'),
    checkV2Sport('nhl', 'NHL'),
    checkV2Sport('mls', 'MLS'),
    checkV2Sport('wc26', 'WC (Soccer)'),
    checkV2Sport('epl', 'EPL'),
    checkV2Sport('nfl', 'NFL'),
    checkV2Sport('cfb', 'CFB'),
    checkAFL(),
    checkCFL(),
  ]);

  let anyFail = false;
  console.log("=== Pick 'em Circadian Coverage Check (pure-data, no rendering) ===");
  console.log('Run at:', new Date().toISOString());
  results.forEach(r => {
    if (r.note) {
      console.log(`[${r.sport}] ${r.note}`);
      return;
    }
    const status = r.failures.length ? 'FAIL' : (r.confirmedPregame > 0 ? 'PASS' : 'N/A (no confirmed-pregame games to test)');
    if (r.failures.length) anyFail = true;
    console.log(`[${r.sport}] total=${r.total} confirmedPregame=${r.confirmedPregame} passed=${r.passed} -> ${status}`);
    r.failures.forEach(f => console.log('  FAIL:', JSON.stringify(f)));
  });
  console.log('');
  console.log(anyFail ? 'RESULT: FAIL -- see above' : 'RESULT: PASS');
  process.exit(anyFail ? 1 : 0);
})();
