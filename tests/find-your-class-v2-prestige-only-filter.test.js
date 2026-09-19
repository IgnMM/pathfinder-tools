// Run with: node --test tests/find-your-class-v2-prestige-only-filter.test.js
// User request: a discreet, opt-in "Only show prestige classes" filter on Classfinder's
// "Build your profile" (manual-criteria) screen. Previously prestige classes were always
// excluded from the main recommendation pool and only ever surfaced as a single bonus
// "worth studying next" tip -- there was no way to browse prestige classes as the primary
// results. matcher.js's matchProfiles(request, profiles, criteriaIndex, options) now
// accepts options.prestigeOnly: when true, the main pool is restricted to prestige
// classes ONLY (inverting the default exclusion) and no bonus tip is built (it would just
// repeat the top result). app.js wires this to a checkbox on the manual-profile screen,
// persisted per search as state.manualPrestigeOnly.
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
const criteriaIndex = V2.indexCriteria(criteriaDoc);
const classProfiles = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json', 'class-profiles-batch-04.json', 'class-profiles-batch-05.json', 'class-profiles-batch-06.json']
  .flatMap(f => readJson(f).profiles);
const prestigeProfiles = readJson('prestige-profiles.json').profiles;
const profiles = V2.resolveAllProfiles(classProfiles, [], prestigeProfiles);

const meleeCoreRequest = { inputMode: 'manual-profile', capabilityPreferences: { 'melee-combat': 'core' } };

test('matchProfiles without prestigeOnly never returns a prestige class in recommendations (unchanged default behaviour)', () => {
  const result = Matcher.matchProfiles(meleeCoreRequest, profiles, criteriaIndex, { maxResults: 4 });
  assert.ok(result.recommendations.length > 0);
  for (const rec of result.recommendations) assert.notEqual(rec.entityType, 'prestige-class');
});

test('matchProfiles with prestigeOnly:true returns ONLY prestige classes, and skips the bonus tip', () => {
  const result = Matcher.matchProfiles(meleeCoreRequest, profiles, criteriaIndex, { maxResults: 4, prestigeOnly: true });
  assert.ok(result.recommendations.length > 0);
  for (const rec of result.recommendations) assert.equal(rec.entityType, 'prestige-class');
  assert.equal(result.prestigeTip, null);
});

test('a prestige-class recommendation carries its qualification text through requirementsText', () => {
  const result = Matcher.matchProfiles(meleeCoreRequest, profiles, criteriaIndex, { maxResults: 4, prestigeOnly: true });
  const best = result.recommendations[0];
  assert.ok(best.requirementsText && best.requirementsText.length > 0);
});

test('createSearch defaults manualPrestigeOnly to false', () => {
  const state = App.createSearch();
  assert.equal(state.manualPrestigeOnly, false);
});

test('the manual-profile screen template renders a discreet, optional prestige-only checkbox, wired to a manual-toggle-prestige-only action', () => {
  const appSrc = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.match(appSrc, /class="fycPrestigeOnlyToggle"/);
  assert.match(appSrc, /data-action="manual-toggle-prestige-only"/);
  assert.match(appSrc, /Only show prestige classes/);
});

test('find-your-class-v2/index.html defines the .fycPrestigeOnlyToggle CSS as a small, muted (discreet) row, not a prominent control', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'find-your-class-v2', 'index.html'), 'utf8');
  assert.match(html, /\.fycPrestigeOnlyToggle\{[^}]*color:var\(--muted\)[^}]*font-size:\.78rem/);
});

test('app.js passes state.manualPrestigeOnly through to both the initial manual-find-paths match and any re-run while results are showing', () => {
  const appSrc = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  const matches = appSrc.match(/prestigeOnly:\s*state\.manualPrestigeOnly/g) || [];
  assert.equal(matches.length, 2, 'expected prestigeOnly to be threaded through in exactly 2 call sites (manual-find-paths and reRunLastSearchIfShowingResults)');
});
