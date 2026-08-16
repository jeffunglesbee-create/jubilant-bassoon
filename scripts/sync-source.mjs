#!/usr/bin/env node
// Sync src/legacy/field.js → index.html script block.
// Run before smoke and before committing any src/legacy/field.js change.
// This keeps index.html's inline script byte-identical to src/legacy/field.js.

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, '..');
const htmlPath = join(rootDir, 'index.html');
const fieldJsPath = join(rootDir, 'src', 'legacy', 'field.js');

const fieldJs = readFileSync(fieldJsPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');

const OPEN_TAG = '<script type="module">';
const CLOSE_TAG = '</script>';
// Select the app block by SIZE, not by position. lastIndexOf(OPEN_TAG) picks the
// last textual occurrence of the tag — including one that appears inside the
// bundled JS itself (a comment quoting the tag). That is not hypothetical: commit
// 1fecea4 added a comment containing the literal tag, sync selected a 7.5 KB
// phantom block, threw "expected 2MB+", and BLOCKED EVERY DEPLOY until it was
// found. The real app block is the only module block over 1 MB, so choose it.
let contentStart = -1, scriptEnd = -1, blockSize = 0;
for (let i = html.indexOf(OPEN_TAG); i !== -1; i = html.indexOf(OPEN_TAG, i + 1)) {
  const cs = i + OPEN_TAG.length;
  const ce = html.indexOf(CLOSE_TAG, cs);
  if (ce === -1) continue;
  const size = ce - cs;
  if (size > blockSize) { blockSize = size; contentStart = cs; scriptEnd = ce; }
}
if (contentStart === -1) throw new Error('No module script block found in index.html');
if (blockSize < 1_000_000) {
  throw new Error(`Largest script block is only ${blockSize} chars — expected 2MB+. Wrong block.`);
}

const currentBlock = html.slice(contentStart, scriptEnd);

// Divergence guard: if index.html's script block differs from field.js AND
// also differs from the last-committed index.html script block, that means
// someone edited index.html's script block directly — which sync would silently
// destroy. Block and require the edit to be moved to src/legacy/field.js first.
if (currentBlock !== fieldJs) {
  let committedBlock = null;
  try {
    const committedHtml = execSync('git show HEAD:index.html', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    // Same size-based selection as above — comparing a correctly-selected current
    // block against a lastIndexOf-selected committed block would report a false
    // divergence whenever a phantom tag exists in the committed file.
    let bs = 0;
    for (let i = committedHtml.indexOf(OPEN_TAG); i !== -1; i = committedHtml.indexOf(OPEN_TAG, i + 1)) {
      const cc = i + OPEN_TAG.length;
      const ce = committedHtml.indexOf(CLOSE_TAG, cc);
      if (ce === -1) continue;
      if (ce - cc > bs) { bs = ce - cc; committedBlock = committedHtml.slice(cc, ce); }
    }
  } catch (_) {
    // No HEAD commit yet (initial repo) — skip the check
  }

  if (committedBlock !== null && currentBlock !== committedBlock) {
    process.stderr.write(`
╔══════════════════════════════════════════════════════════════════════╗
║  sync-source.mjs: DIRECT EDIT DETECTED — sync blocked               ║
║                                                                      ║
║  index.html's script block has content that differs from BOTH:       ║
║    • src/legacy/field.js  (the authoritative JS source)              ║
║    • the last committed index.html script block                      ║
║                                                                      ║
║  This means someone edited index.html's script block directly.       ║
║  sync-source.mjs will NOT overwrite it — that would destroy the work.║
║                                                                      ║
║  Fix: move the real edit into src/legacy/field.js, then re-run.     ║
║  DO NOT bypass this guard — bypassing = silently losing your work.   ║
╚══════════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }
}

const result = html.slice(0, contentStart) + fieldJs + html.slice(scriptEnd);
writeFileSync(htmlPath, result, 'utf8');

console.log(`✅ sync-source: src/legacy/field.js (${(fieldJs.length / 1024).toFixed(0)} KB) → index.html script block`);
