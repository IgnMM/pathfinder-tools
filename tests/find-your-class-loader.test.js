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
//
// A second block below ("contract fixes, Codex review of commit 8c5efdd") is the
// direct regression guard for the six issues Codex's review found in that commit:
// capability-vs-directional field mismatches, incomplete "Not relevant" clearing,
// silently empty answer mutations, shallow operation validation, no
// archetype/option compatibility checking, and unvalidated scoring inputs.
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
  // Shape updated 2026-09-15: the empty fragments/evidence stub was replaced by
  // Find_Your_Class_Editorial_Explanation_Catalogue_v1.json's own real structure
  // (numericNarratives/categoricalNarratives/roleOpeners/specialCaseRules) --
  // see the "Editorial explanation catalogue integration" section of
  // tests/find-your-class-matcher.test.js for full coverage.
  assert.doesNotThrow(() => FYC.validateExplanationCatalogue(explanations, FYC.indexCriteria(criteria)));
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
      'personal-durability': { rating: 7, confidence: 'draft' },
    },
    categories: { 'armour-preference': ['heavy'] },
    identity: { fantasyTags: [{ id: 'brutal-front-line-warrior', strength: 9 }] },
  };
  const archetypeDelta = {
    id: 'placeholder-archer', entityType: 'archetype', parentId: 'placeholder-fighter', operations: [
      { op: 'set-directional-position', criterionId: 'melee-ranged', position: 9 },
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
  assert.equal(baseClass.capabilities['personal-durability'].rating, 7, 'resolver must clone the base, never mutate it');
  assert.equal(effective.identity.fantasyTags.length, 2, 'archetype fantasy tag should be added, base tag kept');
  assert.deepEqual(effective.explanationProfile.tradeoffFragmentIds, ['less-armoured']);
});

test('resolveEffectiveProfile rejects removing something the inherited profile does not have', () => {
  const baseClass = { id: 'placeholder-class', entityType: 'class', name: 'Placeholder', status: 'draft', categories: {} };
  const badDelta = { id: 'bad-archetype', entityType: 'archetype', parentId: 'placeholder-class', operations: [{ op: 'remove-category-value', criterionId: 'armour-preference', value: 'heavy' }] };
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
  const exact = FYC.scoreDirectionalFit(6, 6, 9);
  assert.equal(exact.fit, 1, 'an exact desired-position match must score fit 1');
  const halfway = FYC.scoreDirectionalFit(6, 5.5, 9);
  assert.ok(halfway.fit > 0.9 && halfway.fit < 1, 'a 5.5 "flexible midpoint" desiredPosition must be accepted (not rejected as non-integer)');
});

// -----------------------------------------------------------------------
// Contract fixes, Codex review of commit 8c5efdd (numbered to match that review).
// -----------------------------------------------------------------------

test('1. capability-kind criteria cannot be mutated with desiredPosition; directional-kind cannot use rating/position of the wrong field', () => {
  const criteria = FYC.indexCriteria(readJson('criteria.json'));
  assert.equal(criteria.get('personal-durability').kind, 'capability');
  assert.equal(criteria.get('melee-ranged').kind, 'directional');

  const baseClass = { id: 'x', entityType: 'class', name: 'X', status: 'draft' };
  // A capability criterion must be set with "rating" via set-capability, and
  // resolveEffectiveProfile must reject "position" against it when a criteriaIndex
  // is supplied.
  const badDelta = {
    id: 'bad', entityType: 'archetype', parentId: 'x',
    operations: [{ op: 'set-capability', criterionId: 'personal-durability', position: 8 }],
  };
  assert.throws(() => FYC.resolveEffectiveProfile(baseClass, [badDelta], { criteriaIndex: criteria }), FYC.ValidationError);

  // The corresponding correct form must succeed.
  const goodDelta = {
    id: 'good', entityType: 'archetype', parentId: 'x',
    operations: [{ op: 'set-capability', criterionId: 'personal-durability', rating: 8 }],
  };
  assert.doesNotThrow(() => FYC.resolveEffectiveProfile(baseClass, [goodDelta], { criteriaIndex: criteria }));

  // And a directional criterion must reject "rating".
  const badDirectional = {
    id: 'bad2', entityType: 'archetype', parentId: 'x',
    operations: [{ op: 'set-capability', criterionId: 'melee-ranged', rating: 8 }],
  };
  assert.throws(() => FYC.resolveEffectiveProfile(baseClass, [badDirectional], { criteriaIndex: criteria }), FYC.ValidationError);
});

