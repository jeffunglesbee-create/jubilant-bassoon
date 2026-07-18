// Odds classification utilities.

export function isVolatileMatchup(game) {
  if (!game.odds?.moneyline) return false;
  return Math.abs((game.odds.moneyline.home||0) - (game.odds.moneyline.away||0)) >= 200;
}

export function _upsetDogPrice(g) {
  const ml = (g.opening_odds && g.opening_odds.moneyline) || g.opening_odds || g.odds?.moneyline;
  if (!ml) return null;
  const mlH = Number(ml.home);
  const mlA = Number(ml.away);
  if (!isFinite(mlH) || !isFinite(mlA)) return null;
  return Math.max(mlH, mlA);
}
