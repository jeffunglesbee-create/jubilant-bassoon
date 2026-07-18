#!/usr/bin/env node
// Phase 1 esbuild wrapper: build from src/main.js → inject bundle into index.html in-place.
// Smoke always runs against SOURCE index.html before this script runs (see deploy-gate.yml).
// This script transforms index.html in-place, same pattern as strip-comments.js.

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, '..');
const htmlPath = join(rootDir, 'index.html');
const entryPoint = join(rootDir, 'src', 'main.js');
const tmpOut = join(rootDir, '.build-tmp-output.js');

// Build from src/main.js — no module resolution needed until Phase 3+.
await build({
  entryPoints: [entryPoint],
  outfile: tmpOut,
  bundle: true,         // resolves import './legacy/field.js' into a single IIFE
  format: 'iife',
  platform: 'browser',
  minify: false,        // strip-comments.js handles comment removal after this step
  logLevel: 'warning',  // surface pre-existing warnings (duplicate keys etc.)
});

const bundled = readFileSync(tmpOut, 'utf8');

// Inject bundle into index.html: replace the main app <script> block in-place.
// Use lastIndexOf — the main app script is the last <script> in the file (line ~4895).
// There is an earlier <script> at line ~4108 (16KB) that must not be touched.
const html = readFileSync(htmlPath, 'utf8');
const OPEN_TAG = '<script>';
const CLOSE_TAG = '</script>';
const scriptStart = html.lastIndexOf(OPEN_TAG);
if (scriptStart === -1) throw new Error('No <script> tag found in index.html');
const contentStart = scriptStart + OPEN_TAG.length;
const scriptEnd = html.indexOf(CLOSE_TAG, contentStart);
if (scriptEnd === -1) throw new Error('No </script> closing tag found after main script');

// Sanity-check: the block we found must be large (the main app is 2MB+).
const blockSize = scriptEnd - contentStart;
if (blockSize < 1_000_000) {
  throw new Error(`Script block found at lastIndexOf is only ${blockSize} chars — expected 2MB+. Wrong block.`);
}

const result = html.slice(0, contentStart) + '\n' + bundled + html.slice(scriptEnd);
writeFileSync(htmlPath, result, 'utf8');

// Clean up temp output.
import { unlinkSync } from 'fs';
try { unlinkSync(tmpOut); } catch {}

console.log(`✅ build-bundle: esbuild IIFE (${(bundled.length / 1024).toFixed(0)} KB) injected into index.html`);