test('1b. question-templates.json never writes desiredPosition against a capability-kind criterion, or importanceHint against a directional-kind one', () => {
  const criteria = FYC.indexCriteria(readJson('criteria.json'));
  const questions = readJson('question-templates.json');
  for (const q of questions.questions) {
    for (const a of q.answers) {
      for (const m of a.mutations) {
        if (!m.criterionId || !criteria.has(m.criterionId)) continue;
        const kind = criteria.get(m.criterionId).kind;
        if ('desiredPosition' in m) {
          assert.equal(kind, 'directional', `question "${q.id}" writes desiredPosition against "${m.criterionId}", which is kind:"${kind}"`);
        }
        if ('importanceHint' in m) {
          assert.equal(kind, 'capability', `question "${q.id}" writes importanceHint against "${m.criterionId}", which is kind:"${kind}"`);
        }
      }
    }
  }
});

test('2. "Not relevant" clears every criterion a question clarifies, not just the first one', () => {
  const questions = readJson('question-templates.json');
  for (const q of questions.questions) {
    if (!q.allowNotRelevant) continue;
    const notRelevantAnswer = q.answers.find(a => a.label === 'Not relevant.');
    if (!notRelevantAnswer) continue; // e.g. Q12's own "Not relevant." is itself the non-scoring case, still checked below
    const clearedIds = new Set(notRelevantAnswer.mutations.filter(m => m.notRelevant).map(m => m.criterionId));
    for (const cid of q.criteriaClarified || []) {
      assert.ok(clearedIds.has(cid) || notRelevantAnswer.nonScoring, `question "${q.id}": "Not relevant" does not clear criterion "${cid}"`);
    }
  }
});

test('3. every answer either produces a mutation or is explicitly flagged nonScoring (no silently empty answers)', () => {
  const questions = readJson('question-templates.json');
  for (const q of questions.questions) {
    for (const a of q.answers) {
      const isEmpty = !a.mutations || a.mutations.length === 0;
      if (isEmpty) {
        assert.equal(a.nonScoring, true, `question "${q.id}" answer "${a.label}" has empty mutations but is not flagged nonScoring:true -- looks like a bug, not an intentional no-op`);
      }
    }
  }
});

test('4. catalogue schema requires a full, typed payload per operation (not just "op")', () => {
  const schema = readJson('schemas/catalogue.schema.json');
  const opDef = schema.$defs.operation;
  const declaredOps = opDef.properties.op.enum;
  for (const op of FYC.OPERATIONS_VOCABULARY) assert.ok(declaredOps.includes(op), `catalogue schema operation enum missing "${op}"`);
  // Every operation must be named in at least one if/then branch's const or enum --
  // a schema that only required "op" (the pre-review shape) would fail this.
  const coveredOps = new Set();
  for (const branch of opDef.allOf) {
    const opCheck = branch.if && branch.if.properties && branch.if.properties.op;
    if (!opCheck) continue;
    for (const op of opCheck.const ? [opCheck.const] : (opCheck.enum || [])) coveredOps.add(op);
  }
  for (const op of FYC.OPERATIONS_VOCABULARY) assert.ok(coveredOps.has(op), `catalogue schema has no typed if/then branch for "${op}"`);
});

test('4b. loader rejects out-of-range or malformed operation payloads (not just missing "op")', () => {
  const profile = { id: 'x', entityType: 'effective' };
  assert.throws(() => FYC.applyOperation(profile, { op: 'set-capability', criterionId: 'personal-durability', rating: 11 }), FYC.ValidationError, 'rating 11 must be rejected');
  assert.throws(() => FYC.applyOperation(profile, { op: 'set-capability', criterionId: 'personal-durability', rating: 8, position: 8 }), FYC.ValidationError, 'both rating and position must be rejected');
  assert.throws(() => FYC.applyOperation(profile, { op: 'set-capability', criterionId: 'personal-durability' }), FYC.ValidationError, 'neither rating nor position must be rejected');
  assert.throws(() => FYC.applyOperation(profile, { op: 'add-fantasy-tag', tagId: 'x', strength: 0 }), FYC.ValidationError, 'strength 0 must be rejected');
});

