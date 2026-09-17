import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const classes = ['sorcerer', 'spiritualist'];
const expected = { sorcerer: 13, spiritualist: 24 };
const parents = ['01', '02', '03'].flatMap(n => read(`class-profiles-batch-${n}.json`).profiles);
const parentById = new Map(parents.map(x => [x.id, x]));

for (const classId of classes) test(`${classId} canonical expansion is complete and evidence-backed`, () => {
  const ps = read(`archetype-profiles-${classId}.json`).profiles;
  const src = JSON.parse(fs.readFileSync(new URL(`../assets/find-your-class/aon-catalog/class-details/${classId}.json`, import.meta.url))).profiles;
  const parent = parentById.get(classId);
  assert.equal(ps.length, expected[classId]);
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

test('batch has 37 unique profiles and preserves authoritative pilots', () => {
  const all = classes.flatMap(id => read(`archetype-profiles-${id}.json`).profiles);
  const m = new Map(all.map(x => [x.id, x]));
  assert.equal(all.length, 37);
  assert.equal(new Set(all.map(x => x.id)).size, 37);
  assert.equal(m.get('sorcerer:razmiran-priest').professionIdentity[0].value, 'false priest');
  assert.equal(m.get('spiritualist:phantom-blade').capabilityOverrides['melee-combat'], 'core');
  assert.equal(m.get('spiritualist:priest-of-the-fallen').enemySpecializationOverrides.undead, 'available');
});

test('bloodline-choice constraints on locked sorcerer archetypes and the alignment-locked necrologist are captured', () => {
  const sorcerer = read('archetype-profiles-sorcerer.json').profiles;
  const spiritualist = read('archetype-profiles-spiritualist.json').profiles;
  for (const id of ['sorcerer:dragon-drinker', 'sorcerer:stone-warder', 'sorcerer:umbral-scion']) {
    const p = sorcerer.find(x => x.id === id);
    assert.ok(p.constraints.some(c => c.type === 'bloodline-choice'), id);
  }
  const necrologist = spiritualist.find(x => x.id === 'spiritualist:necrologist');
  assert.ok(necrologist.constraints.some(c => c.type === 'alignment'));
});
