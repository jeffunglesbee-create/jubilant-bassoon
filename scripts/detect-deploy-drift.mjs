// Deploy-drift detector. CC-CMD-2026-08-02-discovery-discipline-rule-
// and-deploy-drift-detector TASK 2. Detection only -- never attempts to
// remediate (e.g. never fires workflow_dispatch itself); a human or a
// future session decides the response. Reuses SW_VERSION as the
// version-stamped marker (it already exists for exactly this purpose)
// rather than inventing a new one.

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';

const SITE = 'https://jubilant-bassoon.jeffunglesbee.workers.dev/';
const WATCHED_PATHS = ['index.html', 'sw.js', 'field_utils.js', 'wrangler.jsonc'];
// A normal deploy-gate.yml run completes in well under this window;
// only flag drift once a real commit has had a fair chance to deploy.
const REASONABLE_WINDOW_MINUTES = 15;

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function findLatestWatchedCommit() {
  const log = sh(`git log -1 --format=%H|%cI -- ${WATCHED_PATHS.join(' ')}`);
  const [sha, isoDate] = log.split('|');
  return { sha, isoDate };
}

function extractSwVersionFromCommit(sha) {
  const content = sh(`git show ${sha}:sw.js`);
  const m = content.match(/const SW_VERSION = '([^']+)'/);
  return m ? m[1] : null;
}

async function extractLiveSwVersion() {
  const r = await fetch(SITE);
  const html = await r.text();
  const m = html.match(/SW_VERSION\s*=\s*'([^']+)'/);
  return { status: r.status, swVersion: m ? m[1] : null };
}

async function main() {
  const out = {
    timestamp: new Date().toISOString(),
    latestWatchedCommit: null,
    commitAgeMinutes: null,
    expectedSwVersion: null,
    liveSwVersion: null,
    liveStatus: null,
    withinReasonableWindow: null,
    drift: null,
    incidentWritten: false,
    incidentPath: null,
  };

  const { sha, isoDate } = findLatestWatchedCommit();
  out.latestWatchedCommit = sha;
  const commitAgeMs = Date.now() - new Date(isoDate).getTime();
  out.commitAgeMinutes = Math.round(commitAgeMs / 60000);
  out.withinReasonableWindow = out.commitAgeMinutes < REASONABLE_WINDOW_MINUTES;

  out.expectedSwVersion = extractSwVersionFromCommit(sha);

  const live = await extractLiveSwVersion();
  out.liveSwVersion = live.swVersion;
  out.liveStatus = live.status;

  // Drift = a real, watched commit old enough to have deployed, but the
  // live site's SW_VERSION doesn't match what that commit shipped.
  out.drift = !out.withinReasonableWindow
    && out.expectedSwVersion !== null
    && out.liveSwVersion !== null
    && out.expectedSwVersion !== out.liveSwVersion;

  if (out.drift) {
    const incidentPath = `outbox/incident-deploy-drift-${out.timestamp.replace(/[:.]/g, '-')}.md`;
    const body = `# Deploy Drift Incident — ${out.timestamp}

**Category:** incident (deploy-drift)

A commit touching a deploy-gate.yml-watched path
(${WATCHED_PATHS.join(', ')}) has been on \`main\` for
${out.commitAgeMinutes} minutes (commit \`${sha}\`, expected
SW_VERSION \`${out.expectedSwVersion}\`), but the live site
(${SITE}) currently reports SW_VERSION \`${out.liveSwVersion}\`.

This means a real, well-formed commit did not deploy within a normal
window. Detection only -- no automated remediation was attempted.
Real next step: check deploy-gate.yml's recent run history for this
commit SHA; if it never fired, this may be the same class of silent
push-trigger failure documented in
\`outbox/cc-session-2026-08-02-trigger-deploy-gate.md\`.
`;
    writeFileSync(incidentPath, body);
    out.incidentWritten = true;
    out.incidentPath = incidentPath;
  }

  console.log(JSON.stringify(out, null, 2));
  writeFileSync('outbox/deploy-drift-check-latest.json', JSON.stringify(out, null, 2));
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
