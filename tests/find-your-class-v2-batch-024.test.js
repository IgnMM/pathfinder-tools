import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const classes = ['samurai', 'shaman'];
const expected = { samurai: 7, shaman: 17 };
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

test('batch has 24 unique profiles and preserves authoritative pilots', () => {
  const all = classes.flatMap(id => read(`archetype-profiles-${id}.json`).profiles);
  const m = new Map(all.map(x => [x.id, x]));
  assert.equal(all.length, 24);
  assert.equal(new Set(all.map(x => x.id)).size, 24);
  assert.equal(m.get('samurai:yojimbo').capabilityOverrides['protecting-allies'], 'core');
  assert.equal(m.get('samurai:yojimbo').professionIdentity[0].value, 'bodyguard');
  assert.equal(m.get('samurai:warrior-poet').capabilityOverrides['personal-durability'], 'available');
  assert.equal(m.get('shaman:speaker-for-the-past').identityAdds.spiritualThemes[0], 'ancestors');
});

test('witch-doctor carries its enemySpecializationOverrides field (a schema field none of the prior curated batches happened to need) and a real alignment constraint the prior pilot data had omitted', () => {
  const shaman = read('archetype-profiles-shaman.json').profiles;
  const witchDoctor = shaman.find(x => x.id === 'shaman:witch-doctor');
  assert.equal(witchDoctor.enemySpecializationOverrides.undead, 'available');
  assert.ok(witchDoctor.constraints.some(c => c.type === 'alignment'));
});
