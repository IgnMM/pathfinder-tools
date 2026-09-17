// Run with: node --test tests/find-your-class-v2-prestige-classes.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'assets', 'find-your-class', 'v2');
const V2 = require(path.join(dir, 'loader.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }
const criteriaDoc = readJson('criteria.json');
const model = readJson('classification-model.json');
const criteriaIndex = V2.indexCriteria(criteriaDoc);
const prestige = readJson('prestige-profiles.json').profiles;
const details = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'find-your-class', 'aon-catalog', 'aon-prestige-class-details.json'), 'utf8')).profiles;
const detailById = new Map(details.map(x => [x.id, x]));

test('every curated prestige class validates as a full standalone profile (same shape as a class-path)', () => {
  for (const p of prestige) {
    assert.doesNotThrow(() => V2.validateClassProfile(p, criteriaIndex, model), p.id);
    assert.equal(p.reviewStatus, 'reviewed', p.id);
    assert.ok(detailById.has(p.id), `${p.id} must be a real scraped prestige class`);
    assert.equal(p.requirementsText, detailById.get(p.id).requirementsText, p.id);
    assert.equal(p.hitDie, detailById.get(p.id).hitDie, p.id);
  }
});

test('resolvePrestigeProfile stamps entityType and carries requirementsText through, without a parent', () => {
  const loremaster = prestige.find(p => p.id === 'prestige:loremaster');
  const resolved = V2.resolvePrestigeProfile(loremaster);
  assert.equal(resolved.entityType, 'prestige-class');
  assert.equal(resolved.parentClassId, null);
  assert.ok(resolved.requirementsText.includes('Knowledge'));
  assert.deepEqual(resolved.capabilities, loremaster.capabilities);
});

test('resolveAllProfiles includes prestige classes alongside class-paths and archetypes', () => {
  const classProfiles = ['01', '02', '03', '04', '05', '06'].flatMap(n => readJson(`class-profiles-batch-${n}.json`).profiles);
  const all = V2.resolveAllProfiles(classProfiles, [], prestige);
  const prestigeResults = all.filter(p => p.entityType === 'prestige-class');
  assert.equal(prestigeResults.length, prestige.length);
  assert.equal(new Set(all.map(p => p.id)).size, all.length);
});

test('alignment-gated prestige classes (assassin evil, arcane trickster nonlawful, red mantis assassin LE, hellknight lawful, rage prophet nonlawful) are captured', () => {
  const m = new Map(prestige.map(p => [p.id, p]));
  assert.ok(m.get('prestige:assassin').constraints.some(c => c.type === 'alignment'));
  assert.equal(m.get('prestige:assassin').facts['requires-alignment'], true);
  assert.ok(m.get('prestige:arcane-trickster').constraints.some(c => c.type === 'alignment'));
  assert.ok(m.get('prestige:red-mantis-assassin').constraints.some(c => c.type === 'alignment'));
  assert.ok(m.get('prestige:hellknight').constraints.some(c => c.type === 'alignment'));
  assert.ok(m.get('prestige:hellknight').constraints.some(c => c.type === 'organization'));
  assert.ok(m.get('prestige:rage-prophet').constraints.some(c => c.type === 'alignment'));
  assert.ok(m.get('prestige:master-chymist').constraints.some(c => c.type === 'curse-or-drawback'));
});

test('18/119 prestige classes are curated so far, 101 remain pending', () => {
  assert.equal(prestige.length, 18);
  assert.equal(details.length, 119);
});
