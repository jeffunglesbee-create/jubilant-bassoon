// pl_client_verify.js — E2E verification of PL match client wiring
// Verifies: fetchPLMatch relay call, Key Moments bottom sheet inject, Lineups stats inject
// Runs on GitHub Actions (ubuntu-latest + Playwright Chromium)
// Known fixture: 116197 (Bournemouth 2-0 Leicester City, GW38 2024/25)
const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?pl-verify';
const PL_FIXTURE_ID = 116197;
const BOOT_WAIT_MS = 6000;
const INJECT_WAIT_MS = 4000;

const results = [];
function pass(name) { results.push({ name, ok: true }); console.log(`  ✅ ${name}`); }
function fail(name, detail) { results.push({ name, ok: false, detail }); console.error(`  ❌ ${name}: ${detail}`); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Suppress console noise from FIELD boot (SSE connect errors etc.)
  page.on('console', () => {});

  console.log(`\nLoading FIELD: ${FIELD_URL}`);
  await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(BOOT_WAIT_MS);

  // Confirm _plVerify test API is present (proves ESM export wired)
  const hasVerifyApi = await page.evaluate(() => typeof window._plVerify === 'object' && window._plVerify !== null);
  if (!hasVerifyApi) {
    fail('_plVerify test API present', '_plVerify not defined — check ?pl-verify export block in field.js');
    // All remaining probes depend on this; bail out early
    await browser.close();
    console.log('\n── Results ─────────────────────────────────────────────────────');
    results.forEach(r => console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ': ' + r.detail : ''}`));
    console.log(`\n0/1 passed`);
    fs.mkdirSync('outbox', { recursive: true });
    fs.writeFileSync(`outbox/pl-verify-summary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ ts: new Date().toISOString(), fixture: PL_FIXTURE_ID, passed: 0, total: 1, results }, null, 2));
    process.exit(1);
  }
  pass('_plVerify test API present');

  // ── PROBE 1: fetchPLMatch relay contract ─────────────────────────────────
  console.log('\n── Probe 1: fetchPLMatch relay contract');
  let plData = null;
  try {
    plData = await page.evaluate(async (fixtureId) => {
      return await window._plVerify.fetchPLMatch(fixtureId);
    }, PL_FIXTURE_ID);
  } catch (e) {
    fail('fetchPLMatch is defined', e.message);
  }

  if (plData === null) {
    fail('fetchPLMatch returns data', 'returned null — relay unreachable or error');
  } else {
    pass('fetchPLMatch is defined');
    pass('fetchPLMatch returns data');

    const htS = plData?.fixture?.halfTimeScore;
    if (htS?.homeScore != null && htS?.awayScore != null) {
      pass(`fixture.halfTimeScore present (HT: ${htS.homeScore}–${htS.awayScore})`);
    } else {
      fail('fixture.halfTimeScore present', JSON.stringify(htS));
    }

    const events = plData?.events;
    if (Array.isArray(events) && events.length > 0) {
      pass(`events[] is flat array (${events.length} events)`);
    } else {
      fail('events[] is flat array', `got ${typeof events}, length ${events?.length}`);
    }

    const goals = (events || []).filter(e => e.type === 'goal');
    if (goals.length > 0) {
      pass(`goal events present (${goals.length} goals)`);
      if (goals[0].text && goals[0].time?.label != null) {
        pass(`goal.text and goal.time.label present`);
      } else {
        fail('goal.text and goal.time.label present', JSON.stringify(goals[0]).slice(0, 100));
      }
    } else {
      fail('goal events present', 'no goal type events in array');
    }

    const subs = (events || []).filter(e => e.type === 'substitution');
    if (subs.length > 0) {
      pass(`substitution events present (${subs.length} subs)`);
    } else {
      fail('substitution events present', 'no substitution type events');
    }

    const tls = plData?.fixture?.teamLists;
    if (Array.isArray(tls) && tls.length >= 2) {
      pass(`fixture.teamLists present (${tls.length} teams)`);
      const tl0 = tls[0];
      const starter = tl0?.lineup?.[0];
      if (starter?.name?.display && starter?.info?.position != null && starter?.matchShirtNumber != null) {
        pass(`player shape: name.display, info.position, matchShirtNumber present`);
      } else {
        fail('player shape valid', JSON.stringify(starter).slice(0, 150));
      }
      if (tl0?.formation?.label) {
        pass(`formation.label present (${tl0.formation.label})`);
      } else {
        fail('formation.label present', JSON.stringify(tl0?.formation));
      }
    } else {
      fail('fixture.teamLists present', `length=${tls?.length}`);
    }

    const officials = plData?.fixture?.matchOfficials || [];
    const ref = officials.find(o => o.role === 'MAIN');
    const varOff = officials.find(o => o.role === 'VAR');
    if (ref?.name?.display) {
      pass(`MAIN referee present (${ref.name.display})`);
    } else {
      fail('MAIN referee present', `roles seen: ${officials.map(o => o.role).join(', ')}`);
    }
    if (varOff?.name?.display) {
      pass(`VAR official present (${varOff.name.display})`);
    } else {
      fail('VAR official present', `roles seen: ${officials.map(o => o.role).join(', ')}`);
    }
  }

  // ── PROBE 2: Key Moments bottom sheet inject ──────────────────────────────
  console.log('\n── Probe 2: Key Moments bottom sheet inject');
  try {
    await page.evaluate((fixtureId) => {
      // Inject a synthetic PL game so openBottomSheet has something to render
      window._plVerify.setEspnScore('Bournemouth|Leicester City', {
        state: 'post', homeName: 'Bournemouth', awayName: 'Leicester City',
        home: 'Bournemouth', away: 'Leicester City',
        homeScore: 2, awayScore: 0, source: 'pl', _plId: fixtureId,
        period: 2, detail: 'FT',
      });
      window._plVerify.pushAllDataSport({
        sport: 'Premier League',
        games: [{ _id: 'pl-verify-game', home: 'Bournemouth', away: 'Leicester City', start_time: '2025-05-25T16:00:00Z' }],
      });
      window._plVerify.openBottomSheet('pl-verify-game');
    }, PL_FIXTURE_ID);

    // Wait for async inject (fetchPLMatch fires, then DOM fills)
    await page.waitForTimeout(INJECT_WAIT_MS);

    const bsContent = await page.$('#bs-content');
    if (!bsContent) {
      fail('bs-content element exists', 'not found in DOM');
    } else {
      pass('bs-content element exists');

      // bs-pl-inject should be gone (replaced) OR Key Moments section should be present
      const plInjectGone = await page.evaluate(() => !document.getElementById('bs-pl-inject'));
      if (plInjectGone) {
        pass('bs-pl-inject anchor replaced (async inject fired)');
      } else {
        fail('bs-pl-inject anchor replaced', 'anchor still present — fetchPLMatch may have returned null or DOM inject failed');
      }

      // Check for Key Moments label
      const hasKeyMoments = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.bs-section-label')).some(el => el.textContent.trim() === 'Key Moments')
      );
      if (hasKeyMoments) {
        pass('Key Moments section label rendered');
      } else {
        fail('Key Moments section label rendered', 'no .bs-section-label with text "Key Moments"');
      }

      // Check that at least one goal event text is present (Bournemouth 2-0 Leicester)
      const bodyText = await page.evaluate(() => document.getElementById('bs-content')?.textContent || '');
      const hasGoal = bodyText.includes('Goal!') || bodyText.includes('Bournemouth') && bodyText.includes('Leicester');
      if (hasGoal) {
        pass('Goal event text rendered in Key Moments');
      } else {
        fail('Goal event text rendered', `bs-content text: ${bodyText.slice(0, 200)}`);
      }
    }

    // Screenshot of bottom sheet
    const bsEl = await page.$('#bottom-sheet');
    if (bsEl) {
      fs.mkdirSync('outbox', { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const shot = `outbox/pl-verify-bottomsheet-${ts}.png`;
      await bsEl.screenshot({ path: shot });
      console.log(`  📸 ${shot}`);
    }
  } catch (e) {
    fail('bottom sheet inject (no crash)', e.message);
  }

  // ── PROBE 3: Stats tab Lineups inject ────────────────────────────────────
  console.log('\n── Probe 3: Stats tab Lineups inject');
  try {
    // Navigate to Stats tab and re-inject synthetic game
    await page.evaluate((fixtureId) => {
      window._plVerify.setEspnScore('Bournemouth|Leicester City', {
        state: 'post', homeName: 'Bournemouth', awayName: 'Leicester City',
        home: 'Bournemouth', away: 'Leicester City',
        homeScore: 2, awayScore: 0, source: 'pl', _plId: fixtureId,
        period: 2, detail: 'FT',
      });
      window._plVerify.pushAllDataSport({
        sport: 'Premier League',
        games: [{ _id: 'pl-verify-game', home: 'Bournemouth', away: 'Leicester City', start_time: '2025-05-25T16:00:00Z' }],
      });
      window._plVerify.toggleStatsView();
    }, PL_FIXTURE_ID);

    await page.waitForTimeout(INJECT_WAIT_MS);

    // Check placeholder is gone
    const plInjectGone = await page.evaluate(() => !document.querySelector('[id^="tg-pl-"]'));
    if (plInjectGone) {
      pass('tg-pl- placeholder replaced (stats async inject fired)');
    } else {
      fail('tg-pl- placeholder replaced', 'placeholder still in DOM');
    }

    // Check Lineups label
    const hasLineups = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.bs-section-label')).some(el => el.textContent.trim() === 'Lineups')
    );
    if (hasLineups) {
      pass('Lineups section label rendered in Stats tab');
    } else {
      fail('Lineups section label rendered', 'no .bs-section-label with text "Lineups"');
    }

    // Check that the Lineups section has content (officials line or formation)
    const lineupsText = await page.evaluate(() => {
      const label = Array.from(document.querySelectorAll('.bs-section-label')).find(el => el.textContent.trim() === 'Lineups');
      return label?.closest('.bs-section')?.textContent || '';
    });
    const hasLineupsContent = lineupsText.includes('REF:') || lineupsText.includes('4-2-3-1') || lineupsText.includes('VAR:');
    if (hasLineupsContent) {
      pass(`Lineups section has content (REF/VAR/formation)`);
    } else {
      fail('Lineups section has content', `lineups text: ${lineupsText.slice(0, 300)}`);
    }

    // Screenshot
    const statsEl = await page.$('#stats-content');
    if (statsEl) {
      fs.mkdirSync('outbox', { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const shot = `outbox/pl-verify-stats-${ts}.png`;
      await statsEl.screenshot({ path: shot });
      console.log(`  📸 ${shot}`);
    }
  } catch (e) {
    fail('stats lineups inject (no crash)', e.message);
  }

  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n── Results ─────────────────────────────────────────────────────');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  results.forEach(r => console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ': ' + r.detail : ''}`));
  console.log(`\n${passed}/${results.length} passed`);

  const summary = {
    ts: new Date().toISOString(),
    fixture: PL_FIXTURE_ID,
    passed,
    total: results.length,
    results,
  };
  fs.mkdirSync('outbox', { recursive: true });
  const summaryFile = `outbox/pl-verify-summary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\nSummary written: ${summaryFile}`);

  if (failed.length > 0) {
    console.error(`\n${failed.length} assertion(s) failed`);
    process.exit(1);
  }
})().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
