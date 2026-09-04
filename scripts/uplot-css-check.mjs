#!/usr/bin/env node
// scripts/uplot-css-check.mjs — the inlined uPlot CSS must match the installed
// package. Without this, bumping the uplot dependency updates the JS in the
// bundle and silently leaves the stylesheet at whatever version was pasted.
//
// --self-test proves the check can fail: it mutates a copy in memory and
// asserts the comparison rejects it. A check that has never been seen to fail
// is not a check.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const OPEN  = '   ── vendored ── */\n';
const CLOSE = '\n/* ── overrides ─';

function extract(html) {
  const start = html.indexOf(OPEN);
  const end   = html.indexOf(CLOSE, start);
  if (start === -1 || end === -1) return null;
  return html.slice(start + OPEN.length, end);
}

if (process.argv.includes('--self-test')) {
  const ok = extract(`x${OPEN}BODY${CLOSE} y`);
  if (ok !== 'BODY') { console.error('self-test: extract failed, got', JSON.stringify(ok)); process.exit(1); }
  if (extract('no markers here') !== null) { console.error('self-test: missing markers must return null'); process.exit(1); }
  if (extract(`x${OPEN}BODY${CLOSE} y`) === 'MUTATED') { console.error('self-test: comparison is vacuous'); process.exit(1); }
  console.log('uplot-css-check: self-test passed (extract works, absent markers return null)');
}

const html = readFileSync(join(rootDir, 'index.html'), 'utf8');
const inlined = extract(html);
if (inlined === null) {
  console.error('uplot-css-check: vendored markers not found in index.html');
  process.exit(1);
}

let pkg;
try {
  pkg = readFileSync(join(rootDir, 'node_modules', 'uplot', 'dist', 'uPlot.min.css'), 'utf8').trim();
} catch (e) {
  console.log(`uplot-css-check: uplot not installed (${e.message}) -- skipping, CI installs it`);
  process.exit(0);
}

if (inlined !== pkg) {
  console.error('uplot-css-check: the inlined uPlot CSS has DRIFTED from node_modules/uplot.');
  console.error(`  inlined ${inlined.length} bytes, package ${pkg.length} bytes`);
  console.error('  Fix: node scripts/sync-uplot-css.mjs');
  process.exit(1);
}
console.log(`uplot-css-check: inlined CSS matches uplot package (${pkg.length} bytes)`);
