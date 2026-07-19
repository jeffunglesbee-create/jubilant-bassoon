#!/usr/bin/env node
// Probes public competitor pages AND FIELD relay endpoints for advanced metric terms.
// Produces three outputs:
//   outbox/competitor-probe-{date}.md  — human-readable report
//   outbox/competitor-probe-{date}.json — structured data for relay ingest
//   outbox/metric-gaps-{date}.md        — metrics on competitors but missing from FIELD relay
// Run: node scripts/probe-competitors.mjs
// Paywalled probes are skipped by default; pass --include-paywalled to attempt them anyway.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const CONFIG_PATH = join(ROOT, 'docs', 'competitor-metrics.json');
const OUTBOX_DIR = join(ROOT, 'outbox');

const INCLUDE_PAYWALLED = process.argv.includes('--include-paywalled');
const TIMEOUT_MS = 12000;
const UA = 'Mozilla/5.0 (compatible; FIELD-competitor-probe/1.0; +https://github.com/jeffunglesbee-create/jubilant-bassoon)';

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const RELAY_BASE = config.relay_base || 'https://field-relay-nba.jeffunglesbee.workers.dev';
const today = new Date().toISOString().slice(0, 10);

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const text = await res.text();
    return { ok: true, text, length: text.length };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

async function probeRelayEndpoint(endpoint) {
  if (!endpoint) return { status: 'not-built' };
  const url = `${RELAY_BASE}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return { status: `error:HTTP ${res.status}`, url };
    const text = await res.text();
    try { JSON.parse(text); } catch (_) { return { status: 'error:invalid-json', url }; }
    return { status: 'ok', url, bytes: text.length };
  } catch (e) {
    clearTimeout(timer);
    return { status: `error:${e.name === 'AbortError' ? 'timeout' : e.message}`, url };
  }
}

function searchTerms(html, terms) {
  const lower = html.toLowerCase();
  return terms.filter(t => lower.includes(t.toLowerCase()));
}

const rows = [];
let foundCount = 0;
let notFoundCount = 0;
let blockedCount = 0;

// Probe competitor pages
for (const metric of config.metrics) {
  for (const probe of metric.probes) {
    if (probe.paywall && !INCLUDE_PAYWALLED) {
      rows.push({ metric: metric.display, metricId: metric.id, site: probe.name, status: 'skipped-paywall', found: [], sport: metric.sport });
      continue;
    }

    const result = await fetchPage(probe.url);

    if (!result.ok) {
      rows.push({ metric: metric.display, metricId: metric.id, site: probe.name, status: `blocked:${result.reason}`, found: [], sport: metric.sport });
      blockedCount++;
      continue;
    }

    const gated = result.length < 5000 ||
      result.text.includes('cf-browser-verification') ||
      result.text.includes('Just a moment') ||
      result.text.includes('Enable JavaScript') ||
      result.text.includes('checking your browser');

    if (gated) {
      rows.push({ metric: metric.display, metricId: metric.id, site: probe.name, status: 'blocked:bot-gate', found: [], sport: metric.sport });
      blockedCount++;
      continue;
    }

    const found = searchTerms(result.text, metric.terms);
    if (found.length > 0) {
      rows.push({ metric: metric.display, metricId: metric.id, site: probe.name, status: 'found', found, sport: metric.sport });
      foundCount++;
    } else {
      rows.push({ metric: metric.display, metricId: metric.id, site: probe.name, status: 'not-found', found: [], sport: metric.sport });
      notFoundCount++;
    }
  }
}

// Probe FIELD relay endpoints
const relayResults = {};
for (const metric of config.metrics) {
  const relayResult = await probeRelayEndpoint(metric.field_relay_endpoint);
  relayResults[metric.id] = {
    endpoint: metric.field_relay_endpoint,
    note: metric.field_relay_note,
    ...relayResult,
  };
}

// Build by-metric index
const byMetric = {};
for (const row of rows) {
  if (!byMetric[row.metricId]) byMetric[row.metricId] = [];
  byMetric[row.metricId].push(row);
}

// Determine gap metrics: competitor has it, FIELD relay doesn't
const gapMetrics = [];
for (const metric of config.metrics) {
  const competitorRows = byMetric[metric.id] || [];
  const competitorFound = competitorRows.some(r => r.status === 'found');
  const relayOk = relayResults[metric.id]?.status === 'ok';
  const relayBuilt = metric.field_relay_endpoint !== null;
  if (competitorFound && !relayOk) {
    gapMetrics.push({
      id: metric.id,
      display: metric.display,
      sport: metric.sport,
      competitorSites: competitorRows.filter(r => r.status === 'found').map(r => r.site),
      relayEndpoint: metric.field_relay_endpoint,
      relayStatus: relayResults[metric.id]?.status,
      relayNote: metric.field_relay_note,
      relayBuilt,
    });
  }
}

// ── Markdown report ────────────────────────────────────────────────────────────
const lines = [
  `# Competitor Metrics Probe — ${today}`,
  ``,
  `Probes public HTML of competitor pages and FIELD relay endpoints for advanced metric terms.`,
  `Paywalled probes: ${INCLUDE_PAYWALLED ? 'included' : 'skipped (run with --include-paywalled to include)'}`,
  ``,
  `## Summary`,
  `| | Count |`,
  `|---|---|`,
  `| Found on competitor | ${foundCount} |`,
  `| Not found on competitor | ${notFoundCount} |`,
  `| Blocked / bot-gated | ${blockedCount} |`,
  `| Skipped (paywall) | ${rows.filter(r => r.status === 'skipped-paywall').length} |`,
  `| Gap metrics (on competitor, not in FIELD relay) | ${gapMetrics.length} |`,
  ``,
  `## Results by metric`,
  ``,
];

