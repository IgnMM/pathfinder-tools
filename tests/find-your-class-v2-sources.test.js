// Run with: node --test tests/find-your-class-v2-sources.test.js
// Coverage for the "Sources" (sourcebooks) padlock pattern in Find Your
// Class v2 -- the same per-character customization/global-follow mechanism
// already used by the 7 spellbook pages (assets/valid-sources.js), now also
// applied to both FYC input modes. A player may run several searches for
// different campaigns with different GMs, each with its own sourcebook
// restrictions -- editing sources for one search locks it independently of
// the site's global Valid Sources default.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'assets', 'find-your-class', 'v2');
const V2 = require(path.join(dir, 'loader.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }
const classProfiles = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json', 'class-profiles-batch-04.json', 'class-profiles-batch-05.json', 'class-profiles-batch-06.json']
  .flatMap(f => readJson(f).profiles);
const archetypeOverrides = Array.from({ length: 10 }, (_, i) => `archetype-profiles-pilot-${String(i + 1).padStart(2, '0')}.json`)
  .flatMap(f => readJson(f).profiles).filter(p => !['alchemist','antipaladin','arcanist','barbarian','bard'].includes(p.parentClassId))
  .concat(...['slayer','summoner-unchained','alchemist','antipaladin','arcanist','barbarian','bard'].map(id => readJson(`archetype-profiles-${id}.json`).profiles));
const profiles = V2.resolveAllProfiles(classProfiles, archetypeOverrides);

// A minimal but faithful mock of the real assets/valid-sources.js API --
// enough to exercise app.js's integration without loading real browser globals.
function installMockPFSources(excludedBooks) {
  global.PFSources = {
    isAllowed(source, excludedByCaller) {
      const excluded = excludedByCaller || excludedBooks;
      const name = String(source || 'Unknown').replace(/\s*pg\.?\s*\d+[a-zA-Z]?\s*$/i, '').replace(/^(Pathfinder RPG|PRPG)\s+/i, '').trim();
      return !excluded[name];
    },
    computeExcludedSources(allSourceStrings, excludedByBookName) {
      const out = {};
      allSourceStrings.forEach(src => {
        const name = String(src || 'Unknown').replace(/\s*pg\.?\s*\d+[a-zA-Z]?\s*$/i, '').replace(/^(Pathfinder RPG|PRPG)\s+/i, '').trim();
        if (excludedByBookName[name]) out[src || 'Unknown'] = true;
      });
      return out;
    },
    loadGlobalExcludedLocal() { return excludedBooks; },
  };
}
function uninstallMockPFSources() { delete global.PFSources; }

// Fresh require of app.js per test file run is fine (module cache is shared,
// but app.js reads PFSources at CALL time, not load time, so installing/
// removing the mock around each test works correctly).
const App = require(path.join(dir, 'app.js'));

test('without PFSources loaded (e.g. in a non-browser context), filterProfilesBySources is a safe no-op', () => {
  uninstallMockPFSources();
  const state = App.createSearch();
  const result = App.filterProfilesBySources(profiles, state);
  assert.equal(result.length, profiles.length, 'must pass every profile through unchanged when PFSources is unavailable');
});

test('filterProfilesBySources excludes profiles whose source book is in excludedSources', () => {
  installMockPFSources({ 'Ultimate Magic': true });
  const state = App.createSearch();
  state.excludedSources = { 'Ultimate Magic pg. 18': true };
  const result = App.filterProfilesBySources(profiles, state);
  const chirurgeon = profiles.find(p => p.id === 'alchemist:chirurgeon');
  assert.equal(chirurgeon.sourceCitationText, 'Ultimate Magic pg. 18');
  assert.ok(!result.some(p => p.id === 'alchemist:chirurgeon'), 'a profile whose exact source citation is excluded must be filtered out');
  assert.ok(result.some(p => p.id === 'fighter'), 'a profile from a different (allowed) source must remain');
  uninstallMockPFSources();
});

test('applyGlobalSourcesToProfile recomputes excludedSources from the global list while NOT customized', () => {
  installMockPFSources({ 'Ultimate Magic': true });
  const state = App.createSearch();
  assert.equal(state.sourcesCustomized, false);
  App.applyGlobalSourcesToProfile(state, profiles);
  assert.ok(state.excludedSources['Ultimate Magic pg. 18'], 'global exclusion must propagate into this search\'s excludedSources');
  uninstallMockPFSources();
});

// The padlock: once sourcesCustomized is true, applyGlobalSourcesToProfile
// must leave excludedSources completely untouched, even if the global list
// changes -- this is what lets one search stay pinned to campaign A's
// sourcebooks while the site-wide default (and other searches) follow
// campaign B's GM.
test('the padlock: once sourcesCustomized is true, this search\'s sources are locked and ignore global changes', () => {
  installMockPFSources({ 'Ultimate Magic': true });
  const state = App.createSearch();
  state.sourcesCustomized = true;
  state.excludedSources = { 'Core Rulebook pg. 55': true }; // a deliberately different, manually-chosen set
  App.applyGlobalSourcesToProfile(state, profiles);
  assert.deepEqual(state.excludedSources, { 'Core Rulebook pg. 55': true }, 'a locked search must not be overwritten by the global default');
  uninstallMockPFSources();
});

test('a locked search filters candidates by its OWN sources, independent of what the global default would produce', () => {
  installMockPFSources({ 'Ultimate Magic': true }); // global excludes Ultimate Magic
  const state = App.createSearch();
  state.sourcesCustomized = true;
  state.excludedSources = { 'PRPG Core Rulebook pg. 55': true }; // this search instead excludes the Core Rulebook fighter citation
  const result = App.filterProfilesBySources(profiles, state);
  assert.ok(!result.some(p => p.id === 'fighter'), 'fighter (Core Rulebook) must be excluded per this search\'s own locked sources');
  assert.ok(result.some(p => p.id === 'alchemist:chirurgeon'), 'Ultimate Magic content must remain allowed here, even though the GLOBAL default excludes it');
  uninstallMockPFSources();
});

test('runMatching and runManualMatching both apply the source filter before scoring', () => {
  installMockPFSources({ 'Ultimate Magic': true });
  const criteriaIndex = V2.indexCriteria(readJson('criteria.json'));
  const state = App.createSearch();
  state.sourcesCustomized = true;
  state.excludedSources = { 'Ultimate Magic pg. 18': true };
  state.capabilityPreferences['healing-recovery'] = { desiredLevel: 'core', importance: 8 };
  state.manualCapabilityPreferences['healing-recovery'] = 'core';
  const ideaResult = App.runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  const manualResult = App.runManualMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  assert.ok(!ideaResult.recommendations.some(r => r.id === 'alchemist:chirurgeon'), 'idea-mode results must respect the source filter');
  assert.ok(!manualResult.recommendations.some(r => r.id === 'alchemist:chirurgeon'), 'manual-mode results must respect the source filter');
  uninstallMockPFSources();
});

// The whole point of naming multiple searches: each one's Sources padlock is
// completely independent, so a player juggling two campaigns with different
// GMs can lock each search to its own allowed sourcebooks without the two
// interfering with each other.
test('two named searches in the same store keep fully independent locked Sources selections', () => {
  installMockPFSources({ 'Ultimate Magic': true });
  const store = App.createStore();
  const campaignA = store.searches[store.active];
  campaignA.sourcesCustomized = true;
  campaignA.excludedSources = { 'Ultimate Magic pg. 18': true };
  store.searches['Campaign B'] = App.createSearch();
  const campaignB = store.searches['Campaign B'];
  campaignB.sourcesCustomized = true;
  campaignB.excludedSources = { 'PRPG Core Rulebook pg. 55': true };
  const allowedForA = App.filterProfilesBySources(profiles, campaignA);
  const allowedForB = App.filterProfilesBySources(profiles, campaignB);
  assert.ok(!allowedForA.some(p => p.id === 'alchemist:chirurgeon'), 'Campaign A excludes Ultimate Magic');
  assert.ok(allowedForB.some(p => p.id === 'alchemist:chirurgeon'), 'Campaign B allows Ultimate Magic -- unaffected by Campaign A\'s lock');
  assert.ok(!allowedForB.some(p => p.id === 'fighter'), 'Campaign B excludes the Core Rulebook');
  assert.ok(allowedForA.some(p => p.id === 'fighter'), 'Campaign A allows the Core Rulebook -- unaffected by Campaign B\'s lock');
  uninstallMockPFSources();
});
