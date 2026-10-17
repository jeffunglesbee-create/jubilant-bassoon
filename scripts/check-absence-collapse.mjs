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
// A RATCHET, PER REPO, PER OP, IN BOTH COUNTS (docs/CC-CMD-2026-10-16-absence-
// collapse-ratchet.md). With --baseline=FILE the run fails when any op's
// flagged OR suppressed count in any repo rises above the committed baseline.
// Suppressions ratchet in the SAME direction as findings: a flagged-only
// ratchet is passed by writing `// absence-ok:` on every new site, and would
// call that progress. A genuine suppression still costs only a baseline bump,
// which is a reviewable commit. Per op, because one total lets `|| []` growth
// hide inside `catch-collapse` shrinkage; per repo, because a shared number
// lets one repo's improvement pay for the other's regression.
//
// --require GATES the ratchet. Under a ratchet a matcher that stopped matching
// reads as improvement, so with --baseline every scanned root must carry a
// --require that hits a flagged site in that root, and if any --require
// misses, the ratchet is NOT EVALUATED and the run fails. Not "passed".
//
// SUPPRESSION carries a reason, so the exemptions are greppable:
//   const n = parseInt(row.count, 10) || 0; // absence-ok: D1 COUNT(*) always present
// A bare pragma is not accepted -- `// absence-ok:` with nothing after it is
// reported as a malformed suppression, not honoured.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

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

