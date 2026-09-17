import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const parent = read('class-profiles-batch-05.json').profiles[0];
const profiles = read('archetype-profiles-summoner-unchained.json').profiles;
const criteria = read('criteria.json');
const model = read('classification-model.json');
const records = JSON.parse(fs.readFileSync(new URL('../assets/find-your-class/aon-catalog/new-scope-archetype-details.json', import.meta.url), 'utf8')).profiles.filter(item => item.parentClassId === 'summoner-unchained');

test('unchained Summoner is a complete parent profile', () => {
  assert.equal(parent.id, 'summoner-unchained');
  assert.deepEqual(Object.keys(parent.capabilities).sort(), criteria.criteria.map(item => item.id).sort());
  assert.deepEqual(Object.keys(parent.practical).sort(), model.practicalRatings.map(item => item.id).sort());
  assert.deepEqual(Object.keys(parent.facts).sort(), [...model.booleanFacts].sort());
  assert.equal(parent.capabilities['summoning-companions'], 'core');
  assert.equal(parent.facts['controls-additional-entity'], true);
});

test('all 9 AoN unchained Summoner archetypes are represented and reviewed', () => {
  assert.equal(records.length, 9);
  assert.equal(profiles.length, 9);
  assert.deepEqual(profiles.map(item => item.id).sort(), records.map(item => item.id).sort());
  for (const profile of profiles) {
    assert.equal(profile.parentClassId, 'summoner-unchained');
    assert.equal(profile.reviewStatus, 'reviewed');
    assert.ok(profile.playerSummary.length);
    assert.ok(profile.tradeoff.length);
    assert.ok(profile.evidence.length);
  }
});

test('unchained Summoner archetypes store only material parent deltas', () => {
  for (const profile of profiles) {
    for (const [id,value] of Object.entries(profile.capabilityOverrides)) {
      assert.notEqual(value, parent.capabilities[id], `${profile.id}: ${id}`);
      assert.ok(profile.evidence.some(item => item.field === `capabilityOverrides.${id}`), `${profile.id}: evidence ${id}`);
    }
    for (const [id,value] of Object.entries(profile.practicalOverrides)) assert.notEqual(value, parent.practical[id], `${profile.id}: ${id}`);
    for (const [id,value] of Object.entries(profile.factOverrides)) assert.notEqual(value, parent.facts[id], `${profile.id}: ${id}`);
    for (const [category,values] of Object.entries(profile.identityAdds)) for (const value of values) assert.ok(!parent.identity[category].includes(value), `${profile.id}: add ${category}/${value}`);
    for (const [category,values] of Object.entries(profile.identityRemoves)) for (const value of values) assert.ok(parent.identity[category].includes(value), `${profile.id}: remove ${category}/${value}`);
  }
});

test('representative transformations resolve as intended', () => {
  const byId = new Map(profiles.map(item => [item.id,item]));
  assert.equal(byId.get('summoner-unchained:devil-binder').capabilityOverrides['offensive-magic'], 'core');
  assert.equal(byId.get('summoner-unchained:fey-caller').capabilityOverrides['wilderness-affinity'], 'core');
  assert.equal(byId.get('summoner-unchained:storm-caller').capabilityOverrides['area-multi-target-damage'], 'core');
  assert.equal(byId.get('summoner-unchained:twinned-summoner').capabilityOverrides['tactical-leadership'], 'core');
});
