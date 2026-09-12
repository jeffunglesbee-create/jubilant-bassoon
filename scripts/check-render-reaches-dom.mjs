#!/usr/bin/env node
// A render function must trace to a caller that actually runs.
//
// WHY THIS EXISTS, from two real mistakes on the same feature in one session:
//
//   327678bc  wired the odds line into `updateCard`  — 0 callers, marked STAGED
//   d207c191  re-wired it into `renderCard`          — 2 callers, both inside
//                                                       buildNightOwlStatic
//
// Both times six structural assertions were GREEN, because they check that text
// exists in the artifact and the text did exist. Neither run ever happened. The
// inference that failed both times was "this function has callers, therefore it
// is the path that runs" — and for the second one that was even true, just of a
// path the main slate does not use.
//
// So this walks the chain instead of assuming it: every declared render target
// must reach a ROOT — a function invoked from a timer, an event handler or top
// level — or the check fails and names where the chain died.
//
// It is deliberately a DECLARED list. A linter guessing which functions are
// "render" functions would be a worse version of the same guess this exists to
// replace.

import { readFileSync } from 'node:fs';

const SRC = 'src/legacy/field.js';

// what must reach the DOM, and the layer stack it must appear in
export const TARGETS = [
    {
        name: 'odds movement line',
        // The symbol that renders it, and the assembler that must contain it.
        symbol: 'buildOddsMovement',
        container: 'buildDebrief',
        // buildDebrief lives in src/debrief/index.ts; field.js imports it and
        // injectDebriefCards calls it. The chain we can walk in field.js starts
        // at that call site.
        chain: ['buildDebrief', 'injectDebriefCards'],
    },
];

// A root is reached from something that fires on its own: a timer, a listener,
// or top-level module code.
const ROOT_PATTERNS = [
    /setTimeout\(\s*\(?\s*\)?\s*=>\s*\{?\s*%NAME%\s*\(/,
    /setTimeout\(\s*%NAME%\s*,/,
    /setInterval\([^)]*%NAME%/,
    /addEventListener\([^)]*%NAME%/,
    /\b%NAME%\(\)\s*;?\s*$/m,
];

export function callersOf(src, name) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const call = new RegExp(`\\b${esc}\\s*\\(`, 'g');
    const lines = src.split('\n');
    const out = [];
    lines.forEach((line, i) => {
        if (!call.test(line)) { call.lastIndex = 0; return; }
        call.lastIndex = 0;
        if (new RegExp(`function\\s+${esc}\\b`).test(line)) return;   // the declaration
        if (/^\s*(\/\/|\*)/.test(line)) return;                        // prose about it
        if (new RegExp(`(import|export)[^\\n]*\\b${esc}\\b`).test(line)) return;
        out.push({ line: i + 1, text: line.trim().slice(0, 110) });
    });
    return out;
}

export function reachesRoot(src, name) {
    return ROOT_PATTERNS.some(p =>
        new RegExp(p.source.replace(/%NAME%/g, name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), p.flags).test(src));
}

// The chain alone is not enough. The first version of this check PASSED a target
// whose symbol did not exist anywhere — it walked the chain and never asked
// whether the thing being rendered was in it. A green check for a function that
// has not been written is the same class of defect it exists to catch.
export function symbolInContainer(tsSrc, symbol, container) {
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = tsSrc.match(new RegExp(`function\\s+${esc(container)}\\s*\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\}`));
    if (!m) return { ok: false, why: `\`${container}\` not found` };
    const body = m[1];
    if (!new RegExp(`\\b${esc(symbol)}\\s*\\(`).test(body))
        return { ok: false, why: `\`${symbol}\` is not called inside \`${container}\`` };
    // It must also be APPENDED, not merely computed — buildDebrief collapses to
    // null unless at least one layer is truthy, and a layer that is computed and
    // dropped renders exactly nothing.
    const varM = body.match(new RegExp(`const\\s+(\\w+)\\s*=\\s*${esc(symbol)}\\s*\\(`));
    if (!varM) return { ok: false, why: `\`${symbol}\` result is not bound to a variable in \`${container}\`` };
    const v = esc(varM[1]);
    if (!new RegExp(`appendChild\\(\\s*${v}\\s*\\)`).test(body))
        return { ok: false, why: `\`${varM[1]}\` is computed but never appendChild'd in \`${container}\`` };
    if (!new RegExp(`!${v}\\b`).test(body))
        return { ok: false, why: `\`${varM[1]}\` is missing from \`${container}\`'s all-null collapse` };
    return { ok: true };
}

export function checkTarget(src, tgt, tsSrc) {
    const problems = [];
    if (tgt.symbol && tgt.container && tsSrc) {
        const r = symbolInContainer(tsSrc, tgt.symbol, tgt.container);
        if (!r.ok) problems.push(`${tgt.name}: ${r.why}`);
    }
    for (const fn of tgt.chain) {
        const c = callersOf(src, fn);
        if (!c.length && !reachesRoot(src, fn))
            problems.push(`${tgt.name}: the chain dies at \`${fn}\` — no caller and no root`);
    }
    const last = tgt.chain[tgt.chain.length - 1];
    if (!reachesRoot(src, last))
        problems.push(`${tgt.name}: \`${last}\` is never invoked from a timer, listener or top level`);
    return problems;
}

const src = readFileSync(SRC, 'utf8');
const TS = 'src/debrief/index.ts';
const tsSrc = readFileSync(TS, 'utf8');

// Rule 90, with real counterexamples rather than invented ones: this check is
// worth nothing unless it goes red on the two chains that actually shipped.
function selfTest() {
    const CASES = [
        { label: 'updateCard (the 327678bc mistake — 0 callers)',
          chain: ['updateCard'], mustFail: true },
        { label: 'renderCard via NightOwl only (the d207c191 mistake)',
          chain: ['renderCard'], mustFail: true },
        { label: 'injectDebriefCards (the path that does run)',
          chain: ['injectDebriefCards'], mustFail: false },
    ];
    let ok = true;
    for (const c of CASES) {
        const found = checkTarget(src, { name: c.label, chain: c.chain });
        const failed = found.length > 0;
        if (failed !== c.mustFail) {
            console.error(`  SELF-TEST FAILED: ${c.label} — expected ${c.mustFail ? 'RED' : 'GREEN'}, got ${failed ? 'RED' : 'GREEN'}`);
            if (found.length) console.error(`      ${found[0]}`);
            ok = false;
        } else {
            console.log(`  ${c.mustFail ? 'caught  ' : 'passed  '}${c.label}`);
        }
    }
    return ok;
}

console.log('self-test against the two chains that actually shipped:');
if (!selfTest()) { console.error('\nthe check does not distinguish a live path from a dead one — it does not go in'); process.exit(1); }

const problems = TARGETS.flatMap(t => checkTarget(src, t, tsSrc));
console.log(`\nchecked ${TARGETS.length} declared render target(s): chain in ${SRC}, layer in ${TS}`);
if (problems.length) {
    console.error(`\nFAIL — ${problems.length}:`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
}
console.log('PASS — every declared render target reaches a caller that runs');
