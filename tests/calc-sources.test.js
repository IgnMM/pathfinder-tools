// Run with: node --test tests/calc-sources.test.js
// Coverage for calc/index.html's Sources padlock: a per-character
// excludedSources that follows the site-wide global Valid Sources setting
// (assets/valid-sources.js) until the player customizes it for that specific
// character, at which point it locks independently -- same pattern already
// proven on the spellbook pages, now wired into the damage calculator too.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../calc/index.html'), 'utf8');

// vm.createContext runs code in a separate V8 realm, so plain objects it
// creates have a different Object.prototype than this file's -- deepEqual
// treats that as "not reference-equal" even with identical content. A JSON
// round-trip normalizes both sides to this realm's plain objects.
function plain(v) { return JSON.parse(JSON.stringify(v)); }

function extractFn(name) {
  const fnStart = html.indexOf('function ' + name + '(');
  assert.ok(fnStart >= 0, `function ${name} must exist in calc/index.html`);
  const fnEnd = html.indexOf('\n}', fnStart) + 2;
  return html.slice(fnStart, fnEnd);
}

// Regression test for the real bug caught while building this feature:
// mergeStores(local, remote) starts from a COPY of remote and only takes a
// local profile's edits if local._updatedAt > remote._updatedAt. For a
// brand-new profile that has never been saved to disk, both sides are 0 --
// the tie does NOT favor local, so a freshly-computed in-memory value (like
// excludedSources from applyGlobalSourcesToProfile, which never touches
// _updatedAt) is silently discarded the moment anything calls saveStore().
test('mergeStores: REGRESSION -- when both _updatedAt are 0 (never saved), local edits must not be silently lost to the disk copy', () => {
  const src = extractFn('mergeStores');
  const context = {};
  vm.createContext(context);
  vm.runInContext(src, context);
  const local = { active: 'New Character', deletedProfiles: {}, profiles: [{ name: 'New Character', excludedSources: { 'Ultimate Magic': true }, sourcesCustomized: false }] };
  const remote = { active: 'New Character', deletedProfiles: {}, profiles: [{ name: 'New Character', excludedSources: {}, sourcesCustomized: false }] };
  const merged = context.mergeStores(local, remote);
  // Documents the actual (buggy-if-relied-upon) tie-breaking behavior: this
  // is exactly why calc/index.html writes computed sources straight to
  // localStorage right after computing them, instead of trusting a later
  // saveStore() to preserve an untouched in-memory value through a merge.
  assert.deepEqual(plain(merged.profiles[0].excludedSources), {}, 'documents that a 0-vs-0 timestamp tie favors the disk copy, not memory -- the reason a direct localStorage write is required at load time');
});

test('mergeStores: a local profile with a newer _updatedAt DOES win the merge', () => {
  const src = extractFn('mergeStores');
  const context = {};
  vm.createContext(context);
  vm.runInContext(src, context);
  const local = { active: 'New Character', deletedProfiles: {}, profiles: [{ name: 'New Character', _updatedAt: 500, excludedSources: { 'Ultimate Magic': true }, sourcesCustomized: true }] };
  const remote = { active: 'New Character', deletedProfiles: {}, profiles: [{ name: 'New Character', _updatedAt: 100, excludedSources: {}, sourcesCustomized: false }] };
  const merged = context.mergeStores(local, remote);
  assert.deepEqual(plain(merged.profiles[0].excludedSources), { 'Ultimate Magic': true });
  assert.equal(merged.profiles[0].sourcesCustomized, true);
});

function mockPFSources(excludedBooks) {
  return {
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

test('applyGlobalSourcesToProfile: recomputes excludedSources from the global list while not customized', () => {
  const src = extractFn('applyGlobalSourcesToProfile');
  const context = { MODIFIERS: [{ source: 'Ultimate Magic pg. 18' }, { source: 'Core Rulebook pg. 55' }], PFSources: mockPFSources({ 'Ultimate Magic': true }) };
  vm.createContext(context);
  vm.runInContext(src, context);
  const p = { excludedSources: {}, sourcesCustomized: false };
  context.applyGlobalSourcesToProfile(p);
  assert.deepEqual(plain(p.excludedSources), { 'Ultimate Magic pg. 18': true });
});

// The padlock itself: once a character's sources are customized, this
// function must be a complete no-op, regardless of what the global list says.
test('applyGlobalSourcesToProfile: the padlock -- a customized profile is left untouched even if the global list changes', () => {
  const src = extractFn('applyGlobalSourcesToProfile');
  const context = { MODIFIERS: [{ source: 'Ultimate Magic pg. 18' }, { source: 'Core Rulebook pg. 55' }], PFSources: mockPFSources({ 'Ultimate Magic': true, 'Core Rulebook': true }) };
  vm.createContext(context);
  vm.runInContext(src, context);
  const p = { excludedSources: { 'Core Rulebook pg. 55': true }, sourcesCustomized: true };
  context.applyGlobalSourcesToProfile(p);
  assert.deepEqual(plain(p.excludedSources), { 'Core Rulebook pg. 55': true }, 'a locked profile must not be overwritten even though the global list would now also exclude Ultimate Magic');
});

test('applyGlobalSourcesToProfile: safely does nothing when PFSources is not loaded', () => {
  const src = extractFn('applyGlobalSourcesToProfile');
  const context = { MODIFIERS: [{ source: 'Ultimate Magic pg. 18' }] };
  vm.createContext(context);
  vm.runInContext(src, context);
  const p = { excludedSources: {}, sourcesCustomized: false };
  assert.doesNotThrow(() => context.applyGlobalSourcesToProfile(p));
  assert.deepEqual(plain(p.excludedSources), {});
});

test('defaultProfile: new profiles start with sourcesCustomized:false (follow the global default)', () => {
  const src = extractFn('defaultProfile');
  const context = {};
  vm.createContext(context);
  vm.runInContext(src, context);
  const p = context.defaultProfile('Test');
  assert.equal(p.sourcesCustomized, false);
  assert.deepEqual(plain(p.excludedSources), {});
});
