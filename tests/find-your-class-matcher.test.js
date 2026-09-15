// Run with: node --test tests/find-your-class-matcher.test.js
// Regression coverage for assets/find-your-class/matcher.js, implementing
// FIND_YOUR_CLASS_MATCHING_ENGINE_HANDOFF.md. Tests are numbered to match the
// handoff's own "Required tests" list (1-25), followed by the 8 requested golden
// scenarios using the real 27-profile catalogue. Several handoff behaviours were
// under-specified for a purely mechanical implementation; every interpretation
// used here is documented at the top of matcher.js under AMBIGUITY_NOTES and
// referenced by number in the relevant test's comment.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'find-your-class');
const FYC = require(path.join(dir, 'loader.js'));
const M = require(path.join(dir, 'matcher.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }

const criteriaDoc = readJson('criteria.json');
const profiles = readJson('compass-profiles.json').profiles;
const questionTemplates = readJson('question-templates.json');
const explanationCatalogue = readJson('explanation-templates.json');
const byId = new Map(profiles.map(p => [p.id, p]));
const criteriaIndex = FYC.indexCriteria(criteriaDoc);

function baseRequest(overrides) {
  return Object.assign({ schemaVersion: 1, numericPreferences: {}, categoricalPreferences: {} }, overrides || {});
}

// ---------------------------------------------------------------------
// 1. Determinism
// ---------------------------------------------------------------------
test('1. same request produces byte-for-byte stable ranking', () => {
  const request = baseRequest({
    numericPreferences: {
      'crowd-control': { importance: 9, origin: 'explicit' },
      'melee-ranged': { desiredPosition: 3, importance: 7, origin: 'explicit' },
    },
    options: { maxResults: 4, includeNeedsConfirmation: true },
  });
  const a = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const b = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.deepEqual(a.recommendations, b.recommendations);
  assert.equal(JSON.stringify(a.recommendations), JSON.stringify(b.recommendations));
});

// ---------------------------------------------------------------------
// 2/3. Importance 1 non-zero; notRelevant contributes zero and cannot change ranking
// ---------------------------------------------------------------------
test('2. importance 1 contributes a non-zero weight', () => {
  assert.ok(FYC.importanceWeight(1) > 0);
  const scored = M.scoreCandidate({ profile: byId.get('fighter-archer'), internalId: 'fighter-archer', baseProfileId: 'fighter-archer' },
    baseRequest({ numericPreferences: { 'crowd-control': { importance: 1, origin: 'explicit' } } }), criteriaDoc);
  assert.notEqual(scored.overallFit, null);
  assert.ok(scored.contributions['crowd-control'].weight > 0);
});

test('3. notRelevant contributes zero weight and cannot change ranking', () => {
  const withPref = baseRequest({ numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' }, 'wilderness': { importance: 5, origin: 'explicit' } } });
  const withNotRelevant = baseRequest({ numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' }, 'wilderness': { notRelevant: true, origin: 'explicit' } } });
  const a = M.matchProfiles(withPref, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const b = M.matchProfiles(withNotRelevant, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  // Ranking is driven only by crowd-control in both cases (wilderness importance
  // 5 vs notRelevant differ, but only crowd-control should move the top result).
  assert.equal(a.recommendations[0].id, b.recommendations[0].id);
});

// ---------------------------------------------------------------------
// 4. Directional symmetry
// ---------------------------------------------------------------------
test('4. directional distance is symmetric around the desired position', () => {
  const towardLow = FYC.scoreDirectionalFit(1, 10, 9);
  const towardHigh = FYC.scoreDirectionalFit(10, 1, 9);
  assert.equal(towardLow.fit, towardHigh.fit);
});

// ---------------------------------------------------------------------
// 5. Unknown candidate data omitted, not scored as 1 or 0
// ---------------------------------------------------------------------
test('5. unknown candidate data is omitted from fit, not scored as 1 or 0', () => {
  const fakeProfile = { id: 'fake', classId: 'fighter', scores: {}, categories: {} }; // no scores at all
  const scored = M.scoreCandidate({ profile: fakeProfile, internalId: 'fake', baseProfileId: 'fake' },
    baseRequest({ numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' } } }), criteriaDoc);
  assert.equal(scored.overallFit, null, 'with only one preference and unknown data, no fit can be computed at all');
  assert.deepEqual(scored.contributions['crowd-control'], { unknown: true });
});

// ---------------------------------------------------------------------
// 6/7/8. Categorical modes
// ---------------------------------------------------------------------
test('6. categorical "prefer" boosts overlap without rejecting alternatives', () => {
  const request = baseRequest({ categoricalPreferences: { 'casting-method': { mode: 'prefer', values: ['spontaneous'], importance: 8, origin: 'explicit' } } });
  const sorcererBase = { profile: byId.get('sorcerer-base'), internalId: 'sorcerer-base', baseProfileId: 'sorcerer-base' };
  const fighterArcher = { profile: byId.get('fighter-archer'), internalId: 'fighter-archer', baseProfileId: 'fighter-archer' };
  const sScore = M.scoreCandidate(sorcererBase, request, criteriaDoc);
  const fScore = M.scoreCandidate(fighterArcher, request, criteriaDoc);
  assert.equal(sScore.contributions['casting-method'].fit, 1, 'sorcerer-base categories include spontaneous');
  assert.equal(fScore.contributions['casting-method'].fit, 0, 'fighter-archer has none for casting-method, so no overlap');
  const eligA = M.evaluateEligibility(sorcererBase, request);
  const eligB = M.evaluateEligibility(fighterArcher, request);
  assert.equal(eligA.status, 'eligible');
  assert.equal(eligB.status, 'eligible', 'prefer must never reject the non-matching alternative');
});

test('7. categorical "require" rejects a mismatch', () => {
  const request = baseRequest({ categoricalPreferences: { 'casting-method': { mode: 'require', values: ['spontaneous'], origin: 'explicit' } } });
  const fighterArcher = { profile: byId.get('fighter-archer'), internalId: 'fighter-archer', baseProfileId: 'fighter-archer' };
  const elig = M.evaluateEligibility(fighterArcher, request);
  assert.equal(elig.status, 'ineligible');
});

test('8. categorical "exclude" rejects an overlap', () => {
  const request = baseRequest({ categoricalPreferences: { 'companion-type': { mode: 'exclude', values: ['multiple companions'], origin: 'explicit' } } });
  const packLord = { profile: byId.get('druid-pack-lord'), internalId: 'druid-pack-lord', baseProfileId: 'druid-pack-lord' };
  const elig = M.evaluateEligibility(packLord, request);
  assert.equal(elig.status, 'ineligible');
});

// ---------------------------------------------------------------------
// 9/10. Hard gates
// ---------------------------------------------------------------------
const SCOUNDREL_GATE_ID = 'rogue-eldritch-scoundrel:rules-gm-compatibility';

test('9. confirmed hard-gate conflict is ineligible', () => {
  const scoundrel = { profile: byId.get('rogue-eldritch-scoundrel'), internalId: 'rogue-eldritch-scoundrel', baseProfileId: 'rogue-eldritch-scoundrel' };
  const request = baseRequest({ gateAnswers: { [SCOUNDREL_GATE_ID]: { status: 'conflict' } } });
  const elig = M.evaluateEligibility(scoundrel, request);
  assert.equal(elig.status, 'ineligible');
});

test('10. unanswered hard gate is needs-confirmation', () => {
  const scoundrel = { profile: byId.get('rogue-eldritch-scoundrel'), internalId: 'rogue-eldritch-scoundrel', baseProfileId: 'rogue-eldritch-scoundrel' };
  const elig = M.evaluateEligibility(scoundrel, baseRequest());
  assert.equal(elig.status, 'needs-confirmation');
  assert.ok(elig.unresolvedGate);
  assert.equal(elig.unresolvedGate.id, SCOUNDREL_GATE_ID);
});

test('confirmed non-conflicting (satisfied) hard-gate answer keeps the candidate eligible', () => {
  const scoundrel = { profile: byId.get('rogue-eldritch-scoundrel'), internalId: 'rogue-eldritch-scoundrel', baseProfileId: 'rogue-eldritch-scoundrel' };
  const request = baseRequest({ gateAnswers: { [SCOUNDREL_GATE_ID]: { status: 'satisfied' } } });
  const elig = M.evaluateEligibility(scoundrel, request);
  assert.equal(elig.status, 'eligible');
});

test('gate answers are keyed by stable candidate-specific gate id, never bare gate type (several candidates share a type)', () => {
  const sameTypeGates = profiles.flatMap(p => (p.compatibilityGates || []).map(g => ({ profileId: p.id, gate: g })))
    .filter(x => x.gate.type === 'class-prerequisite');
  assert.ok(sameTypeGates.length >= 2, 'expected at least two candidates sharing the class-prerequisite gate type for this test to be meaningful');
  const ids = sameTypeGates.map(x => x.gate.id);
  assert.equal(new Set(ids).size, ids.length, 'gate ids sharing a type must still be distinct');
  for (const { profileId, gate } of sameTypeGates) assert.ok(gate.id.startsWith(profileId), `gate id "${gate.id}" is not candidate-specific`);
});

test('a "commitment" gate is always eligible, never awaits confirmation, and is visibly disclosed', () => {
  const stormDruid = { profile: byId.get('druid-storm-druid'), internalId: 'druid-storm-druid', baseProfileId: 'druid-storm-druid' };
  const elig = M.evaluateEligibility(stormDruid, baseRequest());
  assert.equal(elig.status, 'eligible', 'a commitment gate must never demote a candidate to needs-confirmation or ineligible');
  assert.equal(elig.unresolvedGate, null);
  assert.ok(elig.disclosures.some(d => d.type === 'class-prerequisite'), 'the commitment must still be disclosed');

  const bladebound = { profile: byId.get('magus-bladebound'), internalId: 'magus-bladebound', baseProfileId: 'magus-bladebound' };
  const eligB = M.evaluateEligibility(bladebound, baseRequest());
  assert.equal(eligB.status, 'eligible');
  assert.ok(eligB.disclosures.some(d => d.type === 'class-prerequisite'));
});

test('a "commitment" gate stays eligible even with contradictory or no gateAnswers -- gateAnswers only ever matter for compatibility gates', () => {
  const stormDruid = { profile: byId.get('druid-storm-druid'), internalId: 'druid-storm-druid', baseProfileId: 'druid-storm-druid' };
  const request = baseRequest({ gateAnswers: { 'druid-storm-druid:class-prerequisite': { status: 'conflict' } } });
  const elig = M.evaluateEligibility(stormDruid, request);
  assert.equal(elig.status, 'eligible', 'a commitment gate ignores gateAnswers entirely -- it is not a compatibility gate');
});

// ---------------------------------------------------------------------
// 11. Soft gates
// ---------------------------------------------------------------------
test('11. a soft gate produces a warning but never rejection', () => {
  const razmiran = { profile: byId.get('sorcerer-razmiran-priest'), internalId: 'sorcerer-razmiran-priest', baseProfileId: 'sorcerer-razmiran-priest' };
  const elig = M.evaluateEligibility(razmiran, baseRequest());
  assert.equal(elig.status, 'eligible');
  assert.ok(elig.warnings.length > 0, 'Razmiran Priest\'s two soft gates should surface as warnings');
});

// ---------------------------------------------------------------------
// 12/13. Conduct + Druid
// ---------------------------------------------------------------------
test('12. strict avoidance of a mandatory, substantial-loss conduct profile rejects it', () => {
  const druidDomain = { profile: byId.get('druid-domain'), internalId: 'druid-domain', baseProfileId: 'druid-domain' };
  const request = baseRequest({ conductPreferences: { stance: 'avoid', importance: 9, acceptedCodePresence: ['none', 'optional'], acceptedMechanicalLossRisk: ['none', 'limited'] } });
  const elig = M.evaluateEligibility(druidDomain, request);
  assert.equal(elig.status, 'ineligible');
});

test('conduct mismatch with a non-avoid stance produces a warning, not rejection', () => {
  const druidDomain = { profile: byId.get('druid-domain'), internalId: 'druid-domain', baseProfileId: 'druid-domain' };
  const request = baseRequest({ conductPreferences: { stance: 'accept', importance: 5, acceptedCodePresence: ['none'], acceptedMechanicalLossRisk: ['none'] } });
  const elig = M.evaluateEligibility(druidDomain, request);
  assert.equal(elig.status, 'eligible');
  assert.ok(elig.warnings.some(w => w.type === 'conduct'));
});

test('13. Druid conduct is explained as mandatory with mechanical consequences', () => {
  const request = baseRequest({ numericPreferences: { 'magical-utility': { importance: 9, origin: 'explicit' } } });
  const scored = { candidate: { internalId: 'druid-domain', baseProfileId: 'druid-domain', profile: byId.get('druid-domain'), branchId: null },
    overallFit: 0.9, coverage: 1, confidence: 'high', matchedCriteria: [], tensionCriteria: [], eligibility: M.evaluateEligibility({ profile: byId.get('druid-domain') }, request) };
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc);
  const req = presentation.requirements.join(' ');
  assert.match(req, /code|requires|expects/i);
  assert.match(req, /neutral/i);
});

// ---------------------------------------------------------------------
// 14/15. Razmiran Priest / Bladebound
// ---------------------------------------------------------------------
test('14. Razmiran Priest is not hard-gated by deity or institution', () => {
  const razmiran = { profile: byId.get('sorcerer-razmiran-priest'), internalId: 'sorcerer-razmiran-priest', baseProfileId: 'sorcerer-razmiran-priest' };
  const elig = M.evaluateEligibility(razmiran, baseRequest());
  assert.equal(elig.status, 'eligible');
  assert.ok(!elig.reasons.some(r => /deity|institution/i.test(r.cause || '')));
});

test('15. Bladebound explains the sentient weapon relationship without the engine itself asserting a code requirement', () => {
  const scored = { candidate: { internalId: 'magus-bladebound', baseProfileId: 'magus-bladebound', profile: byId.get('magus-bladebound'), branchId: null },
    overallFit: 0.7, coverage: 0.9, confidence: 'medium', matchedCriteria: [], tensionCriteria: [], eligibility: M.evaluateEligibility({ profile: byId.get('magus-bladebound') }, baseRequest()) };
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, baseRequest(), criteriaDoc);
  // The engine's own generated `requirements` text (driven by conduct.codePresence)
  // must not assert a code requirement, since codePresence is "none" for
  // Bladebound (the Ego conflict is an item relationship, not a class code --
  // Cross-Class Normalization Pass 01's own correction). The source `tradeoff`
  // text (surfaced verbatim in watchFor) is allowed to mention "class code" in
  // its own negated form ("...not a class code that removes your powers...").
  const requirementsText = presentation.requirements.join(' ').toLowerCase();
  assert.ok(!/requires living by a code|expects living by a code/i.test(requirementsText), 'the engine must not generate its own code-requirement sentence for Bladebound');
  assert.ok(byId.get('magus-bladebound').conduct.codePresence !== 'mandatory');
  assert.ok(presentation.watchFor.some(w => /not a class code/i.test(w)), 'the sourced tradeoff explanation (explicitly denying it is a code) should surface in watchFor');
});

// ---------------------------------------------------------------------
// 16/17. Material branches
// ---------------------------------------------------------------------
test('16. Druid animal-companion material alternative is scored as a distinct branch', () => {
  const candidates = M.expandCandidateBranches([byId.get('druid-feyspeaker-domain')]);
  assert.equal(candidates.length, 2);
  const branch = candidates.find(c => c.isBranch);
  assert.equal(branch.internalId, 'druid-feyspeaker-domain::nature-bond-animal-companion');
  assert.equal(branch.profile.scores['companion-centrality'], byId.get('druid-feyspeaker-domain').materialAlternative.scoreOverrides['companion-centrality']);
  assert.equal(branch.profile.scores['crowd-control'], byId.get('druid-feyspeaker-domain').scores['crowd-control'], 'unoverridden scores must be preserved');
});

test('17. two branches of the same profile do not fill two ordinary result slots', () => {
  const request = baseRequest({
    numericPreferences: { 'companion-centrality': { desiredPosition: 9, importance: 9, origin: 'explicit' }, 'magical-utility': { importance: 8, origin: 'explicit' } },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const baseIds = result.recommendations.map(r => r.id.split('::')[0]);
  assert.equal(new Set(baseIds).size, baseIds.length, 'no base profile should appear twice across result slots');
});

// ---------------------------------------------------------------------
// 18/19. Class vs archetype identity
// ---------------------------------------------------------------------
test('18. every archetype result exposes its parent class', () => {
  const request = baseRequest({ numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' } } });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  for (const rec of result.recommendations) {
    if (rec.entityType === 'archetype') {
      assert.ok(rec.parentLabel, `${rec.title} is an archetype but has no parentLabel`);
      assert.equal(rec.typeLabel, 'Archetype');
    }
  }
});

test('19. class paths are labelled as classes, never archetypes', () => {
  const scored = { candidate: { internalId: 'sorcerer-base', baseProfileId: 'sorcerer-base', profile: byId.get('sorcerer-base'), branchId: null },
    overallFit: 0.9, coverage: 1, confidence: 'high', matchedCriteria: [], tensionCriteria: [], eligibility: { status: 'eligible', reasons: [], warnings: [] } };
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, baseRequest(), criteriaDoc);
  assert.equal(presentation.entityType, 'class-path');
  assert.equal(presentation.typeLabel, 'Class');
  assert.equal(presentation.archetypeId, undefined);
});

// ---------------------------------------------------------------------
// 20. more-approachable thresholds
// ---------------------------------------------------------------------
test('20. more-approachable satisfies both complexity thresholds', () => {
  const request = baseRequest({ numericPreferences: { 'build-complexity': { desiredPosition: 9, importance: 9, origin: 'explicit' } }, options: { maxResults: 4 } });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const approachable = result.recommendations.find(r => r.role === 'more-approachable');
  if (approachable) {
    const profile = byId.get(approachable.id.split('::')[0]);
    assert.ok(profile.scores['build-complexity'] <= 5 && profile.scores['rules-mastery'] <= 5);
  }
});

// ---------------------------------------------------------------------
// 21. Diversity does not replace the true best-overall
// ---------------------------------------------------------------------
test('21. diverse role selection does not replace the true best-overall result', () => {
  const request = baseRequest({ numericPreferences: { 'crowd-control': { importance: 10, origin: 'explicit' } }, options: { maxResults: 4 } });
  const candidates = M.expandCandidateBranches(profiles);
  const scored = candidates.map(c => Object.assign(M.scoreCandidate(c, request, criteriaDoc), { eligibility: M.evaluateEligibility(c, request) }));
  const ranked = M.rankCandidates(scored);
  const eligible = ranked.filter(s => s.eligibility.status === 'eligible');
  const trueBest = eligible[0];
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const bestOverall = result.recommendations.find(r => r.role === 'best-overall');
  assert.equal(bestOverall.id, trueBest.candidate.internalId);
});

// ---------------------------------------------------------------------
// 22. Low information
// ---------------------------------------------------------------------
test('22. low-information input returns low confidence and a next question', () => {
  const request = baseRequest({ numericPreferences: { 'crowd-control': { importance: 5, origin: 'explicit' } } });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.equal(result.confidence, 'low');
  assert.ok(result.nextQuestion, 'a next question should be offered when confidence is low');
});

// ---------------------------------------------------------------------
// 23. Gate resolution changes the next question
// ---------------------------------------------------------------------
test('23. a resolved gate affecting a top candidate changes the next-question choice', () => {
  const request = baseRequest({ numericPreferences: { 'stealth-infiltration': { importance: 9, origin: 'explicit' }, 'offensive-spellcasting': { importance: 9, origin: 'explicit' } } });
  const candidates = M.expandCandidateBranches(profiles);
  const scoredUnresolved = candidates.map(c => Object.assign(M.scoreCandidate(c, request, criteriaDoc), { eligibility: M.evaluateEligibility(c, request) }));
  const rankedUnresolved = M.rankCandidates(scoredUnresolved);
  const qUnresolved = M.selectNextQuestion(request, rankedUnresolved, questionTemplates, criteriaDoc);

  const requestResolved = baseRequest({
    numericPreferences: request.numericPreferences,
    gateAnswers: { [SCOUNDREL_GATE_ID]: { status: 'satisfied' } },
  });
  const scoredResolved = candidates.map(c => Object.assign(M.scoreCandidate(c, requestResolved, criteriaDoc), { eligibility: M.evaluateEligibility(c, requestResolved) }));
  const rankedResolved = M.rankCandidates(scoredResolved);
  const qResolved = M.selectNextQuestion(requestResolved, rankedResolved, questionTemplates, criteriaDoc);

  if (qUnresolved && qUnresolved.synthetic) {
    assert.ok(!qResolved || !qResolved.synthetic || qResolved.gateId !== qUnresolved.gateId, 'resolving the gate should change or remove the synthetic gate question');
  }
});

test('the synthetic gate question uses the gate\'s own natural-English confirmationPrompt, never "Confirm: <raw rule>"', () => {
  const request = baseRequest({ numericPreferences: { 'stealth-infiltration': { importance: 9, origin: 'explicit' } } });
  const candidates = M.expandCandidateBranches(profiles);
  const scored = candidates.map(c => Object.assign(M.scoreCandidate(c, request, criteriaDoc), { eligibility: M.evaluateEligibility(c, request) }));
  const ranked = M.rankCandidates(scored);
  const q = M.selectNextQuestion(request, ranked, questionTemplates, criteriaDoc);
  if (q && q.synthetic) {
    assert.ok(!q.prompt.startsWith('Confirm:'), 'synthetic gate prompt must not use the old "Confirm: <raw rule>" phrasing');
    assert.match(q.prompt, /\?$/, 'a yes/no prompt should read as a question');
    assert.ok(Array.isArray(q.answers) && q.answers.some(a => a.label === 'Yes') && q.answers.some(a => a.label === 'No'), 'a synthetic gate question must offer a yes/no answer pair');
  }
});

// ---------------------------------------------------------------------
// 24. No statistics in presentation results
// ---------------------------------------------------------------------
test('24. presentation results contain no score or percentage wording', () => {
  const request = baseRequest({ numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' }, 'melee-ranged': { desiredPosition: 5.5, importance: 7, origin: 'explicit' } } });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const serialized = JSON.stringify(result.recommendations);
  assert.ok(!/%/.test(serialized), 'no percent sign anywhere in presentation output');
  assert.ok(!/\bfit\b\s*[:=]?\s*0?\.\d/i.test(serialized), 'no raw decimal fit number embedded in presentation text');
  for (const rec of result.recommendations) {
    assert.equal(typeof rec.fitBand, 'string');
    assert.ok(!('overallFit' in rec) && !('score' in rec) && !('weightedFit' in rec));
  }
});

// ---------------------------------------------------------------------
// 25. Empty preferences
// ---------------------------------------------------------------------
test('25. empty active preferences return no fake recommendation and request a broad opening question', () => {
  const result = M.matchProfiles(baseRequest(), profiles, criteriaDoc, questionTemplates);
  assert.deepEqual(result.recommendations, []);
  assert.ok(result.nextQuestion);
});

test('25b. all-notRelevant preferences are equivalent to empty (still no fake recommendation)', () => {
  const result = M.matchProfiles(baseRequest({ numericPreferences: { 'crowd-control': { notRelevant: true, origin: 'explicit' } } }), profiles, criteriaDoc, questionTemplates);
  assert.deepEqual(result.recommendations, []);
});

// ---------------------------------------------------------------------
// Validation contract
// ---------------------------------------------------------------------
test('validatePreferenceRequest enforces the handoff\'s stated rules', () => {
  assert.throws(() => M.validatePreferenceRequest(baseRequest({ numericPreferences: { 'not-a-real-criterion': { importance: 5 } } }), criteriaDoc), M.ValidationError);
  assert.throws(() => M.validatePreferenceRequest(baseRequest({ numericPreferences: { 'crowd-control': { desiredPosition: 5, importance: 5 } } }), criteriaDoc), M.ValidationError, 'desiredPosition on a capability criterion must be rejected');
  assert.throws(() => M.validatePreferenceRequest(baseRequest({ numericPreferences: { 'melee-ranged': { importance: 5 } } }), criteriaDoc), M.ValidationError, 'an active directional criterion requires desiredPosition');
  assert.throws(() => M.validatePreferenceRequest(baseRequest({ numericPreferences: { 'crowd-control': { notRelevant: true, importance: 5 } } }), criteriaDoc), M.ValidationError, 'notRelevant cannot coexist with importance');
  assert.throws(() => M.validatePreferenceRequest(baseRequest({ categoricalPreferences: { 'companion-type': { mode: 'require', values: [] } } }), criteriaDoc), M.ValidationError, 'require needs at least one value');
  assert.throws(() => M.validatePreferenceRequest(baseRequest({ categoricalPreferences: { 'companion-type': { mode: 'prefer', values: ['not-a-real-value'], importance: 5 } } }), criteriaDoc), M.ValidationError, 'unknown categorical value must be rejected');
  assert.doesNotThrow(() => M.validatePreferenceRequest(baseRequest({ numericPreferences: { 'crowd-control': { importance: 5, origin: 'explicit' }, 'melee-ranged': { desiredPosition: 5.5, importance: 5, origin: 'explicit' } } }), criteriaDoc));
  assert.throws(() => M.validatePreferenceRequest(baseRequest({ gateAnswers: { [SCOUNDREL_GATE_ID]: { status: 'confirmed' } } }), criteriaDoc), M.ValidationError, 'gateAnswers status must be "satisfied" or "conflict" -- the old confirmed:true/value shape must be rejected');
  assert.doesNotThrow(() => M.validatePreferenceRequest(baseRequest({ gateAnswers: { [SCOUNDREL_GATE_ID]: { status: 'satisfied' } } }), criteriaDoc));
});

// ---------------------------------------------------------------------
// Provisional fitBand (matcher-contract correction rule 8)
// ---------------------------------------------------------------------
test('best-overall below fit 0.58 is "provisional", stays visible, and forces low overall confidence plus a follow-up question', () => {
  // Deliberately contradictory/poorly-satisfiable preferences against every
  // candidate so the true best-overall still has weak fit.
  const request = baseRequest({
    numericPreferences: {
      'stealth-infiltration': { importance: 10, origin: 'explicit' },
      'offensive-spellcasting': { importance: 10, origin: 'explicit' },
      'armour-defence': { importance: 10, origin: 'explicit' },
      'ranged-weapon-effectiveness': { importance: 10, origin: 'explicit' },
      'shapeshifting-transformation': { importance: 10, origin: 'explicit' },
      'social-influence': { importance: 10, origin: 'explicit' },
    },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const best = result.recommendations[0];
  if (best && best.fitBand === 'provisional') {
    assert.equal(best.role, 'best-overall');
    assert.equal(result.confidence, 'low', 'a provisional best-overall must force the whole shortlist to read low-confidence');
    assert.ok(result.nextQuestion, 'a provisional best-overall must still request a follow-up question');
  }
});

test('vocabularies.json declares "provisional" as a fitBand', () => {
  const vocab = readJson('vocabularies.json');
  assert.ok(vocab.fitBands.includes('provisional'));
});

// ---------------------------------------------------------------------
// Definition-of-done structural checks
// ---------------------------------------------------------------------
test('the engine never mutates the source profiles array or its objects', () => {
  const snapshot = JSON.parse(JSON.stringify(profiles));
  const request = baseRequest({
    numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' } },
    categoricalPreferences: { 'companion-type': { mode: 'exclude', values: ['animal companion'], origin: 'explicit' } },
  });
  M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.deepEqual(profiles, snapshot);
});

test('matcher.js exports exactly the suggested module boundary', () => {
  const exported = Object.keys(M).filter(k => k !== 'ValidationError').sort();
  assert.deepEqual(exported, [
    'assignResultRoles', 'buildPresentationResult', 'evaluateEligibility', 'expandCandidateBranches',
    'matchProfiles', 'rankCandidates', 'scoreCandidate', 'selectNextQuestion', 'validatePreferenceRequest',
  ]);
});

// =======================================================================
// Golden scenarios (real 27-profile catalogue)
// =======================================================================

test('golden: ranged, martial, durable, all-day character -> Fighter Archer leads', () => {
  const request = baseRequest({
    numericPreferences: {
      'melee-ranged': { desiredPosition: 10, importance: 9, origin: 'explicit' },
      'martial-magic': { desiredPosition: 1, importance: 8, origin: 'explicit' },
      'personal-durability': { importance: 7, origin: 'explicit' },
      'resource-endurance': { importance: 8, origin: 'explicit' },
    },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.ok(result.recommendations.length > 0);
  assert.equal(result.recommendations[0].id, 'fighter-archer');
});

test('golden: spontaneous offensive caster with low preparation burden -> a Sorcerer path leads', () => {
  const request = baseRequest({
    numericPreferences: {
      'martial-magic': { desiredPosition: 10, importance: 9, origin: 'explicit' },
      'no-heavy-preparation': { desiredPosition: 1, importance: 9, origin: 'explicit' },
    },
    categoricalPreferences: { 'casting-method': { mode: 'prefer', values: ['spontaneous'], importance: 8, origin: 'explicit' } },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.equal(result.recommendations[0].classId, 'sorcerer');
});

test('golden: stealthy magical infiltrator -> Eldritch Scoundrel or another arcane-stealth profile leads', () => {
  const request = baseRequest({
    numericPreferences: {
      'stealth-infiltration': { importance: 10, origin: 'explicit' },
      'offensive-spellcasting': { importance: 7, origin: 'explicit' },
    },
    gateAnswers: { [SCOUNDREL_GATE_ID]: { status: 'satisfied' } },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.ok(result.recommendations.length > 0);
  assert.ok(result.recommendations[0].id === 'rogue-eldritch-scoundrel' || byId.get(result.recommendations[0].id.split('::')[0]).scores['stealth-infiltration'] >= 7);
});

test('golden: nature caster with a central animal companion -> a Druid animal-companion branch leads', () => {
  const request = baseRequest({
    numericPreferences: {
      'martial-magic': { desiredPosition: 9, importance: 8, origin: 'explicit' },
      'companion-centrality': { desiredPosition: 9, importance: 9, origin: 'explicit' },
      'wilderness': { importance: 7, origin: 'explicit' },
    },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const top = result.recommendations[0];
  assert.equal(byId.get(top.id.split('::')[0]).classId, 'druid');
  assert.ok(top.id.includes('animal-companion') || top.branchChoice === 'nature-bond-animal-companion' || top.id === 'druid-pack-lord');
});

test('golden: melee magical weapon-user who wants crowd control -> Hexcrafter or another Magus control path leads', () => {
  const request = baseRequest({
    numericPreferences: {
      'melee-ranged': { desiredPosition: 2, importance: 8, origin: 'explicit' },
      'martial-magic': { desiredPosition: 6, importance: 7, origin: 'explicit' },
      'crowd-control': { importance: 9, origin: 'explicit' },
    },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.ok(result.recommendations.length > 0);
  assert.equal(byId.get(result.recommendations[0].id.split('::')[0]).classId, 'magus');
});

test('golden: socially influential character with no mandatory code -> excludes mandatory-code profiles', () => {
  const request = baseRequest({
    numericPreferences: { 'social-influence': { importance: 10, origin: 'explicit' } },
    conductPreferences: { stance: 'avoid', importance: 9, acceptedCodePresence: ['none', 'optional', 'expected'], acceptedMechanicalLossRisk: ['none', 'limited'] },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  for (const rec of result.recommendations) {
    const profile = byId.get(rec.id.split('::')[0]);
    assert.notEqual(profile.conduct && profile.conduct.mechanicalLossRisk, 'substantial');
  }
});

test('golden: beginner-friendly option with low rules burden -> a build-complexity<=5 profile leads', () => {
  const request = baseRequest({
    numericPreferences: {
      'build-complexity': { desiredPosition: 1, importance: 10, origin: 'explicit' },
      'rules-mastery': { desiredPosition: 1, importance: 9, origin: 'explicit' },
    },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const top = byId.get(result.recommendations[0].id.split('::')[0]);
  assert.ok(top.scores['build-complexity'] <= 5);
});

test('golden: sworn or institution-bound identity with accepted consequences -> a mandatory-code Druid profile is not excluded', () => {
  const request = baseRequest({
    numericPreferences: { 'code-bound-identity': { desiredPosition: 9, importance: 9, origin: 'explicit' }, 'wilderness': { importance: 7, origin: 'explicit' } },
    conductPreferences: { stance: 'welcome', importance: 9, acceptedCodePresence: ['mandatory', 'expected', 'optional', 'none'], acceptedMechanicalLossRisk: ['substantial', 'limited', 'none'] },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.ok(result.recommendations.some(r => byId.get(r.id.split('::')[0]).conduct.codePresence === 'mandatory'));
});

// =======================================================================
// Editorial explanation catalogue integration (2026-09-15)
// =======================================================================

test('exact coverage: the catalogue has a narrative for every one of the 56 numeric and 8 categorical criteria (and every categorical value)', () => {
  assert.doesNotThrow(() => FYC.validateExplanationCatalogue(explanationCatalogue, criteriaIndex));
  const numericIds = criteriaDoc.criteria.filter(c => c.kind === 'capability' || c.kind === 'directional').map(c => c.id);
  const categoricalCriteria = criteriaDoc.criteria.filter(c => c.kind === 'categorical');
  for (const id of numericIds) assert.ok(explanationCatalogue.numericNarratives[id], `missing numeric narrative for "${id}"`);
  for (const crit of categoricalCriteria) {
    assert.ok(explanationCatalogue.categoricalNarratives[crit.id], `missing categorical narrative for "${crit.id}"`);
    for (const v of crit.values) assert.ok(explanationCatalogue.categoricalNarratives[crit.id][v], `missing categorical narrative for "${crit.id}"="${v}"`);
  }
});

test('validateExplanationCatalogue rejects a catalogue with a missing or extra criterion', () => {
  const missing = JSON.parse(JSON.stringify(explanationCatalogue));
  delete missing.numericNarratives['crowd-control'];
  assert.throws(() => FYC.validateExplanationCatalogue(missing, criteriaIndex), FYC.ValidationError);

  const extra = JSON.parse(JSON.stringify(explanationCatalogue));
  extra.numericNarratives['not-a-real-criterion'] = { kind: 'capability', match: 'x', tension: 'y' };
  assert.throws(() => FYC.validateExplanationCatalogue(extra, criteriaIndex), FYC.ValidationError);
});

test('whyItFits uses authored editorial text (never the retired "This matters to you" fallback) and never exceeds 2 entries', () => {
  const request = baseRequest({
    numericPreferences: {
      'melee-ranged': { desiredPosition: 9, importance: 9, origin: 'explicit' },
      'resource-endurance': { importance: 9, origin: 'explicit' },
      'ranged-weapon-effectiveness': { importance: 8, origin: 'explicit' },
    },
    options: { maxResults: 1 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const best = result.recommendations[0];
  assert.ok(best.whyItFits.length >= 1 && best.whyItFits.length <= 2);
  for (const s of best.whyItFits) assert.ok(!s.startsWith('This matters to you'), 'the old generic fallback must not appear once an authored fragment exists');
});

test('the generic fallback still works when no explanation catalogue is supplied (defensive path, not the normal one)', () => {
  const scored = { candidate: { internalId: 'fighter-archer', baseProfileId: 'fighter-archer', profile: byId.get('fighter-archer'), branchId: null },
    overallFit: 0.9, coverage: 1, confidence: 'high',
    matchedCriteria: ['single-target-damage'], tensionCriteria: [],
    contributions: { 'single-target-damage': { fit: 0.9, weightedFit: 0.8, weight: 0.9 } },
    eligibility: { status: 'eligible', reasons: [], warnings: [], disclosures: [] } };
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, baseRequest({ numericPreferences: { 'single-target-damage': { importance: 9, origin: 'explicit' } } }), criteriaDoc, null, new Set());
  assert.ok(presentation.whyItFits.some(s => s.startsWith('This matters to you')), 'without a catalogue the old generic sentence remains the safety net');
});

test('special case: Druid conduct replaces the generic code sentence with the authored druid-conduct fragment', () => {
  const stormDruid = { profile: byId.get('druid-storm-druid'), internalId: 'druid-storm-druid', baseProfileId: 'druid-storm-druid', branchId: null };
  const request = baseRequest();
  const scored = Object.assign(M.scoreCandidate(stormDruid, request, criteriaDoc), { eligibility: M.evaluateEligibility(stormDruid, request) });
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc, explanationCatalogue, new Set());
  assert.ok(presentation.requirements.some(r => /bond with nature is a real class obligation/i.test(r)), 'the authored druid-conduct fragment must appear');
  assert.ok(!presentation.requirements.some(r => /^This path (requires|expects) living by a code/.test(r)), 'the generic code sentence must be replaced, not duplicated');
});

test('special case: Razmiran Priest gets the authored razmiran-narrative fragment instead of the generic fixed-source sentence', () => {
  const razmiran = { profile: byId.get('sorcerer-razmiran-priest'), internalId: 'sorcerer-razmiran-priest', baseProfileId: 'sorcerer-razmiran-priest', branchId: null };
  const request = baseRequest();
  const scored = Object.assign(M.scoreCandidate(razmiran, request, criteriaDoc), { eligibility: M.evaluateEligibility(razmiran, request) });
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc, explanationCatalogue, new Set());
  assert.ok(presentation.requirements.some(r => /Razmir's church defines the published story/i.test(r)));
  assert.ok(!presentation.requirements.some(r => /^A specific patron or source defines this path narratively/.test(r)), 'the generic fixed-source sentence must be replaced, not duplicated');
});

test('special case: Bladebound gets the authored bladebound-relationship fragment in addition to (not replacing) the weapon-choice disclosure', () => {
  const bladebound = { profile: byId.get('magus-bladebound'), internalId: 'magus-bladebound', baseProfileId: 'magus-bladebound', branchId: null };
  const request = baseRequest();
  const scored = Object.assign(M.scoreCandidate(bladebound, request, criteriaDoc), { eligibility: M.evaluateEligibility(bladebound, request) });
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc, explanationCatalogue, new Set());
  assert.ok(presentation.requirements.some(r => /Black Blade has its own purpose and Ego/i.test(r)), 'authored Ego-conflict fragment must appear');
  assert.ok(presentation.requirements.some(r => /one-handed slashing weapon, rapier or sword cane/i.test(r)), 'the mechanical weapon-choice disclosure must still appear alongside it');
});

test('special case: the material-animal-companion fragment appears only on the animal-companion branch, never the domain base', () => {
  const candidates = M.expandCandidateBranches([byId.get('druid-feyspeaker-domain')]);
  const base = candidates.find(c => !c.isBranch), branch = candidates.find(c => c.isBranch);
  const request = baseRequest();
  const scoredBase = Object.assign(M.scoreCandidate(base, request, criteriaDoc), { eligibility: M.evaluateEligibility(base, request) });
  const scoredBranch = Object.assign(M.scoreCandidate(branch, request, criteriaDoc), { eligibility: M.evaluateEligibility(branch, request) });
  const presBase = M.buildPresentationResult({ role: 'best-overall', scored: scoredBase }, request, criteriaDoc, explanationCatalogue, new Set());
  const presBranch = M.buildPresentationResult({ role: 'best-overall', scored: scoredBranch }, request, criteriaDoc, explanationCatalogue, new Set());
  assert.ok(!presBase.requirements.some(r => /assumes you choose an animal companion/i.test(r)));
  assert.ok(presBranch.requirements.some(r => /assumes you choose an animal companion/i.test(r)));
});

test('special case: free-choice-deity fragment replaces the generic sentence when a profile has that deityChoiceProvenance', () => {
  const syntheticProfile = Object.assign({}, byId.get('sorcerer-base'), {
    id: 'synthetic-free-choice-deity',
    conduct: { codePresence: 'none', mechanicalLossRisk: 'none', alignmentRule: { kind: 'none', values: [] }, deityRequired: false, deityChoiceProvenance: 'free-choice-with-consequences', institutionRequired: false },
  });
  const candidate = { profile: syntheticProfile, internalId: 'synthetic-free-choice-deity', baseProfileId: 'synthetic-free-choice-deity', branchId: null };
  const request = baseRequest();
  const scored = Object.assign(M.scoreCandidate(candidate, request, criteriaDoc), { eligibility: M.evaluateEligibility(candidate, request) });
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc, explanationCatalogue, new Set());
  assert.ok(presentation.requirements.some(r => /You choose the deity/i.test(r)));
  assert.ok(!presentation.requirements.some(r => /^You choose a deity or patron; once chosen/.test(r)), 'the generic free-choice sentence must be replaced, not duplicated');
});

test('special case: archetype-parent is a behavioural rule, never printed as literal requirement text', () => {
  const hexcrafter = { profile: byId.get('magus-hexcrafter'), internalId: 'magus-hexcrafter', baseProfileId: 'magus-hexcrafter', branchId: null };
  const request = baseRequest();
  const scored = Object.assign(M.scoreCandidate(hexcrafter, request, criteriaDoc), { eligibility: M.evaluateEligibility(hexcrafter, request) });
  const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc, explanationCatalogue, new Set());
  assert.ok(!presentation.requirements.some(r => /Always state the parent class/i.test(r)), 'archetype-parent\'s text is an authoring instruction, not player-facing prose');
  // The behaviour it describes must still hold: the parent class is stated first.
  assert.ok(presentation.summary.includes('Magus archetype'));
});

test('the same criterion sentence is never repeated twice within one shortlist', () => {
  const request = baseRequest({
    numericPreferences: {
      'personal-durability': { importance: 9, origin: 'explicit' },
      'melee-weapon-effectiveness': { importance: 8, origin: 'explicit' },
      'armour-defence': { importance: 8, origin: 'explicit' },
    },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const allFragmentSentences = result.recommendations.flatMap(r => r.whyItFits);
  assert.equal(new Set(allFragmentSentences).size, allFragmentSentences.length, 'a whyItFits sentence must not repeat across the shortlist');
});

test('no statistical language anywhere in whyItFits, watchFor, summary or requirements', () => {
  const request = baseRequest({
    numericPreferences: {
      'crowd-control': { importance: 9, origin: 'explicit' },
      'melee-ranged': { desiredPosition: 5.5, importance: 7, origin: 'explicit' },
      'code-bound-identity': { desiredPosition: 8, importance: 8, origin: 'explicit' },
    },
    categoricalPreferences: { 'companion-type': { mode: 'prefer', values: ['animal companion'], importance: 6, origin: 'explicit' } },
    options: { maxResults: 4, includeNeedsConfirmation: true },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  for (const rec of result.recommendations) {
    const allText = [rec.summary, ...rec.whyItFits, ...rec.watchFor, ...rec.requirements].join(' \n ');
    assert.ok(!/%/.test(allText), `${rec.id}: percent sign found`);
    assert.ok(!/\b0\.\d\d\b/.test(allText), `${rec.id}: raw decimal fit number found`);
    assert.ok(!/\bfit\b|\bweight(ed)?\b|\bscore\b|\bcoverage\b/i.test(allText), `${rec.id}: statistical/internal terminology leaked into player-facing text`);
    for (const c of criteriaDoc.criteria) assert.ok(!allText.includes(c.id), `${rec.id}: raw criterion id "${c.id}" leaked into player-facing text`);
  }
});

// =======================================================================
// Editorial-output quality pass (2026-09-15)
// =======================================================================

const EDITORIAL_QUALITY_SCENARIOS = [
  baseRequest({ numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' } }, options: { maxResults: 4, includeNeedsConfirmation: true } }),
  baseRequest({ numericPreferences: { 'melee-ranged': { desiredPosition: 9, importance: 9, origin: 'explicit' }, 'personal-durability': { importance: 8, origin: 'explicit' } }, options: { maxResults: 4 } }),
  baseRequest({ numericPreferences: { 'martial-magic': { desiredPosition: 9, importance: 9, origin: 'explicit' }, 'companion-centrality': { desiredPosition: 9, importance: 9, origin: 'explicit' }, 'wilderness': { importance: 7, origin: 'explicit' } }, options: { maxResults: 4 } }),
  baseRequest({ numericPreferences: { 'social-influence': { importance: 9, origin: 'explicit' } }, options: { maxResults: 4 } }),
  baseRequest({ numericPreferences: { 'stealth-infiltration': { importance: 9, origin: 'explicit' } }, gateAnswers: { [SCOUNDREL_GATE_ID]: { status: 'satisfied' } }, options: { maxResults: 4 } }),
];

test('EQ1. whyItFits is never empty, across a spread of scenarios (including the strongest-connection fallback path)', () => {
  for (const request of EDITORIAL_QUALITY_SCENARIOS) {
    const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
    for (const rec of result.recommendations) {
      assert.ok(rec.whyItFits.length >= 1, `${rec.id}: whyItFits must never be empty`);
    }
  }
});

test('EQ2. the animal-companion Druid scenario does not pad the shortlist with an unrelated Archer or another sub-0.58 candidate', () => {
  const request = baseRequest({
    numericPreferences: {
      'martial-magic': { desiredPosition: 9, importance: 9, origin: 'explicit' },
      'companion-centrality': { desiredPosition: 9, importance: 9, origin: 'explicit' },
      'wilderness': { importance: 7, origin: 'explicit' },
    },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.ok(!result.recommendations.some(r => r.id.startsWith('fighter-archer')), 'an unrelated Archer must not appear in a nature-caster/animal-companion shortlist');
  for (const rec of result.recommendations) {
    const raw = result._internal.ranked.find(s => s.candidate.internalId === rec.id);
    assert.ok(raw.overallFit === null || raw.overallFit >= 0.58 || rec.role === 'best-overall', `${rec.id}: a non-best-overall role must not be filled below fit 0.58`);
  }
});

test('EQ3. none of the seven updated profiles exposes internal-development language ("anchor", "category wording", "eventually separate") in player-facing output', () => {
  const forbidden = /\banchor\b|category wording|eventually separate/i;
  const sevenIds = ['fighter-archer', 'fighter-armor-master', 'rogue-burglar', 'sorcerer-base', 'druid-domain', 'druid-pack-lord', 'magus-eldritch-archer'];
  for (const id of sevenIds) {
    const p = byId.get(id);
    assert.ok(p.playerSummary, `${id}: missing playerSummary`);
    assert.ok(p.tradeoff, `${id}: missing tradeoff`);
    assert.ok(!forbidden.test(p.playerSummary), `${id}: playerSummary contains internal-development language`);
    assert.ok(!forbidden.test(p.tradeoff), `${id}: tradeoff contains internal-development language`);

    const candidate = { profile: p, internalId: id, baseProfileId: id, branchId: null };
    const request = baseRequest();
    const scored = Object.assign(M.scoreCandidate(candidate, request, criteriaDoc), { eligibility: M.evaluateEligibility(candidate, request) });
    const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc, explanationCatalogue, new Set());
    const allText = [presentation.summary, ...presentation.whyItFits, ...presentation.watchFor, ...presentation.requirements].join(' ');
    assert.ok(!forbidden.test(allText), `${id}: rendered presentation still contains internal-development language (editorialNote leaked)`);
  }
});

test('EQ4. Sorcerer and Druid class paths identify themselves as classes in their summaries', () => {
  for (const id of ['sorcerer-base', 'druid-domain']) {
    const p = byId.get(id);
    const candidate = { profile: p, internalId: id, baseProfileId: id, branchId: null };
    const request = baseRequest();
    const scored = Object.assign(M.scoreCandidate(candidate, request, criteriaDoc), { eligibility: M.evaluateEligibility(candidate, request) });
    const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc, explanationCatalogue, new Set());
    assert.ok(new RegExp(`^${presentation.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]* is a class path\\.`).test(presentation.summary) || presentation.summary.includes(`${presentation.title} is a class path.`), `${id}: summary must state "is a class path"`);
    assert.equal(presentation.typeLabel, 'Class');
    assert.ok(!/archetype/i.test(presentation.summary), `${id}: a class path must never be worded as an archetype`);
  }
});

test('EQ5. Razmiran Priest never says it requires or expects living by a code', () => {
  for (const request of [baseRequest(), baseRequest({ conductPreferences: { stance: 'accept', importance: 5, acceptedCodePresence: ['none'], acceptedMechanicalLossRisk: ['none'] } })]) {
    const razmiran = { profile: byId.get('sorcerer-razmiran-priest'), internalId: 'sorcerer-razmiran-priest', baseProfileId: 'sorcerer-razmiran-priest', branchId: null };
    const scored = Object.assign(M.scoreCandidate(razmiran, request, criteriaDoc), { eligibility: M.evaluateEligibility(razmiran, request) });
    const presentation = M.buildPresentationResult({ role: 'best-overall', scored }, request, criteriaDoc, explanationCatalogue, new Set());
    const allText = [presentation.summary, ...presentation.requirements].join(' ');
    assert.ok(!/requires living by a code|expects living by a code/i.test(allText), 'Razmiran Priest must never claim a mechanical code-of-conduct requirement');
    assert.ok(allText.includes("Razmir's church defines the published story"), 'the authored narrative explanation must still appear');
  }
});

test('EQ6. every returned result has a summary, at least one reason to consider it, and at most two watchFor entries', () => {
  for (const request of EDITORIAL_QUALITY_SCENARIOS) {
    const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
    for (const rec of result.recommendations) {
      assert.ok(typeof rec.summary === 'string' && rec.summary.length > 0, `${rec.id}: missing summary`);
      assert.ok(rec.whyItFits.length >= 1, `${rec.id}: no reason to consider it`);
      assert.ok(rec.watchFor.length <= 2, `${rec.id}: more than two watchFor entries`);
    }
  }
});
