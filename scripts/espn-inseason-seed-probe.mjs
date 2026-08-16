import fs from 'node:fs';
const OUT=[];const log=(...a)=>{console.log(...a);OUT.push(a.join(' '))};
const get=async u=>(await(await fetch(u,{headers:{'user-agent':'Mozilla/5.0 (FIELD probe)'}})).json());
for (const [lab,url] of [
 ['MLB 2026 IN-SEASON (today)','https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings'],
 ['NFL 2026 default','https://site.api.espn.com/apis/v2/sports/football/nfl/standings'],
]){
  const j=await get(url); log(`\n=== ${lab} ===`);
  for(const c of j.children||[]){
    const es=c.standings?.entries||[];
    const rows=es.map(e=>{const m=Object.fromEntries((e.stats||[]).map(s=>[s.name,s]));
      return{ab:e.team?.abbreviation,seed:m.playoffSeed?.value??null,w:m.wins?.value??0,l:m.losses?.value??0,t:m.ties?.value??0,cl:m.clincher?.displayValue??null};});
    const seeds=rows.map(r=>r.seed).filter(x=>x!=null);
    log(` ${c.name}: n=${rows.length} seedMin=${Math.min(...seeds)} seedMax=${Math.max(...seeds)} distinct=${new Set(seeds).size} clincherCount=${rows.filter(r=>r.cl).length}`);
    log('   ' + rows.sort((a,b)=>a.seed-b.seed).slice(0,8).map(r=>`${r.ab}:${r.seed}(${r.w}-${r.l})`).join('  '));
  }
}
fs.writeFileSync(`outbox/espn-inseason-seed-${new Date().toISOString().replace(/[:.]/g,'-')}.log`,OUT.join('\n'));
