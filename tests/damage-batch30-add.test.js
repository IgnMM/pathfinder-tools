// Damage Calculator batch project -- Batch 30: ADD feats FIXED/CONDITIONAL (4 of 6).
// Regression coverage for the 7 newly added feat entries, plus guards on the
// excluded/deferred entries this batch reports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');
const companionHtml = fs.readFileSync(path.join(__dirname, '../companion/index.html'), 'utf8');

const BATCH_30_ADDED_IDS = [
  'prone-slinger', 'raging-blood', 'reap-the-infirm', 'regenerate-muscles',
  'scorching-weapons', 'serrens-masterstroke', 'siege-engineer',
];

function countId(source, id) {
  const re = new RegExp(`id:['"]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
  return (source.match(re) || []).length;
}

function block(id) {
  const start = html.indexOf(`id:'${id}'`) >= 0 ? html.indexOf(`id:'${id}'`) : html.indexOf(`id:"${id}"`);
  assert.ok(start >= 0, `${id} must exist`);
  const nextEntry = html.indexOf('\n{id:', start + 5);
  return html.slice(start, nextEntry > 0 ? nextEntry : start + 1400);
}

test('Batch 30: all 7 newly added entries are present exactly once, each with a source link', () => {
  for (const id of BATCH_30_ADDED_IDS) {
    assert.equal(countId(html, id), 1, `${id} should appear exactly once in calc/index.html`);
    assert.match(block(id), /source:/);
  }
});

test('Batch 30 (reuses the batch-26 ctx.proneOn engine hook): Prone Slinger grants +2 atk only while Prone is active', () => {
  const b = block('prone-slinger');
  assert.match(b, /if\(!ctx\.proneOn\)/);
  assert.match(b, /return \{attack:2,damage:0,/);
});

test('Batch 30: Raging Blood grants +2 morale to Strength and Constitution', () => {
  const b = block('raging-blood');
  assert.match(b, /abilityBuffBonus\(ctx,'str',2\),r2=abilityBuffBonus\(ctx,'con',2\)/);
});

test('Batch 30: Reap the Infirm adds 1d6 precision damage via extraDice (not multiplied on a crit)', () => {
  const b = block('reap-the-infirm');
  assert.match(b, /extraDice:\{normal:'1d6'\}/);
});

test('Batch 30: Regenerate Muscles grants +2 enhancement to Strength', () => {
  const b = block('regenerate-muscles');
  assert.match(b, /abilityBuffBonus\(ctx,'str',2\)/);
});

test('Batch 30: Scorching Weapons grants a flat +1 fire damage (crit-multiplied like a weapon special ability, unlike extraDice)', () => {
  const b = block('scorching-weapons');
  assert.match(b, /compute:\(\)=>\(\{attack:0,damage:1,/);
});

test('Batch 30: Serren\'s Masterstroke scales its precision damage by BAB tier (2d6 base, 3d6 at BAB 11, 4d6 at BAB 16)', () => {
  const b = block('serrens-masterstroke');
  assert.match(b, /let n=bab>=16\?4:bab>=11\?3:2;/);
  assert.match(b, /extraDice:\{normal:n\+'d6'\}/);
});

test('Batch 30: Siege Engineer grants a flat +1 attack bonus, siege weapons only', () => {
  const b = block('siege-engineer');
  assert.match(b, /compute:\(\)=>\(\{attack:1,damage:0,/);
});

test('Batch 30: excluded entries were not added -- none is a bonus to the character\'s own attack or damage roll (they model unmodeled penalties/conditions, buff a mount/allies, or are pure defensive/social/object effects)', () => {
  const excludedIds = [
    'rapid-reload', 'reinforced-crafting', 'saddle-shrieker', 'seething-hatred',
    'shared-quarry', 'shield-brace', 'shield-proficiency', 'shield-specialization',
    'shrug-on', 'simple-weapon-proficiency', 'sin-sharing-critical', 'smash',
    'spirit-beacon', 'spirit-sight',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 30: deferred entries were not added -- each depends on multi-entity ally state, rerouting another entry\'s own ability-targeting logic, or risks double-counting the baseline Strength-to-damage math', () => {
  const deferredIds = ['ranged-feint', 'redistributed-might', 'returning-throw', 'small-but-deadly'];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 30: no newly added entry is mirrored into companion/index.html', () => {
  for (const id of BATCH_30_ADDED_IDS) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion/index.html`);
  }
});
