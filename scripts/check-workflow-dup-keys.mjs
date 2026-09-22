// A duplicate key inside one YAML block makes a GitHub workflow INVALID.
//
// Not "the later value wins" — GitHub refuses the file. The run is created,
// fails in zero seconds with zero jobs, and NOTHING THE FILE SCHEDULES EVER
// FIRES. A workflow whose last green run looked fine simply stops.
//
// MEASURED 2026-09-22. tennis-live-probe.yml gained a second `env:` in one
// step, because PROBE_TRIGGER was added above a `run:` that already had an
// `env:` after it. Runs 45, 46 and 47 each lasted 0s with 0 jobs, and both
// scheduled probes on 2026-09-22 (14:07 and 23:07 UTC) never fired. Nineteen
// hours of silence, and the workflow list shows three ordinary-looking reds.
//
// Python's yaml.safe_load PARSES IT FINE — last key wins — so a local
// "does it parse" check says yes while GitHub says no. That is why this scans
// for the duplicate itself rather than trusting a parser.
//
// NO YAML LIBRARY. This repo has none installed, and adding one to validate
// indentation is more moving parts than the thing being validated. The scan is
// indentation-based and deliberately narrow: keys at the same indent inside the
// same block. It does not understand flow mappings, anchors, or multi-line
// scalars beyond skipping their bodies.
import { readdirSync, readFileSync } from 'node:fs';

const DIR = '.github/workflows';

/**
 * Duplicate keys, per block, by indentation.
 *
 * A block ends when indentation decreases, or when a sibling list item starts.
 * Lines inside a block scalar (`run: |`) are skipped: their content is data,
 * and `foo: bar` inside a shell script is not a YAML key.
 */
export function dupKeys(text) {
  const out = [];
  const lines = text.split('\n');
  const stack = [];            // [{ indent, keys:Set, startLine }]
  let blockScalarIndent = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    const indent = raw.length - raw.trimStart().length;

    // Inside a `|` or `>` scalar until indentation returns to at or below the
    // line that opened it.
    if (blockScalarIndent !== null) {
      if (indent > blockScalarIndent) continue;
      blockScalarIndent = null;
    }

    let body = raw.trimStart();
    let keyIndent = indent;
    // A list item can carry its first key on the same line: `- name: x`.
    if (body.startsWith('- ')) {
      // A new sibling item ends the previous item's block. Popping on
      // `> indent` (the dash's own column, not the key's) clears the previous
      // item's key block too, because its keys sit at indent + 2.
      //
      // A second `if (… === indent + 2) pop()` line stood here and was DEAD:
      // mutating it to a no-op changed nothing on either fixture or on all 128
      // workflow files in this repo. Removed rather than kept with a fixture
      // invented to justify it (Rule 63). Found by mutation K2 surviving, then
      // by running both versions across every real workflow.
      while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
      body = body.slice(2);
      keyIndent = indent + 2;
    }

    const m = body.match(/^([A-Za-z_][\w.-]*)\s*:(\s|$)/);
    if (!m) continue;
    const key = m[1];

    while (stack.length && stack[stack.length - 1].indent > keyIndent) stack.pop();
    if (!stack.length || stack[stack.length - 1].indent < keyIndent) {
      stack.push({ indent: keyIndent, keys: new Set() });
    }
    const block = stack[stack.length - 1];
    if (block.keys.has(key)) out.push({ key, line: i + 1 });
    else block.keys.add(key);

    if (/:\s*[|>][-+]?\s*$/.test(body)) blockScalarIndent = keyIndent;
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('check-workflow-dup-keys.mjs')) {
  const files = readdirSync(DIR).filter(f => /\.ya?ml$/.test(f));
  let bad = 0;
  for (const f of files) {
    for (const d of dupKeys(readFileSync(`${DIR}/${f}`, 'utf8'))) {
      bad++;
      console.log(`FAIL  ${DIR}/${f}:${d.line} duplicate key \`${d.key}\` in the same block — GitHub will refuse this workflow`);
    }
  }
  if (!bad) console.log(`ok    no duplicate keys in ${files.length} workflow file(s)`);
  console.log(`\nchecked ${files.length} file(s) in ${DIR}`);
  console.log('COVERAGE: duplicate keys within one block, found by indentation. It does');
  console.log('NOT validate the workflow schema, expressions, or anything else GitHub');
  console.log('may reject — a green result here is not a promise that a run will start.');
  process.exit(bad ? 1 : 0);
}
