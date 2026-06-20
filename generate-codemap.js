#!/usr/bin/env node
// generate-codemap.js — Code Map (L3) generator for FIELD's single-file PWA.
// Emits a JSON snapshot of index.html structure to stdout:
//   - sections   (// ── name / // ══ name dividers)
//   - functions  (declarations, arrow assignments, function expressions)
//   - constants  (top-level const NAME = { ... } / [ ... ] over 500 bytes)
//   - boot       (calls that drive page startup: fetchSchedule, renderAll,
//                 buildTodaySchedule, initSportsDB, autoGeolocate,
//                 maybeShowSetup, setTimeout)
//   - summary    (counts plus top-10 largest constants and sections)
//
// Zero dependencies; regex-only. Designed for CI (.github/workflows/codemap.yml).
//
// Usage: node generate-codemap.js [path-to-index.html] > CODE_MAP.json

'use strict';

const fs = require('fs');

const file = process.argv[2] || 'index.html';
const src = fs.readFileSync(file, 'utf8');
const lines = src.split('\n');

// ── sections ──────────────────────────────────────────────────────
// Match either box-drawing dash dividers (── name ──) or double-line
// dividers (══ name ══). Trailing dashes/equals are optional.
const sections = [];
const sectionRe = /^\s*\/\/\s*(?:──|══)+\s*(.+?)(?:\s*(?:──|══)+)?\s*$/;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(sectionRe);
  if (m) {
    const name = m[1].trim();
    if (name.length === 0) continue;
    sections.push({ name, startLine: i + 1, endLine: 0, lineCount: 0 });
  }
}
for (let i = 0; i < sections.length; i++) {
  sections[i].endLine = (i + 1 < sections.length) ? sections[i + 1].startLine - 1 : lines.length;
  sections[i].lineCount = sections[i].endLine - sections[i].startLine + 1;
}

function sectionAt(line) {
  // Sections are sorted by startLine. Walk backwards to find the
  // most-recent section that begins at or before `line`.
  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i].startLine <= line) return sections[i].name;
  }
  return null;
}

// ── functions ─────────────────────────────────────────────────────
const functions = [];
const fnDeclRe   = /^\s*(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/;
const fnArrowRe  = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/;
const fnExprRe   = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?function\s*\*?\s*\(([^)]*)\)/;

for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  let m = L.match(fnDeclRe);
  if (m) {
    functions.push({
      name: m[2], line: i + 1,
      params: m[3].trim(),
      async: !!m[1],
      section: sectionAt(i + 1),
    });
    continue;
  }
  m = L.match(fnArrowRe);
  if (m) {
    functions.push({
      name: m[1], line: i + 1,
      params: (m[3] != null ? m[3] : m[4] || '').trim(),
      async: !!m[2],
      section: sectionAt(i + 1),
    });
    continue;
  }
  m = L.match(fnExprRe);
  if (m) {
    functions.push({
      name: m[1], line: i + 1,
      params: m[3].trim(),
      async: !!m[2],
      section: sectionAt(i + 1),
    });
  }
}

// ── constants (>500 bytes) ────────────────────────────────────────
// Find top-level `const NAME = { ... }` or `const NAME = [ ... ]` blocks
// whose matching close brace/bracket sits at column zero (codebase
// convention). Skip any block whose total span is under 500 bytes.
const constants = [];
const constStartRe = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*([\[{])/;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(constStartRe);
  if (!m) continue;
  const closeCh = m[2] === '{' ? '}' : ']';
  let endLine = -1;
  // Cap the walk so a malformed open never scans the whole file.
  const maxScan = Math.min(lines.length, i + 8000);
  for (let j = i + 1; j < maxScan; j++) {
    if (lines[j].startsWith(closeCh)) { endLine = j; break; }
  }
  if (endLine === -1) continue;
  let bytes = 0;
  for (let j = i; j <= endLine; j++) bytes += lines[j].length + 1;
  if (bytes > 500) {
    constants.push({
      name: m[1],
      line: i + 1,
      endLine: endLine + 1,
      approximateBytes: bytes,
    });
  }
}

// ── boot sequence ─────────────────────────────────────────────────
const bootRe = /\b(fetchSchedule|renderAll|buildTodaySchedule|initSportsDB|autoGeolocate|maybeShowSetup|setTimeout)\s*\(/;
const boot = [];
for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  const m = L.match(bootRe);
  if (!m) continue;
  boot.push({
    call: m[1],
    line: i + 1,
    context: L.trim().slice(0, 200),
  });
}

// ── summary ───────────────────────────────────────────────────────
const summary = {
  functionCount: functions.length,
  sectionCount:  sections.length,
  constantCount: constants.length,
  bootCallCount: boot.length,
  largestConstants: constants.slice()
    .sort((a, b) => b.approximateBytes - a.approximateBytes)
    .slice(0, 10),
  largestSections: sections.slice()
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, 10),
};

const out = {
  file,
  lineCount: lines.length,
  generatedAt: new Date().toISOString(),
  summary,
  sections,
  functions,
  constants,
  boot,
};

process.stdout.write(JSON.stringify(out, null, 2));
process.stdout.write('\n');
