// Resolves the competing hypothesis behind the standings panel failure.
//   HYPOTHESIS A: the window-bridge block executes; the 7 unbridged names were the
//                 whole bug, so adding them fixes every affected control.
//   HYPOTHESIS B: the bridge block is NEVER REACHED (an earlier top-level statement
//                 throws and aborts module execution), in which case the 11
//                 pre-existing bridges are ALSO missing and the fix changes nothing.
// A and B predict identical standingsWorks:false, so the pass/fail probe cannot
// separate them. typeof window.<name> can, and MLB's dropdown is the independent
// control: my NFL map-key change cannot affect it, so if MLB now opens, the bridge
// mechanism is confirmed as the cause and the repair is class-wide.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const BASE = process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev';
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1';
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const PREEXISTING = ['closeBottomSheet','goToDate','makePick','pinGame','toggleThreadDrawer','_threadSend'];
const NEWLY_ADDED = ['toggleStandings','jumpToGameCard','openWcGroup','renderJournalism','renderJournalismArchive','scrollToMediaSpecial','_wwFindCard'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 3200 } });
  const m = { url: URL, ts: TS, pageErrors: [] };
  page.on('pageerror', e => m.pageErrors.push(String(e).slice(0, 200)));
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.game-card', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(9000);
    m.swVersion = await page.evaluate(() => window.SW_VERSION || null);

    m.bridges = await page.evaluate(([pre, neu]) => {
      const probe = names => Object.fromEntries(names.map(n => [n, typeof window[n]]));
      return { preexisting: probe(pre), newlyAdded: probe(neu) };
    }, [PREEXISTING, NEWLY_ADDED]);

    const t = m.bridges;
    m.preexistingAllPresent = Object.values(t.preexisting).every(v => v === 'function');
    m.newlyAddedAllPresent  = Object.values(t.newlyAdded).every(v => v === 'function');
    // HYPOTHESIS DISCRIMINATOR
    m.hypothesis = !m.preexistingAllPresent
      ? 'B — bridge block NOT reached (pre-existing bridges also missing): module aborts earlier; the fix is insufficient'
      : m.newlyAddedAllPresent
        ? 'A — bridge block executes and now carries all names: fix is effective'
        : 'A-partial — block executes but some new names missing: deploy lag or a typo';

    // INDEPENDENT CONTROL: MLB dropdown. Unaffected by the NFL map-key change.
    const mlbClicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.standings-btn')]
        .find(x => (x.getAttribute('onclick') || '').includes("toggleStandings(this,'Baseball (MLB)'"));
      if (!b) return false;
      b.scrollIntoView(); b.click(); return true;
    });
    m.mlbButtonFound = mlbClicked;
    if (mlbClicked) {
      await page.waitForTimeout(10000);
      m.mlb = await page.evaluate(() => {
        const b = [...document.querySelectorAll('.standings-btn')]
          .find(x => (x.getAttribute('onclick') || '').includes("toggleStandings(this,'Baseball (MLB)'"));
        const p = b?.closest('.game-card')?.querySelector('.standings-panel');
        return { panelPresent: !!p, rowCount: p ? p.querySelectorAll('.standings-table tr').length : 0,
                 label: (b?.textContent || '').trim() };
      });
      m.mlbDropdownWorks = !!(m.mlb.panelPresent && m.mlb.rowCount > 1);
    }
    await page.screenshot({ path: `outbox/window-bridge-${TS}.png` });
  } catch (e) { m.error = String(e && e.message ? e.message : e); }
  finally { await browser.close(); }
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/window-bridge-manifest-${TS}.json`, JSON.stringify(m, null, 2));
  console.log(JSON.stringify(m, null, 2));
  process.exit(0);
})();
