import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const classes = ['vigilante', 'warpriest'];
const expected = { vigilante: 28, warpriest: 18 };
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

test('batch has 46 unique profiles and preserves authoritative pilots', () => {
  const all = classes.flatMap(id => read(`archetype-profiles-${id}.json`).profiles);
  const m = new Map(all.map(x => [x.id, x]));
  assert.equal(all.length, 46);
  assert.equal(new Set(all.map(x => x.id)).size, 46);
  assert.equal(m.get('vigilante:gunmaster').capabilityOverrides['ranged-combat'], 'core');
  assert.equal(m.get('vigilante:magical-child').capabilityOverrides['summoning-companions'], 'core');
  assert.ok(m.get('warpriest:sacred-fist').constraints.some(c => c.kind === 'commitment'));
  assert.ok(m.get('warpriest:shieldbearer').constraints.some(c => c.kind === 'commitment'));
});

test('alignment- and deity-locked archetypes (agathiel, bellflower-harvester, brute, darklantern, serial-killer, mantis-zealot, sixth-wing-bulwark, fist-of-the-godclaw) are captured', () => {
  const vigilante = read('archetype-profiles-vigilante.json').profiles;
  const warpriest = read('archetype-profiles-warpriest.json').profiles;
  for (const id of ['vigilante:agathiel', 'vigilante:bellflower-harvester', 'vigilante:brute', 'vigilante:darklantern', 'vigilante:serial-killer']) {
    assert.ok(vigilante.find(x => x.id === id).constraints.some(c => c.type === 'alignment'), id);
  }
  assert.ok(vigilante.find(x => x.id === 'vigilante:darklantern').constraints.some(c => c.type === 'race'), 'darklantern is also elf-only');
  assert.ok(vigilante.find(x => x.id === 'vigilante:ferocious-hunter').constraints.some(c => c.type === 'race'), 'ferocious-hunter is half-orc-only');
  assert.ok(vigilante.find(x => x.id === 'vigilante:half-elf-double-scion').constraints.some(c => c.type === 'race'), 'half-elf-double-scion is half-elf-only');
  for (const id of ['warpriest:mantis-zealot', 'warpriest:sixth-wing-bulwark', 'warpriest:fist-of-the-godclaw', 'warpriest:liberty-s-blade']) {
    assert.ok(warpriest.find(x => x.id === id).constraints.some(c => c.type === 'deity'), id);
  }
  assert.ok(warpriest.find(x => x.id === 'warpriest:calamity-caller').constraints.some(c => c.type === 'race'), 'calamity-caller is elf-only');
});
