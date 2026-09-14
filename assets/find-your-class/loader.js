// Find Your Class -- data loader, structural validator and effective-profile resolver.
// Implements implementation-order step 1 ("Data schemas and manifest loader") and the
// typed-operation part of step 2 ("Effective-profile resolver with typed operations")
// from finder/Find_Your_Class_Pilot_Blueprint_v1.md section 17.
//
// No production class/archetype/option data is loaded through this yet -- see
// assets/find-your-class/manifest.json. Usable from Node (module.exports) and from a
// browser <script> tag (window.PFFindYourClass), same dual-purpose pattern as
// assets/class-visuals.js.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PFFindYourClass = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Validation errors carry a path so a bad record is easy to locate.
  // ---------------------------------------------------------------------
  function ValidationError(message, path) {
    this.name = 'ValidationError';
    this.message = path ? `${path}: ${message}` : message;
    this.path = path;
  }
  ValidationError.prototype = Object.create(Error.prototype);

  function assert(cond, message, path) {
    if (!cond) throw new ValidationError(message, path);
  }

  // ---------------------------------------------------------------------
  // Manifest
  // ---------------------------------------------------------------------
  function validateManifest(manifest) {
    assert(manifest && typeof manifest === 'object', 'manifest must be an object', 'manifest');
    for (const f of ['schemaVersion', 'catalogueId', 'catalogueVersion', 'status', 'entities', 'classFiles', 'archetypeFiles', 'optionFiles', 'supportedClassIds']) {
      assert(f in manifest, `missing required field "${f}"`, 'manifest');
    }
    assert(Array.isArray(manifest.supportedClassIds) && manifest.supportedClassIds.length > 0, 'supportedClassIds must be a non-empty array', 'manifest.supportedClassIds');
    for (const f of ['criteria', 'vocabularies', 'questionTemplates', 'explanationTemplates']) {
      assert(typeof manifest.entities[f] === 'string', `entities.${f} must be a file path string`, 'manifest.entities');
    }
    return true;
  }

  // ---------------------------------------------------------------------
  // Criteria
  // ---------------------------------------------------------------------
  const CRITERION_KINDS = ['capability', 'directional', 'categorical', 'boolean', 'contextual'];

  function validateCriterion(criterion) {
    const path = `criterion "${criterion && criterion.id}"`;
    assert(criterion && typeof criterion.id === 'string' && /^[a-z][a-z0-9-]*$/.test(criterion.id), 'id must be a kebab-case string', path);
    assert(CRITERION_KINDS.includes(criterion.kind), `kind must be one of ${CRITERION_KINDS.join(', ')}`, path);
    if (criterion.kind === 'categorical') {
      assert(Array.isArray(criterion.values), 'categorical criteria require a values array', path);
    }
    if (criterion.kind === 'directional') {
      assert(criterion.lowAnchor && criterion.highAnchor, 'directional criteria require lowAnchor and highAnchor', path);
    }
    if (Array.isArray(criterion.anchors)) {
      for (const a of criterion.anchors) {
        assert(typeof a.value === 'number', 'each anchor needs a numeric value', path);
      }
    }
    return true;
  }

  function validateCriteriaFile(doc) {
    assert(doc && Array.isArray(doc.criteria), 'criteria file must have a criteria array', 'criteria');
    const seen = new Set();
    for (const c of doc.criteria) {
      validateCriterion(c);
      assert(!seen.has(c.id), `duplicate criterion id "${c.id}"`, 'criteria');
      seen.add(c.id);
    }
    return true;
  }

  function indexCriteria(doc) {
    const byId = new Map();
    for (const c of (doc && doc.criteria) || []) byId.set(c.id, c);
    return byId;
  }

  // ---------------------------------------------------------------------
  // Typed operation vocabulary (Find_Your_Class_Product_Architecture_v1.md 10.3/10.4).
  // Each entry mutates a *clone* of the accumulating effective profile in place.
  // Operations that remove something must find it first -- validation rule 20.13
  // ("removed inherited content exists before removal").
  // ---------------------------------------------------------------------
  function ensureArrayPath(profile, ...keys) {
    let obj = profile;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] = obj[keys[i]] || {};
      obj = obj[keys[i]];
    }
    const last = keys[keys.length - 1];
    obj[last] = obj[last] || [];
    return obj[last];
  }

  const OPERATIONS = {
    'set-capability': (profile, op) => {
      profile.capabilities = profile.capabilities || {};
      const entry = profile.capabilities[op.criterionId] || {};
      if (op.rating !== undefined) entry.rating = op.rating;
      if (op.position !== undefined) entry.position = op.position;
      if (op.confidence !== undefined) entry.confidence = op.confidence;
      if (op.evidenceRefs !== undefined) entry.evidenceRefs = op.evidenceRefs;
      profile.capabilities[op.criterionId] = entry;
    },
    'adjust-capability': (profile, op) => {
      const entry = (profile.capabilities && profile.capabilities[op.criterionId]) || null;
      assert(entry, `adjust-capability: "${op.criterionId}" has no existing rating/position to adjust`, 'operation');
      const field = entry.rating !== undefined ? 'rating' : 'position';
      entry[field] = Math.max(1, Math.min(10, entry[field] + op.delta));
    },
    'set-directional-position': (profile, op) => OPERATIONS['set-capability'](profile, { criterionId: op.criterionId, position: op.position }),
    'add-fantasy-tag': (profile, op) => {
      const tags = ensureArrayPath(profile, 'identity', 'fantasyTags');
      const existing = tags.find(t => t.id === op.tagId);
      if (existing) existing.strength = op.strength;
      else tags.push({ id: op.tagId, strength: op.strength });
    },
    'remove-fantasy-tag': (profile, op) => {
      const tags = ensureArrayPath(profile, 'identity', 'fantasyTags');
      const idx = tags.findIndex(t => t.id === op.tagId);
      assert(idx >= 0, `remove-fantasy-tag: "${op.tagId}" not present on inherited profile`, 'operation');
      tags.splice(idx, 1);
    },
    'add-category-value': (profile, op) => {
      const arr = ensureArrayPath(profile, 'categories', op.criterionId);
      if (!arr.includes(op.value)) arr.push(op.value);
    },
    'remove-category-value': (profile, op) => {
      const arr = ensureArrayPath(profile, 'categories', op.criterionId);
      const idx = arr.indexOf(op.value);
      assert(idx >= 0, `remove-category-value: "${op.value}" not present on inherited "${op.criterionId}"`, 'operation');
      arr.splice(idx, 1);
    },
    'set-category-values': (profile, op) => {
      profile.categories = profile.categories || {};
      profile.categories[op.criterionId] = op.values.slice();
    },
    'add-strength-fragment': (profile, op) => {
      const arr = ensureArrayPath(profile, 'explanationProfile', 'strengthFragmentIds');
      if (!arr.includes(op.fragmentId)) arr.push(op.fragmentId);
    },
    'remove-strength-fragment': (profile, op) => {
      const arr = ensureArrayPath(profile, 'explanationProfile', 'strengthFragmentIds');
      const idx = arr.indexOf(op.fragmentId);
      assert(idx >= 0, `remove-strength-fragment: "${op.fragmentId}" not present`, 'operation');
      arr.splice(idx, 1);
    },
    'add-tradeoff-fragment': (profile, op) => {
      const arr = ensureArrayPath(profile, 'explanationProfile', 'tradeoffFragmentIds');
      if (!arr.includes(op.fragmentId)) arr.push(op.fragmentId);
    },
    'remove-tradeoff-fragment': (profile, op) => {
      const arr = ensureArrayPath(profile, 'explanationProfile', 'tradeoffFragmentIds');
      const idx = arr.indexOf(op.fragmentId);
      assert(idx >= 0, `remove-tradeoff-fragment: "${op.fragmentId}" not present`, 'operation');
      arr.splice(idx, 1);
    },
    'add-rules-restriction': (profile, op) => {
      const arr = ensureArrayPath(profile, 'rulesRestrictions');
      arr.push(op.restriction);
    },
    'remove-rules-restriction': (profile, op) => {
      const arr = ensureArrayPath(profile, 'rulesRestrictions');
      const idx = arr.findIndex(r => r.id === op.id);
      assert(idx >= 0, `remove-rules-restriction: "${op.id}" not present on inherited profile`, 'operation');
      arr.splice(idx, 1);
    },
    'add-dependency': (profile, op) => {
      const arr = ensureArrayPath(profile, 'dependencies');
      arr.push(op.dependency);
    },
    'remove-dependency': (profile, op) => {
      const arr = ensureArrayPath(profile, 'dependencies');
      const idx = arr.findIndex(d => d.id === op.id);
      assert(idx >= 0, `remove-dependency: "${op.id}" not present on inherited profile`, 'operation');
      arr.splice(idx, 1);
    },
    'set-progression-band': (profile, op) => {
      profile.progression = profile.progression || {};
      profile.progression.bands = profile.progression.bands || {};
      profile.progression.bands[op.band] = op.value;
    },
    'add-concept-online-entry': (profile, op) => {
      const arr = ensureArrayPath(profile, 'progression', 'conceptOnline');
      arr.push({ conceptTag: op.conceptTag, level: op.level });
    },
  };

  function applyOperation(profile, op) {
    const fn = OPERATIONS[op.op];
    assert(fn, `unknown operation "${op.op}" -- not in the closed operation vocabulary (assets/find-your-class/vocabularies.json)`, 'operation');
    fn(profile, op);
    return profile;
  }

  function clone(value) {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
  }

  // Resolve base class + zero or more deltas (archetype, then options, in the order
  // they apply) into one effective profile. Returns { profile, appliedIds, provenance }
  // so a caller can show "base + archetype + option" per architecture 10.2/13.1.
  function resolveEffectiveProfile(baseClassProfile, deltas) {
    assert(baseClassProfile && baseClassProfile.entityType === 'class', 'resolveEffectiveProfile requires a class entity as the base', 'resolveEffectiveProfile');
    let profile = clone(baseClassProfile);
    profile.entityType = 'effective';
    profile.componentIds = [baseClassProfile.id];
    for (const delta of deltas || []) {
      assert(delta && Array.isArray(delta.operations), `delta "${delta && delta.id}" has no operations array`, 'resolveEffectiveProfile');
      for (const op of delta.operations) applyOperation(profile, op);
      profile.componentIds.push(delta.id);
    }
    return profile;
  }

  // ---------------------------------------------------------------------
  // Scoring (Find_Your_Class_Product_Architecture_v1.md 13.2/13.3).
  // Unknown candidate data returns { unknown: true } and must be excluded from both
  // numerator and denominator by the caller (13.5) -- never treated as a low score.
  // notRelevant preferences must be filtered out by the caller before scoring at all.
  // ---------------------------------------------------------------------
  function importanceWeight(importance) {
    return Math.pow(importance / 10, 1.5);
  }

  function scoreCapabilityFit(candidateRating, importance) {
    if (candidateRating === undefined || candidateRating === null) return { unknown: true };
    const fit = (candidateRating - 1) / 9;
    return { unknown: false, fit, weightedFit: fit * importanceWeight(importance) };
  }

  function scoreDirectionalFit(candidatePosition, desiredPosition, importance) {
    if (candidatePosition === undefined || candidatePosition === null) return { unknown: true };
    const distance = Math.abs(candidatePosition - desiredPosition) / 9;
    const fit = 1 - distance;
    return { unknown: false, fit, weightedFit: fit * importanceWeight(importance) };
  }

  return {
    ValidationError,
    validateManifest,
    validateCriterion,
    validateCriteriaFile,
    indexCriteria,
    OPERATIONS_VOCABULARY: Object.keys(OPERATIONS),
    applyOperation,
    resolveEffectiveProfile,
    importanceWeight,
    scoreCapabilityFit,
    scoreDirectionalFit,
  };
}));
