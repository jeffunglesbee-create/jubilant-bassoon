// NFL field-position utilities.

export function _srSitToYL100(sit){
  if(!sit?.location?.yardline) return null;
  const ownTerritory=sit.location.id===sit.possession?.id||sit.location.name===sit.possession?.name;
  return Math.max(1,Math.min(99,ownTerritory?(100-sit.location.yardline):sit.location.yardline));
}
