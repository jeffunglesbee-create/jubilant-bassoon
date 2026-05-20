#!/usr/bin/env node
// scripts/inventory.js — FIELD function catalog
// Run: npm run inventory
// Prints all named pure functions in field_utils.js and named helpers in index.html.
// USE THIS before writing any inline pattern to check if a helper already exists.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function extractFunctions(filePath, label) {
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match function declarations
    const fnMatch = line.match(/^(?:async )?function\s+(\w+)\s*\(([^)]*)\)/);
    if (!fnMatch) continue;
    const name = fnMatch[1];
    const params = fnMatch[2].trim();

    // Look back for JSDoc summary line
    let summary = '';
    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const doc = lines[j].trim();
      if (doc.startsWith('* ') && !doc.startsWith('* @')) {
        summary = doc.replace(/^\*\s*/, '').trim();
        break;
      }
      if (doc.startsWith('// ') && !doc.startsWith('//─') && !doc.startsWith('// ─')) {
        summary = doc.replace(/^\/\/\s*/, '').trim();
        if (summary.length > 10 && !summary.startsWith('=')) break;
        else summary = '';
      }
    }

    results.push({ name, params, summary: summary.slice(0, 72) });
  }
  return results;
}

function extractIndexHelpers(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  // Find the utility helpers block
  const blockStart = src.indexOf('// ── Index.html utility helpers');
  const blockEnd = src.indexOf('// ─────────────────────────────────────────────────────────────────────────\n', blockStart + 1);
  if (blockStart === -1) return [];
  const block = src.slice(blockStart, blockEnd > blockStart ? blockEnd : blockStart + 6000);
  const lines = block.split('\n');
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:async )?function\s+(\w+)\s*\(([^)]*)\)/);
    if (!m) continue;
    let summary = '';
    for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
      const doc = lines[j].trim();
      if (doc.startsWith('// ') && doc.length > 6) {
        const candidate = doc.replace(/^\/\/\s*/, '');
        if (!candidate.startsWith('─') && !candidate.startsWith('Replaces')) {
          summary = candidate.slice(0, 72);
          break;
        }
      }
    }
    results.push({ name: m[1], params: m[2], summary });
  }
  return results;
}

const utils = extractFunctions(path.join(ROOT, 'field_utils.js'), 'field_utils.js');
const helpers = extractIndexHelpers(path.join(ROOT, 'index.html'));

const pad = (s, n) => s.length >= n ? s : s + ' '.repeat(n - s.length);

console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║  FIELD Function Catalog                                                  ║');
console.log('║  Pure functions (field_utils.js) + index.html utility block             ║');
console.log('║  Check here BEFORE writing any inline pattern — Rule 20                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

// Print utils organized by section
const sections = {};
let currentSection = 'Other';
const src = fs.readFileSync(path.join(ROOT, 'field_utils.js'), 'utf8');
src.split('\n').forEach(line => {
  const m = line.match(/^\/\/ ── ([A-Z][A-Z \/]+) ─/);
  if (m) currentSection = m[1].trim();
  const fn = line.match(/^(?:async )?function\s+(\w+)/);
  if (fn) {
    const found = utils.find(u => u.name === fn[1]);
    if (found) {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(found);
    }
  }
});

for (const [section, fns] of Object.entries(sections)) {
  console.log(`  ── ${section} ${'─'.repeat(Math.max(0, 54 - section.length))}`);
  fns.forEach(f => {
    const sig = `${f.name}(${f.params})`;
    console.log(`  ${pad(sig, 38)}  ${f.summary}`);
  });
  console.log();
}

if (helpers.length) {
  console.log('  ── INDEX.HTML UTILITY BLOCK (needs globals) ' + '─'.repeat(14));
  helpers.forEach(f => {
    const sig = `${f.name}(${f.params})`;
    console.log(`  ${pad(sig, 38)}  ${f.summary}`);
  });
  console.log();
}

console.log(`  ${utils.length + helpers.length} functions total\n`);
