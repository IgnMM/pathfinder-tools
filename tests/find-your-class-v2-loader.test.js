// Run with: node --test tests/find-your-class-v2-loader.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'assets', 'find-your-class', 'v2');
const V2 = require(path.join(dir, 'loader.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }
const criteriaDoc = readJson('criteria.json');
const model = readJson('classification-model.json');
const classProfiles = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json', 'class-profiles-batch-04.json', 'class-profiles-batch-05.json', 'class-profiles-batch-06.json']
  .flatMap(f => readJson(f).profiles);
const archetypeOverrides = Array.from({ length: 10 }, (_, i) => `archetype-profiles-pilot-${String(i + 1).padStart(2, '0')}.json`)
  .flatMap(f => readJson(f).profiles).filter(p => !['alchemist','antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman','shifter','skald','sorcerer','spiritualist','summoner','swashbuckler','vigilante','warpriest'].includes(p.parentClassId))
  .concat(...['slayer','summoner-unchained','alchemist','antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman','shifter','skald','sorcerer','spiritualist','summoner','swashbuckler','vigilante','warpriest'].map(id => readJson(`archetype-profiles-${id}.json`).profiles));

const criteriaIndex = V2.indexCriteria(criteriaDoc);
const classById = new Map(classProfiles.map(c => [c.id, c]));

test('every real class profile validates structurally', () => {
  for (const c of classProfiles) assert.doesNotThrow(() => V2.validateClassProfile(c, criteriaIndex, model), c.id);
});

test('every real archetype override validates structurally', () => {
  for (const a of archetypeOverrides) assert.doesNotThrow(() => V2.validateArchetypeProfile(a, criteriaIndex, model, classById), a.id);
});

test('resolveEffectiveProfile for a class-path copies capabilities/practical/facts/identity without mutation', () => {
  const fighter = classById.get('fighter');
  const snapshot = JSON.parse(JSON.stringify(fighter));
  const resolved = V2.resolveEffectiveProfile(fighter, null);
  assert.equal(resolved.entityType, 'class-path');
  assert.deepEqual(resolved.capabilities, fighter.capabilities);
  assert.deepEqual(fighter, snapshot, 'must never mutate the source class profile');
});

test('resolveEffectiveProfile applies capability/practical/fact overrides on top of the parent class', () => {
  const chirurgeon = archetypeOverrides.find(a => a.id === 'alchemist:chirurgeon');
  const alchemist = classById.get('alchemist');
  const resolved = V2.resolveEffectiveProfile(alchemist, chirurgeon);
  assert.equal(resolved.entityType, 'archetype');
  assert.equal(resolved.capabilities['healing-recovery'], 'core', 'the override must win over the parent value');
  for (const id of Object.keys(alchemist.capabilities)) {
    if (id === 'healing-recovery') continue;
    assert.equal(resolved.capabilities[id], alchemist.capabilities[id], `${id} must be inherited unchanged`);
  }
  assert.equal(resolved.facts['has-profession-identity'], true);
});

test('resolveEffectiveProfile applies identityAdds and identityRemoves correctly', () => {
  const withIdentityDelta = archetypeOverrides.find(a =>
    Object.values(a.identityAdds || {}).some(v => v.length) || Object.values(a.identityRemoves || {}).some(v => v.length));
  assert.ok(withIdentityDelta, 'expected at least one real archetype with an identity delta to test against');
  const parent = classById.get(withIdentityDelta.parentClassId);
  const resolved = V2.resolveEffectiveProfile(parent, withIdentityDelta);
  for (const [category, adds] of Object.entries(withIdentityDelta.identityAdds || {})) {
    for (const v of adds) assert.ok(resolved.identity[category].includes(v), `${category}/${v} must be added`);
  }
  for (const [category, removes] of Object.entries(withIdentityDelta.identityRemoves || {})) {
    for (const v of removes) assert.ok(!resolved.identity[category].includes(v), `${category}/${v} must be removed`);
  }
});

test('resolveAllProfiles produces 44 class-paths + 1203 archetypes = 1247 profiles, all with unique ids', () => {
  const all = V2.resolveAllProfiles(classProfiles, archetypeOverrides);
  assert.equal(all.length, 1247);
  assert.equal(new Set(all.map(p => p.id)).size, 1247);
  assert.equal(all.filter(p => p.entityType === 'class-path').length, 44);
  assert.equal(all.filter(p => p.entityType === 'archetype').length, 1203);
});

test('calibrationRole never leaks into resolveEffectiveProfile\'s playerSummary (regression: it is an internal field, and most real classes still hold the literal placeholder "Pending cross-class normalization.")', () => {
  const cavalier = classById.get('cavalier');
  assert.equal(cavalier.calibrationRole, 'Pending cross-class normalization.', 'this test assumes the real data still has the placeholder for cavalier -- if it now has a real summary, this assertion (not the fix) should be revisited');
  const resolved = V2.resolveEffectiveProfile(cavalier, null);
  assert.equal(resolved.playerSummary, null);
  // Even a class WITH a genuine-looking calibrationRole (fighter) must not
  // have it promoted -- the field is internal regardless of how it reads.
  const fighter = classById.get('fighter');
  assert.notEqual(fighter.calibrationRole, undefined);
  assert.equal(V2.resolveEffectiveProfile(fighter, null).playerSummary, null);
});

test('a class with an alignment/code-of-conduct fact (e.g. paladin) carries it through resolveEffectiveProfile', () => {
  const paladin = classById.get('paladin');
  const resolved = V2.resolveEffectiveProfile(paladin, null);
  assert.equal(resolved.facts['requires-alignment'], true);
  assert.equal(resolved.facts['has-code-of-conduct'], true);
});

test('a class with a constraints array (e.g. oracle) carries it through, archetype constraints append rather than replace', () => {
  const oracle = classById.get('oracle');
  assert.ok(oracle.constraints.length > 0, 'expected the real oracle profile to already declare a curse constraint');
  const resolvedClassPath = V2.resolveEffectiveProfile(oracle, null);
  assert.deepEqual(resolvedClassPath.constraints, oracle.constraints);
  const oracleArchetype = archetypeOverrides.find(a => a.parentClassId === 'oracle');
  if (oracleArchetype) {
    const resolved = V2.resolveEffectiveProfile(oracle, oracleArchetype);
    assert.equal(resolved.constraints.length, oracle.constraints.length + oracleArchetype.constraints.length);
  }
});
