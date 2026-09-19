// Damage Calculator batch project -- Batch 52: ADD spells ENGINE (3 of 4).
// Regression coverage for the 4 newly added spell entries, plus guards on the
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

const implemented = ['levitate', 'paragon-surge', 'reduce-person', 'righteous-might'];

test('Batch 52: all 4 implemented spells are present exactly once with a source link', () => {
  for (const id of implemented) {
    assert.equal(countId(html, id), 1, `${id} should be present exactly once`);
    assert.match(block(id), /source:/, `${id} should have a source`);
  }
});

test('Batch 52: Levitate scales -1 per consecutive attack this round, capped at -5', () => {
  const b = block('levitate');
  assert.match(b, /let v=-Math\.max\(1,Math\.min\(5,cfg\.attackNum\|\|1\)\)/);
});

test('Batch 52: Paragon Surge grants +2 enhancement Dexterity AND Intelligence via abilityBuffBonus, summed', () => {
  const b = block('paragon-surge');
  assert.match(b, /abilityBuffBonus\(ctx,'dex',2,'enhancement'\),r2=abilityBuffBonus\(ctx,'int',2,'enhancement'\)/);
});

test('Batch 52: Reduce Person applies -2 size Strength, +2 size Dexterity, and an always-on +1 size attack bonus (mirrors Enlarge Person)', () => {
  const b = block('reduce-person');
  assert.match(b, /abilityBuffBonus\(ctx,'str',-2,'size'\)/);
  assert.match(b, /abilityBuffBonus\(ctx,'dex',2,'size'\)/);
  assert.match(b, /let atk=1\+rStr\.attack\+rDex\.attack;/);
});

test('Batch 52: Righteous Might applies +4 size Strength, -2 size Dexterity, and an always-on -1 size attack penalty (mirrors Enlarge Person)', () => {
  const b = block('righteous-might');
  assert.match(b, /abilityBuffBonus\(ctx,'str',4,'size'\)/);
  assert.match(b, /abilityBuffBonus\(ctx,'dex',-2,'size'\)/);
  assert.match(b, /let atk=-1\+rStr\.attack\+rDex\.attack;/);
});

test('Batch 52: excluded entries were not added -- Lightfingers, Mage\'s Sword and Martial Telekinesis either summon a separate entity, cast a one-off CMB check on an enemy, or are redundant with the existing damage-ability dropdown; Line in the Sand, Litany of Warding and Prehensile Pilfer grant extra attacks of opportunity/maneuver access with no attack/damage channel or untracked AoO-count baseline; Pup Shape and Recorporeal Incarnation are cast on someone/something other than the caster\'s own combat attack; Rune of Durability and Sarzari Shadow Memory have no attack/damage channel (weapon HP; auto-confirmed crits with no primitive)', () => {
  const excludedIds = [
    'lightfingers', 'mages-sword', 'martial-telekinesis', 'line-in-the-sand',
    'litany-of-warding', 'prehensile-pilfer', 'pup-shape', 'recorporeal-incarnation',
    'rune-of-durability', 'sarzari-shadow-memory',
  ];
  for (const id of excludedIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 52: deferred entries were not added -- Magical Beast Shape, Monstrous Physique I-III, Naga Shape I and Plant Shape I-III are full polymorphs matching the Beast Shape/Form of the Exotic Dragon precedent; Ricochet Shot needs a scaling bonus-attack primitive distinct from the existing single grantsExtraAttack hook', () => {
  const deferredIds = [
    'magical-beast-shape', 'monstrous-physique-i', 'monstrous-physique-ii',
    'monstrous-physique-iii', 'naga-shape-i', 'plant-shape-i', 'plant-shape-ii',
    'plant-shape-iii', 'ricochet-shot',
  ];
  for (const id of deferredIds) {
    assert.equal(countId(html, id), 0, `${id} should not have been added`);
  }
});

test('Batch 52: none of the 4 implemented spells are mirrored into companion/index.html', () => {
  for (const id of implemented) {
    assert.equal(countId(companionHtml, id), 0, `${id} should not be mirrored into companion`);
  }
});
