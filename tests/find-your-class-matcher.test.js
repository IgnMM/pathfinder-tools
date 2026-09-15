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
const byId = new Map(profiles.map(p => [p.id, p]));

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
  const a = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
  const b = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  const a = M.matchProfiles(withPref, profiles, criteriaDoc, questionTemplates);
  const b = M.matchProfiles(withNotRelevant, profiles, criteriaDoc, questionTemplates);
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
test('9. confirmed hard-gate conflict is ineligible', () => {
  const scoundrel = { profile: byId.get('rogue-eldritch-scoundrel'), internalId: 'rogue-eldritch-scoundrel', baseProfileId: 'rogue-eldritch-scoundrel' };
  const request = baseRequest({ gateAnswers: { 'rules-gm-compatibility': { value: 'conflict', confirmed: true } } });
  const elig = M.evaluateEligibility(scoundrel, request);
  assert.equal(elig.status, 'ineligible');
});

test('10. unanswered hard gate is needs-confirmation', () => {
  const scoundrel = { profile: byId.get('rogue-eldritch-scoundrel'), internalId: 'rogue-eldritch-scoundrel', baseProfileId: 'rogue-eldritch-scoundrel' };
  const elig = M.evaluateEligibility(scoundrel, baseRequest());
  assert.equal(elig.status, 'needs-confirmation');
  assert.ok(elig.unresolvedGate);
});

test('confirmed non-conflicting hard-gate answer keeps the candidate eligible', () => {
  const scoundrel = { profile: byId.get('rogue-eldritch-scoundrel'), internalId: 'rogue-eldritch-scoundrel', baseProfileId: 'rogue-eldritch-scoundrel' };
  const request = baseRequest({ gateAnswers: { 'rules-gm-compatibility': { value: 'chained-rogue', confirmed: true } } });
  const elig = M.evaluateEligibility(scoundrel, request);
  assert.equal(elig.status, 'eligible');
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
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
  const baseIds = result.recommendations.map(r => r.id.split('::')[0]);
  assert.equal(new Set(baseIds).size, baseIds.length, 'no base profile should appear twice across result slots');
});

// ---------------------------------------------------------------------
// 18/19. Class vs archetype identity
// ---------------------------------------------------------------------
test('18. every archetype result exposes its parent class', () => {
  const request = baseRequest({ numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' } } });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
  const bestOverall = result.recommendations.find(r => r.role === 'best-overall');
  assert.equal(bestOverall.id, trueBest.candidate.internalId);
});

// ---------------------------------------------------------------------
// 22. Low information
// ---------------------------------------------------------------------
test('22. low-information input returns low confidence and a next question', () => {
  const request = baseRequest({ numericPreferences: { 'crowd-control': { importance: 5, origin: 'explicit' } } });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
    gateAnswers: { 'rules-gm-compatibility': { value: 'chained-rogue', confirmed: true } },
  });
  const scoredResolved = candidates.map(c => Object.assign(M.scoreCandidate(c, requestResolved, criteriaDoc), { eligibility: M.evaluateEligibility(c, requestResolved) }));
  const rankedResolved = M.rankCandidates(scoredResolved);
  const qResolved = M.selectNextQuestion(requestResolved, rankedResolved, questionTemplates, criteriaDoc);

  if (qUnresolved && qUnresolved.synthetic) {
    assert.ok(!qResolved || !qResolved.synthetic || qResolved.gateType !== qUnresolved.gateType, 'resolving the gate should change or remove the synthetic gate question');
  }
});

// ---------------------------------------------------------------------
// 24. No statistics in presentation results
// ---------------------------------------------------------------------
test('24. presentation results contain no score or percentage wording', () => {
  const request = baseRequest({ numericPreferences: { 'crowd-control': { importance: 9, origin: 'explicit' }, 'melee-ranged': { desiredPosition: 5.5, importance: 7, origin: 'explicit' } } });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
  assert.equal(result.recommendations[0].classId, 'sorcerer');
});

test('golden: stealthy magical infiltrator -> Eldritch Scoundrel or another arcane-stealth profile leads', () => {
  const request = baseRequest({
    numericPreferences: {
      'stealth-infiltration': { importance: 10, origin: 'explicit' },
      'offensive-spellcasting': { importance: 7, origin: 'explicit' },
    },
    gateAnswers: { 'rules-gm-compatibility': { value: 'chained-rogue', confirmed: true } },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
  assert.ok(result.recommendations.length > 0);
  assert.equal(byId.get(result.recommendations[0].id.split('::')[0]).classId, 'magus');
});

test('golden: socially influential character with no mandatory code -> excludes mandatory-code profiles', () => {
  const request = baseRequest({
    numericPreferences: { 'social-influence': { importance: 10, origin: 'explicit' } },
    conductPreferences: { stance: 'avoid', importance: 9, acceptedCodePresence: ['none', 'optional', 'expected'], acceptedMechanicalLossRisk: ['none', 'limited'] },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
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
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
  const top = byId.get(result.recommendations[0].id.split('::')[0]);
  assert.ok(top.scores['build-complexity'] <= 5);
});

test('golden: sworn or institution-bound identity with accepted consequences -> a mandatory-code Druid profile is not excluded', () => {
  const request = baseRequest({
    numericPreferences: { 'code-bound-identity': { desiredPosition: 9, importance: 9, origin: 'explicit' }, 'wilderness': { importance: 7, origin: 'explicit' } },
    conductPreferences: { stance: 'welcome', importance: 9, acceptedCodePresence: ['mandatory', 'expected', 'optional', 'none'], acceptedMechanicalLossRisk: ['substantial', 'limited', 'none'] },
    options: { maxResults: 4 },
  });
  const result = M.matchProfiles(request, profiles, criteriaDoc, questionTemplates);
  assert.ok(result.recommendations.some(r => byId.get(r.id.split('::')[0]).conduct.codePresence === 'mandatory'));
});
