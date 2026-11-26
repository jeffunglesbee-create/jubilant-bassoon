#!/usr/bin/env node
// Task 0 of docs/CC-CMD-2026-11-26-night-owl-sport-label-predicates.md (Rule 68 / Rule 100). The Night Owl fallback prompt picks a sport's vocabulary three times from the
// game's _sport LABEL with substring tests: the `_terms` chain, the `_marginUnit` chain and getFieldVoice. A label is a display string ("College Football", "Premier League"),
// and a substring test written for a code ('football', 'epl') can land on the wrong sport or on none. This reads src/legacy/field.js, the source, runs the three real
// expressions for every label the client builds, and prints which sport each one lands on against the sport the label is.
// Counts and class names only; no brief text. With --write it writes outbox/night-owl-sport-label-branches-<date>.json (the reading before a fix); with --write-after,
// outbox/night-owl-sport-label-branches-after-<date>.json (the same reading after it).
//
//   node scripts/probe-night-owl-sport-label-branches.mjs [--write | --write-after]
import fs from 'node:fs';

const DATE = '2026-11-26';
const html = fs.readFileSync(new URL('../src/legacy/field.js', import.meta.url), 'utf8');
const die = (m) => { console.error('PROBE BROKEN: ' + m); process.exit(2); };

const fnStart = html.indexOf('async function fetchNightOwlFromClaude(topGame){');
if (fnStart < 0) die('fetchNightOwlFromClaude not found');
const fn = html.slice(fnStart, html.indexOf('\n}\n', fnStart) + 2);

const termsM = /const _terms = ([\s\S]*?);\n  \/\/ Tier 1A/.exec(fn);
const unitM = /const _marginUnit = ([\s\S]*?: 'point';)/.exec(fn);
if (!termsM || !unitM) die('_terms or _marginUnit chain not found');
const { isSoccerSportLabel, isNonSoccerFootballLabel } = await import('node:module').then((m) => m.createRequire(import.meta.url)('../field_utils.js'));   // the pure copies; smoke A748 requires the inline ones identical

const termsOf = (label) => new Function('_sp', 'return ' + termsM[1])(label.toLowerCase());
const unitOf = (label) => new Function('_sp', 'isSoccerSportLabel', 'isNonSoccerFootballLabel',
  "const _isAFLsport = _sp.includes('afl') || (_sp.includes('australian') && _sp.includes('football'));\n const _marginUnit = " + unitM[1] + '\n return _marginUnit;')(label.toLowerCase(), isSoccerSportLabel, isNonSoccerFootballLabel);

const vStart = html.indexOf('function getFieldVoice(sport) {'), vEnd = html.indexOf('\n}\n', vStart);
if (vStart < 0) die('getFieldVoice not found');
const voiceSrc = html.slice(vStart, vEnd + 2);
const voiceOf = (label) => new Function('FIELD_BASEBALL_VOICE', 'FIELD_HOCKEY_VOICE', 'FIELD_SOCCER_VOICE', 'isNonSoccerFootballLabel', voiceSrc + '\n return getFieldVoice(' + JSON.stringify(label) + ');')('@BASEBALL', '@HOCKEY', '@SOCCER', isNonSoccerFootballLabel);

const classOfTerms = (t) => t.startsWith('SPORT=BASEBALL') ? 'baseball' : t.startsWith('Sport: Ice Hockey') ? 'hockey' : t.startsWith('Sport: American Football') ? 'american-football'
  : t.startsWith('Sport: Australian') ? 'afl' : t.startsWith('Sport: Canadian') ? 'cfl' : t.startsWith('Sport: WNBA') ? 'wnba' : t.startsWith('Sport: Football (soccer)') ? 'soccer'
  : t.startsWith('Sport: Basketball') ? 'basketball' : 'other:' + t.slice(0, 20);
