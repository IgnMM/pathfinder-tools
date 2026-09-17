import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const classes = ['psychic', 'ranger'];
const expected = { psychic: 8, ranger: 62 };
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

test('batch has 70 unique profiles and preserves authoritative pilots', () => {
  const all = classes.flatMap(id => read(`archetype-profiles-${id}.json`).profiles);
  const m = new Map(all.map(x => [x.id, x]));
  assert.equal(all.length, 70);
  assert.equal(new Set(all.map(x => x.id)).size, 70);
  assert.equal(m.get('psychic:mutation-mind').capabilityOverrides['transformation-shapeshifting'], 'core');
  assert.equal(m.get('psychic:psychic-duelist').capabilityOverrides['single-target-damage'], 'core');
  assert.equal(m.get('ranger:wilderness-medic').capabilityOverrides['healing-recovery'], 'core');
  assert.equal(m.get('ranger:shapeshifter').capabilityOverrides['transformation-shapeshifting'], 'core');
});

test('archetypes that fully lose spellcasting also lose offensive-magic and utility-magic, not just the has-spellcasting fact', () => {
  const ranger = read('archetype-profiles-ranger.json').profiles;
  const m = new Map(ranger.map(x => [x.id, x]));
  for (const id of ['ranger:ilsurian-archer', 'ranger:skirmisher', 'ranger:sword-devil', 'ranger:trapper']) {
    const p = m.get(id);
    assert.equal(p.factOverrides['has-spellcasting'], false, id);
    assert.equal(p.capabilityOverrides['offensive-magic'], 'absent', id);
    assert.equal(p.capabilityOverrides['utility-magic'], 'absent', id);
  }
});

test('non-race commitment/requirement constraints survive alongside the generic race-only detector (psychic marauder alignment, wild soul oath, bow nomad race)', () => {
  const psychic = read('archetype-profiles-psychic.json').profiles;
  const ranger = read('archetype-profiles-ranger.json').profiles;
  const marauder = psychic.find(x => x.id === 'psychic:psychic-marauder');
  assert.ok(marauder.constraints.some(c => c.type === 'alignment'));
  const wildSoul = ranger.find(x => x.id === 'ranger:wild-soul');
  assert.ok(wildSoul.constraints.some(c => c.kind === 'commitment'));
  const bowNomad = ranger.find(x => x.id === 'ranger:bow-nomad');
  assert.ok(bowNomad.constraints.some(c => c.type === 'race'));
});
