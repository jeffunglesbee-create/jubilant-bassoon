// RAI quality bar — 5-dot visual for lineup edge quality score.

export function _raiQualityBar(q) {
  const filled = Math.max(0, Math.min(5, Math.round((q + 8) / 3.2)));
  return '●'.repeat(filled) + '○'.repeat(5 - filled);
}
