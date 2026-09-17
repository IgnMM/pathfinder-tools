import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const criteria = JSON.parse(fs.readFileSync(new URL('criteria.json', root), 'utf8'));
const model = JSON.parse(fs.readFileSync(new URL('classification-model.json', root), 'utf8'));
const batches = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json', 'class-profiles-batch-04.json']
  .map(file => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8')));
const batch = batches[0];
const profiles = batches.flatMap(item => item.profiles);
const criterionIds = criteria.criteria.map(item => item.id);
const pilot = JSON.parse(fs.readFileSync(new URL('archetype-pilot-selection.json', root), 'utf8'));
const archetypeBatches = [
  'archetype-profiles-pilot-01.json', 'archetype-profiles-pilot-02.json',
  'archetype-profiles-pilot-03.json', 'archetype-profiles-pilot-04.json',
  'archetype-profiles-pilot-05.json', 'archetype-profiles-pilot-06.json',
  'archetype-profiles-pilot-07.json', 'archetype-profiles-pilot-08.json',
  'archetype-profiles-pilot-09.json', 'archetype-profiles-pilot-10.json'
]
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

test('enemy specializations are sparse, sourced and distinct from creature themes', () => {
  const specialization = model.enemySpecialization;
  const allowedTargets = new Set(specialization.targets);
  const allowedLevels = new Set(specialization.scale);
  assert.equal(allowedTargets.size, specialization.targets.length);

  for (const [child, parents] of Object.entries(specialization.targetParents)) {
    assert.ok(allowedTargets.has(child), child);
    for (const parent of parents) assert.ok(allowedTargets.has(parent), `${child}/${parent}`);
  }
  for (const [target, aliases] of Object.entries(specialization.conceptAliases)) {
    assert.ok(allowedTargets.has(target), target);
    assert.ok(aliases.length > 0, target);
  }

  for (const profile of profiles) {
    const assignments = profile.enemySpecializations || {};
    const evidence = profile.enemySpecializationEvidence || {};
    assert.deepEqual(Object.keys(evidence).sort(), Object.keys(assignments).sort(), profile.id);
    for (const [target, level] of Object.entries(assignments)) {
      assert.ok(allowedTargets.has(target), `${profile.id}: ${target}`);
      assert.ok(allowedLevels.has(level), `${profile.id}: ${level}`);
      assert.notEqual(level, 'absent', `${profile.id}: sparse base profiles omit absent targets`);
      assert.ok(evidence[target].feature, `${profile.id}: ${target} feature`);
      assert.ok(evidence[target].reason, `${profile.id}: ${target} reason`);
    }
  }

  assert.equal(profiles.find(profile => profile.id === 'ranger').enemySpecializations['user-chosen creature type'], 'core');
  assert.equal(profiles.find(profile => profile.id === 'inquisitor').enemySpecializations['user-chosen creature type'], 'core');
  assert.equal(profiles.find(profile => profile.id === 'paladin').enemySpecializations.fiends, 'core');
  assert.equal(profiles.find(profile => profile.id === 'cleric').enemySpecializations.undead, 'available');
});

test('the catalogue contains 41 unique valued class profiles after completing Slayer', () => {
  const expected = [
    'alchemist', 'antipaladin', 'arcanist', 'barbarian', 'bard', 'bloodrager', 'brawler', 'cavalier',
    'cleric', 'druid', 'fighter', 'gunslinger', 'hunter', 'inquisitor', 'investigator', 'kineticist',
    'magus', 'medium', 'mesmerist', 'monk', 'monk-unchained', 'ninja', 'occultist', 'oracle',
    'paladin', 'psychic', 'ranger', 'rogue', 'samurai', 'shaman', 'shifter', 'skald', 'sorcerer',
    'slayer', 'spiritualist', 'summoner', 'swashbuckler', 'vigilante', 'warpriest', 'witch', 'wizard'
  ];
  assert.equal(profiles.length, 41);
  assert.equal(new Set(profiles.map(profile => profile.id)).size, 41);
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
  assert.equal(archetypeProfiles.length, 100);
  assert.equal(new Set(archetypeProfiles.map(profile => profile.id)).size, 100);
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
    for (const [target, value] of Object.entries(archetype.enemySpecializationOverrides || {})) {
      assert.ok(model.enemySpecialization.targets.includes(target), `${archetype.id}: ${target}`);
      assert.ok(model.enemySpecialization.scale.includes(value), `${archetype.id}: ${value}`);
      const inherited = (parent.enemySpecializations || {})[target] || 'absent';
      assert.notEqual(value, inherited, `${archetype.id}: redundant enemy specialization ${target}`);
      assert.ok(
        archetype.evidence.some(item => item.field === `enemySpecializationOverrides.${target}`),
        `${archetype.id}: missing enemy-specialization evidence for ${target}`
      );
    }
  }
});

test('all 100 pilot profiles have valid identity deltas, constraints and player-facing evidence', () => {
  const selectedIds = new Set(pilot.records.map(record => record.id));
  const profiledIds = new Set(archetypeProfiles.map(profile => profile.id));
  const classById = new Map(profiles.map(profile => [profile.id, profile]));
  assert.deepEqual([...profiledIds].sort(), [...selectedIds].sort());

  for (const archetype of archetypeProfiles) {
    const parent = classById.get(archetype.parentClassId);
    assert.ok(archetype.playerSummary?.length, `${archetype.id}: summary`);
    assert.ok(archetype.tradeoff?.length, `${archetype.id}: tradeoff`);
    assert.ok(archetype.evidence.length > 0, `${archetype.id}: evidence`);

    for (const [category, values] of Object.entries(archetype.identityAdds)) {
      assert.ok(model.identityCategories[category], `${archetype.id}: ${category}`);
      for (const value of values) {
        assert.ok(model.identityCategories[category].includes(value), `${archetype.id}: ${category}/${value}`);
        assert.ok(!parent.identity[category].includes(value), `${archetype.id}: redundant add ${category}/${value}`);
      }
    }
    for (const [category, values] of Object.entries(archetype.identityRemoves)) {
      assert.ok(model.identityCategories[category], `${archetype.id}: ${category}`);
      for (const value of values) {
        assert.ok(model.identityCategories[category].includes(value), `${archetype.id}: ${category}/${value}`);
        assert.ok(parent.identity[category].includes(value), `${archetype.id}: absent removal ${category}/${value}`);
      }
    }
    for (const constraint of archetype.constraints) {
      assert.ok(model.constraintTypes.includes(constraint.type), `${archetype.id}: ${constraint.type}`);
      assert.ok(Object.hasOwn(model.constraintKinds, constraint.kind), `${archetype.id}: ${constraint.kind}`);
    }
    if (archetype.professionIdentity.length) {
      assert.equal(archetype.factOverrides['has-profession-identity'], true, `${archetype.id}: profession fact`);
      for (const profession of archetype.professionIdentity) {
        assert.ok(profession.evidenceSection.length, `${archetype.id}: profession section`);
        assert.ok(profession.evidenceText.length, `${archetype.id}: profession evidence`);
      }
    }
  }
});
