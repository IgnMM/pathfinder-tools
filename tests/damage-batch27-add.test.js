// Damage Calculator batch project -- Batch 27: ADD feats FIXED/CONDITIONAL (1 of 6).
// Regression coverage for the 4 newly added feat entries, plus a guard on the excluded/
// deferred entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_27_ADDED_IDS = ['blood-frenzy-strike', 'blood-frenzy-style', 'blood-vengeance', 'burn-burn-burn'];

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

test('Batch 27: all 4 newly added entries are present exactly once, each with a source link', () => {
  for (const id of BATCH_27_ADDED_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
    assert.match(block(id), /source:/);
  }
});

test('Batch 27: Blood Frenzy Strike is gated to natural/unarmed attacks and adds 1d6 bleed via extraDice (not multiplied on a crit)', () => {
  const b = block('blood-frenzy-strike');
  assert.match(b, /if\(ctx\.weaponCategory!=='natural'&&ctx\.weaponCategory!=='unarmed'\)/);
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
});

test('Batch 27: Blood Frenzy Style grants +2 untyped to Strength and Constitution, only changing attack/damage when one of those is the selected ability', () => {
  const b = block('blood-frenzy-style');
  assert.match(b, /abilityBuffBonus\(ctx,'str',2\),r2=abilityBuffBonus\(ctx,'con',2\)/);
});

test('Batch 27: Blood Vengeance grants +2 morale to Strength and Constitution', () => {
  const b = block('blood-vengeance');
  assert.match(b, /type:'morale'/);
  assert.match(b, /abilityBuffBonus\(ctx,'str',2\),r2=abilityBuffBonus\(ctx,'con',2\)/);
});

test('Batch 27: Burn! Burn! Burn! adds 1d4 fire damage via extraDice (not multiplied on a crit), scoped to nonmagical/alchemical fire attacks only', () => {
  const b = block('burn-burn-burn');
  assert.match(b, /extraDice:\{normal:'1d4'\}/);
  assert.match(b, /not a magical attack or splash damage/);
});

test('Batch 27: excluded entries were not added -- none is a bonus to the character/companion\'s own attack or damage roll', () => {
  const excludedIds = [
    'armor-proficiency-light', 'augment-summoning', 'awesome-blow', 'blissful-spell',
    'brute-assault', 'but-a-scratch', 'city-locked',
    'confounding-tumble-deed', 'dual-enhancement', 'andoren-falconry', 'defending-eidolon',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 27: Breaker of Barriers was already present and correctly implemented (models its +2 CMB on bull rush/overrun; the barrier-specific Strength-check and hardness effects stay correctly unmodeled) -- left untouched', () => {
  assert.equal(countId(html, 'breaker-of-barriers'), 1);
  const b = block('breaker-of-barriers');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:0,cmb:2,note:'\+2 CMB \(bull rush\/overrun only\)'\}\)/);
});

test('Batch 27: deferred entries were not added -- each requires multi-entity state, a resource pool, a crit-triggered special effect, or a range-penalty primitive this engine doesn\'t have', () => {
  const deferredIds = [
    'amplified-rage', 'arc-slinger', 'bashing-finish', 'coordinated-shot', 'crane-riposte',
    'destroy-identity', 'disengaging-shot', 'disrupting-fist', 'distance-thrower',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 27: no newly added entry is mirrored into companion/index.html', () => {
  for (const id of BATCH_27_ADDED_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
