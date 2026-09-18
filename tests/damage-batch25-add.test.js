// Damage Calculator batch project -- Batch 25: ADD traits DYNAMIC (1 of 1). All 4
// requested entries were excluded or deferred; nothing was added to the catalogue.
// This test file documents and guards those decisions so a future batch doesn't
// silently re-introduce one of them without re-litigating why it was rejected.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

test('Batch 25: Arcane Malignancies was not added -- its own "Calculator operation" text is an incoherent concatenation of unrelated rows from a d% random-drawback table (Blood of the Coven pg. 10), none of which is a reliable weapon attack/damage modifier', () => {
  assert.equal(countId(html, 'arcane-malignancies'), 0);
});

test('Batch 25: Draconic Infusion was not added -- it boosts SPELL damage specifically (1d4 extra energy damage to a spell target), not weapon/character damage, same exclusion reason as Elemental Pupil/Havoc of the Society/Volatile Conduit from batch 24', () => {
  assert.equal(countId(html, 'draconic-infusion'), 0);
});

test('Batch 25: Dualborn was not added -- its own verified rules text never states the numeric bonus energy damage per hit, so there is no value to implement without fabricating one', () => {
  assert.equal(countId(html, 'dualborn'), 0);
});

test('Batch 25: Focused Burn was deferred, not added -- its formula scales off an alchemist bomb\'s own fire-damage dice count, a quantity this calculator has no primitive for tracking separately from a generic weapon\'s damage dice', () => {
  assert.equal(countId(html, 'focused-burn'), 0);
});

test('Batch 25: full suite is unaffected -- no catalogue entries were added or changed by this batch', () => {
  assert.equal(countId(html, 'aberration-hunter'), 1, 'unrelated batch 24 entry should remain untouched');
});
