// Find Your Class -- deterministic matching engine (MVP).
// Implements FIND_YOUR_CLASS_MATCHING_ENGINE_HANDOFF.md. Reuses loader.js's
// validation/scoring primitives; adds no framework dependency; same Node/browser
// dual-export pattern as loader.js and matcher.js's own sibling.
//
// A number of product decisions in the handoff are under-specified for a purely
// mechanical implementation. Every one of them is called out at the point it is
// resolved with an "INTERPRETATION:" comment, and summarized again at the bottom
// of this file in AMBIGUITY_NOTES. Nothing below was decided silently.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./loader.js'));
  else root.PFFindYourClassMatcher = factory(root.PFFindYourClass);
}(typeof self !== 'undefined' ? self : this, function (FYC) {
  'use strict';

  function ValidationError(message, path) {
    this.name = 'ValidationError';
    this.message = path ? `${path}: ${message}` : message;
    this.path = path;
  }
  ValidationError.prototype = Object.create(Error.prototype);
  function assert(cond, message, path) { if (!cond) throw new ValidationError(message, path); }

  const MATCHED_THRESHOLD = 0.72;
  const TENSION_THRESHOLD = 0.45;
  // INTERPRETATION: "high-importance" is used by the different-approach role and
  // by selectNextQuestion's gate-priority rule but is never given a number in the
  // handoff. 8 is chosen to match this project's own prior convention (the pilot
  // question bank's own importanceHint:"high" mutations were calibrated to
  // roughly 8-9 in this repo's earlier work) -- see AMBIGUITY_NOTES #1.
  const HIGH_IMPORTANCE_THRESHOLD = 8;
  // INTERPRETATION: "numeric range at least 3" is given explicitly for
  // selectNextQuestion's own criterion-separation check; reused here as the
  // definition of "meaningfully different" for different-approach's numeric
  // comparison, for the same reason -- see AMBIGUITY_NOTES #2.
  const MEANINGFUL_NUMERIC_SEPARATION = 3;
  const UNEXPECTED_FIT_MAX_GAP = 0.12;
  const RESULT_ROLES = ['best-overall', 'different-approach', 'more-approachable', 'unexpected-fit'];

  // ---------------------------------------------------------------------
  // validatePreferenceRequest
  // ---------------------------------------------------------------------
  function validatePreferenceRequest(request, criteriaDoc) {
    assert(request && typeof request === 'object', 'request must be an object', 'request');
    assert(request.schemaVersion === 1, 'request.schemaVersion must be 1', 'request');
    const criteriaIndex = FYC.indexCriteria(criteriaDoc);

    const numericPreferences = request.numericPreferences || {};
    for (const [criterionId, pref] of Object.entries(numericPreferences)) {
      const path = `numericPreferences["${criterionId}"]`;
      const crit = criteriaIndex.get(criterionId);
      assert(crit, `unknown criterion id`, path);
      assert(crit.kind === 'capability' || crit.kind === 'directional', 'numericPreferences criteria must be capability or directional', path);

      if (pref.notRelevant === true) {
        assert(pref.importance === undefined && pref.desiredPosition === undefined, 'notRelevant:true cannot coexist with importance or desiredPosition', path);
        continue;
      }
      assert(Number.isInteger(pref.importance) && pref.importance >= 1 && pref.importance <= 10, 'active numeric preference requires integer importance 1-10', path);
      if (crit.kind === 'capability') {
        assert(pref.desiredPosition === undefined, 'desiredPosition is not valid on a capability criterion', path);
      } else {
        assert(pref.desiredPosition !== undefined, 'an active directional criterion requires desiredPosition', path);
        assert(typeof pref.desiredPosition === 'number' && pref.desiredPosition >= 1 && pref.desiredPosition <= 10, 'desiredPosition must be a number 1-10', path);
      }
    }

    const categoricalPreferences = request.categoricalPreferences || {};
    const catValuesById = new Map(criteriaDoc.criteria.filter(c => c.kind === 'categorical').map(c => [c.id, new Set(c.values)]));
    for (const [criterionId, pref] of Object.entries(categoricalPreferences)) {
      const path = `categoricalPreferences["${criterionId}"]`;
      assert(catValuesById.has(criterionId), 'unknown categorical criterion id', path);
      assert(['prefer', 'require', 'exclude'].includes(pref.mode), 'mode must be prefer, require or exclude', path);
      assert(Array.isArray(pref.values), 'values must be an array', path);
      if (pref.mode === 'require' || pref.mode === 'exclude') {
        assert(pref.values.length >= 1, `${pref.mode} needs at least one value`, path);
      }
      for (const v of pref.values) {
        assert(catValuesById.get(criterionId).has(v), `unknown categorical value "${v}"`, path);
      }
      if (pref.mode === 'prefer') {
        assert(Number.isInteger(pref.importance) && pref.importance >= 1 && pref.importance <= 10, 'a "prefer" categorical preference requires integer importance 1-10', path);
      }
      // INTERPRETATION: "a category cannot require and exclude the same value
      // after preferences are merged" cannot be violated by this request shape
      // (categoricalPreferences has at most one mode per criterionId, so a
      // single criterion can never simultaneously carry both a require and an
      // exclude entry). Implemented as a no-op-safe check for forward
      // compatibility with a future shape that allows multiple entries per
      // criterion -- see AMBIGUITY_NOTES #3.
    }

    if (request.conductPreferences) {
      const cp = request.conductPreferences;
      const path = 'conductPreferences';
      assert(['avoid', 'accept', 'welcome'].includes(cp.stance), 'stance must be avoid, accept or welcome', path);
      if (cp.importance !== undefined) assert(Number.isInteger(cp.importance) && cp.importance >= 1 && cp.importance <= 10, 'importance must be integer 1-10', path);
      assert(Array.isArray(cp.acceptedCodePresence), 'acceptedCodePresence must be an array', path);
      assert(Array.isArray(cp.acceptedMechanicalLossRisk), 'acceptedMechanicalLossRisk must be an array', path);
    }

    return true;
  }

  // ---------------------------------------------------------------------
  // expandCandidateBranches
  // ---------------------------------------------------------------------
  function cloneJson(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }

  function expandCandidateBranches(profiles) {
    const candidates = [];
    for (const profile of profiles) {
      candidates.push({
        internalId: profile.id,
        profile,
        isBranch: false,
        baseProfileId: profile.id,
        branchId: profile.branchId || null,
      });
      if (profile.materialAlternative) {
        const alt = profile.materialAlternative;
        const branched = cloneJson(profile);
        delete branched.materialAlternative;
        branched.branchId = alt.branchId;
        Object.assign(branched.scores, alt.scoreOverrides || {});
        Object.assign(branched.categories, alt.categoryOverrides || {});
        candidates.push({
          internalId: `${profile.id}::${alt.branchId}`,
          profile: branched,
          isBranch: true,
          baseProfileId: profile.id,
          branchId: alt.branchId,
        });
      }
    }
    return candidates;
  }

  // ---------------------------------------------------------------------
  // evaluateEligibility
  // ---------------------------------------------------------------------
  // INTERPRETATION: compatibilityGates entries carry only a free-text `rule`
  // and a `hard` boolean -- there is no structured field connecting a specific
  // gateAnswers value to "this candidate's gate is satisfied". The handoff's own
  // gateAnswers example ({value, confirmed}) gives no comparison contract either.
  // Resolution used here: a hard gate is satisfied by any *confirmed* answer for
  // its `type` UNLESS that answer's value is exactly the sentinel string
  // "conflict" (a caller who knows the answer conflicts sets value:"conflict";
  // any other confirmed value is treated as compliant). This is the minimum
  // machinery needed to make rules 9/10 ("confirmed conflict -> ineligible",
  // "unanswered -> needs-confirmation") testable and correct for the one
  // structured signal we actually have. See AMBIGUITY_NOTES #4 -- this needs
  // real product input once gates carry structured requirements.
  function resolveHardGate(gate, gateAnswers) {
    const answer = gateAnswers && gateAnswers[gate.type];
    if (!answer || answer.confirmed !== true) return 'needs-confirmation';
    return answer.value === 'conflict' ? 'conflict' : 'satisfied';
  }

  function evaluateEligibility(candidate, request) {
    const profile = candidate.profile;
    const reasons = [];
    const warnings = [];
    let status = 'eligible';
    let unresolvedGate = null;

    for (const gate of profile.compatibilityGates || []) {
      if (!gate.hard) {
        warnings.push({ type: gate.type, rule: gate.rule });
        continue;
      }
      const resolution = resolveHardGate(gate, request.gateAnswers);
      if (resolution === 'conflict') {
        status = 'ineligible';
        reasons.push({ type: gate.type, rule: gate.rule, cause: 'hard-gate-conflict' });
      } else if (resolution === 'needs-confirmation') {
        if (status !== 'ineligible') status = 'needs-confirmation';
        if (!unresolvedGate) unresolvedGate = gate;
        reasons.push({ type: gate.type, rule: gate.rule, cause: 'unresolved-hard-gate' });
      }
    }

    const categoricalPreferences = request.categoricalPreferences || {};
    for (const [criterionId, pref] of Object.entries(categoricalPreferences)) {
      const candidateValues = (profile.categories && profile.categories[criterionId]) || [];
      if (pref.mode === 'require') {
        const overlap = pref.values.some(v => candidateValues.includes(v));
        if (!overlap) { status = 'ineligible'; reasons.push({ type: criterionId, cause: 'categorical-require-mismatch' }); }
      } else if (pref.mode === 'exclude') {
        const overlap = pref.values.some(v => candidateValues.includes(v));
        if (overlap) { status = 'ineligible'; reasons.push({ type: criterionId, cause: 'categorical-exclude-overlap' }); }
      }
    }

    if (request.conductPreferences && profile.conduct) {
      const cp = request.conductPreferences;
      const conduct = profile.conduct;
      const codeUnacceptable = !cp.acceptedCodePresence.includes(conduct.codePresence);
      const lossUnacceptable = !cp.acceptedMechanicalLossRisk.includes(conduct.mechanicalLossRisk);
      if (codeUnacceptable || lossUnacceptable) {
        if (cp.stance === 'avoid') {
          status = status === 'ineligible' ? status : 'ineligible';
          reasons.push({ type: 'conduct', cause: codeUnacceptable ? 'conduct-code-unacceptable' : 'conduct-loss-risk-unacceptable' });
        } else {
          warnings.push({ type: 'conduct', rule: `codePresence:${conduct.codePresence}, mechanicalLossRisk:${conduct.mechanicalLossRisk}` });
        }
      }
    }

    return { status, reasons, warnings, unresolvedGate };
  }

  // ---------------------------------------------------------------------
  // scoreCandidate
  // ---------------------------------------------------------------------
  function scoreCandidate(candidate, request, criteriaDoc) {
    const criteriaIndex = FYC.indexCriteria(criteriaDoc);
    const profile = candidate.profile;

    let numericWeightedFitSum = 0, numericWeightSum = 0;
    let categoricalWeightedFitSum = 0, categoricalWeightSum = 0;
    let usedWeight = 0, totalActiveWeight = 0;
    let usableCount = 0;
    const matchedCriteria = [], tensionCriteria = [], neutralCriteria = [];
    const contributions = {};

    for (const [criterionId, pref] of Object.entries(request.numericPreferences || {})) {
      if (pref.notRelevant) continue;
      const crit = criteriaIndex.get(criterionId);
      const weight = FYC.importanceWeight(pref.importance);
      totalActiveWeight += weight;
      const candidateValue = profile.scores[criterionId];
      const result = crit.kind === 'directional'
        ? FYC.scoreDirectionalFit(candidateValue, pref.desiredPosition, pref.importance)
        : FYC.scoreCapabilityFit(candidateValue, pref.importance);
      if (result.unknown) { contributions[criterionId] = { unknown: true }; continue; }
      numericWeightedFitSum += result.weightedFit;
      numericWeightSum += weight;
      usedWeight += weight;
      usableCount++;
      contributions[criterionId] = { fit: result.fit, weightedFit: result.weightedFit, weight };
      if (result.fit >= MATCHED_THRESHOLD) matchedCriteria.push(criterionId);
      else if (result.fit < TENSION_THRESHOLD) tensionCriteria.push(criterionId);
      else neutralCriteria.push(criterionId);
    }

    for (const [criterionId, pref] of Object.entries(request.categoricalPreferences || {})) {
      if (pref.mode !== 'prefer') continue; // require/exclude are gates, not fit contributors
      const weight = FYC.importanceWeight(pref.importance);
      totalActiveWeight += weight;
      const candidateValues = profile.categories[criterionId];
      if (!candidateValues) { contributions[criterionId] = { unknown: true }; continue; }
      const fit = pref.values.some(v => candidateValues.includes(v)) ? 1 : 0;
      const weightedFit = fit * weight;
      categoricalWeightedFitSum += weightedFit;
      categoricalWeightSum += weight;
      usedWeight += weight;
      usableCount++;
      contributions[criterionId] = { fit, weightedFit, weight };
      if (fit >= MATCHED_THRESHOLD) matchedCriteria.push(criterionId);
      else if (fit < TENSION_THRESHOLD) tensionCriteria.push(criterionId);
      else neutralCriteria.push(criterionId);
    }

    const denominator = numericWeightSum + categoricalWeightSum;
    const overallFit = denominator > 0 ? (numericWeightedFitSum + categoricalWeightedFitSum) / denominator : null;
    const coverage = totalActiveWeight > 0 ? usedWeight / totalActiveWeight : null;

    let confidence;
    if (overallFit === null) confidence = 'low';
    else if (usableCount < 3 || coverage < 0.45) confidence = 'low';
    else if (usableCount < 6 || coverage < 0.75) confidence = 'medium';
    else confidence = 'high';

    return {
      candidate, overallFit, coverage, confidence,
      matchedCriteria, tensionCriteria, neutralCriteria, contributions,
      usableCount, totalActiveWeight,
    };
  }

  // ---------------------------------------------------------------------
  // rankCandidates
  // ---------------------------------------------------------------------
  function compareScored(a, b) {
    const fitA = a.overallFit === null ? -Infinity : a.overallFit;
    const fitB = b.overallFit === null ? -Infinity : b.overallFit;
    if (fitA !== fitB) return fitB - fitA;
    const covA = a.coverage === null ? -Infinity : a.coverage;
    const covB = b.coverage === null ? -Infinity : b.coverage;
    if (covA !== covB) return covB - covA;
    const tensionA = a.tensionCriteria.length, tensionB = b.tensionCriteria.length;
    if (tensionA !== tensionB) return tensionA - tensionB;
    const eligA = a.eligibility.status === 'eligible' ? 0 : 1;
    const eligB = b.eligibility.status === 'eligible' ? 0 : 1;
    if (eligA !== eligB) return eligA - eligB;
    return a.candidate.internalId < b.candidate.internalId ? -1 : a.candidate.internalId > b.candidate.internalId ? 1 : 0;
  }

  function rankCandidates(scoredCandidates) {
    return scoredCandidates.slice().sort(compareScored);
  }

  // ---------------------------------------------------------------------
  // assignResultRoles
  // ---------------------------------------------------------------------
  function highIndicesDiffer(candidateA, candidateB, request, criteriaDoc) {
    const a = candidateA.profile, b = candidateB.profile;
    let differences = 0;
    for (const [criterionId, pref] of Object.entries(request.numericPreferences || {})) {
      if (pref.notRelevant || pref.importance < HIGH_IMPORTANCE_THRESHOLD) continue;
      const va = a.scores[criterionId], vb = b.scores[criterionId];
      if (va === undefined || vb === undefined) continue;
      if (Math.abs(va - vb) >= MEANINGFUL_NUMERIC_SEPARATION) differences++;
    }
    for (const [criterionId, pref] of Object.entries(request.categoricalPreferences || {})) {
      if (pref.importance === undefined || pref.importance < HIGH_IMPORTANCE_THRESHOLD) continue;
      const va = a.categories[criterionId] || [], vb = b.categories[criterionId] || [];
      const overlap = va.some(v => vb.includes(v));
      if (!overlap) differences++;
    }
    return differences;
  }

  function isDuplicateOfSelected(scored, selected) {
    return selected.some(s => s.candidate.baseProfileId === scored.candidate.baseProfileId);
  }

  // Scans eligible, then (if allowed) needs-confirmation candidates, in ranked
  // order, for the first one satisfying `predicate` and not a duplicate/already
  // selected -- this is the literal implementation of "fill unoccupied slots with
  // the next strongest non-duplicate eligible candidate ... only then consider
  // needs-confirmation candidates" applied per-role. See AMBIGUITY_NOTES #5.
  function findForRole(rankedEligible, rankedNeedsConfirmation, selected, includeNeedsConfirmation, predicate) {
    for (const s of rankedEligible) {
      if (isDuplicateOfSelected(s, selected)) continue;
      if (selected.includes(s)) continue;
      if (predicate(s)) return s;
    }
    if (includeNeedsConfirmation) {
      for (const s of rankedNeedsConfirmation) {
        if (isDuplicateOfSelected(s, selected)) continue;
        if (selected.includes(s)) continue;
        if (predicate(s)) return s;
      }
    }
    return null;
  }

  function assignResultRoles(rankedCandidates, request, criteriaDoc) {
    const maxResults = (request.options && request.options.maxResults) || 4;
    const includeNeedsConfirmation = !!(request.options && request.options.includeNeedsConfirmation);

    const eligible = rankedCandidates.filter(s => s.eligibility.status === 'eligible');
    const needsConfirmation = rankedCandidates.filter(s => s.eligibility.status === 'needs-confirmation');

    const results = [];

    const best = findForRole(eligible, needsConfirmation, results, includeNeedsConfirmation, () => true);
    if (best) results.push(Object.assign({ role: 'best-overall' }, {}, { scored: best }));

    if (results.length < maxResults) {
      const bestScored = results[0] && results[0].scored;
      const different = bestScored ? findForRole(eligible, needsConfirmation, results.map(r => r.scored), includeNeedsConfirmation, s => {
        if (s === bestScored) return false;
        const differentClass = s.candidate.profile.classId !== bestScored.candidate.profile.classId;
        const differentCriteria = highIndicesDiffer(s.candidate, bestScored.candidate, request, criteriaDoc);
        return differentClass || differentCriteria >= 2;
      }) : null;
      if (different) results.push({ role: 'different-approach', scored: different });
    }

    if (results.length < maxResults) {
      const bestScored = results[0] && results[0].scored;
      const approachable = findForRole(eligible, needsConfirmation, results.map(r => r.scored), includeNeedsConfirmation, s => {
        const p = s.candidate.profile;
        const ok = p.scores['build-complexity'] <= 5 && p.scores['rules-mastery'] <= 5;
        if (!ok) return false;
        // "omit ... if it would duplicate the first without adding useful
        // information": skip if it's the same profile family as best-overall.
        if (bestScored && s.candidate.baseProfileId === bestScored.candidate.baseProfileId) return false;
        return true;
      });
      if (approachable) results.push({ role: 'more-approachable', scored: approachable });
    }

    if (results.length < maxResults) {
      const bestScored = results[0] && results[0].scored;
      if (bestScored) {
        const unexpected = findForRole(eligible, needsConfirmation, results.map(r => r.scored), includeNeedsConfirmation, s => {
          if (s.candidate.profile.classId === bestScored.candidate.profile.classId) return false;
          if (s.overallFit === null || bestScored.overallFit === null) return false;
          if (bestScored.overallFit - s.overallFit > UNEXPECTED_FIT_MAX_GAP) return false;
          const topMatch = s.matchedCriteria[0];
          if (!topMatch) return false;
          const explicitlyRequested = (request.numericPreferences && request.numericPreferences[topMatch]) ||
            (request.categoricalPreferences && request.categoricalPreferences[topMatch]);
          return !!explicitlyRequested;
        });
        if (unexpected) results.push({ role: 'unexpected-fit', scored: unexpected });
      }
    }

    return results.slice(0, maxResults);
  }

  // ---------------------------------------------------------------------
  // selectNextQuestion
  // ---------------------------------------------------------------------
  // INTERPRETATION: question-templates.json has no representation for an
  // unresolved hard compatibility gate -- only criterion questions exist. Rule 6
  // ("an unresolved hard gate ... outranks an ordinary preference question")
  // is implemented by synthesizing a gate-confirmation question object (same
  // {id, prompt, answers} shape as a real template, but constructed from the
  // gate's own `type`/`rule`, id prefixed "gate:") rather than skipping the rule.
  // See AMBIGUITY_NOTES #6.
  function selectNextQuestion(request, currentRanking, questionTemplates, criteriaDoc) {
    const criteriaIndex = FYC.indexCriteria(criteriaDoc);
    const top5 = currentRanking
      .filter(s => s.eligibility.status === 'eligible' || s.eligibility.status === 'needs-confirmation')
      .slice(0, 5);
    if (top5.length === 0) {
      // Nothing ranked yet (e.g. first turn): fall back to the highest-priority
      // fully-unanswered question, if any.
    }

    // Rule 6: an unresolved hard gate on a likely top result outranks a
    // preference question.
    for (const s of top5) {
      if (s.eligibility.unresolvedGate) {
        const gate = s.eligibility.unresolvedGate;
        return {
          id: `gate:${gate.type}`,
          synthetic: true,
          prompt: `Confirm: ${gate.rule}`,
          criteriaClarified: [],
          gateType: gate.type,
        };
      }
    }

    function isAnswered(criterionId) {
      const num = request.numericPreferences && request.numericPreferences[criterionId];
      if (num) return true; // present at all (active or notRelevant) counts as answered
      const cat = request.categoricalPreferences && request.categoricalPreferences[criterionId];
      if (cat) return true;
      return false;
    }

    function criteriaSeparation(criterionId) {
      const crit = criteriaIndex.get(criterionId);
      if (!crit) return 0;
      if (crit.kind === 'categorical') {
        const valueSets = top5.map(s => new Set(s.candidate.profile.categories[criterionId] || []));
        for (let i = 0; i < valueSets.length; i++) {
          for (let j = i + 1; j < valueSets.length; j++) {
            const overlap = [...valueSets[i]].some(v => valueSets[j].has(v));
            if (!overlap && (valueSets[i].size || valueSets[j].size)) return 1;
          }
        }
        return 0;
      }
      const values = top5.map(s => s.candidate.profile.scores[criterionId]).filter(v => v !== undefined);
      if (values.length < 2) return 0;
      return Math.max(...values) - Math.min(...values);
    }

    let best = null, bestValue = -Infinity;
    for (const q of questionTemplates.questions) {
      const clarified = q.criteriaClarified || [];
      if (clarified.length === 0) continue; // non-scoring / navigation-only questions carry no decision value
      if (clarified.every(isAnswered)) continue;

      let separationScore = 0;
      for (const cid of clarified) {
        if (isAnswered(cid)) continue;
        const sep = criteriaSeparation(cid);
        if (crit_kind_is_numeric(criteriaIndex, cid)) {
          if (sep >= MEANINGFUL_NUMERIC_SEPARATION) separationScore += sep;
        } else if (sep > 0) {
          separationScore += MEANINGFUL_NUMERIC_SEPARATION; // categorical divergence counted as one "unit" of separation
        }
      }
      if (separationScore === 0) continue;

      const value = (separationScore * (q.priority || 1)) / (q.estimatedCognitiveCost || 1);
      if (value > bestValue) { bestValue = value; best = q; }
    }

    if (!best) return null;
    // Never manufacture a question once the result is already high-confidence.
    if (top5.length && top5.every(s => s.confidence === 'high')) return null;
    return best;
  }

  function crit_kind_is_numeric(criteriaIndex, id) {
    const c = criteriaIndex.get(id);
    return c && (c.kind === 'capability' || c.kind === 'directional');
  }

  // ---------------------------------------------------------------------
  // buildPresentationResult
  // ---------------------------------------------------------------------
  // INTERPRETATION: whyItFits/watchFor must read like one player advising
  // another (handoff tone examples), which is an authored-prose task in the
  // general case. Without an explanation-fragment library (explanation-
  // templates.json is intentionally empty -- see the criteria-audit pass),
  // deterministic generation here uses each criterion's own playerLabel in a
  // small fixed sentence template. This reliably avoids statistics/percentages
  // (the hard requirement) but will read more mechanically than the example
  // prose; a later fragment-authoring pass can replace this generator without
  // changing its call signature. See AMBIGUITY_NOTES #7.
  function describeCriterion(criteriaIndex, criterionId) {
    const c = criteriaIndex.get(criterionId);
    return (c && (c.playerLabel || c.shortLabel)) || criterionId;
  }

  function buildPresentationResult(roleEntry, request, criteriaDoc) {
    const criteriaIndex = FYC.indexCriteria(criteriaDoc);
    const scored = roleEntry.scored;
    const candidate = scored.candidate;
    const profile = candidate.profile;
    const isClassPath = profile.entityType === 'class-path';

    // INTERPRETATION: title must be the short name ("Hexcrafter"), not the
    // compound "X — Y archetype" label. Batches 02-06 give profile.name
    // directly; the original 7 compass profiles only got displayLabel (e.g.
    // "Archer — Fighter archetype") from the Batch 01 overlay, so title falls
    // back to the text before " — " in that case.
    const title = profile.name || (profile.displayLabel ? profile.displayLabel.split(' — ')[0] : profile.id);
    const typeLabel = isClassPath ? 'Class' : 'Archetype';
    const parentLabel = isClassPath ? null : capitalize(profile.classId);

    const whyItFits = scored.matchedCriteria.slice(0, 3).map(cid => {
      const label = describeCriterion(criteriaIndex, cid);
      return `This matters to you: ${lowerFirst(label)} -- and ${title} delivers on it.`;
    });

    const watchFor = [];
    if (profile.tradeoff) watchFor.push(profile.tradeoff);
    else if (profile.editorialNote) watchFor.push(profile.editorialNote);
    for (const cid of scored.tensionCriteria) {
      if (watchFor.length >= 2) break;
      watchFor.push(`It falls short on ${lowerFirst(describeCriterion(criteriaIndex, cid))}, if that matters to you.`);
    }

    const requirements = [];
    const conduct = profile.conduct;
    if (conduct) {
      if (conduct.codePresence === 'mandatory' || conduct.codePresence === 'expected') {
        requirements.push(`This path ${conduct.codePresence === 'mandatory' ? 'requires' : 'expects'} living by a code${conduct.mechanicalLossRisk !== 'none' ? ', with real mechanical consequences for breaking it' : ''}.`);
      }
      if (conduct.alignmentRule && conduct.alignmentRule.kind !== 'none') {
        requirements.push(`Alignment is restricted: ${conduct.alignmentRule.values.join(', ')}.`);
      }
      if (conduct.deityRequired) {
        requirements.push('A deity is required.');
      } else if (conduct.deityChoiceProvenance === 'free-choice-with-consequences') {
        requirements.push('You choose a deity or patron; once chosen, its expectations shape the character.');
      } else if (conduct.deityChoiceProvenance === 'fixed-source') {
        requirements.push("A specific patron or source defines this path narratively, not as a mechanical prerequisite.");
      }
    }
    for (const r of scored.eligibility.reasons) if (r.rule) requirements.push(r.rule);
    for (const w of scored.eligibility.warnings) if (w.rule) requirements.push(w.rule);

    let summary = profile.playerSummary || profile.editorialNote || `${title} is a ${isClassPath ? 'Pathfinder class' : `${parentLabel} archetype`}.`;
    if (!isClassPath) summary = `${title} is a ${parentLabel} archetype. ${summary}`;

    if (scored.confidence === 'low') {
      summary += ' This shortlist is still provisional -- a couple more answers would sharpen it.';
    }

    return {
      id: candidate.internalId,
      entityType: isClassPath ? 'class-path' : 'archetype',
      classId: profile.classId,
      archetypeId: isClassPath ? undefined : profile.archetypeId,
      title,
      typeLabel,
      parentLabel,
      role: roleEntry.role,
      fitBand: fitBandFor(scored, roleEntry.role),
      confidence: scored.confidence,
      summary,
      whyItFits: whyItFits.slice(0, 3),
      watchFor: watchFor.slice(0, 2),
      requirements,
      branchChoice: candidate.branchId || null,
    };
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  // INTERPRETATION: the handoff never states a fitBand floor for best-overall
  // when its fit is below 0.58 (only that specialised-alternative may be used
  // "only if selected for a distinct result role", i.e. not for best-overall).
  // best-overall floors at "worth-considering" rather than falling through to
  // specialised-alternative. See AMBIGUITY_NOTES #8.
  function fitBandFor(scored, role) {
    const fit = scored.overallFit === null ? 0 : scored.overallFit;
    const coverage = scored.coverage === null ? 0 : scored.coverage;
    if (fit >= 0.84 && coverage >= 0.70) return 'excellent';
    if (fit >= 0.72) return 'strong';
    if (fit >= 0.58) return 'worth-considering';
    return role === 'best-overall' ? 'worth-considering' : 'specialised-alternative';
  }

  // ---------------------------------------------------------------------
  // matchProfiles
  // ---------------------------------------------------------------------
  function matchProfiles(request, profiles, criteriaDoc, questionTemplates) {
    validatePreferenceRequest(request, criteriaDoc);

    const totalActivePrefs =
      Object.values(request.numericPreferences || {}).filter(p => !p.notRelevant).length +
      Object.values(request.categoricalPreferences || {}).filter(p => p.mode === 'prefer').length;

    if (totalActivePrefs === 0) {
      return {
        recommendations: [],
        confidence: 'low',
        nextQuestion: questionTemplates ? (questionTemplates.questions.find(q => (q.criteriaClarified || []).length > 0) || null) : null,
      };
    }

    const candidates = expandCandidateBranches(profiles);
    const scored = candidates.map(candidate => {
      const eligibility = evaluateEligibility(candidate, request);
      const fit = scoreCandidate(candidate, request, criteriaDoc);
      return Object.assign(fit, { eligibility });
    });

    const ranked = rankCandidates(scored);
    const roleEntries = assignResultRoles(ranked, request, criteriaDoc);
    const recommendations = roleEntries.map(entry => buildPresentationResult(entry, request, criteriaDoc));

    const overallConfidence = roleEntries.length === 0 ? 'low' : roleEntries[0].scored.confidence;
    const nextQuestion = questionTemplates ? selectNextQuestion(request, ranked, questionTemplates, criteriaDoc) : null;

    return {
      recommendations,
      confidence: overallConfidence,
      nextQuestion,
      _internal: { ranked }, // raw scores retained for tests, per "definition of done"
    };
  }

  return {
    ValidationError,
    validatePreferenceRequest,
    expandCandidateBranches,
    evaluateEligibility,
    scoreCandidate,
    rankCandidates,
    assignResultRoles,
    selectNextQuestion,
    buildPresentationResult,
    matchProfiles,
  };
}));

