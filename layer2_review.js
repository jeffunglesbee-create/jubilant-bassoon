// layer2_review.js — FIELD Viewport AI Screenshot Review (Layer 2)
//
// In GitHub Actions CI: calls Courier Worker /layer2 via OIDC authentication.
//   No ANTHROPIC_API_KEY needed in GitHub secrets.
//   Courier (field-deploy.jeffunglesbee.workers.dev) holds its own ANTHROPIC_KEY.
//   OIDC token auto-generated from CI context (permissions: id-token: write).
//
// Locally: calls api.anthropic.com directly.
//   Requires: ANTHROPIC_API_KEY env var.
//   run: ANTHROPIC_API_KEY=sk-ant-... node layer2_review.js
//
// Requires: ANTHROPIC_KEY set in field-deploy Cloudflare Worker secrets.
//   dash.cloudflare.com → Workers & Pages → field-deploy → Settings → Variables and Secrets
//
// Input:    viewport-screenshots/vp-{360,393,820,1200}.png (from A99/B99/C99/D99)
// Output:   $GITHUB_STEP_SUMMARY (markdown) + stdout

const fs   = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'viewport-screenshots');
const COMMIT_MSG      = (process.env.COMMIT_MESSAGE || '').slice(0, 200) || '(no commit message)';
const IS_CI           = !!process.env.GITHUB_ACTIONS;
const COURIER_URL     = 'https://field-deploy.jeffunglesbee.workers.dev/layer2';
const MODEL           = 'claude-sonnet-4-20250514';

const VP_META = {
  360:  { label: 'Galaxy A36 / iPhone SE — small phone' },
  393:  { label: 'Pixel 8 — standard Android phone' },
  820:  { label: 'iPad Air portrait — AMBIENT MODE (critical viewport)' },
  1200: { label: 'Desktop' },
};

// ── Get GitHub OIDC token (CI only) ──────────────────────────────────────────
async function getOIDCToken() {
  const reqUrl   = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const reqToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!reqUrl || !reqToken) throw new Error('OIDC env vars missing — is permissions: id-token: write set on this job?');
  const url = `${reqUrl}&audience=field-deploy`;
  const r = await fetch(url, { headers: { 'Authorization': `Bearer ${reqToken}` } });
  if (!r.ok) throw new Error(`OIDC token request failed: ${r.status} ${await r.text().catch(() => '')}`);
  const { value } = await r.json();
  if (!value) throw new Error('OIDC token response had no value field');
  return value;
}

// ── Load screenshots from disk ────────────────────────────────────────────────
function loadScreenshots() {
  const result = {};
  for (const width of [360, 393, 820, 1200]) {
    const p = path.join(SCREENSHOTS_DIR, `vp-${width}.png`);
    if (fs.existsSync(p)) result[String(width)] = fs.readFileSync(p).toString('base64');
  }
  return result;
}

