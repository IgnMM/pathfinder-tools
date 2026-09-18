// Damage Calculator batch project -- Batch 42: ADD feats ENGINE (6 of 7).
// Regression coverage for the 1 newly added feat entry, plus guards on the
// already-present entries and the excluded/deferred entries this batch reports.
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
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1200);
}

test('Batch 42: Stunning Assault is present exactly once with a source link', () => {
  assert.equal(countId(html, 'stunning-assault'), 1);
  assert.match(block('stunning-assault'), /source:/);
});

test('Batch 42: Stunning Assault applies a flat -5 melee attack self-penalty', () => {
  const b = block('stunning-assault');
  assert.match(b, /compute:\(\)=>\(\{attack:-5,damage:0/);
});

test('Batch 42: Shield Snag and Skyseeker Impact were already present and correctly implemented -- left untouched', () => {
  assert.equal(countId(html, 'shield-snag'), 1);
  assert.match(block('shield-snag'), /free disarm/);
  assert.equal(countId(html, 'skyseeker-impact'), 1);
  assert.match(block('skyseeker-impact'), /cmb:4/);
});

test('Batch 42: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (skill/Ride/Str-check bonuses, Dex-for-damage redundant with the existing damage-ability dropdown, summoned/spell-guardian buffs, a temporary self-debuff with no attack/damage benefit, an untracked sneak-attack-dice baseline, a niche multi-step trigger chain, crit multiplier already directly editable in the weapon UI, or crit-confirmation maneuvers with no attack/damage number of their own)', () => {
  const excludedIds = [
    'siege-gunner', 'slashing-grace', 'slayers-feint', 'sling-flail', 'snake-fang',
    'spiritual-guardian', 'sproutling', 'starry-grace', 'stock-striker-takedown',
    'strangler-uc', 'strangler', 'street-carnage', 'summon-neutral-monster',
    'sundering-strike', 'swordplay-style', 'tripping-strike', 'undersized-mount',
    'untwisting-iron-strength',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 42: deferred entries were not added -- Shikigami Style needs the shared weapon-die-size-up engine list deferred for Cudgeler Style/Deadly Grappler; Startoss Comet, Startoss Shower and Stick-Fighting Maneuver add attacks outside the existing hasExtraAttack primitive; Unfettered Rage bundles an extra attack with a retroactive -2/-2 penalty to the whole round, also outside that primitive', () => {
  const deferredIds = [
    'shikigami-style', 'startoss-comet', 'startoss-shower',
    'stick-fighting-maneuver', 'unfettered-rage',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 42: Stunning Assault is not mirrored into companion/index.html', () => {
  assert.equal(countId(companionHtml, 'stunning-assault'), 0);
});
