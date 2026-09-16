// Run with: node --test tests/find-your-class-v2-matcher.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'assets', 'find-your-class', 'v2');
const V2 = require(path.join(dir, 'loader.js'));
const Matcher = require(path.join(dir, 'matcher.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }
const criteriaDoc = readJson('criteria.json');
const classProfiles = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json']
  .flatMap(f => readJson(f).profiles);
const archetypeOverrides = Array.from({ length: 10 }, (_, i) => `archetype-profiles-pilot-${String(i + 1).padStart(2, '0')}.json`)
  .flatMap(f => readJson(f).profiles);

const criteriaIndex = V2.indexCriteria(criteriaDoc);
const profiles = V2.resolveAllProfiles(classProfiles, archetypeOverrides);

function req(overrides) {
  return Object.assign({ schemaVersion: 2, capabilityPreferences: {}, practicalPreferences: {}, factPreferences: {}, identityPreferences: {}, gateAnswers: {} }, overrides);
}

test('capabilityFit: a "core" desire scores proportionally to how close the candidate is to core', () => {
  assert.equal(Matcher.capabilityFit('core', 'core'), 1);
  assert.equal(Matcher.capabilityFit('core', 'available'), 0.5);
  assert.equal(Matcher.capabilityFit('core', 'absent'), 0);
});

test('capabilityFit: an "available" desire is a satisfied threshold -- core also satisfies it', () => {
  assert.equal(Matcher.capabilityFit('available', 'core'), 1);
  assert.equal(Matcher.capabilityFit('available', 'available'), 1);
  assert.equal(Matcher.capabilityFit('available', 'absent'), 0);
});

test('practicalFit: distance-based, exact match scores 1, one step off scores 0.5, two steps off scores 0', () => {
  assert.equal(Matcher.practicalFit('low', 'low'), 1);
  assert.equal(Matcher.practicalFit('low', 'medium'), 0.5);
  assert.equal(Matcher.practicalFit('low', 'high'), 0);
});

test('a request for strong melee + durability + protecting allies ranks Paladin highest among real class-paths', () => {
  const request = req({
    capabilityPreferences: {
      'melee-combat': { desiredLevel: 'core', importance: 9 },
      'personal-durability': { desiredLevel: 'core', importance: 8 },
      'protecting-allies': { desiredLevel: 'core', importance: 8 },
    },
  });
  const classPaths = profiles.filter(p => p.entityType === 'class-path');
  const ranked = Matcher.rankCandidates(classPaths, request);
  assert.equal(ranked[0].profile.id, 'paladin');
});

test('identity mode "require" is a pure eligibility gate, never scored -- an arcane-only request excludes divine casters', () => {
  const request = req({ identityPreferences: { magicIdentity: { mode: 'require', values: ['arcane'] } } });
  const cleric = profiles.find(p => p.id === 'cleric');
  const wizard = profiles.find(p => p.id === 'wizard');
  assert.equal(Matcher.evaluateEligibility(cleric, request).status, 'ineligible');
  assert.equal(Matcher.evaluateEligibility(wizard, request).status, 'eligible');
});

test('identity mode "exclude" rejects a candidate whose identity includes the excluded value', () => {
  const request = req({ identityPreferences: { magicIdentity: { mode: 'exclude', values: ['divine'] } } });
  const cleric = profiles.find(p => p.id === 'cleric');
  assert.equal(Matcher.evaluateEligibility(cleric, request).status, 'ineligible');
});

test('a "requirement"-kind constraint blocks eligibility until the player explicitly accepts it via gateAnswers', () => {
  const oracle = profiles.find(p => p.id === 'oracle');
  // The real oracle profile's curse is a "commitment", not a "requirement" --
  // this test constructs a synthetic requirement constraint to exercise the
  // gate mechanism itself, independent of which real profile happens to have one.
  const synthetic = Object.assign({}, oracle, { constraints: [{ type: 'race', kind: 'requirement', summary: 'Requires a specific race.' }] });
  const request = req({});
  const unresolved = Matcher.evaluateEligibility(synthetic, request);
  assert.equal(unresolved.status, 'needs-confirmation');
  const id = Matcher.constraintId(synthetic, synthetic.constraints[0]);
  const accepted = Matcher.evaluateEligibility(synthetic, req({ gateAnswers: { [id]: { status: 'satisfied' } } }));
  assert.equal(accepted.status, 'eligible');
  const rejected = Matcher.evaluateEligibility(synthetic, req({ gateAnswers: { [id]: { status: 'conflict' } } }));
  assert.equal(rejected.status, 'ineligible');
});

test('a "commitment"-kind constraint never blocks eligibility, only discloses', () => {
  const oracle = profiles.find(p => p.id === 'oracle');
  const result = Matcher.evaluateEligibility(oracle, req({}));
  assert.equal(result.status, 'eligible');
  assert.ok(result.disclosures.some(d => d.rule.toLowerCase().includes('curse')));
});

test('matchProfiles never mutates the source profiles or criteria index', () => {
  const snapshot = JSON.parse(JSON.stringify(profiles));
  const request = req({ capabilityPreferences: { 'stealth-subterfuge': { desiredLevel: 'core', importance: 8 } } });
  Matcher.matchProfiles(request, profiles, criteriaIndex, { maxResults: 4 });
  assert.deepEqual(profiles, snapshot);
});

test('matchProfiles returns at most 4 recommendations, never repeating the same profile id twice', () => {
  const request = req({
    capabilityPreferences: {
      'stealth-subterfuge': { desiredLevel: 'core', importance: 9 },
      'social-influence': { desiredLevel: 'core', importance: 7 },
    },
  });
  const result = Matcher.matchProfiles(request, profiles, criteriaIndex, { maxResults: 4 });
  assert.ok(result.recommendations.length <= 4);
  assert.equal(new Set(result.recommendations.map(r => r.id)).size, result.recommendations.length);
});

test('an archetype recommendation names its real parent class, a class-path never claims a parent', () => {
  const request = req({ capabilityPreferences: { 'healing-recovery': { desiredLevel: 'core', importance: 9 } } });
  const result = Matcher.matchProfiles(request, profiles, criteriaIndex, { maxResults: 4 });
  const archetypeRec = result.recommendations.find(r => r.entityType === 'archetype');
  const classPathRec = result.recommendations.find(r => r.entityType === 'class-path');
  if (archetypeRec) assert.ok(archetypeRec.parentLabel && archetypeRec.parentLabel.length);
  if (classPathRec) assert.equal(classPathRec.parentLabel, null);
});

test('no recommendation ever shows the internal "Pending cross-class normalization." calibration placeholder', () => {
  // Regression test: ~32 of 40 real class profiles still carry this literal
  // placeholder in their (internal, author-facing) calibrationRole field.
  const request = req({ capabilityPreferences: { 'melee-combat': { desiredLevel: 'core', importance: 9 } } });
  const result = Matcher.matchProfiles(request, profiles, criteriaIndex, { maxResults: 4 });
  const text = JSON.stringify(result.recommendations);
  assert.ok(!/pending cross-class normalization/i.test(text));
});

test('no player-facing recommendation text leaks raw criterion ids, ordinal jargon or numeric fit scores', () => {
  const request = req({ capabilityPreferences: { 'melee-combat': { desiredLevel: 'core', importance: 8 } } });
  const result = Matcher.matchProfiles(request, profiles, criteriaIndex, { maxResults: 4 });
  const text = JSON.stringify(result.recommendations);
  assert.ok(!/melee-combat|personal-durability/.test(text), 'must not leak raw criterion ids');
  assert.ok(!/\bcore\b|\bavailable\b|\babsent\b/.test(text), 'must not leak the raw ordinal vocabulary');
  assert.ok(!/overallFit|\d\.\d{2,}/.test(text), 'must not leak raw fit numbers');
});
