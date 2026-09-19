// Damage Calculator batch project -- Batch 56: ADD spells REVIEW/LIKELY EXCLUDE (2 of 2, final).
// This closes out the ADD spells REVIEW/LIKELY EXCLUDE tier (batches 55-56).
// All 5 entries in this small batch were pre-flagged "likely exclude" by the batch's own
// analysis. Audit confirmed all 5: each deals damage directly to an enemy/self-harm
// target, or has no attack/damage channel at all (pure AC/save/cosmetic effects).
// No implementations; this file records the audit result as regression coverage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

test("Batch 56: excluded entries were not added -- Tar Pool and Teratoid Caress are AoE/touch effects the character inflicts on an enemy; Terrible Remorse is a self-harm compulsion cast on an enemy; Unholy Aura is a purely defensive AC/save/SR ward with no attack/damage channel (the 1d6 Strength damage applies to an ATTACKER who hits the warded creature, not a bonus to the warded creature's own attack); Wizened Appearance is a cosmetic-only aging effect that explicitly doesn't alter ability scores", () => {
  const excludedIds = ['tar-pool', 'teratoid-caress', 'terrible-remorse', 'unholy-aura', 'wizened-appearance'];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});
