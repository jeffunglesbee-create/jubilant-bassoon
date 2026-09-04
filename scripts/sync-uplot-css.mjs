#!/usr/bin/env node
// scripts/sync-uplot-css.mjs — re-vendor uPlot's stylesheet into index.html.
//
// FIELD ships as a single HTML file, so uPlot's CSS is inlined rather than
// linked. That makes it a copy of an upstream file, and a copy drifts: when
// the uplot dependency is bumped, the block in index.html keeps whatever
// version was current the day it was pasted. This script is the fix, and
// scripts/uplot-css-check.mjs is the gate that notices when it has not run.
//
// Replaces ONLY the region between the vendored markers. The overrides below
// them are FIELD's own and are never touched.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(rootDir, 'index.html');
const cssPath  = join(rootDir, 'node_modules', 'uplot', 'dist', 'uPlot.min.css');

const OPEN  = '   ── vendored ── */\n';
const CLOSE = '\n/* ── overrides ─';

let css;
try {
  css = readFileSync(cssPath, 'utf8').trim();
} catch (e) {
  console.error(`sync-uplot-css: cannot read ${cssPath} (${e.message}) -- run npm install first`);
  process.exit(1);
}

const html = readFileSync(htmlPath, 'utf8');
const start = html.indexOf(OPEN);
const end   = html.indexOf(CLOSE, start);
if (start === -1 || end === -1) {
  console.error('sync-uplot-css: vendored markers not found in index.html -- aborting, not writing');
  process.exit(1);
}

const current = html.slice(start + OPEN.length, end);
if (current === css) {
  console.log(`sync-uplot-css: no change (${css.length} bytes, already current)`);
  process.exit(0);
}

writeFileSync(htmlPath, html.slice(0, start + OPEN.length) + css + html.slice(end), 'utf8');
console.log(`sync-uplot-css: re-vendored ${css.length} bytes (was ${current.length})`);
