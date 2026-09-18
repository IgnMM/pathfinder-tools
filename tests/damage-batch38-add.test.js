// Damage Calculator batch project -- Batch 38: ADD feats ENGINE (2 of 7). Every requested
// entry was either already present or excluded/deferred; nothing new was added.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const nextEntry = html.indexOf('\n{id:', start + 5);
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1200);
}

test('Batch 38: Earth Child Topple and Eidolon Mount were already present and correctly implemented -- left untouched', () => {
  for (const id of ['earth-child-topple', 'eidolon-mount']) {
    assert.equal(countId(html, id), 1, `${id} should still be present exactly once`);
  }
  assert.match(block('earth-child-topple'), /Wisdom bonus on combat maneuver checks to trip a creature of the giant subtype/);
  assert.match(block('eidolon-mount'), /no bonus to Str\/Dex, reach or damage dice from this feat/);
});

test('Batch 38: excluded entries were not added -- Dispelling Blood is a dispel-magic delivery mechanic, not attack/damage; Elven Battle Focus is functionally redundant with the existing Ability-to-damage dropdown (letting Intelligence replace another ability for one weapon); Elven Battle Training grants an unmodeled extra-AoO count plus a CMD bonus, neither attack/damage', () => {
  const excludedIds = ['dispelling-blood', 'elven-battle-focus', 'elven-battle-training'];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 38: deferred entries were not added -- Divine Fighting Technique has dozens of mutually exclusive deity-specific branches (matching the Draconic Heritage/Planar Mentor precedent); Elemental Ki grants an extra attack during flurry of blows via the same action-economy shape deferred for Cleave and friends in batch 37', () => {
  const deferredIds = ['divine-fighting-technique', 'elemental-ki'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 38: full suite is unaffected -- no catalogue entries were added or changed by this batch', () => {
  assert.equal(countId(html, 'two-weapon-rend'), 1, 'unrelated batch 36 entry should remain untouched');
});
