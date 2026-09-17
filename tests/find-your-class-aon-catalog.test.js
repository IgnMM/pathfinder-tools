import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const repo = new URL('../', import.meta.url);
const readJson = relative => JSON.parse(fs.readFileSync(new URL(relative, repo), 'utf8'));
const catalogue = readJson('assets/find-your-class/aon-catalog/aon-player-archetype-catalog.json');
const added = readJson('assets/find-your-class/aon-catalog/new-scope-archetype-details.json').profiles;
const classes = ['01', '02', '03', '04', '05', '06'].flatMap(batch =>
  readJson(`assets/find-your-class/v2/class-profiles-batch-${batch}.json`).profiles
);
const completedClassIds = ['alchemist','antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman','shifter','skald'];
const archetypes = Array.from({length: 10}, (_, index) => String(index + 1).padStart(2, '0')).flatMap(batch =>
  readJson(`assets/find-your-class/v2/archetype-profiles-pilot-${batch}.json`).profiles
).filter(profile => !completedClassIds.includes(profile.parentClassId)).concat(
  readJson('assets/find-your-class/v2/archetype-profiles-slayer.json').profiles,
  readJson('assets/find-your-class/v2/archetype-profiles-summoner-unchained.json').profiles,
  ...completedClassIds.flatMap(id => readJson(`assets/find-your-class/v2/archetype-profiles-${id}.json`).profiles)
);

test('AoN catalogue contains 44 classes and 1,275 unique archetypes', () => {
  assert.equal(catalogue.classes.length, 44);
  assert.equal(catalogue.archetypes.length, 1275);
  assert.equal(new Set(catalogue.classes.map(item => item.id)).size, 44);
  assert.equal(new Set(catalogue.archetypes.map(item => item.id)).size, 1275);
  assert.equal(new Set(catalogue.archetypes.map(item => item.aonUrl)).size, 1275);
  assert.equal(catalogue.counts.entities, 1319);
});

test('all 44 class profiles and 1093 archetype profiles are present and marked valued', () => {
  const classStatus = new Map(catalogue.classes.map(item => [item.id, item.valuationStatus]));
  const archetypeStatus = new Map(catalogue.archetypes.map(item => [item.id, item.valuationStatus]));
  assert.equal(classes.length, 44);
  assert.equal(archetypes.length, 1093);
  for (const profile of classes) assert.equal(classStatus.get(profile.id), 'valued', profile.id);
  for (const profile of archetypes) assert.equal(archetypeStatus.get(profile.id), 'valued', profile.id);
  assert.equal(catalogue.counts.valuedClasses, 44);
  assert.equal(catalogue.counts.valuedArchetypes, 1093);
});

test('the newly discovered Slayer and unchained Summoner records are complete', () => {
  assert.equal(added.length, 35);
  assert.equal(added.filter(item => item.parentClassId === 'slayer').length, 26);
  assert.equal(added.filter(item => item.parentClassId === 'summoner-unchained').length, 9);
  for (const item of added) {
    assert.match(item.sourceCitationText, /^.+ pg\. \d+$/);
    assert.ok(item.sourceBook);
    assert.ok(Number.isInteger(item.sourcePage));
    assert.ok(item.sourceText.length > 100, item.id);
    assert.equal(item.valuationStatus, 'valued');
  }
});

test('unchained Barbarian and Rogue expose no separate AoN archetype records', () => {
  assert.deepEqual(catalogue.zeroArchetypeClasses.sort(), ['barbarian-unchained', 'rogue-unchained']);
});
