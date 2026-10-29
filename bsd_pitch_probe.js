// bsd_pitch_probe.js — CI-as-proxy Playwright proof for the BSD pitch renderer.
// CC-CMD-2026-10-28-bsd-pitch-renderer-fields (field-relay-nba docs/), jubilant-bassoon Rule 90.
//
// WHAT THIS PROVES, and what it does not. It loads the DEPLOYED page in a real browser, makes the
// page's own AmbientEventSource receive a recorded stream over its real /live/ambient path, and
// reads back the SVG that _bsdRepaint drew. It proves the READER: that the fields the relay sends are
// the fields the client draws, on the deployed bundle. It does NOT prove a live match: no match is
// live in CI, and the frames are recorded payloads, not a socket. Say so wherever the result is read.
//
// The payloads are not typed here. The ball frames are the relay's own served
// /bsd/contract frameShapes.livedata.example (and exampleWithoutCoordinates), VERBATIM. The shot
// records are the first home goal and first away goal of a finished event's /bsd/events/{id}/shotmap,
// VERBATIM, and the third leg of every shot check is the vendor's own placement of the same goal on
// the shared pitch (/bsd/events/{id}/incidents sequence pos), so the check does not rest only on a
// formula this repo wrote.
//
// Stages, in one page load. The page reconnects its EventSource by itself when a body ends, so each
// connection delivers one stage and the state in between can be read:
//   connection 1: frame A bsd:ball with coords, frame B bsd:ball with coords null, frame D bsd:stats
//                 carrying two recorded shots
//                 -> a dot at the expected place (B did not blank it), two shot circles at the places
//                    the vendor puts those goals
//   connection 2: frame C bsd:ball for ANOTHER match       -> the dot does not move
//   connection 3: frame E, the served example with ONLY its coords replaced by pitch x = 5, y = 50
//                 -> the dot sits INSIDE the drawn goal line (5% of the pitch from it), not on it
//   later:        keepalives only; 31.5 s after frame E    -> the dot is gone (30 s bound), shots stay
//
// Where things are drawn is judged against the pitch RECTANGLE the page draws (read from the SVG), not against
// a constant of this script's: a pitch coordinate x maps to rect.x + rect.width * x / 100, and y is inverted.

const { chromium } = require('@playwright/test');
const fs = require('fs');

const FIELD_URL = (process.env.FIELD_URL || 'https://jubilant-bassoon.jeffunglesbee.workers.dev') + '?wpt';
const RELAY = process.env.RELAY_URL || 'https://field-relay-nba.jeffunglesbee.workers.dev';
const EVENT = process.env.SHOT_EVENT || '602347';
const OUT = 'outbox';
const AGREE = 1.0; // pitch units; the relay's shared-pitch fit uses the same bound for the same comparison
const AGE_WAIT_MS = 31500;

