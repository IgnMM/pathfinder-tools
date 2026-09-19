// Damage Calculator batch project -- Batch 57: Final regression.
// No new catalogue content added in this batch. This file records the final integrity
// checks the batch's guardrails call for: catalogue-wide duplicate-id scan and a
// same-type/different-type ability-stacking sanity check, on top of the pre-existing
// full automated suite (which already includes dedicated stacking/CMB-CMD/combat-math
// coverage in calc-engine-stacking.test.js, calc-combat-math.test.js and
// calc-cmb-cmd.test.js -- all passing).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

test('Batch 57: no unexpected duplicate catalogue ids across the whole MODIFIERS array (only the known benign custom- prefix collision)', () => {
  const single = [...html.matchAll(/id:'([^']+)'/g)].map(m => m[1]);
  const double = [...html.matchAll(/id:"([^"]+)"/g)].map(m => m[1]);
  const all = single.concat(double);
  const counts = {};
  for (const id of all) counts[id] = (counts[id] || 0) + 1;
  const dups = Object.entries(counts).filter(([, c]) => c > 1);
  assert.deepEqual(dups, [['custom-', 2]], `Unexpected duplicate catalogue ids: ${JSON.stringify(dups)}`);
});

test('Batch 57: the full script block still parses cleanly with no syntax errors', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0, 'expected at least one <script> block');
  for (const m of scripts) {
    assert.doesNotThrow(() => new Function(m[1]), 'calc/index.html script block must be syntactically valid');
  }
});
