// Run with: node --test tests/find-your-class-v2-manual-profile.test.js
// Coverage for the manual 24-criterion "Build your profile" input mode --
// the 13 required tests from the manual-profile-builder spec, split across
// this file (UI/data coverage) and find-your-class-v2-matcher.test.js
// (scoring-formula coverage) where that's the more natural home.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'assets', 'find-your-class', 'v2');
const V2 = require(path.join(dir, 'loader.js'));
const Matcher = require(path.join(dir, 'matcher.js'));
const App = require(path.join(dir, 'app.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }
const criteriaDoc = readJson('criteria.json');
const classProfiles = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json', 'class-profiles-batch-04.json', 'class-profiles-batch-05.json', 'class-profiles-batch-06.json']
  .flatMap(f => readJson(f).profiles);
const archetypeOverrides = Array.from({ length: 10 }, (_, i) => `archetype-profiles-pilot-${String(i + 1).padStart(2, '0')}.json`)
  .flatMap(f => readJson(f).profiles).filter(p => !['alchemist','antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman'].includes(p.parentClassId))
  .concat(...['slayer','summoner-unchained','alchemist','antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman'].map(id => readJson(`archetype-profiles-${id}.json`).profiles));
const criteriaIndex = V2.indexCriteria(criteriaDoc);
const profiles = V2.resolveAllProfiles(classProfiles, archetypeOverrides);

// Required test #1: all 24 criteria are rendered exactly once.
test('the manual-profile builder\'s four groups cover all 24 criteria exactly once, no duplicates, no omissions', () => {
  assert.equal(criteriaIndex.size, 24);
  const idsByGroup = App.CAPABILITY_GROUPS.map(group => [...criteriaIndex.values()].filter(c => c.group === group).map(c => c.id));
  const allIds = idsByGroup.flat();
  assert.equal(allIds.length, 24, 'the four groups together must render exactly 24 cards');
  assert.equal(new Set(allIds).size, 24, 'no criterion may appear in more than one group (duplicate render)');
  for (const id of criteriaIndex.keys()) assert.ok(allIds.includes(id), `${id} must appear in exactly one group`);
  // every group named in CAPABILITY_GROUP_LABELS must actually have cards
  for (const group of App.CAPABILITY_GROUPS) assert.ok(App.CAPABILITY_GROUP_LABELS[group], `${group} needs a player-facing section label`);
});

test('the four section labels match the product spec\'s exact names', () => {
  assert.deepEqual(App.CAPABILITY_GROUP_LABELS, {
    offence: 'Offence',
    battlefield: 'Battlefield presence',
    support: 'Magic and support',
    exploration: 'Exploration and interaction',
  });
});

test('the four-state selector is exactly Not relevant / Absent / Available / Core', () => {
  assert.deepEqual(App.MANUAL_VALUES, ['absent', 'available', 'core']);
  assert.deepEqual(App.MANUAL_VALUE_LABELS, {
    'not-relevant': 'Not relevant', absent: 'Absent', available: 'Available', core: 'Core',
  });
});

// Required test #11 (manual mode): archetypes show their parent class visibly.
test('manual-profile results show "Parent class" for archetypes and no parent for class-paths', () => {
  const state = App.createSearch();
  state.manualCapabilityPreferences['healing-recovery'] = 'core';
  const result = App.runManualMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  const archetypeRec = result.recommendations.find(r => r.entityType === 'archetype');
  const classPathRec = result.recommendations.find(r => r.entityType === 'class-path');
  if (archetypeRec) assert.ok(archetypeRec.parentLabel && archetypeRec.parentLabel.length, 'archetype recommendation must name its parent class');
  if (classPathRec) assert.equal(classPathRec.parentLabel, null, 'a class-path must never claim a parent');
});

// Required test #12 (manual mode): result explanations contain no score,
// weight, decimal, percentage or internal criterion ID.
test('manual-profile result explanations are in player language -- no scores, decimals, percentages or raw criterion ids', () => {
  const state = App.createSearch();
  state.manualCapabilityPreferences['melee-combat'] = 'core';
  state.manualCapabilityPreferences['personal-durability'] = 'core';
  state.manualCapabilityPreferences['summoning-companions'] = 'absent';
  const result = App.runManualMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  const text = JSON.stringify(result.recommendations);
  assert.ok(!/melee-combat|personal-durability|summoning-companions/.test(text), 'must not leak raw criterion ids');
  assert.ok(!/\d\.\d{2,}/.test(text), 'must not leak decimal fit scores');
  assert.ok(!/\d+%/.test(text), 'must not leak a numeric percentage (URL-encoded characters like %20 are fine)');
  assert.ok(!/overallFit|weight|score/i.test(text), 'must not leak statistical/internal vocabulary');
  assert.ok(!/\bnot-relevant\b/.test(text), 'must never leak the internal not-relevant sentinel');
});

// Required test #8: a candidate with a forbidden source is never returned.
// NOTE: v2 has no source/sourcebook filter implemented yet anywhere in the
// app (grep confirms "sourcebook" only appears as one entry in an unrelated
// enum in classification-model.json) -- there is no "existing selected-source
// filter" to preserve, unlike what the spec assumed. This is a known gap,
// not a silent omission: both input modes pass the full 140-profile
// catalogue through untouched, so there is currently no mechanism that could
// exclude a "forbidden source" candidate at all. This test documents that
// state of affairs rather than faking a filter that doesn't exist.
test('KNOWN GAP: no source/sourcebook filter exists in v2 yet -- both input modes see the unfiltered 140-profile catalogue', () => {
  const state = App.createSearch();
  state.manualCapabilityPreferences['melee-combat'] = 'core';
  const request = App.buildManualMatcherRequest(state);
  assert.ok(!('sourceFilter' in request) && !('enabledSources' in request), 'no source-filter field exists on the manual request (nothing to preserve yet)');
  const result = App.runManualMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  assert.equal(result._internal.ranked.length, profiles.length, 'the full catalogue is searched; there is no exclusion mechanism to test yet');
});
