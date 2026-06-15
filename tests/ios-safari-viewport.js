#!/usr/bin/env node
// tests/ios-safari-viewport.js — iOS Safari Viewport Audit (Appium + WebDriverIO)
//
// Ports assertions from viewport-all.spec.js to real iOS Simulator Safari.
// Requires: Appium running on port 4723 with Safari driver installed.
// ENV: IOS_DEVICE (simulator device name), DEVICE_ID (P1/P2/P3/T1/T2)
//
// Usage: node tests/ios-safari-viewport.js
// Output: JSON results to stdout

const { remote } = require('webdriverio');

const LIVE_URL = 'https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt';

const DEVICE_ID = process.env.DEVICE_ID || 'P2';
const IOS_DEVICE = process.env.IOS_DEVICE || 'iPhone 16';
const IOS_VERSION = process.env.IOS_VERSION || '18.1';
const DEVICE_UDID = process.env.DEVICE_UDID || undefined;

const IS_PHONE = ['P1', 'P2', 'P3'].includes(DEVICE_ID);
const IS_IPAD = ['T1', 'T2'].includes(DEVICE_ID);

// ── Assertion definitions ──────────────────────────────────────────────────

const UNIVERSAL = [
  {
    id: '#1', name: 'no uncaught JS errors',
    fn: async (browser) => {
      // WebDriverIO Safari doesn't expose console errors the same way.
      // We check for a global error catcher FIELD sets up.
      const result = await browser.execute(() => {
        // FIELD sets window._fieldErrors if any uncaught errors fire
        return window._fieldErrors || [];
      });
      return { pass: result.length === 0, actual: result.length === 0 ? 'clean' : result };
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
    id: '#3', name: 'filter bar visible',
    fn: async (browser) => {
      const result = await browser.execute(() => {
        const bar = document.querySelector('.filter-bar');
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

const PHONE_ONLY = [
  {
    id: '#6', name: 'bottom sheet opens on card tap',
    fn: async (browser) => {
      // Tap the first card with data-open
      const card = await browser.$('.card-body[data-open]');
      if (!await card.isExisting()) return { pass: false, actual: 'no card-body[data-open] found' };
      await card.click(); // Appium translates click to tap on mobile
      await browser.pause(1500);
      const hasOpen = await browser.execute(() => {
        const sheet = document.getElementById('bottom-sheet');
        return sheet ? sheet.classList.contains('open') : false;
      });
      return { pass: hasOpen, actual: hasOpen ? 'sheet opened' : 'sheet did not open' };
    }
  },
  {
    id: '#7', name: 'filter button tap height ≥44px',
    fn: async (browser) => {
      const height = await browser.execute(() => {
        const btn = document.querySelector('.filter-bar .filter-btn');
        if (!btn) return 0;
        return btn.getBoundingClientRect().height;
      });
      return { pass: height >= 44, actual: `${height}px` };
    }
  },
  {
    id: '#8', name: 'single column layout',
    fn: async (browser) => {
      const cols = await browser.execute(() => {
        const el = document.querySelector('.games-list');
        if (!el) return 'no-element';
        return el.style.getPropertyValue('--cols') ||
               getComputedStyle(el).getPropertyValue('--cols').trim() || '1';
      });
      return { pass: cols === '1' || cols === '', actual: cols };
    }
  },
  {
    id: '#9', name: 'score ticker visible',
    fn: async (browser) => {
      const visible = await browser.execute(() => {
        const ticker = document.getElementById('score-ticker-wrap') ||
                       document.querySelector('.score-ticker');
        if (!ticker) return false;
        const cs = getComputedStyle(ticker);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      return { pass: visible, actual: visible ? 'visible' : 'hidden/missing' };
    }
  },
];

const IPAD_ONLY = [
  {
    id: '#12', name: 'bottom sheet opens on card tap',
    fn: async (browser) => {
      const card = await browser.$('.card-body[data-open]');
      if (!await card.isExisting()) return { pass: false, actual: 'no card-body[data-open] found' };
      await card.click();
      await browser.pause(1500);
      const hasOpen = await browser.execute(() => {
        const sheet = document.getElementById('bottom-sheet');
        return sheet ? sheet.classList.contains('open') : false;
      });
      return { pass: hasOpen, actual: hasOpen ? 'sheet opened' : 'sheet did not open' };
    }
  },
  {
    id: '#13', name: 'ambient panel visible',
    fn: async (browser) => {
      const visible = await browser.execute(() => {
        const panel = document.getElementById('ambient-panel');
        if (!panel) return false;
        const cs = getComputedStyle(panel);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      return { pass: visible, actual: visible ? 'visible' : 'hidden/missing' };
    }
  },
  {
    id: '#14', name: 'ambient scroll inset-positioned and scrollable',
    fn: async (browser) => {
      const arch = await browser.execute(() => {
        const panel = document.getElementById('ambient-panel');
        const inner = document.querySelector('#ambient-panel .ambient-scroll-inner');
        if (!panel) return { error: 'panel missing' };
        if (!inner) return { error: 'inner missing', panelPosition: getComputedStyle(panel).position };
        const cs = getComputedStyle(inner);
        return {
          panelPosition:    getComputedStyle(panel).position,
          panelOverflow:    getComputedStyle(panel).overflow,
          innerPosition:    cs.position,
          innerTop:         cs.top,
          innerRight:       cs.right,
          innerBottom:      cs.bottom,
          innerLeft:        cs.left,
          innerOverflowY:   cs.overflowY,
          innerScrollable:  inner.scrollHeight > inner.clientHeight,
          innerScrollHeight: inner.scrollHeight,
          innerClientHeight: inner.clientHeight,
        };
      });
      if (arch.error) return { pass: false, actual: arch };
      const pass =
        arch.panelPosition === 'fixed' &&
        arch.innerPosition === 'absolute' &&
        arch.innerTop === '0px' &&
        arch.innerRight === '0px' &&
        arch.innerBottom === '0px' &&
        arch.innerLeft === '0px' &&
        ['auto', 'scroll'].includes(arch.innerOverflowY);
      return { pass, actual: arch };
    }
  },
  {
    id: '#15', name: 'nav-link tap height ≥44px',
    fn: async (browser) => {
      const results = await browser.execute(() => {
        const ids = ['desk-jump-link', 'jrn-nav-link'];
        return ids.map(id => {
          const el = document.getElementById(id);
          if (!el) return { id, height: null, exists: false };
          return { id, height: el.getBoundingClientRect().height, exists: true };
        });
      });
      const failures = results.filter(r => r.exists && r.height < 44);
      return { pass: failures.length === 0, actual: results };
    }
  },
  {
    id: '#16', name: 'Journal activates journalism-mode',
    fn: async (browser) => {
      const before = await browser.execute(() => document.body.classList.contains('journalism-mode'));
      if (before) return { pass: false, actual: 'journalism-mode already active before tap' };
      const jrnLink = await browser.$('#jrn-nav-link');
      if (!await jrnLink.isExisting()) return { pass: false, actual: 'jrn-nav-link not found' };
      await jrnLink.click();
      await browser.pause(1500);
      const after = await browser.execute(() => document.body.classList.contains('journalism-mode'));
      return { pass: after, actual: after ? 'activated' : 'did not activate' };
    }
  },
];

// ── Runner ──────────────────────────────────────────────────────────────────

async function run() {
  const assertions = [...UNIVERSAL];
  if (IS_PHONE) assertions.push(...PHONE_ONLY);
  if (IS_IPAD) assertions.push(...IPAD_ONLY);

  console.error(`[ios-safari] Device: ${IOS_DEVICE} (${DEVICE_ID}), ${assertions.length} assertions`);

  let browser;
  try {
    browser = await remote({
      port: 4723,
      capabilities: {
        platformName: 'iOS',
        'appium:automationName': 'Safari',
        'appium:browserName': 'Safari',
        'appium:deviceName': IOS_DEVICE,
        'appium:platformVersion': IOS_VERSION,
        ...(DEVICE_UDID ? { 'appium:udid': DEVICE_UDID } : {}),
        'appium:noReset': true,
        'appium:safari:automaticInspection': true,
      },
      logLevel: 'warn',
    });

    await browser.url(LIVE_URL);

    // Wait for FIELD data ready
    let ready = false;
    for (let i = 0; i < 50; i++) {
      ready = await browser.execute(() => !!window._fieldDataReady);
      if (ready) break;
      await browser.pause(500);
    }
    if (!ready) console.error('[ios-safari] WARNING: _fieldDataReady never became true');

    // Extra buffer for async data (ESPN overlay, relay)
    await browser.pause(2000);

    const results = [];
    for (const assertion of assertions) {
      try {
        const result = await assertion.fn(browser);
        results.push({ id: assertion.id, name: assertion.name, ...result });
      } catch (err) {
        results.push({ id: assertion.id, name: assertion.name, pass: false, actual: `ERROR: ${err.message}` });
      }
    }

    const output = {
      device: IOS_DEVICE,
      deviceId: DEVICE_ID,
      tier: IS_PHONE ? 'phone' : IS_IPAD ? 'ipad' : 'unknown',
      timestamp: new Date().toISOString(),
      dataReady: ready,
      total: results.length,
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length,
      results,
    };

    // JSON to stdout for workflow parsing
    console.log(JSON.stringify(output, null, 2));

    return output.failed;
  } catch (err) {
    console.error(`[ios-safari] FATAL: ${err.message}`);
    const output = { device: IOS_DEVICE, deviceId: DEVICE_ID, error: err.message, results: [] };
    console.log(JSON.stringify(output, null, 2));
    return 1;
  } finally {
    if (browser) await browser.deleteSession().catch(() => {});
  }
}

run().then(failures => process.exit(failures > 0 ? 1 : 0));
