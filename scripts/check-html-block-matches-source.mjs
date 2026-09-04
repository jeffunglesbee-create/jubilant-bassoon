#!/usr/bin/env node
// scripts/check-html-block-matches-source.mjs — assert index.html's script
// block is still byte-identical to src/legacy/field.js.
//
// 2026-09-04. Anything that edits index.html's script block AFTER
// sync-source.mjs has run is writing to a generated artifact: the next sync
// reverts it, silently. The pre-commit hook's own eslint --fix pass is exactly
// that shape — it runs after the sync and `git add`s index.html. It changes
// nothing today (measured at d7e8c819: --fix left the file byte-identical),
// which is why this is a guard rather than a rewrite. If it ever does change
// something, this turns a silent revert into a named failure.
//
// The class of bug it catches is not hypothetical here. The weekly umpire
// generator wrote index.html directly for eight weeks; field.js kept the
// May-27 launch values and every sync reverted the refresh. Measured at
// 43a13586: 53 stale lines in the source against 78 fresh ones in the artifact.
//
// Exit 0 = identical. Exit 1 = diverged, with the first differing line named.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(rootDir, 'index.html'), 'utf8');
const fieldJs = readFileSync(join(rootDir, 'src', 'legacy', 'field.js'), 'utf8');

// Same block selection as sync-source.mjs: by SIZE, not position — a comment
// inside the bundle that quotes the tag would otherwise win a lastIndexOf.
const OPEN_TAG = '<script type="module">';
const CLOSE_TAG = '</script>';
let contentStart = -1, scriptEnd = -1, blockSize = 0;
for (let i = html.indexOf(OPEN_TAG); i !== -1; i = html.indexOf(OPEN_TAG, i + 1)) {
  const cs = i + OPEN_TAG.length;
  const ce = html.indexOf(CLOSE_TAG, cs);
  if (ce === -1) continue;
  if (ce - cs > blockSize) { blockSize = ce - cs; contentStart = cs; scriptEnd = ce; }
}
if (contentStart === -1) {
  console.error('check-html-block: no module script block found in index.html');
  process.exit(1);
}
if (blockSize < 1_000_000) {
  console.error(`check-html-block: largest script block is only ${blockSize} chars — expected 2MB+. Wrong block.`);
  process.exit(1);
}

const block = html.slice(contentStart, scriptEnd);
const norm = s => s.replace(/^\n+/, '').replace(/\n+$/, '');
if (norm(block) === norm(fieldJs)) {
  console.log(`check-html-block: index.html script block matches src/legacy/field.js (${blockSize} chars)`);
  process.exit(0);
}

const a = norm(fieldJs).split('\n');
const b = norm(block).split('\n');
let i = 0;
while (i < a.length && i < b.length && a[i] === b[i]) i++;
console.error('check-html-block: index.html script block has DIVERGED from src/legacy/field.js.');
console.error('');
console.error(`  first difference at line ${i + 1} of the block`);
console.error(`  src/legacy/field.js : ${JSON.stringify((a[i] ?? '<end of file>').slice(0, 160))}`);
console.error(`  index.html          : ${JSON.stringify((b[i] ?? '<end of file>').slice(0, 160))}`);
console.error(`  (field.js ${a.length} lines, index.html block ${b.length} lines)`);
console.error('');
console.error('  index.html\'s script block is GENERATED from src/legacy/field.js.');
console.error('  Something wrote it after the sync ran, and the next sync will revert it.');
console.error('  Fix: make the change in src/legacy/field.js, then re-run scripts/sync-source.mjs.');
process.exit(1);
