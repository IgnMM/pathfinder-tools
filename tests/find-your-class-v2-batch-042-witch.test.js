import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const parents = ['01', '02', '03'].flatMap(n => read(`class-profiles-batch-${n}.json`).profiles);
const parentById = new Map(parents.map(x => [x.id, x]));

test('witch canonical expansion is complete and evidence-backed', () => {
  const ps = read('archetype-profiles-witch.json').profiles;
  const src = JSON.parse(fs.readFileSync(new URL('../assets/find-your-class/aon-catalog/class-details/witch.json', import.meta.url))).profiles;
  const parent = parentById.get('witch');
  assert.equal(ps.length, 42);
  assert.deepEqual(ps.map(x => x.id).sort(), src.map(x => x.id).sort());
  for (const x of ps) {
    assert.equal(x.reviewStatus, 'reviewed');
    assert.ok(x.evidence.length);
    for (const [id, v] of Object.entries(x.capabilityOverrides)) {
      assert.notEqual(v, parent.capabilities[id]);
      assert.ok(x.evidence.some(e => e.field === `capabilityOverrides.${id}`));
    }
    for (const [id, v] of Object.entries(x.factOverrides)) assert.notEqual(v, parent.facts[id]);
  }
});

test('batch has 42 unique profiles and preserves authoritative pilots', () => {
  const all = read('archetype-profiles-witch.json').profiles;
  const m = new Map(all.map(x => [x.id, x]));
  assert.equal(all.length, 42);
  assert.equal(new Set(all.map(x => x.id)).size, 42);
  assert.equal(m.get('witch:havocker').capabilityOverrides['single-target-damage'], 'core');
  assert.equal(m.get('witch:white-haired-witch').capabilityOverrides['melee-combat'], 'core');
});

test('alignment-locked archetypes (bouda, flood-walker, pact-witch, putrefactor, vellemancer) are captured', () => {
  const witch = read('archetype-profiles-witch.json').profiles;
  for (const id of ['witch:bouda', 'witch:flood-walker', 'witch:pact-witch', 'witch:putrefactor', 'witch:vellemancer']) {
    assert.ok(witch.find(x => x.id === id).constraints.some(c => c.type === 'alignment'), id);
  }
  assert.ok(witch.find(x => x.id === 'witch:bonded-witch').constraints.some(c => c.type === 'race'), 'bonded-witch is half-elf-only');
  assert.ok(witch.find(x => x.id === 'witch:dreamweaver').constraints.some(c => c.type === 'race'), 'dreamweaver is changeling-only');
  assert.ok(witch.find(x => x.id === 'witch:scarred-witch-doctor').constraints.some(c => c.type === 'race'), 'scarred-witch-doctor is orc-only');
});

test('familiar-replacing archetypes drop has-familiar and depend on their replacement conduit', () => {
  const witch = read('archetype-profiles-witch.json').profiles;
  for (const id of ['witch:ashiftah', 'witch:bonded-witch', 'witch:cartomancer', 'witch:gravewalker', 'witch:mirror-witch', 'witch:scarred-witch-doctor', 'witch:wyrm-witch']) {
    const x = witch.find(p => p.id === id);
    assert.equal(x.factOverrides['has-familiar'], false, id);
    assert.equal(x.factOverrides['depends-on-specific-equipment'], true, id);
  }
});
