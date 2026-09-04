#!/usr/bin/env node
// scripts/sync-umpire-abs-ratings.js — Regenerate UMPIRE_ABS_RATINGS in
// src/legacy/field.js from the real weekly outbox/mlb/umpire_abs.json data.
//
// 2026-09-04: this wrote index.html directly until today. index.html's script
// block is generated from src/legacy/field.js by scripts/sync-source.mjs, so
// every regenerated table lived only in the generated artifact. field.js kept
// the May-27 launch values, and the next sync-source run silently reverted the
// fresh ones — measured at 43a13586: field.js held 53 lines ('neon'
// challenged:3), index.html held 78 ('neon' challenged:4). Writing the source
// and letting the sync propagate is the fix; the workflow now runs
// sync-source.mjs after this script and commits both files.
//
// CC-CMD-2026-07-10-mlb-umpire-abs-sync: UMPIRE_ABS_RATINGS was frozen at
// May 27 launch data while mlb-weekly-update.py already refreshed
// outbox/mlb/umpire_abs.json every Monday, with nothing propagating it
// into the constant that actually ships. This closes that gap as a new
// step in the SAME existing weekly workflow, not a new pipeline.
//
// pitchesCalled dropped, not carried forward: confirmed via direct grep
// that the field is written into getUmpireABSRating()'s return object
// (index.html, one site) but never read by any of its 5 real call sites
// -- a dead passthrough. The new source has no per-umpire pitch-count
// equivalent (Statcast ABS tracking counts challenges, not total pitches
// called), so dropping it loses no real, consumed behavior.
//
// weakness taxonomy changes from the old table's ('high'/'low'/'inside'/
// 'outside'/null) to the new source's ('down-right'/'down-left'/'left',
// etc.) -- confirmed safe: every real consumer only truthy-checks it and
// free-text interpolates (`weak: ${d.weakness} zone`), never an exact-
// value comparison.
//
// Deterministic: same input JSON always produces byte-identical output,
// so a week with no real umpire-stat changes correctly produces an empty
// git diff (no timestamp or other non-deterministic value is baked into
// the generated block).

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '..', 'src', 'legacy', 'field.js');
const JSON_FILE  = path.join(__dirname, '..', 'outbox', 'mlb', 'umpire_abs.json');

function main() {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  } catch (e) {
    console.log(`sync-umpire-abs-ratings: could not read/parse ${JSON_FILE} (${e.message}) -- leaving src/legacy/field.js untouched`);
    return;
  }

  const entries = Object.entries(raw.data || {});
  if (!entries.length) {
    console.log('sync-umpire-abs-ratings: no umpire entries in JSON -- leaving src/legacy/field.js untouched');
    return;
  }

  // Sort ascending by overturn rate, matching the existing table's own
  // established low-to-high convention.
  entries.sort((a, b) => (a[1].rate ?? 0) - (b[1].rate ?? 0));

  const lines = entries.map(([key, d]) => {
    const rate = typeof d.rate === 'number' ? d.rate : 0;
    const weakness = d.weakness != null ? `'${d.weakness}'` : 'null';
    return `  '${key}': { challenged:${d.challenged ?? 0}, overturned:${d.overturned ?? 0}, rate:${rate}, weakness:${weakness} },`;
  });

  const newBlock = `const UMPIRE_ABS_RATINGS = {\n${lines.join('\n')}\n};`;

  let content = fs.readFileSync(SOURCE_FILE, 'utf8');
  const startMarker = 'const UMPIRE_ABS_RATINGS = {';
  const start = content.indexOf(startMarker);
  if (start === -1) {
    console.error('sync-umpire-abs-ratings: could not find "const UMPIRE_ABS_RATINGS = {" in src/legacy/field.js -- aborting, not writing');
    process.exitCode = 1;
    return;
  }

  // Brace-matched scan from the object literal's opening '{' to its real
  // closing '}' -- not a naive regex, so a stray '}' inside a value can
  // never truncate the replacement early.
  let depth = 0;
  let i = start + startMarker.length - 1; // position of the opening '{'
  for (; i < content.length; i++) {
    const c = content[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  if (content[i] === ';') i++;
  const end = i;

  const before = content.slice(0, start);
  const after = content.slice(end);
  const updatedContent = before + newBlock + after;

  if (updatedContent === content) {
    console.log(`sync-umpire-abs-ratings: no change (${entries.length} umpires, source updated ${raw.updated || 'unknown'} -- identical to current src/legacy/field.js)`);
    return;
  }

  fs.writeFileSync(SOURCE_FILE, updatedContent);
  console.log(`sync-umpire-abs-ratings: regenerated UMPIRE_ABS_RATINGS with ${entries.length} umpires in src/legacy/field.js (source updated ${raw.updated || 'unknown'}) -- run scripts/sync-source.mjs to propagate into index.html`);
}

main();