const classOfVoice = (v) => v === '@BASEBALL' ? 'baseball' : v === '@HOCKEY' ? 'hockey' : v === '@SOCCER' ? 'soccer' : v === '' ? 'none' : v.startsWith('Australian') ? 'afl' : v.startsWith('Canadian') ? 'cfl'
  : v.startsWith('American Football') ? 'american-football' : v.startsWith('WNBA') ? 'wnba' : v.startsWith('Football (soccer)') ? 'soccer' : 'other:' + v.slice(0, 20);
const classOfUnit = (u) => u;

// the labels the client builds, with the sport each one is
const tbl = /const V2_SECTION_LABEL = \{([\s\S]*?)\n\};/.exec(html), sl = /const SOCCER_LEAGUES = \[([\s\S]*?)\n\];/.exec(html);
if (!tbl || !sl) die('label tables not found');
const v2 = Object.fromEntries([...tbl[1].matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
const KEY_SPORT = { nba: 'basketball', wnba: 'wnba', nfl: 'american-football', cfb: 'american-football', nhl: 'hockey', mlb: 'baseball', afl: 'afl' };
const SOCCER_KEYS = ['mls', 'epl', 'laliga', 'seriea', 'ligue1', 'eflchamp', 'eflone', 'efltwo', 'ucl', 'europa', 'conference', 'uclqual', 'europaqual', 'conferencequal', 'bundesliga', 'wc26'];
const rows = new Map();
for (const [k, label] of Object.entries(v2)) { if (KEY_SPORT[k]) rows.set(label, KEY_SPORT[k]); else if (SOCCER_KEYS.includes(k)) rows.set(label, 'soccer'); }
for (const m of sl[1].matchAll(/section:\s*'([^']+)'/g)) rows.set(m[1], 'soccer');
if (rows.size < 24) die('label census is short: ' + rows.size);

const out = [...rows].sort().map(([label, sport]) => {
  const t = classOfTerms(termsOf(label)), u = unitOf(label), v = classOfVoice(voiceOf(label));
  const wantUnit = { baseball: 'run', hockey: 'goal', soccer: 'goal' }[sport] ?? 'point';
  return { label, sport, terms: t, termsOk: t === sport || (sport === 'basketball' && t === 'basketball'), margin_unit: u, unitOk: u === wantUnit, voice: v, voiceOk: v === sport || (sport === 'basketball' && v === 'none') || (sport === 'wnba' && v === 'wnba') };
});
const bad = out.filter((r) => !r.termsOk || !r.unitOk || !r.voiceOk);
const report = {
  probe: 'scripts/probe-night-owl-sport-label-branches.mjs', date: DATE,
  coverage: `${out.length} labels (V2_SECTION_LABEL plus SOCCER_LEAGUES sections), read from src/legacy/field.js; the three expressions are cut out of the source and run`,
  note: "voice 'none' for basketball is accepted (the NBA has no voice constant); a label is a mismatch when the vocabulary line, the margin unit or the voice lands on another sport or on none",
  mismatches: bad.length,
  wrongSport: out.filter((r) => (!r.termsOk && r.terms !== r.sport) || (!r.voiceOk && r.voice !== 'none')).map((r) => ({ label: r.label, is: r.sport, terms: r.terms, margin_unit: r.margin_unit, voice: r.voice })),
  rows: out,
};
console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
console.log(out.map((r) => `${r.label.padEnd(36)} ${r.sport.padEnd(18)} terms:${(r.termsOk ? 'ok' : r.terms).padEnd(20)} unit:${(r.unitOk ? 'ok' : r.margin_unit).padEnd(6)} voice:${r.voiceOk ? 'ok' : r.voice}`).join('\n'));
for (const [flag, name] of [['--write', `night-owl-sport-label-branches-${DATE}.json`], ['--write-after', `night-owl-sport-label-branches-after-${DATE}.json`]]) {
  if (process.argv.includes(flag)) { fs.writeFileSync(new URL(`../outbox/${name}`, import.meta.url), JSON.stringify(report, null, 2) + '\n'); console.error(`wrote outbox/${name}`); }
}
