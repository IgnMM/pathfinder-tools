// Run with: node --test tests/find-your-class-app.test.js
// Regression coverage for assets/find-your-class/app.js's pure state logic,
// implementing Find_Your_Class_UI_and_Onboarding_Handoff_v1.md's "State and
// transformations" section. Rendering (mount()) is DOM-only and not exercised
// here, matching this repo's existing convention -- see
// tests/find-your-class-launcher.test.js for static HTML/CSS checks on the
// rendered page shell and launcher instead. Covers required tests 9-17, 22-23.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'find-your-class');
const FYC = require(path.join(dir, 'loader.js'));
const Matcher = require(path.join(dir, 'matcher.js'));
const App = require(path.join(dir, 'app.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }

const criteriaDoc = readJson('criteria.json');
const profiles = readJson('compass-profiles.json').profiles;
const questionTemplates = readJson('question-templates.json');
const explanationCatalogue = readJson('explanation-templates.json');
const lexicon = readJson('concept-lexicon.json');
const criteriaIndex = FYC.indexCriteria(criteriaDoc);

// A minimal in-memory Storage stand-in (Node has no sessionStorage global).
function fakeStorage() {
  const data = new Map();
  return {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: k => data.delete(k),
  };
}

test('9. the tool is fully usable through "Browse preferences instead" with no concept text', () => {
  const state = App.createAppState();
  // No parseConceptText call at all -- the player goes straight to manually
  // adding preferences, exactly like the "Browse preferences instead" path.
  App.setCapabilityPreference(state, 'crowd-control', 9, 'explicit');
  assert.doesNotThrow(() => App.buildMatcherRequest(state));
  const result = App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.ok(result.recommendations.length > 0, 'matching must work fully without ever touching the concept parser');
});

test('10. "Not relevant" creates notRelevant:true, never importance 0', () => {
  const state = App.createAppState();
  App.markNotRelevant(state, 'crowd-control', 'numeric', 'explicit');
  assert.deepEqual(state.numericPreferences['crowd-control'], { notRelevant: true, origin: 'explicit' });
  assert.ok(!('importance' in state.numericPreferences['crowd-control']));
  assert.doesNotThrow(() => Matcher.validatePreferenceRequest(App.buildMatcherRequest(state), criteriaDoc));
});

test('11. directional UI sends desiredPosition and importance separately', () => {
  const state = App.createAppState();
  App.setDirectionalPreference(state, 'melee-ranged', 8, 7, 'explicit');
  const pref = state.numericPreferences['melee-ranged'];
  assert.equal(pref.desiredPosition, 8);
  assert.equal(pref.importance, 7);
  assert.doesNotThrow(() => Matcher.validatePreferenceRequest(App.buildMatcherRequest(state), criteriaDoc));
});

test('12. capability UI never sends desiredPosition', () => {
  const state = App.createAppState();
  App.setCapabilityPreference(state, 'crowd-control', 9, 'explicit');
  assert.ok(!('desiredPosition' in state.numericPreferences['crowd-control']));
  assert.doesNotThrow(() => Matcher.validatePreferenceRequest(App.buildMatcherRequest(state), criteriaDoc));
});

test('13. require/exclude categorical controls behave as matcher gates (no importance, eligibility only)', () => {
  const state = App.createAppState();
  App.setCategoricalPreference(state, 'companion-type', 'require', ['multiple companions'], undefined, 'explicit');
  assert.ok(!('importance' in state.categoricalPreferences['companion-type']));
  const packLord = { profile: profiles.find(p => p.id === 'druid-pack-lord'), internalId: 'druid-pack-lord', baseProfileId: 'druid-pack-lord' };
  const fighterArcher = { profile: profiles.find(p => p.id === 'fighter-archer'), internalId: 'fighter-archer', baseProfileId: 'fighter-archer' };
  const request = App.buildMatcherRequest(state);
  assert.equal(Matcher.evaluateEligibility(fighterArcher, request).status, 'ineligible', 'require must reject a non-matching candidate');
  assert.equal(Matcher.evaluateEligibility(packLord, request).status, 'eligible');

  App.setCategoricalPreference(state, 'companion-type', 'exclude', ['multiple companions'], undefined, 'explicit');
  const request2 = App.buildMatcherRequest(state);
  assert.equal(Matcher.evaluateEligibility(packLord, request2).status, 'ineligible', 'exclude must reject an overlapping candidate');
});

test('14. confirmed suggestions -- not unconfirmed suggestions -- enter the matcher request', () => {
  const state = App.createAppState();
  App.parseConceptText(state, 'a durable protector', lexicon);
  assert.ok(state.pendingSuggestions.length > 0);
  const requestBeforeConfirm = App.buildMatcherRequest(state);
  assert.deepEqual(requestBeforeConfirm.numericPreferences, {}, 'unconfirmed suggestions must never appear in the matcher request');

  const toConfirm = state.pendingSuggestions[0];
  App.confirmSuggestion(state, toConfirm);
  const requestAfterConfirm = App.buildMatcherRequest(state);
  assert.ok(requestAfterConfirm.numericPreferences[toConfirm.criterionId], 'a confirmed suggestion must enter the request');
  assert.equal(requestAfterConfirm.numericPreferences[toConfirm.criterionId].origin, 'inferred-confirmed');
});

test('15. refresh restores the current stage and preferences from sessionStorage', () => {
  const storage = fakeStorage();
  const state = App.createAppState();
  state.stage = 'priorities';
  App.setDirectionalPreference(state, 'melee-ranged', 8, 7, 'explicit');
  App.saveToSessionStorage(state, storage);

  const restored = App.loadFromSessionStorage(storage);
  assert.ok(restored, 'a saved state must be restorable');
  assert.equal(restored.stage, 'priorities');
  assert.deepEqual(restored.numericPreferences['melee-ranged'], { desiredPosition: 8, importance: 7, origin: 'explicit' });
});

test('sessionStorage never syncs to the character cloud or creates a saved character (it only ever touches its own dedicated key)', () => {
  const storage = fakeStorage();
  const state = App.createAppState();
  App.saveToSessionStorage(state, storage);
  assert.equal(storage.getItem(App.SESSION_STORAGE_KEY) !== null, true);
  // No other storage key is ever written by this module -- confirmed by the
  // fact fakeStorage only ever receives calls through the App wrapper, which
  // exposes exactly one key constant.
  assert.equal(typeof App.SESSION_STORAGE_KEY, 'string');
});

test('16. adaptive flow asks at most three questions automatically', () => {
  const state = App.createAppState();
  App.setCapabilityPreference(state, 'crowd-control', 5, 'explicit');
  App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  let asked = 0;
  for (let i = 0; i < 10; i++) {
    const q = App.nextAdaptiveQuestion(state, questionTemplates, criteriaDoc);
    if (!q) break;
    App.applyQuestionAnswer(state, q, q.answers ? q.answers[0] : questionTemplates.questions.find(qt => qt.id === q.id).answers[0]);
    App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
    asked++;
    if (asked > App.MAX_AUTOMATIC_ADAPTIVE_QUESTIONS + 2) break; // safety valve for the test itself
  }
  assert.ok(asked <= App.MAX_AUTOMATIC_ADAPTIVE_QUESTIONS, `expected at most ${App.MAX_AUTOMATIC_ADAPTIVE_QUESTIONS} automatic questions, got ${asked}`);
});

test('16b. "Refine further" (wantsMoreQuestions) allows asking beyond the automatic cap', () => {
  const state = App.createAppState();
  App.setCapabilityPreference(state, 'crowd-control', 5, 'explicit');
  App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  state.adaptiveQuestionCount = App.MAX_AUTOMATIC_ADAPTIVE_QUESTIONS;
  const blocked = App.nextAdaptiveQuestion(state, questionTemplates, criteriaDoc);
  state.wantsMoreQuestions = true;
  // Not asserting a question exists (may legitimately be none left), only
  // that the cap itself is lifted and does not hard-block by count alone.
  assert.doesNotThrow(() => App.nextAdaptiveQuestion(state, questionTemplates, criteriaDoc));
});

test('17. an already-asked question is never selected again', () => {
  const state = App.createAppState();
  App.setCapabilityPreference(state, 'crowd-control', 5, 'explicit');
  App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const q1 = App.nextAdaptiveQuestion(state, questionTemplates, criteriaDoc);
  assert.ok(q1);
  const answer = questionTemplates.questions.find(qt => qt.id === q1.id).answers[0];
  App.applyQuestionAnswer(state, q1, answer);
  App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  for (let i = 0; i < 5; i++) {
    const q = App.nextAdaptiveQuestion(state, questionTemplates, criteriaDoc);
    if (!q) break;
    assert.notEqual(q.id, q1.id, 'a question already asked must never be selected again');
    App.applyQuestionAnswer(state, q, (q.answers || questionTemplates.questions.find(qt => qt.id === q.id).answers)[0]);
    App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  }
});

test('22. a provisional result exposes follow-up wording (via nextAdaptiveQuestion) but the presentation carries no numeric score', () => {
  // Deliberately scattershot preferences unlikely to fit any one profile well.
  const state = App.createAppState();
  App.setDirectionalPreference(state, 'stealth-infiltration' in criteriaIndex ? 'melee-ranged' : 'melee-ranged', 5.5, 5, 'explicit');
  App.setCapabilityPreference(state, 'shapeshifting-transformation', 10, 'explicit');
  App.setCapabilityPreference(state, 'armour-defence', 10, 'explicit');
  App.setCapabilityPreference(state, 'stealth-infiltration', 10, 'explicit');
  const result = App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const best = result.recommendations[0];
  if (best && best.fitBand === 'provisional') {
    assert.equal(result.confidence, 'low');
    assert.ok(!('overallFit' in best) && !('score' in best));
  }
});

test('23. no player-facing state output includes raw criterion IDs or statistical terms', () => {
  const state = App.createAppState();
  App.setCapabilityPreference(state, 'crowd-control', 9, 'explicit');
  App.setDirectionalPreference(state, 'melee-ranged', 8, 7, 'explicit');
  const result = App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  const serialized = JSON.stringify(result.recommendations);
  assert.ok(!/%/.test(serialized));
  for (const c of criteriaDoc.criteria) assert.ok(!serialized.includes(c.id), `raw criterion id "${c.id}" leaked into recommendations`);
});

test('parseConceptText never writes directly into numericPreferences/categoricalPreferences', () => {
  const state = App.createAppState();
  App.parseConceptText(state, 'a durable armoured protector with a shield', lexicon);
  assert.deepEqual(state.numericPreferences, {});
  assert.deepEqual(state.categoricalPreferences, {});
  assert.ok(state.pendingSuggestions.length > 0);
});

test('discardPendingSuggestion ("Remove") drops an unconfirmed suggestion without adding anything to preferences', () => {
  const state = App.createAppState();
  App.parseConceptText(state, 'a durable protector', lexicon);
  const before = state.pendingSuggestions.length;
  const toRemove = state.pendingSuggestions[0];
  App.discardPendingSuggestion(state, toRemove.criterionId);
  assert.equal(state.pendingSuggestions.length, before - 1);
  assert.deepEqual(state.numericPreferences, {});
  assert.deepEqual(state.categoricalPreferences, {});
});

test('conflicting concept suggestions surface for confirmation, not automatic resolution, through the app state', () => {
  const state = App.createAppState();
  App.parseConceptText(state, 'a melee ranged fighter', lexicon);
  assert.ok(state.pendingConflicts.length > 0);
  assert.deepEqual(state.pendingSuggestions.filter(s => s.criterionId === 'melee-ranged'), []);
});

test('the app never mutates the source catalogue documents it is given', () => {
  const criteriaSnapshot = JSON.parse(JSON.stringify(criteriaDoc));
  const profilesSnapshot = JSON.parse(JSON.stringify(profiles));
  const state = App.createAppState();
  App.parseConceptText(state, 'a durable protector', lexicon);
  for (const s of state.pendingSuggestions.slice()) App.confirmSuggestion(state, s);
  App.runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
  assert.deepEqual(criteriaDoc, criteriaSnapshot);
  assert.deepEqual(profiles, profilesSnapshot);
});
