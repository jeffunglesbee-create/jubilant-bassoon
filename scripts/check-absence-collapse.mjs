#!/usr/bin/env node
// STANDARDS.md Rule 99 (DISTINGUISHABILITY-A) — mechanical check.
//
// Flags absence-collapse: a value read from OUTSIDE this process mapped into a
// type with no room for "was not there", so absence lands on that type's zero.
//
// The motivating instance, and this check's own acceptance test:
//   field-relay-nba src/index.js:6503
//   const quotaRemaining = parseInt(r.headers.get('x-requests-remaining') || '0', 10) || 0;
// A Cloudflare edge cache hit returns the body without the header. `|| 0` makes
// that indistinguishable from the vendor reporting zero credits, and
// snapshotCronOdds' floor check then terminates every remaining sport.
//
// THREE COUNTS, NOT A VERDICT. flagged / suppressed-with-reason / clean.
// A single pass/fail number would be this rule violating itself: "0 flagged"
// cannot distinguish "nothing to find" from "the matcher matched nothing",
// which is the exact substitution Rule 99 is about. `--self-test` and
// `--require` exist so the second can be ruled out.
//
// SUPPRESSION carries a reason, so the exemptions are greppable:
//   const n = parseInt(row.count, 10) || 0; // absence-ok: D1 COUNT(*) always present
// A bare pragma is not accepted -- `// absence-ok:` with nothing after it is
// reported as a malformed suppression, not honoured.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// ── what counts as "from outside this process" ──────────────────────────────
// Deliberately narrow. A `|| 0` on a locally-computed number is usually a
// genuine default and flagging it would bury the real ones.
const EXTERNAL = [
    /\.headers\s*\.\s*get\s*\(/,          // HTTP response headers  <- the 6503 case
    // NOTE: redundant with the generic `.get('literal')` rule below -- neutering
    // this one alone left the flagged count at 266 and still caught 6503
    // (mutation M1, 2026-09-11). Kept for legibility, not coverage.
    /\bawait\s+\w*\.?\s*json\s*\(/,       // await res.json()
    /\bawait\s+\w*\.?\s*text\s*\(/,
    /\.results\b/,                         // D1 .results / .results[i].field
    /\bprocess\.env\b/,
    /\bsearchParams\s*\.\s*get\s*\(/,
    /\blocalStorage\s*\.\s*getItem\s*\(/,
    /\bJSON\s*\.\s*parse\s*\(/,
    /\.\s*get\s*\(\s*['"`]/,               // KV .get('key'), Map-ish reads of a literal key
];

// The collapse itself. `?? 0` is included: it does not rescue absence, it only
// narrows which absences it catches.
const COLLAPSE = [
    [/\|\|\s*0\b/,            '|| 0'],
    [/\|\|\s*''/,             "|| ''"],
    [/\|\|\s*""/,             '|| ""'],
    [/\|\|\s*\[\s*\]/,        '|| []'],
    [/\|\|\s*false\b/,        '|| false'],
    [/\?\?\s*0\b/,            '?? 0'],
    [/\?\?\s*''/,             "?? ''"],
    [/\?\?\s*\[\s*\]/,        '?? []'],
    [/\?\?\s*false\b/,        '?? false'],
];

const SUPPRESS = /\/\/\s*absence-ok:\s*(.*)$/;

const SKIP_DIRS = new Set(['node_modules', '.git', 'build', 'public', 'dist', 'obj', 'bin', '.wrangler']);
const EXTS = new Set(['.js', '.mjs', '.cjs']);

// This file quotes the patterns it looks for -- in its own header, and in the
// fixtures that prove the classifier works. Scanning itself put 4 of its own
// lines in the first ten findings and read two fixture strings as real
// suppressions. It is the specimen jar, not a specimen. Excluded by basename,
// so any OTHER file quoting an example still flags.
const SELF = 'check-absence-collapse.mjs';

function walk(dir, out = []) {
    let entries;
    try { entries = readdirSync(dir); } catch (_) { return out; }
    for (const e of entries) {
        if (SKIP_DIRS.has(e)) continue;
        const p = join(dir, e);
        let st; try { st = statSync(p); } catch (_) { continue; }
        if (st.isDirectory()) walk(p, out);
        else if (EXTS.has(p.slice(p.lastIndexOf('.'))) && e !== SELF) out.push(p);
    }
    return out;
}

// Exported so the self-test drives the SAME classifier the scan uses.
export function classifyLine(line) {
    const collapse = COLLAPSE.find(([re]) => re.test(line));
    if (!collapse) return { kind: 'clean' };
    if (!EXTERNAL.some(re => re.test(line))) return { kind: 'clean' };
    const sup = line.match(SUPPRESS);
    if (sup) {
        const reason = (sup[1] || '').trim();
        return reason
            ? { kind: 'suppressed', op: collapse[1], reason }
            : { kind: 'flagged', op: collapse[1], note: 'MALFORMED SUPPRESSION — absence-ok with no reason' };
    }
    return { kind: 'flagged', op: collapse[1] };
}

// ── Rule 90: the classifier decides what gets reported, so it is the part most
// able to be confidently wrong. Fixtures run on every invocation; a classifier
// collapsed onto one branch fails here rather than in the write-up.
const FIXTURES = [
    // the motivating line, verbatim
    [`const quotaRemaining = parseInt(r.headers.get('x-requests-remaining') || '0', 10) || 0;`, 'flagged'],
    [`const g = await res.json() || [];`,                                    'flagged'],
    [`const rows = d1.results || [];`,                                       'flagged'],
    [`const n = parseInt(q.results[0].n, 10) || 0; // absence-ok: COUNT(*) always present`, 'suppressed'],
    [`const n = parseInt(q.results[0].n, 10) || 0; // absence-ok:`,           'flagged'],
    // a suppression on a line with no external read is not this check's business
    [`let total = 0 || 0; // absence-ok: local`,                             'clean'],
    [`let total = 0; total = total || 0;`,                                   'clean'],   // no external read
    [`const x = res.headers.get('etag');`,                                   'clean'],   // external, no collapse
    [`const label = cfg.name ?? 'default';`,                                 'clean'],   // not a zero-ish collapse
];
function selfTest() {
    const bad = FIXTURES.filter(([l, want]) => classifyLine(l).kind !== want);
    const kinds = new Set(FIXTURES.map(([l]) => classifyLine(l).kind));
    if (bad.length) {
        console.error('CLASSIFIER SELF-TEST FAILED:');
        for (const [l, want] of bad) console.error(`  wanted ${want}, got ${classifyLine(l).kind}\n    ${l}`);
        return false;
    }
    if (kinds.size < 3) {
        console.error(`CLASSIFIER COLLAPSED: ${FIXTURES.length} fixtures produced only ${kinds.size} kinds`);
        return false;
    }
    console.log(`classifier self-test: ${FIXTURES.length}/${FIXTURES.length} fixtures, ${kinds.size} kinds`);
    return true;
}

const args = process.argv.slice(2);
if (!selfTest()) process.exit(1);
if (args.includes('--self-test')) process.exit(0);

// --require SUBSTR : the scan must flag at least one site whose "path:line"
// contains SUBSTR. Without it, a matcher that silently stopped matching reports
// a clean sweep. This is the check's own acceptance test.
const requires = args.filter(a => a.startsWith('--require=')).map(a => a.slice('--require='.length));
const roots = args.filter(a => !a.startsWith('--'));
if (!roots.length) { console.error('usage: check-absence-collapse.mjs <root> [root...] [--require=path:line]'); process.exit(2); }

const flagged = [], suppressed = [];
let cleanLines = 0, filesScanned = 0;

for (const root of roots) {
    const abs = resolve(root);
    for (const f of walk(abs)) {
        filesScanned++;
        let src; try { src = readFileSync(f, 'utf8'); } catch (_) { continue; }
        const rel = `${root.replace(/\/+$/, '').split('/').pop()}/${relative(abs, f)}`;
        src.split('\n').forEach((line, i) => {
            const c = classifyLine(line);
            if (c.kind === 'clean') { cleanLines++; return; }
            const rec = { at: `${rel}:${i + 1}`, op: c.op, text: line.trim().slice(0, 140) };
            if (c.kind === 'suppressed') suppressed.push({ ...rec, reason: c.reason });
            else flagged.push({ ...rec, ...(c.note ? { note: c.note } : {}) });
        });
    }
}

console.log(`\nscanned ${filesScanned} files across ${roots.length} root(s): ${roots.join(', ')}`);
console.log(`(${SELF} excluded from its own scan — it quotes the patterns it matches)`);
console.log(`\n  flagged                 ${flagged.length}`);
console.log(`  suppressed-with-reason  ${suppressed.length}`);
console.log(`  clean (lines)           ${cleanLines}`);
console.log('\nThree counts, not a verdict. "flagged 0" alone cannot distinguish');
console.log('"nothing to find" from "the matcher matched nothing" — run --require');
console.log('against a known instance to rule the second out (Rule 99).');

console.log(`\n── first ${Math.min(10, flagged.length)} of ${flagged.length} flagged ──`);
for (const f of flagged.slice(0, 10)) {
    console.log(`  ${f.at}  [${f.op}]${f.note ? `  ${f.note}` : ''}\n      ${f.text}`);
}
if (suppressed.length) {
    console.log(`\n── suppressions (${suppressed.length}) ──`);
    for (const s of suppressed.slice(0, 10)) console.log(`  ${s.at}  ${s.reason}`);
}

let failed = false;
for (const need of requires) {
    const hit = flagged.find(f => f.at.includes(need));
    if (hit) console.log(`\nrequire OK: ${need} flagged as ${hit.op}`);
    else { console.error(`\nrequire FAILED: no flagged site matches "${need}" — the check does not work`); failed = true; }
}
process.exit(failed ? 1 : 0);
