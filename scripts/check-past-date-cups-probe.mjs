#!/usr/bin/env node
// Runs past_date_cups_probe.js UNCHANGED against a stub browser and a stub relay, and asserts the verdict it prints, then mutates the probe and asserts each mutant
// changes a verdict (Rule 90, MUTATE-FIRST-A). It exists because the probe's first edit after its first live run shipped a TDZ crash that only a runner found (2026-11-11,
// run 42952726748: `allPast` read before its `const`), and because "past" there must be the PAGE's (window.TODAY_ISO), which the first live run got wrong (22:23 ET on 11-10
// is still 11-10 in the page, 11-11 in UTC).
//
// COVERAGE (Rule 91): the probe's control flow, verdict logic and date selection, with a page that draws exactly the stub relay's games. It does NOT test the real page, the real
// relay, Playwright, or the DOM selectors against index.html; the live run on a runner does that. Not wired into the deploy gate (the probe is dispatch-only).
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROBE = readFileSync('past_date_cups_probe.js', 'utf8');
const root = mkdtempSync(join(tmpdir(), 'pdc-probe-'));
process.on('exit', () => rmSync(root, { recursive: true, force: true }));

const STUB = `
const TODAY = process.env.STUB_TODAY || '2026-11-10';
const DEFECT = process.env.STUB_DEFECT;
const GAMES = {
  'epl|2026-11-07': [['Arsenal','Chelsea'],['Spurs','Leeds']],
  'facup|2026-11-07': [['A','B'],['C','D'],['E','F']], 'facup|2026-11-08': [['G','H'],['I','J']],
  'eflcup|2026-10-28': [['K','L'],['M','N']], 'eflcup|2026-10-27': [['O','P']],
  'efltrophy|2026-11-10': [['T1','T2']], 'efltrophy|2026-11-03': [['Q','R'],['S','T']], 'efltrophy|2026-10-27': [['U','V']],
};
const KEY = { 'Premier League': 'epl', 'FA Cup': 'facup', 'EFL Cup': 'eflcup', 'EFL Trophy': 'efltrophy' };
global.fetch = async (url) => { const m = /sport=([a-z]+)&date=([\\d-]+)/.exec(String(url));
  const g = (GAMES[m[1] + '|' + m[2]] || []).map(([h, a]) => ({ home: { name: h }, away: { name: a } }));
  return { ok: true, status: 200, json: async () => ({ games: g }) }; };
let iso = null;
const cardsFor = (label) => (DEFECT === 'trophy-empty' && label === 'EFL Trophy') ? [] : (GAMES[KEY[label] + '|' + iso] || []);
global.window = { SW_VERSION: 'stub', TODAY_ISO: TODAY, goToDate: (d) => { iso = d; } };
global.document = { querySelector: () => null, querySelectorAll: (sel) => {
  if (sel === '.game-card') return Object.keys(KEY).flatMap(l => cardsFor(l)).concat(new Array(5).fill({}));
  let m = /\\.game-card\\[data-sport="([^"]+)"\\]/.exec(sel);
  if (m) return cardsFor(m[1]).map(([h, a]) => ({ getAttribute: (n) => (n === 'data-home' ? h : a) }));
  m = /\\.sport-section\\[data-sport="([^"]+)"\\]/.exec(sel);
  if (m) return cardsFor(m[1]).length ? [{}] : [];
  return []; } };
const page = { on() {}, goto: async () => {}, waitForFunction: async () => {}, waitForTimeout: async () => {}, evaluate: async (fn, arg) => fn(arg), $: async () => null };
exports.chromium = { launch: async () => ({ newContext: async () => ({ newPage: async () => page }), close: async () => {} }) };
`;
mkdirSync(join(root, 'stub/node_modules/@playwright/test'), { recursive: true });
writeFileSync(join(root, 'stub/node_modules/@playwright/test/index.js'), STUB);

