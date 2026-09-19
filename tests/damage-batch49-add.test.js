// Damage Calculator batch project -- Batch 49: ADD spells DYNAMIC (3 of 3, final).
// This closes out the ADD spells DYNAMIC tier (batches 47-49).
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
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1600);
}

const implemented = ['smite-abomination', 'tactical-acumen', 'unhallowed-blows-greater'];

test('Batch 49: all 3 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 49: Smite Abomination grants max(cha,wis) atk / CL dmg, undead target only', () => {
  const b = block('smite-abomination');
  assert.match(b, /ctx\.currentTarget!=='undead'/);
  assert.match(b, /Math\.max\(ctx\.cha\|\|0,ctx\.wis\|\|0\)/);
});

test('Batch 49: Tactical Acumen grants +1 insight atk per 5 CL above 5th (min +1, cap +4)', () => {
  const b = block('tactical-acumen');
  assert.match(b, /Math\.min\(4,1\+Math\.floor\(Math\.max\(0,cl-5\)\/5\)\)/);
});

test('Batch 49: Unhallowed Blows, Greater grants +1 atk/dmg per 4 CL (cap +5), natural/unarmed attacks only', () => {
  const b = block('unhallowed-blows-greater');
  assert.match(b, /Math\.min\(5,Math\.floor\(\(cfg\.cl\|\|1\)\/4\)\)/);
  assert.match(b, /ctx\.weaponCategory!=='natural'&&ctx\.weaponCategory!=='unarmed'/);
});

test('Batch 49: excluded entries were not added -- Slow, Solid Fog, Sword to Snake, Symbol of Pain, Tieldlara\'s Feint, Touch of Gracelessness, Transmute Metal to Wood, Transmute Rock to Mud, Warp Metal and Warp Wood are debuffs/traps the character casts on an enemy or an enemy\'s equipment; Sonic Thrust is a one-off spell attack action; Strangling Hair, Symbol of Striking and Wilderness Soldiers summon a separate attacking entity, not a modifier to the character\'s own attack; Spider Climb, Sturdy Tree Fort and Visualization of the Body have no attack/damage channel; Verminous Transformation and Wreath of Blades are standalone AoE damage effects, not modifiers to an existing attack roll', () => {
  const excludedIds = [
    'slow', 'solid-fog', 'sonic-thrust', 'spider-climb', 'strangling-hair',
    'sturdy-tree-fort', 'sword-to-snake', 'symbol-of-pain', 'symbol-of-striking',
    'tieldlaras-feint', 'touch-of-gracelessness', 'transmute-metal-to-wood',
    'transmute-rock-to-mud', 'verminous-transformation', 'visualization-of-the-body',
    'warp-metal', 'warp-wood', 'wilderness-soldiers', 'wreath-of-blades',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 49: deferred entries were not added -- Tail Strike and Wing Thorns grant an entirely new natural attack (a tail slam; two wing attacks), matching the Monstrous Extremities / Savage Maw precedent deferred in earlier batches', () => {
  assert.equal(countId(html, 'tail-strike'), 0);
  assert.equal(countId(html, 'wing-thorns'), 0);
});

test('Batch 49: none of the 3 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
