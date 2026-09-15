// Run with: node --test tests/find-your-class-batch-integration.test.js
// Regression coverage for integrating Codex's Find_Your_Class_Scoring Batches 01-06
// (Find_Your_Class_Scoring_ALL_Batches_01-06_100pct.zip) into
// assets/find-your-class/compass-profiles.json:
// - Batch 01 is an overlay (profileOverlays keyed by profileId, addScores +
//   categories merged onto the 7 existing compass profiles) rather than
//   standalone records -- these tests assert the merge actually happened, not
//   just that the file parses.
// - Batches 02-06 are 20 additional fully-resolved archetype profiles, appended
//   verbatim.
// - The task: preserve every score, category, explanation (playerSummary/
//   tradeoff/editorialNote), source, conduct rule, compatibility gate, material
//   branch and Compass designation; 25 unique archetypes, 56 numeric criteria
//   and 8 categorical criteria per resolved profile; no matching algorithm
//   implemented or tuned; everything stays draft/needs-review.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'find-your-class');
const FYC = require(path.join(dir, 'loader.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }

const doc = readJson('compass-profiles.json');
const criteriaDoc = readJson('criteria.json');
const criteriaIndex = FYC.indexCriteria(criteriaDoc);
const numericIds = new Set(criteriaDoc.criteria.filter(c => c.kind === 'capability' || c.kind === 'directional').map(c => c.id));
const categoricalIds = new Set(criteriaDoc.criteria.filter(c => c.kind === 'categorical').map(c => c.id));

test('exactly 25 unique archetype-entityType profiles, plus the 2 original class-path profiles (27 total)', () => {
  const ids = doc.profiles.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate profile id found');
  const archetypes = doc.profiles.filter(p => p.entityType === 'archetype');
  const classPaths = doc.profiles.filter(p => p.entityType === 'class-path');
  assert.equal(archetypes.length, 25, 'expected exactly 25 archetype-entityType profiles');
  assert.equal(classPaths.length, 2, 'expected the 2 original class-path profiles (sorcerer-base, druid-domain) to remain');
  assert.equal(doc.profiles.length, 27);
});

test('every profile has exactly the 56 numeric criteria and 8 categorical criteria, no more, no fewer', () => {
  for (const p of doc.profiles) {
    const scoreKeys = new Set(Object.keys(p.scores));
    assert.deepEqual([...scoreKeys].sort(), [...numericIds].sort(), `${p.id}: scores key set does not exactly match the 56 numeric criteria`);
    assert.ok(p.categories, `${p.id}: missing categories`);
    const catKeys = new Set(Object.keys(p.categories));
    assert.deepEqual([...catKeys].sort(), [...categoricalIds].sort(), `${p.id}: categories key set does not exactly match the 8 categorical criteria`);
  }
});

test('validateCompassProfiles accepts the full merged file end to end', () => {
  assert.doesNotThrow(() => FYC.validateCompassProfiles(doc, criteriaIndex));
});

test('every category value used is within its criterion\'s declared closed vocabulary in criteria.json', () => {
  const valuesById = new Map(criteriaDoc.criteria.filter(c => c.kind === 'categorical').map(c => [c.id, new Set(c.values)]));
  const unknown = [];
  for (const p of doc.profiles) {
    for (const [criterionId, values] of Object.entries(p.categories)) {
      for (const v of values) {
        if (!valuesById.get(criterionId).has(v)) unknown.push(`${p.id}.${criterionId}=${v}`);
      }
    }
  }
  assert.deepEqual(unknown, []);
});

test('Batch 01\'s overlay was actually merged onto the 7 original compass profiles (addScores + categories present, not just the original 35 scores)', () => {
  const fighterArcher = doc.profiles.find(p => p.id === 'fighter-archer');
  assert.ok(fighterArcher, 'fighter-archer must still exist');
  // These keys only exist in Batch 01's addScores, not the original 7-profile hand-off.
  for (const addedKey of ['routine-tactical', 'independent-teamwork', 'first-round-impact', 'institutional-duty']) {
    assert.ok(addedKey in fighterArcher.scores, `fighter-archer.scores missing "${addedKey}" from the Batch 01 overlay`);
  }
  assert.ok(fighterArcher.categories, 'fighter-archer must have categories after the Batch 01 overlay');
  assert.deepEqual(fighterArcher.categories['primary-delivery'], ['ranged weapon']);
  assert.ok(fighterArcher.compassAnchors && fighterArcher.compassAnchors.length > 0);
  assert.ok(fighterArcher.sourceRefs && fighterArcher.sourceRefs.length > 0);
  assert.ok(fighterArcher.editorialNote && fighterArcher.editorialNote.length > 0);
  // The pre-existing original score values must survive untouched (not overwritten
  // by the overlay -- addScores is additive, never replaces an existing key).
  assert.equal(fighterArcher.scores['melee-ranged'], 10, 'original compass score must be preserved exactly');
  assert.equal(fighterArcher.scores['single-target-damage'], 9, 'original compass score must be preserved exactly');
});

test('conduct rules and compatibility gates from the batches are preserved verbatim on the profiles that declared them', () => {
  const eldritchGuardian = doc.profiles.find(p => p.id === 'fighter-eldritch-guardian');
  assert.ok(eldritchGuardian, 'fighter-eldritch-guardian must exist (Batch 02)');
  assert.deepEqual(eldritchGuardian.conduct, {
    codePresence: 'none', mechanicalLossRisk: 'none',
    alignmentRule: { kind: 'none', values: [] },
    deityRequired: false, deityChoiceProvenance: 'optional-relationship', institutionRequired: false,
  });

  const eldritchScoundrel = doc.profiles.find(p => p.id === 'rogue-eldritch-scoundrel');
  assert.ok(eldritchScoundrel, 'rogue-eldritch-scoundrel must exist (Batch 03)');
  assert.ok(Array.isArray(eldritchScoundrel.compatibilityGates) && eldritchScoundrel.compatibilityGates.length > 0, 'compatibilityGates must survive the conversion');
  for (const g of eldritchScoundrel.compatibilityGates) {
    assert.ok(typeof g.type === 'string' && typeof g.rule === 'string' && typeof g.hard === 'boolean');
  }
});

test('material branch data (materialAlternative) is preserved for the Druid Nature Bond profiles', () => {
  const feyspeaker = doc.profiles.find(p => p.id === 'druid-feyspeaker-domain');
  assert.ok(feyspeaker, 'druid-feyspeaker-domain must exist (Batch 05)');
  assert.equal(feyspeaker.branchId, 'nature-bond-domain');
  assert.ok(feyspeaker.materialAlternative, 'materialAlternative must be preserved');
  assert.equal(feyspeaker.materialAlternative.branchId, 'nature-bond-animal-companion');
  assert.ok(feyspeaker.materialAlternative.scoreOverrides['companion-centrality'] > feyspeaker.scores['companion-centrality'], 'the animal-companion branch override should raise companion-centrality relative to the domain branch\'s own score');
});

test('every profile carries an explanation (playerSummary + tradeoff, or the original compass profiles\' editorialNote) and at least one source reference', () => {
  for (const p of doc.profiles) {
    const hasExplanation = (typeof p.playerSummary === 'string' && p.playerSummary.length > 0) || (typeof p.editorialNote === 'string' && p.editorialNote.length > 0);
    assert.ok(hasExplanation, `${p.id}: missing both playerSummary and editorialNote`);
    assert.ok(Array.isArray(p.sourceRefs) && p.sourceRefs.length > 0, `${p.id}: missing sourceRefs`);
    assert.ok(Array.isArray(p.compassAnchors) && p.compassAnchors.length > 0, `${p.id}: missing compassAnchors (Compass designation)`);
  }
});

test('no profile or file claims a "verified" status anywhere -- everything stays draft or needs-review', () => {
  assert.notEqual(doc.status, 'verified');
  for (const p of doc.profiles) {
    if ('status' in p) assert.notEqual(p.status, 'verified', `${p.id} must not be marked verified`);
  }
});

test('no matching/scoring algorithm was introduced by this integration -- loader.js exports stay exactly the pre-existing set', () => {
  const exported = Object.keys(FYC).sort();
  assert.deepEqual(exported, [
    'OPERATIONS_VOCABULARY',
    'ValidationError',
    'applyOperation',
    'importanceWeight',
    'indexCriteria',
    'resolveEffectiveProfile',
    'scoreCapabilityFit',
    'scoreDirectionalFit',
    'validateCompassProfiles',
    'validateCriteriaFile',
    'validateCriterion',
    'validateManifest',
  ], 'loader.js must not have grown a new matching/ranking entry point as part of this data integration');
});
