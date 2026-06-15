#!/usr/bin/env node
// tests/desktop-safari-viewport.js — Desktop Safari Viewport Audit (WebDriverIO + safaridriver)
//
// Tests at D1 (1366x768) and D3 (1920x1080). Real Safari/WebKit coverage of
// the A612 desktop-layout invariants. Requires macOS — safaridriver is
// built-in (run `sudo safaridriver --enable` once on the host).
//
// ENV: DEVICE_ID (D1 or D3)
//
// Usage: DEVICE_ID=D1 node tests/desktop-safari-viewport.js
// Output: JSON to stdout, status logs to stderr.

const { remote } = require('webdriverio');

const LIVE_URL = 'https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt';

const DEVICE_ID = process.env.DEVICE_ID || 'D1';
const VIEWPORTS = {
  D1: { width: 1366, height: 768,  label: 'Laptop ESSENTIALS' },
  D3: { width: 1920, height: 1080, label: 'Desktop ESSENTIALS' },
};
const VP = VIEWPORTS[DEVICE_ID] || VIEWPORTS.D1;

// ── Universal assertions ──────────────────────────────────────────────────────
// Safari does NOT expose chromedriver-style browser logs — we only check the
// FIELD-side error catcher.
const UNIVERSAL = [
  {
    id: '#1', name: 'no uncaught JS errors',
    fn: async (browser) => {
      const fieldErrors = await browser.execute(() => window._fieldErrors || []);
      return { pass: fieldErrors.length === 0, actual: fieldErrors.length === 0 ? 'clean' : fieldErrors };
    }
  },
  {
    id: '#2', name: 'game-card visible',
    fn: async (browser) => {
      const count = await browser.execute(() => document.querySelectorAll('.game-card').length);
      return { pass: count > 0, actual: count };
    }
  },
  {
    id: '#3', name: 'sport filters render and are visible',
    fn: async (browser) => {
      const result = await browser.execute(() => {
        const bar = document.querySelector('#sport-filters');
        if (!bar) return { visible: false, btnCount: 0 };
        const cs = getComputedStyle(bar);
        const visible = cs.display !== 'none' && cs.visibility !== 'hidden';
        const btnCount = bar.querySelectorAll('.filter-btn').length;
        return { visible, btnCount };
      });
      return { pass: result.visible && result.btnCount > 0, actual: result };
    }
  },
  {
    id: '#4', name: 'My Services modal suppressed by ?wpt',
    fn: async (browser) => {
      const modalOpen = await browser.execute(() => {
        const ms = document.getElementById('my-services-modal') ||
                   document.querySelector('.my-services-panel.open, .my-services-modal.open');
        if (!ms) return false;
        const cs = getComputedStyle(ms);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      return { pass: !modalOpen, actual: modalOpen ? 'modal open (FAIL)' : 'suppressed' };
    }
  },
  {
    id: '#5', name: 'SW_VERSION exposed on window',
    fn: async (browser) => {
      const sw = await browser.execute(() => window.SW_VERSION || '');
      const valid = /^\d{4}-\d{2}-\d{2}[a-z]?$/.test(sw);
      return { pass: valid, actual: sw };
    }
  },
];

// ── Desktop assertions (D1 + D3) ──────────────────────────────────────────────
const DESKTOP = [
  {
    id: '#17', name: '2-col game grid at 1200+',
    fn: async (browser) => {
      const cols = await browser.execute(() => {
        const el = document.querySelector('.games-list');
        if (!el) return '';
        return getComputedStyle(el).getPropertyValue('--cols').trim() || '';
      });
      return { pass: cols === '2', actual: cols || '(empty)' };
    }
  },
  {
    id: '#18', name: 'WHOLE FIELD toggle visible',
    fn: async (browser) => {
      const visible = await browser.execute(() => {
        const t = document.getElementById('wf-toggle');
        if (!t) return false;
        const cs = getComputedStyle(t);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      return { pass: visible, actual: visible ? 'visible' : 'hidden/missing' };
    }
  },
  {
    id: '#WF1', name: 'ESSENTIALS → WHOLE FIELD: wf-mode added, ambient panel visible',
    fn: async (browser) => {
      await browser.execute(() => {
        document.body.classList.remove('wf-mode', 'wc-mode', 'journalism-mode');
        try { localStorage.setItem('field_desktop_mode', 'essentials'); } catch(_) {}
      });
      const before = await browser.execute(() => document.body.classList.contains('wf-mode'));
      if (before) return { pass: false, actual: 'wf-mode already on before click' };
      const btn = await browser.$('#wf-toggle');
      if (!await btn.isExisting()) return { pass: false, actual: '#wf-toggle missing' };
      await btn.click();
      await browser.pause(600);
      const result = await browser.execute(() => {
        const hasWf = document.body.classList.contains('wf-mode');
        const panel = document.getElementById('ambient-panel');
        const cs = panel ? getComputedStyle(panel) : null;
        const panelVisible = cs && cs.display !== 'none' && cs.visibility !== 'hidden';
        return { hasWf, panelVisible };
      });
      return { pass: result.hasWf && result.panelVisible, actual: result };
    }
  },
  {
    id: '#WF2', name: 'WHOLE FIELD → ESSENTIALS: wf-mode removed, ambient panel hidden',
    fn: async (browser) => {
      await browser.execute(() => {
        if (!document.body.classList.contains('wf-mode')) {
          document.body.classList.add('wf-mode');
          try { localStorage.setItem('field_desktop_mode', 'whole'); } catch(_) {}
        }
      });
      const btn = await browser.$('#wf-toggle');
      await btn.click();
      await browser.pause(600);
      const result = await browser.execute(() => {
        const hasWf = document.body.classList.contains('wf-mode');
        const panel = document.getElementById('ambient-panel');
        const cs = panel ? getComputedStyle(panel) : null;
        const panelHidden = !cs || cs.display === 'none' || cs.visibility === 'hidden';
        return { hasWf, panelHidden };
      });
      return { pass: !result.hasWf && result.panelHidden, actual: result };
    }
  },
  {
    id: '#WC1', name: 'WC tab enters own viewport: wc-mode + wc-section visible + .main hidden',
    fn: async (browser) => {
      await browser.execute(() => {
        document.body.classList.remove('wf-mode', 'wc-mode', 'journalism-mode');
        const link = document.getElementById('wc-nav-link');
        if (link) link.style.display = '';
      });
      const toggled = await browser.execute(() => {
        if (typeof toggleWCView !== 'function') return false;
        toggleWCView();
        return true;
      });
      if (!toggled) return { pass: false, actual: 'toggleWCView not defined' };
      await browser.pause(600);
      const state = await browser.execute(() => {
        const hasWc = document.body.classList.contains('wc-mode');
        const wcSec = document.getElementById('wc-section');
        const main = document.querySelector('main.main, #main');
        const wcCs = wcSec ? getComputedStyle(wcSec) : null;
        const mainCs = main ? getComputedStyle(main) : null;
        return {
          hasWc,
          wcSectionVisible: !!wcCs && wcCs.display !== 'none' && wcCs.visibility !== 'hidden',
          mainHidden: !mainCs || mainCs.display === 'none',
        };
      });
      return { pass: state.hasWc && state.wcSectionVisible && state.mainHidden, actual: state };
    }
  },
  {
    id: '#JRN1', name: 'Journalism tab enters own viewport: journalism-mode + section visible + .main hidden',
    fn: async (browser) => {
      await browser.execute(() => {
        if (document.body.classList.contains('wc-mode') && typeof toggleWCView === 'function') {
          toggleWCView();
        }
        document.body.classList.remove('wf-mode', 'journalism-mode');
      });
      await browser.pause(300);
      const toggled = await browser.execute(() => {
        if (typeof toggleJournalismView !== 'function') return false;
        toggleJournalismView();
        return true;
      });
      if (!toggled) return { pass: false, actual: 'toggleJournalismView not defined' };
      await browser.pause(600);
      const state = await browser.execute(() => {
        const hasJrn = document.body.classList.contains('journalism-mode');
        const jrnSec = document.getElementById('field-journalism-section');
        const main = document.querySelector('main.main, #main');
        const jrnCs = jrnSec ? getComputedStyle(jrnSec) : null;
        const mainCs = main ? getComputedStyle(main) : null;
        return {
          hasJrn,
          jrnVisible: !!jrnCs && jrnCs.display !== 'none' && jrnCs.visibility !== 'hidden',
          mainHidden: !mainCs || mainCs.display === 'none',
        };
      });
      return { pass: state.hasJrn && state.jrnVisible && state.mainHidden, actual: state };
    }
  },
  {
    id: '#MEX', name: 'Mode mutual exclusion: opening wc-mode while in journalism-mode dismisses journalism',
    fn: async (browser) => {
      await browser.execute(() => {
        document.body.classList.remove('wc-mode');
        if (!document.body.classList.contains('journalism-mode') && typeof toggleJournalismView === 'function') {
          toggleJournalismView();
        }
      });
      await browser.pause(400);
      await browser.execute(() => { if (typeof toggleWCView === 'function') toggleWCView(); });
      await browser.pause(400);
      const state = await browser.execute(() => ({
        hasWc:  document.body.classList.contains('wc-mode'),
        hasJrn: document.body.classList.contains('journalism-mode'),
      }));
      return { pass: state.hasWc && !state.hasJrn, actual: state };
    }
  },
  {
    id: '#CLS', name: 'CLS below 0.1 threshold (PerformanceObserver)',
    fn: async (browser) => {
      const cls = await browser.execute(() => {
        if (typeof window._fieldCLS === 'number') return window._fieldCLS;
        try {
          const entries = performance.getEntriesByType('layout-shift') || [];
          return entries.filter(e => !e.hadRecentInput).reduce((s, e) => s + (e.value || 0), 0);
        } catch (_) { return null; }
      });
      if (cls === null) return { pass: true, actual: 'unsupported (skipped)' };
      return { pass: cls < 0.1, actual: cls.toFixed(4) };
    }
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────
async function run() {
  const assertions = [...UNIVERSAL, ...DESKTOP];
  console.error(`[desktop-safari] ${DEVICE_ID} (${VP.label}) ${VP.width}x${VP.height}, ${assertions.length} assertions`);

  let browser;
  try {
    browser = await remote({
      hostname: '127.0.0.1',
      port: 4444, // safaridriver default
      path: '/',
      logLevel: 'warn',
      capabilities: {
        browserName: 'safari',
        platformName: 'mac',
      },
    });

    await browser.setWindowSize(VP.width, VP.height);
    await browser.url(LIVE_URL);

    let ready = false;
    for (let i = 0; i < 50; i++) {
      ready = await browser.execute(() => !!window._fieldDataReady);
      if (ready) break;
      await browser.pause(500);
    }
    if (!ready) console.error('[desktop-safari] WARNING: _fieldDataReady never became true');
    await browser.pause(2000);

    const results = [];
    for (const a of assertions) {
      try {
        const r = await a.fn(browser);
        results.push({ id: a.id, name: a.name, ...r });
      } catch (err) {
        results.push({ id: a.id, name: a.name, pass: false, actual: `ERROR: ${err.message}` });
      }
    }

    const output = {
      engine: 'webkit',
      deviceId: DEVICE_ID,
      label: VP.label,
      viewport: { width: VP.width, height: VP.height },
      timestamp: new Date().toISOString(),
      dataReady: ready,
      total: results.length,
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length,
      results,
    };
    console.log(JSON.stringify(output, null, 2));
    return output.failed;
  } catch (err) {
    console.error(`[desktop-safari] FATAL: ${err.message}`);
    console.log(JSON.stringify({ engine: 'webkit', deviceId: DEVICE_ID, error: err.message, results: [] }, null, 2));
    return 1;
  } finally {
    if (browser) await browser.deleteSession().catch(() => {});
  }
}

run().then(f => process.exit(f > 0 ? 1 : 0));
