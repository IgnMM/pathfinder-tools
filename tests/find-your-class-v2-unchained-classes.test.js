import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const profiles = read('class-profiles-batch-06.json').profiles;
const criteria = read('criteria.json');
const model = read('classification-model.json');
const catalogue = JSON.parse(fs.readFileSync(new URL('../assets/find-your-class/aon-catalog/aon-player-archetype-catalog.json', import.meta.url), 'utf8'));

test('the final class batch contains both unchained classes', () => {
  assert.deepEqual(profiles.map(item => item.id).sort(), ['barbarian-unchained','rogue-unchained']);
  for (const profile of profiles) {
    assert.deepEqual(Object.keys(profile.capabilities).sort(), criteria.criteria.map(item => item.id).sort());
    assert.deepEqual(Object.keys(profile.practical).sort(), model.practicalRatings.map(item => item.id).sort());
    assert.deepEqual(Object.keys(profile.facts).sort(), [...model.booleanFacts].sort());
    assert.match(profile.sourceCitationText, /^Pathfinder Unchained pg\. \d+$/);
  }
});

test('unchained Barbarian preserves the parent role with streamlined rage', () => {
  const profile = profiles.find(item => item.id === 'barbarian-unchained');
  assert.equal(profile.capabilities['melee-combat'], 'core');
  assert.equal(profile.capabilities['personal-durability'], 'core');
  assert.equal(profile.facts['has-rage'], true);
});

test('unchained Rogue reflects finesse training and debilitating injury', () => {
  const profile = profiles.find(item => item.id === 'rogue-unchained');
  assert.equal(profile.capabilities['debuffing-enemies'], 'core');
  assert.equal(profile.practical['attribute-demands'], 'low');
  assert.equal(profile.capabilities['practical-expertise'], 'core');
});

test('AoN exposes no separate archetype rows for either class', () => {
  for (const id of ['barbarian-unchained','rogue-unchained']) {
    const record = catalogue.classes.find(item => item.id === id);
    assert.equal(record.archetypeCount, 0, id);
  }
});
