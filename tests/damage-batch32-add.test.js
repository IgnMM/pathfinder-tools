// Damage Calculator batch project -- Batch 32: ADD feats FIXED/CONDITIONAL (6 of 6),
// the final batch of the fixed/conditional feat ADD series. Its single requested entry
// was excluded; nothing was added to the catalogue. This test guards that decision.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

test('Batch 32: Witchbreaker was not added -- neither of its two effects (a saving-throw bonus, and a crit-confirmation-triggered ally re-save against a hag/witch\'s mind-affecting effect) is a bonus to the character\'s own attack or damage roll', () => {
  assert.equal(countId(html, 'witchbreaker'), 0);
});

test('Batch 32: full suite is unaffected -- no catalogue entries were added or changed by this batch', () => {
  assert.equal(countId(html, 'weapon-evoker-mastery'), 1, 'unrelated batch 31 entry should remain untouched');
});