const getJson = async (path) => {
  const r = await fetch(RELAY + path, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
};

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const manifest = {
    probe: 'bsd-pitch', stamp, page: FIELD_URL, relay: RELAY, shotEvent: EVENT,
    scope: 'Proves the READER on the deployed page, fed recorded payloads over its real SSE path. ' +
           'Not a live match; none is live in CI.',
    error: null,
  };
  let browser;
  try {
    // ── the inputs, from the served contract and a finished event — not typed here ──
    const contract = await getJson('/bsd/contract');
    const ball = contract.frameShapes.livedata.example;
    const nullBall = contract.frameShapes.livedata.exampleWithoutCoordinates;
    const stats = contract.frameShapes.stats.example;
    const sp = contract.transformReference.sharedPitch;
    manifest.contractDeclaresSharedPitch = !!sp && sp.home === 'x = 100 - x; y = 100 - y' && sp.away === 'x = x; y = y';
    manifest.contractRevision = contract.revision;
    if (!ball?.coords || !nullBall || nullBall.coords !== null) throw new Error('contract livedata examples are not the expected pair');

    const shotmap = (await getJson(`/bsd/events/${EVENT}/shotmap`)).shotmap;
    const incidents = (await getJson(`/bsd/events/${EVENT}/incidents`)).incidents;
    const goalOf = (home) => {
      const shot = shotmap.find(s => s.type === 'goal' && s.home === home);
      if (!shot) throw new Error(`no ${home ? 'home' : 'away'} goal in the shotmap of ${EVENT}`);
      const inc = incidents.find(i => i.type === 'goal' && (i.is_home === true) === home &&
        (i.sequence || []).some(q => q.event === 'goal' && q.pid === shot.player_id) && Math.abs(i.minute - shot.min) <= 1);
      if (!inc) throw new Error(`no incident sequence for the ${home ? 'home' : 'away'} goal of ${EVENT} (player ${shot.player_id})`);
      const step = inc.sequence.find(q => q.event === 'goal' && q.pid === shot.player_id);
      return { shot, vendorShared: step.pos };
    };
    const homeGoal = goalOf(true);
    const awayGoal = goalOf(false);
    manifest.shots = {
      home: { min: homeGoal.shot.min, pos: homeGoal.shot.pos, vendorShared: homeGoal.vendorShared },
      away: { min: awayGoal.shot.min, pos: awayGoal.shot.pos, vendorShared: awayGoal.vendorShared },
    };

    const activeId = String(ball.id);
    const otherBall = { ...ball, id: String(Number(ball.id) + 1), coords: { x: ball.coords.x === 50 ? 51 : 50, y: 50 } };
    const statsFrame = { ...stats, id: activeId, shotmap: [homeGoal.shot, awayGoal.shot], momentum: null };
    const body = (frames) => frames.map(([ev, d]) => `event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`).join('');
    const sse1 = body([['bsd:ball', ball], ['bsd:ball', { ...nullBall, id: activeId }], ['bsd:stats', statsFrame]]);
    const sse2 = body([['bsd:ball', otherBall]]);
    const edgeBall = { ...ball, coords: { x: 5, y: 50 } };
    const sse3 = body([['bsd:ball', edgeBall]]);
    manifest.frames = { ball, nullBall: { ...nullBall, id: activeId }, otherBall, edgeBall, statsShotCount: statsFrame.shotmap.length };

    // ── the browser ──
    browser = await chromium.launch();
    // serviceWorkers: 'block' — a service worker that handles a request hides it from page.route,
    // and the SSE stream below must be the probe's, not the network's.
    const ctx = await browser.newContext({ viewport: { width: 820, height: 1024 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));

    let releaseSse; const ready = new Promise(r => { releaseSse = r; });
    let sseRequests = 0;
    await page.route('**/ambient/bsd/subscribe', r => r.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' }));
    await page.route('**/live/ambient', async (r) => {
      sseRequests++;
      const cors = { 'access-control-allow-origin': '*', 'cache-control': 'no-cache' };
      if (sseRequests === 2) return r.fulfill({ status: 200, headers: cors, contentType: 'text/event-stream', body: sse2 });
      if (sseRequests === 3) return r.fulfill({ status: 200, headers: cors, contentType: 'text/event-stream', body: sse3 });
      if (sseRequests > 3) { // nothing new from here: the age bound is what is tested
        return r.fulfill({ status: 200, headers: cors, contentType: 'text/event-stream', body: ': keepalive\n\n' });
      }
      await ready; // not before the page has activated the match and has a pitch to draw on
      return r.fulfill({ status: 200, headers: cors, contentType: 'text/event-stream', body: sse1 });
    });

    await page.goto(FIELD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    manifest.hookPresent = await page.waitForFunction(() => !!(window._bsdVerify && window._bsdVerify.activate), null, { timeout: 30000 })
      .then(() => true, () => false);
    if (!manifest.hookPresent) throw new Error('window._bsdVerify.activate never appeared on the deployed page (is the Task 1 commit deployed?)');

    const geom = await page.evaluate((id) => {
      document.body.insertAdjacentHTML('beforeend',
        '<div id="bsd-pitch" style="position:fixed;top:12px;left:12px;z-index:2147483647;width:360px;min-height:200px;background:#000"></div>');
      window._bsdVerify.activate(id);
      const el = document.getElementById('bsd-pitch');
      return { W: el.clientWidth };
    }, activeId);
    releaseSse();
    const W = geom.W, H = Math.round(W * 0.667);
    manifest.pitchPx = { W, H };

    // Read back what _bsdRepaint drew.
    const read = () => page.evaluate(() => {
      const svg = document.querySelector('#bsd-pitch svg');
      if (!svg) return { svg: false };
      const circ = [...svg.querySelectorAll('circle')].map(c => ({
        cx: c.getAttribute('cx'), cy: c.getAttribute('cy'), r: c.getAttribute('r'), fill: c.getAttribute('fill') }));
      const rc = svg.querySelector('rect');
      const rect = rc ? { x: +rc.getAttribute('x'), y: +rc.getAttribute('y'), w: +rc.getAttribute('width'), h: +rc.getAttribute('height') } : null;
      return { svg: true, circles: circ, rect, nanAttributes: (svg.outerHTML.match(/NaN|undefined|Infinity/g) || []).length };
    });
    const isBall = (c) => c.fill === '#fff';
    const isShot = (c) => /^rgba\((99,179,237|252,129,74),/.test(c.fill || '');

    manifest.ballAppeared = await page.waitForFunction(() => {
      const svg = document.querySelector('#bsd-pitch svg');
      return !!svg && svg.querySelectorAll('circle[fill="#fff"]').length > 0;
    }, null, { timeout: 25000 }).then(() => true, () => false);
    await page.waitForTimeout(800); // frames B and D follow A within the same tick; let them land
    const tA = Date.now();
    const s1 = await read();
    const ballCircles = (s1.circles || []).filter(isBall);
    const shotCircles = (s1.circles || []).filter(isShot);

    const rect = s1.rect;
    manifest.pitchRect = rect;
    if (!rect || ![rect.x, rect.y, rect.w, rect.h].every(Number.isFinite)) throw new Error('the drawn pitch rectangle was not readable from the SVG');
    const px = (x) => rect.x + rect.w * x / 100, py = (y) => rect.y + rect.h * (100 - y) / 100;
    const near = (a, b, tol) => Number.isFinite(+a) && Math.abs(+a - b) <= tol;
    const exp = { cx: px(ball.coords.x), cy: py(ball.coords.y) };
    manifest.ballCircleCount = ballCircles.length;
    manifest.ballCircleFinite = ballCircles.length === 1 && Number.isFinite(+ballCircles[0].cx) && Number.isFinite(+ballCircles[0].cy);
    manifest.ballCx = ballCircles[0] ? +ballCircles[0].cx : null;
    manifest.ballCy = ballCircles[0] ? +ballCircles[0].cy : null;
    manifest.expectedBall = exp;
    manifest.ballAtExpected = !!ballCircles[0] && near(ballCircles[0].cx, exp.cx, 0.01) && near(ballCircles[0].cy, exp.cy, 0.01);
    // Frame B (coords null) came after A on the same connection; the dot is still at A's point.
    manifest.ballKeptOnNullFrame = manifest.ballAtExpected;

    // Shots: home (blue) and away (orange). Expected = the vendor's own placement on the shared pitch.
    const byFill = (pre) => shotCircles.filter(c => c.fill.startsWith(pre));
    const homeC = byFill('rgba(99,179,237')[0], awayC = byFill('rgba(252,129,74')[0];
    const tolX = AGREE * rect.w / 100, tolY = AGREE * rect.h / 100;
    manifest.shotCircleCount = shotCircles.length;
    manifest.shotCirclesFinite = shotCircles.length === 2 && shotCircles.every(c => Number.isFinite(+c.cx) && Number.isFinite(+c.cy) && Number.isFinite(+c.r));
    manifest.homeShotAtVendorPlacement = !!homeC && near(homeC.cx, px(homeGoal.vendorShared.x), tolX) && near(homeC.cy, py(homeGoal.vendorShared.y), tolY);
    manifest.awayShotAtVendorPlacement = !!awayC && near(awayC.cx, px(awayGoal.vendorShared.x), tolX) && near(awayC.cy, py(awayGoal.vendorShared.y), tolY);
    // The exact leg: the served sharedPitch formulas (checked above to read as the strings in
    // manifest.contractDeclaresSharedPitch) applied to the RECORD, to 0.01 px. The vendor leg above has a pitch
    // unit of slack because the vendor's two feeds can differ by 0.5; this one has none, so a margin applied to
    // one axis only, which a goal near the centre line cannot show against the vendor leg, still fails.
    const hp = homeGoal.shot.pos, ap = awayGoal.shot.pos;
    manifest.homeShotAtTransform = !!homeC && near(homeC.cx, px(100 - hp.x), 0.01) && near(homeC.cy, py(100 - hp.y), 0.01);
    manifest.awayShotAtTransform = !!awayC && near(awayC.cx, px(ap.x), 0.01) && near(awayC.cy, py(ap.y), 0.01);
    // The inset: the away goal is at pitch x = 2.7, so its centre is INSIDE the drawn goal line (rect.x), and the
    // circle (xg 0.676, r 9.8 px) is not cut by the canvas edge.
    manifest.awayShotCentreInsideGoalLine = !!awayC && +awayC.cx >= rect.x;
    manifest.awayShotNotClipped = !!awayC && +awayC.cx - +awayC.r >= 0;
    manifest.homeShotCircle = homeC || null;
    manifest.awayShotCircle = awayC || null;
    manifest.nanAttributes = s1.nanAttributes ?? null;

    // An element screenshot is the pixels at the element's rect, whoever paints them: on the deployed page the first
    // version (a block appended at the end of <body>) came back as the page's own list of sports. So the pitch is a
    // fixed top-layer box. elementsFromPoint is kept as a DIAGNOSTIC only: it answers "who receives a click", and on
    // the deployed page it returned [line, svg, #bsd-pitch, ...] on one run and ["html"] on the next while the
    // screenshot showed the pitch both times (the page makes its body non-hit-testable at times). It is not a
    // statement about what is painted, so it is not required. What is painted is read from the screenshot below.
    const topInfo = await page.evaluate(() => {
      const el = document.getElementById('bsd-pitch'); const r = el.getBoundingClientRect();
      const d = (n) => n ? `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''}` : null;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const stack = document.elementsFromPoint(cx, cy).slice(0, 5).map(d);
      const top = document.elementFromPoint(cx, cy);
      return { ok: !!top && (top === el || el.contains(top)), at: { x: cx, y: cy }, rect: { w: r.width, h: r.height, top: r.top, left: r.left },
               viewport: { w: innerWidth, h: innerHeight }, stack };
    });
    manifest.pitchStack = topInfo;
    const shot = `${OUT}/bsd-pitch-probe-${stamp}.png`;
    manifest.screenshotShowsPitch = false;
    try {
      const buf = await (await page.$('#bsd-pitch')).screenshot({ path: shot, timeout: 8000 });
      manifest.screenshot = shot;
      // Decode the PNG in a blank page (the browser is the decoder) and read the pixels where the pitch is plain
      // grass: three points inside the 5%..95% rectangle that no marking, circle or dot is near (not x = 50%: that is the halfway line).
      const dec = await ctx.newPage();
      const samples = await dec.evaluate(async ({ b64, W, H }) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        return [[0.25, 0.25], [0.75, 0.75], [0.4, 0.85]].map(([fx, fy]) => {
          const d = g.getImageData(Math.round(fx * W), Math.round(fy * H), 1, 1).data; return [d[0], d[1], d[2]];
        });
      }, { b64: buf.toString('base64'), W, H });
      await dec.close();
      const GRASS = [45, 90, 39]; // #2d5a27, the pitch background in _bsdRepaint
      manifest.screenshotSamples = samples;
      manifest.screenshotShowsPitch = samples.length === 3 && samples.every(p => p.every((v, i) => Math.abs(v - GRASS[i]) <= 6));
    } catch (e) { manifest.screenshot = null; manifest.screenshotError = String(e.message).split('\n')[0]; }

    // Connection 2 delivers frame C, a ball for another match: the dot must not move.
    const deadline = Date.now() + 15000;
    while (sseRequests < 2 && Date.now() < deadline) await page.waitForTimeout(250);
    await page.waitForTimeout(1200);
    const s1b = await read();
    const ballB = (s1b.circles || []).filter(isBall);
    manifest.otherMatchServed = sseRequests >= 2;
    manifest.otherMatchIgnored = manifest.otherMatchServed && ballB.length === 1 &&
      near(ballB[0].cx, exp.cx, 0.01) && near(ballB[0].cy, exp.cy, 0.01);

    // Connection 3 delivers frame E, a ball at pitch x = 5: drawn 5% of the pitch INSIDE the goal line, not on it.
    const deadline3 = Date.now() + 15000;
    while (sseRequests < 3 && Date.now() < deadline3) await page.waitForTimeout(250);
    await page.waitForTimeout(1200);
    const tE = Date.now();
    const s1c = await read();
    const ballE = (s1c.circles || []).filter(isBall);
    manifest.edgeBallServed = sseRequests >= 3;
    manifest.edgeBallCx = ballE[0] ? +ballE[0].cx : null;
    manifest.expectedEdgeBallCx = px(5);
    manifest.ballAtFivePercentIsInside = manifest.edgeBallServed && ballE.length === 1 && near(ballE[0].cx, px(5), 0.01) &&
      near(ballE[0].cy, py(50), 0.01) && +ballE[0].cx > rect.x + 1;

    // Nothing further arrives; past the age bound the dot goes by its own timer.
    await page.waitForTimeout(Math.max(0, AGE_WAIT_MS - (Date.now() - tE)));
    const s2 = await read();
    manifest.ballDroppedWhenStale = (s2.circles || []).filter(isBall).length === 0;
    manifest.shotsStayWhenBallGoes = (s2.circles || []).filter(isShot).length === 2;
    manifest.nanAttributesAfterAge = s2.nanAttributes ?? null;
    manifest.sseRequests = sseRequests;
    manifest.consoleErrors = consoleErrors.slice(0, 8);
  } catch (e) {
    manifest.error = String(e && e.message || e);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { manifest.closeError = String(e.message).split('\n')[0]; }
    }
  }

  const required = ['contractDeclaresSharedPitch', 'hookPresent', 'ballAppeared', 'ballCircleFinite', 'ballAtExpected', 'ballKeptOnNullFrame',
    'otherMatchServed', 'otherMatchIgnored', 'screenshotShowsPitch', 'shotCirclesFinite', 'homeShotAtVendorPlacement', 'awayShotAtVendorPlacement',
    'homeShotAtTransform', 'awayShotAtTransform', 'awayShotCentreInsideGoalLine', 'awayShotNotClipped', 'edgeBallServed', 'ballAtFivePercentIsInside',
    'ballDroppedWhenStale', 'shotsStayWhenBallGoes'];
  manifest.required = required;
  manifest.failing = required.filter(k => manifest[k] !== true);
  if (manifest.nanAttributes !== 0) manifest.failing.push('nanAttributes');
  if (manifest.nanAttributesAfterAge !== 0) manifest.failing.push('nanAttributesAfterAge');
  if (manifest.error) manifest.failing.push('error');
  manifest.pass = manifest.failing.length === 0;

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/bsd-pitch-probe-manifest-${stamp}.json`, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(`${OUT}/bsd-pitch-probe-manifest-latest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ pass: manifest.pass, failing: manifest.failing, error: manifest.error, ballCx: manifest.ballCx, ballCy: manifest.ballCy,
    expectedBall: manifest.expectedBall, nanAttributes: manifest.nanAttributes, shotCircleCount: manifest.shotCircleCount }, null, 2));
  console.log('SCOPE: ' + manifest.scope);
  process.exit(manifest.pass ? 0 : 1);
})();