/*
AMBIGUITY_NOTES (also summarized in the chat reply that shipped this module):

1. HIGH_IMPORTANCE_THRESHOLD=8 for "high-importance criteria/categories" (used by
   different-approach and selectNextQuestion's gate-priority framing) -- no
   number given in the handoff.
2. MEANINGFUL_NUMERIC_SEPARATION=3, reused from selectNextQuestion's explicit
   "numeric range at least 3" for different-approach's own "materially differs"
   numeric check, since no separate number is given there.
3. "A category cannot require and exclude the same value after preferences are
   merged" cannot be triggered by the given request shape (one mode per
   criterionId) -- implemented as a structurally-satisfied no-op, flagged for
   whenever a multi-entry-per-criterion shape is introduced.
4. compatibilityGates carry a free-text `rule`, not a structured requirement, so
   there is no mechanical way to compare a gateAnswers value against "does this
   satisfy the gate". Implemented a minimal sentinel convention
   (value:"conflict" => ineligible; any other confirmed value => satisfied) that
   makes rules 9/10 testable; needs real product input once gates carry
   structured comparison data.
5. "Fill unoccupied slots with the next strongest non-duplicate eligible
   candidate. Only then consider needs-confirmation candidates." is implemented
   as the *selection algorithm* for each of roles 2-4 (scan the full ranked list
   for the next candidate satisfying that role's own definition, eligible tier
   first, then needs-confirmation), not as a generic fallback that invents a
   fifth role label. If no candidate anywhere satisfies a role's definition, that
   role is omitted (matching the explicit "omit" language given for roles 3/4,
   extended to role 2 for consistency).
6. question-templates.json has no gate-confirmation question type.
   selectNextQuestion synthesizes a minimal question object
   ({id:"gate:<type>", synthetic:true, prompt, gateType}) for an unresolved hard
   gate on a top candidate, since the handoff requires this case to outrank an
   ordinary preference question but no template exists for it.
7. whyItFits/watchFor use a small fixed sentence template keyed off each
   criterion's playerLabel, since explanation-templates.json's fragment library
   was left intentionally empty pending Codex's editorial pass. This satisfies
   "no statistics" but will read more mechanically than the handoff's tone
   examples until real fragments exist.
8. fitBand floors best-overall at "worth-considering" rather than
   "specialised-alternative" when fit < 0.58, since the handoff says
   specialised-alternative applies "only if selected for a distinct result
   role" (i.e. not best-overall) but names no alternative floor.
*/
