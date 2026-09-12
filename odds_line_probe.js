#!/usr/bin/env node
// TASK 3 of CC-CMD-2026-09-11-client-odds-story — live verification.
//
// Structural smoke asserts the odds slot's TEXT exists in index.html. That is
// exactly what failed to catch 327678bc, where six green assertions inspected a
// call inside updateCard — a STAGED function with no caller. The text was there
// and the code never ran.
//
// So this drives a real browser against the LIVE deployment and reads the DOM,
// per jubilant-bassoon CLAUDE.md Rule 90's CI-as-proxy Playwright pattern.
//
// It reports per-card booleans and a named game id per observed state. It does
// NOT infer: a state absent on the day of the run is reported absent, with the
// count that made it absent.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const URL = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  // WHICH id the client actually sends is observable from outside the page —
  // `allData` is module-scoped inside the esbuild bundle and is not on window,
  // so the propagation state cannot be read directly. The request URL is the
  // same fact at the boundary: /context/game/espn:401816899 means _gameId
  // reached the card, /context/game/g19 means it did not.
  const _ctxReqs = [];
  const _v2Reqs  = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/context/game/')) _ctxReqs.push(u);
    else if (u.includes('/v2/games')) _v2Reqs.push(u);
  });
  const m = {
    probed_at: new Date().toISOString(), url: URL,
    sw_version: null, cards_seen: 0,
    odds_slot_present_in_dom: false,
    slots_hidden: 0, slots_visible: 0,
    states: { no_odds: null, opened_only: null, unchanged: null, moved: null },
    date_label: null, stepped_back_days: 0,
    setup_overlay_dismissed: false, date_nav_error: null,
    slate_by_step: [],
    slate_settle_series: [],
    empty_note: null,
    context_game_requests: [], context_id_forms: {}, v2_games_requests: 0,
    visible_samples: [], error: null,
  };

  const dateLabel = () => page.evaluate(
    () => { const el = document.getElementById('date-label'); return el ? el.textContent.trim() : null; });

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

    // A fresh browser profile gets the My Services setup modal. It is
    // aria-modal and intercepts every pointer event: run 34697166194 spent
    // thirty seconds retrying #date-prev against it, threw, and committed no
    // manifest at all. Dismiss it the way a first-time user does.
    const _skip = page.locator('#setup-skip');
    if (await _skip.isVisible().catch(() => false)) {
      await _skip.click().catch(() => {});
      m.setup_overlay_dismissed = true;
    }
    // The odds line depends on debrief.oddsOutcome, which arrives with the
    // per-game context fetch, not with the first paint.
    await page.waitForTimeout(12000);

    // The debrief only renders for games isGameOver() calls final, so a slate
    // with nothing finished reads a zero identical to a broken render path.
    // Step back a FIXED number of days rather than hunting: run 34697310538
    // hunted, overshot to Thu Sep 10, and landed on a date the client renders
    // no slate for at all — which is a third reality the hunt cannot report.
    // One deterministic step, a settle long enough for the date's fixtures to
    // fetch and injectDebriefCards to run, and the slate size recorded at each
    // stop so an empty date is legible rather than indistinguishable.
    const STEP_BACK = Number(process.env.STEP_BACK_DAYS ?? 1);
    const slateNow = () => page.evaluate(
      () => document.querySelectorAll('.game-card[data-gameid]').length);
    m.slate_by_step.push({ step: 0, label: await dateLabel(), cards: await slateNow() });
    for (let i = 0; i < STEP_BACK; i++) {
      try {
        await page.click('#date-prev', { timeout: 8000 });
        m.stepped_back_days++;
        // Sample rather than pick a timeout. A single 25s read cannot separate
        // "this date renders nothing" from "this date renders slowly", and run
        // 34697542148 reported 0 cards on Yesterday without saying which.
        // buildDateSchedule returns null for an unknown date and triggers a
        // fixture fetch across ~12 leagues, so the series is the answer.
        const series = [];
        for (let t = 5; t <= 60; t += 5) {
          await page.waitForTimeout(5000);
          const n = await slateNow();
          series.push({ at_s: t, cards: n });
          if (n > 0 && t >= 20) break;   // rendered, and settled past the debrief inject
        }
        m.slate_settle_series.push({ step: m.stepped_back_days, label: await dateLabel(), series });
        m.slate_by_step.push({ step: m.stepped_back_days, label: await dateLabel(),
                               cards: await slateNow() });
      } catch (navErr) { m.date_nav_error = String(navErr.message || navErr).split('\n')[0]; break; }
    }
    m.date_label = await dateLabel();
    // Zero cards is THREE realities, not one: goToDate renders "No major events
    // on <date>", "Today's AI schedule lookups are used up", or "Couldn't load
    // <date>'s schedule" — all as .empty-note, none as .game-card. Reading the
    // count alone repeats the collapse this whole CC-CMD is about.
    m.empty_note = await page.evaluate(() => {
      const el = document.querySelector('.empty-note');
      return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 240) : null;
    });

    const out = await page.evaluate(() => {
      // The main slate is innerHTML-built `.game-card[data-gameid]`; the
      // data-slot template is a Phase-2/3 path. Counting only slot-template
      // cards reported cards_seen: 0 and could not distinguish "no games",
      // "wrong selector" and "not rendered yet" — one number, three realities.
      // The layer is now .debrief-odds-movement, injected by buildDebrief inside
      // .card-debrief. The old [data-slot="odds"] markup was removed with the
      // dead renderCard wiring — querying it would report a permanent zero.
      const cards = Array.from(document.querySelectorAll('.debrief-odds-movement'));
      const rows = cards.map(el => {
        const card = el.closest('.game-card[data-gameid]');
        const id = card ? card.getAttribute('data-gameid') : null;
        const home = card ? (card.getAttribute('data-home') || '') : '';
        const away = card ? (card.getAttribute('data-away') || '') : '';
        return { id, label: away && home ? `${away} @ ${home}` : (id || ''),
                 hidden: el.hidden, text: (el.textContent || '').trim() };
      });
      return { rows, sw: window.SW_VERSION || null,
               cardCount: document.querySelectorAll('[data-slot="home-name"]').length,
               slateCards: document.querySelectorAll('.game-card[data-gameid]').length,
               debriefInjected: document.querySelectorAll('.game-card[data-debrief-injected]').length,
               debriefVisible: Array.from(document.querySelectorAll('.card-debrief'))
                                    .filter(el => !el.hidden && (el.textContent || '').trim()).length,
               // WHICH games got a debrief. Without this the DOM result and the
               // /context/game result cannot be joined, and "0 odds layers" stays
               // ambiguous between "these games have no odds" and "the layer is
               // broken" — the counts alone cannot separate them.
               debriefCards: Array.from(document.querySelectorAll('.card-debrief'))
                 .filter(el => !el.hidden && (el.textContent || '').trim())
                 .map(el => {
                   const c = el.closest('.game-card[data-gameid]');
                   return { gameid: c ? c.getAttribute('data-gameid') : null,
                            sport: c ? c.getAttribute('data-sport') : null,
                            home: c ? c.getAttribute('data-home') : null,
                            away: c ? c.getAttribute('data-away') : null,
                            layers: Array.from(el.querySelectorAll('[class^="debrief-"]'))
                                         .map(x => x.className) };
                 }),
               oddsLayers: document.querySelectorAll('.debrief-odds').length };
    });

    m.sw_version = out.sw;
    m.cards_seen = out.cardCount;
    // Each of these separates a reality the single count collapsed.
    m.slate_cards = out.slateCards;
    m.debrief_injected = out.debriefInjected;
    m.debrief_visible = out.debriefVisible;
    m.existing_odds_layers = out.oddsLayers;
    m.debrief_cards = out.debriefCards;
    m.context_game_requests = Array.from(new Set(_ctxReqs)).slice(0, 40);
    m.v2_games_requests = _v2Reqs.length;
    // Three named forms plus 'other' — a bare count would collapse exactly the
    // distinction being measured.
    const formOf = (u) => {
      const id = decodeURIComponent(u.split('/context/game/')[1] || '').split('?')[0];
      if (/^espn:/.test(id)) return 'espn_prefixed';
      if (/^[A-Z]{2,5}_/.test(id)) return 'archive_composite';
      if (/^g\d+$/.test(id)) return 'bare_slate_id';
      return 'other';
    };
    m.context_id_forms = _ctxReqs.reduce((acc, u) => {
      const f = formOf(u); acc[f] = (acc[f] || 0) + 1; return acc;
    }, {});
    m.odds_layer_present_in_dom = out.rows.length > 0;
    m.odds_slot_present_in_dom = out.rows.length > 0;
    m.slots_hidden  = out.rows.filter(r => r.hidden || !r.text).length;
    m.slots_visible = out.rows.filter(r => !r.hidden && r.text).length;

    // Name a real game id per state, or leave null. Never infer.
    const pick = (pred) => {
      const hit = out.rows.find(pred);
      return hit ? { game: hit.id || hit.label || '(unidentified card)', text: hit.text } : null;
    };
    m.states.no_odds     = pick(r => r.hidden || !r.text);
    m.states.opened_only = pick(r => !r.hidden && /^Home line opened /.test(r.text));
    m.states.unchanged   = pick(r => !r.hidden && /unchanged from open$/.test(r.text));
    m.states.moved       = pick(r => !r.hidden && / pts toward (home|away)$/.test(r.text));
    m.visible_samples = out.rows.filter(r => !r.hidden && r.text).slice(0, 8);

    await page.screenshot({ path: `outbox/odds-line-probe-${stamp}.png`, fullPage: false });
  } catch (e) { m.error = String(e.message || e); }

  await browser.close();
  fs.writeFileSync(`outbox/odds-line-probe-manifest-${stamp}.json`, JSON.stringify(m, null, 2) + '\n');
  console.log(JSON.stringify(m, null, 2));

  const observed = Object.entries(m.states).filter(([, v]) => v).map(([k]) => k);
  const absent   = Object.entries(m.states).filter(([, v]) => !v).map(([k]) => k);
  console.log(`\nobserved ${observed.length} of 4 states: ${observed.join(', ') || '(none)'}`);
  if (absent.length) console.log(`NOT OBSERVABLE on this run: ${absent.join(', ')} — reported absent, not inferred working`);
  console.log(`cards ${m.cards_seen}, odds slots ${m.slots_hidden + m.slots_visible} (${m.slots_hidden} hidden, ${m.slots_visible} visible)`);

  // The slot must EXIST. Whether a given state occurs today is data, not a bug;
  // the slot being absent from every card means the render path never ran, which
  // is the failure this probe exists for.
  if (m.error) { console.error(`PROBE ERROR: ${m.error}`); process.exit(1); }
  if (m.empty_note) console.log(`empty-note on this date: "${m.empty_note}"`);
  console.log(`date read: ${m.date_label} (stepped back ${m.stepped_back_days} day(s)), `
            + `/v2/games requests ${m.v2_games_requests}`);
  console.log(`/context/game id forms: ${JSON.stringify(m.context_id_forms)}`);
  console.log(`slate cards ${m.slate_cards}, debrief-injected ${m.debrief_injected}, `
            + `debrief visible ${m.debrief_visible}, existing .debrief-odds layers ${m.existing_odds_layers}`);

  // MEASURED 2026-09-12: the odds slot lives in renderCard's template, and
  // renderCard has exactly two callers, both in the NightOwl path. The main
  // slate is a different builder, and the odds DATA only reaches
  // injectDebriefCards, which is gated on isGameOver(). So a zero here is
  // expected until the movement line moves into buildDebrief's layer stack —
  // tracked by CC-CMD-2026-09-12-odds-line-wrong-render-path.
  if (!m.slate_cards) {
    console.error('FAIL — no .game-card[data-gameid] at all. The page rendered no slate.');
    process.exit(1);
  }
  console.log('\nPASS — the slot is in the live DOM; per-state observation is above.');
})();
