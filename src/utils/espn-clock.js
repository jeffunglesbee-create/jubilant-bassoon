// ESPN clock formatting — converts ISO 8601 period clock to display string.

/**
 * Format an ESPN clock string for display.
 * Converts "PT9M05.00S" → "9:05"; passes through already-formatted strings.
 */
export function fmtESPNClock(clock) {
  if (!clock) return '';
  const iso = clock.match(/^PT(\d+)M([\d.]+)S$/);
  if (iso) {
    const m = parseInt(iso[1]);
    const s = Math.floor(parseFloat(iso[2]));
    return `${m}:${String(s).padStart(2,'0')}`;
  }
  return clock; // already formatted (e.g. "9:05")
}
