// Golf score formatting utilities.

/**
 * Format a golf to-par value for display.
 * Returns 'E' for even, '+N' for over, '-N' for under, '' for null/non-finite.
 */
export function fmtGolfToPar(v) {
  if (v == null || !Number.isFinite(v)) return '';
  if (v === 0) return 'E';
  return (v > 0 ? '+' : '') + v;
}
