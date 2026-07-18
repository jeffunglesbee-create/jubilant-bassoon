// Sport formatting utilities — pure functions with no external dependencies.

/**
 * Infer a canonical sport name from a league string.
 * Falls back to the raw league string if no match.
 */
export function inferSport(league){
  const l = league.toLowerCase();
  if(l.includes("nba")) return "NBA";
  if(l.includes("nhl")) return "NHL";
  if(l.includes("mlb")||l.includes("baseball")) return "Baseball (MLB)";
  if(l.includes("champions league")) return "UEFA Champions League";
  if(l.includes("europa league")) return "UEFA Europa League";
  if(l.includes("conference league")) return "UEFA Conference League";
  if(l.includes("premier league")) return "Premier League";
  if(l.includes("ipl")||l.includes("cricket")) return "Cricket";
  if(l.includes("afl")||l.includes("australian")) return "Australian Football (AFL)";
  if(l.includes("top14")||l.includes("urc")||l.includes("rugby")) return "Rugby";
  if(l.includes("tennis")) return "Tennis";
  if(l.includes("nfl")) return "NFL";
  return league;
}

/**
 * Human-readable round label for a golf tournament object.
 * Reads: status, currentRound, roundId, firstPlace.lastName.
 */
export function golfRoundLabel(tourn){
  const status = tourn.status || "";
  const round = tourn.currentRound || tourn.roundId || "";
  if(status.toLowerCase().includes("official") || status.toLowerCase().includes("final"))
    return `Final · Won by ${tourn.firstPlace?.lastName||""}`;
  if(status.toLowerCase().includes("progress") || status.toLowerCase().includes("active"))
    return `R${round} · Live`;
  if(round) return `R${round}`;
  return "";
}
