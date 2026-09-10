// Every enabled V2 sport key must have something that CREATES a card for it.
//
// WHY THIS EXISTS, measured 2026-09-10
//
// `ec6e3859` opened eight European gates and no card appeared. The gate was
// never the whole mechanism: three EFL Championship fixtures sat in espnScores
// on the ET date the app was rendering, and no section existed to hold them, so
// the chip bar summed to exactly ALL(55) without them.
//
// This class of defect is invisible for months at a time because it only shows
// when a competition is IN SEASON. This file's own SOCCER_LEAGUES comment dates
// the same gap to 2026-08-02 and says so in as many words: "a real, systemic gap
// masked entirely by the May-Aug summer break, not visible until each league's
// real resume date."
//
// A summer break is not a test strategy. The invariant is static, so it holds in
// July as well as September:
//
//   every key in FIELD_V2_SOURCES has a card CREATOR, and the creator is named.
//
// Three legitimate creators, and the check knows all three:
//   1. injectV2SportSection('<key>', '<label>')     — the V2 path
//   2. SOCCER_LEAGUES entry -> fetchSoccerFixtures  — the ESPN-direct path
//   3. a declared exemption below, which must say WHICH function creates it
//
// Score OVERLAYS are not creators. fetchPLFixtures, fetchV2AllScores and
// fdPrefetchSoccerLive all write into espnScores and none of them ever makes a
// card. That distinction is the entire bug, so the check does not count them.

import { readFileSync } from 'node:fs';

const SELF_TEST = process.argv.includes('--self-test');
const FILE = process.argv.find(a => a.endsWith('.js') && !a.includes('check-v2')) || 'src/legacy/field.js';

let failed = 0;
const check = (n, ok, d) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); if (!ok) { failed++; if (d) console.log(`      → ${d}`); } };

/**
 * Comments and string literals blanked, in ONE pass.
 *
 * A two-pass version (comments, then strings) is wrong and was written that way
 * first: this file contains `'https://field-relay-nba...'`, and stripping
 * comments first eats `//field-relay-nba...'` as a line comment, leaving an
 * unterminated quote that makes the string pass mis-pair across lines and
 * swallow whole declarations. It failed loudly — `const FIELD_V2_SOURCES = {`
 * was simply not found — which is the only reason it did not ship as a census
 * that silently returned the wrong keys.
 */
