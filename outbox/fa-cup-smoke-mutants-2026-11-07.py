# Mutation harness for the FA Cup smoke block (FA-1..FA-8). Run it on a COPY of the tree: it rewrites index.html in the copy and restores it.
# Copy used 2026-11-07: tar of jubilant-bassoon without .git and node_modules, then python3 mutfa.py. D below is that copy's path.
#!/usr/bin/env python3
# Mutation harness for the FA Cup smoke block (FA-1..FA-8) on a COPY of the tree (mutfa/). Each mutant is a single anchored replace on index.html;
# the harness asserts the anchor is unique and the text changed BEFORE running (a mutant that mutated nothing would print "caught" by luck or
# "survived" falsely: Rule 90's corollary). A mutant is CAUGHT when smoke exits non-zero AND a named FA-* assertion in `expect` failed.
import subprocess, re, sys, json
D='/tmp/claude-0/-home-user/dfa35103-8193-50fb-8b54-7f960ab15595/scratchpad/mutfa'
orig=open(f'{D}/index.html').read()
def run():
    r=subprocess.run(['node','smoke.js','index.html'],cwd=D,capture_output=True,text=True)
    out=r.stdout+r.stderr
    failed=re.findall(r'❌ (\S+)',out)
    m=re.search(r'(\d+) passed, (\d+) failed',out)
    return r.returncode, failed, (m.group(0) if m else 'no results line')
