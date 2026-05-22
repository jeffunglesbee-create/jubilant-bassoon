// layer2_review.js — FIELD Viewport AI Screenshot Review (Layer 2)
//
// Reads the 4 viewport screenshots produced by viewport_smoke.js (A99/B99/C99/D99),
// sends each to Claude Vision via the Anthropic API, and posts a structured
// PASS/FAIL review to the GitHub Step Summary.
//
// PHILOSOPHY: Catches what Layer 1 cannot.
//   Layer 1 (viewport_smoke.js): geometric contracts — "is element X in position Y?"
//   Layer 2 (this script): editorial judgment — "does this look overlaid and sloppy?"
//   A misaligned padding, poor text wrapping, or chip overflow isn't a bounding-box
//   violation — but Claude Vision can see it and flag it.
//
// REQUIRES: ANTHROPIC_API_KEY GitHub secret
// INPUT:    viewport-screenshots/vp-{360,393,820,1200}.png
// OUTPUT:   $GITHUB_STEP_SUMMARY (markdown) + stdout
//
// Non-blocking by default (exit 0). Remove the final `process.exit(0)` override
// once a clean baseline is established.
//
// Run locally: ANTHROPIC_API_KEY=sk-... node layer2_review.js
// CI: smoke-and-verify.yml viewport-smoke job, step "AI Screenshot Review"

const fs   = require('fs');
const path = require('path');

const API_KEY         = process.env.ANTHROPIC_API_KEY;
const SCREENSHOTS_DIR = path.join(__dirname, 'viewport-screenshots');
const COMMIT_MSG      = (process.env.COMMIT_MESSAGE || '').slice(0, 200) || '(no commit message)';
const MODEL           = 'claude-sonnet-4-20250514';

// ── Viewport metadata for the review prompt ───────────────────────────────────
const VP_META = {
  360: {
    label: 'Galaxy A36 / iPhone SE — small phone',
    context: `Phone layout. Key elements:
- OTW bar: sticky teal strip at top (VISIBLE — this is correct on phone)
- Filter chips: small pill buttons below masthead
- Schedule cards: single-column, full width (~340px)
- Ambient panel: must NOT be visible
- No horizontal scroll expected`,
  },
  393: {
    label: 'Pixel 8 — standard Android phone',
    context: `Phone layout, slightly wider than 360px. Same expectations:
- OTW bar: sticky at top (VISIBLE)
- Schedule cards: full width (~370px)
- Ambient panel: must NOT be visible`,
  },
  820: {
    label: 'iPad Air 4th gen portrait — AMBIENT MODE (most critical viewport)',
    context: `CRITICAL two-pane layout:
LEFT PANE (~430px): masthead (FIELD brand) at top, filter chips, game schedule cards below.
  - OTW bar: must NOT be visible here — it was moved to the right panel
  - Game cards: single-column, ~400px wide
  - No bars or strips should appear ABOVE the masthead

RIGHT PANEL (~380px, fixed position): the ambient intelligence column.
  - Should show: season context pill, game info, live scores section
  - Must NOT overlap the left schedule pane
  - Should start from the top of the viewport

Common problems that have occurred:
  - OTW bar appearing in the left pane (overlapping masthead/cards) — BAD
  - Bars stacking above the FIELD masthead logo — BAD
  - Right panel covering left-pane game cards — BAD`,
  },
  1200: {
    label: 'Desktop — wide layout',
    context: `Desktop layout. Key elements:
- OTW bar: sticky strip at top (VISIBLE — correct on desktop)
- No right ambient panel
- Wider schedule cards
- More whitespace around content`,
  },
};

