// Find Your Class v2 -- matching engine over the 140 resolved profiles (40
// class-paths + 100 archetypes) from loader.js's resolveAllProfiles(). Ported
// from ../matcher.js's (v1) overall shape -- importance weighting, eligibility
// gates, best-overall/different-approach/more-approachable/unexpected-fit role
// selection -- but rebuilt for v2's three-level ordinal scale (no numeric
// desiredPosition/1-10 catalogue score) since there is no v2 hand-off spec
// yet (unlike v1's own FIND_YOUR_CLASS_MATCHING_ENGINE_HANDOFF.md). Every
// scoring/eligibility rule below that is this module's own interpretation,
// not something the v2 data files themselves dictate, is marked
// INTERPRETATION: at the point of use, collected in V2_AMBIGUITY_NOTES at the
// bottom -- report these to Codex/the user before treating this as final.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./loader.js'));
  else root.PFFindYourClassMatcherV2 = factory(root.PFFindYourClassV2);
}(typeof self !== 'undefined' ? self : this, function (V2) {
  'use strict';

  const CAPABILITY_RANK = V2.CAPABILITY_RANK;
  const PRACTICAL_RANK = V2.PRACTICAL_RANK;

  // INTERPRETATION: importance (1-10) is weighted with the same
  // (importance/10)^1.5 curve v1 used -- carried over deliberately for
  // continuity of "feel" between the two systems, not re-derived from any
  // v2-specific guidance (none exists).
  function importanceWeight(importance) { return Math.pow((importance || 5) / 10, 1.5); }

  // INTERPRETATION: a "core" desire is scored by how close the candidate's
  // own rank is to core (absent=0, available=0.5, core=1). An "available"
  // desire is treated as a satisfied THRESHOLD ("I want at least some of
  // this"), not a preference for exactly the middle rung -- core equally
  // satisfies an "available" ask, matching how a player would actually read
  // the request ("I'd like some social skill" is not disappointed by a
  // character who turns out to be a social master).
  function capabilityFit(desiredLevel, candidateLevel) {
    const rank = CAPABILITY_RANK[candidateLevel];
    if (desiredLevel === 'core') return rank / 2;
    return rank >= 1 ? 1 : 0;
  }

  // INTERPRETATION: practical ratings (build-complexity etc.) are directional
  // -- a player asking for "low" complexity is progressively less satisfied
  // the further the candidate sits from low, not just pass/fail.
  function practicalFit(desiredLevel, candidateLevel) {
    const distance = Math.abs(PRACTICAL_RANK[desiredLevel] - PRACTICAL_RANK[candidateLevel]);
    return distance === 0 ? 1 : distance === 1 ? 0.5 : 0;
  }

  function factFit(desired, actual) { return desired === actual ? 1 : 0; }

  function scoreCandidate(profile, request) {
    let weightedSum = 0;
    let weightTotal = 0;
    const matchedCriteria = [];

    for (const [id, pref] of Object.entries(request.capabilityPreferences || {})) {
      if (!pref || pref.notRelevant) continue;
      const w = importanceWeight(pref.importance);
      const fit = capabilityFit(pref.desiredLevel, profile.capabilities[id]);
      weightedSum += fit * w; weightTotal += w;
      if (fit >= 0.75) matchedCriteria.push({ kind: 'capability', id, fit });
    }
    for (const [id, pref] of Object.entries(request.practicalPreferences || {})) {
      if (!pref || pref.notRelevant) continue;
      const w = importanceWeight(pref.importance);
      const fit = practicalFit(pref.desiredLevel, profile.practical[id]);
      weightedSum += fit * w; weightTotal += w;
      if (fit >= 0.75) matchedCriteria.push({ kind: 'practical', id, fit });
    }
    for (const [id, pref] of Object.entries(request.factPreferences || {})) {
      if (!pref || pref.notRelevant) continue;
      const w = importanceWeight(pref.importance);
      const fit = factFit(pref.desired, profile.facts[id]);
      weightedSum += fit * w; weightTotal += w;
      if (fit >= 0.75) matchedCriteria.push({ kind: 'fact', id, fit });
    }
    for (const [category, pref] of Object.entries(request.identityPreferences || {})) {
      if (!pref || pref.notRelevant || pref.mode !== 'prefer' || !pref.values || !pref.values.length) continue;
      const w = importanceWeight(pref.importance);
      const hasOverlap = (profile.identity[category] || []).some(v => pref.values.includes(v));
      const fit = hasOverlap ? 1 : 0;
      weightedSum += fit * w; weightTotal += w;
      if (fit >= 0.75) matchedCriteria.push({ kind: 'identity', id: category, fit });
    }

    const overallFit = weightTotal > 0 ? weightedSum / weightTotal : 0;
    return { overallFit, matchedCriteria, weightTotal };
  }

  // ---------------------------------------------------------------------
  // Eligibility. identityPreferences with mode 'require'/'exclude' are pure
  // gates (never scored). Constraints of kind "requirement" gate eligibility
  // until the player accepts them (via request.gateAnswers, keyed by a
  // stable synthesised id "<profileId>:<constraintType>" -- v2's constraint
  // objects carry no id of their own, unlike v1's compatibilityGates, so one
  // is derived the same way v1 originally needed for its own gates).
  // INTERPRETATION: "commitment" and "theme" constraints never block
  // eligibility, only get disclosed -- mirrors v1's commitment/soft kinds.
  // ---------------------------------------------------------------------
  function constraintId(profile, constraint) { return `${profile.id}:${constraint.type}`; }

  function evaluateEligibility(profile, request) {
    const reasons = [];
    const disclosures = [];
    const needsConfirmation = [];

    for (const [category, pref] of Object.entries(request.identityPreferences || {})) {
      if (!pref || pref.notRelevant || !pref.values || !pref.values.length) continue;
      const values = profile.identity[category] || [];
      if (pref.mode === 'require' && !values.some(v => pref.values.includes(v))) {
        reasons.push({ rule: `Requires ${category} to be one of: ${pref.values.join(', ')}.` });
      }
      if (pref.mode === 'exclude' && values.some(v => pref.values.includes(v))) {
        reasons.push({ rule: `Excludes ${category} being one of: ${pref.values.join(', ')}.` });
      }
    }

    for (const constraint of profile.constraints || []) {
      const id = constraintId(profile, constraint);
      const answer = (request.gateAnswers || {})[id];
      if (constraint.kind === 'requirement') {
        if (answer && answer.status === 'satisfied') disclosures.push({ id, rule: constraint.summary });
        else if (answer && answer.status === 'conflict') reasons.push({ id, rule: constraint.summary });
        else needsConfirmation.push({ id, type: constraint.type, kind: constraint.kind, rule: constraint.summary, confirmationPrompt: constraint.confirmationPrompt || `Does your concept satisfy this: ${constraint.summary}` });
      } else {
        disclosures.push({ id, rule: constraint.summary, kind: constraint.kind });
      }
    }

    const status = reasons.length ? 'ineligible' : needsConfirmation.length ? 'needs-confirmation' : 'eligible';
    return { status, reasons, disclosures, needsConfirmation };
  }

  function rankCandidates(profiles, request) {
    return profiles.map(profile => {
      const scored = scoreCandidate(profile, request);
      const eligibility = evaluateEligibility(profile, request);
      return { profile, ...scored, eligibility };
    }).sort((a, b) => b.overallFit - a.overallFit);
  }

  // ---------------------------------------------------------------------
  // Role selection. INTERPRETATION: this reuses v1's four-role shape
  // (best-overall / different-approach / more-approachable / unexpected-fit)
  // for continuity of the player-facing experience, since no v2-specific
  // role spec exists. A role is omitted (never forced) when no eligible
  // candidate qualifies.
  // ---------------------------------------------------------------------
  const FIT_FLOOR = 0.58;

  function primaryIdentity(profile) {
    // A coarse "what kind of thing is this" fingerprint used only to decide
    // whether a candidate is a meaningfully DIFFERENT approach from the
    // best-overall pick -- not shown to the player.
    const magic = (profile.identity.magicIdentity || []).filter(v => v !== 'none');
    return {
      classId: profile.classId,
      primaryDelivery: (profile.identity.primaryDelivery || []).slice().sort().join('|'),
      magic: magic.slice().sort().join('|'),
    };
  }

  function differsInApproach(a, b) {
    const fa = primaryIdentity(a), fb = primaryIdentity(b);
    return fa.classId !== fb.classId || fa.primaryDelivery !== fb.primaryDelivery || fa.magic !== fb.magic;
  }

  function topPreferenceIds(request) {
    const all = [];
    for (const [id, pref] of Object.entries(request.capabilityPreferences || {})) {
      if (pref && !pref.notRelevant) all.push({ kind: 'capability', id, importance: pref.importance || 5 });
    }
    if (!all.length) return [];
    const maxImportance = Math.max(...all.map(p => p.importance));
    return all.filter(p => p.importance === maxImportance);
  }

  function selectRoles(ranked, request, maxResults) {
    const eligible = ranked.filter(r => r.eligibility.status !== 'ineligible');
    const usedIds = new Set();
    const roles = [];

    function take(role, candidate) {
      if (!candidate || usedIds.has(candidate.profile.id)) return false;
      usedIds.add(candidate.profile.id);
      roles.push({ role, ...candidate });
      return true;
    }

    const best = eligible[0];
    if (best) take('best-overall', best);

    if (best) {
      const alt = eligible.find(r => !usedIds.has(r.profile.id) && r.overallFit >= FIT_FLOOR && differsInApproach(r.profile, best.profile));
      if (alt) take('different-approach', alt);
    }

    if (best) {
      const topPrefs = topPreferenceIds(request);
      const approachable = eligible.find(r => {
        if (usedIds.has(r.profile.id)) return false;
        if (r.overallFit < FIT_FLOOR) return false;
        const simplerOrEqual = PRACTICAL_RANK[r.profile.practical['build-complexity']] <= PRACTICAL_RANK[best.profile.practical['build-complexity']]
          && PRACTICAL_RANK[r.profile.practical['play-complexity']] <= PRACTICAL_RANK[best.profile.practical['play-complexity']];
        if (!simplerOrEqual) return false;
        if (!topPrefs.length) return true;
        return topPrefs.every(p => {
          const m = r.matchedCriteria.find(mc => mc.kind === p.kind && mc.id === p.id);
          return m && m.fit >= 0.75;
        });
      });
      if (approachable) take('more-approachable', approachable);
    }

    const surprising = eligible.find(r => !usedIds.has(r.profile.id) && r.matchedCriteria.length > 0 &&
      (!best || primaryIdentity(r.profile).classId !== primaryIdentity(best.profile).classId));
    if (surprising) take('unexpected-fit', surprising);

    return roles.slice(0, maxResults || 4);
  }

  // ---------------------------------------------------------------------
  // Presentation. No v2 explanation-fragment catalogue exists yet (v1's
  // explanation-templates.json has hand-authored sentences per criterion
  // value; nothing equivalent has been built for v2). INTERPRETATION: falls
  // back to v2's own criteria.json `playerLabel` fields to build plain,
  // non-statistical sentences -- flagged as a real content-quality gap for a
  // future authored-fragment pass, exactly like the equivalent v1 gap that
  // was later closed with a dedicated editorial catalogue.
  // ---------------------------------------------------------------------
  function fitBandFor(candidate, role) {
    if (candidate.overallFit >= 0.72) return 'best-fit';
    if (candidate.overallFit >= FIT_FLOOR) return role === 'best-overall' ? 'provisional' : 'worth-considering';
    return role === 'best-overall' ? 'provisional' : 'specialised-alternative';
  }

  function buildWhyItFits(candidate, criteriaIndex) {
    const sentences = candidate.matchedCriteria
      .filter(m => m.kind === 'capability')
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 2)
      .map(m => {
        const c = criteriaIndex.get(m.id);
        return `You want ${lowerFirst(c ? c.playerLabel : m.id)}, and this path delivers.`;
      });
    if (sentences.length) return sentences;
    return [`${candidate.profile.name} is the strongest connection to what you asked for, even without one single standout match.`];
  }

  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  function buildWatchFor(candidate) {
    const watch = [];
    if (candidate.profile.tradeoff) watch.push(candidate.profile.tradeoff);
    for (const d of candidate.eligibility.disclosures) watch.push(d.rule);
    return watch.slice(0, 2);
  }

  function buildResult(candidate, role, criteriaIndex) {
    const p = candidate.profile;
    return {
      id: p.id,
      role,
      entityType: p.entityType,
      classId: p.classId,
      title: p.name,
      parentLabel: p.entityType === 'archetype' ? capitalize(p.classId) : null,
      summary: p.entityType === 'class-path' ? (p.playerSummary || `${p.name} is a class path.`) : (p.playerSummary || `${p.name} is a ${capitalize(p.classId)} archetype.`),
      whyItFits: buildWhyItFits(candidate, criteriaIndex),
      watchFor: buildWatchFor(candidate),
      requirements: candidate.eligibility.disclosures.map(d => d.rule),
      fitBand: fitBandFor(candidate, role),
      sourceUrl: p.sourceUrl,
    };
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function matchProfiles(request, profiles, criteriaIndex, options) {
    const ranked = rankCandidates(profiles, request);
    const roles = selectRoles(ranked, request, (options && options.maxResults) || 4);
    const recommendations = roles.map(c => buildResult(c, c.role, criteriaIndex));
    const bestFit = ranked.find(r => r.eligibility.status !== 'ineligible');
    const confidence = !bestFit ? 'low' : bestFit.overallFit >= 0.72 ? 'high' : bestFit.overallFit >= FIT_FLOOR ? 'medium' : 'low';
    return { recommendations, confidence, _internal: { ranked } };
  }

  return {
    scoreCandidate, evaluateEligibility, rankCandidates, selectRoles, matchProfiles,
    capabilityFit, practicalFit, factFit, importanceWeight, constraintId,
  };
}));

// V2_AMBIGUITY_NOTES (see the INTERPRETATION comments above for each one in
// context): (1) capability fit formula for "core" vs "available" desires is
// invented, not spec'd; (2) importance weighting curve carried over from v1
// unchanged; (3) practical-rating fit is a 3-step distance function; (4)
// constraint ids are synthesised (profileId:type) since v2's constraint
// objects have none; (5) the four-role system and its thresholds are ported
// from v1 wholesale, not re-derived for v2's coarser ordinal scale; (6)
// whyItFits/watchFor use a generic playerLabel-based sentence template since
// no v2 editorial explanation catalogue exists yet.
