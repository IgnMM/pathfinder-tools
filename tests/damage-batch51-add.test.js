// Damage Calculator batch project -- Batch 51: ADD spells ENGINE (2 of 4).
// Regression coverage for the 2 newly added spell entries, plus guards on the
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

const implemented = ['halfling-vengeance-mass', 'harrowing-greater'];

test('Batch 51: both implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 51: Halfling Vengeance, Mass adds nd6 precision damage via extraDice, n = 1 + floor(CL/4), capped at 5', () => {
  const b = block('halfling-vengeance-mass');
  assert.match(b, /Math\.min\(5,1\+Math\.floor\(\(cfg\.cl\|\|1\)\/4\)\)/);
  assert.match(b, /extraDice:\{normal:n\+'d6'\}/);
});

test('Batch 51: Harrowing, Greater applies +4 enhancement Strength (Hammers) or Dexterity (Keys) via abilityBuffBonus, and no-ops for the other four suits', () => {
  const b = block('harrowing-greater');
  assert.match(b, /if\(suit==='other'\)return \{attack:0,damage:0,note:'no effect/);
  assert.match(b, /let ability=suit==='keys'\?'dex':'str';/);
  assert.match(b, /abilityBuffBonus\(ctx,ability,4,'enhancement'\)/);
});

test('Batch 51: excluded entries were not added -- Forceful Hand, Grasping Hand, Grasping Tentacles and Gusting Sphere summon a separate attacking entity, not a modifier to the character\'s own attack; Frosthammer is a one-off spell attack action; Fumblestep is a one-off CMB check cast on an enemy; Ghost Brand and Hollow Blades are debuffs/traps cast on an enemy; Gift of the Deep is a race-restricted (sahuagin-only) monster polymorph; Insect Spies and Instant Armor have no attack/damage channel (scout insects that can\'t attack; pure armor/AC); Invoke Primal Power depends entirely on an unimplemented wild-shape/Beast-Shape base', () => {
  const excludedIds = [
    'forceful-hand', 'grasping-hand', 'grasping-tentacles', 'gusting-sphere',
    'frosthammer', 'fumblestep', 'ghost-brand', 'hollow-blades', 'gift-of-the-deep',
    'insect-spies', 'instant-armor', 'invoke-primal-power',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 51: deferred entries were not added -- Form of the Alien Dragon I-III, Form of the Exotic Dragon I, and Giant Form I/II are full polymorphs with new natural attacks and ability-score changes (matching the Form of the Exotic Dragon precedent); Hermean Potential needs a roll-twice-take-better primitive this engine lacks; Huntmaster\'s Spear needs the shared critical-threat-range engine plus a single-use/destroyed-on-discharge state this catalog doesn\'t model', () => {
  const deferredIds = [
    'form-of-the-alien-dragon-i', 'form-of-the-alien-dragon-ii', 'form-of-the-alien-dragon-iii',
    'form-of-the-exotic-dragon-i', 'giant-form-i', 'giant-form-ii',
    'hermean-potential', 'huntmasters-spear',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 51: neither implemented spell is mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
