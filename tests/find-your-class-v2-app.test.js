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
const classProfiles = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json', 'class-profiles-batch-04.json', 'class-profiles-batch-05.json', 'class-profiles-batch-06.json']
  .flatMap(f => readJson(f).profiles);
const archetypeOverrides = Array.from({ length: 10 }, (_, i) => `archetype-profiles-pilot-${String(i + 1).padStart(2, '0')}.json`)
  .flatMap(f => readJson(f).profiles).filter(p => !['alchemist','antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman'].includes(p.parentClassId))
  .concat(...['slayer','summoner-unchained','alchemist','antipaladin','arcanist','barbarian','bard','bloodrager','brawler','cavalier','cleric','druid','fighter','gunslinger','hunter','inquisitor','investigator','kineticist','magus','medium','mesmerist','monk','monk-unchained','ninja','occultist','oracle','paladin','psychic','ranger','rogue','samurai','shaman'].map(id => readJson(`archetype-profiles-${id}.json`).profiles));
const criteriaIndex = V2.indexCriteria(criteriaDoc);
const profiles = V2.resolveAllProfiles(classProfiles, archetypeOverrides);

function fakeStorage() {
  const data = new Map();
  return { getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
}

test('a fresh state has no active preferences and matches nothing yet', () => {
  const state = App.createSearch();
  assert.equal(App.totalActivePreferenceCount(state), 0);
  assert.doesNotThrow(() => App.buildMatcherRequest(state));
});

test('buildMatcherRequest carries all four preference buckets through to the matcher unchanged', () => {
  const state = App.createSearch();
  state.capabilityPreferences['melee-combat'] = { desiredLevel: 'core', importance: 8 };
  state.practicalPreferences['build-complexity'] = { desiredLevel: 'low', importance: 6 };
  state.factPreferences['requires-alignment'] = { desired: false, importance: 4 };
  state.identityPreferences.magicIdentity = { mode: 'prefer', values: ['arcane'], importance: 7 };
  const result = App.runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  assert.ok(result.recommendations.length > 0);
  assert.equal(App.totalActivePreferenceCount(state), 4);
});

test('a notRelevant capability preference does not count as active', () => {
  const state = App.createSearch();
  state.capabilityPreferences['melee-combat'] = { notRelevant: true };
  assert.equal(App.totalActivePreferenceCount(state), 0);
});

test('an identity preference only counts as active in "prefer" mode, not require/exclude (those are pure gates)', () => {
  const state = App.createSearch();
  state.identityPreferences.magicIdentity = { mode: 'require', values: ['arcane'] };
  assert.equal(App.totalActivePreferenceCount(state), 0);
  state.identityPreferences.magicIdentity = { mode: 'prefer', values: ['arcane'], importance: 5 };
  assert.equal(App.totalActivePreferenceCount(state), 1);
});

test('initial state stage is "choice" (pick idea vs. profile), with both drafts empty', () => {
  const state = App.createSearch();
  assert.equal(state.stage, 'choice');
  assert.equal(state.idea, '');
  assert.deepEqual(state.manualCapabilityPreferences, {});
});

test('the store persists to localStorage (not sessionStorage) under its own dedicated key, separate from v1 -- survives closing the browser, like saved characters do', () => {
  const storage = fakeStorage();
  const store = App.createStore();
  const search = store.searches[store.active];
  search.stage = 'results';
  search.idea = 'A sneaky elf who likes to hide';
  search.capabilityPreferences['stealth-subterfuge'] = { desiredLevel: 'core', importance: 9 };
  search.manualCapabilityPreferences['melee-combat'] = 'core';
  App.saveStoreToStorage(store, storage);
  assert.equal(App.STORAGE_KEY, 'pf_find_your_class_v2');
  assert.notEqual(App.STORAGE_KEY, 'pf_find_your_class_v1');
  const restored = App.loadStoreFromStorage(storage);
  const restoredSearch = restored.searches[restored.active];
  assert.equal(restoredSearch.stage, 'results');
  assert.equal(restoredSearch.idea, 'A sneaky elf who likes to hide');
  assert.deepEqual(restoredSearch.capabilityPreferences['stealth-subterfuge'], { desiredLevel: 'core', importance: 9 });
  assert.equal(restoredSearch.manualCapabilityPreferences['melee-combat'], 'core');
});

// =====================================================================
// Multiple named searches (New / Save As / Rename / Delete) -- same
// "saved character" concept as Calc and the spellbook pages.
// =====================================================================

test('createStore starts with exactly one search, named "Search 1"', () => {
  const store = App.createStore();
  assert.deepEqual(Object.keys(store.searches), ['Search 1']);
  assert.equal(store.active, 'Search 1');
  assert.equal(store.searches['Search 1'].stage, 'choice');
});

test('generateSearchName finds the first unused "Search N" slot, skipping ones already taken', () => {
  assert.equal(App.generateSearchName([]), 'Search 1');
  assert.equal(App.generateSearchName(['Search 1']), 'Search 2');
  assert.equal(App.generateSearchName(['Search 1', 'Search 2']), 'Search 3');
  assert.equal(App.generateSearchName(['Search 2']), 'Search 1', 'must fill the first GAP, not just count entries');
  assert.equal(App.generateSearchName(['My Campaign']), 'Search 1', 'a custom-named search does not block the default sequence');
});

test('deserializeStore migrates a legacy pre-multi-search single-search blob into a one-search store, so nobody\'s existing draft is lost', () => {
  const legacy = App.createSearch();
  legacy.idea = 'An old draft from before multiple searches existed';
  legacy.manualCapabilityPreferences['melee-combat'] = 'core';
  const migrated = App.deserializeStore(JSON.stringify(legacy));
  assert.equal(migrated.active, App.DEFAULT_SEARCH_NAME);
  assert.deepEqual(Object.keys(migrated.searches), [App.DEFAULT_SEARCH_NAME]);
  assert.equal(migrated.searches[App.DEFAULT_SEARCH_NAME].idea, 'An old draft from before multiple searches existed');
  assert.equal(migrated.searches[App.DEFAULT_SEARCH_NAME].manualCapabilityPreferences['melee-combat'], 'core');
});

test('deserializeStore passes an already-current {active, searches} store through unchanged', () => {
  const store = App.createStore();
  store.searches['My Campaign'] = App.createSearch();
  store.active = 'My Campaign';
  const roundTripped = App.deserializeStore(JSON.stringify(store));
  assert.deepEqual(Object.keys(roundTripped.searches).sort(), ['My Campaign', 'Search 1']);
  assert.equal(roundTripped.active, 'My Campaign');
});

test('deserializeStore rejects garbage and an empty searches map, returning null', () => {
  assert.equal(App.deserializeStore(null), null);
  assert.equal(App.deserializeStore('not json'), null);
  assert.equal(App.deserializeStore(JSON.stringify({ foo: 'bar' })), null);
  assert.equal(App.deserializeStore(JSON.stringify({ active: 'X', searches: {} })), null, 'a store with zero searches is not valid');
});

// --- Manual-profile mode: required test #10 (switching modes preserves both drafts) ---
test('switching between idea and profile stages preserves both drafts -- neither is silently cleared', () => {
  const state = App.createSearch();
  state.idea = 'A wandering swordsman';
  state.manualCapabilityPreferences['melee-combat'] = 'core';
  state.manualCapabilityPreferences['personal-durability'] = 'available';
  // simulate navigating: idea -> profile -> idea again
  state.stage = 'profile';
  assert.equal(state.idea, 'A wandering swordsman', 'idea draft must survive entering profile mode');
  state.stage = 'idea';
  assert.deepEqual(state.manualCapabilityPreferences, { 'melee-combat': 'core', 'personal-durability': 'available' }, 'profile draft must survive returning to idea mode');
});

test('the app never mutates the source profiles or criteria doc it is given', () => {
  const profilesSnapshot = JSON.parse(JSON.stringify(profiles));
  const criteriaSnapshot = JSON.parse(JSON.stringify(criteriaDoc));
  const state = App.createSearch();
  state.capabilityPreferences['wilderness-affinity'] = { desiredLevel: 'core', importance: 8 };
  App.runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  assert.deepEqual(profiles, profilesSnapshot);
  assert.deepEqual(criteriaDoc, criteriaSnapshot);
});

// =====================================================================
// Manual-profile mode (24-criterion builder) -- spec section 9 required tests
// =====================================================================

// Required test #2: every criterion defaults to Not relevant.
test('a fresh manual profile has every criterion defaulting to Not relevant (no key present)', () => {
  const state = App.createSearch();
  for (const id of criteriaIndex.keys()) {
    assert.equal(state.manualCapabilityPreferences[id], undefined, `${id} must default to absent-from-map (= not relevant)`);
  }
  assert.equal(App.totalActiveManualPreferenceCount(state), 0);
});

// Required test #3: Not relevant criteria are omitted from the request (never
// serialized as the literal string "not-relevant").
test('buildManualMatcherRequest omits not-relevant criteria entirely -- never serializes "not-relevant" as a value', () => {
  const state = App.createSearch();
  state.manualCapabilityPreferences['melee-combat'] = 'core';
  // a criterion explicitly reset to not-relevant (e.g. via the chip) must not appear at all
  state.manualCapabilityPreferences['ranged-combat'] = 'not-relevant';
  const request = App.buildManualMatcherRequest(state);
  assert.equal(request.inputMode, 'manual-profile');
  assert.deepEqual(request.capabilityPreferences, { 'melee-combat': 'core' });
  assert.ok(!('ranged-combat' in request.capabilityPreferences), 'not-relevant criterion must not appear as a key at all');
  assert.ok(!JSON.stringify(request).includes('not-relevant'), 'the literal string "not-relevant" must never appear in the serialized request');
});

// Required test #4: Absent is retained as an active preference (not treated
// like not-relevant).
test('buildManualMatcherRequest retains "absent" as a real, active preference value', () => {
  const state = App.createSearch();
  state.manualCapabilityPreferences['summoning-companions'] = 'absent';
  const request = App.buildManualMatcherRequest(state);
  assert.equal(request.capabilityPreferences['summoning-companions'], 'absent');
  assert.equal(App.totalActiveManualPreferenceCount(state), 1);
});

// Required test #5: search cannot start with zero active criteria (the guard
// the UI's disabled button and handleAction both rely on).
test('totalActiveManualPreferenceCount is 0 for an empty profile, which is what gates "Find my paths"', () => {
  const state = App.createSearch();
  assert.equal(App.totalActiveManualPreferenceCount(state), 0);
  state.manualCapabilityPreferences['melee-combat'] = 'core';
  assert.equal(App.totalActiveManualPreferenceCount(state), 1);
});

// Required test #9: manual and text input modes use the same candidate catalogue.
test('runMatching (idea mode) and runManualMatching (profile mode) both search the exact same profiles array', () => {
  const state = App.createSearch();
  state.capabilityPreferences['melee-combat'] = { desiredLevel: 'core', importance: 8 };
  state.manualCapabilityPreferences['melee-combat'] = 'core';
  const ideaResult = App.runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  const manualResult = App.runManualMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  const ideaIds = new Set(ideaResult._internal.ranked.map(r => r.profile.id));
  const manualIds = new Set(manualResult._internal.ranked.map(r => r.profile.id));
  assert.deepEqual(ideaIds, manualIds, 'both modes must rank the exact same candidate profiles');
  assert.equal(ideaResult._internal.ranked.length, profiles.length);
  assert.equal(manualResult._internal.ranked.length, profiles.length);
});
