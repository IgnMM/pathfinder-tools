// Find Your Class -- state controller for the standalone page (find-your-class/).
// Implements Find_Your_Class_UI_and_Onboarding_Handoff_v1.md's "State and
// transformations" section. Deliberately split into two halves in one file:
// pure, DOM-free state functions (exported, independently testable, listed
// first) and DOM rendering (mount(), used only by find-your-class/index.html,
// not exercised by the Node test suite -- this repo's established convention
// for UI code, see e.g. hub.html's own inline scripts).
// Same Node/browser dual-export pattern as loader.js/matcher.js/concept-parser.js.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./loader.js'), require('./matcher.js'), require('./concept-parser.js'));
  } else {
    root.PFFindYourClassApp = factory(root.PFFindYourClass, root.PFFindYourClassMatcher, root.PFFindYourClassConceptParser);
  }
}(typeof self !== 'undefined' ? self : this, function (FYC, Matcher, ConceptParser) {
  'use strict';

  const SESSION_STORAGE_KEY = 'pf_find_your_class_v1';
  const MAX_AUTOMATIC_ADAPTIVE_QUESTIONS = 3;

  // ---------------------------------------------------------------------
  // Pure state functions
  // ---------------------------------------------------------------------

  function createAppState() {
    return {
      schemaVersion: 1,
      stage: 'idea', // idea | priorities | clarify | results
      conceptText: '',
      pendingSuggestions: [], // inferred-unconfirmed, not yet in preferences
      pendingConflicts: [], // [{criterionId, options:[...]}]
      numericPreferences: {},
      categoricalPreferences: {},
      conductPreferences: null,
      campaignContext: null,
      gateAnswers: {},
      askedQuestionIds: [],
      adaptiveQuestionCount: 0,
      wantsMoreQuestions: false,
      lastResult: null,
    };
  }

  // Stage 1 -> Stage 2 bridge: parse concept text into pending suggestions.
  // Nothing here touches numericPreferences/categoricalPreferences -- the
  // player must confirm on Stage 2 first (required test 14).
  function parseConceptText(state, text, lexicon) {
    state.conceptText = text || '';
    const normalised = ConceptParser.normaliseConceptText(state.conceptText);
    if (!normalised) {
      state.pendingSuggestions = [];
      state.pendingConflicts = [];
      return state;
    }
    const raw = ConceptParser.findConceptSuggestions(normalised, lexicon);
    const merged = ConceptParser.mergeConceptSuggestions(raw);
    const { clean, conflicts } = ConceptParser.detectSuggestionConflicts(merged);
    state.pendingSuggestions = clean;
    state.pendingConflicts = conflicts;
    return state;
  }

  function importanceFromHint(hint) {
    return ConceptParser.importanceFromHint(hint);
  }

  function preferenceBucket(state, kind) {
    return kind === 'categorical' ? state.categoricalPreferences : state.numericPreferences;
  }

  // Confirms a pending (or conflict-option) suggestion into real preference
  // state. origin becomes "inferred-confirmed" -- distinct from a manually
  // added preference ("explicit") or an adaptive-question answer
  // ("adaptive-answer"), per the matcher's preserved-origin contract.
  function confirmSuggestion(state, suggestion) {
    const bucket = preferenceBucket(state, suggestion.kind === 'categorical' ? 'categorical' : 'numeric');
    if (suggestion.kind === 'categorical') {
      bucket[suggestion.criterionId] = {
        mode: suggestion.mode, values: suggestion.values.slice(),
        importance: suggestion.mode === 'prefer' ? importanceFromHint(suggestion.importanceHint) : undefined,
        origin: 'inferred-confirmed',
      };
    } else if (suggestion.kind === 'directional') {
      bucket[suggestion.criterionId] = { desiredPosition: suggestion.desiredPosition, importance: importanceFromHint(suggestion.importanceHint), origin: 'inferred-confirmed' };
    } else {
      bucket[suggestion.criterionId] = { importance: importanceFromHint(suggestion.importanceHint), origin: 'inferred-confirmed' };
    }
    state.pendingSuggestions = state.pendingSuggestions.filter(s => s !== suggestion);
    state.pendingConflicts = state.pendingConflicts.filter(c => c.criterionId !== suggestion.criterionId);
    return state;
  }

  // "Remove" -- for an unconfirmed suggestion (or an unresolved conflict)
  // only: discards it as if never suggested. Does not touch preference state.
  function discardPendingSuggestion(state, criterionId) {
    state.pendingSuggestions = state.pendingSuggestions.filter(s => s.criterionId !== criterionId);
    state.pendingConflicts = state.pendingConflicts.filter(c => c.criterionId !== criterionId);
    return state;
  }

  // "Not relevant" -- distinct from Remove: explicitly marks the criterion as
  // excluded from scoring (matcher contract: notRelevant:true, no importance/
  // desiredPosition/mode/values alongside it). Works on ANY criterion kind and
  // at any stage, not only unconfirmed suggestions (required test 10).
  function markNotRelevant(state, criterionId, kind, origin) {
    const bucket = preferenceBucket(state, kind); // kind: 'numeric' | 'categorical' -- caller knows the criterion's own kind

    bucket[criterionId] = { notRelevant: true, origin: origin || 'explicit' };
    state.pendingSuggestions = state.pendingSuggestions.filter(s => s.criterionId !== criterionId);
    state.pendingConflicts = state.pendingConflicts.filter(c => c.criterionId !== criterionId);
    return state;
  }

  function removePreference(state, criterionId, kind) {
    delete preferenceBucket(state, kind)[criterionId];
    return state;
  }

  // Directional: desiredPosition + importance, set together but as separate
  // fields (required tests 11/12 -- directional sends both, capability never
  // sends desiredPosition at all).
  function setDirectionalPreference(state, criterionId, desiredPosition, importance, origin) {
    state.numericPreferences[criterionId] = { desiredPosition, importance, origin: origin || 'explicit' };
    return state;
  }
  function setCapabilityPreference(state, criterionId, importance, origin) {
    state.numericPreferences[criterionId] = { importance, origin: origin || 'explicit' };
    return state;
  }
  // Categorical: prefer/require/exclude. Only "prefer" carries importance
  // (require/exclude are eligibility gates in the matcher, never scored) --
  // required test 13.
  function setCategoricalPreference(state, criterionId, mode, values, importance, origin) {
    const entry = { mode, values: values.slice(), origin: origin || 'explicit' };
    if (mode === 'prefer') entry.importance = importance;
    state.categoricalPreferences[criterionId] = entry;
    return state;
  }

  function setConductPreferences(state, stance, importance, acceptedCodePresence, acceptedMechanicalLossRisk) {
    state.conductPreferences = { stance, importance, acceptedCodePresence: acceptedCodePresence.slice(), acceptedMechanicalLossRisk: acceptedMechanicalLossRisk.slice() };
    return state;
  }

  function setGateAnswer(state, gateId, status) {
    state.gateAnswers[gateId] = { status };
    return state;
  }

  // Applies one question-templates.json answer's `mutations` (or a synthetic
  // gate question's `gateAnswer`) with origin "adaptive-answer". Mirrors
  // question-templates.json's own mutation shape exactly (criterionId +
  // desiredPosition|importanceHint|notRelevant, or campaignContext).
  function applyQuestionAnswer(state, question, answer) {
    if (answer.gateAnswer) {
      setGateAnswer(state, answer.gateAnswer.id, answer.gateAnswer.status);
    }
    for (const mutation of answer.mutations || []) {
      if (mutation.campaignContext) { state.campaignContext = Object.assign({}, state.campaignContext, mutation.campaignContext); continue; }
      if (!mutation.criterionId) continue;
      if (mutation.notRelevant) {
        // question-templates.json only ever targets numeric (capability/
        // directional) criteria with notRelevant mutations today.
        markNotRelevant(state, mutation.criterionId, 'numeric', 'adaptive-answer');
        continue;
      }
      if (mutation.desiredPosition !== undefined) {
        setDirectionalPreference(state, mutation.criterionId, mutation.desiredPosition, importanceFromHint(mutation.importanceHint || 'medium'), 'adaptive-answer');
      } else if (mutation.importanceHint !== undefined) {
        setCapabilityPreference(state, mutation.criterionId, importanceFromHint(mutation.importanceHint), 'adaptive-answer');
      }
    }
    if (!question.synthetic) {
      if (state.askedQuestionIds.indexOf(question.id) === -1) state.askedQuestionIds.push(question.id);
      state.adaptiveQuestionCount++;
    }
    return state;
  }

  function totalActivePreferenceCount(state) {
    const numericActive = Object.values(state.numericPreferences).filter(p => !p.notRelevant).length;
    const categoricalActive = Object.values(state.categoricalPreferences).filter(p => p.mode === 'prefer').length;
    return numericActive + categoricalActive;
  }

  // Builds the exact request object matchProfiles()/selectNextQuestion()
  // expect -- confirmed preferences only, never pendingSuggestions (required
  // test 14).
  function buildMatcherRequest(state, options) {
    return {
      schemaVersion: 1,
      numericPreferences: state.numericPreferences,
      categoricalPreferences: state.categoricalPreferences,
      conductPreferences: state.conductPreferences || undefined,
      gateAnswers: state.gateAnswers,
      campaignContext: state.campaignContext || undefined,
      options: Object.assign({ maxResults: 4, includeNeedsConfirmation: true }, options || {}),
    };
  }

  function runMatching(state, profiles, criteriaDoc, questionTemplates, explanationCatalogue) {
    const request = buildMatcherRequest(state);
    const result = Matcher.matchProfiles(request, profiles, criteriaDoc, questionTemplates, explanationCatalogue);
    state.lastResult = result;
    return result;
  }

  // Adaptive-question gating: at most MAX_AUTOMATIC_ADAPTIVE_QUESTIONS unless
  // the player explicitly asked to "Refine further" (wantsMoreQuestions).
  // Never re-asks a question already recorded in askedQuestionIds (required
  // test 16/17's counterpart -- "never ask a criterion already explicit or
  // marked not relevant" is selectNextQuestion's own job, already covered by
  // the matcher's own test suite).
  function nextAdaptiveQuestion(state, questionTemplates, criteriaDoc) {
    if (!state.lastResult) return null;
    if (state.adaptiveQuestionCount >= MAX_AUTOMATIC_ADAPTIVE_QUESTIONS && !state.wantsMoreQuestions) return null;
    const request = buildMatcherRequest(state);
    const ranked = (state.lastResult._internal && state.lastResult._internal.ranked) || [];
    const q = Matcher.selectNextQuestion(request, ranked, questionTemplates, criteriaDoc);
    if (!q) return null;
    if (!q.synthetic && state.askedQuestionIds.indexOf(q.id) !== -1) return null;
    return q;
  }

  function serializeState(state) {
    return JSON.stringify(state);
  }
  function deserializeState(json) {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json);
      if (!parsed || parsed.schemaVersion !== 1) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function saveToSessionStorage(state, storage) {
    const s = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!s) return;
    try { s.setItem(SESSION_STORAGE_KEY, serializeState(state)); } catch (e) { /* storage unavailable/full: state simply won't persist */ }
  }
  function loadFromSessionStorage(storage) {
    const s = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!s) return null;
    try { return deserializeState(s.getItem(SESSION_STORAGE_KEY)); } catch (e) { return null; }
  }
  function clearSessionStorage(storage) {
    const s = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!s) return;
    try { s.removeItem(SESSION_STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function hasMeaningfulState(state) {
    return !!(state.conceptText || totalActivePreferenceCount(state) > 0 || state.pendingSuggestions.length > 0);
  }

  function resetState() {
    return createAppState();
  }

  // ---------------------------------------------------------------------
  // Preference browser grouping (Stage 2 "Add another preference"). Every one
  // of the 64 criteria is assigned to exactly one of the 8 player-language
  // groups from the handoff; PREFERENCE_GROUPS is generated once below and
  // exported for the test suite to assert full coverage against the live
  // criteria.json rather than trusting this table blindly.
  // ---------------------------------------------------------------------
  const PREFERENCE_GROUP_NAMES = [
    'Combat style',
    'Magic and supernatural power',
    'Defence and support',
    'Skills and exploration',
    'Companions and creatures',
    'Complexity and resource management',
    'Character identity and obligations',
    'Equipment and specialisation',
  ];
  const PREFERENCE_GROUP_ASSIGNMENTS = {
    'Combat style': ['melee-ranged', 'martial-magic', 'routine-tactical', 'subtle-overt', 'safe-risky', 'steady-burst', 'single-target-damage', 'area-damage', 'crowd-control', 'soft-disruption', 'combat-manoeuvres', 'first-round-impact', 'melee-weapon-effectiveness', 'ranged-weapon-effectiveness', 'natural-weapon-combat', 'mounted-combat'],
    'Magic and supernatural power': ['offensive-spellcasting', 'defensive-magic', 'magical-utility', 'dispelling-countermagic', 'shapeshifting-transformation', 'casting-level', 'casting-method', 'magic-identity', 'spell-access-breadth'],
    'Defence and support': ['personal-durability', 'protect-allies', 'damage-prevention', 'ally-buffing', 'healing-recovery', 'condition-removal', 'armour-defence', 'shield-combat', 'armour-preference'],
    'Skills and exploration': ['stealth-infiltration', 'traps-locks', 'social-influence', 'intimidation', 'knowledge-investigation', 'wilderness', 'skill-breadth', 'social-style'],
    'Companions and creatures': ['companion-centrality', 'summoning-minions', 'companion-type', 'extra-entity-burden'],
    'Complexity and resource management': ['build-complexity', 'turn-complexity', 'resource-tracking', 'rules-mastery', 'build-fragility', 'resource-endurance', 'no-heavy-preparation'],
    'Character identity and obligations': ['code-bound-identity', 'conduct-consequence-tolerance', 'institutional-duty', 'independent-teamwork', 'party-contribution'],
    'Equipment and specialisation': ['equipment-independence', 'enemy-type-independence', 'ability-score-demand', 'specialist-versatile', 'primary-delivery', 'mobility'],
  };

  // ---------------------------------------------------------------------
  // Rendering (DOM only; not exercised by the Node test suite). One page,
  // replaceable views -- re-renders #app's innerHTML on every state change,
  // same pattern as this site's other single-page tools (e.g. sorcerer/
  // index.html's own render()).
  // ---------------------------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function criterionLabel(criteriaIndex, criterionId) {
    const c = criteriaIndex.get(criterionId);
    return (c && (c.playerLabel || c.shortLabel)) || criterionId;
  }

  // ---------------------------------------------------------------------
  // Recommendation-card view model -- pure (no DOM), so it can be unit-tested
  // directly (required tests 18-21) without a browser/jsdom, which this
  // repo's Node test suite does not depend on.
  // ---------------------------------------------------------------------
  const ROLE_LABELS = {
    'best-overall': 'Best overall',
    'different-approach': 'Different approach',
    'more-approachable': 'More approachable',
    'unexpected-fit': 'Unexpected fit',
  };
  function roleLabelFor(role) { return ROLE_LABELS[role] || role; }

  // 19. Class-path vs archetype labelling: a class-path never claims a parent
  // class (it IS the class), an archetype is always labelled with its real
  // parent class' name (18. parent-class naming), never the archetype's own name.
  function typeTextFor(rec) {
    return rec.entityType === 'class-path' ? 'Class path' : `Archetype · ${rec.parentLabel}`;
  }

  function humaniseBranch(branchId) {
    return String(branchId).replace(/^nature-bond-/, 'Nature Bond: ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  function findProfileSourceRef(profiles, id) {
    const baseId = id.split('::')[0];
    const p = profiles.find(x => x.id === baseId);
    return (p && p.sourceRefs && p.sourceRefs[0]) || null;
  }
  function findExploreHref(profiles, rec) {
    const baseId = rec.id.split('::')[0];
    const p = profiles.find(x => x.id === baseId);
    if (p && p.classId) return `../${p.classId}/`;
    return findProfileSourceRef(profiles, rec.id) || '#';
  }

  function buildResultCardViewModel(rec, profiles) {
    const requirements = rec.requirements || [];
    return {
      role: rec.role,
      roleLabel: roleLabelFor(rec.role),
      entityType: rec.entityType,
      typeText: typeTextFor(rec),
      title: rec.title,
      summary: rec.summary,
      whyItFits: rec.whyItFits || [],
      watchFor: rec.watchFor || [],
      requirements,
      // 20. Requirements section omitted entirely (not shown empty) when a
      // path carries no requirements/commitments.
      hasRequirements: requirements.length > 0,
      branchText: rec.branchChoice ? humaniseBranch(rec.branchChoice) : null,
      isProvisional: rec.fitBand === 'provisional',
      exploreHref: findExploreHref(profiles, rec),
      sourceHref: findProfileSourceRef(profiles, rec.id),
    };
  }

  function mount(container, deps) {
    const criteriaIndex = FYC.indexCriteria(deps.criteriaDoc);
    let state = loadFromSessionStorage() || createAppState();
    let uiError = null;

    function persist() { saveToSessionStorage(state); }
    function rerender() { persist(); render(); }

    function goTo(stage) { state.stage = stage; uiError = null; rerender(); }

    function suggestionRow(s, opts) {
      const crit = criteriaIndex.get(s.criterionId);
      const label = criterionLabel(criteriaIndex, s.criterionId);
      const source = Array.isArray(s.sourcePhrase)
        ? `You mentioned &ldquo;${escapeHtml(s.sourcePhrase.join('&rdquo;, &ldquo;'))}&rdquo;`
        : (s.origin === 'explicit' ? 'Added by you' : (s.origin === 'adaptive-answer' ? 'From your last answer' : 'Added by you'));
      let control = '';
      if (crit.kind === 'directional') {
        control = `<label class="fycRange">${escapeHtml(crit.lowAnchor.label)}
          <input type="range" min="1" max="10" step="1" value="${Math.round(s.desiredPosition)}" data-action="set-position" data-criterion="${crit.id}">
          ${escapeHtml(crit.highAnchor.label)}</label>`;
      } else if (crit.kind === 'categorical') {
        const modes = ['prefer', 'require', 'exclude'];
        control = `<div class="fycModes" role="group" aria-label="How should ${escapeHtml(label)} be used?">${modes.map(m => `<button type="button" class="fycModeBtn${s.mode === m ? ' active' : ''}" data-action="set-mode" data-criterion="${crit.id}" data-mode="${m}">${capitalize(m)}</button>`).join('')}</div>
          <div class="fycValues">${crit.values.map(v => `<label><input type="checkbox" data-action="toggle-value" data-criterion="${crit.id}" data-value="${escapeHtml(v)}" ${s.values && s.values.includes(v) ? 'checked' : ''}> ${escapeHtml(v)}</label>`).join('')}</div>`;
      }
      const importanceRow = (crit.kind !== 'categorical' || s.mode === 'prefer') ? `<div class="fycImportance" role="group" aria-label="How important is ${escapeHtml(label)}?">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" class="fycImpBtn${s.importance === n ? ' active' : ''}" data-action="set-importance" data-criterion="${crit.id}" data-value="${n}">${n}</button>`).join('')}</div>` : '';
      return `<li class="fycCard" data-criterion="${crit.id}">
        <div class="fycCardHead"><span class="fycCardLabel">${escapeHtml(label)}</span><span class="fycCardSource">${source}</span></div>
        ${control}
        ${importanceRow}
        <div class="fycCardActions">
          <button type="button" data-action="not-relevant" data-criterion="${crit.id}">Not relevant</button>
          ${opts && opts.removable ? `<button type="button" data-action="remove-suggestion" data-criterion="${crit.id}">Remove</button>` : ''}
        </div>
      </li>`;
    }

    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    function renderIdea() {
      return `<section class="fycStage" aria-labelledby="fycHeading">
        <p class="fycEyebrow">Begin anywhere</p>
        <h1 id="fycHeading">What kind of character are you imagining?</h1>
        <p class="fycSupport">Describe a fantasy, a combat role, a personality, or a precise build idea. The Compass will turn it into preferences you can correct before it recommends anything.</p>
        ${uiError ? `<p class="fycError" role="alert">${escapeHtml(uiError)}</p>` : ''}
        <textarea id="fycConceptText" aria-label="Describe your character idea" placeholder="For example: a clever weapon-user who controls enemies with curses, but does not manage a companion.">${escapeHtml(state.conceptText)}</textarea>
        <div class="fycExamples" role="group" aria-label="Example character ideas">
          <button type="button" data-action="insert-example" data-example="A simple armoured protector">A simple armoured protector</button>
          <button type="button" data-action="insert-example" data-example="A charming magical trickster">A charming magical trickster</button>
          <button type="button" data-action="insert-example" data-example="A nature caster with a true animal partner">A nature caster with a true animal partner</button>
        </div>
        <div class="fycActions">
          <button type="button" class="fycPrimary" data-action="read-idea">Read my idea</button>
          <button type="button" class="fycSecondary" data-action="browse-instead">Browse preferences instead</button>
        </div>
      </section>`;
    }

    function renderPriorities() {
      const conflictsHtml = state.pendingConflicts.map(c => {
        const label = criterionLabel(criteriaIndex, c.criterionId);
        return `<li class="fycConflict">
          <p>Your idea suggested two different things for <strong>${escapeHtml(label)}</strong>. Which is closer?</p>
          <div class="fycConflictOptions">${c.options.map((o, i) => `<button type="button" data-action="resolve-conflict" data-criterion="${c.criterionId}" data-option="${i}">${escapeHtml(Array.isArray(o.sourcePhrase) ? o.sourcePhrase.join(', ') : o.sourcePhrase)}</button>`).join('')}</div>
        </li>`;
      }).join('');
      const suggestionsHtml = state.pendingSuggestions.map(s => suggestionRow(s, { removable: true })).join('');
      const confirmedNumeric = Object.entries(state.numericPreferences).map(([id, p]) => suggestionRow(Object.assign({ criterionId: id }, p), { removable: false })).join('');
      const confirmedCategorical = Object.entries(state.categoricalPreferences).map(([id, p]) => suggestionRow(Object.assign({ criterionId: id }, p), { removable: false })).join('');
      const groupsHtml = PREFERENCE_GROUP_NAMES.map(name => `<details class="fycGroup"><summary>${escapeHtml(name)}</summary><ul class="fycGroupList">${(PREFERENCE_GROUP_ASSIGNMENTS[name] || []).filter(id => !(id in state.numericPreferences) && !(id in state.categoricalPreferences) && !state.pendingSuggestions.some(s => s.criterionId === id)).map(id => `<li><button type="button" data-action="add-preference" data-criterion="${id}">${escapeHtml(criterionLabel(criteriaIndex, id))}</button></li>`).join('')}</ul></details>`).join('');

      return `<section class="fycStage" aria-labelledby="fycHeading">
        <h1 id="fycHeading">Does this sound right?</h1>
        <p class="fycSupport">Change their importance, remove anything that does not matter, or add another preference. A 1 is still a real preference; &ldquo;Not relevant&rdquo; removes it completely.</p>
        ${conflictsHtml ? `<ul class="fycConflicts">${conflictsHtml}</ul>` : ''}
        <ul class="fycCards">${suggestionsHtml}${confirmedNumeric}${confirmedCategorical}</ul>
        <details class="fycBrowser"><summary>Add another preference</summary><div class="fycBrowserGroups">${groupsHtml}</div></details>
        <div class="fycActions">
          <button type="button" class="fycPrimary" data-action="continue-to-clarify">Continue</button>
          <button type="button" class="fycSecondary" data-action="edit-idea">Edit my idea</button>
          <button type="button" class="fycQuiet" data-action="show-results">Show current results</button>
        </div>
      </section>`;
    }

    function progressWording() {
      if (!state.lastResult) return 'Shaping the idea';
      if (state.lastResult.confidence === 'high') return 'Ready to compare';
      if (state.adaptiveQuestionCount === 0) return 'Shaping the idea';
      return 'Narrowing the paths';
    }

    function renderClarify() {
      const q = nextAdaptiveQuestion(state, deps.questionTemplates, deps.criteriaDoc);
      if (!q) { goTo('results'); return ''; }
      const answers = q.answers || (deps.questionTemplates.questions.find(qt => qt.id === q.id) || {}).answers || [];
      return `<section class="fycStage" aria-labelledby="fycHeading">
        <p class="fycEyebrow">${escapeHtml(progressWording())}</p>
        <h1 id="fycHeading">${escapeHtml(q.prompt)}</h1>
        <p class="fycSupport">This could change which of your leading options fits best.</p>
        <div class="fycAnswers" role="group" aria-label="Answer choices">${answers.map((a, i) => `<button type="button" data-action="answer-question" data-question="${escapeHtml(q.id)}" data-answer="${i}">${escapeHtml(a.label)}</button>`).join('')}</div>
        <div class="fycActions"><button type="button" class="fycQuiet" data-action="show-results">Show current results</button></div>
      </section>`;
    }

    function recommendationCard(rec) {
      const vm = buildResultCardViewModel(rec, deps.profiles);
      const branch = vm.branchText ? `<p class="fycBranch">Assumes ${escapeHtml(vm.branchText)}</p>` : '';
      const source = vm.sourceHref ? `<a class="fycSourceLink" href="${escapeHtml(vm.sourceHref)}" target="_blank" rel="noopener">View rules source</a>` : '';
      const provisional = vm.isProvisional
        ? `<p class="fycProvisional">This is the closest path so far, but your answers do not point strongly enough in one direction yet.</p>` : '';
      return `<article class="fycResultCard" data-role="${vm.role}">
        <p class="fycResultRole">${escapeHtml(vm.roleLabel)}</p>
        <p class="fycResultType">${escapeHtml(vm.typeText)}</p>
        <h2>${escapeHtml(vm.title)}</h2>
        <p class="fycResultSummary">${escapeHtml(vm.summary)}</p>
        ${provisional}
        ${vm.whyItFits.length ? `<div class="fycWhy"><h3>Why it fits</h3><ul>${vm.whyItFits.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul></div>` : ''}
        ${vm.watchFor.length ? `<div class="fycWatch"><h3>Watch for</h3><ul>${vm.watchFor.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul></div>` : ''}
        ${vm.hasRequirements ? `<div class="fycRequirements"><h3>Requirements &amp; commitments</h3><ul>${vm.requirements.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></div>` : ''}
        ${branch}
        <div class="fycResultActions">
          <a class="fycPrimary" href="${escapeHtml(vm.exploreHref)}"${vm.exploreHref.indexOf('http') === 0 ? ' target="_blank" rel="noopener"' : ''}>Explore this path</a>
          ${source}
        </div>
      </article>`;
    }

    function renderResults() {
      const rex = state.lastResult;
      if (!rex || !rex.recommendations.length) {
        return `<section class="fycStage" aria-labelledby="fycHeading">
          <h1 id="fycHeading">Paths worth exploring</h1>
          <p class="fycSupport">No active preferences yet. Add a few to see paths worth exploring.</p>
          <div class="fycActions"><button type="button" class="fycPrimary" data-action="back-to-priorities">Review preferences</button></div>
        </section>`;
      }
      return `<section class="fycStage" aria-labelledby="fycHeading">
        <h1 id="fycHeading">Paths worth exploring</h1>
        <p class="fycSupport">These are starting points, not verdicts. Change any preference and the shortlist will update.</p>
        <div class="fycResults">${rex.recommendations.map(recommendationCard).join('')}</div>
        <div class="fycActions">
          <button type="button" class="fycSecondary" data-action="back-to-priorities">Adjust preferences</button>
          <button type="button" class="fycSecondary" data-action="refine-further">Refine further</button>
          <button type="button" class="fycQuiet" data-action="start-over">Start over</button>
        </div>
      </section>`;
    }

    function render() {
      let html;
      if (state.stage === 'idea') html = renderIdea();
      else if (state.stage === 'priorities') html = renderPriorities();
      else if (state.stage === 'clarify') html = renderClarify() || renderResults();
      else html = renderResults();
      container.innerHTML = html;
      wireEvents();
      const heading = container.querySelector('#fycHeading');
      if (heading) heading.focus();
    }

    function wireEvents() {
      container.querySelectorAll('[data-action]').forEach(el => {
        const action = el.getAttribute('data-action');
        el.addEventListener(el.tagName === 'INPUT' ? 'change' : 'click', ev => handleAction(action, el, ev));
      });
      const textarea = container.querySelector('#fycConceptText');
      if (textarea) textarea.addEventListener('input', () => { state.conceptText = textarea.value; });
    }

    function currentBucketAndEntry(criterionId) {
      const crit = criteriaIndex.get(criterionId);
      const bucket = crit.kind === 'categorical' ? state.categoricalPreferences : state.numericPreferences;
      let entry = bucket[criterionId];
      if (!entry) entry = state.pendingSuggestions.find(s => s.criterionId === criterionId);
      return { crit, bucket, entry };
    }

    function handleAction(action, el) {
      const criterionId = el.getAttribute('data-criterion');
      if (action === 'insert-example') {
        state.conceptText = el.getAttribute('data-example');
        rerender();
      } else if (action === 'read-idea') {
        const textarea = container.querySelector('#fycConceptText');
        const text = textarea ? textarea.value : state.conceptText;
        if (!text || !text.trim()) { uiError = 'Write a few words about the character, or browse preferences instead.'; render(); return; }
        parseConceptText(state, text, deps.lexicon);
        if (!state.pendingSuggestions.length && !state.pendingConflicts.length) {
          uiError = 'The Compass did not find a clear preference yet. Choose a few ideas below to get started.';
        }
        goTo('priorities');
      } else if (action === 'browse-instead') {
        state.pendingSuggestions = []; state.pendingConflicts = [];
        goTo('priorities');
      } else if (action === 'edit-idea') {
        goTo('idea');
      } else if (action === 'resolve-conflict') {
        const conflict = state.pendingConflicts.find(c => c.criterionId === criterionId);
        const option = conflict.options[Number(el.getAttribute('data-option'))];
        state.pendingConflicts = state.pendingConflicts.filter(c => c.criterionId !== criterionId);
        state.pendingSuggestions.push(option);
        rerender();
      } else if (action === 'not-relevant') {
        const { crit } = currentBucketAndEntry(criterionId);
        markNotRelevant(state, criterionId, crit.kind === 'categorical' ? 'categorical' : 'numeric', 'explicit');
        rerender();
      } else if (action === 'remove-suggestion') {
        discardPendingSuggestion(state, criterionId);
        rerender();
      } else if (action === 'set-position') {
        const { bucket, entry } = currentBucketAndEntry(criterionId);
        const value = Number(el.value);
        if (entry) { entry.desiredPosition = value; if (!('importance' in entry)) entry.importance = 5; bucket[criterionId] = bucket[criterionId] || entry; }
        rerender();
      } else if (action === 'set-importance') {
        const { bucket, entry } = currentBucketAndEntry(criterionId);
        const value = Number(el.getAttribute('data-value'));
        if (entry) { entry.importance = value; bucket[criterionId] = bucket[criterionId] || entry; }
        rerender();
      } else if (action === 'set-mode') {
        const { bucket, entry } = currentBucketAndEntry(criterionId);
        const mode = el.getAttribute('data-mode');
        if (entry) { entry.mode = mode; if (mode !== 'prefer') delete entry.importance; else if (!('importance' in entry)) entry.importance = 5; bucket[criterionId] = bucket[criterionId] || entry; }
        rerender();
      } else if (action === 'toggle-value') {
        const { bucket, entry } = currentBucketAndEntry(criterionId);
        const value = el.getAttribute('data-value');
        if (entry) {
          entry.values = entry.values || [];
          const i = entry.values.indexOf(value);
          if (el.checked && i === -1) entry.values.push(value);
          if (!el.checked && i !== -1) entry.values.splice(i, 1);
          bucket[criterionId] = bucket[criterionId] || entry;
        }
        rerender();
      } else if (action === 'add-preference') {
        const crit = criteriaIndex.get(criterionId);
        if (crit.kind === 'directional') setDirectionalPreference(state, criterionId, 5.5, 5, 'explicit');
        else if (crit.kind === 'capability') setCapabilityPreference(state, criterionId, 5, 'explicit');
        else setCategoricalPreference(state, criterionId, 'prefer', [], 5, 'explicit');
        rerender();
      } else if (action === 'continue-to-clarify') {
        for (const s of state.pendingSuggestions.slice()) confirmSuggestion(state, s);
        runMatching(state, deps.profiles, deps.criteriaDoc, deps.questionTemplates, deps.explanationCatalogue);
        if (totalActivePreferenceCount(state) === 0) { goTo('priorities'); return; }
        goTo('clarify');
      } else if (action === 'show-results') {
        for (const s of state.pendingSuggestions.slice()) confirmSuggestion(state, s);
        runMatching(state, deps.profiles, deps.criteriaDoc, deps.questionTemplates, deps.explanationCatalogue);
        goTo('results');
      } else if (action === 'answer-question') {
        const question = deps.questionTemplates.questions.find(q => q.id === el.getAttribute('data-question')) ||
          { id: el.getAttribute('data-question'), synthetic: true };
        const idx = Number(el.getAttribute('data-answer'));
        const liveQuestion = nextAdaptiveQuestion(state, deps.questionTemplates, deps.criteriaDoc);
        const answers = (liveQuestion && liveQuestion.answers) || question.answers || [];
        applyQuestionAnswer(state, liveQuestion || question, answers[idx]);
        runMatching(state, deps.profiles, deps.criteriaDoc, deps.questionTemplates, deps.explanationCatalogue);
        goTo('clarify');
      } else if (action === 'back-to-priorities') {
        goTo('priorities');
      } else if (action === 'refine-further') {
        state.wantsMoreQuestions = true;
        goTo('clarify');
      } else if (action === 'start-over') {
        if (hasMeaningfulState(state) && typeof confirm === 'function' && !confirm('Start over? This clears your current exploration.')) return;
        state = resetState();
        clearSessionStorage();
        rerender();
      }
    }

    render();
    return { getState: () => state };
  }

  return {
    SESSION_STORAGE_KEY,
    MAX_AUTOMATIC_ADAPTIVE_QUESTIONS,
    createAppState,
    parseConceptText,
    importanceFromHint,
    confirmSuggestion,
    discardPendingSuggestion,
    markNotRelevant,
    removePreference,
    setDirectionalPreference,
    setCapabilityPreference,
    setCategoricalPreference,
    setConductPreferences,
    setGateAnswer,
    applyQuestionAnswer,
    totalActivePreferenceCount,
    buildMatcherRequest,
    runMatching,
    nextAdaptiveQuestion,
    serializeState,
    deserializeState,
    saveToSessionStorage,
    loadFromSessionStorage,
    clearSessionStorage,
    hasMeaningfulState,
    resetState,
    mount,
    PREFERENCE_GROUP_NAMES,
    PREFERENCE_GROUP_ASSIGNMENTS,
    roleLabelFor,
    typeTextFor,
    buildResultCardViewModel,
  };
}));