test('5. resolver rejects an archetype belonging to a different class', () => {
  const baseClass = { id: 'sorcerer', entityType: 'class', name: 'Sorcerer', status: 'draft' };
  const wrongClassArchetype = { id: 'nature-fang', entityType: 'archetype', parentId: 'druid', operations: [] };
  assert.throws(() => FYC.resolveEffectiveProfile(baseClass, [wrongClassArchetype]), FYC.ValidationError);
});

test('5b. resolver rejects two options from the same option family applied together', () => {
  const baseClass = { id: 'sorcerer', entityType: 'class', name: 'Sorcerer', status: 'draft' };
  const draconic = { id: 'bloodline-draconic', entityType: 'option', parentClassId: 'sorcerer', optionFamilyId: 'sorcerer-bloodline', operations: [] };
  const fey = { id: 'bloodline-fey', entityType: 'option', parentClassId: 'sorcerer', optionFamilyId: 'sorcerer-bloodline', operations: [] };
  assert.throws(() => FYC.resolveEffectiveProfile(baseClass, [draconic, fey]), FYC.ValidationError);
});

test('5c. resolver rejects two archetypes marked incompatible with each other, in either declaring direction', () => {
  const baseClass = { id: 'fighter', entityType: 'class', name: 'Fighter', status: 'draft' };
  const a = { id: 'archer', entityType: 'archetype', parentId: 'fighter', operations: [], compatibility: { incompatibleArchetypeIds: ['armor-master'] } };
  const b = { id: 'armor-master', entityType: 'archetype', parentId: 'fighter', operations: [] };
  assert.throws(() => FYC.resolveEffectiveProfile(baseClass, [a, b]), FYC.ValidationError, 'a declaring b incompatible must block the combination');
  assert.throws(() => FYC.resolveEffectiveProfile(baseClass, [b, a]), FYC.ValidationError, 'order must not matter for the same declared incompatibility');
});

test('5d. resolver accepts a compatible archetype + option combination for the same class', () => {
  const baseClass = { id: 'sorcerer', entityType: 'class', name: 'Sorcerer', status: 'draft', categories: {} };
  const archetype = { id: 'razmiran-priest', entityType: 'archetype', parentId: 'sorcerer', operations: [] };
  const bloodline = { id: 'bloodline-draconic', entityType: 'option', parentClassId: 'sorcerer', optionFamilyId: 'sorcerer-bloodline', operations: [] };
  const effective = FYC.resolveEffectiveProfile(baseClass, [archetype, bloodline]);
  assert.deepEqual(effective.componentIds, ['sorcerer', 'razmiran-priest', 'bloodline-draconic']);
});

test('6. scoring functions validate their inputs instead of silently producing a wrong result', () => {
  assert.throws(() => FYC.importanceWeight(0), FYC.ValidationError, 'importance 0 must be rejected');
  assert.throws(() => FYC.importanceWeight(11), FYC.ValidationError, 'importance 11 must be rejected');
  assert.throws(() => FYC.importanceWeight('high'), FYC.ValidationError, 'non-numeric importance must be rejected');
  assert.throws(() => FYC.scoreCapabilityFit(11, 5), FYC.ValidationError, 'candidateRating 11 must be rejected');
  assert.throws(() => FYC.scoreCapabilityFit(0, 5), FYC.ValidationError, 'candidateRating 0 must be rejected');
  assert.throws(() => FYC.scoreDirectionalFit(5, 11, 5), FYC.ValidationError, 'desiredPosition 11 must be rejected');
  assert.throws(() => FYC.scoreDirectionalFit(5.5, 5, 5), FYC.ValidationError, 'a non-integer candidatePosition (catalogue data) must be rejected');
});
