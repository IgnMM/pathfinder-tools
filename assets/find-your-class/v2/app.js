// Find Your Class v2 -- state controller and DOM renderer over the Compass v2
// catalogue (24 three-level capabilities, 6 practical ratings, 16 boolean
// facts, 8 identity categories). Same UMD dual-export pattern. The UI now
// includes an initial free-text "describe your character" stage (idea), which
// feeds directly into matching. If the player hasn't thought of anything, they
// can skip to the structured-criteria stage (start). No concept-lexicon parser
// yet (that is future work), so idea text is captured but matching uses only
// the explicit criteria preferences.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./loader.js'), require('./matcher.js'));
  } else {
    root.PFFindYourClassAppV2 = factory(root.PFFindYourClassV2, root.PFFindYourClassMatcherV2);
  }
}(typeof self !== 'undefined' ? self : this, function (V2, Matcher) {
  'use strict';

  const SESSION_STORAGE_KEY = 'pf_find_your_class_v2';

  function createAppState() {
    return {
      schemaVersion: 2, stage: 'idea',
      idea: '',
      capabilityPreferences: {}, practicalPreferences: {}, factPreferences: {}, identityPreferences: {},
      gateAnswers: {}, lastResult: null,
    };
  }

  function totalActivePreferenceCount(state) {
    let count = 0;
    for (const p of Object.values(state.capabilityPreferences)) if (p && !p.notRelevant) count++;
    for (const p of Object.values(state.practicalPreferences)) if (p && !p.notRelevant) count++;
    for (const p of Object.values(state.factPreferences)) if (p && !p.notRelevant) count++;
    for (const p of Object.values(state.identityPreferences)) if (p && !p.notRelevant && p.mode === 'prefer') count++;
    return count;
  }

  function buildMatcherRequest(state) {
    return {
      schemaVersion: 2,
      capabilityPreferences: state.capabilityPreferences,
      practicalPreferences: state.practicalPreferences,
      factPreferences: state.factPreferences,
      identityPreferences: state.identityPreferences,
      gateAnswers: state.gateAnswers,
    };
  }

  function runMatching(state, profiles, criteriaIndex, options) {
    const result = Matcher.matchProfiles(buildMatcherRequest(state), profiles, criteriaIndex, options);
    state.lastResult = result;
    return result;
  }

  function serializeState(state) { return JSON.stringify(state); }
  function deserializeState(json) {
    if (!json) return null;
    try { const parsed = JSON.parse(json); return parsed && parsed.schemaVersion === 2 ? parsed : null; } catch (e) { return null; }
  }
  function saveToSessionStorage(state, storage) {
    const s = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!s) return;
    try { s.setItem(SESSION_STORAGE_KEY, serializeState(state)); } catch (e) {}
  }
  function loadFromSessionStorage(storage) {
    const s = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!s) return null;
    try { return deserializeState(s.getItem(SESSION_STORAGE_KEY)); } catch (e) { return null; }
  }
  function clearSessionStorage(storage) {
    const s = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!s) return;
    try { s.removeItem(SESSION_STORAGE_KEY); } catch (e) {}
  }

  const CAPABILITY_GROUP_LABELS = { offence: 'Offence', battlefield: 'Battlefield', support: 'Support & magic', exploration: 'Exploration & social' };
  const IDENTITY_LABELS = {
    magicIdentity: 'Kind of magic', castingMethod: 'How spells are cast', castingExtent: 'How much spellcasting matters',
    primaryDelivery: 'How power is delivered', environmentThemes: 'Environment theme', spiritualThemes: 'Spiritual theme',
    elementThemes: 'Elemental theme', professionIdentity: 'Profession identity',
  };
  const PRACTICAL_LABELS = {
    'build-complexity': 'Build complexity', 'play-complexity': 'Play complexity', 'attribute-demands': 'Ability score demands',
    'equipment-dependence': 'Equipment dependence', 'resource-management': 'Resource tracking', versatility: 'Specialist vs. versatile',
  };
  const FACT_LABELS = {
    'has-spellcasting': 'Has spellcasting', 'has-animal-companion': 'Has an animal companion', 'has-familiar': 'Has a familiar',
    'has-mount': 'Has a mount', 'has-code-of-conduct': 'Bound by a code of conduct', 'requires-deity': 'Requires a deity',
    'requires-alignment': 'Restricted alignment', 'has-shapeshifting': 'Can shapeshift', 'has-sneak-attack': 'Has sneak attack',
    'has-healing': 'Can heal', 'has-firearms': 'Uses firearms', 'has-bombs': 'Uses bombs', 'has-rage': 'Can rage',
    'has-profession-identity': 'Has a named profession identity', 'depends-on-specific-equipment': 'Depends on specific equipment',
    'controls-additional-entity': 'Controls an additional entity',
  };

  function mount(container, deps) {
    const criteriaIndex = V2.indexCriteria(deps.criteriaDoc);
    const profiles = deps.profiles;
    let state = loadFromSessionStorage() || createAppState();
    let uiError = null;

    function persist() { saveToSessionStorage(state); }
    function rerender() { persist(); render(); }
    function goTo(stage) { state.stage = stage; uiError = null; rerender(); }

    function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    function importanceRow(id, kind, importance) {
      return `<div class="fycImportance" role="group" aria-label="How important is this?">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" class="fycImpBtn${importance === n ? ' active' : ''}" data-action="set-importance" data-kind="${kind}" data-id="${id}" data-value="${n}">${n}</button>`).join('')}</div>`;
    }

    function capabilityRow(id) {
      const c = criteriaIndex.get(id);
      const pref = state.capabilityPreferences[id] || {};
      const levels = [['notRelevant', 'Not relevant'], ['available', 'At least available'], ['core', 'Must be core']];
      const active = pref.notRelevant ? 'notRelevant' : pref.desiredLevel;
      return `<li class="fycCard" data-criterion="${id}">
        <div class="fycCardHead"><span class="fycCardLabel">${escapeHtml(c.playerLabel)}</span></div>
        <div class="fycModes" role="group" aria-label="How much ${escapeHtml(c.playerLabel)} do you want?">${levels.map(([v, label]) => `<button type="button" class="fycModeBtn${active === v ? ' active' : ''}" data-action="cap-set-level" data-id="${id}" data-level="${v}">${label}</button>`).join('')}</div>
        ${!pref.notRelevant && pref.desiredLevel ? importanceRow(id, 'capability', pref.importance) : ''}
      </li>`;
    }

    function practicalRow(id) {
      const pref = state.practicalPreferences[id] || {};
      const levels = [['notRelevant', 'Not relevant'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];
      const active = pref.notRelevant ? 'notRelevant' : pref.desiredLevel;
      return `<li class="fycCard" data-criterion="${id}">
        <div class="fycCardHead"><span class="fycCardLabel">${escapeHtml(PRACTICAL_LABELS[id] || id)}</span></div>
        <div class="fycModes" role="group" aria-label="Desired ${escapeHtml(PRACTICAL_LABELS[id] || id)}">${levels.map(([v, label]) => `<button type="button" class="fycModeBtn${active === v ? ' active' : ''}" data-action="practical-set-level" data-id="${id}" data-level="${v}">${label}</button>`).join('')}</div>
        ${!pref.notRelevant && pref.desiredLevel ? importanceRow(id, 'practical', pref.importance) : ''}
      </li>`;
    }

    function factRow(id) {
      const pref = state.factPreferences[id] || {};
      const options = [['notRelevant', 'Not relevant'], ['true', 'Yes'], ['false', 'No']];
      const active = pref.notRelevant ? 'notRelevant' : (pref.desired === undefined ? undefined : String(pref.desired));
      return `<li class="fycCard" data-criterion="${id}">
        <div class="fycCardHead"><span class="fycCardLabel">${escapeHtml(FACT_LABELS[id] || id)}</span></div>
        <div class="fycModes" role="group" aria-label="${escapeHtml(FACT_LABELS[id] || id)}?">${options.map(([v, label]) => `<button type="button" class="fycModeBtn${active === v ? ' active' : ''}" data-action="fact-set" data-id="${id}" data-value="${v}">${label}</button>`).join('')}</div>
        ${!pref.notRelevant && active !== undefined ? importanceRow(id, 'fact', pref.importance) : ''}
      </li>`;
    }

    function identityValueOptions(category) {
      if (category !== 'professionIdentity') return deps.model.identityCategories[category] || [];
      const set = new Set();
      for (const p of profiles) for (const v of (p.identity.professionIdentity || [])) set.add(v);
      return [...set].sort();
    }

    function identityRow(category) {
      const pref = state.identityPreferences[category] || {};
      const modes = [['notRelevant', 'Not relevant'], ['prefer', 'Prefer'], ['require', 'Require'], ['exclude', 'Exclude']];
      const active = pref.notRelevant ? 'notRelevant' : pref.mode;
      const values = identityValueOptions(category);
      const showValues = active === 'prefer' || active === 'require' || active === 'exclude';
      return `<li class="fycCard" data-criterion="${category}">
        <div class="fycCardHead"><span class="fycCardLabel">${escapeHtml(IDENTITY_LABELS[category] || category)}</span></div>
        <div class="fycModes" role="group" aria-label="${escapeHtml(IDENTITY_LABELS[category] || category)}">${modes.map(([v, label]) => `<button type="button" class="fycModeBtn${active === v ? ' active' : ''}" data-action="identity-set-mode" data-category="${category}" data-mode="${v}">${label}</button>`).join('')}</div>
        ${showValues ? `<div class="fycValues">${values.map(v => `<label><input type="checkbox" data-action="identity-toggle-value" data-category="${category}" data-value="${escapeHtml(v)}" ${pref.values && pref.values.includes(v) ? 'checked' : ''}> ${escapeHtml(v)}</label>`).join('')}</div>` : ''}
        ${active === 'prefer' ? importanceRow(category, 'identity', pref.importance) : ''}
      </li>`;
    }

    function renderIdea() {
      return `<section class="fycStage" aria-labelledby="fycHeading">
        <h1 id="fycHeading">Describe your ideal character</h1>
        ${uiError ? `<p class="fycError" role="alert">${escapeHtml(uiError)}</p>` : ''}
        <p class="fycSupport">What kind of character appeals to you? A sneaky elf? A protective paladin? A mysterious wizard? Write freely — or skip straight to the criteria if you'd rather.</p>
        <textarea class="fycTextarea" data-action="set-idea" placeholder="e.g., A support character who heals and buffs the party, with some damage when needed...">${escapeHtml(state.idea)}</textarea>
        <div class="fycActions">
          <button type="button" class="fycPrimary" data-action="apply-idea">See results for my idea</button>
          <button type="button" class="fycSecondary" data-action="skip-to-criteria">Or set criteria instead</button>
        </div>
      </section>`;
    }

    function renderStart() {
      const capabilityGroups = ['offence', 'battlefield', 'support', 'exploration'].map(group => {
        const ids = [...criteriaIndex.values()].filter(c => c.group === group).map(c => c.id);
        return `<section class="fycGroup"><h3>${escapeHtml(CAPABILITY_GROUP_LABELS[group])}</h3><ul class="fycCards">${ids.map(capabilityRow).join('')}</ul></section>`;
      }).join('');
      const practicalGroup = `<section class="fycGroup"><h3>Build &amp; playstyle</h3><ul class="fycCards">${deps.model.practicalRatings.map(p => practicalRow(p.id)).join('')}</ul></section>`;
      const factGroup = `<section class="fycGroup"><h3>Character facts</h3><ul class="fycCards">${deps.model.booleanFacts.map(factRow).join('')}</ul></section>`;
      const identityGroup = `<section class="fycGroup"><h3>Identity</h3><ul class="fycCards">${Object.keys(deps.model.identityCategories).map(identityRow).join('')}</ul></section>`;

      return `<section class="fycStage fycStage--wide" aria-labelledby="fycHeading">
        <h1 id="fycHeading">Set your priorities</h1>
        ${uiError ? `<p class="fycError" role="alert">${escapeHtml(uiError)}</p>` : ''}
        <p class="fycSupport">Choose what matters to you. Importance (1–10) appears only once you pick a level.</p>
        <div class="fycStartRightScroll" style="max-height:none">${capabilityGroups}${practicalGroup}${factGroup}${identityGroup}</div>
        <div class="fycActions">
          <button type="button" class="fycPrimary" data-action="show-results">See my results</button>
          <button type="button" class="fycQuiet" data-action="back-to-idea">Back to my idea</button>
        </div>
      </section>`;
    }

    function recommendationCard(rec) {
      const roleLabel = { 'best-overall': 'Best overall', 'different-approach': 'Different approach', 'more-approachable': 'More approachable', 'unexpected-fit': 'Unexpected fit' }[rec.role] || rec.role;
      const typeText = rec.entityType === 'class-path' ? 'Class path' : `Archetype · ${escapeHtml(rec.parentLabel)}`;
      const provisional = rec.fitBand === 'provisional' ? `<p class="fycProvisional">This is the closest path so far, but your answers do not point strongly enough in one direction yet.</p>` : '';
      return `<article class="fycResultCard" data-role="${rec.role}">
        <p class="fycResultRole">${escapeHtml(roleLabel)}</p>
        <p class="fycResultType">${typeText}</p>
        <h2>${escapeHtml(rec.title)}</h2>
        <p class="fycResultSummary">${escapeHtml(rec.summary)}</p>
        ${provisional}
        ${rec.whyItFits.length ? `<div class="fycWhy"><h3>Why it fits</h3><ul>${rec.whyItFits.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul></div>` : ''}
        ${rec.watchFor.length ? `<div class="fycWatch"><h3>Watch for</h3><ul>${rec.watchFor.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul></div>` : ''}
        ${rec.requirements.length ? `<div class="fycRequirements"><h3>Requirements &amp; commitments</h3><ul>${rec.requirements.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></div>` : ''}
        <div class="fycResultActions"><a class="fycPrimary" href="${escapeHtml(rec.sourceUrl || '#')}" target="_blank" rel="noopener">View rules source</a></div>
      </article>`;
    }

    function renderResults() {
      const rex = state.lastResult;
      if (!rex || !rex.recommendations.length) {
        return `<section class="fycStage" aria-labelledby="fycHeading">
          <h1 id="fycHeading">Paths worth exploring</h1>
          <p class="fycSupport">No active preferences yet. Set a few criteria to see paths worth exploring.</p>
          <div class="fycActions"><button type="button" class="fycPrimary" data-action="back-to-start">Set my priorities</button></div>
        </section>`;
      }
      return `<section class="fycStage" aria-labelledby="fycHeading">
        <h1 id="fycHeading">Paths worth exploring</h1>
        <p class="fycSupport">These are starting points, not verdicts. Change any preference and the shortlist will update.</p>
        <div class="fycResults">${rex.recommendations.map(recommendationCard).join('')}</div>
        <div class="fycActions">
          <button type="button" class="fycSecondary" data-action="back-to-start">Adjust criteria</button>
          <button type="button" class="fycQuiet" data-action="start-over">Start over</button>
        </div>
      </section>`;
    }

    function render() {
      const html = state.stage === 'idea' ? renderIdea() : state.stage === 'results' ? renderResults() : renderStart();
      container.innerHTML = html;
      wireEvents();
      if (state.stage === 'idea') {
        const textarea = container.querySelector('textarea');
        if (textarea) textarea.focus();
      } else {
        const heading = container.querySelector('#fycHeading');
        if (heading) heading.focus();
      }
    }

    function wireEvents() {
      container.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener(el.tagName === 'TEXTAREA' ? 'input' : (el.tagName === 'INPUT' ? 'change' : 'click'), () => handleAction(el));
      });
    }

    function handleAction(el) {
      const action = el.getAttribute('data-action');
      if (action === 'set-idea') {
        state.idea = el.value;
        persist();
      } else if (action === 'apply-idea') {
        if (!state.idea.trim()) {
          uiError = 'Describe what you\'re looking for, or skip to the criteria.';
          render();
          return;
        }
        runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
        goTo('results');
      } else if (action === 'skip-to-criteria') {
        goTo('start');
      } else if (action === 'cap-set-level') {
        const id = el.getAttribute('data-id');
        const level = el.getAttribute('data-level');
        state.capabilityPreferences[id] = level === 'notRelevant'
          ? { notRelevant: true }
          : { desiredLevel: level, importance: (state.capabilityPreferences[id] && state.capabilityPreferences[id].importance) || 5 };
        rerender();
      } else if (action === 'practical-set-level') {
        const id = el.getAttribute('data-id');
        const level = el.getAttribute('data-level');
        state.practicalPreferences[id] = level === 'notRelevant'
          ? { notRelevant: true }
          : { desiredLevel: level, importance: (state.practicalPreferences[id] && state.practicalPreferences[id].importance) || 5 };
        rerender();
      } else if (action === 'fact-set') {
        const id = el.getAttribute('data-id');
        const value = el.getAttribute('data-value');
        state.factPreferences[id] = value === 'notRelevant'
          ? { notRelevant: true }
          : { desired: value === 'true', importance: (state.factPreferences[id] && state.factPreferences[id].importance) || 5 };
        rerender();
      } else if (action === 'identity-set-mode') {
        const category = el.getAttribute('data-category');
        const mode = el.getAttribute('data-mode');
        const prior = state.identityPreferences[category];
        state.identityPreferences[category] = mode === 'notRelevant'
          ? { notRelevant: true }
          : { mode, values: (prior && prior.values) || [], importance: mode === 'prefer' ? ((prior && prior.importance) || 5) : undefined };
        rerender();
      } else if (action === 'identity-toggle-value') {
        const category = el.getAttribute('data-category');
        const value = el.getAttribute('data-value');
        const pref = state.identityPreferences[category] || { mode: 'prefer', values: [] };
        pref.values = pref.values || [];
        const i = pref.values.indexOf(value);
        if (el.checked && i === -1) pref.values.push(value);
        if (!el.checked && i !== -1) pref.values.splice(i, 1);
        state.identityPreferences[category] = pref;
        rerender();
      } else if (action === 'set-importance') {
        const kind = el.getAttribute('data-kind');
        const id = el.getAttribute('data-id');
        const value = Number(el.getAttribute('data-value'));
        const bucket = kind === 'capability' ? state.capabilityPreferences : kind === 'practical' ? state.practicalPreferences : kind === 'fact' ? state.factPreferences : state.identityPreferences;
        if (bucket[id]) bucket[id].importance = value;
        rerender();
      } else if (action === 'show-results') {
        runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
        if (totalActivePreferenceCount(state) === 0) {
          uiError = 'Set at least one preference before seeing results.';
          render();
          return;
        }
        goTo('results');
      } else if (action === 'back-to-idea') {
        goTo('idea');
      } else if (action === 'back-to-start') {
        goTo('start');
      } else if (action === 'start-over') {
        if (typeof confirm === 'function' && !confirm('Start over? This clears all your selections.')) return;
        state = createAppState();
        clearSessionStorage();
        rerender();
      }
    }

    render();
    return { getState: () => state };
  }

  return {
    SESSION_STORAGE_KEY, createAppState, totalActivePreferenceCount, buildMatcherRequest, runMatching,
    serializeState, deserializeState, saveToSessionStorage, loadFromSessionStorage, clearSessionStorage,
    mount,
  };
}));