// ── CI path: call Courier Worker /layer2 via OIDC ────────────────────────────
async function reviewViaCourier(screenshots) {
  const token = await getOIDCToken();
  const r = await fetch(COURIER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ screenshots, commitMsg: COMMIT_MSG }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Courier /layer2 ${r.status}: ${body.slice(0, 300)}`);
  }
  const data = await r.json();
  if (!data.ok) throw new Error(`Courier error: ${data.error}`);
  return data.results;
}

// ── Local path: call api.anthropic.com directly ──────────────────────────────
async function reviewDirect(screenshots) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('⚠️  ANTHROPIC_API_KEY not set — Layer 2 skipped (local run)');
    return null;
  }
  const results = [];
  for (const [widthStr, imgB64] of Object.entries(screenshots)) {
    const width = parseInt(widthStr);
    const meta  = VP_META[width] || { label: `${width}px` };
    const prompt = `FIELD PWA screenshot — ${width}px (${meta.label})\nCommit: ${COMMIT_MSG}\n\nReview for: overlapping elements, truncated text, elements outside containers, "overlaid/sloppy" vs clean.\nFor 820px: is two-pane layout correct (left schedule + right ambient intelligence panel)?\n\nRespond in exactly three lines:\nVERDICT: PASS or FAIL\nISSUES: [specific problems, or "None"]\nNOTES: [minor observations, or "None"]`;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: MODEL, max_tokens: 512,
          system: 'You are reviewing screenshots of FIELD, a sports intelligence PWA, for layout problems.',
          messages: [{ role:'user', content: [
            { type:'image', source:{ type:'base64', media_type:'image/png', data:imgB64 }},
            { type:'text', text:prompt },
          ]}],
        }),
      });
      if (!r.ok) { results.push({width, verdict:'ERROR', review:`API ${r.status}`}); continue; }
      const d   = await r.json();
      const rev = d.content?.[0]?.text?.trim() || '(empty)';
      const verdict = /VERDICT:\s*PASS/i.test(rev) ? 'PASS' : /VERDICT:\s*FAIL/i.test(rev) ? 'FAIL' : 'UNKNOWN';
      results.push({ width, verdict, review: rev });
    } catch(e) { results.push({width, verdict:'ERROR', review:e.message}); }
    await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

// ── Step summary markdown ─────────────────────────────────────────────────────
function buildMarkdown(results, via) {
  const pass = results.filter(r => r.verdict === 'PASS').length;
  const fail = results.filter(r => r.verdict === 'FAIL').length;
  const icon = fail > 0 ? '❌' : '✅';
  const lines = [
    `## ${icon} FIELD Viewport AI Review (Layer 2)`,
    `**${pass} pass · ${fail} fail** — via ${via} · Model: \`${MODEL}\``,
    `> Commit: \`${COMMIT_MSG.slice(0,80)}\``, '',
    '> _Qualitative review: "overlaid and sloppy?" — complements Layer 1 geometric invariants._', '',
  ];
  for (const r of results) {
    const ic = r.verdict==='PASS' ? '✅' : r.verdict==='FAIL' ? '❌' : r.verdict==='SKIP' ? '⏭️' : '⚠️';
    const meta = VP_META[r.width] || { label:`${r.width}px` };
    lines.push(`### ${ic} ${r.width}px — ${meta.label}`, '');
    lines.push(...r.review.split('\n').map(l => `> ${l}`), '');
  }
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n── FIELD AI Screenshot Review (Layer 2) ────────────────────\n');

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.log('⚠️  viewport-screenshots/ not found — did viewport_smoke.js run first?');
    process.exit(0);
  }

  const screenshots = loadScreenshots();
  const found = Object.keys(screenshots).length;
  if (found === 0) {
    console.log('⚠️  No screenshots found in viewport-screenshots/');
    process.exit(0);
  }
  console.log(`  Screenshots loaded: ${Object.keys(screenshots).join(', ')}px\n`);

  let results;
  let via;
  try {
    if (IS_CI) {
      console.log('  CI mode → calling Courier Worker /layer2 via OIDC...');
      results = await reviewViaCourier(screenshots);
      via = 'Courier OIDC';
    } else {
      console.log('  Local mode → calling api.anthropic.com directly...');
      results = await reviewDirect(screenshots);
      via = 'direct API';
    }
  } catch(err) {
    console.error(`\n  ⚠️  Layer 2 error: ${err.message}`);
    console.log('  Layer 2 review skipped — continuing (non-blocking)');
    process.exit(0);
  }

  if (!results) { process.exit(0); }

  for (const r of results) {
    const ic = r.verdict==='PASS' ? '✅' : r.verdict==='FAIL' ? '❌' : '⚠️';
    console.log(`  ${ic} ${r.width}px: ${r.verdict}`);
    const issues = r.review.split('\n').find(l => /^ISSUES:/i.test(l)) || '';
    if (issues && !/none/i.test(issues)) console.log(`     ${issues}`);
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    try { fs.writeFileSync(summaryPath, buildMarkdown(results, via)); }
    catch(e) { console.log(`  ⚠️  Step summary write failed: ${e.message}`); }
  } else {
    console.log('\n' + buildMarkdown(results, via));
  }

  const fail = results.filter(r => r.verdict === 'FAIL').length;
  const pass = results.filter(r => r.verdict === 'PASS').length;
  console.log(`\n── Layer 2 complete: ${pass} pass, ${fail} fail (${via}) ──\n`);
  process.exit(0); // non-blocking — remove to harden once baseline confirmed
}

main().catch(err => { console.error('Layer 2 fatal:', err.message); process.exit(0); });
