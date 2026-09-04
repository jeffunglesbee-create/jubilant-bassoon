// src/utils/chart.js — one chart renderer for every series in FIELD.
//
// WHY THIS EXISTS. Before it, seven distinct series rendered seven different
// ways: EPA per play as a single text chip (149 plays fetched, one shown),
// win probability as a number, score events as a Pulse Chip, standing velocity
// as a text tag, series margins as a bespoke 56x20 SVG, drama history as a
// bespoke 200x32 SVG, odds probabilities as text. Two hand-rolled SVG builders
// sharing no code and no conventions. Reading several at once meant holding
// several different visual languages at once, which is where the mistakes are.
//
// SCOPE BOUNDARY (ADR-002). This renderer is general. It does NOT relax any
// gate. The drama series in particular stays behind its amnesty gate at the
// CALL SITE — see openBottomSheet's `_bsIsFinal && sparkline`. A general
// instrument must not become a bypass for a specific rule, so nothing here
// knows what drama is, and nothing here should ever learn.
//
// Every other series above is commodity under Rule F (win probability, EPA,
// Elo-class models) and carries no such constraint.

import uPlot from 'uplot';

// Read a CSS custom property off :root with a literal fallback. Colours come
// from the page's own tokens rather than being duplicated here, so a palette
// change moves the charts with it. The fallback is only for a detached
// document (jsdom, a test harness) where getComputedStyle returns nothing.
function token(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    const t = (v || '').trim();
    return t || fallback;
  } catch (_) { return fallback; }
}

// The chart's own visual language, derived once per call so a theme change
// between renders is picked up. Deliberately not memoised: these are cheap
// reads and a stale palette is a worse bug than a repeated getComputedStyle.
function chartTheme() {
  return {
    ink:   token('--white', '#f2f2f2'),
    muted: token('--smoke', 'rgba(255,255,255,.45)'),
    grid:  'rgba(255,255,255,.08)',
    font:  '10px ui-sans-serif, system-ui, -apple-system, sans-serif',
  };
}

/**
 * Render (or update) a chart.
 *
 * Returns the uPlot instance. Call again with the same element and it UPDATES
 * via setData rather than remounting — that is the whole reason this returns
 * and caches an instance. FIELD re-renders on 15-30s poll cycles, and a chart
 * destroyed and rebuilt on every tick is the ambient-panel scroll-reset bug
 * (Rule 89) in a new place: it drops hover state, restarts any transition, and
 * churns canvases the browser has to reallocate.
 *
 * @param {HTMLElement} el      mount point; its width is the chart's width
 * @param {Array<Array<number>>} data  uPlot format: [xs, ...series]
 * @param {Object} opts
 * @param {number}  opts.height    px, default 64
 * @param {string[]} opts.colors   one per series; falls back to --white
 * @param {string[]} opts.labels   one per series, for the accessible summary
 * @param {[number,number]} [opts.range]  fixed y-domain. STRONGLY preferred:
 *        auto-scaling to the series maximum makes every chart look identical
 *        and is exactly the failure field-laboratory's spark-check.mjs was
 *        written to catch ("renders every game as a wall topping out at 100%").
 * @param {boolean} [opts.axes=false]  draw axes; off for sparkline contexts
 */
export function fieldChart(el, data, opts = {}) {
  if (!el || !Array.isArray(data) || data.length < 2) return null;
  const theme = chartTheme();
  const height = opts.height || 64;
  const width = Math.max(el.clientWidth || 0, 80);
  const colors = opts.colors || [];
  const labels = opts.labels || [];

  // UPDATE PATH. Same element, same series count -> setData. A changed series
  // count means a different chart, so it is rebuilt rather than silently
  // rendering the wrong number of lines.
  if (el._uplot && el._uplotSeriesCount === data.length) {
    try {
      el._uplot.setData(data);
      if (width !== el._uplotWidth) { el._uplot.setSize({ width, height }); el._uplotWidth = width; }
      return el._uplot;
    } catch (_) { /* fall through to a fresh mount */ }
  }
  if (el._uplot) { try { el._uplot.destroy(); } catch (_) {} el._uplot = null; }

  const series = [{}];
  for (let i = 1; i < data.length; i++) {
    series.push({
      label: labels[i - 1] || `series ${i}`,
      stroke: colors[i - 1] || theme.ink,
      width: 1.5,
      points: { show: false },
    });
  }

  const scales = { x: { time: false } };
  if (opts.range) scales.y = { range: () => opts.range };

  const config = {
    width, height,
    padding: [4, 4, 4, 4],
    cursor: { show: !!opts.axes, y: false },
    legend: { show: false },
    scales,
    axes: opts.axes
      ? [{ stroke: theme.muted, grid: { stroke: theme.grid, width: 1 }, font: theme.font, size: 22 },
         { stroke: theme.muted, grid: { stroke: theme.grid, width: 1 }, font: theme.font, size: 28 }]
      : [{ show: false }, { show: false }],
    series,
  };

  let u = null;
  try { u = new uPlot(config, data, el); }
  catch (_) { return null; }

  el._uplot = u;
  el._uplotSeriesCount = data.length;
  el._uplotWidth = width;

  // The canvas is unreadable to assistive tech. Rather than leave it silent or
  // let a screen reader announce a bare canvas, the mount carries a summary
  // the caller supplied labels for. Same reasoning as the laboratory's
  // sparkline marking its bar row aria-hidden behind a caption that states the
  // peak: the chart is the fast path, the text is the complete one.
  try {
    el.setAttribute('role', 'img');
    const n = data[0].length;
    const parts = [];
    for (let i = 1; i < data.length; i++) {
      const vals = data[i].filter(v => typeof v === 'number' && !Number.isNaN(v));
      if (!vals.length) continue;
      const lo = Math.min(...vals), hi = Math.max(...vals);
      parts.push(`${labels[i - 1] || 'series ' + i}: ${lo.toFixed(1)} to ${hi.toFixed(1)}`);
    }
    el.setAttribute('aria-label', `${n} points. ${parts.join('; ')}`);
  } catch (_) {}

  return u;
}

// Tear a chart down and release its canvas. Call when removing the mount from
// the DOM — uPlot attaches window listeners that outlive a detached element.
export function destroyChart(el) {
  if (el && el._uplot) {
    try { el._uplot.destroy(); } catch (_) {}
    el._uplot = null;
    el._uplotSeriesCount = 0;
  }
}
