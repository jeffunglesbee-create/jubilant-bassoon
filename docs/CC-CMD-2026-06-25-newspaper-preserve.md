# CC-CMD: Preserve #field-newspaper across applyMainHTML

**Date:** 2026-06-25
**Repo:** jubilant-bassoon
**Scope:** index.html + smoke.js + sw.js
**Rule 87:** Self-completing.

---

## ROOT CAUSE (verified 2026-06-25)

`renderNewspaper()` prepends `#field-newspaper` to `#main`.
`applyMainHTML()` calls `main.replaceChildren(...tmp.children)` where `tmp`
is built from the schedule HTML string only — `#field-newspaper` is not in it.
Result: every `renderAll()` call wipes the newspaper. `bootNewspaper()` only
fires once per page load so the newspaper never returns after the first wipe.

Three exit paths all destroy it:
- L10113 `main.innerHTML = ''` (empty-html path)
- L10143 `main.innerHTML = html` (morph catch fallback)
- L10151 `main.replaceChildren(...tmp.children)` (normal path)

Fix: detach `#field-newspaper` at the top of `applyMainHTML`, re-prepend
at every exit path. The LCP morph logic then runs against a clean `#main`.

---

## PROBE BLOCK (run first — verify before touching code)

```bash
cd /home/claude/jubilant-bassoon

# 1. Confirm function signature and first two lines (must match str_replace OLD)
sed -n '10109,10115p' index.html

# 2. Confirm morph catch block (must match str_replace OLD)
sed -n '10141,10145p' index.html

# 3. Confirm end try-catch block (must match str_replace OLD)
sed -n '10150,10156p' index.html

# 4. Confirm newspaper NOT preserved yet (these must NOT exist)
grep -n 'savedNewspaper' index.html | head -5

# 5. Confirm current SW_VERSION in sw.js
grep 'SW_VERSION' sw.js | head -1

# 6. Current highest smoke assertion
tail -30 smoke.js | grep "assert('"
```

Expected probe output:
- `savedNewspaper` → 0 matches (not yet added)
- SW_VERSION → `'2026-06-24h'` or similar

---

## TASK 1 — Add save+detach at top of applyMainHTML

**str_replace in index.html:**

OLD (exact match, L10109-10115):
```
function applyMainHTML(html){
  const main = document.getElementById('main');
  if (!main) return;
  if (!html || !html.trim()) {
    main.innerHTML = '';
    return;
  }
```

NEW:
```
function applyMainHTML(html){
  const main = document.getElementById('main');
  if (!main) return;
  // Preserve #field-newspaper across schedule re-renders. renderAll() calls
  // this function on every poll/filter/score update and would wipe the newspaper
  // via replaceChildren. Detach now; re-prepend at every exit path.
  const savedNewspaper = document.getElementById('field-newspaper');
  if (savedNewspaper) savedNewspaper.remove();
  if (!html || !html.trim()) {
    main.innerHTML = '';
    if (savedNewspaper) main.prepend(savedNewspaper);
    return;
  }
```

---

## TASK 2 — Re-prepend in morph catch fallback

**str_replace in index.html:**

OLD (exact match, L10141-10145):
```
    } catch(e) {
      // Defensive: if morph fails for any reason, fall back to plain innerHTML.
      main.innerHTML = html;
      return;
    }
```

NEW:
```
    } catch(e) {
      // Defensive: if morph fails for any reason, fall back to plain innerHTML.
      main.innerHTML = html;
      if (savedNewspaper) main.prepend(savedNewspaper);
      return;
    }
```

---

## TASK 3 — Re-prepend after normal replaceChildren path

**str_replace in index.html:**

OLD (exact match, L10150-10156):
```
  try {
    main.replaceChildren(...tmp.children);
  } catch(e) {
    // Defensive: extremely old browsers without replaceChildren — fall back.
    main.innerHTML = html;
  }
}
```

NEW:
```
  try {
    main.replaceChildren(...tmp.children);
  } catch(e) {
    // Defensive: extremely old browsers without replaceChildren — fall back.
    main.innerHTML = html;
  }
  if (savedNewspaper) main.prepend(savedNewspaper);
}
```

---

## TASK 4 — Smoke assertion

Add after `assert('A737 ...` block (after L5440 in smoke.js):

```js
assert('A738 — applyMainHTML preserves #field-newspaper: save+remove+prepend pattern present',
  html.includes("const savedNewspaper = document.getElementById('field-newspaper')") &&
  html.includes('if (savedNewspaper) savedNewspaper.remove()') &&
  /savedNewspaper\) main\.prepend\(savedNewspaper\)/.test(html),
  'applyMainHTML must save #field-newspaper before replaceChildren and re-prepend at every exit');
```

---

## TASK 5 — SW_VERSION bump

Read current SW_VERSION from sw.js. Advance the suffix letter (e.g. `2026-06-24h` →
`2026-06-24i`; or if date has rolled to June 25, reset to `2026-06-25a`).

Bump in BOTH files:
- `sw.js` line with `const SW_VERSION =`
- `index.html` line with `const SW_VERSION =`

---

## DONE CONDITIONS

```bash
# 1. Smoke passes
node smoke.js 2>&1 | tail -3
# Expected: N passed, 0 failed (N > 753)

# 2. A738 specifically passes
node smoke.js 2>&1 | grep -E 'A738|FAIL'
# Expected: no FAIL lines

# 3. savedNewspaper present in three locations
grep -c 'savedNewspaper' index.html
# Expected: 5 (1 declaration, 1 remove, 3 prepend calls)

# 4. SW_VERSION consistent
grep 'SW_VERSION' sw.js index.html | head -4
# Expected: same version in both files

# 5. No unintended changes
git diff --stat
# Expected: index.html, smoke.js, sw.js only
```

---

## COMMIT

Single commit after all tasks pass:
```
git add index.html smoke.js sw.js
git commit -m "fix: preserve #field-newspaper across applyMainHTML replaceChildren (A738)"
git push origin main
```

One commit. Do not split.
