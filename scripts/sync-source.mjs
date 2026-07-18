#!/usr/bin/env node
// Sync src/legacy/field.js → index.html script block.
// Run before smoke and before committing any src/legacy/field.js change.
// This keeps index.html's inline script byte-identical to src/legacy/field.js.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, '..');
const htmlPath = join(rootDir, 'index.html');
const fieldJsPath = join(rootDir, 'src', 'legacy', 'field.js');

const fieldJs = readFileSync(fieldJsPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');

const OPEN_TAG = '<script>';
const CLOSE_TAG = '</script>';
const scriptStart = html.lastIndexOf(OPEN_TAG);
if (scriptStart === -1) throw new Error('No <script> tag found in index.html');
const contentStart = scriptStart + OPEN_TAG.length;
const scriptEnd = html.indexOf(CLOSE_TAG, contentStart);
if (scriptEnd === -1) throw new Error('No </script> closing tag found');

const blockSize = scriptEnd - contentStart;
if (blockSize < 1_000_000) {
  throw new Error(`Script block is only ${blockSize} chars — expected 2MB+. Wrong block.`);
}

const result = html.slice(0, contentStart) + fieldJs + html.slice(scriptEnd);
writeFileSync(htmlPath, result, 'utf8');

console.log(`✅ sync-source: src/legacy/field.js (${(fieldJs.length / 1024).toFixed(0)} KB) → index.html script block`);
