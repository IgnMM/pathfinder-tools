// Damage Calculator batch project -- Batch 53: ADD spells ENGINE (4 of 4, final).
// This closes out the ADD spells ENGINE tier (batches 50-53).
// Regression coverage for the 3 newly added spell entries, plus guards on the
// excluded/deferred entries.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const nextEntry = html.indexOf('\n{id:', start + 5);
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1800);
}

const implemented = ['steal-size', 'thorn-body', 'vex-giant'];

test('Batch 53: all 3 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 53: Steal Size mirrors Enlarge Person on the caster -- +2 size Strength, -2 size Dexterity, always-on -1 size attack penalty', () => {
  const b = block('steal-size');
  assert.match(b, /abilityBuffBonus\(ctx,'str',2,'size'\)/);
  assert.match(b, /abilityBuffBonus\(ctx,'dex',-2,'size'\)/);
  assert.match(b, /let atk=-1\+rStr\.attack\+rDex\.attack;/);
});

test('Batch 53: Thorn Body adds +1d6 piercing damage via extraDice, natural/unarmed attacks only', () => {
  const b = block('thorn-body');
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
  assert.match(b, /ctx\.weaponCategory!=='natural'&&ctx\.weaponCategory!=='unarmed'/);
});

test('Batch 53: Vex Giant adds +1d6 damage via extraDice (first hit vs a larger focused foe)', () => {
  const b = block('vex-giant');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,extraDice:\{normal:'1d6'\}/);
});

test('Batch 53: excluded entries were not added -- Shadow Weapon and Spiritual Ally/Twilight Knife conjure a weapon or summon a separate attacking entity, not a modifier to the character\'s own attack; Telekinesis, Telekinetic Volley and Thunderstomp are one-off spell attacks/CMB checks; Tree Shape has no attack/damage channel; Unshakable Chill and Waters of Lamashtu are debuffs the character casts on an enemy; Wall of Clockwork is a standalone AoE hazard, not an attack-roll modifier', () => {
  const excludedIds = [
    'shadow-weapon', 'spiritual-ally', 'twilight-knife', 'telekinesis',
    'telekinetic-volley', 'thunderstomp', 'tree-shape', 'unshakable-chill',
    'waters-of-lamashtu', 'wall-of-clockwork',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 53: deferred entries were not added -- Stone Throwing grants an entirely new size-based thrown-rock attack option; Undead Anatomy I-IV and Vermin Shape I-II are full polymorphs matching the Beast Shape precedent; Vengeful Stinger grants a new AoO-triggered stinger attack with its own critical range, matching the Aspect of the Stag precedent', () => {
  const deferredIds = [
    'stone-throwing', 'undead-anatomy-i', 'undead-anatomy-ii', 'undead-anatomy-iii',
    'undead-anatomy-iv', 'vermin-shape-i', 'vermin-shape-ii', 'vengeful-stinger',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 53: none of the 3 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
