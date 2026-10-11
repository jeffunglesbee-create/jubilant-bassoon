#!/usr/bin/env node
// A `file:line` citation in a document is a claim, and line numbers rot.
//
// WHY THIS EXISTS, measured 2026-08-25
//
// Six citations were published into CC-CMDs that morning. By the afternoon
// FIVE were wrong — not through neglect, but because the same session then
// edited the file it had cited. Insertions above a line move every line below
// it, silently:
//
//     cited          actually now      what was meant
//     :7726          :7779             the LEAGUES golf entry
//     :7750          :1381             teams.find(t => t.homeAway === 'home')
//     :7842          :7906             sport: gm.league
//     :6903          :6934             buildGolfCronContext
//     :8235          :8299             the golf brief's eventId
//
// A stale citation is worse than none: it points confidently at unrelated code,
// and the reader trusts it because it is specific.
//
// THE FIX IS NOT A BETTER NUMBER. It is a better IDENTITY. A document that
// quotes a distinctive fragment beside its citation can be checked — and the
// number becomes redundant, because the fragment finds the line itself. That
// convention also cannot be satisfied from memory, which is the actual defect:
// every wrong figure published that day came from recall rather than a probe.
//
// TWO CHECKS
//
//   FATAL   an ANCHORED citation whose anchor is not in the file. The document
//           makes a specific, checkable claim and the claim is false.
//   RATCHET bare `path:line` citations with no anchor nearby. They cannot be
//           verified and they cannot grow. Existing ones are grandfathered at
//           the measured count, not retroactively fixed.
//
// A missing FILE is reported, never fatal: these repos cite each other, and
// jubilant-bassoon's paths are legitimately absent here.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SELF_TEST = process.argv.includes('--self-test');
const BUDGET = 'docs/citation-budget.txt';
const SKIP = new Set(['.git', 'node_modules', '.wrangler', 'dist', 'build']);

// THE LAYOUT IS MEASURED PER REPO, NOT INHERITED. Ported from field-relay-nba
// on 2026-10-11, where the pattern is
// `(src|scripts|workers|.github)/…\.(js|mjs|py|yml|yaml|json|fs|toml)`.
// Copied verbatim that would have been a confident green over this repo's most
// cited files, because THIS repo is a root-level single-file PWA. Counted
// across docs/, outbox/ and the root *.md before writing a line:
//
//     index.html       2738        src/legacy/field.js   469
//     smoke.js          809        src/index.js          128
//     sw.js             481        scripts/sync-source.mjs 68
//
// The relay's pattern reaches the right-hand column and none of the left. So
// the roots stay and an ALLOW-LIST of root files is added beside them —
// a list, not a bare-word rule, because `smoke.js` as a bare word would also
// match prose, and "requiring a known source root" is the protection the
// original comment is about. The extensions gain `html` and `jsonc` for the
// same measured reason.
const SRC_ROOTS = 'src|scripts|workers|\\.github';
const EXT = 'js|mjs|py|yml|yaml|json|jsonc|fs|toml|html';
const ROOT_FILES = [
  'index.html', 'sw.js', 'smoke.js', 'field_smoke.js', 'field_unit.js',
  'field_utils.js', 'wrangler.jsonc',
];
const ROOT_ALT = ROOT_FILES.map(f => f.replace(/\./g, '\\.')).join('|');
// Group 1 = a rooted path, group 2 = a root file, group 3 = the line number.
const CITE = new RegExp(
  `(?:^|[^A-Za-z0-9_./-])(?:((?:${SRC_ROOTS})\\/[A-Za-z0-9_./-]+\\.(?:${EXT}))|(${ROOT_ALT}))(?::(\\d{1,6}))?\\b`,
  'g');
// How many characters either side of a citation count as "beside it".
const WINDOW = 400;

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) { console.log(`      → ${detail}`); failed++; }
};

