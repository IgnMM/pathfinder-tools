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

  function assertFiniteNumber(value, label, path) {
    assert(typeof value === 'number' && Number.isFinite(value), `${label} must be a finite number, got ${JSON.stringify(value)}`, path);
  }
  // Catalogue-authored values (class/archetype/option ratings and positions) --
  // architecture doc section 20.4: "integers 1-10 unless a criterion explicitly
  // permits another scale". Nothing in this pilot's criteria.json permits another
  // scale yet, so this stays strict.
  function assertCandidateValue(value, label, path) {
    assertFiniteNumber(value, label, path);
    assert(Number.isInteger(value), `${label} must be an integer (catalogue ratings/positions do not use fractional values)`, path);
    assert(value >= 1 && value <= 10, `${label} must be between 1 and 10, got ${value}`, path);
  }
  // User-authored desiredPosition may legitimately be the 5.5 "flexible" midpoint
  // of a 1-10 scale that has no exact integer centre -- importance itself stays a
  // strict integer (architecture 20.5).
  function assertDesiredPosition(value, path) {
    assertFiniteNumber(value, 'desiredPosition', path);
    assert(value >= 1 && value <= 10, `desiredPosition must be between 1 and 10, got ${value}`, path);
  }
  function assertImportance(value, path) {
    assertFiniteNumber(value, 'importance', path);
    assert(Number.isInteger(value), 'importance must be an integer 1-10 (architecture doc section 20.5)', path);
    assert(value >= 1 && value <= 10, `importance must be between 1 and 10, got ${value}`, path);
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
      for (const alias of c.aliases || []) {
        assert(!seen.has(alias), `alias "${alias}" (on "${c.id}") collides with another criterion id or alias`, 'criteria');
        seen.add(alias);
      }
    }
    return true;
  }

  // Indexes by canonical id AND by any declared alias (renamed criteria keep the
  // old id resolvable -- Find_Your_Class_Criteria_Audit_and_Compass_Calibration_v1.md
  // section 2: "Keep a compatibility alias if the ID has already shipped").
  function indexCriteria(doc) {
    const byId = new Map();
    for (const c of (doc && doc.criteria) || []) {
      byId.set(c.id, c);
      for (const alias of c.aliases || []) byId.set(alias, c);
    }
    return byId;
  }

  // Fails a "capability" op field (rating) used against a directional criterion, or
  // a "directional" op field (position) used against a capability criterion -- this
  // is the exact class of bug a criterion-kind/operation-field mismatch produces
  // (e.g. writing desiredPosition against a capability-kind criterion).
  function checkKindMatch(criteriaIndex, criterionId, field, path) {
    if (!criteriaIndex || !criteriaIndex.has(criterionId)) return; // no index supplied/unknown id: skip, caller may check existence separately
    const kind = criteriaIndex.get(criterionId).kind;
    if (kind === 'capability') {
      assert(field !== 'position', `criterion "${criterionId}" is kind:"capability" and must be scored with "rating"/importance, not "position"`, path);
    } else if (kind === 'directional') {
      assert(field !== 'rating', `criterion "${criterionId}" is kind:"directional" and must be scored with "position", not "rating"`, path);
    }
  }

  // ---------------------------------------------------------------------
  // Compass calibration profiles (Find_Your_Class_Criteria_Audit_and_Compass_
  // Calibration_v1.md section 9) -- draft landmarks only, never promoted to
  // verified catalogue data through this loader. Validates every scored
  // criterionId exists (aliases included) and every score is an integer 1-10.
  // ---------------------------------------------------------------------
  // Compass profile file status must never claim "verified" -- these are always
  // editorial calibration/scoring landmarks, not production catalogue records
  // (Find_Your_Class_Criteria_Audit_and_Compass_Calibration_v1.md implementation
  // order step 6, reaffirmed by the Batch 01-06 hand-off's own instruction to
  // "keep all profiles as draft or needs-review").
  const COMPASS_PROFILE_ALLOWED_STATUSES = ['draft-editorial-calibration', 'draft-editorial-scoring', 'needs-review'];

  function validateCompassProfiles(doc, criteriaIndex) {
    assert(doc && COMPASS_PROFILE_ALLOWED_STATUSES.includes(doc.status), `compass profile file status must be one of ${COMPASS_PROFILE_ALLOWED_STATUSES.join(', ')} -- never import compass profiles as verified data`, 'compassProfiles');
    assert(Array.isArray(doc.profiles) && doc.profiles.length > 0, 'compass profile file must have a non-empty profiles array', 'compassProfiles');

    let numericIds = null, categoricalIds = null;
    if (criteriaIndex) {
      numericIds = new Set([...criteriaIndex.values()].filter(c => c.kind === 'capability' || c.kind === 'directional').map(c => c.id));
      categoricalIds = new Set([...criteriaIndex.values()].filter(c => c.kind === 'categorical').map(c => c.id));
    }

    const seen = new Set();
    for (const p of doc.profiles) {
      const path = `compass profile "${p && p.id}"`;
      assert(typeof p.id === 'string' && /^[a-z][a-z0-9-]*$/.test(p.id), 'id must be a kebab-case string', path);
      assert(!seen.has(p.id), `duplicate compass profile id "${p.id}"`, path);
      seen.add(p.id);
      assert(['archetype', 'class-path'].includes(p.entityType), 'entityType must be "archetype" or "class-path"', path);
      assert(typeof p.classId === 'string', 'classId is required', path);
      if (p.entityType === 'archetype') assert(typeof p.archetypeId === 'string' && p.archetypeId, 'archetype profiles require archetypeId', path);

      assert(p.scores && typeof p.scores === 'object', 'scores object is required', path);
      for (const [criterionId, value] of Object.entries(p.scores)) {
        if (criteriaIndex) assert(criteriaIndex.has(criterionId), `scores references unknown criterion "${criterionId}"`, path);
        assertCandidateValue(value, `scores["${criterionId}"]`, path);
      }
      if (numericIds) {
        const scoreKeys = new Set(Object.keys(p.scores));
        const missing = [...numericIds].filter(id => !scoreKeys.has(id));
        const extra = [...scoreKeys].filter(id => !numericIds.has(id));
        assert(missing.length === 0, `scores is missing ${missing.length} of the ${numericIds.size} numeric criteria: ${missing.join(', ')}`, path);
        assert(extra.length === 0, `scores has ${extra.length} key(s) outside the numeric criterion set: ${extra.join(', ')}`, path);
      }

      if (p.categories !== undefined) {
        assert(typeof p.categories === 'object', 'categories must be an object', path);
        for (const [criterionId, values] of Object.entries(p.categories)) {
          if (categoricalIds) assert(categoricalIds.has(criterionId), `categories references unknown criterion "${criterionId}"`, path);
          assert(Array.isArray(values), `categories["${criterionId}"] must be an array`, path);
        }
        if (categoricalIds) {
          const catKeys = new Set(Object.keys(p.categories));
          const missing = [...categoricalIds].filter(id => !catKeys.has(id));
          const extra = [...catKeys].filter(id => !categoricalIds.has(id));
          assert(missing.length === 0, `categories is missing ${missing.length} of the ${categoricalIds.size} categorical criteria: ${missing.join(', ')}`, path);
          assert(extra.length === 0, `categories has ${extra.length} key(s) outside the categorical criterion set: ${extra.join(', ')}`, path);
        }
      }

      if (p.compatibilityGates !== undefined) {
        assert(Array.isArray(p.compatibilityGates), 'compatibilityGates must be an array', path);
        for (const g of p.compatibilityGates) {
          assert(g && typeof g.type === 'string' && typeof g.rule === 'string' && typeof g.hard === 'boolean', 'each compatibilityGate needs type, rule and hard', path);
        }
      }
      if (p.materialAlternative !== undefined) {
        const m = p.materialAlternative;
        assert(m && typeof m.branchId === 'string', 'materialAlternative requires a branchId', path);
        if (m.scoreOverrides) for (const v of Object.values(m.scoreOverrides)) assertCandidateValue(v, 'materialAlternative.scoreOverrides value', path);
      }
    }
    return true;
  }

  // ---------------------------------------------------------------------
  // Typed operation vocabulary (Find_Your_Class_Product_Architecture_v1.md 10.3/10.4).
  // Each entry validates its inputs, then mutates a *clone* of the accumulating
  // effective profile in place. Operations that remove something must find it first
  // -- validation rule 20.13 ("removed inherited content exists before removal").
  // `criteriaIndex` (a Map from indexCriteria(), optional) enables the
  // criterion-kind/operation-field consistency check above.
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
    'set-capability': (profile, op, criteriaIndex) => {
      assert(typeof op.criterionId === 'string', 'set-capability requires a criterionId', 'operation');
      const hasRating = op.rating !== undefined, hasPosition = op.position !== undefined;
      assert(hasRating !== hasPosition, 'set-capability requires exactly one of rating or position', 'operation');
      checkKindMatch(criteriaIndex, op.criterionId, hasRating ? 'rating' : 'position', 'operation');
      assertCandidateValue(hasRating ? op.rating : op.position, hasRating ? 'rating' : 'position', `operation set-capability "${op.criterionId}"`);
      profile.capabilities = profile.capabilities || {};
      const entry = profile.capabilities[op.criterionId] || {};
      if (hasRating) entry.rating = op.rating;
      if (hasPosition) entry.position = op.position;
      if (op.confidence !== undefined) entry.confidence = op.confidence;
      if (op.evidenceRefs !== undefined) entry.evidenceRefs = op.evidenceRefs;
      profile.capabilities[op.criterionId] = entry;
    },
    'adjust-capability': (profile, op) => {
      assert(typeof op.criterionId === 'string', 'adjust-capability requires a criterionId', 'operation');
      assertFiniteNumber(op.delta, 'delta', `operation adjust-capability "${op.criterionId}"`);
      const entry = (profile.capabilities && profile.capabilities[op.criterionId]) || null;
      assert(entry, `adjust-capability: "${op.criterionId}" has no existing rating/position to adjust`, 'operation');
      const field = entry.rating !== undefined ? 'rating' : 'position';
      entry[field] = Math.max(1, Math.min(10, Math.round(entry[field] + op.delta)));
    },
    'set-directional-position': (profile, op, criteriaIndex) => {
      assert(typeof op.position === 'number', 'set-directional-position requires a numeric position', 'operation');
      OPERATIONS['set-capability'](profile, { criterionId: op.criterionId, position: op.position }, criteriaIndex);
    },
    'add-fantasy-tag': (profile, op) => {
      assert(typeof op.tagId === 'string' && op.tagId.length > 0, 'add-fantasy-tag requires a tagId', 'operation');
      assertCandidateValue(op.strength, 'strength', `operation add-fantasy-tag "${op.tagId}"`);
      const tags = ensureArrayPath(profile, 'identity', 'fantasyTags');
      const existing = tags.find(t => t.id === op.tagId);
      if (existing) existing.strength = op.strength;
      else tags.push({ id: op.tagId, strength: op.strength });
    },
    'remove-fantasy-tag': (profile, op) => {
      assert(typeof op.tagId === 'string', 'remove-fantasy-tag requires a tagId', 'operation');
      const tags = ensureArrayPath(profile, 'identity', 'fantasyTags');
      const idx = tags.findIndex(t => t.id === op.tagId);
      assert(idx >= 0, `remove-fantasy-tag: "${op.tagId}" not present on inherited profile`, 'operation');
      tags.splice(idx, 1);
    },
    'add-category-value': (profile, op) => {
      assert(typeof op.criterionId === 'string' && typeof op.value === 'string', 'add-category-value requires criterionId and a string value', 'operation');
      const arr = ensureArrayPath(profile, 'categories', op.criterionId);
      if (!arr.includes(op.value)) arr.push(op.value);
    },
    'remove-category-value': (profile, op) => {
      assert(typeof op.criterionId === 'string' && typeof op.value === 'string', 'remove-category-value requires criterionId and a string value', 'operation');
      const arr = ensureArrayPath(profile, 'categories', op.criterionId);
      const idx = arr.indexOf(op.value);
      assert(idx >= 0, `remove-category-value: "${op.value}" not present on inherited "${op.criterionId}"`, 'operation');
      arr.splice(idx, 1);
    },
    'set-category-values': (profile, op) => {
      assert(typeof op.criterionId === 'string' && Array.isArray(op.values) && op.values.every(v => typeof v === 'string'), 'set-category-values requires criterionId and a string array', 'operation');
      profile.categories = profile.categories || {};
      profile.categories[op.criterionId] = op.values.slice();
    },
    'add-strength-fragment': (profile, op) => {
      assert(typeof op.fragmentId === 'string', 'add-strength-fragment requires a fragmentId', 'operation');
      const arr = ensureArrayPath(profile, 'explanationProfile', 'strengthFragmentIds');
      if (!arr.includes(op.fragmentId)) arr.push(op.fragmentId);
    },
    'remove-strength-fragment': (profile, op) => {
      assert(typeof op.fragmentId === 'string', 'remove-strength-fragment requires a fragmentId', 'operation');
      const arr = ensureArrayPath(profile, 'explanationProfile', 'strengthFragmentIds');
      const idx = arr.indexOf(op.fragmentId);
      assert(idx >= 0, `remove-strength-fragment: "${op.fragmentId}" not present`, 'operation');
      arr.splice(idx, 1);
    },
    'add-tradeoff-fragment': (profile, op) => {
      assert(typeof op.fragmentId === 'string', 'add-tradeoff-fragment requires a fragmentId', 'operation');
      const arr = ensureArrayPath(profile, 'explanationProfile', 'tradeoffFragmentIds');
      if (!arr.includes(op.fragmentId)) arr.push(op.fragmentId);
    },
    'remove-tradeoff-fragment': (profile, op) => {
      assert(typeof op.fragmentId === 'string', 'remove-tradeoff-fragment requires a fragmentId', 'operation');
      const arr = ensureArrayPath(profile, 'explanationProfile', 'tradeoffFragmentIds');
      const idx = arr.indexOf(op.fragmentId);
      assert(idx >= 0, `remove-tradeoff-fragment: "${op.fragmentId}" not present`, 'operation');
      arr.splice(idx, 1);
    },
    'add-rules-restriction': (profile, op) => {
      const r = op.restriction;
      assert(r && typeof r.id === 'string' && typeof r.type === 'string' && typeof r.operator === 'string' && 'value' in r && typeof r.sourceRef === 'string', 'add-rules-restriction requires a restriction with id, type, operator, value and sourceRef', 'operation');
      const arr = ensureArrayPath(profile, 'rulesRestrictions');
      assert(!arr.some(x => x.id === r.id), `add-rules-restriction: "${r.id}" already present`, 'operation');
      arr.push(r);
    },
    'remove-rules-restriction': (profile, op) => {
      assert(typeof op.id === 'string', 'remove-rules-restriction requires an id', 'operation');
      const arr = ensureArrayPath(profile, 'rulesRestrictions');
      const idx = arr.findIndex(r => r.id === op.id);
      assert(idx >= 0, `remove-rules-restriction: "${op.id}" not present on inherited profile`, 'operation');
      arr.splice(idx, 1);
    },
    'add-dependency': (profile, op) => {
      const d = op.dependency;
      assert(d && typeof d.id === 'string' && typeof d.type === 'string' && ['mild', 'moderate', 'strong'].includes(d.severity), 'add-dependency requires a dependency with id, type and a valid severity', 'operation');
      const arr = ensureArrayPath(profile, 'dependencies');
      assert(!arr.some(x => x.id === d.id), `add-dependency: "${d.id}" already present`, 'operation');
      arr.push(d);
    },
    'remove-dependency': (profile, op) => {
      assert(typeof op.id === 'string', 'remove-dependency requires an id', 'operation');
      const arr = ensureArrayPath(profile, 'dependencies');
      const idx = arr.findIndex(d => d.id === op.id);
      assert(idx >= 0, `remove-dependency: "${op.id}" not present on inherited profile`, 'operation');
      arr.splice(idx, 1);
    },
    'set-progression-band': (profile, op) => {
      assert(['low', 'mid', 'high'].includes(op.band), 'set-progression-band requires band to be low/mid/high', 'operation');
      assertFiniteNumber(op.value, 'value', `operation set-progression-band "${op.band}"`);
      profile.progression = profile.progression || {};
      profile.progression.bands = profile.progression.bands || {};
      profile.progression.bands[op.band] = op.value;
    },
    'add-concept-online-entry': (profile, op) => {
      assert(typeof op.conceptTag === 'string', 'add-concept-online-entry requires a conceptTag', 'operation');
      assert(Number.isInteger(op.level) && op.level >= 1 && op.level <= 20, 'add-concept-online-entry requires an integer level 1-20', 'operation');
      const arr = ensureArrayPath(profile, 'progression', 'conceptOnline');
      arr.push({ conceptTag: op.conceptTag, level: op.level });
    },
  };

  function applyOperation(profile, op, criteriaIndex) {
    const fn = OPERATIONS[op.op];
    assert(fn, `unknown operation "${op.op}" -- not in the closed operation vocabulary (assets/find-your-class/vocabularies.json)`, 'operation');
    fn(profile, op, criteriaIndex);
    return profile;
  }

  function clone(value) {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
  }

  // Resolve base class + zero or more deltas (archetype, then options, in the order
  // they apply) into one effective profile. Returns the effective profile with
  // componentIds recording "base + archetype + option" (architecture 10.2/13.1).
  //
  // opts.criteriaIndex (optional, from indexCriteria()) additionally rejects an
  // operation whose field (rating vs position) doesn't match the target criterion's
  // declared kind.
  //
  // Compatibility checks (architecture 10.3/10.4, blueprint's own archetype/option
  // model): an archetype delta must declare parentId === the base class id; an
  // option delta must declare parentClassId === the base class id and a
  // optionFamilyId, and at most one option per optionFamilyId may be applied in one
  // resolution (e.g. only one Sorcerer bloodline); two archetype deltas that name
  // each other in compatibility.incompatibleArchetypeIds (in either direction)
  // cannot be applied together.
  function resolveEffectiveProfile(baseClassProfile, deltas, opts) {
    opts = opts || {};
    assert(baseClassProfile && baseClassProfile.entityType === 'class', 'resolveEffectiveProfile requires a class entity as the base', 'resolveEffectiveProfile');
    let profile = clone(baseClassProfile);
    profile.entityType = 'effective';
    profile.componentIds = [baseClassProfile.id];

    const appliedArchetypes = [];
    const appliedOptionFamilies = new Set();

    for (const delta of deltas || []) {
      assert(delta && Array.isArray(delta.operations), `delta "${delta && delta.id}" has no operations array`, 'resolveEffectiveProfile');
      assert(delta.entityType === 'archetype' || delta.entityType === 'option', `delta "${delta.id}" must declare entityType "archetype" or "option"`, 'resolveEffectiveProfile');

      if (delta.entityType === 'archetype') {
        assert(delta.parentId === baseClassProfile.id, `archetype "${delta.id}" belongs to class "${delta.parentId}", not "${baseClassProfile.id}"`, 'resolveEffectiveProfile');
        for (const prev of appliedArchetypes) {
          const prevIncompatible = (prev.compatibility && prev.compatibility.incompatibleArchetypeIds) || [];
          const currIncompatible = (delta.compatibility && delta.compatibility.incompatibleArchetypeIds) || [];
          assert(!prevIncompatible.includes(delta.id) && !currIncompatible.includes(prev.id), `archetypes "${prev.id}" and "${delta.id}" are marked incompatible and cannot be combined`, 'resolveEffectiveProfile');
        }
        appliedArchetypes.push(delta);
      } else {
        assert(delta.parentClassId === baseClassProfile.id, `option "${delta.id}" belongs to class "${delta.parentClassId}", not "${baseClassProfile.id}"`, 'resolveEffectiveProfile');
        assert(typeof delta.optionFamilyId === 'string' && delta.optionFamilyId.length > 0, `option "${delta.id}" is missing optionFamilyId`, 'resolveEffectiveProfile');
        assert(!appliedOptionFamilies.has(delta.optionFamilyId), `two options from the same family "${delta.optionFamilyId}" were both applied (only one is allowed per resolution)`, 'resolveEffectiveProfile');
        appliedOptionFamilies.add(delta.optionFamilyId);
      }

      for (const op of delta.operations) applyOperation(profile, op, opts.criteriaIndex);
      profile.componentIds.push(delta.id);
    }
    return profile;
  }

  // ---------------------------------------------------------------------
  // Scoring (Find_Your_Class_Product_Architecture_v1.md 13.2/13.3).
  // Unknown candidate data returns { unknown: true } and must be excluded from both
  // numerator and denominator by the caller (13.5) -- never treated as a low score.
  // notRelevant preferences must be filtered out by the caller before scoring at all.
  // Every numeric input is validated; out-of-range or non-numeric input throws
  // ValidationError rather than silently producing a wrong score.
  // ---------------------------------------------------------------------
  function importanceWeight(importance) {
    assertImportance(importance, 'importanceWeight');
    return Math.pow(importance / 10, 1.5);
  }

  function scoreCapabilityFit(candidateRating, importance) {
    if (candidateRating === undefined || candidateRating === null) return { unknown: true };
    assertCandidateValue(candidateRating, 'candidateRating', 'scoreCapabilityFit');
    const weight = importanceWeight(importance);
    const fit = (candidateRating - 1) / 9;
    return { unknown: false, fit, weightedFit: fit * weight };
  }

  function scoreDirectionalFit(candidatePosition, desiredPosition, importance) {
    if (candidatePosition === undefined || candidatePosition === null) return { unknown: true };
    assertCandidateValue(candidatePosition, 'candidatePosition', 'scoreDirectionalFit');
    assertDesiredPosition(desiredPosition, 'scoreDirectionalFit');
    const weight = importanceWeight(importance);
    const distance = Math.abs(candidatePosition - desiredPosition) / 9;
    const fit = 1 - distance;
    return { unknown: false, fit, weightedFit: fit * weight };
  }

  return {
    ValidationError,
    validateManifest,
    validateCriterion,
    validateCriteriaFile,
    validateCompassProfiles,
    indexCriteria,
    OPERATIONS_VOCABULARY: Object.keys(OPERATIONS),
    applyOperation,
    resolveEffectiveProfile,
    importanceWeight,
    scoreCapabilityFit,
    scoreDirectionalFit,
  };
}));