// Blind spot #1, closed 2026-09-12. A `.catch()` returning an empty literal is
// the SAME collapse one call deeper: the query failed, and the caller reads "no
// rows". The original matcher could not see it -- Rule 99's own "what the check
// cannot catch" section listed it first -- and triaging the 263 findings is what
// surfaced 7 live instances in field-relay-nba src/index.js, one of which
// answers reason:'no active postseason series' when the query threw.
//
// A catch that rethrows is not a collapse, so the literal must be the whole body.
// Separate op label, so these never hide inside the `|| []` bulk.
const CATCH_COLLAPSE = /\.catch\s*\(\s*(?:\(\s*[\w$]*\s*\)|[\w$]+)\s*=>\s*\(?\s*(?:\[\s*\]|\{\s*\}|\{\s*results\s*:\s*\[\s*\]\s*\})/;

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
    // A line that is entirely a comment is prose, not code. game-do.js:450 is a
    // comment DESCRIBING the fire-and-forget pattern and was reported as an
    // instance of it. Narrow: only a leading-`//` line, so a real collapse with
    // a trailing comment still flags.
    if (/^\s*\/\//.test(line)) return { kind: 'clean' };
    // Checked FIRST: a catch-collapse is a real finding whether or not the same
    // line also carries a `|| []`, and the more specific label is the useful one.
    if (CATCH_COLLAPSE.test(line)) {
        const sup = line.match(SUPPRESS);
        const reason = sup && (sup[1] || '').trim();
        return reason ? { kind: 'suppressed', op: 'catch-collapse', reason }
                      : { kind: 'flagged', op: 'catch-collapse' };
    }
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
    // catch-collapse: the query FAILED and the caller reads "no rows"
    [`).bind(date).all().catch(() => ({ results: [] }));`,                   'flagged'],
    [`const x = await f().catch(() => []);`,                                 'flagged'],
    [`const x = await f().catch(e => ({}));`,                                'flagged'],
    [`).all().catch(() => ({ results: [] })); // absence-ok: caller checks .error`, 'suppressed'],
    [`const x = await f().catch(e => { log(e); throw e; });`,                'clean'],   // rethrows: no collapse
    [`        // is in try/catch, the fetch is .catch(()=>{}) fire-and-forget.`, 'clean'],   // a comment about the pattern is not the pattern
    [`const x = await f().catch(() => []); // still code, comment is trailing`,  'flagged'], // the narrowing must not swallow this
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

// ── the ratchet, as a pure function so the self-test drives the real one ────
// A site is keyed by file and trimmed text, not line number, so the baseline
// survives unrelated edits above it and a new site is named by what it says.
export const siteKey = (r) => `${r.at.replace(/:\d+$/, '')} :: ${r.text}`;

/** Summarise a scan as { repo: { flagged: { op: [keys] }, suppressed: { op: [keys] } } }.
 *  Every SCANNED repo is present, even with nothing found: a repo that reached
 *  zero is not a repo that was not scanned. */
export function summarise(flagged, suppressed, repos = []) {
    const out = {};
    for (const repo of repos) out[repo] = { flagged: {}, suppressed: {} };
    for (const [kind, list] of [['flagged', flagged], ['suppressed', suppressed]]) {
        for (const r of list) {
            const repo = ((out[r.repo] ??= { flagged: {}, suppressed: {} })[kind][r.op] ??= []);
            repo.push(siteKey(r));
        }
    }
    for (const repo of Object.values(out)) for (const kind of ['flagged', 'suppressed'])
        for (const op of Object.keys(repo[kind])) repo[kind][op].sort();
    return out;
}

/** Compare a summary against a baseline of the same shape. Returns every rise,
 *  every fall, and every structural problem; a run fails on any rise or problem. */
export function compareToBaseline(now, base) {
    const rises = [], falls = [], problems = [];
    for (const repo of Object.keys(base)) if (!now[repo]) problems.push(`baseline names repo ${repo}, which this run did not scan`);
    for (const repo of Object.keys(now)) {
        if (!base[repo]) { problems.push(`repo ${repo} was scanned and has no baseline`); continue; }
        for (const kind of ['flagged', 'suppressed']) {
            const ops = new Set([...Object.keys(now[repo][kind] ?? {}), ...Object.keys(base[repo][kind] ?? {})]);
            for (const op of ops) {
                const cur = now[repo][kind]?.[op] ?? [], was = base[repo][kind]?.[op] ?? [];
                if (cur.length > was.length) {
                    const left = [...was];
                    const added = cur.filter(k => { const i = left.indexOf(k); if (i < 0) return true; left.splice(i, 1); return false; });
                    rises.push({ repo, kind, op, count: cur.length, baseline: was.length, added });
                } else if (cur.length < was.length) falls.push({ repo, kind, op, count: cur.length, baseline: was.length });
            }
        }
    }
    return { rises, falls, problems, ok: rises.length === 0 && problems.length === 0 };
}

function ratchetSelfTest() {
    const r = (repo, op, at, text) => ({ repo, op, at, text });
    const base = summarise([r('a', '|| []', 'a/x.js:1', 'x || []'), r('b', '|| 0', 'b/y.js:9', 'y || 0')],
                           [r('b', '|| 0', 'b/z.js:3', 'z || 0 // absence-ok: why')]);
    const cases = [
        ['an unchanged scan passes', compareToBaseline(base, base).ok === true],
        ['a moved line is the same site', compareToBaseline(summarise([r('a', '|| []', 'a/x.js:40', 'x || []'), r('b', '|| 0', 'b/y.js:9', 'y || 0')],
            [r('b', '|| 0', 'b/z.js:3', 'z || 0 // absence-ok: why')]), base).ok === true],
        ['a new flagged site fails, and is named', (() => { const c = compareToBaseline(summarise([r('a', '|| []', 'a/x.js:1', 'x || []'), r('a', '|| []', 'a/n.js:2', 'n || []'), r('b', '|| 0', 'b/y.js:9', 'y || 0')],
            [r('b', '|| 0', 'b/z.js:3', 'z || 0 // absence-ok: why')]), base); return !c.ok && c.rises[0].added[0] === 'a/n.js :: n || []'; })()],
        ['a NEW SUPPRESSION fails, even when flagged falls by the same amount', !compareToBaseline(summarise([r('a', '|| []', 'a/x.js:1', 'x || []')],
            [r('b', '|| 0', 'b/z.js:3', 'z || 0 // absence-ok: why'), r('b', '|| 0', 'b/y.js:9', 'y || 0 // absence-ok: easy')]), base).ok],
        ['a rise in one op is not paid for by a fall in another', !compareToBaseline(summarise([r('a', 'catch-collapse', 'a/x.js:1', 'x.catch(() => [])'), r('a', 'catch-collapse', 'a/q.js:1', 'q.catch(() => [])'), r('b', '|| 0', 'b/y.js:9', 'y || 0')],
            [r('b', '|| 0', 'b/z.js:3', 'z || 0 // absence-ok: why')]), base).ok],
        ['a rise in one repo is not paid for by a fall in the other', !compareToBaseline(summarise([r('a', '|| []', 'a/x.js:1', 'x || []'), r('a', '|| []', 'a/w.js:1', 'w || []')],
            [r('b', '|| 0', 'b/z.js:3', 'z || 0 // absence-ok: why')]), base).ok],
        ['a fall passes and is reported', (() => { const c = compareToBaseline(summarise([r('b', '|| 0', 'b/y.js:9', 'y || 0')], [r('b', '|| 0', 'b/z.js:3', 'z || 0 // absence-ok: why')], ['a', 'b']), base); return c.ok && c.falls.length === 1; })()],
        ['a scanned repo that reached zero is still scanned', compareToBaseline(summarise([], [], ['a', 'b']), base).ok === true],
        ['a baselined repo that was not scanned fails', !compareToBaseline(summarise([r('a', '|| []', 'a/x.js:1', 'x || []')], []), base).ok],
        ['a scanned repo with no baseline fails', !compareToBaseline({ ...base, c: { flagged: {}, suppressed: {} } }, base).ok],
    ];
    const bad = cases.filter(([, ok]) => !ok);
    for (const [n] of bad) console.error(`RATCHET SELF-TEST FAILED: ${n}`);
    if (!bad.length) console.log(`ratchet self-test: ${cases.length}/${cases.length} cases`);
    return bad.length === 0;
}

const args = process.argv.slice(2);
if (!selfTest()) process.exit(1);
if (!ratchetSelfTest()) process.exit(1);
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
        const repo = basename(abs);
        src.split('\n').forEach((line, i) => {
            const c = classifyLine(line);
            if (c.kind === 'clean') { cleanLines++; return; }
            const rec = { repo, at: `${rel}:${i + 1}`, op: c.op, text: line.trim().slice(0, 140) };
            if (c.kind === 'suppressed') suppressed.push({ ...rec, reason: c.reason });
            else flagged.push({ ...rec, ...(c.note ? { note: c.note } : {}) });
        });
    }
}

console.log(`\nscanned ${filesScanned} files across ${roots.length} root(s): ${roots.join(', ')}`);
console.log(`(${SELF} excluded from its own scan — it quotes the patterns it matches)`);
console.log(`\n  flagged                 ${flagged.length}`);
// Per-op breakdown, because one number hides the shape. `catch-collapse: 119`
// next to `|| []: 171` is the difference between a census and a pile: the
// catch-collapse bulk is probe and test scaffolding, and the handful in route
// handlers is what anyone would act on.
{
    const byOp = {};
    for (const f of flagged) byOp[f.op] = (byOp[f.op] || 0) + 1;
    for (const [op, n] of Object.entries(byOp).sort((a, b) => b[1] - a[1]))
        console.log(`      ${String(op).padEnd(16)} ${n}`);
}
console.log(`  suppressed-with-reason  ${suppressed.length}`);
// Per repo, per op, both counts: the shape the ratchet compares.
const summary = summarise(flagged, suppressed, roots.map(r => basename(resolve(r))));
for (const [repo, s] of Object.entries(summary)) {
    const n = (k) => Object.values(s[k]).reduce((a, v) => a + v.length, 0);
    console.log(`\n  ${repo}: flagged ${n('flagged')}, suppressed ${n('suppressed')}`);
    for (const k of ['flagged', 'suppressed'])
        for (const [op, v] of Object.entries(s[k]).sort((a, b) => b[1].length - a[1].length))
            console.log(`      ${k.padEnd(10)} ${String(op).padEnd(16)} ${v.length}`);
}
console.log(`  clean (lines)           ${cleanLines}`);
console.log('\nThree counts, not a verdict. "flagged 0" alone cannot distinguish');
console.log('"nothing to find" from "the matcher matched nothing" — run --require');
console.log('against a known instance to rule the second out (Rule 99).');

// --json emits every finding, for triage. The human-readable form stays the
// default: a 263-line dump in CI is not a census anyone reads.
if (args.includes('--json')) {
    console.log(JSON.stringify({ flagged, suppressed, cleanLines, filesScanned }, null, 1));
} else {
console.log(`\n── first ${Math.min(10, flagged.length)} of ${flagged.length} flagged ──`);
for (const f of flagged.slice(0, 10)) {
    console.log(`  ${f.at}  [${f.op}]${f.note ? `  ${f.note}` : ''}\n      ${f.text}`);
}
if (suppressed.length) {
    console.log(`\n── suppressions (${suppressed.length}) ──`);
    for (const s of suppressed.slice(0, 10)) console.log(`  ${s.at}  ${s.reason}`);
}
}

let failed = false;
for (const need of requires) {
    const hit = flagged.find(f => f.at.includes(need));
    if (hit) console.log(`\nrequire OK: ${need} flagged as ${hit.op} (${hit.at})`);
    else { console.error(`\nrequire FAILED: no flagged site matches "${need}" — the check does not work`); failed = true; }
}

const baselineArg = args.find(a => a.startsWith('--baseline='));
const writeArg = args.find(a => a.startsWith('--write-baseline='));
if (baselineArg || writeArg) {
    // Every scanned root must be proven reachable by its own --require, or an
    // empty checkout scans zero files and sits comfortably under its baseline.
    for (const root of roots) {
        const repo = basename(resolve(root));
        if (!requires.some(need => flagged.some(f => f.repo === repo && f.at.includes(need)))) {
            console.error(`\nrequire FAILED: no --require hits a flagged site in root ${root} (repo ${repo})`);
            failed = true;
        }
    }
    if (failed) {
        console.error('\nRATCHET NOT EVALUATED: a --require missed, so a low count here could be a matcher');
        console.error('that stopped matching. That is not a pass.');
        process.exit(1);
    }
}
if (writeArg) {
    const file = writeArg.slice('--write-baseline='.length);
    // The commit each root was at, so a later rise can be traced to the side that moved.
    const heads = Object.fromEntries(roots.map(r => {
        let sha = null; try { sha = execFileSync('git', ['-C', r, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (_) { /* not a git checkout: recorded as null */ }
        return [basename(resolve(r)), sha];
    }));
    writeFileSync(file, JSON.stringify({ written: new Date().toISOString().slice(0, 10), heads, repos: summary }, null, 1) + '\n');
    console.log(`\nbaseline written to ${file}`);
}
if (baselineArg) {
    const file = baselineArg.slice('--baseline='.length);
    let base;
    try { base = JSON.parse(readFileSync(file, 'utf8')).repos; } catch (e) { console.error(`\nRATCHET FAILED: cannot read baseline ${file}: ${e.message}`); process.exit(1); }
    const c = compareToBaseline(summary, base ?? {});
    for (const p of c.problems) console.error(`\nRATCHET FAILED: ${p}`);
    for (const r of c.rises) {
        console.error(`\nRATCHET FAILED: ${r.repo} ${r.kind} [${r.op}] ${r.count} > baseline ${r.baseline}. New site(s):`);
        for (const k of r.added) console.error(`    ${k}`);
    }
    for (const f of c.falls) console.log(`\nbelow baseline: ${f.repo} ${f.kind} [${f.op}] ${f.count} < ${f.baseline} — lower it with --write-baseline=${file}`);
    if (c.ok) console.log(`\nratchet OK: no op in ${Object.keys(summary).join(', ')} rose above ${file}, flagged or suppressed`);
    process.exit(c.ok ? 0 : 1);
}
process.exit(failed ? 1 : 0);
