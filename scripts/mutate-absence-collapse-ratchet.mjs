#!/usr/bin/env node
// Rule 90 for the absence-collapse ratchet (docs/CC-CMD-2026-10-16-absence-
// collapse-ratchet.md, Task 3). Every mutation must turn the gate red, and the
// three that break the MATCHER must also keep the ratchet from reporting a
// pass: under a ratchet a matcher that stopped matching reads as improvement.
//
//   usage: node scripts/mutate-absence-collapse-ratchet.mjs <relay-root>
//
// Anchor discipline: each source mutation asserts exactly one match and that
// the file changed on disk; every file is restored from memory and compared
// byte for byte. NOT CAUGHT with nothing mutated is worse than no test.

import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const RELAY = process.argv[2];
if (!RELAY || !existsSync(join(RELAY, 'src/index.js'))) {
    console.error('usage: mutate-absence-collapse-ratchet.mjs <field-relay-nba checkout>');
    process.exit(2);
}
const SCRIPT = 'scripts/check-absence-collapse.mjs';
const BASELINE = 'docs/absence-collapse-baseline.json';
const gate = (relay = RELAY) => spawnSync('node', [SCRIPT, '.', relay,
    '--require=src/legacy/field.js', '--require=field-relay-nba/src/index.js',
    `--baseline=${BASELINE}`, `--baseline=${join(relay, BASELINE)}`], { encoding: 'utf8' });

// The clean tree must pass first, or every "caught" below is meaningless.
const clean = gate();
if (clean.status !== 0 || !/ratchet OK/.test(clean.stdout)) {
    console.error('FAIL: the unmutated tree does not pass the ratchet; nothing below would mean anything');
    console.error(clean.stdout.slice(-800) + clean.stderr.slice(-800));
    process.exit(1);
}
console.log('baseline run: ratchet OK on the unmutated tree');

let bad = 0;
const verdict = (name, r, { mustSay, mustNotSay = /ratchet OK/ }) => {
    const out = r.stdout + r.stderr;
    const caught = r.status !== 0 && mustSay.test(out) && !mustNotSay.test(out);
    if (!caught) { bad++; console.log(`NOT CAUGHT  ${name}\n${out.slice(-600)}`); }
    else console.log(`caught      ${name}  (exit ${r.status}; ${out.match(mustSay)[0]})`);
};

// Edit one file in place for the duration of fn, then restore and verify.
function withEdit(file, from, to, fn) {
    const original = readFileSync(file, 'utf8');
    const hits = original.split(from).length - 1;
    if (hits !== 1) { bad++; console.log(`NOT APPLIED  ${file}: anchor matched ${hits} times`); return; }
    try {
        writeFileSync(file, original.replace(from, to));
        if (readFileSync(file, 'utf8') === original) { bad++; console.log(`NOT APPLIED  ${file}: unchanged on disk`); return; }
        fn();
    } finally {
        writeFileSync(file, original);
        if (readFileSync(file, 'utf8') !== original) { console.error(`FAIL: ${file} was not restored`); process.exit(1); }
    }
}
function withNewFile(file, body, fn) {
    if (existsSync(file)) { bad++; console.log(`NOT APPLIED  ${file} already exists`); return; }
    try { writeFileSync(file, body); fn(); } finally { unlinkSync(file); }
}

// The collapse is assembled, not written, so this file is not itself a finding:
// a literal here would add one flagged and one SUPPRESSED site to the baseline.
const COLLAPSED = 'export async function f(res) { return await res.json() ' + '|' + '| []; }';
const PRAGMA = ' // absence' + '-ok: mutation';

// M1 — a new unsuppressed collapse on an external read.
withNewFile('__absence_mutation__.js', COLLAPSED + '\n', () =>
    verdict('M1 a new unsuppressed collapse', gate(), { mustSay: /RATCHET FAILED: jubilant-bassoon flagged \[\|\| \[\]\]/ }));

// M1r — the same on the RELAY side: its own baseline, not this repo's.
withNewFile(join(RELAY, '__absence_mutation__.js'), COLLAPSED + '\n', () =>
    verdict('M1r a new unsuppressed collapse in the relay', gate(), { mustSay: /RATCHET FAILED: field-relay-nba flagged \[\|\| \[\]\]/ }));

// M2 — a new SUPPRESSED collapse. Passes a flagged-only ratchet by construction.
withNewFile('__absence_mutation__.js', COLLAPSED + PRAGMA + '\n', () =>
    verdict('M2 a new suppression', gate(), { mustSay: /RATCHET FAILED: jubilant-bassoon suppressed \[\|\| \[\]\]/ }));

// M2b — the cheat the suppression ratchet exists for: suppress an EXISTING
// finding. Flagged FALLS by one and suppressed rises by one.
{
    const scan = spawnSync('node', [SCRIPT, '.', '--json'], { encoding: 'utf8' }).stdout;
    const OP = '|' + '| []';   // assembled for the same reason as COLLAPSED
    // The first such site whose line is unique in its file, so the anchor is too.
    const where = (f) => [f.at.replace(/^\.\//, '').replace(/:\d+$/, ''), Number(f.at.split(':').pop())];
    const lineOf = (f) => { const [file, n] = where(f); return readFileSync(file, 'utf8').split('\n')[n - 1]; };
    const site = JSON.parse(scan.slice(scan.indexOf('\n{') + 1)).flagged.find(f => f.op === OP && f.at.startsWith('./src/')
        && readFileSync(where(f)[0], 'utf8').split(lineOf(f)).length === 2);
    const [file] = where(site);
    const text = lineOf(site);
    withEdit(file, text, text + PRAGMA, () =>
        verdict(`M2b suppress an existing finding (${site.at})`, gate(), { mustSay: /RATCHET FAILED: jubilant-bassoon suppressed \[\|\| \[\]\]/ }));
}

// M3 — the matcher stops matching. The three ways it can, and in none of them
// may the ratchet report a pass.
withEdit(SCRIPT, "const EXTS = new Set(['.js', '.mjs', '.cjs']);", "const EXTS = new Set(['.none']);", () =>
    verdict('M3a the walker reads no files (classifier still passes its fixtures)', gate(), { mustSay: /RATCHET NOT EVALUATED/ }));
withEdit(SCRIPT, "if (!EXTERNAL.some(re => re.test(line))) return { kind: 'clean' };", "return { kind: 'clean' };", () =>
    verdict('M3b the classifier flags nothing', gate(), { mustSay: /CLASSIFIER SELF-TEST FAILED|RATCHET NOT EVALUATED/ }));
{
    const empty = join(mkdtempSync(join(tmpdir(), 'acr-')), 'field-relay-nba');
    mkdirSync(empty);
    verdict('M3c the relay checkout is empty', gate(empty), { mustSay: /RATCHET NOT EVALUATED/ });
}

console.log(bad ? `\n${bad} mutation(s) not applied or not caught` : '\nall mutations applied and caught; none reported a pass');
process.exit(bad ? 1 : 0);
