// Find Your Class v2 -- "Classfinder" narrative Question mode engine.
//
// A small, deterministic, DOM-free engine over a branching question graph
// (assets/find-your-class/v2/narrative-questions.json). Deliberately NOT an
// open free-text parser: this repo has no LLM/AI call available client-side,
// and the existing v1 concept-parser.js (a keyword/phrase matcher) is the
// technical ceiling for "understanding" open text here -- not reliable
// enough to steer branching dialogue logically. So the player only ever
// picks from a small set of narrated options per question; every question
// always offers a "this isn't important to me" option (flagged
// notRelevant:true in the data), which contributes no preference mutation
// at all but still advances the story.
//
// Each selected option carries a small preference-mutation patch in EXACTLY
// the shape matcher.js's scoreCandidate/evaluateEligibility already expect
// (capabilityPreferences[id] = {desiredLevel, importance},
// practicalPreferences[id] = {desiredLevel, importance},
// factPreferences[id] = {desired, importance},
// identityPreferences[category] = {mode, values, importance}) -- so the
// narrative flow feeds the SAME matching pipeline the manual-profile mode
// already uses, just built up conversationally instead of criterion by
// criterion.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PFFindYourClassNarrativeV2 = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function emptyPreferences() {
    return { capabilityPreferences: {}, practicalPreferences: {}, factPreferences: {}, identityPreferences: {} };
  }

  function clone(obj) { return Object.assign({}, obj); }

  // Validates the narrative question graph's shape: every question has a
  // prompt and at least 2 options, every option has the fields the engine
  // and renderer both need, every question has at least one
  // notRelevant:true option (the standing "always offer an opt-out" rule),
  // and every non-null `next` points at a real question id.
  function validateNarrativeDoc(doc) {
    const errors = [];
    if (!doc || typeof doc !== 'object') return ['document must be an object'];
    if (!doc.questions || typeof doc.questions !== 'object') errors.push('missing questions object');
    if (!doc.start || !doc.questions || !doc.questions[doc.start]) errors.push(`start "${doc.start}" is not a real question id`);
    for (const [id, q] of Object.entries(doc.questions || {})) {
      if (typeof q.prompt !== 'string' || !q.prompt.trim()) errors.push(`${id}: missing prompt`);
      if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${id}: needs at least 2 options`);
      let hasNotRelevant = false;
      for (const opt of q.options || []) {
        if (!opt.id || typeof opt.id !== 'string') errors.push(`${id}: option missing id`);
        if (typeof opt.label !== 'string' || !opt.label.trim()) errors.push(`${id}/${opt.id}: missing label`);
        if (typeof opt.storyLine !== 'string' || !opt.storyLine.trim()) errors.push(`${id}/${opt.id}: missing storyLine`);
        if (!opt.mutations || typeof opt.mutations !== 'object') errors.push(`${id}/${opt.id}: missing mutations object`);
        if (opt.next !== null && !(doc.questions || {})[opt.next]) errors.push(`${id}/${opt.id}: next "${opt.next}" is not a real question id`);
        if (opt.notRelevant) hasNotRelevant = true;
      }
      if (!hasNotRelevant) errors.push(`${id}: must offer at least one notRelevant:true option`);
    }
    return errors;
  }

  function getQuestion(doc, id) { return doc.questions[id]; }
  function getOption(question, optionId) { return (question.options || []).find(o => o.id === optionId); }

  // Applies one option's mutation patch on top of an existing preferences
  // object, returning a NEW object (never mutates the input) -- same
  // never-mutate-the-source discipline as loader.js's resolveEffectiveProfile.
  function applyMutations(preferences, mutations) {
    const next = {
      capabilityPreferences: clone(preferences.capabilityPreferences),
      practicalPreferences: clone(preferences.practicalPreferences),
      factPreferences: clone(preferences.factPreferences),
      identityPreferences: clone(preferences.identityPreferences),
    };
    for (const m of (mutations.capability || [])) next.capabilityPreferences[m.id] = { desiredLevel: m.desiredLevel, importance: m.importance };
    for (const m of (mutations.practical || [])) next.practicalPreferences[m.id] = { desiredLevel: m.desiredLevel, importance: m.importance };
    for (const m of (mutations.fact || [])) next.factPreferences[m.id] = { desired: m.desired, importance: m.importance };
    for (const m of (mutations.identity || [])) next.identityPreferences[m.category] = { mode: m.mode, values: m.values.slice(), importance: m.importance };
    return next;
  }

  // Given the doc, the current question id and a chosen option id, returns
  // { preferences, nextQuestionId, storyLine } -- nextQuestionId is null
  // when the flow has reached its end (time to show results).
  function answerQuestion(doc, questionId, optionId, preferences) {
    const question = getQuestion(doc, questionId);
    if (!question) throw new Error(`Unknown question "${questionId}"`);
    const option = getOption(question, optionId);
    if (!option) throw new Error(`Unknown option "${optionId}" for question "${questionId}"`);
    return {
      preferences: applyMutations(preferences, option.mutations),
      nextQuestionId: option.next,
      storyLine: option.storyLine,
    };
  }

  // Rebuilds the preferences that result from an ordered list of
  // {questionId, optionId} history entries, replayed from empty -- used to
  // recompute state after the player steps back and re-answers a question,
  // without needing to store a preferences snapshot per history entry.
  function replayNarrative(doc, history) {
    let preferences = emptyPreferences();
    for (const h of history) {
      preferences = answerQuestion(doc, h.questionId, h.optionId, preferences).preferences;
    }
    return preferences;
  }

  return {
    emptyPreferences, applyMutations, validateNarrativeDoc,
    getQuestion, getOption, answerQuestion, replayNarrative,
  };
}));
