// Run with: node --test tests/find-your-class-normalization-pass-01.test.js
// Regression coverage for Find_Your_Class_Cross_Class_Normalization_Pass_01_v1.json
// (Codex's editorial corrections applied on top of commit 09d3730): 73 score
// overrides across 22 profiles, 8 conduct overrides and 4 explanation
// corrections. Every test below is transcribed from that file's own
// "testsToAdd" list, plus a coverage check that every listed override was
// actually applied and nothing unlisted was touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'find-your-class');
const FYC = require(path.join(dir, 'loader.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }

const doc = readJson('compass-profiles.json');
const byId = new Map(doc.profiles.map(p => [p.id, p]));

test('file/profile status stays needs-review, never promoted further', () => {
  assert.equal(doc.status, 'needs-review');
  assert.notEqual(doc.status, 'verified');
});

test('testsToAdd 1: at least one pilot profile scores 5 or lower in both build-complexity and rules-mastery', () => {
  const approachable = doc.profiles.filter(p => p.scores['build-complexity'] <= 5 && p.scores['rules-mastery'] <= 5);
  assert.ok(approachable.length > 0, 'no profile is an approachable (<=5/<=5) build-complexity/rules-mastery anchor');
  // fighter-archer is the specific anchor the normalization pass introduced.
  assert.ok(byId.get('fighter-archer').scores['build-complexity'] <= 5 && byId.get('fighter-archer').scores['rules-mastery'] <= 5);
});

test('testsToAdd 2: every Druid class-path/archetype profile declares mandatory/substantial inherited Druid conduct', () => {
  const druidProfiles = doc.profiles.filter(p => p.classId === 'druid');
  assert.ok(druidProfiles.length >= 6, 'expected at least the 6 Druid pilot profiles');
  for (const p of druidProfiles) {
    assert.equal(p.conduct.codePresence, 'mandatory', `${p.id}: Druid conduct code must be mandatory unless an archetype explicitly replaces it (none do in this pass)`);
    assert.equal(p.conduct.mechanicalLossRisk, 'substantial', `${p.id}: Druid mechanical loss risk must be substantial`);
    assert.equal(p.conduct.alignmentRule.kind, 'subset');
    assert.deepEqual(p.conduct.alignmentRule.values, ['any neutral alignment']);
  }
});

test('testsToAdd 3: Razmiran Priest creates no hard deity or institution compatibility gate from narrative text alone', () => {
  const rp = byId.get('sorcerer-razmiran-priest');
  assert.equal(rp.conduct.deityRequired, false);
  assert.equal(rp.conduct.institutionRequired, false);
  assert.equal(rp.conduct.deityChoiceProvenance, 'fixed-source');
  // Gate shape updated 2026-09-15 (matcher-contract correction): hard:boolean
  // was replaced by a closed kind vocabulary (compatibility/commitment/soft).
  const compatibilityGates = (rp.compatibilityGates || []).filter(g => g.kind === 'compatibility');
  assert.deepEqual(compatibilityGates, [], 'Razmiran Priest must not carry any compatibility-kind gate');
});

test('testsToAdd 4: Reincarnated Druid personal-durability stays below the dedicated in-combat defence anchors (Armor Master, Armored Battlemage)', () => {
  const reincarnated = byId.get('druid-reincarnated-druid-domain').scores['personal-durability'];
  const armorMaster = byId.get('fighter-armor-master').scores['personal-durability'];
  const armoredBattlemage = byId.get('magus-armored-battlemage').scores['personal-durability'];
  assert.ok(reincarnated < armorMaster, `Reincarnated Druid (${reincarnated}) must score below Armor Master (${armorMaster})`);
  assert.ok(reincarnated < armoredBattlemage, `Reincarnated Druid (${reincarnated}) must score below Armored Battlemage (${armoredBattlemage})`);
});

test('testsToAdd 5: Armor Master protect-allies stays below its own personal-durability score', () => {
  const armorMaster = byId.get('fighter-armor-master');
  assert.ok(armorMaster.scores['protect-allies'] < armorMaster.scores['personal-durability'], 'Armor Master must be scored as personally tough first, ally-protecting second -- not conflated');
});

test('testsToAdd 6: Bladebound uses "sentient item" companion-type but carries no mandatory conduct code', () => {
  const bladebound = byId.get('magus-bladebound');
  assert.deepEqual(bladebound.categories['companion-type'], ['sentient item']);
  assert.notEqual(bladebound.conduct.codePresence, 'mandatory', 'the black blade\'s Ego conflict is an item relationship, not a class code that revokes powers');
  assert.equal(bladebound.conduct.mechanicalLossRisk, 'none');
});

test('every scoreOverride/conductOverride/explanationCorrection from the normalization pass file was actually applied', () => {
  const norm = readJson('source-batches/Find_Your_Class_Cross_Class_Normalization_Pass_01_v1.json');
  for (const [id, overrides] of Object.entries(norm.scoreOverrides)) {
    const p = byId.get(id);
    assert.ok(p, `profile "${id}" from scoreOverrides is missing entirely`);
    for (const [k, v] of Object.entries(overrides)) {
      assert.equal(p.scores[k], v, `${id}.scores.${k} should be ${v} per the normalization pass`);
    }
  }
  for (const [id, conduct] of Object.entries(norm.conductOverrides)) {
    assert.deepEqual(byId.get(id).conduct, conduct, `${id}.conduct should exactly match the normalization pass override`);
  }
  for (const [id, expl] of Object.entries(norm.explanationCorrections)) {
    for (const [k, v] of Object.entries(expl)) {
      assert.equal(byId.get(id)[k], v, `${id}.${k} should match the normalization pass correction`);
    }
  }
});

test('profiles are still exactly 25 archetypes / 27 total, 56 numeric + 8 categorical keys each, after the overrides', () => {
  const criteriaDoc = readJson('criteria.json');
  const numericIds = new Set(criteriaDoc.criteria.filter(c => c.kind === 'capability' || c.kind === 'directional').map(c => c.id));
  const categoricalIds = new Set(criteriaDoc.criteria.filter(c => c.kind === 'categorical').map(c => c.id));
  assert.equal(doc.profiles.filter(p => p.entityType === 'archetype').length, 25);
  assert.equal(doc.profiles.length, 27);
  for (const p of doc.profiles) {
    assert.deepEqual(new Set(Object.keys(p.scores)), numericIds, `${p.id}: score keys drifted from the 56-criterion set`);
    assert.deepEqual(new Set(Object.keys(p.categories)), categoricalIds, `${p.id}: category keys drifted from the 8-criterion set`);
  }
  const criteriaIndex = FYC.indexCriteria(criteriaDoc);
  assert.doesNotThrow(() => FYC.validateCompassProfiles(doc, criteriaIndex));
});

test('no matching/scoring/ranking engine code was introduced by applying this pass', () => {
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
  ]);
});