export function strip(src, { blankStrings = true } = {}) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      for (; i < stop; i++) out += src[i] === '\n' ? '\n' : ' ';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; out += q; i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') { out += blankStrings ? '  ' : src.slice(i, i + 2); i += 2; continue; }
        out += blankStrings ? (src[i] === '\n' ? '\n' : ' ') : src[i]; i++;
      }
      if (i < src.length) { out += q; i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

export function blockOf(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  const j = src.indexOf(decl.trimEnd().endsWith('[') ? '\n];' : '\n};', i);
  return j < 0 ? null : src.slice(i, j);
}

/**
 * The keys of FIELD_V2_SOURCES.
 * Stripping first is load-bearing: an earlier version of this census counted
 * `T00` three times, because `'2026-06-11T00:00:00Z'` contains `T00:` and the
 * date gates are the only entries with string values. A census that invents
 * three keys will happily report them as missing a card path forever.
 */
export function v2Keys(src) {
  const b = blockOf(strip(src), 'const FIELD_V2_SOURCES = {');
  if (!b) return null;
  return [...b.matchAll(/([A-Za-z][A-Za-z0-9_]*)\s*:/g)]
    .map(m => m[1]).filter(k => k !== 'FIELD_V2_SOURCES');
}

/** Call sites, read from RAW source because the key is a string literal. */
export function injected(src) {
  return [...new Set([...src.matchAll(/injectV2SportSection\(\s*['"]([a-z0-9]+)['"]/g)].map(m => m[1]))];
}

/** V2 keys covered by a SOCCER_LEAGUES entry, via ESPN_TO_V2_MAP. */
export function soccerLeagueKeys(src) {
  // COMMENTS blanked, string contents KEPT. Two wrong versions preceded this
  // one: matching object literals across raw comment blocks dropped eng.league
  // (EFL Cup) from the printed line, and blanking strings as well emptied
  // ESPN_TO_V2_MAP so every id resolved to nothing. Both left the verdict
  // correct and the printed evidence wrong, which is the failure this gate
  // exists to catch happening inside the gate.
  const code = strip(src, { blankStrings: false });
  const sl = blockOf(code, 'const SOCCER_LEAGUES = [');
  const mp = blockOf(code, 'const ESPN_TO_V2_MAP = {');
  if (!sl || !mp) return { keys: [], unmapped: [], espn: [] };
  // Entry-shaped: only count `league:` that sits inside a real object literal
  // with a `section:` beside it. A bare `league:` in prose must not count.
  // The id class MUST include underscore. Without it `eng.league_cup` matched
  // as `eng.league`, the object-literal match then failed to complete, and the
  // EFL Cup entry vanished from the printed table while the verdict stayed
  // green. A truncated identifier is a wrong identifier.
  const espn = [...sl.matchAll(/\{[^{}]*?league:\s*['"]([a-z0-9._]+)['"][^{}]*?section:\s*['"][^'"]+['"][^{}]*?\}/g)]
    .map(m => m[1]);
  const map = Object.fromEntries(
    [...mp.matchAll(/['"]([a-z0-9._]+)['"]\s*:\s*['"]([a-z0-9]+)['"]/g)].map(m => [m[1], m[2]]));
  return { espn, keys: espn.map(e => map[e]).filter(Boolean), unmapped: espn.filter(e => !map[e]) };
}

// Keys whose cards are created somewhere other than the two generic paths.
// Each MUST name the creator: an exemption with no named function is how this
// whole class of gap got written in the first place.
export const DECLARED_OTHER_CREATOR = {
  nba:   'buildTodaySchedule hardcoded nbaGames -> sections.push("NBA Playoffs")',
  nhl:   'buildTodaySchedule hardcoded nhlGames -> sections.push',
  mlb:   'buildTodaySchedule hardcoded mlbGames -> sections.push',
  afl:   'buildTodaySchedule aflGames + the Squiggle adapter -> sections.push("Australian Football (AFL)")',
  wc26:  'maybePushWorldCup() pushes the FIFA section from wc26Raw',
};

export function audit(src) {
  const keys = v2Keys(src);
  const inj = injected(src);
  const sl = soccerLeagueKeys(src);
  const covered = new Set([...inj, ...sl.keys, ...Object.keys(DECLARED_OTHER_CREATOR)]);
  return { keys, inj, sl, orphans: keys.filter(k => !covered.has(k)) };
}

if (SELF_TEST) {
  check('strip removes a date literal so T00 is never counted as a key',
    !strip("const FIELD_V2_SOURCES = {\n wc26: new Date('2026-06-11T00:00:00Z'),\n};").includes('T00'),
    'the first census counted T00 three times and would have reported three phantom orphans');

  const FAKE = `const FIELD_V2_SOURCES = {
  alpha: true, beta: true,
  gamma: new Date() >= new Date('2026-06-11T00:00:00Z'),
};
const ESPN_TO_V2_MAP = {
  'xx.1':'beta',
};
const SOCCER_LEAGUES = [
  { league: 'xx.1', section: 'Beta League' },
];
if (FIELD_V2_SOURCES.alpha) injectV2SportSection('alpha', 'Alpha');
`;
  const a = audit(FAKE);
  check('the census finds exactly the three real keys',
    JSON.stringify(a.keys) === JSON.stringify(['alpha', 'beta', 'gamma']), JSON.stringify(a.keys));
  check('an injected key counts as covered', a.inj.includes('alpha'));
  check('a SOCCER_LEAGUES key counts as covered via the ESPN map', a.sl.keys.includes('beta'));

  // MUTATION: the whole point. A key with neither path must surface.
  check('MUTATION: a key with NO creator is reported as an orphan',
    a.orphans.includes('gamma'),
    'the check cannot detect the one thing it exists to detect');

  // MUTATION: an overlay must never be mistaken for a creator.
  const OVERLAY = FAKE.replace("injectV2SportSection('alpha', 'Alpha')", "fetchPLFixtures()");
  check('MUTATION: an overlay call does NOT count as a card creator',
    audit(OVERLAY).orphans.includes('alpha'),
    'fetchPLFixtures writes espnScores and creates nothing; counting it would re-admit the exact bug');

  // MUTATION: prose must not be able to satisfy a SOCCER_LEAGUES entry.
  const PROSE = FAKE.replace("{ league: 'xx.1', section: 'Beta League' },",
                             "// league: 'xx.1' was removed from this array");
  check('MUTATION: a commented-out SOCCER_LEAGUES entry does not cover its key',
    audit(PROSE).orphans.includes('beta'),
    'a key would look covered by a line that no longer runs');

  check('every declared exemption names a creator function',
    Object.values(DECLARED_OTHER_CREATOR).every(v => v && v.length > 20 && /[A-Za-z]\(|sections\.push/.test(v)),
    'an exemption with no named creator is how this gap got written');

  console.log(`\n${failed === 0 ? 'SELF-TEST PASS' : `${failed} FAILING`}`);
  process.exit(failed === 0 ? 0 : 1);
}

const src = readFileSync(FILE, 'utf8');
const a = audit(src);
if (!a.keys) { console.error(`could not find FIELD_V2_SOURCES in ${FILE}`); process.exit(1); }

console.log(`${FILE}`);
console.log(`checked ${a.keys.length} of ${a.keys.length} FIELD_V2_SOURCES keys — every key, not a sample\n`);
console.log(`  injectV2SportSection  ${a.inj.join(' ') || '(none)'}`);
console.log(`  SOCCER_LEAGUES        ${a.sl.espn.join(' ') || '(none)'}  ->  ${a.sl.keys.join(' ') || '(none)'}`);
if (a.sl.unmapped.length) console.log(`  (not in ESPN_TO_V2_MAP, so not counted: ${a.sl.unmapped.join(' ')})`);
console.log(`  declared elsewhere    ${Object.keys(DECLARED_OTHER_CREATOR).join(' ')}\n`);

check('every FIELD_V2_SOURCES key has a card CREATOR, not just a score overlay',
  a.orphans.length === 0,
  `${a.orphans.length} key(s) can be enabled and will render NOTHING: ${a.orphans.join(', ')}\n`
  + '      Fix by adding injectV2SportSection(<key>, <label matching SPORT_CHIP_LABELS>),\n'
  + '      or a SOCCER_LEAGUES entry, or a DECLARED_OTHER_CREATOR line naming the real creator.\n'
  + '      Enabling a gate is not enough — that is CC-CMD-2026-09-10-eu-sections-not-injected.');

process.exit(failed === 0 ? 0 : 1);