# (name, anchor, replacement, expected failing ids)
M=[
 ('F7a classifySport drops fa cup',"conference league|efl|fa cup|uecl","conference league|efl|uecl",['FA-7','FA-8']),
 ('F7b sportCountLabel drops fa cup',"|efl|fa cup|mls|nwsl","|efl|mls|nwsl",['FA-7','FA-8']),
 ('F7c detectSportClass drops fa cup',"sp.includes('efl') || sp.includes('fa cup')) return 'soccer';","sp.includes('efl')) return 'soccer';",['FA-7','FA-8']),
 ('F7d sportContext drops fa cup',"sp.includes('efl')||sp.includes('fa cup')||sp.includes('championship'))\n    return {periodFmt","sp.includes('efl')||sp.includes('championship'))\n    return {periodFmt",['FA-7','FA-8']),
 ('F7e getFieldVoice drops fa cup',"sp.includes('efl') || sp.includes('fa cup') || sp.includes('uecl') || sp.includes('uel')) return FIELD_SOCCER_VOICE;","sp.includes('efl') || sp.includes('uecl') || sp.includes('uel')) return FIELD_SOCCER_VOICE;",['FA-7','FA-8']),
 ('F8a voice exemplar drops fa cup',"sp.includes('efl') || sp.includes('fa cup') ||\n","sp.includes('efl') ||\n",['FA-8']),
 ('F8b jq tags drop fa cup',"'efl','fa cup','wc26'","'efl','wc26'",['FA-8']),
 ('F8c wwVerb drops fa cup',"_wwSport.includes('efl')||_wwSport.includes('fa cup')||","_wwSport.includes('efl')||",['FA-8']),
 ('F8d Night Owl prompt drops fa cup',"_sp.includes('efl') || _sp.includes('fa cup') ||","_sp.includes('efl') ||",['FA-8']),
 ('F8e countdown drops fa cup',"sp.includes('efl') || sp.includes('fa cup') || sp.includes('world","sp.includes('efl') || sp.includes('world",['FA-8']),
 ('F7f findScore stops treating a soccer game as soccer',"const gameSoccer = sc.isSoccer;\n  // PM-24: aggregate witnesses across all fuzzy-matched keys","const gameSoccer = false;\n  // PM-24: aggregate witnesses across all fuzzy-matched keys",['FA-7']),
 ('F7g findScore keys the witness on the wrong team order',"matches = (espnTeamMatch(hn, home) && espnTeamMatch(an, away)) ||","matches = (espnTeamMatch(hn, 'zzz') && espnTeamMatch(an, away)) ||",['FA-7']),
 ('G1 gate removed in fetchSoccerFixtures',"streams:(bundleIfListed && !espnListsBroadcast(comp, bundleIfListed)) ? [] : resolveBundle(bundle),","streams:resolveBundle(bundle),",['FA-4']),
 ('G2 gate removed in the sweep',"streams: (bundleIfListed && !espnListsBroadcast(comp, bundleIfListed)) ? [] : resolveBundle(bundle),","streams: resolveBundle(bundle),",['FA-4']),
 ('G3 limit back to 30',"limit=${limit||30}`);","limit=30`);",['FA-3']),
 ('M27a gate survives only in a trailing comment (fetchSoccerFixtures)',"streams:(bundleIfListed && !espnListsBroadcast(comp, bundleIfListed)) ? [] : resolveBundle(bundle),","streams:resolveBundle(bundle), // streams:(bundleIfListed && !espnListsBroadcast(comp, bundleIfListed)) ? [] : resolveBundle(bundle),",['FA-4']),
 ('M27b gate survives only in a trailing comment (sweep)',"streams: (bundleIfListed && !espnListsBroadcast(comp, bundleIfListed)) ? [] : resolveBundle(bundle),","streams: resolveBundle(bundle), // streams: (bundleIfListed && !espnListsBroadcast(comp, bundleIfListed)) ? [] : resolveBundle(bundle),",['FA-4']),
 ('M28 limit template survives only in a trailing comment',"limit=${limit||30}`);","limit=30`); // limit=${limit||30}`);",['FA-3']),
 ('M10a limit dropped from the fetchSoccerFixtures destructure',"async ({league,section,bundle,scoresOnly,leagueLabel,limit,bundleIfListed})=>{","async ({league,section,bundle,scoresOnly,leagueLabel,bundleIfListed})=>{",['FA-4']),
 ('M10b bundleIfListed dropped from the fetchSoccerFixtures destructure',"async ({league,section,bundle,scoresOnly,leagueLabel,limit,bundleIfListed})=>{","async ({league,section,bundle,scoresOnly,leagueLabel,limit})=>{",['FA-4']),
 ('M9 bundleIfListed dropped from the sweep destructure',"async ({sport,league,section,bundle,bundleIfListed,prefix,groupsParam})=>{","async ({sport,league,section,bundle,prefix,groupsParam})=>{",['FA-4']),
 ('M9b sweep stops carrying the field into FETCH_LEAGUES',"bundle:l.bundle,bundleIfListed:l.bundleIfListed,prefix","bundle:l.bundle,prefix",['FA-4']),
 ('E1 FA_CUP key is not ESPN+ alone',"FA_CUP:       [\"espnplus\"],","FA_CUP:       [\"espnplus\",\"fubo\"],",['FA-2']),
 ('E2 entry names a bundle that does not exist',"bundle: 'FA_CUP', leagueLabel: 'FA Cup'","bundle: 'FA_CUPP', leagueLabel: 'FA Cup'",['FA-1','FA-2']),
 ('E3 FA Cup label added to the domestic-break table',"const DOMESTIC_LEAGUE_BREAK_2026 = {","const DOMESTIC_LEAGUE_BREAK_2026 = { 'FA Cup': { end: '2026-01-01', resume: '2026-12-31' },",['FA-6']),
]
res=[]
bad=0
for name,a,b,exp in M:
    n=orig.count(a)
    if n!=1:
        print(f'ANCHOR-NOT-UNIQUE ({n}): {name}'); bad+=1; res.append((name,'ANCHOR',n)); continue
    mut=orig.replace(a,b)
    assert mut!=orig
    open(f'{D}/index.html','w').write(mut)
    rc,failed,tot=run()
    caught = rc!=0 and all(e in failed for e in exp)
    extra=[f for f in failed if f not in exp]
    print(('CAUGHT   ' if caught else 'SURVIVED ')+name+f'  failed={failed} {tot}')
    if not caught: bad+=1
    res.append((name,'CAUGHT' if caught else 'SURVIVED',failed))
open(f'{D}/index.html','w').write(orig)
rc,failed,tot=run()
print('restored control:',rc,failed,tot)
print(f'{len(M)-bad} of {len(M)} mutants caught')
json.dump(res,open('/tmp/claude-0/-home-user/dfa35103-8193-50fb-8b54-7f960ab15595/scratchpad/mutfa-result.json','w'))
sys.exit(1 if bad else 0)