let n = 0;
const run = (src, env) => {
  const d = join(root, 'run' + n++); mkdirSync(d);
  writeFileSync(join(d, 'probe.js'), src); cpSync(join(root, 'stub/node_modules'), join(d, 'node_modules'), { recursive: true });
  let code = 0, err = '';
  try { execFileSync('node', ['probe.js'], { cwd: d, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }); } catch (e) { code = e.status ?? 1; err = String(e.stderr); }
  let verdict = null;
  try { const f = JSON.parse(readFileSync(join(d, 'outbox', readdirOutbox(d)), 'utf8')); verdict = f.verdict; } catch { verdict = 'NO-MANIFEST ' + err.slice(0, 160).replace(/\n/g, ' '); }
  return { code, verdict };
};
import { readdirSync } from 'node:fs';
const readdirOutbox = (d) => readdirSync(join(d, 'outbox')).find(f => /manifest.*\.json$/.test(f));

let bad = 0, total = 0;
const expect = (name, got, want, wantNot) => {
  total++;
  const ok = wantNot ? got.verdict !== want && !got.verdict.startsWith('NO-MANIFEST') : got.verdict === want;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}: verdict=${got.verdict} exit=${got.code} (wanted ${wantNot ? 'not ' : ''}${want})`);
};
console.log('SCENARIOS (the real probe file, a stub browser and relay)');
expect('S1 page today 2026-11-10, healthy page', run(PROBE, { STUB_TODAY: '2026-11-10' }), 'PASS');
expect('S2 page today 2026-11-03: the fixed cup dates are not past', run(PROBE, { STUB_TODAY: '2026-11-03' }), 'BROKEN-DATE');
expect('S3 healthy dates, page draws no Trophy cards', run(PROBE, { STUB_TODAY: '2026-11-10', STUB_DEFECT: 'trophy-empty' }), 'FAIL');
expect('S4 page today 2026-11-08: a cup date equals today', run(PROBE, { STUB_TODAY: '2026-11-08' }), 'BROKEN-DATE');

console.log('\nMUTANTS of the probe (anchor asserted exactly once; each must change the verdict of the scenario that guards it)');
const M = (id, old, neu, env, want, what) => ({ id, old, neu, env, want, what });
const mutants = [
  M('Ma', "out.verdict = !allPast ? 'BROKEN-DATE' : !out.controls.ok", "out.verdict = !out.controls.ok", { STUB_TODAY: '2026-11-03' }, 'BROKEN-DATE', 'the BROKEN-DATE guard removed'),
  M('Mb', 'addDays(todayIso, -(i + 1))', 'addDays(todayIso, -i)', { STUB_TODAY: '2026-11-10' }, 'PASS', "the scan includes the page's own today"),
  M('Mc', 'pastBranch: iso < todayIso', 'pastBranch: iso <= todayIso', { STUB_TODAY: '2026-11-08' }, 'BROKEN-DATE', "'<' relaxed to '<=' (a date equal to today counts as past)"),
  M('Md', 'pastBranch: iso < todayIso', 'pastBranch: true', { STUB_TODAY: '2026-11-03' }, 'BROKEN-DATE', 'pastBranch always true'),
];
for (const m of mutants) {
  const c = PROBE.split(m.old).length - 1;
  if (c !== 1) { bad++; total++; console.log(`FAIL  ${m.id}: ANCHOR occurs ${c} times, not once; NOTHING WAS MUTATED`); continue; }
  const src = PROBE.replace(m.old, () => m.neu);
  if (src === PROBE) { bad++; total++; console.log(`FAIL  ${m.id}: identical to the source`); continue; }
  expect(`${m.id} ${m.what}`, run(src, m.env), m.want, true);
}
console.log(`\n${total - bad} of ${total} assertions hold (4 scenarios, ${mutants.length} mutants). Not tested: the real page, the real relay, Playwright, the DOM selectors.`);
process.exit(bad ? 1 : 0);
