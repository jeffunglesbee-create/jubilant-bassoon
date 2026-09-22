// Rule 90 for scripts/check-workflow-dup-keys-logic.mjs.
//
// Mutants sit beside the original and are deleted on exit; a POSITIVE CONTROL
// runs an unmutated copy at the mutant location first, because a harness that
// cannot run its subject reports every mutation as caught.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

const SRC = 'scripts/check-workflow-dup-keys.mjs';
const original = readFileSync(SRC, 'utf8');
const DIR = dirname(SRC);
const born = [];
const place = (t, tag) => { const p = join(DIR, `.mutant-${tag}-${Math.random().toString(36).slice(2, 8)}.mjs`); writeFileSync(p, t); born.push(p); return resolve(p); };
process.on('exit', () => { for (const p of born) { try { unlinkSync(p); } catch (_e) {} } });

const run = (mod) => {
  try {
    execFileSync(process.execPath, ['scripts/check-workflow-dup-keys-logic.mjs'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DUPKEYS_MODULE: mod } });
    return true;
  } catch { return false; }
};

if (!run(resolve(SRC))) { console.log('FAIL — the self-test is already red on clean source.'); process.exit(1); }
if (!run(place(original, 'control'))) {
  console.log('FAIL — an UNMUTATED copy at the mutant location is red, so no verdict below would mean anything.');
  process.exit(1);
}
console.log('baseline: the self-test passes on current source and on an unmutated copy at the mutant location\n');

const MUTATIONS = [
  ['K1 duplicates are never reported',
   '    if (block.keys.has(key)) out.push({ key, line: i + 1 });',
   '    if (false) out.push({ key, line: i + 1 });',
   'THE WHOLE POINT: the check goes green on the exact file that stopped a workflow for 19 hours'],

  ['K2 a sibling list item does not end the previous item\u2019s block',
   "      while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();\n      body = body.slice(2);",
   "      body = body.slice(2);",
   'two sibling steps each carrying name/env/run would read as ONE block, so every multi-step workflow becomes a false positive — the check would be unusable and its first red would be wrong'],

  ['K3 block scalars are parsed as YAML',
   '      if (indent > blockScalarIndent) continue;',
   '      if (false) continue;',
   'a shell script echoing "name: x" twice would be reported as a duplicate key, which makes the check unusable'],

  ['K4 the reported line number is wrong',
   'out.push({ key, line: i + 1 });',
   'out.push({ key, line: 0 });',
   'a duplicate with no line is a hunt through a 120-line file'],
];

let caught = 0;
for (const [name, anchor, repl, why] of MUTATIONS) {
  const hits = original.split(anchor).length - 1;
  if (hits !== 1) { console.log(`FAIL       ${name}\n            anchor matched ${hits} times, expected 1 — NOTHING MUTATED.`); continue; }
  const mutated = original.replace(anchor, repl);
  if (mutated === original) { console.log(`FAIL       ${name}\n            file unchanged — NOTHING MUTATED.`); continue; }
  const path = place(mutated, 'm');
  if (readFileSync(path, 'utf8') === original) { console.log(`FAIL       ${name}\n            the written copy is identical — NOTHING MUTATED.`); continue; }
  const red = !run(path);
  console.log(`${red ? 'CAUGHT    ' : 'NOT CAUGHT'} ${name}\n            (${why})`);
  if (red) caught++;
}

console.log(`\n${caught} of ${MUTATIONS.length} mutations caught.`);
console.log('COVERAGE: dupKeys’ detection, block boundaries, scalar skipping and line');
console.log('reporting. It does NOT cover the directory scan or GitHub’s real schema.');
process.exit(caught === MUTATIONS.length ? 0 : 1);
