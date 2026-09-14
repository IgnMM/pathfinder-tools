// Run with: node --test tests/find-your-class-loader.test.js
// Regression coverage for implementation-order step 1 ("Data schemas and manifest
// loader") from finder/Find_Your_Class_Pilot_Blueprint_v1.md section 17, plus the
// typed-operation resolver and scoring formulas from step 2/13 of
// finder/Find_Your_Class_Product_Architecture_v1.md.
//
// No production class/archetype/option data exists yet (see manifest.json's own
// notes) -- the resolver/scoring tests below use small in-memory fixtures, per
// Find_Your_Class_Pilot_Blueprint_v1.md section 14 ("Claude should implement
// against small placeholder records first").
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'find-your-class');
const FYC = require(path.join(dir, 'loader.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }

test('manifest, criteria, vocabularies and question-templates parse and validate', () => {
  const manifest = readJson('manifest.json');
  assert.doesNotThrow(() => FYC.validateManifest(manifest));
  const criteria = readJson(manifest.entities.criteria);
  assert.doesNotThrow(() => FYC.validateCriteriaFile(criteria));
  const vocab = readJson(manifest.entities.vocabularies);
  assert.ok(Array.isArray(vocab.operationVocabulary) && vocab.operationVocabulary.length > 0);
  const questions = readJson(manifest.entities.questionTemplates);
  assert.ok(Array.isArray(questions.questions) && questions.questions.length > 0);
  const explanations = readJson(manifest.entities.explanationTemplates);
  assert.ok(Array.isArray(explanations.fragments) && Array.isArray(explanations.evidence));
});

test('every operation vocabulary entry in vocabularies.json is implemented by the loader', () => {
  const vocab = readJson('vocabularies.json');
  const implemented = new Set(FYC.OPERATIONS_VOCABULARY);
  for (const op of vocab.operationVocabulary) {
    assert.ok(implemented.has(op), `vocabularies.json declares "${op}" but loader.js does not implement it`);
  }
  for (const op of FYC.OPERATIONS_VOCABULARY) {
    assert.ok(vocab.operationVocabulary.includes(op), `loader.js implements "${op}" but it is missing from the closed vocabulary in vocabularies.json`);
  }
});

test('every question template references only criteria that exist in criteria.json (or none, for non-scored questions)', () => {
  const criteria = FYC.indexCriteria(readJson('criteria.json'));
  const questions = readJson('question-templates.json');
  for (const q of questions.questions) {
    for (const cid of q.criteriaClarified || []) {
      assert.ok(criteria.has(cid), `question "${q.id}" references unknown criterion "${cid}"`);
    }
    for (const a of q.answers) {
      for (const m of a.mutations) {
        if (m.criterionId) assert.ok(criteria.has(m.criterionId), `question "${q.id}" answer "${a.label}" references unknown criterion "${m.criterionId}"`);
      }
    }
  }
});

test('no duplicate criterion ids and every id is kebab-case', () => {
  const { criteria } = readJson('criteria.json');
  const ids = criteria.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate criterion id found');
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9-]*$/, `criterion id "${id}" is not kebab-case`);
});

test('resolveEffectiveProfile applies archetype/option operations in order onto a cloned base (placeholder fixture, not production data)', () => {
  const baseClass = {
    id: 'placeholder-fighter', entityType: 'class', name: 'Placeholder Fighter', status: 'draft',
    capabilities: {
      'melee-ranged': { position: 1, confidence: 'draft' },
      'personal-durability': { rating: 7, confidence: 'draft' },
    },
    categories: { 'armour-preference': ['heavy'] },
    identity: { fantasyTags: [{ id: 'brutal-front-line-warrior', strength: 9 }] },
  };
  const archetypeDelta = {
    id: 'placeholder-archer', operations: [
      { op: 'set-capability', criterionId: 'melee-ranged', position: 9 },
      { op: 'remove-category-value', criterionId: 'armour-preference', value: 'heavy' },
      { op: 'add-category-value', criterionId: 'armour-preference', value: 'light' },
      { op: 'add-fantasy-tag', tagId: 'agile-duelist', strength: 6 },
      { op: 'add-tradeoff-fragment', fragmentId: 'less-armoured' },
    ],
  };

  const effective = FYC.resolveEffectiveProfile(baseClass, [archetypeDelta]);

  assert.equal(effective.capabilities['melee-ranged'].position, 9, 'archetype override did not apply');
  assert.equal(effective.capabilities['personal-durability'].rating, 7, 'unrelated inherited capability must be untouched');
  assert.deepEqual(effective.categories['armour-preference'], ['light'], 'category remove+add did not apply in order');
  assert.deepEqual(effective.componentIds, ['placeholder-fighter', 'placeholder-archer']);
  assert.equal(baseClass.capabilities['melee-ranged'].position, 1, 'resolver must clone the base, never mutate it');
  assert.equal(effective.identity.fantasyTags.length, 2, 'archetype fantasy tag should be added, base tag kept');
  assert.deepEqual(effective.explanationProfile.tradeoffFragmentIds, ['less-armoured']);
});

test('resolveEffectiveProfile rejects removing something the inherited profile does not have', () => {
  const baseClass = { id: 'placeholder-class', entityType: 'class', name: 'Placeholder', status: 'draft', categories: {} };
  const badDelta = { id: 'bad-archetype', operations: [{ op: 'remove-category-value', criterionId: 'armour-preference', value: 'heavy' }] };
  assert.throws(() => FYC.resolveEffectiveProfile(baseClass, [badDelta]), FYC.ValidationError);
});

test('applyOperation rejects an operation not in the closed vocabulary', () => {
  const profile = { id: 'x', entityType: 'effective', capabilities: {} };
  assert.throws(() => FYC.applyOperation(profile, { op: 'invent-a-new-op', criterionId: 'melee-ranged' }), FYC.ValidationError);
});

test('capability/directional fit: unknown data is never scored as zero', () => {
  assert.deepEqual(FYC.scoreCapabilityFit(undefined, 8), { unknown: true });
  assert.deepEqual(FYC.scoreDirectionalFit(undefined, 3, 8), { unknown: true });
});

test('capability fit: rating 1 -> fit 0, rating 10 -> fit 1, importance curve favours high importance', () => {
  const low = FYC.scoreCapabilityFit(1, 10);
  const high = FYC.scoreCapabilityFit(10, 10);
  assert.equal(low.fit, 0);
  assert.equal(high.fit, 1);
  assert.ok(FYC.importanceWeight(10) > FYC.importanceWeight(5), 'importance 10 must weight more than importance 5');
  assert.ok(FYC.importanceWeight(1) > 0, 'importance 1 must remain non-zero (blueprint acceptance criterion 5)');
});

test('directional fit is symmetrical: opposite poles score identically when equally far from desired', () => {
  const towardLow = FYC.scoreDirectionalFit(1, 10, 9);
  const towardHigh = FYC.scoreDirectionalFit(10, 1, 9);
  assert.equal(towardLow.fit, towardHigh.fit, 'directional poles must be symmetrical (blueprint acceptance criterion 6)');
  const exact = FYC.scoreDirectionalFit(5.5, 5.5, 9);
  assert.equal(exact.fit, 1, 'an exact desired-position match must score fit 1');
});
