// Damage Calculator batch project -- Batch 55: ADD spells REVIEW/LIKELY EXCLUDE (1 of 2).
// This batch's 24 entries were all pre-flagged by the batch's own analysis as "likely
// exclude" (direct spell damage rather than a persistent modifier). Two entries survive
// that lean because they contain a genuine self-applicable, non-direct-damage bonus.
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

const implemented = ['resilient-reservoir', 'siphon-might'];

test('Batch 55: both implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 55: Resilient Reservoir grants a flat insight atk/dmg bonus equal to the reservoir points spent (configField, user-tracked resource)', () => {
  const b = block('resilient-reservoir');
  assert.match(b, /configFields:\[\{key:'points'/);
  assert.match(b, /let v=Math\.max\(0,cfg\.points\|\|0\);/);
});

test('Batch 55: Siphon Might applies a user-entered Strength enhancement bonus via abilityBuffBonus, rounded down to an even score bonus to avoid a fractional modifier, for the "grant to yourself" option', () => {
  const b = block('siphon-might');
  assert.match(b, /configFields:\[\{key:'bonus'/);
  assert.match(b, /let bonus=Math\.floor\(Math\.max\(0,cfg\.bonus\|\|0\)\/2\)\*2;/);
  assert.match(b, /abilityBuffBonus\(ctx,'str',bonus,'enhancement'\)/);
});

test("Batch 55: excluded entries were not added -- all 22 remaining entries deal spell damage directly to an enemy, summon a separate attacking entity, or grant no attack/damage-relevant self benefit, confirming the batch's own pre-analysis", () => {
  const excludedIds = [
    'arboreal-hammer', 'biting-words', 'black-tentacles', 'clashing-rocks',
    'clenched-fist', 'crushing-hand', 'familiar-figment', 'flesh-wall',
    'force-punch', 'gebs-hammer', 'gust-of-wind', 'jatembes-ire',
    'jolting-portent', 'last-azlantis-defending-sword',
    'last-azlantis-defending-sword-mass', 'limp-lash', 'mark-of-spite',
    'masochistic-shadow', 'poisonous-balm', 'ray-of-enfeeblement',
    'rigor-mortis', 'tar-ball',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 55: neither implemented spell is mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
