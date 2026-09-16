// Find Your Class v2 -- state controller and DOM renderer over the Compass v2
// catalogue (24 three-level capabilities, 6 practical ratings, 16 boolean
// facts, 8 identity categories). Same UMD dual-export pattern.
//
// Two independent, mutually-exclusive input routes, chosen on an initial
// "choice" screen:
//   - "idea"    : free-text description (existing, unchanged). No
//                 concept-lexicon parser exists yet, so idea text is
//                 captured but does not feed structured preferences.
//   - "profile" : manual 24-criterion capability builder. Each criterion is
//                 a compact card (label + "Not relevant" chip); clicking the
//                 label expands it to Absent/Available/Core. No 1-10
//                 importance control here -- the chosen level IS the full
//                 preference (see matcher.js's scoreCandidateManual, which
//                 uses a distance-based fit with equal weight per criterion).
// Both drafts (idea text and manual profile) persist independently --
// switching between them never silently discards the other.
//
// Scope: the manual-profile builder covers ONLY the 24 capability criteria.
// The 6 practical ratings (build-complexity, play-complexity, etc.) are
// deliberately left out of this first interface -- per product decision,
// those describe HOW demanding a character is to play, not WHAT it does,
// and belong in a later optional "Additional preferences" section.
//
// Multiple named searches: a player can save several searches side by side
// (New/Save As/Rename/Delete, via the search bar shown on every stage) --
// the same "saved character" concept Calc and the spellbook pages use.
// Each search has its own idea text, manual profile, and its own locked (or
// global-following) Sources selection, since a player running several
// campaigns with different GMs may need different sourcebooks per search.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./loader.js'), require('./matcher.js'));
  } else {
    root.PFFindYourClassAppV2 = factory(root.PFFindYourClassV2, root.PFFindYourClassMatcherV2);
  }
}(typeof self !== 'undefined' ? self : this, function (V2, Matcher) {
  'use strict';

  const STORAGE_KEY = 'pf_find_your_class_v2';
  const DEFAULT_SEARCH_NAME = 'Search 1';

  const CAPABILITY_GROUPS = ['offence', 'battlefield', 'support', 'exploration'];
  const CAPABILITY_GROUP_LABELS = {
    offence: 'Offence', battlefield: 'Battlefield presence',
    support: 'Magic and support', exploration: 'Exploration and interaction',
  };
  const MANUAL_VALUES = ['absent', 'available', 'core'];
  const MANUAL_VALUE_LABELS = { 'not-relevant': 'Not relevant', absent: 'Absent', available: 'Available', core: 'Core' };

  // A "search" is one player's complete draft: their idea text, their manual
  // 24-criterion profile, and their own locked (or global-following) Sources
  // selection. Multiple named searches can exist side by side -- the same
  // "saved character" concept Calc and the spellbook pages already use,
  // applied here so a player running several campaigns with different GMs
  // can keep each one's criteria and allowed sourcebooks separate.
  function createSearch() {
    return {
      schemaVersion: 2, stage: 'choice',
      idea: '',
      manualCapabilityPreferences: {}, manualExpanded: {}, manualSectionCollapsed: {},
      capabilityPreferences: {}, practicalPreferences: {}, factPreferences: {}, identityPreferences: {},
      gateAnswers: {}, lastResult: null,
      // Sources (sourcebooks) filter: same pattern as the spellbook pages'
      // per-character "Sources" panel (assets/valid-sources.js). While
      // !sourcesCustomized, excludedSources is re-derived from the site's
      // global Valid Sources setting every time this search loads. The
      // moment the player edits a source here, sourcesCustomized flips true
      // and this search's sources lock independently of the global default
      // -- exactly the "closed padlock" behaviour requested, since a player
      // may run several searches for different campaigns with different GMs.
      excludedSources: {}, sourcesCustomized: false,
    };
  }

  // The top-level persisted object: a dictionary of named searches plus
  // which one is active. Mirrors Calc's {active, profiles} shape.
  function createStore() {
    return { active: DEFAULT_SEARCH_NAME, searches: { [DEFAULT_SEARCH_NAME]: createSearch() } };
  }

  function generateSearchName(existingNames) {
    let n = 1;
    while (existingNames.includes('Search ' + n)) n++;
    return 'Search ' + n;
  }

  // Recompute excludedSources from the site-wide global Valid Sources
  // selection, but only while this search hasn't been individually
  // customized (mirrors applyGlobalSourcesToProfile in every spellbook page).
  function applyGlobalSourcesToProfile(state, allProfiles) {
    if (state.sourcesCustomized) return;
    if (typeof PFSources === 'undefined') return;
    const allCitations = allProfiles.map(p => p.sourceCitationText || 'Unknown');
    state.excludedSources = PFSources.computeExcludedSources(allCitations, PFSources.loadGlobalExcludedLocal());
  }

  // Filters the resolved profile catalogue down to those whose source is
  // currently allowed. Applied identically for both input modes (idea and
  // manual-profile) right before matching, per spec: "preserve the existing
  // selected-source filters and pass them into matching exactly as the
  // current flow does."
  //
  // NOTE: state.excludedSources is keyed by each profile's exact
  // sourceCitationText (e.g. "Ultimate Magic pg. 18"), matching the same
  // per-character excludedSources shape every spellbook page already uses --
  // NOT by short book name (that keying, used only for the GLOBAL default
  // map, belongs to PFSources.isAllowed's second argument and must never be
  // passed state.excludedSources directly, which is a book-name/citation
  // shape mismatch). The direct-lookup comparison below mirrors bard.html's
  // own `!state.excludedSources[s.source||'Unknown']` spell-list filter.
  function filterProfilesBySources(allProfiles, state) {
    if (typeof PFSources === 'undefined') return allProfiles;
    return allProfiles.filter(p => !state.excludedSources[p.sourceCitationText || 'Unknown']);
  }

  function totalActivePreferenceCount(state) {
    let count = 0;
    for (const p of Object.values(state.capabilityPreferences)) if (p && !p.notRelevant) count++;
    for (const p of Object.values(state.practicalPreferences)) if (p && !p.notRelevant) count++;
    for (const p of Object.values(state.factPreferences)) if (p && !p.notRelevant) count++;
    for (const p of Object.values(state.identityPreferences)) if (p && !p.notRelevant && p.mode === 'prefer') count++;
    return count;
  }

  function totalActiveManualPreferenceCount(state) {
    return Object.values(state.manualCapabilityPreferences).filter(v => v && v !== 'not-relevant').length;
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

  // Per spec section 4: omit every not-relevant criterion from the request
  // entirely -- absence of the key means "not relevant", never an explicit
  // "not-relevant" string value in the serialized request.
  function buildManualMatcherRequest(state) {
    const capabilityPreferences = {};
    for (const [id, value] of Object.entries(state.manualCapabilityPreferences)) {
      if (value && value !== 'not-relevant') capabilityPreferences[id] = value;
    }
    return { inputMode: 'manual-profile', capabilityPreferences };
  }

  function runMatching(state, profiles, criteriaIndex, options) {
    const allowed = filterProfilesBySources(profiles, state);
    const result = Matcher.matchProfiles(buildMatcherRequest(state), allowed, criteriaIndex, options);
    state.lastResult = result;
    return result;
  }

  function runManualMatching(state, profiles, criteriaIndex, options) {
    const allowed = filterProfilesBySources(profiles, state);
    const result = Matcher.matchProfiles(buildManualMatcherRequest(state), allowed, criteriaIndex, options);
    state.lastResult = result;
    return result;
  }

  function serializeStore(store) { return JSON.stringify(store); }

  // Accepts either the current {active, searches} shape, or a pre-multi-
  // search single-search blob (schemaVersion:2 at the top level, from before
  // this feature existed) -- migrated in place by wrapping it as that
  // player's one named search, so nobody's existing draft is lost when this
  // feature ships.
  function deserializeStore(json) {
    if (!json) return null;
    try {
      const parsed = JSON.parse(json);
      if (parsed && parsed.searches && typeof parsed.searches === 'object' && parsed.active) {
        return Object.keys(parsed.searches).length ? parsed : null;
      }
      if (parsed && parsed.schemaVersion === 2) {
        return { active: DEFAULT_SEARCH_NAME, searches: { [DEFAULT_SEARCH_NAME]: parsed } };
      }
      return null;
    } catch (e) { return null; }
  }
  // Uses localStorage (not sessionStorage): a player's searches -- including
  // each one's manual profile and its own locked Sources selection -- should
  // survive closing the tab/browser, the same way saved characters in Calc
  // or a spellbook do.
  function saveStoreToStorage(store, storage) {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return;
    try { s.setItem(STORAGE_KEY, serializeStore(store)); } catch (e) {}
  }
  function loadStoreFromStorage(storage) {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return null;
    try { return deserializeStore(s.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }
  function clearStorage(storage) {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return;
    try { s.removeItem(STORAGE_KEY); } catch (e) {}
  }

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
    let store = loadStoreFromStorage() || createStore();
    if (!store.searches[store.active]) store.active = Object.keys(store.searches)[0];
    Object.values(store.searches).forEach(s => applyGlobalSourcesToProfile(s, profiles));
    let state = store.searches[store.active];
    let uiError = null;

    let sourcesPanelOpen = false;

    function persist() { saveStoreToStorage(store); }
    function rerender() { persist(); render(); }
    function goTo(stage) { state.stage = stage; uiError = null; rerender(); }

    function switchSearch(name) {
      if (!store.searches[name] || name === store.active) return;
      store.active = name;
      state = store.searches[name];
      uiError = null;
      applyGlobalSourcesToProfile(state, profiles);
      rerender();
    }

    function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    // -----------------------------------------------------------------
    // Search bar -- named, multiple saved searches (same "saved character"
    // concept as Calc/the spellbook pages). Shown on every stage, above the
    // Sources panel, since which search is active determines which
    // Sources selection is in effect.
    // -----------------------------------------------------------------
    function renderSearchBar() {
      const names = Object.keys(store.searches);
      return `<div class="fycSearchBar">
        <label class="fycSearchBarLabel">Search
          <select data-action="search-select" aria-label="Choose a saved search">${names.map(n => `<option value="${escapeHtml(n)}"${n === store.active ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('')}</select>
        </label>
        <div class="fycSearchBarActions">
          <button type="button" data-action="search-new">New</button>
          <button type="button" data-action="search-save-as">Save As&hellip;</button>
          <button type="button" data-action="search-rename">Rename</button>
          <button type="button" data-action="search-delete" ${names.length > 1 ? '' : 'disabled'}>Delete</button>
        </div>
      </div>`;
    }

    // -----------------------------------------------------------------
    // Sources panel -- same padlock pattern as the spellbook pages'
    // per-character Sources panel. Shown on every stage. Editing any
    // checkbox here locks (sourcesCustomized=true) this search's sources
    // independently of the site's global Valid Sources default.
    // -----------------------------------------------------------------
    function renderSourcesPanel() {
      if (typeof PFSources === 'undefined') return '';
      const allCitations = [...new Set(profiles.map(p => p.sourceCitationText || 'Unknown'))].sort();
      const excludedCount = allCitations.filter(c => state.excludedSources[c]).length;
      return `<details class="fycSourcesBox"${sourcesPanelOpen ? ' open' : ''}>
        <summary>Sources${excludedCount ? ` (${excludedCount} excluded)` : ''}</summary>
        <div class="fycSourcesPanel">
          <p class="fycSourcesNote">${state.sourcesCustomized ? '🔒 Locked for this search -- follows its own sources, independent of the site default.' : 'Following the site\'s global Valid Sources setting.'}</p>
          <div class="fycSourcesActions">
            <button type="button" data-action="sources-all">All</button>
            <button type="button" data-action="sources-none">None</button>
            <button type="button" data-action="sources-reset-global" ${state.sourcesCustomized ? '' : 'disabled'}>🔓 Reset to global</button>
          </div>
          <div class="fycSourcesList">${allCitations.map(c => `<label><input type="checkbox" data-action="sources-toggle" data-source="${escapeHtml(c)}" ${state.excludedSources[c] ? '' : 'checked'}> ${escapeHtml(c)}</label>`).join('')}</div>
        </div>
      </details>`;
    }

    // -----------------------------------------------------------------
    // Choice screen
    // -----------------------------------------------------------------
    function renderChoice() {
      return `<section class="fycStage fycStage--wide" aria-labelledby="fycHeading">
        <h1 id="fycHeading">How would you like to find your path?</h1>
        ${uiError ? `<p class="fycError" role="alert">${escapeHtml(uiError)}</p>` : ''}
        <div class="fycChoiceGrid">
          <button type="button" class="fycChoiceCard" data-action="choose-idea">
            <span class="fycChoiceTitle">Describe your idea</span>
            <span class="fycChoiceDesc">Write freely about the character you're imagining.</span>
          </button>
          <span class="fycChoiceOr">or&hellip;</span>
          <button type="button" class="fycChoiceCard" data-action="choose-profile">
            <span class="fycChoiceTitle">Build your profile</span>
            <span class="fycChoiceDesc">Choose exactly what you want, criterion by criterion.</span>
          </button>
        </div>
      </section>`;
    }

    // -----------------------------------------------------------------
    // Idea (free-text) stage -- unchanged
    // -----------------------------------------------------------------
    function renderIdea() {
      return `<section class="fycStage" aria-labelledby="fycHeading">
        <h1 id="fycHeading">Describe your ideal character</h1>
        ${uiError ? `<p class="fycError" role="alert">${escapeHtml(uiError)}</p>` : ''}
        <p class="fycSupport">What kind of character appeals to you? A sneaky elf? A protective paladin? A mysterious wizard? Write freely.</p>
        <textarea class="fycTextarea" data-action="set-idea" placeholder="e.g., A support character who heals and buffs the party, with some damage when needed...">${escapeHtml(state.idea)}</textarea>
        <div class="fycActions">
          <button type="button" class="fycPrimary" data-action="apply-idea">See results for my idea</button>
          <button type="button" class="fycQuiet" data-action="back-to-choice">Back</button>
        </div>
      </section>`;
    }

    // -----------------------------------------------------------------
    // Profile (manual 24-criterion) stage
    // -----------------------------------------------------------------
    function manualCriterionCard(id) {
      const c = criteriaIndex.get(id);
      const value = state.manualCapabilityPreferences[id] || 'not-relevant';
      const expanded = !!state.manualExpanded[id];
      return `<li class="fycManualCard fycManualCard--${value}" data-criterion="${id}">
        <div class="fycManualHead">
          <button type="button" class="fycManualLabel" data-action="manual-toggle-expand" data-id="${id}" aria-expanded="${expanded}">
            ${escapeHtml(c.playerLabel)}
          </button>
          <button type="button" class="fycManualChip fycManualChip--${value}" data-action="manual-set-value" data-id="${id}" data-value="not-relevant">${MANUAL_VALUE_LABELS[value]}</button>
        </div>
        ${expanded ? `<div class="fycManualBody">
          <p class="fycManualDesc">${escapeHtml(c.definition)}</p>
          <div class="fycManualOptions" role="group" aria-label="Choose a level for ${escapeHtml(c.playerLabel)}">
            ${MANUAL_VALUES.map(v => `<button type="button" class="fycManualOptBtn fycManualOptBtn--${v}${value === v ? ' active' : ''}" data-action="manual-set-value" data-id="${id}" data-value="${v}">${MANUAL_VALUE_LABELS[v]}</button>`).join('')}
          </div>
          ${c.boundary ? `<details class="fycManualBoundary"><summary>What counts, what doesn't?</summary><p>${escapeHtml(c.boundary)}</p></details>` : ''}
        </div>` : ''}
      </li>`;
    }

    function manualSection(group) {
      const ids = [...criteriaIndex.values()].filter(c => c.group === group).map(c => c.id);
      const collapsed = !!state.manualSectionCollapsed[group];
      const activeInGroup = ids.filter(id => {
        const v = state.manualCapabilityPreferences[id];
        return v && v !== 'not-relevant';
      }).length;
      return `<section class="fycManualGroup">
        <button type="button" class="fycManualGroupHead" data-action="manual-toggle-section" data-group="${group}" aria-expanded="${!collapsed}">
          <span class="fycManualGroupTitle">${escapeHtml(CAPABILITY_GROUP_LABELS[group])}</span>
          <span class="fycManualGroupSummary">${activeInGroup} preference${activeInGroup === 1 ? '' : 's'} selected</span>
        </button>
        ${collapsed ? '' : `<ul class="fycManualCards">${ids.map(manualCriterionCard).join('')}</ul>`}
      </section>`;
    }

    function manualSummary() {
      const byValue = { core: [], available: [], absent: [] };
      for (const id of criteriaIndex.keys()) {
        const v = state.manualCapabilityPreferences[id];
        if (v && byValue[v]) byValue[v].push(criteriaIndex.get(id).playerLabel);
      }
      const lines = [];
      if (byValue.core.length) lines.push(`<p><strong>Core:</strong> ${byValue.core.map(escapeHtml).join(', ')}</p>`);
      if (byValue.available.length) lines.push(`<p><strong>Available:</strong> ${byValue.available.map(escapeHtml).join(', ')}</p>`);
      if (byValue.absent.length) lines.push(`<p><strong>Absent:</strong> ${byValue.absent.map(escapeHtml).join(', ')}</p>`);
      if (!lines.length) return '';
      return `<div class="fycManualSummary" aria-live="polite">${lines.join('')}</div>`;
    }

    function renderProfile() {
      const activeCount = totalActiveManualPreferenceCount(state);
      const groups = CAPABILITY_GROUPS.map(manualSection).join('');
      return `<section class="fycStage fycStage--wide" aria-labelledby="fycHeading">
        <h1 id="fycHeading">Build your profile</h1>
        ${uiError ? `<p class="fycError" role="alert">${escapeHtml(uiError)}</p>` : ''}
        <p class="fycSupport">Click a criterion to choose Absent, Available or Core. Leave it "Not relevant" to skip it entirely.</p>
        <div class="fycManualGroups">${groups}</div>
        ${manualSummary()}
        <div class="fycActions">
          <button type="button" class="fycPrimary" data-action="manual-find-paths" ${activeCount === 0 ? 'disabled' : ''}>Find my paths</button>
          <button type="button" class="fycSecondary" data-action="manual-clear-profile">Clear profile</button>
          <button type="button" class="fycQuiet" data-action="back-to-choice">Back</button>
        </div>
      </section>`;
    }

    // -----------------------------------------------------------------
    // Results (shared by both input modes)
    // -----------------------------------------------------------------
    function recommendationCard(rec) {
      const roleLabel = { 'best-overall': 'Best overall', 'different-approach': 'Different approach', 'more-approachable': 'More approachable', 'unexpected-fit': 'Unexpected fit' }[rec.role] || rec.role;
      const typeText = rec.entityType === 'class-path' ? 'Class path' : `Archetype · Parent class: ${escapeHtml(rec.parentLabel)}`;
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
          <p class="fycSupport">No active preferences yet. Set a few to see paths worth exploring.</p>
          <div class="fycActions"><button type="button" class="fycPrimary" data-action="back-to-choice">Start over</button></div>
        </section>`;
      }
      return `<section class="fycStage" aria-labelledby="fycHeading">
        <h1 id="fycHeading">Paths worth exploring</h1>
        <p class="fycSupport">These are starting points, not verdicts. Change any preference and the shortlist will update.</p>
        <div class="fycResults">${rex.recommendations.map(recommendationCard).join('')}</div>
        <div class="fycActions">
          <button type="button" class="fycSecondary" data-action="back-to-previous">Adjust my answers</button>
          <button type="button" class="fycQuiet" data-action="start-over">Start over</button>
        </div>
      </section>`;
    }

    function render() {
      const html = state.stage === 'choice' ? renderChoice()
        : state.stage === 'idea' ? renderIdea()
        : state.stage === 'profile' ? renderProfile()
        : renderResults();
      container.innerHTML = renderSearchBar() + renderSourcesPanel() + html;
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
        const eventName = el.tagName === 'TEXTAREA' ? 'input' : (el.tagName === 'INPUT' || el.tagName === 'SELECT') ? 'change' : 'click';
        el.addEventListener(eventName, () => handleAction(el));
      });
      const sourcesDetails = container.querySelector('.fycSourcesBox');
      if (sourcesDetails) sourcesDetails.addEventListener('toggle', () => { sourcesPanelOpen = sourcesDetails.open; });
    }

    function reRunLastSearchIfShowingResults() {
      if (state.stage !== 'results') return;
      if (state.lastMode === 'profile') runManualMatching(state, profiles, criteriaIndex, { maxResults: 4 });
      else runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
    }

    function handleAction(el) {
      const action = el.getAttribute('data-action');
      if (action === 'search-select') {
        switchSearch(el.value);
        return;
      } else if (action === 'search-new') {
        const suggested = generateSearchName(Object.keys(store.searches));
        const name = typeof prompt === 'function' ? prompt('Name this search:', suggested) : suggested;
        if (name === null) return;
        const trimmed = name.trim();
        if (!trimmed) { uiError = 'Enter a name for the new search.'; render(); return; }
        if (store.searches[trimmed]) { uiError = `A search named "${trimmed}" already exists.`; render(); return; }
        const fresh = createSearch();
        applyGlobalSourcesToProfile(fresh, profiles);
        store.searches[trimmed] = fresh;
        store.active = trimmed;
        state = fresh;
        uiError = null;
        rerender();
        return;
      } else if (action === 'search-save-as') {
        const suggested = store.active + ' copy';
        const name = typeof prompt === 'function' ? prompt('Save this search as:', suggested) : suggested;
        if (name === null) return;
        const trimmed = name.trim();
        if (!trimmed) { uiError = 'Enter a name to save this search as.'; render(); return; }
        if (store.searches[trimmed]) { uiError = `A search named "${trimmed}" already exists.`; render(); return; }
        const copy = JSON.parse(JSON.stringify(state));
        store.searches[trimmed] = copy;
        store.active = trimmed;
        state = copy;
        uiError = null;
        rerender();
        return;
      } else if (action === 'search-rename') {
        const name = typeof prompt === 'function' ? prompt('Rename this search:', store.active) : null;
        if (name === null) return;
        const trimmed = name.trim();
        if (!trimmed || trimmed === store.active) return;
        if (store.searches[trimmed]) { uiError = `A search named "${trimmed}" already exists.`; render(); return; }
        delete store.searches[store.active];
        store.searches[trimmed] = state;
        store.active = trimmed;
        uiError = null;
        rerender();
        return;
      } else if (action === 'search-delete') {
        const names = Object.keys(store.searches);
        if (names.length <= 1) return;
        if (typeof confirm === 'function' && !confirm(`Delete "${store.active}"? This cannot be undone.`)) return;
        delete store.searches[store.active];
        const nextName = Object.keys(store.searches)[0];
        store.active = nextName;
        state = store.searches[nextName];
        uiError = null;
        rerender();
        return;
      } else if (action === 'sources-toggle') {
        const src = el.getAttribute('data-source');
        state.sourcesCustomized = true;
        if (el.checked) delete state.excludedSources[src];
        else state.excludedSources[src] = true;
        reRunLastSearchIfShowingResults();
        rerender();
        return;
      } else if (action === 'sources-all') {
        state.sourcesCustomized = true;
        state.excludedSources = {};
        reRunLastSearchIfShowingResults();
        rerender();
        return;
      } else if (action === 'sources-none') {
        state.sourcesCustomized = true;
        const allCitations = [...new Set(profiles.map(p => p.sourceCitationText || 'Unknown'))];
        allCitations.forEach(c => { state.excludedSources[c] = true; });
        reRunLastSearchIfShowingResults();
        rerender();
        return;
      } else if (action === 'sources-reset-global') {
        state.sourcesCustomized = false;
        applyGlobalSourcesToProfile(state, profiles);
        reRunLastSearchIfShowingResults();
        rerender();
        return;
      } else if (action === 'choose-idea') {
        goTo('idea');
      } else if (action === 'choose-profile') {
        goTo('profile');
      } else if (action === 'back-to-choice') {
        goTo('choice');
      } else if (action === 'set-idea') {
        state.idea = el.value;
        persist();
      } else if (action === 'apply-idea') {
        if (!state.idea.trim()) {
          uiError = 'Describe what you\'re looking for, or go back and build a profile instead.';
          render();
          return;
        }
        state.lastMode = 'idea';
        runMatching(state, profiles, criteriaIndex, { maxResults: 4 });
        goTo('results');
      } else if (action === 'manual-toggle-expand') {
        const id = el.getAttribute('data-id');
        state.manualExpanded[id] = !state.manualExpanded[id];
        rerender();
      } else if (action === 'manual-toggle-section') {
        const group = el.getAttribute('data-group');
        state.manualSectionCollapsed[group] = !state.manualSectionCollapsed[group];
        rerender();
      } else if (action === 'manual-set-value') {
        const id = el.getAttribute('data-id');
        const value = el.getAttribute('data-value');
        if (value === 'not-relevant') delete state.manualCapabilityPreferences[id];
        else state.manualCapabilityPreferences[id] = value;
        rerender();
      } else if (action === 'manual-clear-profile') {
        if (typeof confirm === 'function' && !confirm('Clear your entire profile? This cannot be undone.')) return;
        state.manualCapabilityPreferences = {};
        state.manualExpanded = {};
        rerender();
      } else if (action === 'manual-find-paths') {
        if (totalActiveManualPreferenceCount(state) === 0) {
          uiError = 'Set at least one criterion before finding paths.';
          render();
          return;
        }
        state.lastMode = 'profile';
        runManualMatching(state, profiles, criteriaIndex, { maxResults: 4 });
        goTo('results');
      } else if (action === 'back-to-previous') {
        goTo(state.lastMode === 'profile' ? 'profile' : 'idea');
      } else if (action === 'start-over') {
        // Resets only the ACTIVE search, not the whole store -- with named
        // searches now, wiping every saved search on one "start over" click
        // would be a surprising, destructive action across unrelated
        // campaigns. To delete a search entirely, use "Delete" instead.
        if (typeof confirm === 'function' && !confirm(`Start over? This clears "${store.active}"'s selections.`)) return;
        const fresh = createSearch();
        applyGlobalSourcesToProfile(fresh, profiles);
        store.searches[store.active] = fresh;
        state = fresh;
        rerender();
      }
    }

    render();
    return { getState: () => state, getStore: () => store };
  }

  return {
    STORAGE_KEY, DEFAULT_SEARCH_NAME, createSearch, createStore, generateSearchName,
    totalActivePreferenceCount, totalActiveManualPreferenceCount,
    buildMatcherRequest, buildManualMatcherRequest, runMatching, runManualMatching,
    serializeStore, deserializeStore, saveStoreToStorage, loadStoreFromStorage, clearStorage,
    CAPABILITY_GROUPS, CAPABILITY_GROUP_LABELS, MANUAL_VALUES, MANUAL_VALUE_LABELS,
    applyGlobalSourcesToProfile, filterProfilesBySources,
    mount,
  };
}));
