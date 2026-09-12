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
const { settleScan } = require('./scripts/slate-settle.cjs');

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
    // CC-CMD-2026-09-12-slate-size-variance. The same page read 129 cards and
    // then 45, 23 minutes apart, zero page errors on both. A total cannot say
    // WHICH section moved, and every reading so far has been a total taken at a
    // fixed wall-clock offset — an assumption about the page's timing that
    // nobody had measured.
    slate_settle_series_step0: [],
    slate_by_sport: null,          // section label -> card count, at the read
    slate_sections_present: null,  // every .sport-section's label, incl. empty ones
    slate_read_at_ms: null,        // performance.now() at the read, since navigation
    slate_settled_at_s: null,      // when three consecutive equal readings landed
    slate_settle_reached: false,   // false => the counts below are mid-cycle
    // `slate_cards` means "cards on whatever date the probe ended on". Six
    // manifests reading 0 were STEP_BACK_DAYS=1 runs describing Yesterday, and
    // read as a 90-minute site outage. The date travels with the number now.
    slate_cards_date_label: null,
    slate_cards_after_steps: null,
    empty_note: null,
    main_state: null, page_errors: [], page_error_count: 0,
    date_nav_check: null,
    context_game_requests: [], context_id_forms: {}, v2_games_requests: 0,
    v2_games_by_sport: null, v2_games_dates: null, espn_scores_by_sport: null,
    slate_state: null,   // window.__fieldSlateState(): allData shape + the injector's memo
    // null when the comparison could not be made at all, [] when model and DOM
    // agree. Not the same thing, never merged (Rule 99).
    sections_model_not_in_dom: null,
    // The app's OWN swallowed-failure store. page.on('pageerror') sees uncaught
    // throws and the init-script hook sees unhandled rejections; neither sees a
    // failure the app caught on purpose. injectV2SportSection wraps its whole
    // body in try/catch and reports through captureFieldError, so a section
    // that fails to inject leaves no trace in anything this probe read before
    // — which is the state measured at 20:05: cfb requested 12 times, the
    // relay serving a full live NCAAF slate, and no College Football section
    // for sixty seconds, with page_error_count 0.
    field_errors: null, field_error_count: null, field_errors_by_fn: null,
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
    //
    // This WAS a flat 12s wait. CC-CMD-2026-09-12-slate-size-variance: a fixed
    // offset reports whatever the page happened to hold at 12s and calls it the
    // slate. Sample instead, and stop on a criterion rather than a clock —
    // three consecutive equal non-zero readings. A run that never settles says
    // so in its own manifest (slate_settle_reached false) instead of reporting
    // a mid-cycle number as if it were final.
    const slateCensus = () => page.evaluate(() => {
      const by = {};
      document.querySelectorAll('.game-card[data-gameid]').forEach(c => {
        const k = c.getAttribute('data-sport') || '(no data-sport)';
        by[k] = (by[k] || 0) + 1;
      });
      // A section present with zero cards and a section absent are different
      // states (Rule 99). The totals alone cannot tell them apart.
      const sections = Array.from(document.querySelectorAll('.sport-section'))
        .map(el => el.getAttribute('data-sport') || '(no data-sport)');
      return { total: document.querySelectorAll('.game-card[data-gameid]').length,
               by_sport: by, sections,
               since_nav_ms: Math.round(performance.now()) };
    });

    const SETTLE_MAX_S = Number(process.env.SLATE_SETTLE_MAX_S || 60);
    // Three equal samples can land at 15s, which is not evidence that a section
    // injected at 40s is absent — it is evidence that nobody looked at 40s. The
    // floor makes the observation window explicit instead of a side effect of
    // how fast the criterion happened to converge. Default 0 (criterion alone);
    // set it to sweep the full window when the question is "does X ever arrive".
    const SETTLE_MIN_S = Number(process.env.SLATE_SETTLE_MIN_S || 0);
    {
      let census = null;
      const totals = [];
      for (let t = 5; t <= SETTLE_MAX_S; t += 5) {
        await page.waitForTimeout(5000);
        census = await slateCensus();
        totals.push(census.total);
        m.slate_settle_series_step0.push({
          at_s: t, total: census.total, since_nav_ms: census.since_nav_ms,
          by_sport: census.by_sport });
        // settleScan lives in its own module and is enumerated in
        // scripts/check-slate-settle.mjs. Deciding settledness inline here as
        // well would be a second definition of the same rule, which is the
        // drift that put three enabled sports through a no-label branch earlier
        // today. One definition, two callers.
        const sc = settleScan(totals);
        if (sc.reached && m.slate_settled_at_s === null) {
          // Record WHEN it settled even if the floor keeps sampling past it.
          m.slate_settled_at_s = t; m.slate_settle_reached = true;
        }
        if (m.slate_settle_reached && t >= SETTLE_MIN_S) break;
      }
      m.slate_by_sport = census ? census.by_sport : null;
      m.slate_sections_present = census ? census.sections : null;
      m.slate_read_at_ms = census ? census.since_nav_ms : null;
    }

    // The debrief only renders for games isGameOver() calls final, so a slate
    // with nothing finished reads a zero identical to a broken render path.
    // Step back a FIXED number of days rather than hunting: run 34697310538
    // hunted, overshot to Thu Sep 10, and landed on a date the client rendered
    // no slate for at all — which is a third reality the hunt cannot report.
    // (That same date renders 14 cards as of run 34713228042 / SW 2026-09-12l;
    // past dates now come from the relay. The fixed step stays anyway: the
    // hunt's inability to REPORT which reality it found is the reason, not the
    // particular date it landed on.)
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
    m.slate_cards_date_label = m.date_label;
    m.slate_cards_after_steps = m.stepped_back_days;
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
    // CC-CMD-2026-09-12-slate-size-variance. A total request count cannot say
    // whether a MISSING section was never asked for or was asked for and
    // dropped. 246 requests and no College Football section is two different
    // defects depending on which. Count by sport key AND by date, because
    // fieldDatesToQuery sends two dates per cycle and a section could be
    // missing for only one of them.
    // The decisive census for CC-CMD-2026-09-12-slate-size-variance: the client
    // requested cfb 12 times and got HTTP 200 every time, yet rendered no
    // College Football section. injectV2SportSection returns early when
    // espnScores holds no entry with that _sport, so whether the entries EXIST
    // separates "the poll dropped them" from "the injector dropped them" —
    // two different defects that the DOM alone cannot tell apart.
    // Task 0 of CC-CMD-2026-09-12-v2-sections-never-injected. A function, not a
    // property read: allData is reassigned five times in field.js, so a value
    // captured at boot would be a different object than the one the injector
    // pushes into. null here means the app never defined it (an old build);
    // slate_state.allData null means the app HAS no allData. Two different
    // absences, neither collapsed into the other.
    m.slate_state = await page.evaluate(
      () => (typeof window.__fieldSlateState === 'function' ? window.__fieldSlateState() : null));

    m.espn_scores_by_sport = await page.evaluate(() => {
      const es = window.espnScores;
      if (!es) return null;   // null, not {} — absent and empty are different
      const by = {};
      for (const k of Object.keys(es)) {
        const sp = es[k] && es[k]._sport ? es[k]._sport : '(no _sport)';
        by[sp] = (by[sp] || 0) + 1;
      }
      return by;
    });

    const _fe = await page.evaluate(() => (window._fieldErrors || []).map(
      e => ({ fn: e.fn, err: String(e.err || '').slice(0, 200), ts: e.ts })));
    m.field_error_count = _fe.length;
    m.field_errors_by_fn = {};
    for (const e of _fe) m.field_errors_by_fn[e.fn] = (m.field_errors_by_fn[e.fn] || 0) + 1;
    // The whole list would dwarf the manifest on a bad run; the per-fn census is
    // the index and these are the samples.
    m.field_errors = _fe.slice(0, 40);

    m.v2_games_by_sport = {};
    m.v2_games_dates = {};
    for (const u of _v2Reqs) {
      const sp = (u.match(/[?&]sport=([^&]+)/) || [])[1] || '(none)';
      const dt = (u.match(/[?&]date=([^&]+)/) || [])[1] || '(none)';
      m.v2_games_by_sport[sp] = (m.v2_games_by_sport[sp] || 0) + 1;
      m.v2_games_dates[dt] = (m.v2_games_dates[dt] || 0) + 1;
    }
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
    // Measured 2026-09-12 BEFORE the fix: neither — 0 cards, 0 empty-notes,
    // 1 .loading-wrap, stable across twelve samples over sixty seconds. After
    // 5f171c06 the message appeared and was FALSE ('no-events' against 24
    // archive rows). After e721452d, run 34713228042 / SW 2026-09-12l reads
    // 14 cards and failure_kind null on Thu Sep 10.
    // NOTE this click COMPOSES with STEP_BACK_DAYS — it always steps one more
    // day back from wherever the slate already is. With STEP_BACK_DAYS=1 this
    // check therefore reads TWO days back, which is why its label and
    // slate_by_step's last entry name different dates.
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

      // A message is not automatically true. "No major events on Yesterday"
      // appeared the moment 5f171c06 stopped the renderer discarding it — and
      // 2026-09-11 had 42 rows across 9 sports in the relay census and 15
      // completed MLB games. Rule 1 of this repo is DO NOT INVENT, so the check
      // that reads the claim must not take it at face value.
      if (nav.failure_kind === 'no-events') {
        const d = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        try {
          const r = await fetch(
            `https://field-relay-nba.jeffunglesbee.workers.dev/context/date/${d}`,
            { signal: AbortSignal.timeout(25000) });
          const j = await r.json();
          const rows = (j?.games?.regular?.length || 0) + (j?.games?.postseason?.length || 0);
          nav.archive_rows_for_claimed_empty_date = rows;
          nav.archive_date_checked = d;
          // Task 0/1 of CC-CMD-2026-09-12-no-events-is-false. goToDate reaches
          // its !sections.length branch, so the sweep handed it []. Two very
          // different causes produce that and need different fixes:
          // every league returned zero events, or every league FAILED (the
          // per-league try swallows each one into a counter). Ask ESPN the same
          // question the client asks, from the same browser, and report the
          // status and the event count rather than reasoning about it.
          const espn = await page.evaluate(async (ds) => {
            const u = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${ds}&limit=50`;
            try {
              const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
              if (!r.ok) return { status: r.status, events: null };
              const j = await r.json();
              return { status: r.status, events: (j.events || []).length };
            } catch (e) { return { status: null, error: String(e.message || e).slice(0, 120) }; }
          }, d.replace(/-/g, ''));
          nav.espn_mlb_probe = espn;
          if (rows > 0) {
            nav.ok = false;
            nav.no_events_is_false = true;
          }
        } catch (e) {
          // Unreachable relay is not evidence either way; say so, do not guess.
          nav.archive_rows_for_claimed_empty_date = null;
          nav.archive_check_error = String(e.message || e).split('\n')[0];
        }
      }
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
  console.log(`slate cards ${m.slate_cards} on ${m.slate_cards_date_label} `
            + `(after ${m.slate_cards_after_steps} step(s) back), `
            + `debrief-injected ${m.debrief_injected}, `
            + `debrief visible ${m.debrief_visible}, existing .debrief-odds layers ${m.existing_odds_layers}`);

  // CC-CMD-2026-09-12-slate-size-variance Task 2: say WHICH cycle was read, in
  // the same breath as the number. A count whose settle state is invisible is a
  // count every reader will take as final — the 129-then-45 pair was read that
  // way for hours.
  if (m.slate_settle_reached) {
    console.log(`slate settled at ${m.slate_settled_at_s}s `
              + `(${m.slate_read_at_ms}ms since navigation), three equal readings; `
              + `series ${JSON.stringify(m.slate_settle_series_step0.map(x => x.total))}`);
  } else {
    console.log(`slate NEVER SETTLED within ${process.env.SLATE_SETTLE_MAX_S || 60}s — `
              + `the counts above are MID-CYCLE, not final; `
              + `series ${JSON.stringify(m.slate_settle_series_step0.map(x => x.total))}`);
  }
  console.log(`slate sampled to ${m.slate_settle_series_step0.length * 5}s `
            + `(floor ${process.env.SLATE_SETTLE_MIN_S || 0}s, cap ${process.env.SLATE_SETTLE_MAX_S || 60}s)`);
  console.log(`slate by sport: ${JSON.stringify(m.slate_by_sport)}`);
  console.log(`window._fieldErrors: ${m.field_error_count} captured, by fn `
            + `${JSON.stringify(m.field_errors_by_fn)}`);
  console.log(`espnScores by _sport: ${JSON.stringify(m.espn_scores_by_sport)}`);
  console.log(`allData shape: ${JSON.stringify(m.slate_state && m.slate_state.allData)}`);
  console.log(`_v2SectionInjected: ${JSON.stringify(m.slate_state && m.slate_state.v2SectionInjected)}`);
  console.log(`/v2/games asked for: ${JSON.stringify(m.v2_games_by_sport)}`);
  console.log(`/v2/games dates: ${JSON.stringify(m.v2_games_dates)}`);
  {
    // Asked for and not rendered is a different defect from never asked for.
    const rendered = new Set(Object.keys(m.slate_by_sport || {}));
    const asked = Object.keys(m.v2_games_by_sport || {});
    console.log(`sport keys REQUESTED but contributing no section: `
              + `${JSON.stringify(asked.filter(k => !rendered.has(k)))} `
              + `(a key maps to a section LABEL, so this list is not a defect by itself — `
              + `it is the set to check against V2_SECTION_LABEL)`);
  }
  {
    const withCards = new Set(Object.keys(m.slate_by_sport || {}));
    const empty = (m.slate_sections_present || []).filter(x => !withCards.has(x));
    console.log(`sections rendered with ZERO cards: ${empty.length ? JSON.stringify(empty) : '(none)'}`);
  }

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

  // AUTOMATED FOLLOW-UP for CC-CMD-2026-09-12-v2-sections-never-injected.
  //
  // The model and the DOM must agree on which sections exist. Measured
  // 2026-09-12 against SW 2026-09-12o: allData.sports held FIFTEEN sections —
  // College Football, NFL, MLS Soccer, Premier League, La Liga, Serie A,
  // Ligue 1 and all three EFL tiers among them — _v2SectionInjected reported
  // all ten as true, no v2-section-inject error of any kind fired, and the page
  // rendered FIVE. Ten sections live in the model and never reach the page.
  //
  // Nothing else in this probe can see that. The DOM census alone reads a
  // short slate, which is indistinguishable from a quiet sports day; the
  // injector's own memo reads success. Only the two together say otherwise.
  {
    const model = (m.slate_state && m.slate_state.allData && m.slate_state.allData.sportsLabels) || null;
    const dom = m.slate_sections_present || null;
    if (model === null || dom === null) {
      // Not a pass and not a failure — the comparison could not be made. Say
      // which half was missing rather than letting an absent input read green.
      console.log(`model-vs-DOM section check NOT RUN: `
                + `${model === null ? 'no allData.sportsLabels' : ''}`
                + `${model === null && dom === null ? ' and ' : ''}`
                + `${dom === null ? 'no slate_sections_present' : ''}`);
      m.sections_model_not_in_dom = null;
    } else {
      const inDom = new Set(dom);
      m.sections_model_not_in_dom = model.filter(x => !inDom.has(x));
      console.log(`sections in allData.sports but NOT in the DOM `
                + `(${m.sections_model_not_in_dom.length} of ${model.length}): `
                + `${JSON.stringify(m.sections_model_not_in_dom)}`);
      if (m.sections_model_not_in_dom.length) {
        failed++;
        console.error(`FAIL — ${m.sections_model_not_in_dom.length} section(s) are in the model and not on `
                    + `the page. injectV2SportSection pushed them and nothing rendered them.`);
      }
    }
  }

  // Stepping back a day must land on something a reader can act on.
  const nav = m.date_nav_check;
  if (!nav || !nav.ok) {
    failed++;
    console.error(`FAIL — date-nav: ${JSON.stringify(nav)}`);
    for (const r of (nav && nav.rejections) || []) console.error(`  unhandled rejection: ${r}`);
    if (nav && nav.no_events_is_false) {
      console.error(`  "no-events" claimed for ${nav.archive_date_checked}, but the relay archive`);
      console.error(`  holds ${nav.archive_rows_for_claimed_empty_date} row(s) for that date. The message is false.`);
      if (nav.espn_mlb_probe) {
        const e = nav.espn_mlb_probe;
        console.error(`  ESPN mlb scoreboard for that date: HTTP ${e.status}, events ${e.events}`
                    + (e.error ? ` (${e.error})` : ''));
        console.error(e.events > 0
          ? '  ESPN HAS the games — the sweep discarded them, this is not an empty day.'
          : '  ESPN returned none either — the false claim starts upstream of the client.');
      }
      console.error('  CC-CMD-2026-09-12-no-events-is-false.');
    } else if (nav && nav.failure_kind === 'render-incomplete') {
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
