import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const classes = ['shifter', 'skald'];
const expected = { shifter: 14, skald: 26 };
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

test('batch has 40 unique profiles and preserves authoritative pilots', () => {
  const all = classes.flatMap(id => read(`archetype-profiles-${id}.json`).profiles);
  const m = new Map(all.map(x => [x.id, x]));
  assert.equal(all.length, 40);
  assert.equal(new Set(all.map(x => x.id)).size, 40);
  assert.ok(m.get('shifter:oozemorph').constraints.some(c => c.type === 'curse-or-drawback'));
  assert.ok(m.get('shifter:weretouched').constraints.some(c => c.type === 'form-choice'));
  assert.equal(m.get('skald:court-poet').capabilityOverrides['melee-combat'], 'available');
  assert.equal(m.get('skald:spell-warrior').capabilityOverrides['anti-magic-disruption'], 'core');
});

test('non-race commitment/requirement constraints (fiendflesh-shifter/rageshaper/sunsinger alignment, twilight-speaker race) are captured', () => {
  const shifter = read('archetype-profiles-shifter.json').profiles;
  const skald = read('archetype-profiles-skald.json').profiles;
  const fiendflesh = shifter.find(x => x.id === 'shifter:fiendflesh-shifter');
  assert.ok(fiendflesh.constraints.some(c => c.type === 'alignment'));
  const rageshaper = shifter.find(x => x.id === 'shifter:rageshaper');
  assert.ok(rageshaper.constraints.some(c => c.type === 'alignment'));
  const sunsinger = skald.find(x => x.id === 'skald:sunsinger');
  assert.ok(sunsinger.constraints.some(c => c.type === 'alignment'));
  const twilightSpeaker = skald.find(x => x.id === 'skald:twilight-speaker');
  assert.ok(twilightSpeaker.constraints.some(c => c.type === 'race'));
});
