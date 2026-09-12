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
  const m = {
    probed_at: new Date().toISOString(), url: URL,
    sw_version: null, cards_seen: 0,
    odds_slot_present_in_dom: false,
    slots_hidden: 0, slots_visible: 0,
    states: { no_odds: null, opened_only: null, unchanged: null, moved: null },
    visible_samples: [], error: null,
  };

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    // The odds line depends on debrief.oddsOutcome, which arrives with the
    // per-game context fetch, not with the first paint.
    await page.waitForTimeout(12000);

    const out = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-slot="odds"]'));
      const rows = cards.map(el => {
        const card = el.closest('[data-game-id],[data-id],article,.game-card') || el.parentElement;
        const id = (card && (card.getAttribute('data-game-id') || card.getAttribute('data-id'))) || null;
        const label = card ? (card.querySelector('[data-slot="home-name"]')?.textContent || '').trim() : '';
        const away = card ? (card.querySelector('[data-slot="away-name"]')?.textContent || '').trim() : '';
        return { id, label: away && label ? `${away} @ ${label}` : label,
                 hidden: el.hidden, text: (el.textContent || '').trim() };
      });
      return { rows, sw: window.SW_VERSION || null,
               cardCount: document.querySelectorAll('[data-slot="home-name"]').length };
    });

    m.sw_version = out.sw;
    m.cards_seen = out.cardCount;
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
  if (!m.odds_slot_present_in_dom) {
    console.error('FAIL — no [data-slot="odds"] in the DOM. The render path did not run.');
    process.exit(1);
  }
  console.log('\nPASS — the slot is in the live DOM; per-state observation is above.');
})();
