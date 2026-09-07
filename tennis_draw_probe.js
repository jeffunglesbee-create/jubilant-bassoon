// Does the deployed page actually DRAW the draw?
//
// WHY A BROWSER AND NOT AN ASSERTION ON THE SOURCE. smoke.js now carries twelve
// A-TDRAW rows and four of them were mutation-proved. Every one of them is a
// claim about the file. None of them can tell you whether the tab opens, the
// grid lays out, or the columns hold the players the relay shipped.
//
// That distinction is not theoretical here. On 2026-09-06 four tennis smoke
// assertions passed while the page rendered no tennis at all, because the
// failure was never in the code that renders tennis — it was that no section
// was ever created. Structure and integration are different claims.
//
// THE COMPARISON IS THE POINT, as it is in tennis_live_probe.js. This probe
// asks the RELAY for the draw, then asks the PAGE what it drew, and compares:
// the same number of match cards, the same round labels, and the champion's
// name if the final has been played. Either side alone proves nothing — an
// empty bracket is correct in December and a defect during a Grand Slam.
//
// VERDICTS. PASS, FAIL, NO DRAW (nothing at slam or 1000 level is playing, so
// there is nothing to prove), UNKNOWN (the relay or the page could not be
// reached — an unanswered question must not read as an answered one).

const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const RELAY = process.env.RELAY_BASE || 'https://field-relay-nba.jeffunglesbee.workers.dev';
const TS = new Date().toISOString();
const stamp = TS.replace(/[:.]/g, '-');

const TIER_RANK = { grand_slam: 0, masters_1000: 1, atp_1000: 1, wta_1000: 1 };

