// Run with: node --test tests/find-your-class-v2-narrative.test.js
// Coverage for the "Classfinder" narrative Question-mode engine
// (assets/find-your-class/v2/narrative.js) and its content
// (narrative-questions.json), plus its integration with app.js's existing
// preference/matching pipeline. No DOM/mount() coverage here, matching the
// established convention for this sub-project's app.js tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'assets', 'find-your-class', 'v2');
const V2 = require(path.join(dir, 'loader.js'));
const Matcher = require(path.join(dir, 'matcher.js'));
const App = require(path.join(dir, 'app.js'));
const Narrative = require(path.join(dir, 'narrative.js'));

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }
const criteriaDoc = readJson('criteria.json');
const model = readJson('classification-model.json');
const criteriaIndex = V2.indexCriteria(criteriaDoc);
const doc = readJson('narrative-questions.json');

const CAPABILITY_IDS = new Set(criteriaDoc.criteria.map(c => c.id));
const PRACTICAL_IDS = new Set(model.practicalRatings.map(p => p.id));
const FACT_IDS = new Set(model.booleanFacts);
const IDENTITY_CATEGORIES = model.identityCategories;

const classProfiles = ['class-profiles-batch-01.json', 'class-profiles-batch-02.json', 'class-profiles-batch-03.json', 'class-profiles-batch-04.json', 'class-profiles-batch-05.json', 'class-profiles-batch-06.json']
  .flatMap(f => readJson(f).profiles);
const profiles = V2.resolveAllProfiles(classProfiles, []);

test('narrative-questions.json is structurally valid (every question has 2+ options, a notRelevant opt-out, and every "next" resolves)', () => {
  const errors = Narrative.validateNarrativeDoc(doc);
  assert.deepEqual(errors, []);
});

test('every question offers exactly one notRelevant option, and its wording is distinct per question (not one reused generic "skip" line)', () => {
  const skipLines = new Set();
  for (const [id, q] of Object.entries(doc.questions)) {
    const skips = q.options.filter(o => o.notRelevant);
    assert.equal(skips.length, 1, `${id} should offer exactly one not-relevant opt-out`);
    skipLines.add(skips[0].storyLine);
  }
  assert.equal(skipLines.size, Object.keys(doc.questions).length, 'every question’s opt-out story line must be unique, not a copy-pasted generic line');
});

