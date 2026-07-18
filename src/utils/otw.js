// One To Watch (OTW) tier utilities.

export function _otwSigTierRank(tier) {
  switch (tier) {
    case 'CRUNCH':       return 4;
    case 'EXTRA_TIME':   return 3;
    case 'CLOSE_FINISH': return 2;
    case 'LIVE_GAME':    return 1;
    default:              return 0;
  }
}