// ── Call Claude Vision API ─────────────────────────────────────────────────────
async function reviewScreenshot(width, imgPath) {
  const imgData = fs.readFileSync(imgPath).toString('base64');
  const meta    = VP_META[width] || { label: `${width}px`, context: 'Standard layout.' };

  const systemPrompt = `You are reviewing screenshots of FIELD, a sports intelligence PWA, 
for layout and visual quality issues. Be precise and specific. 
When you identify a problem, say exactly which element and where.
When the layout looks correct and clean, say so clearly.`;

  const userPrompt = `FIELD screenshot — ${width}px viewport (${meta.label})

Expected layout at this viewport:
${meta.context}

Recent changes in this commit: ${COMMIT_MSG}

Review for:
1. Elements overlapping where they shouldn't
2. Content or text cut off in a way that loses meaning
3. Elements appearing outside their expected container
4. The overall impression: clean and readable, or "overlaid and sloppy"?
5. At 820px specifically: is the two-pane layout correct (left schedule + right intelligence panel)?

Respond in this exact structure — three lines only:
VERDICT: PASS or FAIL
ISSUES: [specific problems found, or "None"]
NOTES: [minor observations worth tracking, or "None"]`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type':    'application/json',
      'x-api-key':       API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 512,
      system:     systemPrompt,
      messages: [{
        role:    'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imgData } },
          { type: 'text',  text: userPrompt },
        ],
      }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '(unreadable)');
    throw new Error(`Anthropic API ${resp.status}: ${body.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data.content?.[0]?.text?.trim() || '(empty response)';
}

// ── Parse verdict from response ───────────────────────────────────────────────
function parseVerdict(text) {
  if (/VERDICT:\s*PASS/i.test(text))    return 'PASS';
  if (/VERDICT:\s*FAIL/i.test(text))    return 'FAIL';
  return 'UNKNOWN';
}

// ── Write GitHub Step Summary markdown ────────────────────────────────────────
function buildMarkdown(results, commitMsg) {
  const passCount = results.filter(r => r.verdict === 'PASS').length;
  const failCount = results.filter(r => r.verdict === 'FAIL').length;
  const skipCount = results.filter(r => r.verdict === 'SKIP').length;
  const statusIcon = failCount > 0 ? '❌' : skipCount === results.length ? '⏭️' : '✅';

  const lines = [
    `## ${statusIcon} FIELD Viewport AI Review (Layer 2)`,
    '',
    `**${passCount} pass · ${failCount} fail · ${skipCount} skip** — Model: \`${MODEL}\``,
    `> Commit: \`${commitMsg.slice(0, 80)}\``,
    '',
    '> _Layer 2 catches qualitative issues (overlaid/sloppy layout) that Layer 1_',
    '> _geometric invariant tests cannot detect. Non-blocking until baseline confirmed._',
    '',
  ];

  for (const r of results) {
    const icon = r.verdict === 'PASS' ? '✅' : r.verdict === 'FAIL' ? '❌' : r.verdict === 'SKIP' ? '⏭️' : '⚠️';
    const meta = VP_META[r.width] || { label: `${r.width}px` };
    lines.push(`### ${icon} ${r.width}px — ${meta.label}`);
    lines.push('');
    if (r.verdict === 'SKIP' || r.verdict === 'ERROR') {
      lines.push(`> ${r.review}`);
    } else {
      // Format the 3-line response as a blockquote
      const reviewLines = r.review.split('\n').map(l => `> ${l}`).join('\n');
      lines.push(reviewLines);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n── FIELD AI Screenshot Review (Layer 2) ────────────────────\n');

  // Graceful exit if no API key
  if (!API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not configured — Layer 2 skipped');
    console.log('   Add ANTHROPIC_API_KEY to GitHub Secrets (repo → Settings → Secrets)');
    console.log('   to enable AI qualitative review after each push.\n');
    process.exit(0);
  }

  // Graceful exit if no screenshots
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.log('⚠️  viewport-screenshots/ not found — did viewport_smoke.js run first?');
    process.exit(0);
  }

  const widths  = [360, 393, 820, 1200];
  const results = [];
  let anyFail   = false;

  for (const width of widths) {
    const imgPath = path.join(SCREENSHOTS_DIR, `vp-${width}.png`);

    if (!fs.existsSync(imgPath)) {
      console.log(`  ⏭️  vp-${width}.png not found — skipping`);
      results.push({ width, verdict: 'SKIP', review: 'Screenshot file not found.' });
      continue;
    }

    const meta = VP_META[width] || { label: `${width}px` };
    process.stdout.write(`  Reviewing ${width}px (${meta.label})... `);

    try {
      const review  = await reviewScreenshot(width, imgPath);
      const verdict = parseVerdict(review);
      if (verdict === 'FAIL') anyFail = true;
      results.push({ width, verdict, review });

      const icon = verdict === 'PASS' ? '✅' : verdict === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${verdict}`);

      // Brief review excerpt to stdout
      const issueLine = review.split('\n').find(l => /^ISSUES:/i.test(l)) || '';
      if (issueLine && !/none/i.test(issueLine)) {
        console.log(`         ${issueLine}`);
      }

    } catch (err) {
      console.log(`⚠️  ERROR`);
      console.log(`         ${err.message}`);
      results.push({ width, verdict: 'ERROR', review: `API error: ${err.message}` });
    }

    // Pause between API calls (rate limit courtesy)
    if (width !== widths[widths.length - 1]) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // Write GitHub Step Summary
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    try {
      fs.writeFileSync(summaryPath, buildMarkdown(results, COMMIT_MSG));
      console.log('\n  ✓ Written to GitHub Step Summary');
    } catch (e) {
      console.log(`\n  ⚠️  Could not write step summary: ${e.message}`);
    }
  } else {
    // Local run — print markdown to stdout
    console.log('\n' + buildMarkdown(results, COMMIT_MSG));
  }

  const pass = results.filter(r => r.verdict === 'PASS').length;
  const fail = results.filter(r => r.verdict === 'FAIL').length;
  console.log(`\n── Layer 2 complete: ${pass} pass, ${fail} fail ────────────────\n`);

  // Non-blocking until clean baseline is confirmed in CI.
  // To harden: replace exit(0) with exit(anyFail ? 1 : 0)
  process.exit(0);
}

main().catch(err => {
  console.error('\nLayer 2 fatal error:', err.message);
  process.exit(0); // non-blocking
});
