// Damage Calculator batch project -- Batch 31: ADD feats FIXED/CONDITIONAL (5 of 6).
// Regression coverage for the 4 newly added feat entries, plus a guard on the
// excluded/deferred entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_31_ADDED_IDS = ['sword-and-pistol', 'sympathetic-rage', 'under-and-over', 'weapon-evoker-mastery'];

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

test('Batch 31: all 4 newly added entries are present exactly once, each with a source link', () => {
  for (const id of BATCH_31_ADDED_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
    assert.match(block(id), /source:/);
  }
});

test('Batch 31: Sword and Pistol grants a flat +1 attack bonus, crossbow/firearm only', () => {
  const b = block('sword-and-pistol');
  assert.match(b, /compute:\(\)=>\(\{attack:1,damage:0,/);
});

test('Batch 31: Sympathetic Rage grants +2 morale to Strength and Constitution', () => {
  const b = block('sympathetic-rage');
  assert.match(b, /abilityBuffBonus\(ctx,'str',2\),r2=abilityBuffBonus\(ctx,'con',2\)/);
});

test('Batch 31: Under and Over grants +2 CMB, trip only', () => {
  const b = block('under-and-over');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,cmb:2,/);
});

test('Batch 31: Weapon Evoker Mastery adds 1d4 elemental damage via extraDice (not multiplied on a crit)', () => {
  const b = block('weapon-evoker-mastery');
  assert.match(b, /extraDice:\{normal:'1d4'\}/);
});

test('Batch 31 correction: Scorching Weapons from batch 30 was using a flat damage number, which gets multiplied by the crit multiplier through the normal atk/dmg pipeline -- but weapon-elemental-damage effects (like Holy Sword\'s dice) are established in this engine as extraDice.normal (added once, never multiplied), matching real PF1 rules for weapon special ability damage. Fixed for consistency.', () => {
  const b = block('scorching-weapons');
  assert.match(b, /extraDice:\{normal:'1'\}/);
  assert.doesNotMatch(b, /compute:\(\)=>\(\{attack:0,damage:1,/);
});

test('Batch 31: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (they buff a phantom/eidolon/companion/allies, grant AC/DR/skill/movement bonuses, debuff enemies attacking the character, or model unmodeled proficiency/armor-check penalties)', () => {
  const excludedIds = [
    'spiritualists-call', 'stage-combatant', 'stalwart', 'stance-of-the-xorn',
    'studied-expertise', 'summoners-call', 'survivor', 'swift-iron-style',
    'taldan-duelist', 'tenacious-hunter', 'touched-by-sacred-fire',
    'tower-shield-proficiency', 'tower-shield-specialist', 'two-weapon-defense',
    'upsetting-shield-style', 'upsetting-vengeance', 'vengeful-death-vow',
    'weapon-shift', 'wind-rider',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 31: deferred entries were not added -- each is a complete alternate multi-attack sequence or a multi-step trigger chain, not representable as a flat modifier onto normal attacks', () => {
  const deferredIds = ['surprise-follow-through', 'twin-fang-strike'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 31: no newly added entry is mirrored into companion/index.html', () => {
  for (const id of BATCH_31_ADDED_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
