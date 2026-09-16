// Run with: node --test tests/find-your-class-v2-app.test.js
// Pure state-logic coverage for assets/find-your-class/v2/app.js. mount()'s
// DOM rendering is not exercised here (this repo has no jsdom), matching the
// established convention for the v1 app.js test file.
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
const model = readJson('classification-model.json');
const classProfiles = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json']
  .flatMap(f => readJson(f).profiles);
const archetypeOverrides = Array.from({ length: 10 }, (_, i) => `archetype-profiles-pilot-${String(i + 1).padStart(2, '0')}.json`)
  .flatMap(f => readJson(f).profiles);
const criteriaIndex = V2.indexCriteria(criteriaDoc);
const profiles = V2.resolveAllProfiles(classProfiles, archetypeOverrides);

function fakeStorage() {
  const data = new Map();
  return { getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
}

test('a fresh state has no active preferences and matches nothing yet', () => {
  const state = App.createAppState();
  assert.equal(App.totalActivePreferenceCount(state), 0);
  assert.doesNotThrow(() => App.buildMatcherRequest(state));
});

test('buildMatcherRequest carries all four preference buckets through to the matcher unchanged', () => {
  const state = App.createAppState();
  state.capabilityPreferences['melee-combat'] = { desiredLevel: 'core', importance: 8 };
  state.practicalPreferences['build-complexity'] = { desiredLevel: 'low', importance: 6 };
  state.factPreferences['requires-alignment'] = { desired: false, importance: 4 };
  state.identityPreferences.magicIdentity = { mode: 'prefer', values: ['arcane'], importance: 7 };
  const result = App.runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  assert.ok(result.recommendations.length > 0);
  assert.equal(App.totalActivePreferenceCount(state), 4);
});

test('a notRelevant capability preference does not count as active', () => {
  const state = App.createAppState();
  state.capabilityPreferences['melee-combat'] = { notRelevant: true };
  assert.equal(App.totalActivePreferenceCount(state), 0);
});

test('an identity preference only counts as active in "prefer" mode, not require/exclude (those are pure gates)', () => {
  const state = App.createAppState();
  state.identityPreferences.magicIdentity = { mode: 'require', values: ['arcane'] };
  assert.equal(App.totalActivePreferenceCount(state), 0);
  state.identityPreferences.magicIdentity = { mode: 'prefer', values: ['arcane'], importance: 5 };
  assert.equal(App.totalActivePreferenceCount(state), 1);
});

test('initial state stage is "idea" (describe your character), not "start" (criteria)', () => {
  const state = App.createAppState();
  assert.equal(state.stage, 'idea');
  assert.equal(state.idea, '');
});

test('sessionStorage round-trips the v2 state under its own dedicated key, separate from v1', () => {
  const storage = fakeStorage();
  const state = App.createAppState();
  state.stage = 'results';
  state.idea = 'A sneaky elf who likes to hide';
  state.capabilityPreferences['stealth-subterfuge'] = { desiredLevel: 'core', importance: 9 };
  App.saveToSessionStorage(state, storage);
  assert.equal(App.SESSION_STORAGE_KEY, 'pf_find_your_class_v2');
  assert.notEqual(App.SESSION_STORAGE_KEY, 'pf_find_your_class_v1');
  const restored = App.loadFromSessionStorage(storage);
  assert.equal(restored.stage, 'results');
  assert.equal(restored.idea, 'A sneaky elf who likes to hide');
  assert.deepEqual(restored.capabilityPreferences['stealth-subterfuge'], { desiredLevel: 'core', importance: 9 });
});

test('the app never mutates the source profiles or criteria doc it is given', () => {
  const profilesSnapshot = JSON.parse(JSON.stringify(profiles));
  const criteriaSnapshot = JSON.parse(JSON.stringify(criteriaDoc));
  const state = App.createAppState();
  state.capabilityPreferences['wilderness-affinity'] = { desiredLevel: 'core', importance: 8 };
  App.runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  assert.deepEqual(profiles, profilesSnapshot);
  assert.deepEqual(criteriaDoc, criteriaSnapshot);
});
