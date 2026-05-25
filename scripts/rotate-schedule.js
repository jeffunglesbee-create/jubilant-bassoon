#!/usr/bin/env node
// scripts/rotate-schedule.js — Strip schedule entries older than 7 days
// Run at session start or pre-commit to prevent unbounded file growth.
// Safe: only removes entries that are unreachable via the 7-day date nav limit.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'index.html');
const DAYS_TO_KEEP = 7;

const today = new Date();
today.setHours(0, 0, 0, 0);
const cutoff = new Date(today);
cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP);
const cutoffISO = cutoff.toISOString().slice(0, 10);

let content = fs.readFileSync(FILE, 'utf8');
const before = content.length;

// 1. Clean buildDateSchedule — remove date blocks older than cutoff
//    Pattern: "YYYY-MM-DD": [ ... ],
const schedRegex = /\s*"(2026-\d{2}-\d{2})":\s*\[[\s\S]*?\],?/g;
let match;
const removals = [];
const schedStart = content.indexOf('function buildDateSchedule');
const schedEnd = content.indexOf('if(!sched[iso]) return null;');
if (schedStart !== -1 && schedEnd !== -1) {
  const schedBlock = content.slice(schedStart, schedEnd);
  while ((match = schedRegex.exec(schedBlock)) !== null) {
    const dateStr = match[1];
    if (dateStr < cutoffISO) {
      removals.push(dateStr);
    }
  }
  // Remove stale date blocks
  for (const dateStr of removals) {
    const blockRegex = new RegExp(
      `\\s*"${dateStr}":\\s*\\[[\\s\\S]*?\\],?`,
      'g'
    );
    // Only replace within the sched object
    const before = content.slice(0, schedEnd);
    const after = content.slice(schedEnd);
    content = before.replace(blockRegex, '') + after;
  }
}

// 2. Clean mlbRaw — remove entries with start_time before cutoff
//    These are filtered by isToday() so past entries never display
const mlbEntries = content.match(/\{home:"[^"]*"[^}]*start_time:"(2026-\d{2}-\d{2}T[^"]*)"[^}]*\},?/g);
let mlbRemoved = 0;
if (mlbEntries) {
  for (const entry of mlbEntries) {
    const dateMatch = entry.match(/start_time:"(2026-\d{2}-\d{2})/);
    if (dateMatch && dateMatch[1] < cutoffISO) {
      // Only remove from mlbRaw section (between "const mlbRaw=[" and "];")
      const mlbStart = content.indexOf('const mlbRaw=[');
      const mlbEnd = content.indexOf('];', mlbStart);
      if (mlbStart !== -1 && mlbEnd !== -1) {
        const mlbSection = content.slice(mlbStart, mlbEnd);
        if (mlbSection.includes(entry)) {
          content = content.slice(0, mlbStart) + mlbSection.replace(entry, '') + content.slice(mlbEnd);
          mlbRemoved++;
        }
      }
    }
  }
}

const after = content.length;
const saved = before - after;

if (saved > 0) {
  fs.writeFileSync(FILE, content);
  console.log(`rotate-schedule: removed ${removals.length} date blocks, ${mlbRemoved} MLB entries`);
  console.log(`rotate-schedule: ${saved.toLocaleString()} bytes freed (${(before/1000).toFixed(0)}KB → ${(after/1000).toFixed(0)}KB)`);
} else {
  console.log('rotate-schedule: nothing to rotate (all entries within 7-day window)');
}