(async () => {
  const m = {
    ts: TS, fieldUrl: FIELD_URL, relay: RELAY,
    relayReachable: null, pickedTournament: null, pickedSeason: null,
    relayDrawStatus: null, relayRounds: null, relayMainDrawMatches: null,
    relayEdges: null, relayAnomalies: null, relayChampion: null,
    pageLoaded: null, navLinkVisible: null, sectionVisible: null,
    treeMatchCards: null, listMatchRows: null, columnHeads: null,
    championOnPage: null, anomalyLineOnPage: null,
    consoleErrors: null, failedRequests: null,
    // How long the page took to put something on screen, and whether it ever
    // did. A slow render and an empty one are different findings.
    renderWaitMs: null, renderTimedOut: null, relayFetchMs: null,
    verdict: null, reason: null,
  };

  // ── 1. What the relay says the draw is ──────────────────────────────────
  let draw = null, pick = null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dr = await fetch(`${RELAY}/bsd/tennis/matches/by-date?date=${today}`,
                           { signal: AbortSignal.timeout(30000) });
    m.relayReachable = dr.ok;
    if (dr.ok) {
      const day = await dr.json();
      const seen = new Map();
      for (const row of day?.results || []) {
        const t = row?.tournament;
        if (!t?.id || row?.is_doubles) continue;
        if (/Doubles|Boys|Girls|Wheelchair|Quad/i.test(t.name || '')) continue;
        const rank = TIER_RANK[t.category];
        if (rank == null) continue;
        const prev = seen.get(t.id);
        if (prev) prev.count++;
        else seen.set(t.id, { id: t.id, name: t.name, category: t.category, rank, count: 1 });
      }
      pick = [...seen.values()].sort((a, b) => a.rank - b.rank || b.count - a.count)[0] || null;
      m.pickedTournament = pick ? `${pick.id} ${pick.name} (${pick.category})` : null;
      if (pick) {
        const season = String(new Date().getUTCFullYear());
        m.pickedSeason = season;
        const t = Date.now();
        const r = await fetch(`${RELAY}/bsd/tennis/draw?tournament=${pick.id}&season=${season}`,
                              { signal: AbortSignal.timeout(60000) });
        m.relayFetchMs = Date.now() - t;
        m.relayDrawStatus = r.status;
        if (r.ok) {
          draw = await r.json();
          m.relayRounds = (draw.rounds || []).map((x) => `${x.round}=${x.matches}`);
          m.relayMainDrawMatches = draw.mainDrawMatches;
          m.relayEdges = (draw.edges || []).length;
          m.relayAnomalies = (draw.anomalies || []).map((a) => a.kind);
          const fin = (draw.nodes || []).find((n) => n.round === 'Final');
          m.relayChampion = fin && fin.winnerId != null
            ? ([fin.p1, fin.p2].find((p) => p?.id === fin.winnerId)?.name ?? null) : null;
        }
      }
    }
  } catch (e) {
    m.relayReachable = false;
    m.reason = `relay: ${e.message}`;
  }

  // ── 2. What the page drew ────────────────────────────────────────────────
  const consoleErrors = [], failedRequests = [];
  let browser;
  try {
    browser = await chromium.launch();
    // 1440x900: the tree is display:none below 1180px, so a narrower viewport
    // would prove only that the LIST renders. Both are checked, at the width
    // where each is the visible one.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('console', (c) => { if (c.type() === 'error') consoleErrors.push(c.text().slice(0, 300)); });
    page.on('requestfailed', (r) => failedRequests.push(`${r.url().slice(0, 160)} ${r.failure()?.errorText || ''}`));

    await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    m.pageLoaded = true;
    // The nav link is revealed by the tennis fetch, which runs in the boot
    // chain. Waiting on the LINK rather than a fixed sleep — a sleep that is
    // too short reports a working page as broken.
    await page.waitForTimeout(9000);
    m.navLinkVisible = await page.evaluate(() => {
      const l = document.getElementById('tennis-nav-link');
      return !!l && l.style.display !== 'none';
    });

    // Open the tab the way a reader does, then WAIT FOR CONTENT, not for a
    // clock.
    //
    // The fixed 12s wait here reported FAIL once with `0 tree card(s) and 0
    // list row(s)` and a sample of "Reading the draw…" — the page's own fetch
    // has a 20s timeout, so the probe was reading a render still in flight and
    // calling it an empty bracket. A probe that gives up before the thing it
    // measures has finished is measuring itself.
    //
    // 30s, which is beyond the client's own timeout, so a page that is going to
    // fail has failed by then and one that is going to render has rendered.
    await page.evaluate(() => { if (typeof window.toggleTennisView === 'function') window.toggleTennisView(); });
    const t0 = Date.now();
    try {
      await page.waitForFunction(() => {
        const h = document.getElementById('tennis-draw');
        if (!h) return false;
        // Either real content, or a settled message that is not the spinner.
        if (h.querySelector('.wct-match, .tdl-match')) return true;
        const loading = h.querySelector('.wct-loading');
        return !!loading && !/Reading the draw/.test(loading.textContent || '');
      }, { timeout: 30000 });
      m.renderWaitMs = Date.now() - t0;
    } catch (_) {
      m.renderWaitMs = Date.now() - t0;
      m.renderTimedOut = true;
    }

    const read = await page.evaluate(() => {
      const sec = document.getElementById('tennis-section');
      const host = document.getElementById('tennis-draw');
      return {
        sectionVisible: !!sec && !sec.hasAttribute('hidden'),
        treeMatchCards: host ? host.querySelectorAll('.tennis-draw-tree .wct-match').length : 0,
        listMatchRows: host ? host.querySelectorAll('.tennis-draw-list .tdl-match').length : 0,
        columnHeads: host ? [...host.querySelectorAll('.tennis-draw-tree .wct-col-head')]
                              .map((e) => e.textContent.trim()).filter(Boolean) : [],
        anomalyLineOnPage: host ? host.querySelectorAll('.tdt-anomaly').length > 0 : false,
        text: host ? host.textContent.slice(0, 2000) : '',
        meta: document.getElementById('tennis-draw-meta')?.textContent || '',
      };
    });
    m.sectionVisible = read.sectionVisible;
    m.treeMatchCards = read.treeMatchCards;
    m.listMatchRows = read.listMatchRows;
    m.columnHeads = read.columnHeads;
    m.anomalyLineOnPage = read.anomalyLineOnPage;
    m.championOnPage = m.relayChampion ? read.meta.includes(m.relayChampion) : null;
    m.sampleText = read.text.slice(0, 400);

    await page.screenshot({ path: `outbox/tennis-draw-probe-${stamp}.png`, fullPage: false });
  } catch (e) {
    m.pageLoaded = false;
    m.reason = `${m.reason ? m.reason + '; ' : ''}page: ${e.message}`;
  } finally {
    if (browser) await browser.close();
  }
  m.consoleErrors = consoleErrors.slice(0, 10);
  m.failedRequests = failedRequests.slice(0, 10);

  // ── 3. The verdict, from the COMPARISON ──────────────────────────────────
  if (m.relayReachable === false || m.pageLoaded === false) {
    m.verdict = 'UNKNOWN';
    m.reason = m.reason || 'relay or page unreachable — nothing was proven either way';
  } else if (!pick) {
    m.verdict = 'NO DRAW';
    m.reason = 'no Grand Slam or 1000-level singles draw is playing today, so there is nothing to prove';
  } else if (!draw) {
    m.verdict = 'FAIL';
    m.reason = `the relay would not assemble ${m.pickedTournament}: HTTP ${m.relayDrawStatus}`;
  } else {
    const want = draw.mainDrawMatches;
    // The LIST holds one row per main-draw match. The TREE holds one card per
    // match plus one for the final's centre slot, so it is compared to the
    // same number — a tree that dropped a round would be short by 2, 4 or more.
    const listOk = m.listMatchRows === want;
    const treeOk = m.treeMatchCards === want;
    const roundsOk = (draw.rounds || []).every((r) =>
      m.columnHeads.includes(r.round.replace('Round of ', 'R')
        .replace('Quarterfinals', 'QF').replace('Semifinals', 'SF')) || r.round === 'Final');
    const champOk = m.relayChampion == null || m.championOnPage === true;
    if (!m.sectionVisible) { m.verdict = 'FAIL'; m.reason = 'the Draw tab opened onto a hidden section'; }
    else if (m.renderTimedOut && m.treeMatchCards === 0 && m.listMatchRows === 0) {
      // Still spinning after 30s, with the relay answering in relayFetchMs. That
      // is a latency finding, not an empty bracket, and calling it FAIL would
      // point at the wrong layer.
      m.verdict = 'UNKNOWN';
      m.reason = `the page was still loading after ${m.renderWaitMs}ms;`
               + ` the relay answered in ${m.relayFetchMs}ms — a latency finding, not an empty draw`;
    }
    else if (!listOk || !treeOk) {
      m.verdict = 'FAIL';
      m.reason = `the relay shipped ${want} main-draw matches; the page drew`
               + ` ${m.treeMatchCards} tree card(s) and ${m.listMatchRows} list row(s)`;
    } else if (!roundsOk) {
      m.verdict = 'FAIL';
      m.reason = `a round the relay shipped has no column: relay ${JSON.stringify(m.relayRounds)},`
               + ` page ${JSON.stringify(m.columnHeads)}`;
    } else if (!champOk) {
      m.verdict = 'FAIL';
      m.reason = `the final is decided (${m.relayChampion}) and the page does not say so`;
    } else {
      m.verdict = 'PASS';
      m.reason = `${m.pickedTournament} ${m.pickedSeason}: ${want} matches drawn in`
               + ` ${(draw.rounds || []).length} round(s), ${m.relayEdges} edge(s) joined`;
    }
  }

  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/tennis-draw-probe-manifest-${stamp}.json`, JSON.stringify(m, null, 2));
  // A `-latest` copy, because the workflow's verdict step reads a fixed path.
  // Without it that step reads whatever file it can find and the verdict it
  // surfaces belongs to a different run.
  fs.writeFileSync('outbox/tennis-draw-probe-latest.json', JSON.stringify(m, null, 2));
  console.log(JSON.stringify(m, null, 2));
  console.log(`\nVERDICT: ${m.verdict} — ${m.reason}`);
  // NO DRAW and UNKNOWN exit 0: neither is a defect in the page, and failing
  // the workflow on them would train the reader to ignore a red run.
  process.exit(m.verdict === 'FAIL' ? 1 : 0);
})();
