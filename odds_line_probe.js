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
  // An uncaught throw inside goToDate would leave main holding whatever it wrote
  // last and no branch would ever render. Playwright sees it; the DOM does not.
  // A bare message cannot say WHERE or WHEN. "MY_TEAMS is not defined" appeared
  // in run 34701718817 and could equally be a boot-time throw that truncated the
  // slate (16 cards where 90 minutes earlier there were 44) or a date-change
  // throw that stranded the spinner. The stack names the function; the phase
  // says which side of the date click it landed on.
  const _pageErrors = [];
  let _phase = 'boot';
  page.on('pageerror', e => _pageErrors.push({
    phase: _phase,
    message: String(e.message || e).slice(0, 160),
    stack: String(e.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 400),
  }));

  const _ctxReqs = [];
  const _v2Reqs  = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/context/game/')) _ctxReqs.push(u);
    else if (u.includes('/v2/games')) _v2Reqs.push(u);
  });
  const m = {
    probed_at: new Date().toISOString(), url: URL,
    // Which trigger produced this run. The 16:10 UTC cron added on 2026-09-12
    // did not fire on its first slot — every run that day was a
    // workflow_dispatch — and nothing in the artifacts said so. A committed
    // manifest that records its own trigger answers "are the scheduled runs
    // actually happening" without anyone having to go and look.
    triggered_by: process.env.PROBE_TRIGGER || '(unset)',
    sw_version: null, cards_seen: 0,
    odds_slot_present_in_dom: false,
    slots_hidden: 0, slots_visible: 0,
    states: { no_odds: null, opened_only: null, unchanged: null, moved: null },
    date_label: null, stepped_back_days: 0,
    setup_overlay_dismissed: false, date_nav_error: null,
    slate_by_step: [],
    slate_settle_series: [],
    empty_note: null,
    main_state: null, page_errors: [], page_error_count: 0,
    date_nav_check: null,
    context_game_requests: [], context_id_forms: {}, v2_games_requests: 0,
    visible_samples: [], error: null,
  };

  // page.on('pageerror') does NOT fire for an unhandled promise rejection, and
  // goToDate is an async function called from a click handler with no .catch().
  // A throw anywhere after it writes the spinner would therefore leave the
  // spinner up, produce no pageerror, and be invisible to every reading taken
  // so far — which is exactly the state measured: main holds
  // [#field-newspaper, div.loading-wrap], zero [data-lcp-anchor] anywhere (so
  // the morph hypothesis is dead), zero page errors.
  await page.addInitScript(() => {
    window.__probeRejections = [];
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      window.__probeRejections.push(
        String((r && (r.stack || r.message)) || r).slice(0, 300));
    });
  });

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
    const STEP_BACK = Number(process.env.STEP_BACK_DAYS || 0);
    const slateNow = () => page.evaluate(
      () => document.querySelectorAll('.game-card[data-gameid]').length);
    m.slate_by_step.push({ step: 0, label: await dateLabel(), cards: await slateNow() });
    for (let i = 0; i < STEP_BACK; i++) {
      try {
        _phase = 'after-date-click';
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
    // Task 0 of CC-CMD-2026-09-12-past-date-slate-renders-nothing. Zero cards
    // AND a null empty-note is none of goToDate's three known branches, so the
    // count and the note between them still cannot say what the page IS. Read
    // what main actually holds. goToDate's unknown-date path writes a
    // .loading-wrap spinner BEFORE awaiting fetchESPNFixturesForDate, and a
    // spinner that never resolves is neither a card nor a message.
    if (!out.slateCards) {
      m.main_state = await page.evaluate(() => {
        const main = document.getElementById('main');
        return {
          exists: !!main,
          loading_wraps: document.querySelectorAll('.loading-wrap').length,
          empty_notes: document.querySelectorAll('.empty-note').length,
          game_cards: document.querySelectorAll('.game-card').length,
          child_count: main ? main.children.length : null,
          html_head: main ? main.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 800) : null,
        };
      });
    }

    // Deduplicate on phase+message; the same throw can fire once per render pass.
    const _seen = new Set();
    m.page_errors = _pageErrors.filter(e => {
      const k = `${e.phase}|${e.message}`;
      if (_seen.has(k)) return false;
      _seen.add(k); return true;
    }).slice(0, 10);
    m.page_error_count = _pageErrors.length;
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

    // AUTOMATED FOLLOW-UP for CC-CMD-2026-09-12-past-date-slate-renders-nothing.
    // Runs on every invocation regardless of STEP_BACK_DAYS, so both scheduled
    // windows check it. Stepping back one day must land on SOMETHING a reader
    // can act on: cards, or one of goToDate's three .empty-note messages.
    // Measured 2026-09-12: neither — 0 cards, 0 empty-notes, 1 .loading-wrap,
    // stable across twelve samples over sixty seconds.
    try {
      _phase = 'date-nav-check';
      await page.click('#date-prev', { timeout: 8000 });
      // 30s, not 20s: the two awaits inside goToDate are bounded at 8s (per
      // ESPN league, in parallel) and 15s (the AI fallback), so a 20s read can
      // catch a legitimately-still-running load and call it a dead page.
      await page.waitForTimeout(30000);
      const nav = await page.evaluate(() => {
        const note = document.querySelector('.empty-note');
        const el = document.getElementById('date-label');
        const main = document.getElementById('main');
        // applyMainHTML documents its own failure mode in a comment: with an
        // active [data-lcp-anchor], the morph MOVES the anchor out of main into
        // tmp, and "a true no-op pass with an active anchor left `main` with
        // zero game cards after the successful skip". That is this symptom
        // exactly, so name the children and say where the anchor now lives
        // rather than inferring which of us is right.
        return {
          label: el ? el.textContent.trim() : null,
          cards: document.querySelectorAll('.game-card[data-gameid]').length,
          empty_note: note ? note.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null,
          loading_wraps: document.querySelectorAll('.loading-wrap').length,
          loading_wrap_in_main: main ? main.querySelectorAll('.loading-wrap').length : null,
          main_children: main ? Array.from(main.children).map(
            c => `${c.tagName.toLowerCase()}${c.id ? '#' + c.id : ''}${
              c.className ? '.' + String(c.className).trim().split(/\s+/).slice(0, 3).join('.') : ''}`) : null,
          lcp_anchor_anywhere: document.querySelectorAll('[data-lcp-anchor]').length,
          lcp_anchor_in_main: main ? main.querySelectorAll('[data-lcp-anchor]').length : null,
          rejections: (window.__probeRejections || []).slice(0, 5),
          failure_kind: note ? (note.getAttribute('data-failure') || '(unmarked)') : null,
        };
      });
      // A message is not automatically a pass. 'render-incomplete' means
      // sections resolved and the render did not happen — the open defect,
      // now legible instead of blank, but still open. Treating it as a pass
      // because a message appeared would silence the follow-up the moment the
      // symptom was papered over.
      nav.ok = nav.cards > 0 ||
        (nav.failure_kind !== null && nav.failure_kind !== 'render-incomplete');
      m.date_nav_check = nav;
    } catch (e) { m.date_nav_check = { error: String(e.message || e).split('\n')[0], ok: false }; }

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
  if (m.main_state) console.log(`main on an empty slate: ${JSON.stringify(m.main_state).slice(0, 700)}`);
  if (m.page_errors.length) console.log(`page errors: ${JSON.stringify(m.page_errors)}`);
  if (m.empty_note) console.log(`empty-note on this date: "${m.empty_note}"`);
  console.log(`triggered by: ${m.triggered_by}`);
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

  // Two automated follow-ups. Both are conditions that were live and unnoticed
  // on 2026-09-12 precisely because nothing asserted them.
  let failed = 0;

  // An uncaught throw is never acceptable and is never visible from the DOM.
  // isFeaturedTierGame threw twelve times at boot, truncating the slate to 16
  // cards where the same page rendered 44, and every DOM-shaped check passed.
  if (m.page_error_count > 0) {
    failed++;
    console.error(`FAIL — ${m.page_error_count} uncaught page error(s):`);
    for (const e of m.page_errors) console.error(`  [${e.phase}] ${e.message}\n      ${e.stack}`);
  }

  // Stepping back a day must land on something a reader can act on.
  const nav = m.date_nav_check;
  if (!nav || !nav.ok) {
    failed++;
    console.error(`FAIL — date-nav: ${JSON.stringify(nav)}`);
    for (const r of (nav && nav.rejections) || []) console.error(`  unhandled rejection: ${r}`);
    if (nav && nav.failure_kind === 'render-incomplete') {
      console.error('  render-incomplete: sections resolved, renderAll() left the spinner up.');
      console.error('  The page is legible now (message + Retry) but the cause is still unnamed —');
      console.error('  CC-CMD-2026-09-12-past-date-slate-renders-nothing stays OPEN.');
    } else {
      console.error('  A past date must render cards OR a marked .empty-note.');
      console.error('  Neither is CC-CMD-2026-09-12-past-date-slate-renders-nothing.');
    }
  } else {
    console.log(`date-nav OK — ${nav.label}: ${nav.cards} card(s)`
              + (nav.empty_note ? `, note "${nav.empty_note.slice(0, 60)}"` : ''));
  }

  if (failed) process.exit(1);
  console.log('\nPASS — the slot is in the live DOM; per-state observation is above.');
})();
