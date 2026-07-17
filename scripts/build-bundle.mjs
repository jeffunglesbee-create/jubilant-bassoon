#!/usr/bin/env node
// Phase 1 esbuild wrapper: extract <script> from index.html → bundle → re-inject in-place.
// Smoke always runs against the SOURCE before this script runs (see deploy-gate.yml).
// This script transforms index.html in-place, same pattern as strip-comments.js.

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dir, '..', 'index.html');

const html = readFileSync(htmlPath, 'utf8');

// Find the <script> block (no type= attribute — the main app script).
const OPEN_TAG = '<script>';
const CLOSE_TAG = '</script>';
const scriptStart = html.indexOf(OPEN_TAG);
if (scriptStart === -1) throw new Error('No <script> tag found in index.html');

const contentStart = scriptStart + OPEN_TAG.length;
const scriptEnd = html.indexOf(CLOSE_TAG, contentStart);
if (scriptEnd === -1) throw new Error('No </script> closing tag found');

const scriptContent = html.slice(contentStart, scriptEnd);

// Write to a temp file for esbuild to consume.
const tmpIn = join(__dir, '..', '.build-tmp-input.js');
const tmpOut = join(__dir, '..', '.build-tmp-output.js');
writeFileSync(tmpIn, scriptContent, 'utf8');

await build({
  entryPoints: [tmpIn],
  outfile: tmpOut,
  bundle: false,       // no module resolution — legacy script, not ES modules
  format: 'iife',
  platform: 'browser',
  minify: false,       // preserve readability; strip-comments.js handles comment removal
  logLevel: 'warning', // show warnings (duplicate keys etc.) but not info noise
});

const bundled = readFileSync(tmpOut, 'utf8');

// Re-assemble: everything before <script>, then bundled content, then </script> onward.
const before = html.slice(0, contentStart);
const after = html.slice(scriptEnd);
const result = before + '\n' + bundled + after;

writeFileSync(htmlPath, result, 'utf8');

// Clean up temp files.
import { unlinkSync } from 'fs';
try { unlinkSync(tmpIn); } catch {}
try { unlinkSync(tmpOut); } catch {}

console.log(`✅ build-bundle: esbuild IIFE written to index.html (${(bundled.length / 1024).toFixed(0)} KB)`);
