// Run with: node --test tests/find-your-class-criteria-audit.test.js
// Regression coverage for Find_Your_Class_Criteria_Audit_and_Compass_Calibration_v1.md:
// the 44 -> 64 criterion expansion, the two id renames (with compatibility aliases),
// the conduct/compatibilityGates/affinities data contract additions, and importing
// the seven compass calibration profiles as draft (never verified) data.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'find-your-class');
const FYC = require(path.join(dir, 'loader.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }

test('criteria.json grew from 44 to 64 criteria, all valid, no duplicates', () => {
  const doc = readJson('criteria.json');
  assert.doesNotThrow(() => FYC.validateCriteriaFile(doc));
  assert.equal(doc.criteria.length, 64, 'audit doc section 1: catalogue should grow from 44 to 64 discoverable preference dimensions');
});

test('renamed criteria (companion-centrality, build-fragility) keep their old id as a resolvable alias', () => {
  const index = FYC.indexCriteria(readJson('criteria.json'));
  assert.ok(index.has('companion-centrality'), 'new id must resolve');
  assert.ok(index.has('none-central-companion'), 'old id must still resolve via alias');
  assert.equal(index.get('none-central-companion'), index.get('companion-centrality'), 'alias must point to the same criterion object');

  assert.ok(index.has('build-fragility'), 'new id must resolve');
  assert.ok(index.has('build-forgiveness'), 'old id must still resolve via alias');
  assert.equal(index.get('build-forgiveness'), index.get('build-fragility'), 'alias must point to the same criterion object');
});

test('question-templates.json uses the renamed canonical id, not the retired one', () => {
  const questions = readJson('question-templates.json');
  const raw = JSON.stringify(questions);
  assert.ok(!raw.includes('none-central-companion'), 'question templates should have migrated to companion-centrality (audit doc section 2: "rename in the player model if migration is still cheap")');
  assert.ok(raw.includes('companion-centrality'));
});

test('the 20 audit-added criteria are present with the correct kind (13 capability, 7 directional)', () => {
  const index = FYC.indexCriteria(readJson('criteria.json'));
  const capabilityIds = [
    'melee-weapon-effectiveness', 'ranged-weapon-effectiveness', 'offensive-spellcasting', 'defensive-magic',
    'condition-removal', 'dispelling-countermagic', 'shapeshifting-transformation', 'natural-weapon-combat',
    'mounted-combat', 'skill-breadth', 'first-round-impact', 'armour-defence', 'shield-combat',
  ];
  const directionalIds = [
    'equipment-independence', 'enemy-type-independence', 'spell-access-breadth', 'ability-score-demand',
    'code-bound-identity', 'conduct-consequence-tolerance', 'institutional-duty',
  ];
  assert.equal(capabilityIds.length, 13);
  assert.equal(directionalIds.length, 7);
  for (const id of capabilityIds) {
    assert.ok(index.has(id), `missing audit criterion "${id}"`);
    assert.equal(index.get(id).kind, 'capability', `"${id}" should be kind:"capability"`);
  }
  for (const id of directionalIds) {
    assert.ok(index.has(id), `missing audit criterion "${id}"`);
    assert.equal(index.get(id).kind, 'directional', `"${id}" should be kind:"directional"`);
  }
});

test('vocabularies.json declares the conduct, alignment-rule, deity-provenance and affinity-family vocabularies from audit doc sections 4-6', () => {
  const vocab = readJson('vocabularies.json');
  assert.deepEqual(vocab.conductCodePresence, ['none', 'optional', 'expected', 'mandatory']);
  assert.deepEqual(vocab.conductMechanicalLossRisk, ['none', 'limited', 'substantial']);
  assert.deepEqual(vocab.alignmentRuleKind, ['none', 'fixed', 'subset', 'deity-relative']);
  assert.deepEqual(vocab.deityChoiceProvenance, ['free-choice-with-consequences', 'restricted-choice', 'fixed-source', 'optional-relationship']);
  assert.ok(vocab.affinityFamilies && Array.isArray(vocab.affinityFamilies.weapons) && vocab.affinityFamilies.weapons.includes('bow'));
  assert.ok(Array.isArray(vocab.affinityFamilies.magicThemes) && vocab.affinityFamilies.magicThemes.includes('necromancy'));
  assert.ok(Array.isArray(vocab.affinityFamilies.fantasies) && vocab.affinityFamilies.fantasies.includes('sworn-knight'));
  assert.ok(Array.isArray(vocab.affinityFamilies.socialIdentity) && vocab.affinityFamilies.socialIdentity.includes('noble'));
  for (const gate of ['conduct-power-loss', 'character-level', 'party-needs', 'campaign-environment', 'rules-gm-compatibility']) {
    assert.ok(vocab.restrictionTypes.includes(gate), `restrictionTypes missing contextual gate "${gate}" from audit doc section 5`);
  }
});

test('catalogue.schema.json accepts a conduct block and affinities, matching audit doc sections 4 and 6', () => {
  const schema = readJson('schemas/catalogue.schema.json');
  assert.ok(schema.properties.conduct, 'schema missing conduct property');
  assert.deepEqual(schema.properties.conduct.properties.codePresence.enum, ['none', 'optional', 'expected', 'mandatory']);
  assert.ok(schema.properties.affinities, 'schema missing affinities property');
});

test('compass-profiles.json validates as draft-only calibration data, never verified', () => {
  const criteria = FYC.indexCriteria(readJson('criteria.json'));
  const doc = readJson('compass-profiles.json');
  assert.doesNotThrow(() => FYC.validateCompassProfiles(doc, criteria));
  assert.notEqual(doc.status, 'verified');
  assert.ok(doc.profiles.length >= 7, 'at least the original seven compass profiles must still be present');
  const ids = new Set(doc.profiles.map(p => p.id));
  for (const id of ['druid-domain', 'druid-pack-lord', 'fighter-archer', 'fighter-armor-master', 'magus-eldritch-archer', 'rogue-burglar', 'sorcerer-base']) {
    assert.ok(ids.has(id), `original compass profile "${id}" missing after later batches were integrated`);
  }
});

test('validateCompassProfiles rejects a profile scoring an unknown criterion, and rejects any status other than the allowed draft/needs-review set', () => {
  const criteria = FYC.indexCriteria(readJson('criteria.json'));
  const bad = { status: 'draft-editorial-calibration', scale: { min: 1, max: 10 }, profiles: [
    { id: 'fake', entityType: 'archetype', classId: 'fighter', archetypeId: 'fake', scores: { 'not-a-real-criterion': 5 } },
  ] };
  assert.throws(() => FYC.validateCompassProfiles(bad, criteria), FYC.ValidationError);

  const verifiedClaim = { status: 'verified', scale: { min: 1, max: 10 }, profiles: [] };
  assert.throws(() => FYC.validateCompassProfiles(verifiedClaim, criteria), FYC.ValidationError, 'compass profiles must never claim "verified" status');
});

test('every criterionId scored across all compass profiles resolves in criteria.json (including via alias)', () => {
  const criteria = FYC.indexCriteria(readJson('criteria.json'));
  const doc = readJson('compass-profiles.json');
  const unresolved = new Set();
  for (const p of doc.profiles) {
    for (const criterionId of Object.keys(p.scores)) {
      if (!criteria.has(criterionId)) unresolved.add(criterionId);
    }
  }
  assert.deepEqual([...unresolved], []);
});

// -----------------------------------------------------------------------
// Step 7 fixtures (audit doc implementation order): core scoring invariants.
// -----------------------------------------------------------------------

test('7a. a low desired value and low importance are different things (audit doc section 7, "Importance semantics")', () => {
  // "I strongly want no companion" = desiredPosition 1, HIGH importance -- vs a
  // merely mild preference for the same desired position (desiredPosition 1, LOW
  // importance). Scored against the same partially-mismatched candidate (position 8):
  const candidatePosition = 8;
  const strongPreference = FYC.scoreDirectionalFit(candidatePosition, 1, 10);
  const mildPreference = FYC.scoreDirectionalFit(candidatePosition, 1, 1);
  // fit (the raw positional mismatch) depends only on desiredPosition vs
  // candidatePosition -- it must be identical whether importance is 10 or 1.
  assert.equal(strongPreference.fit, mildPreference.fit, 'fit must be identical regardless of importance -- desired value and importance are independent axes');
  // weightedFit must still differ: importance is the second, separate axis that
  // scales how much this criterion's fit counts, per architecture 13.2/13.3.
  assert.notEqual(strongPreference.weightedFit, mildPreference.weightedFit, 'weightedFit must differ between high and low importance even when fit (and desiredPosition) are identical');
  assert.ok(strongPreference.weightedFit > mildPreference.weightedFit, 'higher importance must scale the same fit up, not down (importanceWeight is increasing in importance)');

  // And changing ONLY desiredPosition (not importance) must change fit but never
  // importanceWeight -- the two inputs must not leak into each other.
  const sameImportanceDifferentDesire = FYC.scoreDirectionalFit(candidatePosition, 5.5, 10);
  assert.notEqual(strongPreference.fit, sameImportanceDifferentDesire.fit, 'a different desiredPosition must change fit');
});

test('7b. resolveEffectiveProfile always keeps the base class visible in componentIds (audit doc section 12: never show an archetype as though it were a standalone class)', () => {
  const baseClass = { id: 'druid', entityType: 'class', name: 'Druid', status: 'draft' };
  const archetype = { id: 'pack-lord', entityType: 'archetype', parentId: 'druid', operations: [] };
  const effective = FYC.resolveEffectiveProfile(baseClass, [archetype]);
  assert.equal(effective.componentIds[0], 'druid', 'the base class id must always be first in componentIds so a result can always display its parent class');
});
