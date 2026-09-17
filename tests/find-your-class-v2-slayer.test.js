import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const parent = read('class-profiles-batch-04.json').profiles[0];
const profiles = read('archetype-profiles-slayer.json').profiles;
const criteria = read('criteria.json');
const model = read('classification-model.json');
const sourceRecords = JSON.parse(fs.readFileSync(new URL('../assets/find-your-class/aon-catalog/new-scope-archetype-details.json', import.meta.url), 'utf8')).profiles
  .filter(item => item.parentClassId === 'slayer');
const sourceById = new Map(sourceRecords.map(item => [item.id, item]));

test('Slayer is a complete 24-capability parent profile with sourced enemy specialization', () => {
  assert.equal(parent.id, 'slayer');
  assert.deepEqual(Object.keys(parent.capabilities).sort(), criteria.criteria.map(item => item.id).sort());
  assert.deepEqual(Object.keys(parent.practical).sort(), model.practicalRatings.map(item => item.id).sort());
  assert.deepEqual(Object.keys(parent.facts).sort(), [...model.booleanFacts].sort());
  assert.equal(parent.enemySpecializations['user-chosen creature type'], 'core');
  assert.ok(parent.enemySpecializationEvidence['user-chosen creature type'].reason);
});

test('all 26 AoN Slayer archetypes are represented exactly once and reviewed', () => {
  assert.equal(sourceRecords.length, 26);
  assert.equal(profiles.length, 26);
  assert.equal(new Set(profiles.map(item => item.id)).size, 26);
  assert.deepEqual(profiles.map(item => item.id).sort(), sourceRecords.map(item => item.id).sort());
  for (const profile of profiles) {
    const source = sourceById.get(profile.id);
    assert.equal(profile.parentClassId, 'slayer');
    assert.equal(profile.reviewStatus, 'reviewed');
    assert.equal(profile.sourceCitationText, source.sourceCitationText);
    assert.equal(profile.sourceUrl, source.aonUrl);
    assert.ok(profile.playerSummary.length, `${profile.id}: summary`);
    assert.ok(profile.tradeoff.length, `${profile.id}: tradeoff`);
    assert.ok(profile.evidence.length, `${profile.id}: evidence`);
  }
});

test('Slayer profiles contain only material parent deltas with evidence', () => {
  for (const profile of profiles) {
    for (const [id, value] of Object.entries(profile.capabilityOverrides)) {
      assert.notEqual(value, parent.capabilities[id], `${profile.id}: redundant capability ${id}`);
      assert.ok(profile.evidence.some(item => item.field === `capabilityOverrides.${id}`), `${profile.id}: evidence ${id}`);
    }
    for (const [id, value] of Object.entries(profile.practicalOverrides)) {
      assert.notEqual(value, parent.practical[id], `${profile.id}: redundant practical ${id}`);
    }
    for (const [id, value] of Object.entries(profile.factOverrides)) {
      assert.notEqual(value, parent.facts[id], `${profile.id}: redundant fact ${id}`);
    }
    for (const [category, values] of Object.entries(profile.identityAdds)) {
      for (const value of values) assert.ok(!parent.identity[category].includes(value), `${profile.id}: redundant add ${category}/${value}`);
    }
    for (const [category, values] of Object.entries(profile.identityRemoves)) {
      for (const value of values) assert.ok(parent.identity[category].includes(value), `${profile.id}: absent removal ${category}/${value}`);
    }
    for (const target of Object.keys(profile.enemySpecializationOverrides || {})) {
      assert.ok(profile.evidence.some(item => item.field === `enemySpecializationOverrides.${target}`), `${profile.id}: enemy evidence ${target}`);
    }
    if (profile.professionIdentity.length) assert.equal(profile.factOverrides['has-profession-identity'], true, `${profile.id}: profession fact`);
  }
});

test('representative Slayer transformations resolve as intended', () => {
  const byId = new Map(profiles.map(item => [item.id, item]));
  assert.equal(byId.get('slayer:bounty-hunter').capabilityOverrides['combat-manoeuvres'], 'core');
  assert.equal(byId.get('slayer:toxic-sniper').factOverrides['has-firearms'], true);
  assert.equal(byId.get('slayer:vanguard').capabilityOverrides['tactical-leadership'], 'core');
  assert.equal(byId.get('slayer:witch-killer').capabilityOverrides['anti-magic-disruption'], 'core');
  assert.equal(byId.get('slayer:woodland-sniper').capabilityOverrides['melee-combat'], 'available');
});
