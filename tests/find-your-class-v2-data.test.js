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
const pilot = JSON.parse(fs.readFileSync(new URL('archetype-pilot-selection.json', root), 'utf8'));
const archetypeBatches = ['archetype-profiles-pilot-01.json', 'archetype-profiles-pilot-02.json']
  .map(file => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8')));
const archetypeProfiles = archetypeBatches.flatMap(item => item.profiles);

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

test('the archetype pilot selects 100 unique sourced records across all 40 classes', () => {
  assert.equal(pilot.records.length, 100);
  assert.equal(new Set(pilot.records.map(record => record.id)).size, 100);
  assert.equal(Object.keys(pilot.classCounts).length, 40);
  assert.ok(Math.min(...Object.values(pilot.classCounts)) >= 2);
  for (const record of pilot.records) {
    assert.match(record.sourceCitationText, /^.+ pg\. \d+$/);
    assert.match(record.sourceUrl, /^https:\/\/aonprd\.com\/ArchetypeDisplay\.aspx\?FixedName=.+$/);
  }
});

test('archetype overrides use valid fields, inherit everything omitted and may legitimately be empty', () => {
  const selectedIds = new Set(pilot.records.map(record => record.id));
  const classById = new Map(profiles.map(profile => [profile.id, profile]));
  const allowedPractical = new Set(model.practicalRatings.map(item => item.id));
  const allowedFacts = new Set(model.booleanFacts);
  assert.equal(archetypeProfiles.length, 20);
  assert.equal(new Set(archetypeProfiles.map(profile => profile.id)).size, 20);
  assert.ok(archetypeProfiles.some(profile => Object.keys(profile.capabilityOverrides).length === 0));

  for (const archetype of archetypeProfiles) {
    assert.ok(selectedIds.has(archetype.id), archetype.id);
    const selection = pilot.records.find(record => record.id === archetype.id);
    assert.equal(archetype.sourceCitationText, selection.sourceCitationText, `${archetype.id}: citation`);
    assert.equal(archetype.sourceUrl, selection.sourceUrl, `${archetype.id}: URL`);
    const parent = classById.get(archetype.parentClassId);
    assert.ok(parent, archetype.parentClassId);
    for (const [id, value] of Object.entries(archetype.capabilityOverrides)) {
      assert.ok(criterionIds.includes(id), `${archetype.id}: ${id}`);
      assert.ok(criteria.scale.values.includes(value), `${archetype.id}: ${value}`);
      assert.notEqual(value, parent.capabilities[id], `${archetype.id}: redundant ${id}`);
    }
    for (const [id, value] of Object.entries(archetype.practicalOverrides)) {
      assert.ok(allowedPractical.has(id), `${archetype.id}: ${id}`);
      assert.ok(model.practicalScale.values.includes(value), `${archetype.id}: ${value}`);
      assert.notEqual(value, parent.practical[id], `${archetype.id}: redundant ${id}`);
    }
    for (const [id, value] of Object.entries(archetype.factOverrides)) {
      assert.ok(allowedFacts.has(id), `${archetype.id}: ${id}`);
      assert.equal(typeof value, 'boolean');
      assert.notEqual(value, parent.facts[id], `${archetype.id}: redundant ${id}`);
    }
  }
});
