import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const classes = ['summoner', 'swashbuckler'];
const expected = { summoner: 22, swashbuckler: 20 };
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

test('batch has 42 unique profiles and preserves authoritative pilots', () => {
  const all = classes.flatMap(id => read(`archetype-profiles-${id}.json`).profiles);
  const m = new Map(all.map(x => [x.id, x]));
  assert.equal(all.length, 42);
  assert.equal(new Set(all.map(x => x.id)).size, 42);
  assert.equal(m.get('summoner:master-summoner').capabilityOverrides['tactical-leadership'], 'core');
  assert.equal(m.get('summoner:synthesist').capabilityOverrides['transformation-shapeshifting'], 'core');
  assert.ok(m.get('swashbuckler:flying-blade').constraints.some(c => c.kind === 'commitment'));
  assert.ok(m.get('swashbuckler:picaroon').constraints.some(c => c.kind === 'commitment'));
});

test('alignment-locked archetypes (morphic-savant chaotic, unwavering-conduit lawful, azatariel/mysterious-avenger specific alignments) are captured', () => {
  const summoner = read('archetype-profiles-summoner.json').profiles;
  const swashbuckler = read('archetype-profiles-swashbuckler.json').profiles;
  for (const id of ['summoner:morphic-savant', 'summoner:unwavering-conduit']) {
    assert.ok(summoner.find(x => x.id === id).constraints.some(c => c.type === 'alignment'), id);
  }
  for (const id of ['swashbuckler:azatariel', 'swashbuckler:mysterious-avenger']) {
    assert.ok(swashbuckler.find(x => x.id === id).constraints.some(c => c.type === 'alignment'), id);
  }
});
