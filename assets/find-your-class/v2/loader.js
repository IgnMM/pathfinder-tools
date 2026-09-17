// Find Your Class v2 -- data loader, structural validator and effective-profile
// (class + archetype override) resolver for the "Compass v2" catalogue built by
// Codex in assets/find-your-class/v2/ (24 three-level capabilities, practical
// ratings, boolean facts, identity categories, sparse enemy specialisation,
// constraints). Deliberately separate from ../loader.js (the v1 system, still
// intact and untouched) -- v2's data shape (ordinal absent/available/core
// scale, class-inherits-archetype-overrides model) is different enough that
// sharing one loader would have meant forking most of it internally anyway.
// Same Node/browser dual-export pattern as every other module in this
// sub-project.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PFFindYourClassV2 = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function ValidationError(message, path) {
    this.name = 'ValidationError';
    this.message = path ? `${path}: ${message}` : message;
    this.path = path;
  }
  ValidationError.prototype = Object.create(Error.prototype);
  function assert(cond, message, path) { if (!cond) throw new ValidationError(message, path); }

  const CAPABILITY_SCALE = ['absent', 'available', 'core'];
  const CAPABILITY_RANK = { absent: 0, available: 1, core: 2 };
  const PRACTICAL_SCALE = ['low', 'medium', 'high'];
  const PRACTICAL_RANK = { low: 0, medium: 1, high: 2 };

  function indexCriteria(criteriaDoc) {
    assert(criteriaDoc && Array.isArray(criteriaDoc.criteria), 'criteria document must have a criteria array');
    const map = new Map();
    for (const c of criteriaDoc.criteria) map.set(c.id, c);
    return map;
  }

  function indexPractical(model) {
    const map = new Map();
    for (const p of model.practicalRatings) map.set(p.id, p);
    return map;
  }

  // ---------------------------------------------------------------------
  // Structural validation -- mirrors what tests/find-your-class-v2-data.test.js
  // already asserts against the real files, kept here as a reusable runtime
  // check (e.g. before matching against a class profile) rather than only a
  // one-off test.
  // ---------------------------------------------------------------------
  function validateClassProfile(profile, criteriaIndex, model) {
    const path = `class:${profile.id}`;
    const criterionIds = [...criteriaIndex.keys()];
    assert(deepEqualSortedKeys(profile.capabilities, criterionIds), 'capabilities must cover exactly the 24 criteria, no more no less', path);
    for (const v of Object.values(profile.capabilities)) assert(CAPABILITY_SCALE.includes(v), `invalid capability level "${v}"`, path);
    const practicalIds = model.practicalRatings.map(p => p.id);
    assert(deepEqualSortedKeys(profile.practical, practicalIds), 'practical ratings must cover exactly the declared set', path);
    for (const v of Object.values(profile.practical)) assert(model.practicalScale.values.includes(v), `invalid practical level "${v}"`, path);
    assert(deepEqualSortedKeys(profile.facts, model.booleanFacts), 'facts must cover exactly the declared boolean facts', path);
    for (const v of Object.values(profile.facts)) assert(typeof v === 'boolean', 'each fact must be a boolean', path);
    const identityKeys = Object.keys(model.identityCategories);
    assert(deepEqualSortedKeys(profile.identity, identityKeys), 'identity must cover exactly the declared categories', path);
    for (const [key, values] of Object.entries(profile.identity)) {
      if (key === 'professionIdentity') continue;
      for (const v of values) assert(model.identityCategories[key].includes(v), `invalid identity value "${v}" for ${key}`, path);
    }
    return true;
  }

  function deepEqualSortedKeys(obj, expectedKeys) {
    const actual = Object.keys(obj || {}).sort();
    const expected = [...expectedKeys].sort();
    return actual.length === expected.length && actual.every((k, i) => k === expected[i]);
  }

  function validateArchetypeProfile(archetype, criteriaIndex, model, classById) {
    const path = `archetype:${archetype.id}`;
    const parent = classById.get(archetype.parentClassId);
    assert(parent, `unknown parentClassId "${archetype.parentClassId}"`, path);
    for (const id of Object.keys(archetype.capabilityOverrides || {})) assert(criteriaIndex.has(id), `unknown capability "${id}"`, path);
    for (const v of Object.values(archetype.capabilityOverrides || {})) assert(CAPABILITY_SCALE.includes(v), `invalid capability level "${v}"`, path);
    for (const v of Object.values(archetype.practicalOverrides || {})) assert(model.practicalScale.values.includes(v), `invalid practical level "${v}"`, path);
    for (const v of Object.values(archetype.factOverrides || {})) assert(typeof v === 'boolean', 'each fact override must be a boolean', path);
    return true;
  }

  // ---------------------------------------------------------------------
  // Effective-profile resolver: an archetype record only stores what
  // differs from its parent class (schema-enforced: the v2 data test suite
  // already rejects a redundant override that matches the parent's own
  // value). Never mutates either input.
  // ---------------------------------------------------------------------
  function resolveEffectiveProfile(classProfile, archetypeOverride) {
    if (!archetypeOverride) {
      return {
        id: classProfile.id,
        entityType: 'class-path',
        name: classProfile.name,
        parentClassId: null,
        classId: classProfile.id,
        sourceCitationText: classProfile.sourceCitationText,
        sourceUrl: classProfile.sourceUrl,
        capabilities: { ...classProfile.capabilities },
        practical: { ...classProfile.practical },
        facts: { ...classProfile.facts },
        identity: cloneIdentity(classProfile.identity),
        enemySpecializations: { ...(classProfile.enemySpecializations || {}) },
        constraints: (classProfile.constraints || []).slice(),
        // calibrationRole is deliberately NEVER used as playerSummary: it is
        // an internal, author-facing field (its own name says so), and its
        // real content is inconsistent -- 8 of 40 real classes have a
        // genuine descriptive sentence, but the other 32 (batches 2-3) are
        // still the literal placeholder "Pending cross-class
        // normalization." Reaching a player would be exactly the class of
        // leaked-internal-note bug the v1 system already hit once (see
        // project memory) and fixed by never auto-promoting an internal
        // field to player-facing text. matcher.js's own generic "{name} is
        // a class path" fallback covers every class-path until a real,
        // schema-declared playerSummary field is added for classes.
        playerSummary: null,
        tradeoff: null,
      };
    }
    const capabilities = { ...classProfile.capabilities, ...archetypeOverride.capabilityOverrides };
    const practical = { ...classProfile.practical, ...archetypeOverride.practicalOverrides };
    const facts = { ...classProfile.facts, ...archetypeOverride.factOverrides };
    const enemySpecializations = { ...(classProfile.enemySpecializations || {}), ...(archetypeOverride.enemySpecializationOverrides || {}) };
    const identity = cloneIdentity(classProfile.identity);
    for (const [category, adds] of Object.entries(archetypeOverride.identityAdds || {})) {
      identity[category] = [...new Set([...(identity[category] || []), ...adds])];
    }
    for (const [category, removes] of Object.entries(archetypeOverride.identityRemoves || {})) {
      const removeSet = new Set(removes);
      identity[category] = (identity[category] || []).filter(v => !removeSet.has(v));
    }
    const constraints = [...(classProfile.constraints || []), ...(archetypeOverride.constraints || [])];
    return {
      id: archetypeOverride.id,
      entityType: 'archetype',
      name: archetypeOverride.name,
      parentClassId: archetypeOverride.parentClassId,
      classId: archetypeOverride.parentClassId,
      sourceCitationText: archetypeOverride.sourceCitationText,
      sourceUrl: archetypeOverride.sourceUrl,
      capabilities,
      practical,
      facts,
      identity,
      enemySpecializations,
      constraints,
      playerSummary: archetypeOverride.playerSummary || null,
      tradeoff: archetypeOverride.tradeoff || null,
      professionIdentity: archetypeOverride.professionIdentity || [],
    };
  }

  function cloneIdentity(identity) {
    const clone = {};
    for (const [k, v] of Object.entries(identity || {})) clone[k] = Array.isArray(v) ? v.slice() : v;
    return clone;
  }

  // A prestige class has no single parent (it's entered from many different
  // base classes/multiclass combinations), so unlike an archetype it is
  // always fully self-authored -- same capabilities/practical/facts/identity
  // shape as a class-path (validateClassProfile applies unchanged), but with
  // entityType 'prestige-class' and its own entry-requirements text carried
  // through for the UI/matcher to surface (a base class has no equivalent
  // gate; a prestige class always does).
  function resolvePrestigeProfile(profile) {
    return {
      id: profile.id,
      entityType: 'prestige-class',
      name: profile.name,
      parentClassId: null,
      classId: profile.id,
      sourceCitationText: profile.sourceCitationText,
      sourceUrl: profile.sourceUrl,
      requirementsText: profile.requirementsText || null,
      hitDie: profile.hitDie || null,
      capabilities: { ...profile.capabilities },
      practical: { ...profile.practical },
      facts: { ...profile.facts },
      identity: cloneIdentity(profile.identity),
      enemySpecializations: { ...(profile.enemySpecializations || {}) },
      constraints: (profile.constraints || []).slice(),
      playerSummary: profile.playerSummary || null,
      tradeoff: profile.tradeoff || null,
      professionIdentity: profile.professionIdentity || [],
    };
  }

  // Resolves every class (as a class-path profile), every archetype override
  // (as a resolved archetype profile) and every prestige class (as a
  // standalone prestige-class profile) into one flat array, the shape the
  // matcher operates on. prestigeProfiles is optional so existing callers
  // that only know about classes/archetypes keep working unchanged.
  function resolveAllProfiles(classProfiles, archetypeOverrides, prestigeProfiles) {
    const classById = new Map(classProfiles.map(c => [c.id, c]));
    const profiles = classProfiles.map(c => resolveEffectiveProfile(c, null));
    for (const override of archetypeOverrides) {
      const parent = classById.get(override.parentClassId);
      if (!parent) throw new ValidationError(`unknown parentClassId "${override.parentClassId}"`, `archetype:${override.id}`);
      profiles.push(resolveEffectiveProfile(parent, override));
    }
    for (const prestige of (prestigeProfiles || [])) profiles.push(resolvePrestigeProfile(prestige));
    return profiles;
  }

  return {
    CAPABILITY_SCALE, CAPABILITY_RANK, PRACTICAL_SCALE, PRACTICAL_RANK,
    indexCriteria, indexPractical,
    validateClassProfile, validateArchetypeProfile,
    resolveEffectiveProfile, resolvePrestigeProfile, resolveAllProfiles,
    ValidationError,
  };
}));
