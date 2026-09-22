// Rule 90 for dupKeys. Its whole value is catching one shape, so that shape is
// the first case — reconstructed from the file as it actually shipped.
const MOD = process.env.DUPKEYS_MODULE || './check-workflow-dup-keys.mjs';
const { dupKeys } = await import(MOD);

let bad = 0, n = 0;
const eq = (label, got, want) => { n++;
  if (JSON.stringify(got) === JSON.stringify(want)) console.log(`ok    ${label}`);
  else { bad++; console.log(`FAIL  ${label}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`); } };

// THE REAL DEFECT, as committed in tennis-live-probe.yml.
const SHIPPED = `jobs:
  probe:
    steps:
      - name: Probe the deployed page
        id: probe
        env:
          PROBE_TRIGGER: \${{ github.event_name }}
        run: node tennis_live_probe.js
        env:
          FIELD_URL: https://example.invalid
`;
eq('THE SHIPPED DEFECT IS CAUGHT', dupKeys(SHIPPED).map(d => d.key), ['env']);

// The same file, merged the way it was fixed.
const FIXED = `jobs:
  probe:
    steps:
      - name: Probe the deployed page
        id: probe
        env:
          PROBE_TRIGGER: \${{ github.event_name }}
          FIELD_URL: https://example.invalid
        run: node tennis_live_probe.js
`;
eq('...and the merged version is not', dupKeys(FIXED), []);

// Two steps may each have their own env — same key, different blocks.
const SIBLINGS = `steps:
  - name: a
    env:
      X: '1'
    run: echo a
  - name: b
    env:
      X: '2'
    run: echo b
`;
eq('SIBLING STEPS MAY REPEAT A KEY', dupKeys(SIBLINGS), []);

// The same env var twice inside ONE env block is also invalid.
const INNER = `steps:
  - name: a
    env:
      X: '1'
      X: '2'
    run: echo a
`;
eq('a repeated key inside one mapping is caught', dupKeys(INNER).map(d => d.key), ['X']);

// A shell script is data. `foo: bar` in a run block is not a YAML key, and
// flagging it would make this check unusable on any workflow that echoes YAML.
// TWO of them, so the fixture can actually discriminate. One `env:` inside the
// scalar cannot duplicate anything, so the first version of this case passed
// whether block scalars were skipped or not — mutation K3 survived it.
const SCRIPT = `steps:
  - name: a
    run: |
      echo "name: x"
      env: notakey
      env: alsonotakey
  - name: b
    run: echo b
`;
eq('KEYS INSIDE A BLOCK SCALAR ARE NOT KEYS', dupKeys(SCRIPT), []);

// Top-level duplicates matter too.
eq('a duplicate top-level key is caught',
  dupKeys('name: x\non:\n  push: {}\nname: y\n').map(d => d.key), ['name']);

// Comments and blank lines must not shift the indentation tracking.
const COMMENTED = `steps:
  - name: a
    # a comment at step indent
    env:
      X: '1'

    run: echo a
`;
eq('comments and blank lines do not create false positives', dupKeys(COMMENTED), []);

// The line number is what makes the failure actionable.
eq('the duplicate reports its line', dupKeys(SHIPPED)[0].line, 9);

console.log(`\n${n - bad}/${n} checks passed`);
console.log('COVERAGE: dupKeys on fixtures. It does NOT read .github/workflows or');
console.log('confirm GitHub accepts any real file.');
process.exit(bad ? 1 : 0);
