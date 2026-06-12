#!/usr/bin/env node
// strip-comments.js — Strip JS comments from index.html for deploy artifact.
//
// The git source (index.html) retains ALL comments permanently.
// This script produces index.deploy.html for Cloudflare only.
// Any Claude instance reads the git source — full context always available.
//
// Preserves: all code, strings, regex, template literals, HTML, CSS.
// Removes: // single-line comments, /* multi-line */ comments, blank lines in <script> blocks.
// Output: index.deploy.html (for Cloudflare deploy)

const fs = require('fs');
const src = process.argv[2] || 'index.html';
const html = fs.readFileSync(src, 'utf8');

let totalStripped = 0;
let commentCount = 0;

const result = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, js) => {
  let inMultiComment = false;
  const lines = js.split('\n');
  const outLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inMultiComment) {
      const endIdx = line.indexOf('*/');
      if (endIdx >= 0) {
        inMultiComment = false;
        const rest = line.slice(endIdx + 2).trim();
        if (rest) outLines.push(line.slice(endIdx + 2));
        commentCount++; totalStripped += endIdx + 2;
      } else {
        commentCount++; totalStripped += line.length + 1;
      }
      continue;
    }

    // Pure single-line comment
    if (/^\s*\/\//.test(line)) {
      commentCount++; totalStripped += line.length + 1;
      continue;
    }

    // Pure multi-line comment start
    if (/^\s*\/\*/.test(line)) {
      if (line.includes('*/')) {
        commentCount++; totalStripped += line.length + 1;
        continue;
      }
      inMultiComment = true;
      commentCount++; totalStripped += line.length + 1;
      continue;
    }

    // Blank line
    if (!trimmed) { totalStripped += line.length + 1; continue; }

    // Code line — keep as-is
    outLines.push(line);
  }

  return `<script${attrs}>${outLines.join('\n')}</script>`;
});

fs.writeFileSync('index.deploy.html', result);

const saved = html.length - result.length;
console.log(`Source:   ${(html.length / 1024).toFixed(0)} KB (git — full comments, Claude reads this)`);
console.log(`Deploy:   ${(result.length / 1024).toFixed(0)} KB (Cloudflare — stripped for users)`);
console.log(`Saved:    ${(saved / 1024).toFixed(0)} KB (${(saved / html.length * 100).toFixed(1)}%)`);
console.log(`Comments: ${commentCount} stripped from deploy artifact`);