test('every mutation in narrative-questions.json references a real capability/practical/fact/identity id and a valid value', () => {
  const bad = [];
  for (const [qid, q] of Object.entries(doc.questions)) {
    for (const opt of q.options) {
      const m = opt.mutations;
      for (const c of (m.capability || [])) {
        if (!CAPABILITY_IDS.has(c.id)) bad.push(`${qid}/${opt.id}: unknown capability ${c.id}`);
        if (!['absent', 'available', 'core'].includes(c.desiredLevel)) bad.push(`${qid}/${opt.id}: invalid capability level ${c.desiredLevel}`);
      }
      for (const p of (m.practical || [])) {
        if (!PRACTICAL_IDS.has(p.id)) bad.push(`${qid}/${opt.id}: unknown practical ${p.id}`);
        if (!['low', 'medium', 'high'].includes(p.desiredLevel)) bad.push(`${qid}/${opt.id}: invalid practical level ${p.desiredLevel}`);
      }
      for (const f of (m.fact || [])) {
        if (!FACT_IDS.has(f.id)) bad.push(`${qid}/${opt.id}: unknown fact ${f.id}`);
      }
      for (const idn of (m.identity || [])) {
        if (!IDENTITY_CATEGORIES[idn.category]) bad.push(`${qid}/${opt.id}: unknown identity category ${idn.category}`);
        else for (const v of idn.values) if (!IDENTITY_CATEGORIES[idn.category].includes(v)) bad.push(`${qid}/${opt.id}: invalid identity value ${idn.category}=${v}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test('a notRelevant option carries no mutations at all', () => {
  for (const [qid, q] of Object.entries(doc.questions)) {
    const skip = q.options.find(o => o.notRelevant);
    const m = skip.mutations;
    assert.equal((m.capability || []).length, 0, qid);
    assert.equal((m.practical || []).length, 0, qid);
    assert.equal((m.fact || []).length, 0, qid);
    assert.equal((m.identity || []).length, 0, qid);
  }
});

test('answerQuestion applies a capability mutation onto an empty preferences bag without mutating the input', () => {
  const empty = Narrative.emptyPreferences();
  const snapshot = JSON.parse(JSON.stringify(empty));
  const result = Narrative.answerQuestion(doc, 'q-opening', 'frontline', empty);
  assert.deepEqual(empty, snapshot, 'must never mutate the input preferences object');
  assert.equal(result.preferences.capabilityPreferences['personal-durability'].desiredLevel, 'core');
  assert.equal(result.nextQuestionId, 'q-frontline');
  assert.ok(result.storyLine.length > 0);
});

test('a leaf question’s option (next:null) signals the end of the flow', () => {
  const result = Narrative.answerQuestion(doc, 'q-power-source', 'arcane', Narrative.emptyPreferences());
  assert.equal(result.nextQuestionId, null);
});

test('replayNarrative rebuilds the same preferences as stepping through answerQuestion one at a time', () => {
  const history = [{ questionId: 'q-opening', optionId: 'caster' }, { questionId: 'q-caster', optionId: 'healing' }];
  let stepwise = Narrative.emptyPreferences();
  for (const h of history) stepwise = Narrative.answerQuestion(doc, h.questionId, h.optionId, stepwise).preferences;
  const replayed = Narrative.replayNarrative(doc, history);
  assert.deepEqual(replayed, stepwise);
});

test('a later mutation on the same criterion overrides an earlier one from a prior answer', () => {
  // q-opening/frontline sets personal-durability core@8; q-frontline/endurance
  // reinforces it to core@9 -- the more specific, later answer should win.
  const history = [{ questionId: 'q-opening', optionId: 'frontline' }, { questionId: 'q-frontline', optionId: 'endurance' }];
  const preferences = Narrative.replayNarrative(doc, history);
  assert.equal(preferences.capabilityPreferences['personal-durability'].importance, 9);
});

test('end-to-end: walking the frontline/endurance/simple/companion path and running it through App.runMatching produces recommendations', () => {
  const state = App.createSearch();
  const history = [
    { questionId: 'q-opening', optionId: 'frontline' },
    { questionId: 'q-frontline', optionId: 'endurance' },
    { questionId: 'q-complexity', optionId: 'simple' },
    { questionId: 'q-power-source', optionId: 'companion' },
  ];
  const preferences = Narrative.replayNarrative(doc, history);
  state.capabilityPreferences = preferences.capabilityPreferences;
  state.practicalPreferences = preferences.practicalPreferences;
  state.factPreferences = preferences.factPreferences;
  state.identityPreferences = preferences.identityPreferences;
  assert.ok(App.totalActivePreferenceCount(state) > 0);
  const result = App.runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
  assert.ok(result.recommendations.length > 0);
});

test('choosing the notRelevant option at every step produces zero active preferences (an entirely skippable flow)', () => {
  const history = [
    { questionId: 'q-opening', optionId: 'skip' },
    { questionId: 'q-undecided', optionId: 'skip' },
    { questionId: 'q-complexity', optionId: 'skip' },
    { questionId: 'q-power-source', optionId: 'skip' },
  ];
  const preferences = Narrative.replayNarrative(doc, history);
  assert.deepEqual(preferences.capabilityPreferences, {});
  assert.deepEqual(preferences.practicalPreferences, {});
  assert.deepEqual(preferences.factPreferences, {});
  assert.deepEqual(preferences.identityPreferences, {});
});

test('App.createSearch starts with an empty narrative history and no current question', () => {
  const state = App.createSearch();
  assert.deepEqual(state.narrativeHistory, []);
  assert.equal(state.narrativeQuestionId, null);
});
