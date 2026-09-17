import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const parents = ['01', '02', '03'].flatMap(n => read(`class-profiles-batch-${n}.json`).profiles);
const parentById = new Map(parents.map(x => [x.id, x]));

test('wizard canonical expansion is complete and evidence-backed', () => {
  const ps = read('archetype-profiles-wizard.json').profiles;
  const src = JSON.parse(fs.readFileSync(new URL('../assets/find-your-class/aon-catalog/class-details/wizard.json', import.meta.url))).profiles;
  const parent = parentById.get('wizard');
  assert.equal(ps.length, 35);
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

test('batch has 35 unique profiles and preserves authoritative pilots', () => {
  const all = read('archetype-profiles-wizard.json').profiles;
  const m = new Map(all.map(x => [x.id, x]));
  assert.equal(all.length, 35);
  assert.equal(new Set(all.map(x => x.id)).size, 35);
  assert.equal(m.get('wizard:arcane-physician').capabilityOverrides['healing-recovery'], 'available');
  assert.equal(m.get('wizard:scroll-scholar').professionIdentity[0].value, 'scholar');
  assert.equal(m.get('wizard:spellslinger').capabilityOverrides['ranged-combat'], 'core');
});

test('race-locked archetypes (cruoromancer dhampir, spellbinder elf, wind-listener sylph) are captured automatically', () => {
  const wizard = read('archetype-profiles-wizard.json').profiles;
  for (const id of ['wizard:cruoromancer', 'wizard:spellbinder', 'wizard:wind-listener']) {
    assert.ok(wizard.find(x => x.id === id).constraints.some(c => c.type === 'race'), id);
  }
  assert.ok(wizard.find(x => x.id === 'wizard:undead-master').constraints.some(c => c.type === 'alignment'), 'undead-master must be evil');
  assert.ok(wizard.find(x => x.id === 'wizard:cheliax-egorian-academy-infernal-binder').constraints.some(c => c.type === 'alignment'), 'infernal-binder alignment list');
});