for (const metric of config.metrics) {
  const probeRows = byMetric[metric.id] || [];
  const competitorFound = probeRows.some(r => r.status === 'found');
  const relay = relayResults[metric.id];
  const relayOk = relay?.status === 'ok';
  const isGap = competitorFound && !relayOk;
  const icon = isGap ? '🚨' : competitorFound ? '⚠️' : '✅';
  lines.push(`### ${icon} ${metric.display}`);
  lines.push(`**FIELD relay:** \`${metric.field_relay_endpoint || 'not built'}\` — ${relay?.status || '?'}${relay?.bytes ? ` (${relay.bytes} bytes)` : ''}`);
  lines.push(`> ${metric.field_relay_note}`);
  lines.push(``);
  lines.push(`| Site | Result | Terms matched |`);
  lines.push(`|---|---|---|`);
  for (const r of probeRows) {
    const terms = r.found.length > 0 ? r.found.map(t => `\`${t}\``).join(', ') : '—';
    lines.push(`| ${r.site} | ${r.status} | ${terms} |`);
  }
  lines.push('');
}

lines.push(`---`);
lines.push(`*Generated by scripts/probe-competitors.mjs. Claims about metric uniqueness must cite a run of this probe, not training-data assumptions.*`);

// ── Gap report ─────────────────────────────────────────────────────────────────
const gapLines = [
  `# Metric Gap Report — ${today}`,
  ``,
  `Metrics found on competitor pages that are NOT yet served by FIELD relay.`,
  `Source: competitor-probe-${today}.md`,
  ``,
  `## Legend`,
  `- 🔴 Competitor serves this metric AND FIELD relay endpoint doesn't exist`,
  `- 🟡 Competitor serves this metric AND FIELD relay endpoint exists but returned error`,
  ``,
];

if (gapMetrics.length === 0) {
  gapLines.push(`No gaps found — all competitor-confirmed metrics have a working FIELD relay endpoint.`);
} else {
  gapLines.push(`## Gaps (${gapMetrics.length})`);
  gapLines.push(``);
  for (const gap of gapMetrics) {
    const icon = gap.relayBuilt ? '🟡' : '🔴';
    gapLines.push(`### ${icon} ${gap.display} (\`${gap.id}\`)`);
    gapLines.push(`- **Sport:** ${gap.sport}`);
    gapLines.push(`- **Found on:** ${gap.competitorSites.join(', ')}`);
    gapLines.push(`- **FIELD relay endpoint:** \`${gap.relayEndpoint || 'none'}\``);
    gapLines.push(`- **Relay status:** ${gap.relayStatus || 'not-built'}`);
    gapLines.push(`- **Note:** ${gap.relayNote}`);
    gapLines.push(``);
  }
}

gapLines.push(`---`);
gapLines.push(`*Auto-generated by scripts/probe-competitors.mjs*`);

// ── JSON output ────────────────────────────────────────────────────────────────
const jsonOutput = {
  generated: new Date().toISOString(),
  date: today,
  summary: {
    competitorFound: foundCount,
    competitorNotFound: notFoundCount,
    blocked: blockedCount,
    skippedPaywall: rows.filter(r => r.status === 'skipped-paywall').length,
    gaps: gapMetrics.length,
  },
  metrics: config.metrics.map(metric => {
    const probeRows = byMetric[metric.id] || [];
    return {
      id: metric.id,
      display: metric.display,
      sport: metric.sport,
      relayEndpoint: metric.field_relay_endpoint,
      relayStatus: relayResults[metric.id]?.status || 'not-built',
      relayBytes: relayResults[metric.id]?.bytes || null,
      competitorFound: probeRows.some(r => r.status === 'found'),
      competitorSites: probeRows.filter(r => r.status === 'found').map(r => r.site),
      isGap: gapMetrics.some(g => g.id === metric.id),
      probes: probeRows.map(r => ({ site: r.site, status: r.status, termsFound: r.found })),
    };
  }),
  gaps: gapMetrics,
};

// ── Write files ────────────────────────────────────────────────────────────────
const report = lines.join('\n');
const gapReport = gapLines.join('\n');

mkdirSync(OUTBOX_DIR, { recursive: true });
writeFileSync(join(OUTBOX_DIR, `competitor-probe-${today}.md`), report, 'utf8');
writeFileSync(join(OUTBOX_DIR, `competitor-probe-${today}.json`), JSON.stringify(jsonOutput, null, 2), 'utf8');
writeFileSync(join(OUTBOX_DIR, `metric-gaps-${today}.md`), gapReport, 'utf8');

// GitHub Actions step summary
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  writeFileSync(summaryPath, report, { flag: 'a' });
  writeFileSync(summaryPath, '\n\n---\n\n', { flag: 'a' });
  writeFileSync(summaryPath, gapReport, { flag: 'a' });
}

console.log(report);
console.log('\n\n---\n\n');
console.log(gapReport);
console.log(`\nWrote: outbox/competitor-probe-${today}.md`);
console.log(`Wrote: outbox/competitor-probe-${today}.json`);
console.log(`Wrote: outbox/metric-gaps-${today}.md`);
