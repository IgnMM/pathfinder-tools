import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('../assets/find-your-class/v2/', import.meta.url);
const read = n => JSON.parse(fs.readFileSync(new URL(n, root)));
const parents = ['01', '02', '03'].flatMap(n => read(`class-profiles-batch-${n}.json`).profiles);
const parentById = new Map(parents.map(x => [x.id, x]));

test('rogue canonical expansion is complete and evidence-backed', () => {
  const ps = read('archetype-profiles-rogue.json').profiles;
  const src = JSON.parse(fs.readFileSync(new URL('../assets/find-your-class/aon-catalog/class-details/rogue.json', import.meta.url))).profiles;
  const parent = parentById.get('rogue');
  assert.equal(ps.length, 78);
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

test('the 4 rogue archetypes with prior pilot data preserve their exact mechanical decisions', () => {
  const ps = read('archetype-profiles-rogue.json').profiles;
  const m = new Map(ps.map(x => [x.id, x]));
  assert.equal(m.get('rogue:eldritch-scoundrel').capabilityOverrides['offensive-magic'], 'core');
  assert.equal(m.get('rogue:burglar').professionIdentity[0].value, 'burglar');
  assert.equal(m.get('rogue:scout').professionIdentity[0].value, 'scout');
  assert.equal(m.get('rogue:thug').capabilityOverrides['debuffing-enemies'], 'core');
});

test('non-race commitment/requirement constraints (guild-agent organization, kitsune-trickster/skulking-slayer/swamp-poisoner race) are captured', () => {
  const ps = read('archetype-profiles-rogue.json').profiles;
  const m = new Map(ps.map(x => [x.id, x]));
  assert.ok(m.get('rogue:guild-agent').constraints.some(c => c.kind === 'commitment'));
  assert.ok(m.get('rogue:kitsune-trickster').constraints.some(c => c.type === 'race'));
  assert.ok(m.get('rogue:skulking-slayer').constraints.some(c => c.type === 'race'));
  assert.ok(m.get('rogue:swamp-poisoner').constraints.some(c => c.type === 'race'));
});
