# Mutation harness for the findScore gate (FS-1..FS-4): seven mutants of the exact-pair preference. Run on a COPY of the tree; it rewrites index.html in the copy and restores it.
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
 ('S1 the exact-ESPN test is disabled',"const _hasExactEspn = Object.entries(_scoresBySource).some(","const _hasExactEspn = false && Object.entries(_scoresBySource).some(",['FS-1']),
 ('S2 the exact-pair test is inverted',"const espnIsOtherGame = _hasExactEspn && !!entry.espn && !_exactPair(hn, an);","const espnIsOtherGame = _hasExactEspn && !!entry.espn && _exactPair(hn, an);",['FS-1']),
 ('S3 the witness update ignores the other-game flag',"if (entry.espn && !espnIsOtherGame && (!espnWitness","if (entry.espn && (!espnWitness",['FS-4']),
 ('S4 the probe ignores the other-game flag',"const probe = (espnIsOtherGame ? null : entry.espn) || entry.apisports;","const probe = entry.espn || entry.apisports;",['FS-4']),
 ('S5 the exact preference is widened to every slot (api-sports short names dropped)',"    const espnIsOtherGame = _hasExactEspn","    if (_hasExactEspn && !_exactPair(hn, an)) continue;\n    const espnIsOtherGame = _hasExactEspn",['FS-2']),
 ('S6 the fuzzy fallback is removed when no exact entry exists',"    const espnIsOtherGame = _hasExactEspn","    if (!_hasExactEspn) continue;\n    const espnIsOtherGame = _hasExactEspn",['FS-3']),
 ('S7 the exact pair ignores the reversed orientation',"const _exactPair = (h, a) => (h === home && a === away) || (h === away && a === home);","const _exactPair = (h, a) => (h === home && a === away);",[]),
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
