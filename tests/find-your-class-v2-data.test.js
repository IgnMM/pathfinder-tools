import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const criteria = JSON.parse(fs.readFileSync(new URL('criteria.json', root), 'utf8'));
const model = JSON.parse(fs.readFileSync(new URL('classification-model.json', root), 'utf8'));
const batches = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json']
  .map(file => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8')));
const batch = batches[0];
const profiles = batches.flatMap(item => item.profiles);
const criterionIds = criteria.criteria.map(item => item.id);

test('Compass v2 defines 24 unique three-level capabilities', () => {
  assert.equal(criterionIds.length, 24);
  assert.equal(new Set(criterionIds).size, 24);
  assert.deepEqual(criteria.scale.values, ['absent', 'available', 'core']);
});

test('every calibration class has exactly the 24 capability levels', () => {
  for (const profile of profiles) {
    assert.deepEqual(Object.keys(profile.capabilities).sort(), [...criterionIds].sort(), profile.id);
    for (const value of Object.values(profile.capabilities)) {
      assert.ok(criteria.scale.values.includes(value), `${profile.id}: ${value}`);
    }
  }
});

test('practical ratings and boolean facts use closed vocabularies', () => {
  const practicalIds = model.practicalRatings.map(item => item.id).sort();
  for (const profile of profiles) {
    assert.deepEqual(Object.keys(profile.practical).sort(), practicalIds, profile.id);
    for (const value of Object.values(profile.practical)) assert.ok(model.practicalScale.values.includes(value));
    assert.deepEqual(Object.keys(profile.facts).sort(), [...model.booleanFacts].sort(), profile.id);
    for (const value of Object.values(profile.facts)) assert.equal(typeof value, 'boolean');
  }
});

test('calibration identities use the declared categorical vocabularies', () => {
  const identityKeys = Object.keys(model.identityCategories);
  for (const profile of profiles) {
    assert.deepEqual(Object.keys(profile.identity).sort(), [...identityKeys].sort(), profile.id);
    for (const [key, values] of Object.entries(profile.identity)) {
      if (key === 'professionIdentity') continue;
      for (const value of values) assert.ok(model.identityCategories[key].includes(value), `${profile.id}: ${key}/${value}`);
    }
  }
});

test('the calibration catalogue contains exactly 40 unique class profiles', () => {
  const expected = [
    'alchemist', 'antipaladin', 'arcanist', 'barbarian', 'bard', 'bloodrager', 'brawler', 'cavalier',
    'cleric', 'druid', 'fighter', 'gunslinger', 'hunter', 'inquisitor', 'investigator', 'kineticist',
    'magus', 'medium', 'mesmerist', 'monk', 'monk-unchained', 'ninja', 'occultist', 'oracle',
    'paladin', 'psychic', 'ranger', 'rogue', 'samurai', 'shaman', 'shifter', 'skald', 'sorcerer',
    'spiritualist', 'summoner', 'swashbuckler', 'vigilante', 'warpriest', 'witch', 'wizard'
  ];
  assert.equal(profiles.length, 40);
  assert.equal(new Set(profiles.map(profile => profile.id)).size, 40);
  assert.deepEqual(profiles.map(profile => profile.id).sort(), expected.sort());
  assert.equal(profiles.filter(profile => profile.identity.professionIdentity.length).length, 0);
  for (const profile of profiles) {
    assert.match(profile.sourceCitationText, /^.+ pg\. \d+$/);
    assert.match(profile.sourceUrl, /^https:\/\/aonprd\.com\/ClassDisplay\.aspx\?ItemName=.+$/);
  }
});

test('the calibration set preserves deliberately overlapping profiles', () => {
  const wizard = batch.profiles.find(profile => profile.id === 'wizard');
  assert.equal(wizard.capabilities['single-target-damage'], 'core');
  assert.equal(wizard.capabilities['area-multi-target-damage'], 'core');
  const fighter = batch.profiles.find(profile => profile.id === 'fighter');
  assert.equal(fighter.capabilities['melee-combat'], 'core');
  assert.equal(fighter.capabilities['ranged-combat'], 'core');
});

test('coarse capabilities still identify clear compass concepts', () => {
  const value = { absent: 0, available: 0.5, core: 1 };
  const bestFor = criteria => batch.profiles
    .map(profile => ({
      id: profile.id,
      score: criteria.reduce((sum, criterion) => sum + value[profile.capabilities[criterion]], 0)
    }))
    .sort((left, right) => right.score - left.score)[0].id;

  assert.equal(bestFor(['melee-combat', 'personal-durability', 'protecting-allies']), 'paladin');
  assert.equal(bestFor(['wilderness-affinity', 'transformation-shapeshifting', 'summoning-companions']), 'druid');
  assert.equal(bestFor(['ranged-combat', 'offensive-magic', 'single-target-damage', 'area-multi-target-damage']), 'kineticist');
});