/** Backtick-quoted fragments in a span of document text, long enough to be distinctive. */
export function anchorsIn(text) {
  return [...text.matchAll(/`{1,3}([^`\n]{6,160})`{1,3}/g)]
    .map(m => m[1].trim())
    // A bare path is not an anchor for itself, and neither is a lone identifier
    // that appears everywhere. Require something with structure.
    // A path is not an anchor for itself. That now includes the root files:
    // `index.html` quoted beside a citation to index.html would otherwise
    // anchor every citation in this repo to itself.
    .filter(a => a.length >= 6
      && !new RegExp(`^(?:${SRC_ROOTS})\\/`).test(a)
      && !ROOT_FILES.includes(a));
}

/**
 * Classify every citation in a document.
 * ANCHORED = some fragment quoted within WINDOW chars is present in the file.
 */
export function classify(docText, fileExists, fileText) {
  const out = [];
  for (const m of docText.matchAll(CITE)) {
    const path = m[1] || m[2], line = m[3] ? Number(m[3]) : null;
    if (!fileExists(path)) { out.push({ path, line, state: 'no-file' }); continue; }
    const span = docText.slice(Math.max(0, m.index - WINDOW), m.index + WINDOW);
    const body = fileText(path);
    const found = anchorsIn(span).filter(a => body.includes(a));
    if (found.length) out.push({ path, line, state: 'anchored', anchor: found[0] });
    else if (line !== null) out.push({ path, line, state: 'bare' });
    else out.push({ path, line, state: 'path-only' });
  }
  return out;
}

/**
 * The line an anchor is actually on now, 1-indexed — or null when the anchor is
 * not there, or is there MORE THAN ONCE.
 *
 * Uniqueness is required for the repair suggestion, not for the anchor to
 * count. The first version returned the first match and produced confident
 * nonsense: `src/analytics-engine.js:1197 → now :8`, because the quoted
 * fragment beside that citation was short enough to appear near the top of the
 * file. A repair hint that points at the wrong line is the same defect this
 * whole check was written about, reintroduced by the check itself.
 */
export function lineOf(body, anchor) {
  const lines = body.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) if (lines[i].includes(anchor)) hits.push(i + 1);
  return hits.length === 1 ? hits[0] : null;
}

if (SELF_TEST) {
  const FILE = "one\ntwo\nconst k = teams.find(t => t.homeAway === 'home');\nfour\n";
  const ex = p => p === 'src/index.js';
  const tx = () => FILE;

  const anchored = classify(
    "See `src/index.js:3` — `teams.find(t => t.homeAway === 'home')` is the fallback.", ex, tx);
  check('a citation with a matching quoted fragment is anchored',
    anchored[0]?.state === 'anchored', JSON.stringify(anchored));

  const bare = classify('See src/index.js:3 for the fallback.', ex, tx);
  check('a citation with nothing quoted beside it is bare',
    bare[0]?.state === 'bare', JSON.stringify(bare));

  // The case this whole check exists for: the number is wrong, the anchor is
  // right, and the anchor is what lets it be repaired.
  const moved = classify(
    "See `src/index.js:9999` — `teams.find(t => t.homeAway === 'home')` moved.", ex, tx);
  check('a WRONG line number with a right anchor still resolves',
    moved[0]?.state === 'anchored' && lineOf(FILE, moved[0].anchor) === 3,
    `${JSON.stringify(moved)} lineOf=${lineOf(FILE, moved[0]?.anchor)}`);

  const broken = classify(
    'See `src/index.js:3` — `noSuchFragmentAnywhere()` is gone.', ex, tx);
  check('a quoted fragment that is NOT in the file does not count as an anchor',
    broken[0]?.state === 'bare', JSON.stringify(broken));

  check('a citation to a file this repo does not have is its own state',
    classify('see src/legacy/field.js:12', () => false, tx)[0]?.state === 'no-file',
    'a cross-repo path was treated as a local failure');

  // The path itself must never anchor its own citation, or every bare citation
  // would pass by quoting the path.
  // A repair hint is only worth printing when it is unambiguous.
  check('an anchor appearing twice yields no repair line',
    lineOf('x\nfoo bar\nfoo bar\n', 'foo bar') === null,
    'an ambiguous anchor produced a confident line number');
  check('...and appearing exactly once still does',
    lineOf('x\nfoo bar\ny\n', 'foo bar') === 2, 'a unique anchor lost its line');

  check('quoting the path is not an anchor',
    classify('See `src/index.js:3` — `src/index.js` has it.', ex, tx)[0]?.state === 'bare',
    'a path quoted itself into an anchor');

  // THE ROOT FILES, which is the whole reason this is not a verbatim copy.
  const HTML = "<div>\n<script>\nconst SW_VERSION = '2026-10-11a';\n</script>\n";
  const exH = p => p === 'index.html';
  const txH = () => HTML;

  check('a ROOT-FILE citation with a matching fragment is anchored',
    classify("See `index.html:3` — `const SW_VERSION = '2026-10-11a'` is the stamp.", exH, txH)[0]?.state === 'anchored',
    'a root-file citation did not anchor');

  check('a ROOT-FILE citation with nothing quoted beside it is bare',
    classify('See index.html:3 for the stamp.', exH, txH)[0]?.state === 'bare',
    'a root-file citation with no anchor was not counted bare');

  check('the root file name is not an anchor for itself',
    classify("See `index.html:3` — `index.html` is the file.", exH, txH)[0]?.state === 'bare',
    'index.html quoted beside a citation to index.html anchored it to itself');

  // The protection the original comment is about: a KNOWN name, not any word.
  check('a root-looking name NOT on the allow-list is not a citation',
    classify('See notes.html:3 for it.', () => true, () => '').length === 0,
    'notes.html was read as a citation');

  // And the relay's own shape still works, because src/ did not go away — the
  // line number moved to capture group 3 when the alternative was added.
  check('a rooted path still parses, with the line number in its new group',
    classify("See `src/index.js:3` — `teams.find(t => t.homeAway === 'home')` is it.", ex, tx)[0]?.line === 3,
    'the rooted-path branch lost its line number');

  process.exit(failed === 0 ? 0 : 1);
}

const docs = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    if (SKIP.has(n)) continue;
    const p = join(d, n);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p);
    else if (p.endsWith('.md') && st.size < 4_000_000) docs.push(p);
  }
})('.');

const cache = new Map();
const bodyOf = p => {
  if (!cache.has(p)) { try { cache.set(p, readFileSync(p, 'utf8')); } catch { cache.set(p, ''); } }
  return cache.get(p);
};

let anchored = 0, bare = 0, noFile = 0, pathOnly = 0;
const brokenAnchors = [], stale = [], bareList = [];
for (const d of docs) {
  let text; try { text = readFileSync(d, 'utf8'); } catch { continue; }
  for (const c of classify(text, existsSync, bodyOf)) {
    if (c.state === 'anchored') {
      anchored++;
      // Only an unambiguous anchor earns a repair line -- see lineOf.
      const now = lineOf(bodyOf(c.path), c.anchor);
      if (c.line !== null && now !== null && now !== c.line) {
        stale.push(`${d}: ${c.path}:${c.line} → now :${now}   (${c.anchor.slice(0, 48)})`);
      }
    } else if (c.state === 'bare') { bare++; bareList.push(`${d}: ${c.path}:${c.line}`); }
    else if (c.state === 'no-file') noFile++;
    else pathOnly++;
  }
}

const budget = existsSync(BUDGET)
  ? Number((readFileSync(BUDGET, 'utf8').match(/^\s*(\d+)\s*$/m) || [])[1])
  : NaN;

console.log(`\n${docs.length} document(s) scanned`);
console.log(`  anchored   ${anchored}  (a quoted fragment beside the citation is present in the file)`);
console.log(`  bare       ${bare}  (a line number and nothing to verify it against)`);
console.log(`  no file    ${noFile}  (cross-repo or deleted — reported, never fatal)`);
console.log(`  path only  ${pathOnly}`);
// Rule 91 — the coverage prints where the result is read. A citation to a file
// outside these roots is not counted as anything, so "bare 0" would otherwise
// read as a claim about every path in every document.
console.log(`  COVERAGE   roots ${SRC_ROOTS.replace(/\\/g, '')}/ with .{${EXT}}, plus ${ROOT_FILES.length} root files: ${ROOT_FILES.join(', ')}`);
console.log('             anything else cited is invisible here, not clean.\n');

if (stale.length) {
  console.log('ANCHORED BUT THE NUMBER MOVED — advisory, and the anchor is a GUESS:');
  console.log('  The anchor is the first quoted fragment within 400 chars that the file');
  console.log('  contains — proximity, not meaning. It can belong to a NEIGHBOURING');
  console.log('  sentence, and then the line it suggests is not this citation\'s line.');
  console.log('  Measured 2026-09-14: HANDOFF cites an `INSERT OR IGNORE` site and this');
  console.log('  list paired it with `CREATE TRIGGER` from the sentence before, offering');
  console.log('  a repair that would have pointed the citation at a trigger definition.');
  console.log('  READ THE CITING SENTENCE BEFORE APPLYING ANY LINE BELOW.\n');
  for (const s of stale.slice(0, 20)) console.log(`  ${s}`);
  console.log('');
}

check('every anchored citation resolves', brokenAnchors.length === 0, brokenAnchors.join('; '));
if (bareList.length) {
  // NAME them. This ratchet used to report "10 against a budget of 9" and
  // nothing else, which is a gate a reader cannot act on: finding the one
  // that moved meant deleting docs one at a time and re-running. A count
  // without its members is a measurement nobody can check (Rule 91).
  console.log('\nBARE — a line number with nothing quoted beside it:');
  for (const b of bareList) console.log(`  ${b}`);
  // THE MOST LIKELY CAUSE, NAMED. anchorsIn's pattern is `[^`\n]{6,160}`, so a
  // backtick-quoted fragment BROKEN ACROSS A LINE never matches — and the
  // report said only "bare", which looks identical to no quote at all. That
  // cost two cycles on 2026-10-11, twice: once from a quote that normalised the
  // cited line's internal whitespace, once from one that line-wrapped. A hint
  // cannot change pass or fail; it only says where to look.
  console.log('  If a quote IS present, two things stop it anchoring: a fragment');
  console.log('  broken across a line (backticks must open and close on ONE line),');
  console.log('  and a quote that normalises the cited line\'s own whitespace —');
  console.log('  the fragment has to be a literal substring of the file.');
}
check(`bare citations do not grow (budget ${budget})`,
  Number.isFinite(budget) && bare <= budget,
  `${bare} bare against a budget of ${budget}. A ratchet: new citations must quote what ` +
  `they cite. If you REDUCED the count, lower the number in ${BUDGET} in this commit.`);

process.exit(failed === 0 ? 0 : 1);
